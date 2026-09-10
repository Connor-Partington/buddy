import type * as vscode from 'vscode';
export const tutorialSteps = [
  {text:"HI! I'M BUDDY. YOUR LITTLE CODING COMPANION.",target:'buddy'},
  {text:'I KEEP YOU COMPANY WHILE YOU CODE. SOMETIMES I NEED A LITTLE NAP.',target:'buddy'},
  {text:'CLICK ME FOR A LITTLE LOVE!',target:'buddy'},
  {text:"THE COOKIE ICON AT THE TOP GIVES ME A TREAT. I WILL WOBBLE OVER AND GET IT!",target:'buddy'},
  {text:'THESE HEARTS SHOW HOW I AM DOING. TREATS HELP RESTORE MY HEALTH.',target:'health'},
  {text:'IF I LOSE ALL MY HEARTS, THE REVIVE ICON AT THE TOP BRINGS ME BACK.',target:'health'},
  {text:'THIS SHOWS MY ATTENTION. COME SAY HELLO SOMETIMES.',target:'attention'},
  {text:'I EARN XP AS YOU WORK. LEVEL UP WITH ME!',target:'xp'},
  {text:"OPEN DAILY TO SEE TODAY'S LITTLE GOALS.",target:'quests'},
  {text:'THE BALL ICON AT THE TOP BRINGS OUT MY TOY. PRESS IT AGAIN TO PUT IT AWAY.',target:'buddy'},
  {text:'THE FAMILY ICON AT THE TOP LETS YOU ADD A PARTNER AND MINI BUDDYS.',target:'buddy'},
  {text:'WE HAVE OUR OWN NAPS AND LITTLE ADVENTURES. CLICK A FAMILY MEMBER TO SHOW LOVE.',target:'buddy'},
  {text:'AS WE SPEND DAYS TOGETHER, WE GET TO KNOW EACH OTHER. EXPECT AN OCCASIONAL BOOP.',target:'buddy'},
  {text:'THE THREE-DOT MENU IN THE PANEL TITLE HAS MORE OPTIONS. SOME ICONS MAY ALSO MOVE THERE WHEN SPACE IS TIGHT.',target:'buddy'},
  {text:'USE THE MENU TO CHANGE OUR COLOURS, PICK A BACKGROUND, OR IMPORT YOUR OWN.',target:'buddy'},
  {text:'LEVELS AND CARE MILESTONES UNLOCK DECORATIONS. ARRANGE THEM FROM MY MENU.',target:'buddy'},
  {text:'START A FOCUS TIMER FROM MY MENU AND I WILL SETTLE DOWN. WE CAN STRETCH AFTERWARDS.',target:'buddy'},
  {text:'EACH LEVEL EARNS A PERSONAL PIXEL CARD. FIND YOUR COLLECTION IN THE CARD GALLERY MENU OPTION.',target:'xp'},
  {text:"SEARCH 'BUDDY' IN THE COMMAND PALETTE: {shortcut}.",target:'buddy'},
  {text:"THAT'S ME! LET'S MAKE SOMETHING GOOD. ...AND MAYBE HAVE A COOKIE.",target:'buddy'},
];
export const basicTutorialSteps = [2,3,4,9,13];
export type TutorialState = { mode:'welcome'|'full'|'basics'; step:number; done:boolean };
export type TutorialAction = 'full'|'basics'|'next'|'back'|'skip'|'replay';
export class BuddyTutorial {
  private state: TutorialState;
  private writes: Promise<unknown> = Promise.resolve();
  public constructor(private storage:vscode.Memento, existingUser:boolean) {
    const saved=storage.get<TutorialState>('buddy.tutorial');
    this.state=saved && ['welcome','full','basics'].includes(saved.mode) && Number.isInteger(saved.step) && saved.step>=0
      ? {...saved,step:Math.min(saved.step,saved.mode==='basics'?basicTutorialSteps.length-1:tutorialSteps.length-1),done:saved.done===true}
      : {mode:'welcome',step:0,done:existingUser};
  }
  public get current():TutorialState { return {...this.state}; }
  public action(action:TutorialAction):Promise<TutorialState> {
    const work=this.writes.catch(()=>undefined).then(async()=>{
      const next={...this.state};
      if(action==='replay')Object.assign(next,{mode:'welcome',step:0,done:false});
      else if(action==='skip')next.done=true;
      else if(!next.done) {
        if(action==='full'||action==='basics')Object.assign(next,{mode:action,step:0});
        else if(action==='back'){if(next.step>0)next.step--;else next.mode='welcome';}
        else if(action==='next' && next.mode!=='welcome') {
          if(next.step+1 >= (next.mode==='basics'?basicTutorialSteps.length:tutorialSteps.length)) next.done=true;
          else next.step++;
        }
      }
      await this.storage.update('buddy.tutorial',next);this.state=next;return this.current;
    });
    this.writes=work;return work;
  }
  public async initialize():Promise<void>{await this.storage.update('buddy.tutorial',this.current);}
}
