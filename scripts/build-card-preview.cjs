// Local-only visual QA: actual Provider canvas renderer and overlay, simulated host storage.
require('./build-preview.cjs');
const fs = require('node:fs');
const path = require('node:path');
const output=path.join(__dirname,'../out/preview');
let scene=fs.readFileSync(path.join(output,'scene.html'),'utf8');
scene=scene.replace('postMessage(){}',"postMessage(message){parent.postMessage(message,location.origin)}");
fs.writeFileSync(path.join(output,'cards-scene.html'),scene);
fs.writeFileSync(path.join(output,'cards.html'),`<!doctype html><meta charset="utf-8"><title>Buddy card QA</title>
<style>body{margin:0;background:#171b31;color:#fff1d4;font:14px monospace}iframe{display:block;width:480px;height:500px;border:0}button,input{margin:6px}aside{position:fixed;left:800px;top:0;width:350px}#renders img{width:240px;image-rendering:pixelated}</style>
<iframe title="Buddy panel" src="cards-scene.html"></iframe>
<aside><button id="solo">Solo card</button><button id="family">Family card</button><button id="gallery">Gallery</button><button id="all">Render 100 designs</button><button id="narrow">Narrow panel</button><button id="wide">Wide panel</button>
<p id="status">Waiting for panel</p></aside><div id="renders"></div>
<script>
const frame=document.querySelector('iframe'), cards=[];
let galleryMode=false;
const send=data=>frame.contentWindow.postMessage(data,location.origin);
const snapshot=(level,family=false,seed='local-user-one')=>({id:seed+'-'+level,seed,level,earnedAt:'2026-09-10T00:00:00Z',aliveDays:18,careStreak:5,questsCompleted:2,questsTotal:4,totalXp:8200,family:{hasPartner:family,children:family?4:0},colors:{buddy:'mint',partner:'purple',children:'pink'}});
window.addEventListener('message',e=>{
 const m=e.data;
 if(m.type==='cardsReady') document.querySelector('#status').textContent='Ready';
 if(m.type==='levelUpCardCaptured'){
  const card={id:m.id,level:m.level,label:'Level '+m.level+' · 2026-09-10',imageUri:m.dataUri};
  cards.unshift(card);
  const image=document.createElement('img');image.src=m.dataUri;image.alt=m.id;document.querySelector('#renders').append(image);
  document.querySelector('#status').textContent='Rendered '+cards.length+' cards';
  if(!galleryMode)send({type:'showCards',cards:[card],gallery:false});
 }
 if(m.type==='openCardGallery')send({type:'showCards',cards,gallery:true});
 if(m.type==='openCard')document.querySelector('#status').textContent='Open image: '+m.id;
 if(m.type==='levelUpCardFailed')document.querySelector('#status').textContent='ERROR: '+m.error;
});
document.querySelector('#solo').onclick=()=>{galleryMode=false;send({type:'captureLevelUpCard',snapshot:snapshot(25)})};
document.querySelector('#family').onclick=()=>{galleryMode=false;send({type:'captureLevelUpCard',snapshot:snapshot(100,true,'local-user-two')})};
document.querySelector('#gallery').onclick=()=>send({type:'showCards',cards,gallery:true});
document.querySelector('#all').onclick=()=>{galleryMode=true;for(let i=1;i<=100;i++)send({type:'captureLevelUpCard',snapshot:snapshot(i,i%2===0)})};
document.querySelector('#narrow').onclick=()=>{frame.style.width='220px';frame.style.height='360px'};
document.querySelector('#wide').onclick=()=>{frame.style.width='780px';frame.style.height='560px'};
</script>`);
console.log('Card QA: out/preview/cards.html');
