const assert = require('node:assert/strict');
const {FocusTimer}=require('../out/focusTimer');
const {Decorations,drawDecoration,decorationCatalog}=require('../out/decorations');
async function main(){
 const values=new Map(), storage={get:k=>structuredClone(values.get(k)),update:async(k,v)=>{values.set(k,structuredClone(v))}};
 const focus={isEnabled:false,async setEnabled(v){this.isEnabled=v;return v}};
 let timer=new FocusTimer(storage,focus);
 await timer.start(25,1000); assert(focus.isEnabled); assert.equal(await timer.tick(1500000),false);
 await timer.start(15,2000); assert.equal(timer.current.restoreFocus,false);
 timer=new FocusTimer(storage,focus); assert.equal(await timer.tick(902000),true);assert.equal(focus.isEnabled,false);assert.equal(await timer.tick(902001),false);
 focus.isEnabled=true;await timer.start(1,0);await timer.stop();assert.equal(focus.isEnabled,true);assert.equal(timer.current,undefined);
 focus.isEnabled=false;await timer.start(1,0);await timer.stop();assert.equal(focus.isEnabled,false);assert.equal(await timer.tick(999999),false);
 await assert.rejects(timer.start(NaN));await assert.rejects(timer.start(181));
 let d=new Decorations(storage);assert.deepEqual(await d.unlock(1,0),[]);await d.place('lamp',50);assert.deepEqual(d.items,[]);
 assert.deepEqual(await d.unlock(2,0),['Pixel plant']);await d.place('plant',500);assert.equal(d.items[0].x,95);
 d=new Decorations(storage);assert(d.has('plant'));assert.equal(d.items[0].x,95);await d.place('plant',10);assert.equal(d.items.length,1);
 assert.deepEqual(await d.unlock(1,3),['Care bonsai']);assert(d.has('plant'));await d.place('plant');assert.equal(d.items.length,0);
 await d.unlock(15,7);assert(decorationCatalog.every(i=>d.has(i.id)));assert.deepEqual(await d.unlock(100,100),[]);
 const signatures=decorationCatalog.map(item=>{let ops=[];drawDecoration({fillStyle:'',fillRect(...args){ops.push([this.fillStyle,...args])}},item.id);return JSON.stringify(ops)});assert.equal(new Set(signatures).size,6);
 console.log('PASS: focus timer persistence/cancel/expiry, decoration unlocks/placement');
}
main().catch(e=>{console.error(e);process.exitCode=1});
