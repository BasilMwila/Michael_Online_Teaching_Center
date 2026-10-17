import { createSpinner, wrap, offset } from './spin.js';
const $=s=>document.querySelector(s);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const media=(n)=>({type:'image',url:`assets/photo-${n%4}.jpg`});
const demoTitles=['The joy of being together','A room full of celebration','Moments that feel like home','A little thank-you','Laughter, shared','Our beautiful community','Together is a lovely place','So much to celebrate','A day to remember'];
const demo=demoTitles.map((title,i)=>({id:`demo-${i}`,title,author:'Illustrative memory',message:'Your personal birthday memory and message will appear here. These photographs are placeholders for the community’s own uploads.',media:i%3===0?[media(i),media(i+1),media(i+2)]:[media(i)],demo:true}));
let posts=demo,filter='all',featuredIndex=0,activePost=null,attachment=0,previewUrls=[];
// Hexagons and tiles crop hard. Faces sit in the upper third of most photos, so
// the focal point is biased upward rather than dead centre, which otherwise
// slices off foreheads. A reviewer can override it per photo with m.focus
// (any CSS object-position value, e.g. "50% 20%").
const focal=m=>`object-position:${m.focus||'center 35%'}`;
const shot=(m,cls='')=>m.type==='video'?`<video class="${cls}" style="${focal(m)}" src="${safe(m.url)}#t=0.1" preload="metadata" muted playsinline aria-label="Video preview"></video>`:`<img class="${cls}" style="${focal(m)}" src="${safe(m.url)}" alt="Memory photograph" loading="lazy">`;
// Previews (carousel, wall, honeycomb) must never mount the original file: a
// 2000px photo decodes ~10MB of pixels and a clip can be 30MB, and the browser
// pays for it mid-spin. These use the small still ffmpeg built beside it; the
// real file loads only in the viewer. `eager` skips lazy-loading for the
// handful of cards the carousel shows straight away.
const still=(m,cls='',eager=false)=>{
 const src=m.thumb||(m.type==='image'?m.url:null);
 if(!src)return shot(m,cls);
 return `<img class="${cls}" style="${focal(m)}" src="${safe(src)}" alt="Memory photograph" decoding="async"${eager?'':' loading="lazy"'}>`;
};
function openPost(id){activePost=posts.find(p=>p.id===id);if(!activePost)return;attachment=0;$('#viewer-author').textContent=activePost.author;$('#viewer-title').textContent=activePost.title;$('#viewer-message').textContent=activePost.message;renderViewer();$('#viewer').showModal();}
function renderViewer(){
 const list=activePost.media;
 $('#fan').querySelectorAll('video').forEach(v=>v.pause());
 $('#fan').classList.toggle('single',list.length===1);
 $('#fan').innerHTML=list.map((m,i)=>`<div class="fan-card" data-media="${i}">${shot(m)}<button class="fan-select" aria-label="View attachment ${i+1}" data-select="${i}">${m.type==='video'?'<span class="media-play">▶</span>':''}</button></div>`).join('');
 $('#fan').querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>fanSpin.to(Number(b.dataset.select)));
 $('.viewer-controls').hidden=list.length===1;
 $('#thumbnails').hidden=list.length===1;
 $('#thumbnails').innerHTML=list.map((m,i)=>`<button class="thumb" aria-label="View attachment ${i+1}" data-index="${i}">${shot(m)}${m.type==='video'?'<span>▶</span>':''}</button>`).join('');
 $('#thumbnails').querySelectorAll('button').forEach(b=>b.onclick=()=>fanSpin.to(Number(b.dataset.index)));
 fanSpin.reset();
}
function paintFan(position){
 if(!activePost)return;const count=activePost.media.length,selected=wrap(Math.round(position),count);attachment=selected;
 $('#fan').querySelectorAll('.fan-card').forEach((card,i)=>{
 const d=offset(i,position,count),a=Math.abs(d),edge=Math.min(2.7,count/2);
 const alpha=count===1?1:Math.max(0,Math.min(1,(edge-a)/.45))*(1-Math.min(a,2)*.22);
 card.style.transform=count===1?'none':`translateX(${d*92}px) translateY(${a*19}px) rotate(${d*13}deg) scale(${1-Math.min(a,3)*.08})`;
 card.style.zIndex=String(Math.round(100-a*10));card.style.opacity=String(alpha);card.style.visibility=alpha>.01?'visible':'hidden';
 const button=card.querySelector('button'),video=card.querySelector('video');button.hidden=i===selected;
 if(video){const centered=i===selected&&Math.abs(d)<.02;if(!centered&&!video.paused)video.pause();video.controls=centered;video.muted=!centered;}
 });
 $('#media-count').textContent=`${selected+1} / ${count}`;
 $('#thumbnails').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===selected);b.setAttribute('aria-pressed',String(i===selected));});
}
const fanSpin=createSpinner($('#fan'),{count:()=>activePost?.media.length||1,draw:paintFan,spacing:()=>160});
$('#media-prev').onclick=()=>fanSpin.step(-1);$('#media-next').onclick=()=>fanSpin.step(1);
$('#viewer').addEventListener('keydown',e=>{if(e.target.tagName==='VIDEO')return;if(e.key==='ArrowLeft'){e.preventDefault();fanSpin.step(-1)}if(e.key==='ArrowRight'){e.preventDefault();fanSpin.step(1)}});
$('#viewer').addEventListener('close',()=>{fanSpin.stop();$('#fan').querySelectorAll('video').forEach(v=>v.pause());$('#fan').innerHTML='';});
function tile(p,hex=false){const m=p.media[0];return `<button class="${hex?'hex':'memory-tile'}" data-post="${safe(p.id)}" aria-label="Open ${safe(p.title)}${p.media.length>1?`, ${p.media.length} attachments`:''}">${still(m)}${p.media.length>1?`<span class="album-badge">▣ ${p.media.length} items</span>`:''}${m.type==='video'?'<span class="media-play">▶</span>':''}${hex?'':`<span class="tile-info">${safe(p.title)} · ${safe(p.author)}</span>`}</button>`;}
function bindPosts(el){el.querySelectorAll('[data-post]').forEach(b=>b.onclick=()=>openPost(b.dataset.post));}
function renderGallery(){const withMedia=posts.filter(p=>p.media.length);const selected=withMedia.filter(p=>filter==='all'||p.media.some(m=>m.type===filter));$('#mosaic').innerHTML=selected.map(p=>tile(p)).join('');$('#gallery-empty').hidden=selected.length>0;bindPosts($('#mosaic'));const honey=withMedia.filter(p=>p.media.some(m=>m.type==='image')).map(p=>({...p,media:[...p.media].sort((a,b)=>(a.type==='image'?-1:1)-(b.type==='image'?-1:1))})).slice(0,11);let cursor=0;$('#honeycomb').innerHTML=[4,3,4].map(count=>{const row=honey.slice(cursor,cursor+count);cursor+=count;return row.length?`<div class="hex-row">${row.map(p=>tile(p,true)).join('')}</div>`:''}).join('');bindPosts($('#honeycomb'));const wishes=posts.filter(p=>!p.demo&&p.message);$('#wish-list').innerHTML=wishes.length?wishes.slice(0,12).map(p=>`<article class="wish"><blockquote>“${safe(p.message)}”</blockquote><small>${safe(p.author)}</small></article>`).join(''):`<article class="wish"><blockquote>May today be filled with the kind of joy that stays with you long after the candles are out.</blockquote><small>A birthday note from this diary</small></article><article class="wish"><blockquote>Here’s to the moments that make us laugh, the people who make us feel at home, and a beautiful year ahead.</blockquote><small>A birthday note from this diary</small></article><article class="wish"><blockquote>Today is yours. May you feel celebrated, appreciated, and surrounded by love.</blockquote><small>A birthday note from this diary</small></article>`;renderFeatured();}
// One card per photo or video, not per post — otherwise an album of eight
// photos shows as a single card and the rest are never seen here.
function featured(){const out=[];for(const p of posts)for(const m of p.media)out.push({postId:p.id,title:p.title,author:p.author,media:m});return out.slice(0,30);}
let featuredSignature='',featuredList=[],featuredCards=[],painted=[],captionIndex=-1;
function renderFeatured(){const list=featured();$('#coverflow').hidden=!list.length;$('.carousel-controls').hidden=!list.length;if(!list.length)return;
 const signature=list.map(x=>x.postId+':'+x.media.url).join('|');
 if(signature!==featuredSignature){featuredSignature=signature;
 $('#coverflow').innerHTML=list.map((x,i)=>{const m=x.media;return `<button class="cover-card" data-feature="${i}" aria-label="${safe(x.title)}">${still(m,'',i<8)}${m.type==='video'?'<span class="media-play">▶</span>':''}<span class="cover-label">${safe(x.title)}</span></button>`}).join('');
 // Hold the nodes and the data the paint loop needs. Re-querying the DOM and
 // rebuilding this list 60 times a second was pure overhead.
 featuredList=list;featuredCards=[...$('#coverflow').querySelectorAll('.cover-card')];painted=featuredCards.map(()=>null);captionIndex=-1;
 $('#coverflow').querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.feature);if(i===wrap(Math.round(heroSpin.position),featuredList.length))openPost(featuredList[i].postId);else heroSpin.to(i);});heroSpin.reset();
 // Decode the stills up front, so the first spin never stops to rasterise one.
 Promise.all([...$('#coverflow').querySelectorAll('img')].map(i=>i.decode?.().catch(()=>{}))).then(()=>heroSpin.refresh());
 }else{featuredList=list;heroSpin.refresh();}}
