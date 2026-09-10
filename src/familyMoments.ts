import type * as vscode from 'vscode';
export type FamilyMoment = { kind: 'meet' | 'near' | 'ball' | 'wake'; speaker: number; target: number };
export type FamilyDialogue = FamilyMoment & { text: string; reply: string; affectionate: boolean };
type Bond = { days: string[]; introduced: boolean; lastLine?: string };
type Memory = { pairs: Record<string, Bond>; nextAt: number; day: string; count: number };
const lines = {
  curious: [['HELLO... DO YOU ALSO WOBBLE?', 'ONLY WHEN I AM AWAKE.'], ['IS THIS SPOT TAKEN?', 'THERE IS ROOM FOR TWO.'], ['ARE WE THE SAME KIND OF SQUISH?', 'LET US FIND OUT.']],
  familiar: [['SAVED YOU A LITTLE PATCH.', 'MY FAVOURITE PATCH.'], ['RACE YOU TO THAT PIXEL?', 'YOU ARE ON.'], ['YOU MAKE A GOOD NEIGHBOUR.', 'YOU MAKE A GOOD PILLOW.']],
  close: [['MY FAVOURITE LITTLE BLOB.', 'RIGHT BACK AT YOU.'], ['TEAM SQUISH?', 'ALWAYS.'], ['GLAD YOU ARE HERE.', 'WOULD NOT MISS IT.']],
  ball: [['YOUR TURN!', 'BOOP IT THIS WAY.'], ['I CAUGHT A ROUND FRIEND.', 'THAT ONE DOES NOT TALK.'], ['ONE MORE BOUNCE?', 'A TINY ONE.']],
  wake: [['DID I MISS ANYTHING?', 'A VERY EXCITING PIXEL.'], ['FIVE MORE WOBBLES...', 'TAKE YOUR TIME.']],
};
/** Persistent, scenario-driven chatter. A cooldown is a ceiling on frequency, never a speaking timer. */
export class FamilyMoments {
  private state: Memory;
  private queue: Promise<unknown> = Promise.resolve();
  public constructor(private readonly storage: vscode.Memento) {
    this.state = storage.get<Memory>('buddy.familyMoments') ?? {pairs:{},nextAt:0,day:'',count:0};
  }
  public reconcile(count: number): Promise<void> {
    return this.serialize(async () => {
      for (const key of Object.keys(this.state.pairs)) if (key.split(':').some(id => Number(id) >= count)) delete this.state.pairs[key];
      await this.save();
    });
  }
  public consider(event: FamilyMoment, count: number, now = Date.now(), roll = Math.random()): Promise<FamilyDialogue | undefined> {
    return this.serialize(async () => {
      if (!['meet','near','ball','wake'].includes(event.kind) || !Number.isInteger(event.speaker) || !Number.isInteger(event.target) || event.speaker < 0 || event.speaker >= count || event.target < -1 || event.target >= count || event.speaker === event.target) return undefined;
      const date = new Date(now), day = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
      if (this.state.day !== day) { this.state.day = day; this.state.count = 0; }
      const key = [event.speaker,event.target].sort((a,b)=>a-b).join(':');
      const bond = this.state.pairs[key] ??= {days:[],introduced:false};
      if (!bond.days.includes(day)) bond.days = [...bond.days,day].slice(-5);
      let dialogue: FamilyDialogue | undefined;
      if (now >= this.state.nextAt && this.state.count < 3 && (!bond.introduced || (event.kind !== 'meet' && roll < .3))) {
        const pool = !bond.introduced ? lines.curious : event.kind === 'ball' ? lines.ball : event.kind === 'wake' ? lines.wake : bond.days.length >= 5 ? lines.close : bond.days.length >= 2 ? lines.familiar : lines.curious;
        const choices = pool.filter(line=>line[0]!==bond.lastLine);
        const [text,reply] = choices[Math.min(choices.length-1,Math.floor(roll*choices.length))];
        dialogue = {...event,text,reply,affectionate:bond.introduced && bond.days.length >= 2};
        bond.introduced = true; bond.lastLine = text;
        this.state.count++;
        this.state.nextAt = now + (45 + roll*105)*60000;
      }
      await this.save();
      return dialogue;
    });
  }
  private save() { return this.storage.update('buddy.familyMoments',structuredClone(this.state)); }
  private serialize<T>(work:()=>Promise<T>):Promise<T> {
    const result = this.queue.catch(()=>undefined).then(work);this.queue=result;return result;
  }
}
