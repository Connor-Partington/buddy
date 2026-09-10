const assert=require('node:assert/strict');
const {BuddyTutorial,tutorialSteps,basicTutorialSteps}=require('../out/tutorial');
(async()=>{
 const data=new Map(),storage={get:k=>structuredClone(data.get(k)),update:async(k,v)=>data.set(k,structuredClone(v))};
 let t=new BuddyTutorial(storage,false);await t.initialize();assert.equal(t.current.mode,'welcome');assert.equal(t.current.done,false);
 await t.action('basics');await t.action('next');
 t=new BuddyTutorial(storage,true);assert.equal(t.current.mode,'basics');assert.equal(t.current.step,1);assert.equal(t.current.done,false);
 await t.action('back');assert.equal(t.current.step,0);await t.action('back');assert.equal(t.current.mode,'welcome');
 await t.action('full');for(let i=0;i<tutorialSteps.length;i++)await t.action('next');assert(t.current.done);
 t=new BuddyTutorial(storage,false);assert(t.current.done,'Completion survives restart');
 await t.action('replay');assert(!t.current.done);await t.action('basics');for(let i=0;i<basicTutorialSteps.length;i++)await t.action('next');assert(t.current.done);
 await t.action('replay');await t.action('skip');assert(new BuddyTutorial(storage,false).current.done);
 assert.equal(new BuddyTutorial({get:()=>undefined,update:async()=>{}},true).current.done,true,'Existing installations do not auto-start a new tour');
 assert.deepEqual(basicTutorialSteps.map(i=>tutorialSteps[i].target),['buddy','buddy','health','buddy','buddy']);
 console.log('PASS: full/basic tours, progress restoration, back, completion, skip, replay, and existing-user migration');
})().catch(e=>{console.error(e);process.exitCode=1});