function paintFeatured(position){
 const list=featuredList,n=list.length;if(!n||featuredCards.length!==n)return;
 featuredIndex=wrap(Math.round(position),n);
 const space=Math.min(230,innerWidth*.22),edge=Math.min(3,n/2);
 for(let i=0;i<n;i++){
  const card=featuredCards[i],d=offset(i,position,n),a=Math.abs(d);
  const alpha=n===1?1:Math.max(0,Math.min(1,(edge-a)/.45));
  if(alpha<=.01){if(painted[i]!=='h'){card.style.visibility='hidden';painted[i]='h';}continue;}
  const near=Math.min(a,1),far=Math.max(0,a-1);
  const x=(Math.sign(d)*(near+far*.52)*space).toFixed(1),z=(-Math.min(a,3)*195).toFixed(1),
        turn=(-Math.sign(d)*Math.min(1,a/1.5)*30).toFixed(1),o=alpha.toFixed(2),layer=String(Math.round(100-a*10));
  // An identical frame costs no style writes at all. No per-frame filter here:
  // changing one re-rasterises the whole card, image and all, every frame.
  const key=x+','+z+','+turn+','+o+','+layer;
  if(key===painted[i])continue;
  painted[i]=key;
  card.style.visibility='visible';
  card.style.transform=`translateX(${x}px) translateZ(${z}px) rotateY(${turn}deg)`;
  card.style.opacity=o;card.style.zIndex=layer;
 }
 if(featuredIndex!==captionIndex){captionIndex=featuredIndex;
  $('#hero-caption').textContent=`${String(featuredIndex+1).padStart(2,'0')} / ${String(n).padStart(2,'0')} · ${list[featuredIndex].title}`;}
}
const heroSpin=createSpinner($('#coverflow'),{count:()=>featuredList.length,draw:paintFeatured,spacing:()=>Math.min(260,innerWidth*.6)});
$('#hero-prev').onclick=()=>heroSpin.step(-1);$('#hero-next').onclick=()=>heroSpin.step(1);window.addEventListener('resize',()=>heroSpin.refresh());
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});renderGallery()});document.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>$('#share-dialog').showModal());document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#files').onchange=()=>{previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];const files=[...$('#files').files];$('#file-previews').innerHTML='';if(files.length>8||files.some(f=>f.size>40*1024*1024)){$('#form-status').textContent='Choose up to 8 files, each smaller than 40 MB.';$('#files').value='';return;}$('#form-status').textContent='';files.forEach(f=>{const url=URL.createObjectURL(f);previewUrls.push(url);const el=document.createElement(f.type.startsWith('video/')?'video':'img');el.src=url;el.alt=f.name;if(el.tagName==='VIDEO'){el.muted=true;el.preload='metadata';}$('#file-previews').append(el);});};
$('#share-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('[type=submit]');b.disabled=true;$('#form-status').textContent='Uploading your memory… please keep this window open.';try{const res=await fetch('api/posts',{method:'POST',body:new FormData(e.target)});const body=await res.json();if(!res.ok)throw Error(body.error||'Could not send your memory.');$('#form-status').textContent='Thank you! Your birthday memory has been received and is awaiting review.';e.target.reset();previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];$('#file-previews').innerHTML='';
// Send them back to the wall with a confirmation, rather than leaving them
// sitting in an empty form wondering whether it worked.
setTimeout(()=>{$('#share-dialog')?.close();$('#form-status').textContent='';const t=$('#toast');if(t){t.textContent='Thank you — your memory is in and will appear once it has been reviewed.';t.hidden=false;setTimeout(()=>{t.hidden=true},6000);}window.scrollTo({top:0,behavior:'smooth'});},1400);
}catch(err){$('#form-status').textContent=err.message||'Could not upload. Please try again.';}finally{b.disabled=false;}};
renderGallery();fetch('api/posts').then(r=>{if(!r.ok)throw Error('unavailable');return r.json()}).then(data=>{if(data.posts.length){posts=data.posts;$('#demo-notice').hidden=true;renderGallery();}}).catch(()=>{$('#demo-notice').textContent='Preview mode · submissions are temporarily unavailable';});
