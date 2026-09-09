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
const { chooseFamilyActivity, arrangeFamily } = require('../out/familyBehavior');
assert.equal(chooseFamilyActivity('idle',0.99,0).state,'sleeping');
assert.equal(chooseFamilyActivity('sleeping',0.99,0).state,'idle');
for(const width of [80,160,220,320,500]) {
  for(const center of [20,width/2,width-20]) {
    const widths=[58,31,31,31,31];
    const spots=arrangeFamily(width,center,70,140,widths);
    spots.forEach((spot,i)=>{
      assert(spot.x-widths[i]/2>=0 && spot.x+widths[i]/2<=width);
      if(spot.bottom===8)assert(spot.x+widths[i]/2<=center-35 || spot.x-widths[i]/2>=center+35);
      for(let j=0;j<i;j++)if(spot.bottom===spots[j].bottom)assert(Math.abs(spot.x-spots[j].x)>=(widths[i]+widths[j])/2+8);
    });
  }
}
console.log('PASS: independent activity transitions and non-overlapping family footprints');
