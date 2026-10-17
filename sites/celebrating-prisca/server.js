import express from 'express';
import multer from 'multer';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, timingSafeEqual, createHmac } from 'node:crypto';
import { mkdirSync, unlinkSync, openSync, readSync, closeSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compressLater, ffmpegReady, previewPath } from './media.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const data=path.resolve(process.env.DATA_DIR||path.join(root,'data'));
const uploads=path.join(data,'uploads');mkdirSync(uploads,{recursive:true});
const db=new DatabaseSync(path.join(data,'diary.db'));
db.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,author TEXT NOT NULL,title TEXT NOT NULL,message TEXT NOT NULL,media TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',createdAt TEXT NOT NULL);");
const app=express();app.disable('x-powered-by');app.set('trust proxy','loopback');
app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'");next();});
app.use(express.json({limit:'20kb'}));
const ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4','video/webm':'.webm','video/quicktime':'.mov'};
const upload=multer({storage:multer.diskStorage({destination:uploads,filename:(_req,f,cb)=>cb(null,randomUUID()+ext[f.mimetype])}),limits:{fileSize:Number(process.env.MAX_FILE_MB||40)*1024*1024,files:8,fields:5,fieldSize:10000,parts:13},fileFilter:(_req,f,cb)=>ext[f.mimetype]?cb(null,true):cb(Object.assign(Error('Choose JPG, PNG, WebP, MP4, WebM or MOV files.'),{status:400}))}).array('media',8);
const NAME=/^[a-f0-9-]+(\.t)?\.(jpg|png|webp|mp4|webm|mov)$/;
const clean=files=>{for(const f of files||[])try{unlinkSync(f.path)}catch{}};
function validFile(f){const fd=openSync(f.path,'r');const b=Buffer.alloc(16);const n=readSync(fd,b,0,16,0);closeSync(fd);if(n<12)return false;switch(f.mimetype){case'image/jpeg':return b[0]===255&&b[1]===216&&b[2]===255;case'image/png':return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));case'image/webp':return b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';case'video/webm':return b.subarray(0,4).equals(Buffer.from([26,69,223,163]));default:return b.toString('ascii',4,8)==='ftyp';}}
// A memorable review key is only safe if guessing is slow, so repeated wrong
// keys from one address get locked out for a while.
const adminFails=new Map();
// Forgiving enough for an organiser mistyping on a phone, strict enough that
// guessing a short key is hopeless.
const LOCK_AFTER=12,LOCK_MS=5*60*1000;
function admin(req,res,next){
  const expected=process.env.ADMIN_TOKEN;
  if(!expected)return res.status(503).json({error:'Admin access has not been configured.'});
  const now=Date.now();
  for(const[k,v]of adminFails)if(v.until&&v.until<now)adminFails.delete(k);
  const rec=adminFails.get(req.ip);
  if(rec&&rec.until>now){const mins=Math.ceil((rec.until-now)/60000);return res.status(429).json({error:`Too many wrong keys. Try again in ${mins} minute${mins===1?'':'s'}.`});}
  const given=(req.headers.authorization||'').replace(/^Bearer /,'');
  const a=Buffer.from(given),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b)){
    const r=adminFails.get(req.ip)||{count:0,until:0};
    r.count++;
    if(r.count>=LOCK_AFTER)r.until=now+LOCK_MS;
    adminFails.set(req.ip,r);
    const left=LOCK_AFTER-r.count;
    return res.status(401).json({error:left>0&&left<=4?`Invalid review key. ${left} ${left===1?'try':'tries'} left before a short pause.`:'Invalid review key.'});
  }
  adminFails.delete(req.ip);
  next();
}
// Pending media can't be fetched by a plain <img>/<video> tag, because those
// can't send an Authorization header. Reviewers get a short-lived signed link
// instead, so the browser streams the file natively rather than downloading a
// whole video into memory before anything appears.
const MEDIA_LINK_MS=15*60*1000;
// Signed media links use their own long random secret, so a short, memorable
// review key never weakens them.
const MEDIA_KEY=process.env.MEDIA_SIGNING_KEY||process.env.ADMIN_TOKEN||'';
const mediaSig=(file,exp)=>createHmac('sha256',MEDIA_KEY).update(`${file}.${exp}`).digest('hex');
function signedOk(req,file){const{exp,sig}=req.query;if(!exp||!sig)return false;if(!Number(exp)||Number(exp)<Date.now())return false;const a=Buffer.from(String(sig)),b=Buffer.from(mediaSig(file,String(exp)));return a.length===b.length&&timingSafeEqual(a,b);}
const serialize=r=>({...r,media:JSON.parse(r.media)});
app.get('/api/health',async(_req,res)=>res.json({ok:true,service:'celebrating-prisca',compression:await ffmpegReady()}));
app.get('/api/posts',(_req,res)=>{res.setHeader('Cache-Control','no-store');res.json({posts:db.prepare("SELECT id,author,title,message,media,createdAt FROM posts WHERE status='approved' ORDER BY createdAt DESC LIMIT 500").all().map(serialize)});});
const attempts=new Map();
app.post('/api/posts',(req,res,next)=>{const now=Date.now();for(const[k,v]of attempts)if(now-v.start>3600000)attempts.delete(k);const item=attempts.get(req.ip)||{start:now,count:0};if(item.count>=10)return res.status(429).json({error:'Too many submissions. Please try again in an hour.'});item.count++;attempts.set(req.ip,item);const bytes=readdirSync(uploads).reduce((n,f)=>n+statSync(path.join(uploads,f)).size,0);if(bytes>Number(process.env.MAX_STORAGE_MB||2048)*1024*1024)return res.status(507).json({error:'Uploads are temporarily full. Please contact the site organiser.'});next();},(req,res,next)=>upload(req,res,err=>{if(err){clean(req.files);return next(err)}try{const {author,title,message,consent}=req.body;const fields=[author,title,message];if(fields.some(v=>typeof v!=='string'||!v.trim())||author.length>80||title.length>120||message.length>2000||consent!=='on'){clean(req.files);return res.status(400).json({error:'Please complete your name, title, message and sharing permission.'});}if(req.files.some(f=>!validFile(f))){clean(req.files);return res.status(400).json({error:'A file does not match its format. Please use a valid image or video.'});}const id=randomUUID();const media=req.files.map(f=>({type:f.mimetype.startsWith('video/')?'video':'image',url:'uploads/'+f.filename,thumb:'uploads/'+previewPath(f.filename)}));db.prepare('INSERT INTO posts(id,author,title,message,media,createdAt) VALUES(?,?,?,?,?,?)').run(id,author.trim(),title.trim(),message.trim(),JSON.stringify(media),new Date().toISOString());res.status(201).json({id,status:'pending'});compressLater(req.files.map(f=>f.path));}catch(e){clean(req.files);next(e)}}));
// Hand a reviewer a signed, expiring URL for one pending file.
app.get('/api/admin/media-link',admin,(req,res)=>{const file=String(req.query.file||'').replace(/^uploads\//,'');if(!NAME.test(file))return res.status(400).json({error:'Unknown file.'});const exp=Date.now()+MEDIA_LINK_MS;res.json({url:`uploads/${file}?exp=${exp}&sig=${mediaSig(file,String(exp))}`});});
app.get('/api/admin/posts',admin,(_req,res)=>{res.setHeader('Cache-Control','no-store');res.json({posts:db.prepare('SELECT * FROM posts ORDER BY createdAt DESC LIMIT 500').all().map(serialize)});});
app.patch('/api/admin/posts/:id',admin,(req,res)=>{if(!['approved','rejected','pending'].includes(req.body.status))return res.status(400).json({error:'Invalid status.'});const r=db.prepare('UPDATE posts SET status=? WHERE id=?').run(req.body.status,req.params.id);if(!r.changes)return res.status(404).json({error:'Memory not found.'});res.json({ok:true});});
// Permanent removal: the entry goes, and so do its uploaded files, which also
// frees the storage back up. Hiding a post is reversible; this is not.
app.delete('/api/admin/posts/:id',admin,(req,res)=>{
  const row=db.prepare('SELECT media FROM posts WHERE id=?').get(req.params.id);
  if(!row)return res.status(404).json({error:'Memory not found.'});
  let files=[];
  try{files=JSON.parse(row.media)}catch{}
  let removed=0;
  // Each memory can own two files per attachment: the original and its preview.
  for(const name of files.flatMap(m=>[m.url,m.thumb]).filter(Boolean).map(u=>String(u).replace(/^uploads\//,''))){
    if(!NAME.test(name))continue;
    try{unlinkSync(path.join(uploads,name));removed++}catch{}
  }
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  console.log(`deleted post ${req.params.id} and ${removed} file(s)`);
  res.json({ok:true,filesRemoved:removed});
});

// Only reviewed media is public. Pending media is fetched with admin authorization.
app.get('/uploads/:file',(req,res,next)=>{const file=req.params.file;if(!NAME.test(file))return res.sendStatus(404);const key='uploads/'+file;const row=db.prepare("SELECT status FROM posts WHERE EXISTS(SELECT 1 FROM json_each(posts.media) WHERE json_extract(value,'$.url')=? OR json_extract(value,'$.thumb')=?)").get(key,key);if(!row)return res.sendStatus(404);const send=()=>{res.setHeader('Cache-Control','private, no-store');res.sendFile(path.join(uploads,file));};if(row.status==='approved'||signedOk(req,file))send();else admin(req,res,send);});
app.use(express.static(path.join(root,'public'),{maxAge:0}));
app.use((err,_req,res,_next)=>{console.error(err.code||err.message);res.status(err.status|| (err instanceof multer.MulterError?400:500)).json({error:err instanceof multer.MulterError?'Upload limit exceeded. Choose up to 8 files, at most 40 MB each.':err.status?err.message:'Something went wrong. Please try again.'});});
const server=app.listen(Number(process.env.PORT||4100),process.env.HOST||'127.0.0.1',()=>console.log(`Celebrating Prisca: http://${process.env.HOST||'127.0.0.1'}:${server.address().port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0)}));
