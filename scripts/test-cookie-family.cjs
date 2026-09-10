const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {findSleepSpot,moveFamilyX}=require('../out/familyBehavior');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/Provider.ts'),'utf8');
const functions=['familyFloor','updateFamilyLayout','getWalkLimit','applyWalkPosition','spawnCookie'];
const code=functions.map(name=>{
 const match=source.match(new RegExp('    function '+name+'\\([^]*?\\n    }'));
 assert(match, name);return match[0];
}).join('\n');
for(const width of [160,220,480,780]) {
 const members=Array.from({length:5},(_,i)=>({dataset:{partner:String(i===0)},style:{},firstElementChild:{style:{}}}));
 const activity=new Map(members.map(m=>[m,{state:'idle'}]));
 const props={};
 const ctx={findSleepSpot,moveFamilyX,currentState:'idle',baseSpriteDisplaySizes:{sleeping:{width:'86'}},stage:{clientWidth:width},buddySize:'small',buddySizeScales:{small:.72},familyMembers:{children:members},familyActivity:activity,
 familySocial:undefined,isFocusModeEnabled:false,performance:{now:()=>100},spriteStage:{getBoundingClientRect:()=>({width:55}),style:{setProperty:(k,v)=>{props[k]=v}}},getPanelWidth:()=>width,walkVisibleWidthRatio:1,walkX:0,walkDirection:1,activeLookState:undefined,updateSoulWanderBounds(){},
 cookieTreat:{offsetWidth:20},isDead:false,isReviving:false,isIntroPlaying:false,isBreakPromptActive:false,isCookieInteractionActive:()=>false,removeBall(){},clearLookReaction(){},clearClickReaction(){},dismissBreakPrompt(){},clearCookieEatTimer(){},clearRandomWalk(){},imageSources:{cookie:'cookie'},applyCookiePosition(){},setCookieState(){},requestAnimationFrame(){}};
 vm.createContext(ctx);vm.runInContext(code,ctx);vm.runInContext('updateFamilyLayout(0)',ctx);
 const positions=members.map(m=>[m.style.left,m.style.bottom]);
 for(const target of [-1000,1000]) {
  ctx.target=target;vm.runInContext('spawnCookie(target)',ctx);
  assert(Math.abs(ctx.cookieX)<=vm.runInContext('getWalkLimit(true)',ctx),'Cookie stays in Buddy walking space');
  for(const x of [-80,0,80]){
   ctx.walkX=x;vm.runInContext('applyWalkPosition(100); updateFamilyLayout(1/60)',ctx);
   assert.deepEqual(members.map(m=>[m.style.left,m.style.bottom]),positions,'Cookie chase cannot move stationary family');
  }
 }
}
console.log('PASS: cookie drops and Buddy chase movement preserve stationary family floor positions');
