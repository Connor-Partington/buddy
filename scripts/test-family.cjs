const assert = require('node:assert/strict');
const { BuddyFamilyManager, maxBuddyChildren } = require('../out/familyManager');

async function main() {
  const values = new Map();
  const storage = { get: (key) => values.get(key), update: async (key, value) => { values.set(key, structuredClone(value)); } };
  let manager = new BuddyFamilyManager(storage);
  await manager.apply('haveChild');
  assert.deepEqual(manager.family, { hasPartner: false, children: 0 });
  await manager.apply('spawnPartner');
  await manager.apply('haveChild');
  await manager.apply('spawnPartner');
  assert.deepEqual(manager.family, { hasPartner: true, children: 1 });
  manager = new BuddyFamilyManager(storage);
  assert.deepEqual(manager.family, { hasPartner: true, children: 1 });
  await Promise.all(Array.from({ length: 10 }, () => manager.apply('haveChild')));
  assert.equal(manager.family.children, maxBuddyChildren);
  const snapshot = manager.family;
  snapshot.children = 99;
  assert.equal(manager.family.children, maxBuddyChildren);
  await manager.apply('clearFamily');
  assert.deepEqual(new BuddyFamilyManager(storage).family, { hasPartner: false, children: 0 });
  for (const saved of [null, {}, { hasPartner: false, children: 4 }, { hasPartner: true, children: NaN }]) {
    values.set('buddyFamily', saved);
    assert.equal(new BuddyFamilyManager(storage).family.children, 0);
  }
  values.set('buddyFamily', { hasPartner: true, children: 999 });
  assert.equal(new BuddyFamilyManager(storage).family.children, maxBuddyChildren);
  console.log('PASS: family prerequisites, duplicate partner, persistence, child limit, reset, and invalid saved state');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
const {chooseFamilyActivity,moveFamilyX,findSleepSpot}=require('../out/familyBehavior');
assert.equal(chooseFamilyActivity('idle',.99,0).state,'sleeping');
assert.equal(findSleepSpot(50,30,300,[{x:90,width:30}]),50);
assert.equal(findSleepSpot(50,30,300,[{x:50,width:30}]),88);
assert.equal(findSleepSpot(20,40,60,[{x:30,width:40}]),undefined);
for(const width of [80,160,220,480]) {
 const sleepers=[];
 for(const size of [58,31,31,31,31]) {
  const spot=findSleepSpot(width/2,size,width,sleepers);
  if(spot===undefined)continue;
  assert(sleepers.every(other=>Math.abs(spot-other.x)>=(size+other.width)/2+7.999));
  let x=width/2;
  for(let i=0;i<1000 && Math.abs(x-spot)>.1;i++){
    const next=moveFamilyX(x,spot,1/60);assert(Math.abs(next-x)<=40/60+.001);x=next;
  }
  assert(Math.abs(x-spot)<.1);sleepers.push({x:spot,width:size});
 }
}
assert.equal(moveFamilyX(0,100,1000),2);
console.log('PASS: sleep spacing, no-room handling, and bounded walking to sleep');
