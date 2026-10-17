import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpinner,offset,wrap} from '../public/spin.js';

test('carousel takes the short circular path and draws intermediate frames',()=>{
 assert.equal(wrap(-1,7),6);assert.equal(offset(0,6,7),1);assert.equal(offset(6,0,7),-1);
 const queue=new Map();let serial=0;
 globalThis.matchMedia=()=>({matches:false});
 globalThis.requestAnimationFrame=fn=>{queue.set(++serial,fn);return serial};
 globalThis.cancelAnimationFrame=id=>queue.delete(id);
 const draws=[],listeners={};
 const element={addEventListener(name,fn){listeners[name]=fn},classList:{add(){},remove(){}},setPointerCapture(){},hasPointerCapture(){return false}};
 const spin=createSpinner(element,{count:()=>7,draw:p=>draws.push(p),spacing:()=>200});
 spin.step(1);for(let t=16;queue.size&&t<3000;t+=16){const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(t));}
 assert.equal(spin.position,1);assert.ok(draws.length>10);assert.ok(draws.some(p=>p>0&&p<1));
 const target={closest:()=>null};listeners.pointerdown({pointerId:1,button:0,clientX:200,clientY:0,target});listeners.pointermove({pointerId:1,clientX:140,clientY:0});assert.ok(Math.abs(spin.position-1.3)<.001);spin.stop();
});
