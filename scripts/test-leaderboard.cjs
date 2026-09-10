const assert = require('node:assert/strict');
const { BuddyLeaderboard, leaderboardDay, validNickname } = require('../out/leaderboard');
function fixture() {
  const state = new Map(), secrets = new Map(); let now = 100 * leaderboardDay;
  const calls = []; let reply = { status: 'ok' }; let fail = false;
  const board = new BuddyLeaderboard({ get: (k,d) => state.get(k) ?? d, update: async(k,v) => state.set(k,v) },
    { get: async k => secrets.get(k), store: async(k,v) => secrets.set(k,v), delete: async k => secrets.delete(k) },
    {url:'https://example.supabase.co',key:'public-key'}, async (url,options) => {
      calls.push({url,body:JSON.parse(options.body)}); if(fail) throw Error('offline');
      return new Response(JSON.stringify(reply));
    }, () => now);
  return {board,calls,secrets,state,advance: ms => now += ms,setReply: v=>reply=v,setFail:v=>fail=v};
}
(async () => {
  assert(validNickname('Pixel pal')); assert(!validNickname('<script>')); assert(!validNickname('x'.repeat(21)));
  const guest = fixture();
  guest.setReply({status:'ok',rows:[],me:null});
  assert.equal((await guest.board.read()).cached,false);
  assert(guest.calls[0].url.endsWith('/buddy_leaderboard_public'));
  assert.deepEqual(guest.calls[0].body,{}); assert.equal(guest.secrets.size,0);
  assert(!guest.board.state.joined);
  await guest.board.read(); assert.equal(guest.calls.length,1,'guest cache');
  const f = fixture(), score = {days:5,level:2};
  await f.board.sync(score); assert.equal(f.calls.length,0,'opt-out makes no requests');
  await assert.rejects(f.board.join('<bad>',score)); assert.equal(f.calls.length,0);
  await f.board.join('Pixel pal',score);
  assert.match(f.calls[0].body.p_token,/^[a-f0-9]{64}$/); assert.equal(f.secrets.size,1);
  assert(!JSON.stringify([...f.state]).includes(f.calls[0].body.p_token),'token only in SecretStorage');
  await f.board.sync({days:6,level:3}); assert.equal(f.calls.length,1,'24-hour upload throttle');
  f.advance(leaderboardDay); await f.board.sync(score); assert.equal(f.calls.length,1,'unchanged score');
  await Promise.all([f.board.sync({days:6,level:3}),f.board.sync({days:6,level:3})]);
  assert.equal(f.calls.length,2,'concurrent sync serialized');
  const row={nickname:'Pixel pal',days:6,level:3,rank:1,updated:new Date().toISOString()};
  f.setReply({status:'ok',rows:[row],me:row});
  assert.equal((await f.board.read()).cached,false); const count=f.calls.length;
  await f.board.read(); assert.equal(f.calls.length,count,'six-hour cache');
  f.advance(6*3600000); f.setFail(true);
  const offline=await f.board.read(); assert.equal(offline.page.rows.length,1); assert(offline.notice);
  await f.board.read(); assert.equal(f.calls.length,count+1,'failure backoff');
  f.setFail(false); f.advance(60000); f.setReply({status:'budget',retry_after:86400});
  assert.match((await f.board.read()).notice,/allowance/);
  f.setReply({status:'ok'}); await f.board.leave(); assert.equal(f.secrets.size,0,'deletion bypasses budget backoff');
  assert(!f.board.state.joined); assert(!f.board.state.cache);
  const g=fixture(); await g.board.join('Buddy',score); g.setFail(true);
  await assert.rejects(g.board.leave()); assert(!g.board.state.joined,'failed deletion stops uploads');
  assert.equal(g.secrets.size,1,'retain identity for deletion retry');
  g.advance(leaderboardDay); await g.board.sync({days:6,level:2}); assert.equal(g.calls.length,2);
  g.setFail(false); g.setReply({status:'ok',rows:[{...row,nickname:'<invalid>'}],me:null});
  await g.board.join('Buddy',score); assert.match((await g.board.read()).notice,/Invalid/);
  console.log('Leaderboard opt-in, secret storage, throttling, cache, offline, budget and removal PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
