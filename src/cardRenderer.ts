import type { CardSnapshot } from './levelUpCards';
import type { cardDesign } from './levelUpCards';

type CardCanvas = {
  fillStyle: string; filter: string; imageSmoothingEnabled: boolean; globalAlpha: number;
  save(): void; restore(): void; scale(x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: unknown, x: number, y: number, w: number, h: number): void;
};
type CardImage = { naturalWidth: number; naturalHeight: number } | undefined;

// Draw on a 240 x 135 logical pixel grid, exported at 4x. No fonts or network assets.
export function drawPersonalCard(ctx: CardCanvas, card: CardSnapshot, image: CardImage,
  design: ReturnType<typeof cardDesign>, drawScene: (ctx: CardCanvas, w: number, h: number, kind: string) => boolean) {
  const glyphs: Record<string, string> = {
    A:'01110100011000111111100011000110001',B:'11110100011000111110100011000111110',C:'01111100001000010000100001000001111',D:'11110100011000110001100011000111110',E:'11111100001000011110100001000011111',F:'11111100001000011110100001000010000',G:'01111100001000010111100011000101111',H:'10001100011000111111100011000110001',I:'11111001000010000100001000010011111',J:'00111000100001000010100101001001100',K:'10001100101010011000101001001010001',L:'10000100001000010000100001000011111',M:'10001110111010110101100011000110001',N:'10001110011010110011100011000110001',O:'01110100011000110001100011000101110',P:'11110100011000111110100001000010000',Q:'01110100011000110001101011001001101',R:'11110100011000111110101001001010001',S:'01111100001000001110000010000111110',T:'11111001000010000100001000010000100',U:'10001100011000110001100011000101110',V:'10001100011000110001100010101000100',W:'10001100011000110101101011010101010',X:'10001100010101000100010101000110001',Y:'10001100010101000100001000010000100',Z:'11111000010001000100010001000011111',
    '0':'01110100011001110101110011000101110','1':'00100011000010000100001000010001110','2':'01110100010000100010001000100011111','3':'11110000010000101110000010000111110','4':'00010001100101010010111110001000010','5':'11111100001000011110000010000111110','6':'01110100001000011110100011000101110','7':'11111000010001000100010000100001000','8':'01110100011000101110100011000101110','9':'01110100011000101111000010000101110','/':'00001000100001000100010000100010000','-':'00000000000000011111000000000000000',':':'00000001000010000000001000010000000'
  };
  const rect = (x: number,y: number,w: number,h: number,color: string) => { ctx.fillStyle=color;ctx.fillRect(x,y,w,h); };
  const text = (value: string,x: number,y: number,color: string,scale=1) => {
    for (const char of value.toUpperCase()) {
      const glyph=glyphs[char];
      if(glyph) for(let i=0;i<35;i++) if(glyph[i]==='1') rect(x+i%5*scale,y+Math.floor(i/5)*scale,scale,scale,color);
      x+=6*scale;
    }
  };
  let randomState=design.hash;
  const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  ctx.save();ctx.scale(4,4);ctx.imageSmoothingEnabled=false;
  rect(0,0,240,135,'#171b31');
  ctx.save();ctx.filter='hue-rotate('+design.hue+'deg)';
  const kinds=['cherryBlossom','temple','spaceStation','neonCity','aquarium','mushroom'];
  if(design.scene<6) drawScene(ctx,240,135,kinds[design.scene]);
  else {
    const skies=['#503957','#18263f','#4d92aa','#121a39'];
    rect(0,0,240,135,skies[design.scene-6]);
    for(let i=0;i<45;i++) rect(Math.floor(random()*240),Math.floor(random()*100),1,1,'#e1d8ac');
    for(let layer=0;layer<3;layer++) for(let x=0;x<240;x++) {
      const y=Math.floor(77+layer*17+Math.sin(x/(15+layer*7)+design.variant)*12);
      rect(x,y,1,135-y,['#555473','#67768b','#819190'][layer]);
    }
    if(design.scene===8){rect(0,105,240,30,'#396e8a');for(let i=0;i<20;i++)rect(Math.floor(random()*240),108+Math.floor(random()*25),8,1,'#81c4c2');}
    if(design.scene===9){rect(145,37,60,24,'#697dac');rect(155,27,40,44,'#697dac');rect(163,31,26,34,'#a1bed0');}
  }
  ctx.restore();
  // Each user's seed changes the constellation and ornament arrangement for every level.
  for(let i=0;i<14+design.variant;i++){
    const x=135+Math.floor(random()*94),y=24+Math.floor(random()*52);
    rect(x,y,1,3,design.accent);rect(x-1,y+1,3,1,design.accent);
  }
  rect(4,4,232,2,design.accent);rect(4,129,232,2,design.accent);
  rect(4,6,2,123,design.accent);rect(234,6,2,123,design.accent);
  rect(10,10,220,14,'#171b31');text('BUDDY LEVEL UP',15,14,design.accent);
  text(String(card.level).padStart(3,'0')+'/100',181,14,'#fff1d4');
  rect(10,29,123,95,'#171b31');
  text('LEVEL '+String(card.level).padStart(3,'0'),15,35,'#fff1d4',2);
  text(design.title,15,57,design.accent);
  const number=(n:number)=>String(Math.max(0,Math.min(999999,Math.floor(n)||0)));
  text('DAY '+number(card.aliveDays),15,72,'#fff1d4');
  text('STREAK '+number(card.careStreak),15,83,'#fff1d4');
  text('QUESTS '+number(card.questsCompleted)+'/'+number(card.questsTotal),15,94,'#fff1d4');
  text('XP '+number(card.totalXp),15,105,design.accent);
  text(card.earnedAt.slice(0,10),15,115,'#a3b7c5');
  const rotations:Record<string,number>={green:0,mint:55,sky:110,blue:145,purple:190,pink:240,red:275,orange:305,gold:325};
  const buddy=(x:number,floor:number,height:number,color:string)=>{
    ctx.save();ctx.filter='hue-rotate('+(rotations[color]||0)+'deg)';
    if(image?.naturalWidth && image.naturalHeight){
      const width=Math.round(height*image.naturalWidth/image.naturalHeight);
      ctx.drawImage(image,Math.round(x-width/2),floor-height,width,height);
    }else{rect(x-height/3,floor-height*0.65,height*0.66,height*0.65,'#99e34b');rect(x-3,floor-height*0.45,1,3,'#171b31');rect(x+3,floor-height*0.45,1,3,'#171b31');}
    ctx.restore();
  };
  const family=card.family.hasPartner;
  rect(140,120,87,3,design.accent);
  buddy(family?168:185,family?97:117,46,card.colors.buddy);
  if(family){
    buddy(205,97,39,card.colors.partner);
    for(let i=0;i<Math.min(4,card.family.children);i++)buddy(150+i*21,118,18,card.colors.children);
  }
  // Ten ornaments evolve within each chapter; level 100 receives a crown.
  for(let i=0;i<=design.variant;i++)rect(145+i*8,126,4,1,design.accent);
  if(card.level===100){rect(174,58,22,4,design.accent);rect(174,52,4,6,design.accent);rect(183,49,4,9,design.accent);rect(192,52,4,6,design.accent);}
  ctx.restore();
}
