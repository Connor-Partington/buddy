// Temporary host controls exercise the actual compiled webview without touching saved Buddy state.
require('./build-preview.cjs');
const fs=require('node:fs'),path=require('node:path');
const output=path.join(__dirname,'../out/preview');
let scene=fs.readFileSync(path.join(output,'scene.html'),'utf8');
scene=scene.replace('postMessage(){}','postMessage(message){parent.postMessage(message,location.origin)}');
scene=scene.replace("    const vscode = acquireVsCodeApi();",`    window.addEventListener('message',event=>{if(event.data.type==='qaSocial'){
      for(const activity of familyActivity.values()){activity.state='idle';activity.nextAt=performance.now()+30000;activity.reactionUntil=0;}
      familySocial={pair:[1,2],kind:event.data.kind,started:performance.now(),until:performance.now()+12000};nextFamilySocial=performance.now()+30000;updateFamilySprites();
    }});
    const vscode = acquireVsCodeApi();`);
fs.writeFileSync(path.join(output,'leisure-scene.html'),scene);
fs.writeFileSync(path.join(output,'leisure.html'),`<!doctype html><meta charset="utf-8"><title>Buddy leisure QA</title>
<style>body{margin:0;background:#191a20;color:#ddd;font:14px monospace}iframe{display:block;border:0;width:480px;height:500px}aside{position:fixed;top:0;left:800px;width:400px}button{margin:8px}</style>
<iframe title="Buddy panel" src="leisure-scene.html"></iframe><aside>
<button id="decor">Decorations</button><button id="focus">Focus</button><button id="finish">Finish focus</button><button id="chase">Chase</button><button id="curl">Curl</button><button id="greet">Greet</button><button id="ball">Ball</button><button id="narrow">Narrow</button><button id="wide">Wide</button><p id="status">Loading</p></aside>
<script>
const frame=document.querySelector('iframe'),send=data=>frame.contentWindow.postMessage(data,location.origin);
window.addEventListener('message',e=>{if(e.data.type==='cardsReady')document.querySelector('#status').textContent='Ready'});
document.querySelector('#decor').onclick=()=>send({type:'setDecorations',items:['plant','cushion','lamp','yarn','bonsai','star'].map((id,i)=>({id,x:8+i*17}))});
document.querySelector('#focus').onclick=()=>{send({type:'setFocusMode',enabled:true});send({type:'focusDeadline',endsAt:Date.now()+1500000})};
document.querySelector('#finish').onclick=()=>{send({type:'setFocusMode',enabled:false});send({type:'focusDeadline'});send({type:'focusComplete'})};
for(const kind of ['chase','curl','greet'])document.querySelector('#'+kind).onclick=()=>send({type:'qaSocial',kind});
document.querySelector('#ball').onclick=()=>send({type:'spawnBall'});
document.querySelector('#narrow').onclick=()=>{frame.style.width='220px';frame.style.height='360px'};
document.querySelector('#wide').onclick=()=>{frame.style.width='780px';frame.style.height='500px'};
</script>`);
