import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';

test('submissions persist, remain private until approved, and validate media',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'prisca-test-'));
 const token='local-test-key-only';let proc;
 async function start(){proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',DATA_DIR:dir,ADMIN_TOKEN:token},stdio:['ignore','pipe','pipe']});return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server did not start')),10000);proc.stdout.on('data',b=>{const m=b.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timeout);resolve(m[0])}});proc.on('error',reject);});}
 async function stop(){const done=once(proc,'exit');proc.kill();await done;}
 try{let base=await start();const headers={Authorization:'Bearer '+token};
 assert.equal((await fetch(base+'/api/admin/posts')).status,401);
 const f=new FormData();for(const[k,v]of Object.entries({author:'Test member',title:'Birthday memory',message:'Happy birthday!',consent:'on'}))f.append(k,v);
 f.append('media',new Blob([await readFile('public/assets/photo-0.jpg')],{type:'image/jpeg'}),'photo.jpg');
 const sent=await fetch(base+'/api/posts',{method:'POST',body:f});assert.equal(sent.status,201);const {id}=await sent.json();
 assert.equal((await(await fetch(base+'/api/posts')).json()).posts.length,0);
 let rows=(await(await fetch(base+'/api/admin/posts',{headers})).json()).posts;assert.equal(rows.length,1);const url=rows[0].media[0].url;
 assert.equal((await fetch(base+'/'+url)).status,401);
 assert.equal((await fetch(base+'/'+url,{headers})).status,200);
 const approved=await fetch(base+'/api/admin/posts/'+id,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({status:'approved'})});assert.equal(approved.status,200);
 assert.equal((await fetch(base+'/'+url)).status,200);
 assert.equal((await(await fetch(base+'/api/posts')).json()).posts[0].id,id);
 await stop();base=await start();assert.equal((await(await fetch(base+'/api/posts')).json()).posts[0].id,id);
 const bad=new FormData();for(const[k,v]of Object.entries({author:'Test',title:'Invalid',message:'Test',consent:'on'}))bad.append(k,v);bad.append('media',new Blob(['<script>fake file</script>'],{type:'image/png'}),'bad.png');assert.equal((await fetch(base+'/api/posts',{method:'POST',body:bad})).status,400);
 const missing=new FormData();missing.append('author','Test');assert.equal((await fetch(base+'/api/posts',{method:'POST',body:missing})).status,400);
 const text=new FormData();for(const[k,v]of Object.entries({author:'Test',title:'A birthday wish',message:'A beautiful year ahead!',consent:'on'}))text.append(k,v);assert.equal((await fetch(base+'/api/posts',{method:'POST',body:text})).status,201);
 }finally{if(proc&&proc.exitCode===null)await stop();await rm(dir,{recursive:true,force:true});}
});
