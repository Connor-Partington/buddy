const assert=require('node:assert/strict');
const {FamilyMoments}=require('../out/familyMoments');
(async()=>{
 const data=new Map(), storage={get:k=>structuredClone(data.get(k)),update:async(k,v)=>{data.set(k,structuredClone(v))}};
 let moments=new FamilyMoments(storage);
 const event={kind:'near',speaker:0,target:1},start=new Date(2026,8,10,10).getTime();
 const intro=await moments.consider(event,2,start,0);assert(intro);assert.equal(intro.affectionate,false);
 moments=new FamilyMoments(storage);
 assert.equal(await moments.consider(event,2,start+60000,0),undefined,'Reload preserves quiet time');
 assert.equal(await moments.consider(event,2,start+46*60000,.9),undefined,'Elapsed time alone never forces chatter');
 assert(await moments.consider(event,2,start+50*60000,0));
 assert(await moments.consider(event,2,start+100*60000,0));
 assert.equal(await moments.consider(event,2,start+150*60000,0),undefined,'Global daily cap');
 const familiar=await moments.consider(event,2,start+86400000,0);assert.equal(familiar.affectionate,true);assert.notEqual(familiar.text,intro.text);
 for(let day=2;day<5;day++)await moments.consider(event,2,start+day*86400000,0);
 assert.equal(data.get('buddy.familyMoments').pairs['0:1'].days.length,5);
 const reversed=await moments.consider({kind:'near',speaker:1,target:0},2,start+5*86400000,0);assert(reversed.affectionate,'Relationship is shared by the pair');
 assert.equal(await moments.consider({kind:'near',speaker:9,target:0},2,start+6*86400000,0),undefined);
 await moments.reconcile(0);await moments.reconcile(2);
 assert.equal((await moments.consider(event,2,start+7*86400000,0)).affectionate,false,'New family starts fresh');
 // Simultaneous encounters cannot each bypass the global cooldown.
 const concurrent=await Promise.all([moments.consider(event,2,start+8*86400000,0),moments.consider({kind:'ball',speaker:1,target:-1},2,start+8*86400000,0)]);
 assert.equal(concurrent.filter(Boolean).length,1);
 console.log('PASS: scenario-driven dialogue, saved bonds, quiet periods, daily cap, reset, and concurrent encounters');
})().catch(error=>{console.error(error);process.exitCode=1});
