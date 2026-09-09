const assert = require('node:assert/strict');
const { stepBall } = require('../out/ballPhysics');
const { normalizeBackground } = require('../out/backgroundSettings');

assert(stepBall({x:191,y:50,vx:140,vy:0},200,120,0.04).vx < 0);
assert(stepBall({x:9,y:50,vx:-140,vy:0},200,120,0.04).vx > 0);
assert(stepBall({x:50,y:9,vx:140,vy:-200},200,120,0.04).vy > 0);
assert(stepBall({x:50,y:111,vx:140,vy:200},200,120,0.04).vy < 0);
let ball = {x:250,y:180,vx:170,vy:270};
for (const [width,height] of [[360,620],[180,200],[800,160],[16,16]]) {
  for(let i=0;i<2000;i++) {
    ball=stepBall(ball,width,height,i===0 ? 3600 : 1/60);
    assert(ball.x >= 8 && ball.x <= width-8, 'ball stays within horizontal bounds after resize');
    assert(ball.y >= 8 && ball.y <= height-8, 'ball stays within vertical bounds after resize');
    assert(Object.values(ball).every(Number.isFinite));
  }
}
assert.deepEqual(normalizeBackground(undefined), {kind:'none',fit:'cover',imageUri:undefined});
assert.equal(normalizeBackground({kind:'invalid',fit:'invalid'}).kind,'none');
assert.equal(normalizeBackground({kind:'custom'}).kind,'none');
for (const fit of ['cover','contain','tile']) {
 const saved={kind:'custom',fit,imageUri:'file:///local/copied-background.png'};
 assert.deepEqual(normalizeBackground(JSON.parse(JSON.stringify(saved))),saved);
}
console.log('PASS: ball collisions, resizing, resume bounds, and background setting restoration');
const { pixelBackgroundPresets, drawPixelScene } = require('../out/pixelBackgrounds');
for (const {kind} of pixelBackgroundPresets) {
  assert.equal(normalizeBackground({kind,fit:'cover'}).kind,kind);
  for (const [w,h] of [[40,60],[65,100],[125,50]]) {
    let draws=0;
    const ctx={fillStyle:'',fillRect(...values){assert(values.every(Number.isFinite));draws++;}};
    const drawn=drawPixelScene(ctx,w,h,kind);
    if(!['meadow','night'].includes(kind)){assert(drawn);assert(draws>10);}
  }
}
console.log('PASS: all background presets restore and render at narrow, tall, and wide sizes');
const { stepBallPlay } = require('../out/ballPlay');
let toy={x:350,y:100,vx:-140,vy:200};
for(let i=0;i<1800;i++)toy=stepBall(toy,500,400,1/60);
assert.equal(toy.y,8);assert.equal(toy.vx,0);assert.equal(toy.vy,0);
for(const width of [180,320,500]){
 let play={phase:'watch',elapsed:0,round:0,startX:0,targetX:0,direction:1,pause:1.5};
 let ball={x:width*.8,y:100,vx:-140,vy:200},x=0;const phases=new Set();
 for(let i=0;i<9000;i++){
  if(play.phase!=='mouth')ball=stepBall(ball,width,350,1/60);
  const result=stepBallPlay(play,ball,x,width,width/2-35,1/60);
  play=result.play;ball=result.ball;x=result.x;phases.add(play.phase);
  assert(Number.isFinite(x)&&Math.abs(x)<=width/2-35);
  assert(result.lift>=0&&result.lift<=68);
 }
 for(const phase of ['watch','stalk','crouch','pounce','mouth','recover'])assert(phases.has(phase),width+' missing '+phase);
 assert(play.round>=3,'play must progress through multiple bouts');
}
console.log('PASS: ball settles and completes watching, pounce, mouth/spit, and recovery bouts');
