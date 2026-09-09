// Render the compiled webview with temporary demo state for release recordings.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(id, ...rest) {
  if (id === 'vscode') return { EventEmitter: class { event = () => ({ dispose() {} }); fire() {} } };
  return originalLoad.call(this, id, ...rest);
};
const root = path.resolve(__dirname, '..');
const { Provider } = require('../out/Provider');
Module._load = originalLoad;
const provider = new Provider({}, false);
provider.setDailyQuests({date:'2026-09-09',completedCount:1,totalCount:4,quests:[{id:'saveFiles',label:'Save 10 files',progress:10,target:10,completed:true,rewardXp:10},{id:'makeCommit',label:'Make 1 commit',progress:0,target:1,completed:false,rewardXp:10},{id:'takeBreak',label:'Take a break',progress:0,target:1,completed:false,rewardXp:10},{id:'pushWork',label:'Push today’s work',progress:0,target:1,completed:false,rewardXp:10}]});
provider.setFamily({ hasPartner: true, children: 2 });
provider.setBackground({ kind: 'cherryBlossom', fit: 'cover' });
const source = fs.readFileSync(path.join(root, 'src/Provider.ts'), 'utf8');
const assets = marker => Object.fromEntries([...source.slice(source.indexOf(marker)).matchAll(/(\w+): '([^']+\.(?:gif|png))'/g)].map(([, key, file]) => [key, `data:image/${file.endsWith('.gif') ? 'gif' : 'png'};base64,${fs.readFileSync(path.join(root, 'assets/images', file)).toString('base64')}`]));
let html = provider.getHtml({ cspSource: "data:" }, assets('const spriteFiles:'), assets('const imageFiles:'));
const nonce = html.match(/script nonce="([^"]+)/)[1];
html = html.replace('<script nonce=', `<script nonce="${nonce}">window.acquireVsCodeApi=()=>({postMessage(){},setState(){},getState(){}});</script><script nonce=`);
html = html.replace('</head>', `<style nonce="${nonce}">:root{--vscode-sideBar-background:#191a20;--vscode-sideBar-foreground:#ddd;--vscode-font-family:Arial;--vscode-font-size:12px}</style></head>`);
const output = path.join(root, 'out/preview');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'scene.html'), html);
fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Buddy release preview</title>
<style>body{margin:0;background:#191a20;color:#ddd;font:14px monospace}iframe{display:block;border:0;width:480px;height:480px}button{margin:12px}p{margin:12px;max-width:480px}</style>
<iframe title="Buddy panel" src="scene.html"></iframe><button id="start">Start preview</button><p id="status">Actual compiled Buddy panel · temporary demo state</p>
<script>
const frame=document.querySelector('iframe');
const send=data=>frame.contentWindow.postMessage(data,location.origin);
document.querySelector('#start').onclick=()=>{
 document.querySelector('#start').disabled=true;
 document.querySelector('#status').textContent='Recording preview';
 send({type:'spawnBall'});
 const background=kind=>send({type:'setBackground',background:{kind,fit:'cover'}});
 setTimeout(()=>background('temple'),8000);
 setTimeout(()=>{background('spaceStation');send({type:'setColors',colors:{buddy:'mint',partner:'purple',children:'pink'}})},16000);
 setTimeout(()=>background('neonCity'),24000);
 setTimeout(()=>background('mushroom'),32000);
 setTimeout(()=>{background('night');send({type:'setFocusMode',enabled:true})},40000);
 setTimeout(()=>document.querySelector('#status').textContent='Preview complete',44000);
};
</script>`);
console.log('Preview: out/preview/index.html (serve the repository over localhost).');
