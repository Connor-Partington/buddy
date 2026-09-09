const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { LevelUpCards, cardDesign } = require('../out/levelUpCards');
const { drawPersonalCard } = require('../out/cardRenderer');
const { drawPixelScene } = require('../out/pixelBackgrounds');
const details = { level:25, aliveDays:18, careStreak:3, questsCompleted:2, questsTotal:4,totalXp:8000,
  family:{hasPartner:false,children:0},colors:{buddy:'mint',partner:'pink',children:'blue'} };
(async()=>{
  const data = new Map();
  const storage = { get:(k,fallback)=>structuredClone(data.has(k)?data.get(k):fallback),update:async(k,v)=>{data.set(k,structuredClone(v));} };
  const collection = await LevelUpCards.create(storage);
  const first = await collection.earn(details);
  details.family.hasPartner=true; details.colors.buddy='red';
  assert.equal(first.family.hasPartner,false,'snapshot is detached from live family');
  assert.equal(first.colors.buddy,'mint','snapshot keeps earned color');
  const reloaded=await LevelUpCards.create(storage);
  assert.equal(reloaded.seed,collection.seed,'seed persists across reload');
  assert.deepEqual(reloaded.waiting,[first],'closed-panel cards survive reload');
  const other=await LevelUpCards.create({get:(_k,f)=>f,update:async()=>{}});
  assert.notEqual(other.seed,collection.seed,'separate profiles receive their own seed');
  const signatures=new Set();
  for(let level=1;level<=100;level++) {
    const design=cardDesign(collection.seed,level);
    assert.deepEqual(design,cardDesign(collection.seed,level));
    signatures.add(JSON.stringify(design));
    assert.notDeepEqual(design,cardDesign(other.seed,level));
  }
  assert.equal(signatures.size,100);
  function render(snapshot) {
    const operations=[];let imageCount=0;
    const ctx={fillStyle:'',filter:'none',globalAlpha:1,imageSmoothingEnabled:true,
      save(){},restore(){},scale(){},fillRect(...args){assert(args.every(Number.isFinite));operations.push([this.fillStyle,...args]);},
      drawImage(_image,...args){assert(args.every(Number.isFinite));imageCount++;operations.push([this.filter,...args]);}};
    drawPersonalCard(ctx,snapshot,{naturalWidth:20,naturalHeight:35},cardDesign(snapshot.seed,snapshot.level),drawPixelScene);
    return {imageCount,hash:createHash('sha256').update(JSON.stringify(operations)).digest('hex')};
  }
  assert.equal(render(first).imageCount,1,'solo Buddy has no invented family');
  const family={...first,family:{hasPartner:true,children:4}};
  assert.equal(render(family).imageCount,6,'Buddy, partner, and four kids are rendered');
  assert.equal(render({...family,family:{hasPartner:false,children:4}}).imageCount,1,'invalid orphan children never render');
  assert.equal(new Set(Array.from({length:100},(_,i)=>render({...first,level:i+1}).hash)).size,100,'all 100 cards render differently');
  assert.equal(render(first).hash,render(first).hash,'redraw is stable');
  assert.notEqual(render(first).hash,render({...first,seed:other.seed}).hash);
  await reloaded.complete(first.id);
  assert.deepEqual((await LevelUpCards.create(storage)).waiting,[],'only saved cards leave the pending queue');
  console.log('PASS: personal seeds, immutable snapshots, pending persistence, 100 deterministic designs, solo and full family rendering');
})().catch(error=>{console.error(error);process.exitCode=1;});

// Exercise the extension-to-webview handshake: early captures must remain queued.
(async()=>{
  const Module=require('node:module'), original=Module._load;
  const uri=path=>({path,toString:()=>path});
  class Emitter { listeners=[]; event=fn=>{this.listeners.push(fn);return{dispose(){}}}; fire(value){this.listeners.forEach(fn=>fn(value));} }
  Module._load=function(id,...rest){if(id==='vscode')return {EventEmitter:Emitter,Uri:{parse:uri,joinPath:(base,...parts)=>uri(base.path+'/'+parts.join('/'))}};return original.call(this,id,...rest);};
  const {Provider}=require('../out/Provider');Module._load=original;
  const provider=new Provider(uri('file:///extension'),false,uri('file:///storage'));
  const messages=[];let receive,dispose;
  const view={visible:true,onDidDispose(fn){dispose=fn;},onDidChangeVisibility(){},webview:{
    cspSource:'https://local.test',options:{},html:'',onDidReceiveMessage(fn){receive=fn;},
    asWebviewUri:source=>uri('https://local.test/'+source.path),postMessage:async message=>{messages.push(message);return true;}}};
  const snapshot={...details,id:'test',seed:'test-user',earnedAt:'2026-09-10T00:00:00Z'};
  assert.equal(await provider.captureLevelUpCard(snapshot),false);
  provider.showCards([{id:'old-card',level:5,label:'Legacy card',imageUri:'file:///storage/level-up-cards/old.png'}],true);
  await provider.resolveWebviewView(view);
  assert.equal(await provider.captureLevelUpCard(snapshot),false,'HTML assignment is not readiness');
  receive({type:'cardsReady'});
  assert.equal(messages[0].type,'showCards');assert.equal(messages[0].gallery,true);
  assert(messages[0].cards[0].imageUri.startsWith('https://local.test/'));
  assert.equal(await provider.captureLevelUpCard(snapshot),true);
  assert.deepEqual(messages.at(-1).snapshot,snapshot);
  let capture;provider.onDidCaptureLevelUpCard(value=>capture=value);
  receive({type:'levelUpCardCaptured',id:'test',level:25,dataUri:'data:image/png;base64,eA=='});
  assert.equal(capture.id,'test');
  dispose();assert.equal(await provider.captureLevelUpCard(snapshot),false,'disposed panels do not accept captures');
  console.log('PASS: card readiness handshake, pending gallery delivery, local image URIs, snapshot transport, and panel disposal');
})().catch(error=>{console.error(error);process.exitCode=1;});
