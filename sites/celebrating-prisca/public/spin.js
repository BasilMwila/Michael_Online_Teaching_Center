export const wrap = (value, count) => ((value % count) + count) % count;
export const offset = (index, position, count) => wrap(index - position + count / 2, count) - count / 2;

// A flywheel, not a stepper. Scrolling and dragging push spin into the wheel,
// friction bleeds it off over the next second or so, and only the tail of the
// motion eases onto the nearest card. One animation-frame loop owns every
// repaint, so a fast gesture can never paint twice in the same frame.
const FRICTION = .945,      // share of the spin kept each 60fps frame while gliding
      MAX_SPIN = 15,        // cards per second ceiling, so a hard fling stays readable
      SETTLE_BELOW = .85,   // slower than this and it starts homing in
      WHEEL_GAIN = 5.6,     // spin added per card's worth of wheel travel
      FLICK_GAIN = 1.1,     // a released flick carries slightly past the finger
      STALE_MS = 90,        // finger held still this long before release means no throw
      EASE_MS = 120;        // homing time constant

export function createSpinner(element, { count, draw, spacing, settle }) {
  let position=0,velocity=0,target=null,frame=0,previous=0,pointer=null,moved=false,suppressUntil=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const paint=()=>draw(position);
  const cap=v=>Math.max(-MAX_SPIN,Math.min(MAX_SPIN,v));
  const run=()=>{if(!frame)frame=requestAnimationFrame(tick)};
  const halt=()=>{if(frame)cancelAnimationFrame(frame);frame=0;previous=0};
  const rest=()=>{const n=count();position=wrap(target??position,n);velocity=0;target=null;previous=0;paint();settle?.(wrap(Math.round(position),n));};

  function tick(now){
    frame=0;
    // Clamped so a backgrounded tab or a dropped frame can't teleport the wheel.
    const dt=Math.min(.048,Math.max(.001,(now-(previous||now-16))/1000));previous=now;
    if(pointer){paint();run();return;}                                  // the finger is driving
    if(target===null){                                                  // free spin
      position+=velocity*dt;
      velocity*=Math.pow(FRICTION,dt*60);
      if(Math.abs(velocity)<SETTLE_BELOW)target=Math.round(position+velocity*.22);
      paint();run();return;
    }
    const gap=target-position;                                          // homing in
    if(Math.abs(gap)<.002){rest();return;}
    position+=gap*(1-Math.exp(-dt*1000/EASE_MS));
    paint();run();
  }

  // Direct manipulation always animates. While you are dragging or scrolling,
  // the motion IS the response to your gesture, not decoration — killing it
  // leaves the carousel teleporting between cards. The OS reduced-motion
  // preference still governs glide() below, which moves the carousel for you.
  function settleTo(index){velocity=0;target=index;run();}

  // Glide to a specific card: used by the arrows, the thumbnails and the keys.
  function glide(index){
    if(count()<2)return;
    velocity=0;target=index;
    if(reduced.matches){rest();return;}
    run();
  }
  const to=index=>glide(position+offset(index,position,count()));
  const step=delta=>glide(Math.round(target??position)+delta);

  element.addEventListener('dragstart',e=>e.preventDefault());

  element.addEventListener('pointerdown',e=>{
    if(count()<2||e.button!==0||e.target.closest('video[controls]'))return;
    halt();                                                             // grabbing stops the wheel dead
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.clientX,time:performance.now()};
    velocity=0;target=null;moved=false;
  });

  element.addEventListener('pointermove',e=>{
    if(!pointer||pointer.id!==e.pointerId)return;
    if(!moved){
      const dx=Math.abs(e.clientX-pointer.x),dy=Math.abs(e.clientY-pointer.y);
      if(dy>dx&&dy>8){pointer=null;return;}                             // that was a page scroll
      if(dx<5)return;
      moved=true;element.setPointerCapture(e.pointerId);element.classList.add('spinning');
      pointer.last=e.clientX;pointer.time=performance.now();
    }
    const now=performance.now(),span=Math.max(8,now-pointer.time)/1000,move=(pointer.last-e.clientX)/spacing();
    position+=move;
    // Smoothed so one jittery sample can't decide the whole throw.
    velocity=cap(.7*velocity+.3*(move/span));
    pointer.last=e.clientX;pointer.time=now;
    run();
  });

  function release(e){
    if(!pointer||pointer.id!==e.pointerId)return;
    const stale=performance.now()-pointer.time>STALE_MS,threw=moved;
    pointer=null;element.classList.remove('spinning');
    if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);
    if(!threw)return;                                                   // a tap, not a spin
    suppressUntil=performance.now()+350;
    velocity=stale?0:cap(velocity*FLICK_GAIN);
    if(Math.abs(velocity)<SETTLE_BELOW)settleTo(Math.round(position));
    else{target=null;run();}
  }
  element.addEventListener('pointerup',release);
  element.addEventListener('pointercancel',e=>{velocity=0;release(e)});
  element.addEventListener('click',e=>{if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});

  // Every notch is a push on the wheel rather than a jump to the next card, so
  // several quick notches build up into a real spin that coasts to a stop.
  element.addEventListener('wheel',e=>{
    if(count()<2||e.ctrlKey||e.target.closest('video[controls]'))return;
    e.preventDefault();
    const raw=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
    const cards=raw*(e.deltaMode===1?16:e.deltaMode===2?element.clientWidth:1)/spacing();
    if(!cards)return;
    target=null;                                                        // a fresh push cancels any homing
    velocity=cap(velocity+Math.max(-1,Math.min(1,cards))*WHEEL_GAIN);
    run();
  },{passive:false});

  return {
    to,step,refresh:paint,
    reset(){halt();pointer=null;position=0;velocity=0;target=null;paint();},
    stop(){halt();pointer=null;velocity=0;target=null;},
    get position(){return position;}
  };
}
