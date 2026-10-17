let token='';
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(path,options={}){
  const r=await fetch(path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}});
  const d=await r.json();
  if(!r.ok)throw Error(d.error);
  return d;
}

// Pending files need a signed link; approved ones are already public.
async function mediaSrc(m,status){
  if(status==='approved')return m.url;
  const {url}=await api('api/admin/media-link?file='+encodeURIComponent(m.url));
  return url;
}

function mediaTile(m,src){
  const el=document.createElement(m.type==='video'?'video':'img');
  el.src=src;
  el.style.cssText='width:220px;max-width:100%;height:170px;object-fit:contain;background:#eaece6;border-radius:8px';
  if(m.type==='video'){
    el.controls=true;
    // Stream on demand rather than pulling the whole file up front.
    el.preload='metadata';
    el.playsInline=true;
  }else{
    el.alt='Submitted memory';
    el.loading='lazy';
  }
  return el;
}

// Only offer the action that actually applies. An already-published memory
// shouldn't still be asking to be approved.
function actions(status){
  const remove=`<button class="text-button" data-delete="1" style="margin-left:auto;opacity:.75">Delete permanently</button>`;
  if(status==='approved')return `<span class="eyebrow" style="color:#1b7a3d">✓ On the wall</span>
    <button class="text-button" data-state="rejected">Take down</button>${remove}`;
  if(status==='rejected')return `<span class="eyebrow" style="opacity:.7">Taken down</span>
    <button class="button" data-state="approved">Put back on the wall</button>${remove}`;
  return `<button class="button" data-state="approved">Approve</button>
    <button class="text-button" data-state="rejected">Hide / reject</button>${remove}`;
}

async function load(){
  const data=await api('api/admin/posts');
  const pending=data.posts.filter(p=>p.status==='pending').length;
  $('#admin-status').textContent=`${pending} ${pending===1?'memory':'memories'} awaiting review`;

  $('#queue').innerHTML=data.posts.map(p=>{
    const count=p.media.length;
    const label=count?`${count} ${count===1?'file':'files'} attached`:'No photos or videos';
    return `<article class="wish" data-id="${p.id}">
      <p class="eyebrow">${escape(p.status)} · ${escape(p.author)}</p>
      <h2>${escape(p.title)}</h2>
      <p style="white-space:pre-wrap;margin:20px 0;overflow-wrap:anywhere">${escape(p.message)}</p>
      <p class="eyebrow" style="opacity:.7">${label}</p>
      <div class="admin-media" style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0"></div>
      <div style="display:flex;gap:15px;margin:20px 0;align-items:center;flex-wrap:wrap">${actions(p.status)}</div>
    </article>`;
  }).join('');

  for(const p of data.posts){
    const article=$(`[data-id="${p.id}"]`);
    const box=article.querySelector('.admin-media');
    for(const m of p.media){
      try{
        box.append(mediaTile(m,await mediaSrc(m,p.status)));
      }catch{
        const note=document.createElement('p');
        note.textContent='This file could not be loaded.';
        note.style.cssText='font-size:14px;opacity:.7';
        box.append(note);
      }
    }
    article.querySelectorAll('[data-state]').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      try{
        await api('api/admin/posts/'+p.id,{method:'PATCH',body:JSON.stringify({status:b.dataset.state})});
        await load();
      }catch(e){
        $('#admin-status').textContent=e.message;
        b.disabled=false;
      }
    });

    const del=article.querySelector('[data-delete]');
    if(del)del.onclick=async()=>{
      // Irreversible, so make sure it was meant.
      const files=p.media.length?` and its ${p.media.length} ${p.media.length===1?'file':'files'}`:'';
      if(!confirm(`Delete “${p.title}” by ${p.author}${files}?\n\nThis cannot be undone. To simply remove it from the wall, use Take down instead.`))return;
      del.disabled=true;
      try{
        await api('api/admin/posts/'+p.id,{method:'DELETE'});
        await load();
      }catch(e){
        $('#admin-status').textContent=e.message;
        del.disabled=false;
      }
    };
  }
}

const STORE='prisca-review-key';

async function unlock(key,remember){
  token=key;
  $('#admin-status').textContent='Loading submissions…';
  await load();
  if(remember)try{localStorage.setItem(STORE,key)}catch{}
  $('#review-key').value='';
  $('#unlock').hidden=true;
  $('#forget').hidden=false;
}

$('#unlock').onsubmit=async e=>{
  e.preventDefault();
  try{
    await unlock($('#review-key').value,$('#remember')?.checked!==false);
  }catch(err){
    $('#admin-status').textContent=err.message;
  }
};

// Typed once, remembered on this device — no retyping the key every visit.
$('#forget').onclick=()=>{
  try{localStorage.removeItem(STORE)}catch{}
  location.reload();
};

(async()=>{
  let saved=null;
  try{saved=localStorage.getItem(STORE)}catch{}
  if(!saved)return;
  try{
    await unlock(saved,false);
  }catch{
    try{localStorage.removeItem(STORE)}catch{}
    $('#admin-status').textContent='Your saved key no longer works. Please enter it again.';
  }
})();
