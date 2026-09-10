// Run with NODE_PATH pointing to a temporary @electric-sql/pglite installation.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
(async()=>{
  const db=new PGlite();
  await db.exec('create role anon; create role authenticated;');
  await db.exec(readFileSync('supabase/migrations/202609100001_leaderboard.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202609100002_nickname_validation.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202609100003_public_rankings.sql','utf8'));
  const a='a'.repeat(64), b='b'.repeat(64), c='c'.repeat(64);
  async function rpc(token,action,nickname=null,days=null,level=null){
    await db.exec('set role anon');
    try { return (await db.query('select public.buddy_leaderboard($1,$2,$3,$4,$5) as result',[token,action,nickname,days,level])).rows[0].result; }
    finally { await db.exec('reset role'); }
  }
  assert.equal((await rpc(a,'join','Pixel',4,2)).status,'ok');
  assert.equal((await rpc(a,'join','Other',99,5)).status,'ok','idempotent join');
  assert.equal((await rpc(b,'join','Slime',4,3)).status,'ok');
  await db.exec('set role anon');
  const guest=(await db.query('select public.buddy_leaderboard_public() as result')).rows[0].result;
  await db.exec('reset role');
  assert.equal(guest.rows.length,2); assert.equal(guest.me,null);
  assert(!JSON.stringify(guest).includes('token_hash'));
  const page=await rpc(a,'read'); assert.equal(page.me.nickname,'Pixel');
  assert.equal(page.rows.length,2); assert(page.rows.every(r=>r.rank===1),'ties share rank');
  assert(!JSON.stringify(page).includes('token_hash')); assert.equal((await rpc(a,'read')).status,'wait');
  assert.equal((await rpc(a,'submit',null,5,2)).status,'wait');
  assert.equal((await rpc(c,'submit',null,5,2)).status,'missing');
  assert.equal((await rpc(c,'join','<script>',1,1)).status,'invalid');
  assert.equal((await rpc(null,'read')).status,'invalid');
  await assert.rejects(rpc(c,'join','  ',1,1),/buddy_nickname_trimmed/);
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from buddy_private.entries'),/permission denied/);
  await db.exec('reset role');
  await db.exec("update buddy_private.entries set updated=now()-interval '25 hours'");
  assert.equal((await rpc(a,'submit',null,999,2)).status,'invalid','impossible growth');
  assert.equal((await rpc(a,'submit',null,5,2)).status,'ok');
  await db.exec('update buddy_private.budget set registrations=50');
  assert.equal((await rpc(c,'join','Third',1,1)).status,'full','registration cap');
  await db.exec('update buddy_private.budget set registrations=0, member_limit=2');
  assert.equal((await rpc(c,'join','Third',1,1)).status,'full','member cap');
  await db.exec('update buddy_private.budget set request_limit=requests');
  assert.equal((await rpc(b,'read')).status,'budget');
  assert.equal((await db.query('select public.buddy_leaderboard_public() as result')).rows[0].result.status,'budget');
  assert.equal((await rpc(a,'leave')).status,'ok','deletion survives exhausted budget');
  assert.equal((await db.query('select count(*)::int as n from buddy_private.entries')).rows[0].n,1);
  await db.exec("update buddy_private.budget set month='2020-01-01',request_limit=100000");
  const afterReset=await rpc(c,'join','Third',1,1); assert.equal(afterReset.status,'ok');
  assert.equal((await db.query('select requests from buddy_private.budget')).rows[0].requests,1);
  await db.exec("update buddy_private.entries set updated=now()-interval '31 days'");
  assert.equal((await rpc(c,'read')).rows.length,0,'stale entries hidden');
  await db.close(); console.log('PostgreSQL permissions, ranking, validation, quotas, deletion and reset PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
