import type * as vscode from 'vscode';
export const decorationCatalog = [
  { id: 'plant', name: 'Pixel plant', level: 2, streak: 0 },
  { id: 'cushion', name: 'Cozy cushion', level: 5, streak: 0 },
  { id: 'lamp', name: 'Reading lamp', level: 10, streak: 0 },
  { id: 'yarn', name: 'Yarn toy', level: 15, streak: 0 },
  { id: 'bonsai', name: 'Care bonsai', level: 0, streak: 3 },
  { id: 'star', name: 'Star mobile', level: 0, streak: 7 },
] as const;
export type Decoration = { id: string; x: number };
export class Decorations {
  private unlocked: string[];
  private placed: Decoration[];
  private writes: Promise<void> = Promise.resolve();
  public constructor(private storage: vscode.Memento) {
    const saved = storage.get<{ unlocked?: string[]; placed?: Decoration[] }>('buddy.decorations');
    this.unlocked = Array.isArray(saved?.unlocked) ? [...new Set(saved.unlocked.filter(id => decorationCatalog.some(item => item.id === id)))] : [];
    this.placed = Array.isArray(saved?.placed) ? saved.placed.filter(item => item && this.unlocked.includes(item.id) && Number.isFinite(item.x)).map(item => ({ id: item.id, x: Math.max(5, Math.min(95, item.x)) })) : [];
  }
  public get items(): Decoration[] { return this.placed.map(item => ({ ...item })); }
  public has(id: string): boolean { return this.unlocked.includes(id); }
  public async unlock(level: number, streak: number): Promise<string[]> {
    const earned = decorationCatalog.filter(item => !this.has(item.id) && (item.level ? level >= item.level : streak >= item.streak));
    if (earned.length) { this.unlocked.push(...earned.map(item => item.id)); await this.persist(); }
    return earned.map(item => item.name);
  }
  public async place(id: string, x?: number): Promise<void> {
    if (!this.has(id)) return;
    this.placed = this.placed.filter(item => item.id !== id);
    if (x !== undefined && Number.isFinite(x)) this.placed.push({ id, x: Math.max(5, Math.min(95, x)) });
    await this.persist();
  }
  private persist(): Promise<void> {
    const value = { unlocked: [...this.unlocked], placed: this.items };
    this.writes = this.writes.catch(() => undefined).then(() => this.storage.update('buddy.decorations', value));
    return this.writes;
  }
}
export function drawDecoration(ctx: { fillStyle: string; fillRect(x: number,y: number,w: number,h: number): void }, id: string) {
  const r=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  if(id==='plant'||id==='bonsai') {
    r(10,20,12,7,'#c47c65');r(8,18,16,3,'#ecad79');r(15,8,2,11,'#736347');
    r(7,8,9,5,'#75bb72');r(16,4,9,5,'#9fdb77');r(12,3,7,6,'#7dcc83');
    if(id==='bonsai'){r(3,10,10,5,'#91b58b');r(19,10,10,5,'#c1daa0');}
  }else if(id==='cushion'){r(3,21,26,6,'#a87eac');r(5,18,22,7,'#dab0bf');r(7,19,18,1,'#ffe2cc');}
  else if(id==='lamp'){r(14,10,3,16,'#9e88a5');r(9,26,13,2,'#d6bad0');r(8,3,16,9,'#ffe4a3');r(6,11,20,2,'#edbd7e');}
  else if(id==='yarn'){r(9,16,14,12,'#f094a5');r(7,19,18,6,'#f094a5');r(10,18,12,2,'#ffd0b8');r(10,22,12,2,'#c4668d');r(24,26,6,1,'#f094a5');}
  else if(id==='star'){r(15,0,1,10,'#a49ab5');r(13,10,5,12,'#ffdc84');r(9,13,13,5,'#ffdc84');r(12,12,7,7,'#fff0b7');}
}
