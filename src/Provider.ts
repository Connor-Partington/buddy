import { drawDecoration, type Decoration } from './decorations';
import { cardDesign, type CardSnapshot, type SavedCard } from './levelUpCards';
import { drawPersonalCard } from './cardRenderer';
import * as vscode from 'vscode';
import { stepBallPlay } from './ballPlay';
import { arrangeFamily, chooseFamilyActivity, socialOffset } from './familyBehavior';
import { buddyColorPresets, defaultBuddyColors, type BuddyColors } from './colorSettings';
import { drawPixelScene } from './pixelBackgrounds';
import { stepBall } from './ballPhysics';
import { type BuddyBackground } from './backgroundSettings';
import { type BuddyFamily } from './familyManager';

import { BuddyAttention } from './attentionManager';
import { BuddyCareSettings, defaultBuddyCareSettings, getBreakPromptIntervalMs } from './careSettings';
import type { BuddyDailyQuestReward, BuddyDailyQuests } from './dailyQuestManager';
import { BuddyHealth, maxBuddyGoldHearts, maxBuddyHearts } from './healthManager';
import type { BuddyMilestoneReaction } from './milestoneManager';
import { BuddyState, BuddyStateMessage } from './stateManager';
import { maxBuddyLevel } from './xpManager';
import type { BuddyXp, BuddyXpBoost } from './xpManager';

type LookSpriteKey =
  | 'lookCenter'
  | 'lookTop'
  | 'lookTopRight'
  | 'lookRight'
  | 'lookBottomRight'
  | 'lookBottom'
  | 'lookBottomLeft'
  | 'lookLeft'
  | 'lookTopLeft';
type SpriteKey = BuddyState | LookSpriteKey | 'walk' | 'dash' | 'dashContinue' | 'love' | 'eat' | 'death' | 'soul' | 'revive' | 'spawn';
export type FoodType = 'cookie' | 'coffee' | 'sandwich' | 'cake';
export type FoodRequest = {
  food: FoodType;
  targetX?: number;
};
export type CareAction = 'feed' | 'love' | 'chase';
type ImageKey = FoodType | 'heart' | 'heartEmpty' | 'heartFill' | 'goldHeart' | 'goldHeartFill' | 'xp';
export type BuddySize = 'default' | 'small';
export type LevelUpCardCapture = {
  id: string;
  dataUri: string;
  level: number;
};
export type LevelUpCardCaptureFailure = {
  error: string;
  level: number;
};

type WebviewMessage =
  | { type?: 'cookieEaten' }
  | { type?: 'foodEaten'; food?: FoodType }
  | { type?: 'foodReached'; food?: FoodType }
  | { type?: 'foodRequested'; food?: FoodType; targetX?: number }
  | { type?: 'careAction'; action?: CareAction }
  | { type?: 'introPlayed' }
  | { type?: 'cardsReady' }
  | { type?: 'openCard'; id?: string }
  | { type?: 'openCardGallery' }
  | { type?: 'levelUpCardCaptured'; id?: string; dataUri?: string; level?: number }
  | { type?: 'levelUpCardFailed'; error?: string; level?: number };

const baseSpriteCanvasWidth = 64;
const baseSpriteDisplayWidth = 190;
const baseCookieDisplayWidth = 28;
const buddySizeScales: Record<BuddySize, number> = {
  default: 1,
  small: 0.72,
};
const spriteTrimSizes: Record<SpriteKey, { width: number; height: number }> = {
  idle: { width: 22, height: 18 },
  typing: { width: 21, height: 33 },
  searching: { width: 16, height: 16 },
  thinking: { width: 21, height: 33 },
  sleeping: { width: 29, height: 26 },
  happy: { width: 20, height: 35 },
  jump: { width: 26, height: 46 },
  lookCenter: { width: 16, height: 16 },
  lookTop: { width: 16, height: 16 },
  lookTopRight: { width: 16, height: 16 },
  lookRight: { width: 16, height: 16 },
  lookBottomRight: { width: 16, height: 16 },
  lookBottom: { width: 16, height: 16 },
  lookBottomLeft: { width: 16, height: 16 },
  lookLeft: { width: 16, height: 16 },
  lookTopLeft: { width: 16, height: 16 },
  walk: { width: 22, height: 18 },
  dash: { width: 26, height: 16 },
  dashContinue: { width: 26, height: 16 },
  love: { width: 18, height: 28 },
  eat: { width: 18, height: 18 },
  death: { width: 22, height: 18 },
  soul: { width: 16, height: 16 },
  revive: { width: 32, height: 32 },
  spawn: { width: 32, height: 32 },
};

export class Provider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'buddy.companion';

  private webviewView?: vscode.WebviewView;
  private background: BuddyBackground = { kind: 'none', fit: 'cover' };

  public setBackground(background: BuddyBackground): void {
    this.background = background;
    this.postMessage({ type: 'setBackground', background: this.getBackgroundMessage() });
  }

  private getBackgroundMessage() {
    return {
      ...this.background,
      imageUri: this.background.imageUri && this.webviewView
        ? this.webviewView.webview.asWebviewUri(vscode.Uri.parse(this.background.imageUri)).toString() : undefined,
    };
  }

  public spawnBall(): Thenable<boolean> { return this.postMessage({ type: 'spawnBall' }); }
  public toggleBall(): Thenable<boolean> { return this.postMessage({ type: 'toggleBall' }); }
  public removeBall(): void { this.postMessage({ type: 'removeBall' }); }

  private colors: BuddyColors = { ...defaultBuddyColors };

  public setColors(colors: BuddyColors): void {
    this.colors = colors;
    this.postMessage({ type: 'setColors', colors });
  }

  private family: BuddyFamily = { hasPartner: false, children: 0 };

  public setFamily(family: BuddyFamily): void {
    this.family = family;
    this.postMessage({ type: 'setFamily', family });
  }

  private state: BuddyState = 'idle';
  private buddySize: BuddySize = 'small';
  private health: BuddyHealth = {
    hearts: maxBuddyHearts,
    goldHearts: 0,
    isDead: false,
    aliveSince: Date.now(),
    aliveDays: 1,
  };
  private xp: BuddyXp = { totalXp: 0, level: 1, currentLevelXp: 0, nextLevelXp: 100, progress: 0, isMaxLevel: false };
  private xpBoost: BuddyXpBoost = { multiplier: 2, expiresAt: 0, isActive: false };
  private careSettings: BuddyCareSettings = defaultBuddyCareSettings;
  private isFocusModeEnabled = false;
  private dailyQuests: BuddyDailyQuests = { date: '', completedCount: 0, totalCount: 0, quests: [] };
  private attention: BuddyAttention = {
    value: 100,
    progress: 1,
    isLow: false,
    lastInteractionAt: Date.now(),
    nextDecayAt: Date.now(),
  };
  private shouldPlayIntro: boolean;
  private readonly onDidFeedCookieEmitter = new vscode.EventEmitter<FoodType>();
  public readonly onDidFeedCookie = this.onDidFeedCookieEmitter.event;
  private readonly onDidReachFoodEmitter = new vscode.EventEmitter<FoodType>();
  public readonly onDidReachFood = this.onDidReachFoodEmitter.event;
  private readonly onDidRequestFoodEmitter = new vscode.EventEmitter<FoodRequest>();
  public readonly onDidRequestFood = this.onDidRequestFoodEmitter.event;
  private readonly onDidCareActionEmitter = new vscode.EventEmitter<CareAction>();
  public readonly onDidCareAction = this.onDidCareActionEmitter.event;
  private readonly onDidPlayIntroEmitter = new vscode.EventEmitter<void>();
  public readonly onDidPlayIntro = this.onDidPlayIntroEmitter.event;
  private readonly onDidCaptureLevelUpCardEmitter = new vscode.EventEmitter<LevelUpCardCapture>();
  public readonly onDidCaptureLevelUpCard = this.onDidCaptureLevelUpCardEmitter.event;
  private readonly onDidFailLevelUpCardCaptureEmitter = new vscode.EventEmitter<LevelUpCardCaptureFailure>();
  public readonly onDidFailLevelUpCardCapture = this.onDidFailLevelUpCardCaptureEmitter.event;

  private decorationItems: Decoration[] = [];
  private focusDeadline?: number;
  private pendingFocusBreak = false;
  public setDecorations(items: Decoration[]): void { this.decorationItems = items; void this.postMessage({type:'setDecorations',items}); }
  public setFocusDeadline(endsAt?: number): void { this.focusDeadline = endsAt; void this.postMessage({type:'focusDeadline',endsAt}); }
  public finishFocusTimer(): void { this.pendingFocusBreak = true; void this.postFocusBreak(); }
  private async postFocusBreak(): Promise<void> {
    if (this.webviewView?.visible && this.cardsReady && this.pendingFocusBreak && await this.postMessage({type:'focusComplete'})) this.pendingFocusBreak = false;
  }
  private cardsReady = false;
  private pendingGallery?: { cards: SavedCard[]; gallery: boolean };
  private readonly cardsReadyEmitter = new vscode.EventEmitter<void>();
  public readonly onCardsReady = this.cardsReadyEmitter.event;
  private readonly cardActionEmitter = new vscode.EventEmitter<{ type: 'openCard' | 'openCardGallery'; id?: string }>();
  public readonly onCardAction = this.cardActionEmitter.event;

  public showCards(cards: SavedCard[], gallery = false): void {
    this.pendingGallery = { cards, gallery };
    this.postCards();
  }
  private postCards(): void {
    if (!this.cardsReady || !this.webviewView || !this.pendingGallery) return;
    const pending = this.pendingGallery;
    const { cards, gallery } = pending;
    const message = { type: 'showCards', gallery, cards: cards.map(card => ({ ...card,
      imageUri: this.webviewView!.webview.asWebviewUri(vscode.Uri.parse(card.imageUri)).toString(),
    })) };
    void this.postMessage(message).then(sent => { if (sent && this.pendingGallery === pending) this.pendingGallery = undefined; });
  }

  public constructor(
    private readonly extensionUri: vscode.Uri,
    shouldPlayIntro: boolean,
    private readonly storageUri?: vscode.Uri,
  ) {
    this.shouldPlayIntro = shouldPlayIntro;
  }

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;
    this.cardsReady = false;
    webviewView.onDidDispose(() => { this.cardsReady = false; this.webviewView = undefined; });
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri, ...(this.storageUri ? [this.storageUri] : [])],
    };
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      if (message.type === 'cardsReady') {
        this.cardsReady = true;
        this.postCards();
        this.cardsReadyEmitter.fire();
        this.setFocusDeadline(this.focusDeadline);
        void this.postFocusBreak();
      } else if (message.type === 'openCard' || message.type === 'openCardGallery') {
        this.cardActionEmitter.fire({ type: message.type, id: message.type === 'openCard' ? message.id : undefined });
      } else if (message.type === 'foodEaten') {
        this.onDidFeedCookieEmitter.fire(normalizeFoodType(message.food));
      } else if (message.type === 'cookieEaten') {
        this.onDidFeedCookieEmitter.fire('cookie');
      } else if (message.type === 'foodReached') {
        this.onDidReachFoodEmitter.fire(normalizeFoodType(message.food));
      } else if (message.type === 'foodRequested') {
        this.onDidRequestFoodEmitter.fire({
          food: normalizeFoodType(message.food),
          targetX: normalizeTargetX(message.targetX),
        });
      } else if (message.type === 'careAction') {
        this.onDidCareActionEmitter.fire(normalizeCareAction(message.action));
      } else if (message.type === 'introPlayed') {
        this.shouldPlayIntro = false;
        this.onDidPlayIntroEmitter.fire();
      } else if (message.type === 'levelUpCardCaptured' && typeof message.dataUri === 'string' && typeof message.id === 'string') {
        this.onDidCaptureLevelUpCardEmitter.fire({
          id: message.id,
          dataUri: message.dataUri,
          level: normalizeLevel(message.level),
        });
      } else if (message.type === 'levelUpCardFailed') {
        this.onDidFailLevelUpCardCaptureEmitter.fire({
          error: typeof message.error === 'string' ? message.error : 'Unknown capture error',
          level: normalizeLevel(message.level),
        });
      }
    });
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.syncWebviewState();
        if (this.cardsReady) this.cardsReadyEmitter.fire();
        void this.postFocusBreak();
      }
    });

    const spriteSources = getSpriteSources(this.extensionUri, webviewView.webview);
    const imageSources = getImageSources(this.extensionUri, webviewView.webview);
    webviewView.webview.html = this.getHtml(webviewView.webview, spriteSources, imageSources);
  }

  public setState(state: BuddyState): void {
    this.state = state;
    this.postState();
  }

  public setBuddySize(size: BuddySize): void {
    this.buddySize = size;
    this.postBuddySize();
  }

  public setHealth(health: BuddyHealth): void {
    this.health = health;
    this.postHealth();
  }

  public setXp(xp: BuddyXp): void {
    this.xp = xp;
    this.postXp();
  }

  public setXpBoost(boost: BuddyXpBoost): void {
    this.xpBoost = boost;
    this.postXpBoost();
  }

  public setDailyQuests(dailyQuests: BuddyDailyQuests): void {
    this.dailyQuests = dailyQuests;
    this.postDailyQuests();
  }

  public setAttention(attention: BuddyAttention): void {
    this.attention = attention;
    this.postAttention();
  }

  public setCareSettings(settings: BuddyCareSettings): void {
    this.careSettings = settings;
    this.postCareSettings();
  }

  public setFocusMode(enabled: boolean): void {
    this.isFocusModeEnabled = enabled;
    this.postFocusMode();
  }

  public spawnCookie(): Thenable<boolean> {
    return this.spawnFood('cookie');
  }

  public spawnFood(food: FoodType, targetX?: number): Thenable<boolean> {
    return this.postMessage({
      type: 'spawnCookie',
      food,
      targetX,
    });
  }

  public returnToCenter(): void {
    this.postMessage({
      type: 'returnToCenter',
    });
  }

  public moveTo(targetX: number): void {
    this.postMessage({
      type: 'moveBuddy',
      targetX,
    });
  }

  public playIntroPreview(): void {
    this.postMessage({
      type: 'playIntroPreview',
    });
  }

  public playLookPreview(): void {
    this.postMessage({
      type: 'playLookPreview',
    });
  }

  public showPreviewSpeech(message: string): void {
    this.postMessage({
      type: 'showPreviewSpeech',
      message,
    });
  }

  public setPreviewReveal(step: string): void {
    this.postMessage({
      type: 'setPreviewReveal',
      step,
    });
  }

  public acceptFood(): void {
    this.postMessage({
      type: 'acceptFood',
    });
  }

  public refuseFood(): void {
    this.postMessage({
      type: 'refuseFood',
    });
  }

  public showFoodRefusal(): void {
    this.postMessage({
      type: 'showFoodRefusal',
    });
  }

  public playHeartFill(heartIndex: number): void {
    this.postMessage({
      type: 'playHeartFill',
      heartIndex,
    });
  }

  public toggleBreakPrompt(): void {
    this.postMessage({
      type: 'toggleBreakPrompt',
    });
  }

  public captureLevelUpCard(snapshot: CardSnapshot): Thenable<boolean> {
    if (!this.cardsReady) return Promise.resolve(false);
    return this.postMessage({ type: 'captureLevelUpCard', snapshot });
  }

  public showMilestoneReaction(reaction: BuddyMilestoneReaction): Thenable<boolean> {
    return this.postMessage({
      type: 'showMilestoneReaction',
      reaction,
    });
  }

  public showDailyQuestReward(reward: BuddyDailyQuestReward): Thenable<boolean> {
    return this.postMessage({
      type: 'showDailyQuestReward',
      reward,
    });
  }

  private postState(): void {
    const message: BuddyStateMessage = {
      type: 'setState',
      state: this.state,
    };

    this.postMessage(message);
  }

  private postBuddySize(): void {
    this.postMessage({
      type: 'setBuddySize',
      size: this.buddySize,
    });
  }

  private postHealth(): void {
    this.postMessage({
      type: 'setHealth',
      health: this.health,
    });
  }

  private syncHealth(): void {
    this.postMessage({
      type: 'setHealth',
      health: this.health,
      options: {
        suppressTransitionAnimations: true,
      },
    });
  }

  private postXp(): void {
    this.postMessage({
      type: 'setXp',
      xp: this.xp,
    });
  }

  private postXpBoost(): void {
    this.postMessage({
      type: 'setXpBoost',
      boost: this.xpBoost,
    });
  }

  private postAttention(): void {
    this.postMessage({
      type: 'setAttention',
      attention: this.attention,
    });
  }

  private postDailyQuests(): void {
    this.postMessage({
      type: 'setDailyQuests',
      dailyQuests: this.dailyQuests,
    });
  }

  private postCareSettings(): void {
    this.postMessage({
      type: 'setCareSettings',
      careSettings: this.careSettings,
    });
  }

  private postFocusMode(): void {
    this.postMessage({
      type: 'setFocusMode',
      enabled: this.isFocusModeEnabled,
    });
  }

  private postMessage(message: unknown): Thenable<boolean> {
    return this.webviewView?.webview.postMessage(message) ?? Promise.resolve(false);
  }

  private syncWebviewState(): void {
    this.setDecorations(this.decorationItems);
    this.setColors(this.colors);
    this.setBackground(this.background);
    this.setFamily(this.family);
    this.syncHealth();
    this.postState();
    this.postBuddySize();
    this.postXp();
    this.postXpBoost();
    this.postDailyQuests();
    this.postAttention();
    this.postCareSettings();
    this.postFocusMode();
  }

  private getHtml(
    webview: vscode.Webview,
    spriteSources: Record<SpriteKey, string>,
    imageSources: Record<ImageKey, string>,
  ): string {
    const nonce = getNonce();
    const spriteDisplaySizes = getSpriteDisplaySizes(this.buddySize);
    const health = this.health;
    const xp = this.xp;
    const xpBoost = this.xpBoost;
    const dailyQuests = this.dailyQuests;
    const attention = this.attention;
    const careSettings = this.careSettings;
    const shouldPlayIntro = this.shouldPlayIntro && !health.isDead;
    const initialSpriteState: SpriteKey = shouldPlayIntro ? 'spawn' : health.isDead ? 'soul' : this.state;

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Buddy</title>
  <style nonce="${nonce}">
    :root {
      --space-blue: #90d5ff;
      --fox: #ff5f8a;
      --fox-dark: #cf3f6a;
      --cream: #ff9fc0;
      --ink: #23262d;
    }

    * {
      box-sizing: border-box;
    }

    body {
      height: 100vh;
      margin: 0;
      overflow: auto;
      color: var(--vscode-sideBar-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      user-select: none;
    }

    .shell {
      min-width: 0;
      width: 100%;
      min-height: 0;
      height: 100vh;
      display: grid;
      align-content: stretch;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr);
      padding: 0;
    }

    .stage {
      display: grid;
      place-items: end center;
      position: relative;
      height: 100%;
      min-height: 0;
      min-width: 0;
      padding: 8px 0;
      background: transparent;
      overflow: hidden;
    }

    .card-overlay { box-sizing: border-box; width: calc(100% - 16px); max-width: 960px; max-height: calc(100vh - 16px); padding: 12px; overflow: auto; color: #fff1d4; background: #171b31; border: 4px solid #ffcd75; font: bold 12px monospace; }
    .card-overlay::backdrop { background: #0e102bcc; }
    .card-overlay header { position: sticky; top: -12px; z-index: 1; background: #171b31; padding-top: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .card-overlay h2 { font: inherit; margin: 0 0 10px; }
    .card-overlay button { cursor: pointer; border: 2px solid #9aa7bf; border-radius: 0; color: #fff1d4; background: #252c47; padding: 7px; font: inherit; }
    .card-overlay button:focus-visible { outline: 2px solid #ffcd75; outline-offset: 2px; }
    .card-overlay button:disabled { opacity: .4; cursor: default; }
    .card-overlay nav { position: sticky; bottom: -12px; background: #171b31; padding: 8px 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .card-overlay img { display: block; width: 100%; height: auto; image-rendering: pixelated; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr)); gap: 8px; margin: 10px 0; }
    .card-grid button { min-width: 0; text-align: left; }
    .card-overlay [hidden] { display: none !important; }
    .card-caption { overflow-wrap: anywhere; }
    .scene-background {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      image-rendering: pixelated;
    }
    .custom-background { object-position: center bottom; }
    .scene-background[hidden] { display: none; }
    .play-ball {
      position: absolute;
      top: 0;
      left: 0;
      width: 16px;
      height: 16px;
      background: #ffbc53;
      border: 3px solid #ed6753;
      box-shadow: inset 3px 3px #fff0ad, inset -3px -3px #af3d51;
      clip-path: polygon(25% 0,75% 0,75% 12%,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%,25% 12%);
      pointer-events: none;
      z-index: 2;
    }
    @keyframes focus-stretch { 0%,100% { transform: scale(1); } 40%,70% { transform: scale(.88,1.25); } }
    body[data-focus-stretch="true"] .sprite-image { transform-origin: bottom center; animation: focus-stretch 1.4s steps(5); }
    @media (prefers-reduced-motion: reduce) { body[data-focus-stretch="true"] .sprite-image { animation: none; } }
    .decorations { position: absolute; inset: 0; pointer-events: none; }
    .decorations canvas { position: absolute; bottom: 8px; width: 64px; height: 64px; image-rendering: pixelated; transform: translateX(-50%); }
    .family-members { position: absolute; inset: 0; pointer-events: none; }
    .family-member {
      pointer-events: auto;
      position: absolute;
      bottom: 8px;
      transform: translateX(-50%);
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      z-index: 1;
    }
    .family-member:focus-visible { outline: 2px solid var(--vscode-focusBorder); }
    .family-member img { display: block; width: 100%; height: auto; image-rendering: pixelated; }
    .sprite-image { filter: hue-rotate(var(--buddy-hue, 0deg)); }
    .family-member img { filter: hue-rotate(var(--children-hue, 0deg)); }
    .family-member[data-partner="true"] img { filter: hue-rotate(var(--partner-hue, 110deg)); }

    .health-meter {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      gap: 4px;
      align-items: center;
      z-index: 3;
      pointer-events: none;
    }

    .heart {
      display: block;
      width: 18px;
      height: auto;
      image-rendering: pixelated;
      filter: drop-shadow(0 1px 0 rgb(0 0 0 / 24%));
    }

    .heart.is-empty {
      filter: none;
    }

    body[data-preview-reveal="blank"] .health-meter,
    body[data-preview-reveal="blank"] .xp-meter,
    body[data-preview-reveal="blank"] .attention-meter,
    body[data-preview-reveal="blank"] .daily-quests,
    body[data-preview-reveal="blank"] .life-counter,
    body[data-preview-reveal="blank"] .focus-indicator,
    body[data-preview-reveal="blank"] .milestone-toast,
    body[data-preview-reveal="blank"] .fox,
    body[data-preview-reveal="blank"] .frame-stage,
    body[data-preview-reveal="blank"] .cookie-treat,
    body[data-preview-reveal="buddy"] .health-meter,
    body[data-preview-reveal="buddy"] .xp-meter,
    body[data-preview-reveal="buddy"] .attention-meter,
    body[data-preview-reveal="buddy"] .daily-quests,
    body[data-preview-reveal="buddy"] .life-counter,
    body[data-preview-reveal="hearts"] .xp-meter,
    body[data-preview-reveal="hearts"] .attention-meter,
    body[data-preview-reveal="hearts"] .daily-quests,
    body[data-preview-reveal="hearts"] .life-counter,
    body[data-preview-reveal="day"] .xp-meter,
    body[data-preview-reveal="day"] .attention-meter,
    body[data-preview-reveal="day"] .daily-quests,
    body[data-preview-reveal="level"] .attention-meter,
    body[data-preview-reveal="level"] .daily-quests,
    body[data-preview-reveal="attention"] .daily-quests {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .life-counter {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 3;
      min-width: 48px;
      padding: 2px 6px;
      border: 1px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-radius: 4px;
      color: var(--vscode-descriptionForeground, var(--vscode-sideBar-foreground));
      background: var(--vscode-sideBar-background);
      box-shadow: 2px 2px 0 rgb(0 0 0 / 18%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
      text-transform: uppercase;
      pointer-events: none;
    }

    .focus-indicator {
      position: absolute;
      top: 34px;
      right: 8px;
      z-index: 3;
      min-width: 86px;
      padding: 2px 6px;
      border: 1px solid rgb(144 213 255 / 70%);
      border-radius: 4px;
      color: var(--vscode-sideBar-foreground);
      background: color-mix(in srgb, var(--vscode-sideBar-background) 78%, #90d5ff);
      box-shadow: 2px 2px 0 rgb(0 0 0 / 18%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
      text-transform: uppercase;
      pointer-events: none;
    }

    .focus-indicator[hidden] {
      display: none;
    }

    .xp-meter {
      position: absolute;
      top: 34px;
      left: 8px;
      z-index: 3;
      width: min(96px, calc(100vw - 16px));
      padding: 2px 6px;
      border: 1px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-radius: 4px;
      color: var(--vscode-sideBar-foreground);
      background: var(--vscode-sideBar-background);
      box-shadow: 2px 2px 0 rgb(0 0 0 / 18%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      overflow: hidden;
      pointer-events: none;
    }

    .xp-boost {
      position: absolute;
      top: 34px;
      left: min(112px, calc(100vw - 44px));
      z-index: 3;
      min-width: 36px;
      padding: 2px 6px;
      border: 1px solid rgb(251 242 54 / 72%);
      border-radius: 4px;
      color: var(--vscode-sideBar-foreground);
      background: color-mix(in srgb, var(--vscode-sideBar-background) 78%, #fbf236);
      box-shadow: 2px 2px 0 rgb(0 0 0 / 18%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
      text-transform: uppercase;
      pointer-events: none;
    }

    .xp-boost[hidden] {
      display: none;
    }

    .xp-meter__label {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      gap: 6px;
      min-width: 0;
      text-transform: uppercase;
    }

    .xp-meter__track {
      position: absolute;
      right: 6px;
      bottom: 1px;
      left: 6px;
      height: 2px;
      overflow: hidden;
      border: 0;
      border-radius: 1px;
      background: var(--vscode-editorWidget-background, rgb(128 128 128 / 18%));
    }

    .xp-meter__fill {
      display: block;
      width: calc(var(--xp-progress, 0) * 100%);
      height: 100%;
      background: linear-gradient(90deg, #ff5f8a, #90d5ff);
      transition: width 180ms ease-out;
    }

    .attention-meter {
      position: absolute;
      top: 58px;
      left: 8px;
      z-index: 3;
      width: min(96px, calc(100vw - 16px));
      padding: 2px 6px;
      border: 1px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-radius: 4px;
      color: var(--vscode-sideBar-foreground);
      background: var(--vscode-sideBar-background);
      box-shadow: 2px 2px 0 rgb(0 0 0 / 18%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      overflow: hidden;
      pointer-events: none;
    }

    .attention-meter__label {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      gap: 6px;
      min-width: 0;
      text-transform: uppercase;
    }

    .attention-meter__track {
      position: absolute;
      right: 6px;
      bottom: 1px;
      left: 6px;
      height: 2px;
      overflow: hidden;
      border: 0;
      border-radius: 1px;
      background: var(--vscode-editorWidget-background, rgb(128 128 128 / 18%));
    }

    .attention-meter__fill {
      display: block;
      width: calc(var(--attention-progress, 1) * 100%);
      height: 100%;
      background: linear-gradient(90deg, #90d5ff, #fbf236);
      transition: width 220ms ease-out;
    }

    body[data-intro-phase="spawning"] .frame-stage,
    body[data-death-phase="soul"] .frame-stage,
    body[data-death-phase="reviving"] .frame-stage {
      animation: soul-wander 8s ease-in-out infinite;
      filter: drop-shadow(0 0 10px rgb(144 213 255 / 34%));
      --sprite-lift: 24px;
    }

    body[data-intro-phase="spawning"] .frame-stage,
    body[data-death-phase="reviving"] .frame-stage {
      animation: none;
    }

    body[data-death-phase="rising"] .sprite-image {
      animation: soul-rise 1.1s ease-out both;
    }

    body[data-death-phase="soul"] .sprite-image {
      animation: soul-bob 2.2s ease-in-out infinite;
    }

    body[data-dead="true"] .cookie-treat {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .speech-bubble {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 10px);
      z-index: 2;
      min-width: 112px;
      max-width: min(180px, calc(100vw - 24px));
      padding: 8px 10px;
      border: 2px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-radius: 4px;
      color: var(--vscode-editorWidget-foreground, var(--vscode-sideBar-foreground));
      background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
      box-shadow:
        0 0 0 1px rgb(0 0 0 / 18%),
        3px 3px 0 rgb(0 0 0 / 24%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
      text-transform: uppercase;
      text-shadow: 1px 0 0 rgb(0 0 0 / 20%);
      text-rendering: geometricPrecision;
      overflow-wrap: anywhere;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateX(var(--speech-offset-x, -50%)) translateY(4px);
      transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
    }

    .speech-bubble::after {
      content: "";
      position: absolute;
      left: var(--speech-tail-x, 50%);
      bottom: -6px;
      width: 10px;
      height: 10px;
      border-right: 2px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-bottom: 2px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      background: inherit;
      transform: translateX(-50%) rotate(45deg);
    }

    .speech-bubble[data-visible="true"] {
      opacity: 1;
      visibility: visible;
      transform: translateX(var(--speech-offset-x, -50%)) translateY(0);
    }

    .fox {
      position: relative;
      width: 148px;
      height: 136px;
      animation: breathe 2.8s ease-in-out infinite;
      transition: filter 160ms ease, transform 160ms ease;
    }

    .frame-stage {
      display: grid;
      place-items: end center;
      width: min(var(--sprite-display-width, ${spriteDisplaySizes[this.state].width}), 100%);
      aspect-ratio: var(--sprite-aspect-ratio, ${spriteDisplaySizes[this.state].aspectRatio});
      align-self: end;
      transform: translateX(var(--walk-x, 0px));
      margin-bottom: var(--sprite-lift, 0px);
      transition:
        transform var(--walk-duration, 0ms) linear,
        margin-bottom var(--vertical-duration, 0ms) cubic-bezier(0.18, 0.82, 0.26, 1);
      will-change: transform;
      position: relative;
      z-index: 1;
      cursor: pointer;
    }

    .frame-stage:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 3px;
    }

    .sprite-image {
      width: 100%;
      height: auto;
      align-self: end;
      object-fit: contain;
      image-rendering: pixelated;
      -webkit-user-drag: none;
      translate: 0 var(--sprite-y, 0px);
      transform: scaleX(var(--sprite-direction, 1));
      transform-origin: center bottom;
      transition: translate var(--vertical-duration, 0ms) cubic-bezier(0.18, 0.82, 0.26, 1);
    }

    .xp-burst {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 2px);
      z-index: 2;
      width: 9px;
      height: 9px;
      pointer-events: none;
      image-rendering: pixelated;
      filter: drop-shadow(0 1px 0 rgb(0 0 0 / 24%));
      animation: xp-burst-rise 1200ms ease-out both;
      transform: translate(calc(-50% + var(--xp-burst-start-x, 0px)), var(--xp-burst-start-y, 0px));
      will-change: transform, opacity;
    }

    .milestone-toast {
      position: absolute;
      top: 110px;
      left: 8px;
      z-index: 4;
      width: min(168px, calc(100vw - 16px));
      padding: 6px 8px;
      border: 1px solid rgb(144 213 255 / 78%);
      border-radius: 4px;
      color: var(--vscode-editorWidget-foreground, var(--vscode-sideBar-foreground));
      background: color-mix(in srgb, var(--vscode-sideBar-background) 74%, #90d5ff);
      box-shadow:
        0 0 0 1px rgb(0 0 0 / 16%),
        3px 3px 0 rgb(0 0 0 / 20%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      text-transform: uppercase;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
    }

    .milestone-toast[data-visible="true"] {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .milestone-toast__message {
      display: block;
      overflow-wrap: anywhere;
    }

    .milestone-toast__xp {
      display: block;
      margin-top: 3px;
      color: #fbf236;
    }

    .daily-quests[data-collapsed="false"] ~ .milestone-toast {
      top: 160px;
    }

    .daily-quests {
      position: absolute;
      top: 84px;
      left: 8px;
      z-index: 3;
      width: min(168px, calc(100vw - 16px));
      padding: 2px 6px;
      border: 1px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-radius: 4px;
      color: var(--vscode-sideBar-foreground);
      background: var(--vscode-sideBar-background);
      box-shadow: 2px 2px 0 rgb(0 0 0 / 18%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      pointer-events: auto;
    }

    .daily-quests__toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      width: 100%;
      margin: 0;
      border: 0;
      padding: 0;
      text-transform: uppercase;
      color: inherit;
      background: transparent;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .daily-quests__toggle:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }

    .daily-quests__summary {
      display: flex;
      align-items: center;
      gap: 3px;
      min-width: 0;
    }

    .daily-quests__chevron {
      display: inline-block;
      width: 6px;
      color: var(--vscode-descriptionForeground, var(--vscode-sideBar-foreground));
    }

    .daily-quests[data-collapsed="false"] .daily-quests__chevron {
      transform: rotate(90deg);
    }

    .daily-quests__count {
      color: var(--vscode-descriptionForeground, var(--vscode-sideBar-foreground));
    }

    .daily-quests__list {
      display: grid;
      gap: 2px;
      margin: 3px 0 0;
      padding: 0;
      list-style: none;
    }

    .daily-quests[data-collapsed="true"] .daily-quests__list {
      display: none;
    }

    .daily-quest {
      display: grid;
      grid-template-columns: 8px minmax(0, 1fr) auto;
      align-items: center;
      gap: 4px;
      min-width: 0;
      font-size: 9px;
      color: var(--vscode-descriptionForeground, var(--vscode-sideBar-foreground));
    }

    .daily-quest[data-completed="true"] {
      color: var(--vscode-sideBar-foreground);
    }

    .daily-quest__mark {
      width: 6px;
      height: 6px;
      border: 1px solid currentColor;
      border-radius: 1px;
    }

    .daily-quest[data-completed="true"] .daily-quest__mark {
      border-color: #6abe30;
      background: #6abe30;
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / 28%);
    }

    .daily-quest__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .daily-quest__progress {
      font-size: 8px;
      color: inherit;
    }

    .cookie-treat {
      position: absolute;
      left: 50%;
      bottom: 8px;
      width: var(--cookie-size, ${baseCookieDisplayWidth}px);
      height: auto;
      image-rendering: pixelated;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translateX(calc(var(--cookie-x, 0px) - 50%)) translateY(-56px) scale(1);
      transform-origin: center bottom;
      transition: none;
      z-index: 1;
    }

    .cookie-treat[hidden],
    .cookie-treat[data-state="ready"] {
      display: block;
    }

    .cookie-treat[data-state="ready"] {
      opacity: 0;
      visibility: hidden;
      transform: translateX(calc(var(--cookie-x, 0px) - 50%)) translateY(-56px) scale(1);
    }

    .cookie-treat[data-state="dropping"],
    .cookie-treat[data-state="landed"] {
      opacity: 1;
      visibility: visible;
      transform: translateX(calc(var(--cookie-x, 0px) - 50%)) translateY(0) scale(1);
    }

    .cookie-treat[data-state="dropping"] {
      transition: opacity 80ms ease, transform 560ms cubic-bezier(0.18, 0.82, 0.26, 1);
    }

    .cookie-treat[data-state="eaten"] {
      opacity: 0;
      visibility: hidden;
      transform: translateX(calc(var(--cookie-x, 0px) - 50%)) translateY(0) scale(0.72);
      transition: opacity 80ms ease, transform 120ms ease;
    }

    .fox {
      display: none;
    }

    .ear {
      position: absolute;
      display: none;
      top: 14px;
      width: 48px;
      height: 58px;
      background: var(--fox-dark);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
      transform-origin: 50% 100%;
    }

    .ear.left {
      left: 25px;
      rotate: -16deg;
      animation: ear-twitch 5.5s ease-in-out infinite;
    }

    .ear.right {
      right: 25px;
      rotate: 16deg;
      animation: ear-twitch 5.5s ease-in-out infinite reverse;
    }

    .ear::after {
      content: "";
      position: absolute;
      left: 13px;
      top: 18px;
      width: 22px;
      height: 32px;
      background: var(--cream);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
      opacity: 0.9;
    }

    .head {
      position: absolute;
      left: 14px;
      top: 25px;
      width: 120px;
      height: 108px;
      border-radius: 48% 48% 38% 38%;
      background: var(--fox);
      box-shadow: inset 0 -12px 0 rgb(0 0 0 / 10%), 0 10px 0 -6px var(--fox-dark);
    }

    .cheek {
      position: absolute;
      bottom: 28px;
      width: 17px;
      height: 12px;
      background: var(--cream);
      border-radius: 999px;
    }

    .cheek.left {
      left: 20px;
    }

    .cheek.right {
      right: 20px;
    }

    .eye {
      position: absolute;
      top: 39px;
      width: 10px;
      height: 12px;
      border-radius: 50%;
      background: var(--ink);
      animation: blink 4.2s infinite;
    }

    .eye.left {
      left: 34px;
    }

    .eye.right {
      right: 34px;
    }

    .nose {
      position: absolute;
      left: 55px;
      top: 62px;
      width: 11px;
      height: 6px;
      border-radius: 50% 50% 60% 60%;
      background: var(--ink);
    }

    .thought-cloud {
      position: absolute;
      left: 82px;
      top: -9px;
      width: 52px;
      height: 32px;
      opacity: 0;
      transform: translateY(6px) scale(0.96);
      transition: opacity 160ms ease, transform 160ms ease;
      animation: cloud-float 2s ease-in-out infinite;
    }

    .thought-cloud span {
      position: absolute;
      display: block;
      border-radius: 50%;
      background: color-mix(in srgb, var(--space-blue) 82%, white);
      box-shadow: inset 0 -2px 0 rgb(35 38 45 / 10%);
    }

    .thought-cloud span:nth-child(1) {
      left: 3px;
      top: 12px;
      width: 19px;
      height: 17px;
    }

    .thought-cloud span:nth-child(2) {
      left: 14px;
      top: 4px;
      width: 27px;
      height: 24px;
    }

    .thought-cloud span:nth-child(3) {
      right: 3px;
      top: 11px;
      width: 20px;
      height: 18px;
    }

    .thought-cloud span:nth-child(4) {
      left: 13px;
      bottom: -3px;
      width: 8px;
      height: 8px;
      opacity: 0.85;
    }

    .thought-cloud span:nth-child(5) {
      left: 4px;
      bottom: -12px;
      width: 5px;
      height: 5px;
      opacity: 0.7;
    }

    .zzz {
      position: absolute;
      right: 12px;
      top: 4px;
      color: var(--space-blue);
      font-weight: 700;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 160ms ease, transform 160ms ease;
      animation: drift 2.4s ease-in-out infinite;
    }


    body[data-state="typing"] .fox {
      animation: typing-bounce 0.34s ease-in-out infinite;
    }

    body[data-state="typing"] .head {
      box-shadow: inset 0 -10px 0 rgb(0 0 0 / 8%), 0 8px 0 rgb(144 213 255 / 20%);
    }

    body[data-state="thinking"] .fox {
      animation: head-tilt 1.6s ease-in-out infinite;
    }

    body[data-state="searching"] .eye {
      animation: eye-scan 0.9s steps(2, end) infinite;
    }

    body[data-state="searching"] .head {
      box-shadow: inset 0 -10px 0 rgb(0 0 0 / 8%), 0 0 0 4px rgb(144 213 255 / 16%);
    }

    body[data-state="thinking"] .thought-cloud {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    body[data-state="sleeping"] .fox {
      animation: sleepy-breathe 3.4s ease-in-out infinite;
      filter: saturate(0.72);
    }

    body[data-state="sleeping"] .eye {
      height: 3px;
      top: 34px;
      border-radius: 999px;
      animation: none;
    }

    body[data-state="sleeping"] .zzz {
      opacity: 1;
      transform: translateY(0);
    }

    body[data-state="happy"] .fox {
      animation: happy-hop 0.52s ease-in-out infinite;
    }

    body[data-state="happy"] .eye {
      height: 9px;
      border-radius: 50% 50% 6px 6px;
      transform: rotate(180deg);
      animation: none;
    }

    @keyframes breathe {
      0%, 100% {
        transform: translateY(0) scaleY(1);
      }
      50% {
        transform: translateY(3px) scaleY(0.985);
      }
    }

    @keyframes blink {
      0%, 45%, 49%, 100% {
        transform: scaleY(1);
      }
      47% {
        transform: scaleY(0.12);
      }
    }

    @keyframes ear-twitch {
      0%, 78%, 84%, 100% {
        transform: rotate(0);
      }
      81% {
        transform: rotate(-5deg);
      }
    }

    @keyframes typing-bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }

    @keyframes head-tilt {
      0%, 100% {
        transform: rotate(-2deg);
      }
      50% {
        transform: rotate(4deg);
      }
    }

    @keyframes eye-scan {
      0%, 100% {
        transform: translateX(-4px);
      }
      50% {
        transform: translateX(4px);
      }
    }

    @keyframes sleepy-breathe {
      0%, 100% {
        transform: translateY(7px) scaleY(0.94);
      }
      50% {
        transform: translateY(10px) scaleY(0.9);
      }
    }

    @keyframes happy-hop {
      0%, 100% {
        transform: translateY(0) rotate(-1deg);
      }
      50% {
        transform: translateY(-9px) rotate(1deg);
      }
    }

    @keyframes cloud-float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes drift {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-6px);
      }
    }

    @keyframes soul-wander {
      0%, 100% {
        transform: translateX(var(--walk-x, 0px));
      }
      25% {
        transform: translateX(var(--soul-left-x, var(--walk-x, 0px)));
      }
      75% {
        transform: translateX(var(--soul-right-x, var(--walk-x, 0px)));
      }
    }

    @keyframes soul-bob {
      0%, 100% {
        translate: 0 -18px;
      }
      50% {
        translate: 0 -6px;
      }
    }

    @keyframes soul-rise {
      0% {
        translate: 0 18px;
        opacity: 0;
      }
      22% {
        opacity: 1;
      }
      100% {
        translate: 0 -18px;
        opacity: 1;
      }
    }

    @keyframes xp-burst-rise {
      0% {
        opacity: 0;
        transform: translate(calc(-50% + var(--xp-burst-start-x, 0px)), var(--xp-burst-start-y, 0px)) scale(0.92);
      }
      18% {
        opacity: 1;
      }
      72% {
        opacity: 1;
      }
      100% {
        opacity: 0;
        transform: translate(calc(-50% + var(--xp-burst-end-x, 0px)), var(--xp-burst-end-y, -44px)) scale(var(--xp-burst-scale, 1));
      }
    }

  </style>
</head>
<body data-state="${this.state}" data-dead="${health.isDead}" data-death-phase="${health.isDead ? 'soul' : 'alive'}" data-intro-phase="${shouldPlayIntro ? 'spawning' : 'done'}" data-focus-mode="${this.isFocusModeEnabled}">
  <main class="shell">
    <section class="stage" aria-label="Buddy companion">
      <canvas class="scene-background" aria-hidden="true" hidden></canvas>
      <img class="scene-background custom-background" alt="" hidden />
      <div class="play-ball" role="img" aria-label="Bouncing ball" hidden></div>
      <div class="health-meter" aria-label="Buddy health">
        ${renderHearts(0, imageSources)}
      </div>
      <div class="xp-meter" aria-live="polite" aria-label="${getXpLabel(xp)}" style="--xp-progress: ${xp.progress};">
        <div class="xp-meter__label">
          <span class="xp-meter__level">${getXpLevelText(xp)}</span>
          <span class="xp-meter__value">${getXpProgressText(xp)}</span>
        </div>
        <div class="xp-meter__track" aria-hidden="true"><span class="xp-meter__fill"></span></div>
      </div>
      <div class="xp-boost" aria-live="polite" aria-label="${getXpBoostLabel(xpBoost)}" ${xpBoost.isActive ? '' : 'hidden'}>${getXpBoostText(xpBoost)}</div>
      <div class="attention-meter" aria-live="polite" aria-label="${getAttentionLabel(attention)}" style="--attention-progress: ${attention.progress};">
        <div class="attention-meter__label">
          <span>ATTN</span>
          <span class="attention-meter__value">${getAttentionProgressText(attention)}</span>
        </div>
        <div class="attention-meter__track" aria-hidden="true"><span class="attention-meter__fill"></span></div>
      </div>
      <div class="daily-quests" data-collapsed="true" aria-live="polite" aria-label="${getDailyQuestsLabel(dailyQuests)}">
        ${renderDailyQuests(dailyQuests)}
      </div>
      <div class="life-counter" aria-live="polite" aria-label="${getAliveDaysLabel(health)}">${getAliveDayCounterText(health)}</div>
      <div class="focus-indicator" aria-live="polite" aria-label="Focus mode is on" ${this.isFocusModeEnabled ? '' : 'hidden'}>FOCUS MODE ON</div>
      <div class="milestone-toast" aria-live="polite" aria-atomic="true">
        <span class="milestone-toast__message"></span>
        <span class="milestone-toast__xp"></span>
      </div>
      <div class="fox" role="img" aria-label="Buddy waiting in the sidebar">
        <div class="thought-cloud" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        <div class="zzz" aria-hidden="true">Zzz</div>
        <div class="ear left"></div>
        <div class="ear right"></div>
        <div class="head">
          <div class="cheek left"></div>
          <div class="cheek right"></div>
          <div class="eye left"></div>
          <div class="eye right"></div>
          <div class="nose"></div>
        </div>
      </div>
      <div class="frame-stage" role="button" tabindex="0" aria-label="Show Buddy love" style="--sprite-display-width: ${spriteDisplaySizes[initialSpriteState].width}; --sprite-aspect-ratio: ${spriteDisplaySizes[initialSpriteState].aspectRatio};">
        <div class="speech-bubble" aria-live="polite" aria-atomic="true"><span></span></div>
        <img class="sprite-image" alt="" src="${spriteSources[initialSpriteState]}" />
      </div>
      <div class="decorations" aria-hidden="true"></div>
      <div class="family-members" role="group" aria-label="Buddy family"></div>
      <img class="cookie-treat" alt="" src="${imageSources.cookie}" hidden />
    </section>
  </main>
  <dialog class="card-overlay" aria-labelledby="card-heading">
    <header><h2 id="card-heading">LEVEL UP</h2><button type="button" class="card-close" aria-label="Close cards">X</button></header>
    <div class="card-view"><img class="card-preview" alt="" /><p class="card-caption"></p></div>
    <div class="card-grid" hidden></div>
    <nav aria-label="Card actions"><button class="card-previous">PREV</button><button class="card-next">NEXT</button><button class="card-open">OPEN IMAGE</button><button class="card-gallery">GALLERY</button></nav>
    <p class="card-empty" hidden>No cards yet. Your next level-up will appear here.</p>
  </dialog>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const spriteSources = ${JSON.stringify(spriteSources)};
    const imageSources = ${JSON.stringify(imageSources)};
    const baseSpriteDisplaySizes = ${JSON.stringify(getSpriteDisplaySizes())};
    const buddySizeScales = ${JSON.stringify(buddySizeScales)};
    const spriteDisplaySizes = ${JSON.stringify(spriteDisplaySizes)};
    let currentFamily = ${JSON.stringify(this.family)};
    const familyMembers = document.querySelector('.family-members');
    const familyActivity = new Map();
    const socialOffset = ${socialOffset.toString()};
    let familySocial, nextFamilySocial = performance.now() + 7000;
    let familyBallCooldown = 0;
    const drawDecoration = ${drawDecoration.toString()};
    function setDecorations(items) {
      const layer = document.querySelector('.decorations'); layer.replaceChildren();
      for (const item of items) {
        const canvas = document.createElement('canvas'); canvas.width=32; canvas.height=32;
        canvas.style.left='clamp(32px, ' + item.x + '%, calc(100% - 32px))';
        drawDecoration(canvas.getContext('2d'),item.id);layer.append(canvas);
      }
    }
    setDecorations(${JSON.stringify(this.decorationItems)});
    function updateFocusDeadline(endsAt) {
      if (!focusIndicator) return;
      const seconds = Math.max(0, Math.ceil((Number(endsAt) - Date.now()) / 1000));
      focusIndicator.textContent = endsAt ? 'FOCUS ' + Math.floor(seconds/60) + ':' + String(seconds%60).padStart(2,'0') : 'FOCUS MODE ON';
    }
    function finishFocusSession() {
      if (isDead || isFocusModeEnabled) return;
      setState('idle');
      document.body.dataset.focusStretch = 'true';
      setTimeout(() => {
        delete document.body.dataset.focusStretch;
        if (isDead || isFocusModeEnabled) return;
        showSpeechMessage('NICE WORK! STRETCH AND TAKE A BREAK', {lockBuddy:true,scheduleNextBreak:true,visibleMs:12000});
      }, 1400);
    }
    const chooseFamilyActivity = ${chooseFamilyActivity.toString()};
    const arrangeFamily = ${arrangeFamily.toString()};
    let familyTimer;
    let familyPausedAt;
    function renderFamily() {
      familySocial = undefined;
      const count = currentFamily.hasPartner ? currentFamily.children + 1 : 0;
      while (familyMembers.children.length > count) {
        familyActivity.delete(familyMembers.lastElementChild);
        familyMembers.lastElementChild.remove();
      }
      while (familyMembers.children.length < count) {
        const index = familyMembers.children.length;
        const member = document.createElement('button');
        member.className = 'family-member';
        member.dataset.partner = String(index === 0);
        member.setAttribute('aria-label', index === 0 ? 'Buddy partner: show love' : 'Mini Buddy ' + index + ': show love');
        member.title = index === 0 ? 'Partner' : 'Mini Buddy ' + index;
        member.appendChild(document.createElement('img'));
        member.firstElementChild.alt = '';
        familyActivity.set(member, { state: 'idle', nextAt: performance.now() + 4000 + index * 2100 + Math.random() * 1500, reaction: 'spawn', reactionUntil: performance.now() + 1600 });
        member.addEventListener('click', (event) => {
          event.stopPropagation();
          if (isFocusModeEnabled) return;
          const activity = familyActivity.get(member);
          familySocial = undefined;
          nextFamilySocial = performance.now() + 12000;
          activity.state = 'idle';
          activity.reaction = 'love';
          activity.reactionUntil = performance.now() + 1600;
          activity.nextAt = performance.now() + 5000 + Math.random() * 5000;
          updateFamilySprites();
        });
        member.addEventListener('dblclick', (event) => event.stopPropagation());
        familyMembers.appendChild(member);
      }
      tickFamily();
    }
    function tickFamily() {
      clearTimeout(familyTimer);
      familyTimer = undefined;
      const now = performance.now();
      if (document.hidden || isFocusModeEnabled) {
        if (familyPausedAt === undefined) familyPausedAt = now;
        familySocial = undefined;
        nextFamilySocial = now + 8000;
        updateFamilySprites();
        return;
      }
      if (familyPausedAt !== undefined) {
        for (const activity of familyActivity.values()) {
          activity.nextAt += now - familyPausedAt;
          activity.reactionUntil += now - familyPausedAt;
        }
        familyPausedAt = undefined;
      }
      for (const activity of familyActivity.values()) {
        if (familySocial?.pair.some(index => familyActivity.get(familyMembers.children[index]) === activity)) continue;
        if (now >= activity.nextAt) {
          const next = chooseFamilyActivity(activity.state, Math.random(), Math.random());
          activity.state = next.state;
          activity.nextAt = now + next.duration;
        }
      }
      if (familySocial && now >= familySocial.until) familySocial = undefined;
      if (!familySocial && now >= nextFamilySocial) {
        const members = [...familyMembers.children];
        const awake = members.filter(member => familyActivity.get(member).state !== 'sleeping' && now >= familyActivity.get(member).reactionUntil);
        if (awake.length >= 2) {
          const pairs = awake.slice(0,-1).map((member,index) => [member,awake[index+1]]).filter(pair => pair[0].style.bottom === pair[1].style.bottom && members.indexOf(pair[1]) === members.indexOf(pair[0])+1);
          if (pairs.length) {
            const pair = pairs[Math.floor(Math.random()*pairs.length)].map(member => members.indexOf(member));
            const kinds = ['greet','chase','curl'];
            familySocial = {pair, kind:kinds[Math.floor(Math.random()*3)],started:now,until:now+6500};
            for (const index of pair) familyActivity.get(members[index]).nextAt += 6500;
          }
        } else if (awake.length === 1 && !isDead) {
          const activity = familyActivity.get(awake[0]); activity.reaction='love'; activity.reactionUntil=now+1500;
        }
        nextFamilySocial = now + 16000 + Math.random()*18000;
      }
      updateFamilySprites();
      if (familyMembers.children.length) familyTimer = setTimeout(tickFamily, 350);
    }
    function updateFamilyLayout() {
      if (!familyMembers.children.length) return;
      const bounds = stage.getBoundingClientRect();
      const width = bounds.width;
      const mainBounds = spriteStage.getBoundingClientRect();
      const actualCenter = mainBounds.left + mainBounds.width / 2 - bounds.left;
      const targetCenter = width / 2 + walkX;
      const scale = buddySizeScales[buddySize];
      const members = [...familyMembers.children];
      const widths = members.map((member) => 95 * scale * (member.dataset.partner === 'true' ? 0.85 : 0.45));
      const positions = arrangeFamily(width, (actualCenter + targetCenter) / 2, 95 * scale + Math.abs(actualCenter - targetCenter), 140 * scale + 40 + Math.max(0, -spriteY), widths);
      const offset = familySocial?.kind === 'chase' ? socialOffset(positions,widths,familySocial.pair,width,(actualCenter+targetCenter)/2,95*scale+Math.abs(actualCenter-targetCenter),Math.sin((performance.now()-familySocial.started)/600)) : 0;
      members.forEach((member, index) => {
        const activity = familyActivity.get(member);
        const wander = !isFocusModeEnabled && activity.state === 'walk' ? Math.sin(performance.now() / 700 + index) * 3 : 0;
        member.style.left = (positions[index].x + (familySocial?.pair.includes(index) ? offset : wander)) + 'px';
        member.dataset.social = familySocial?.pair.includes(index) ? familySocial.kind : '';
        member.style.bottom = positions[index].bottom + 'px';
        const direction = familySocial?.kind === 'chase' && familySocial.pair.includes(index) ? Math.cos((performance.now()-familySocial.started)/600) : wander;
        member.firstElementChild.style.transform = direction < 0 ? 'scaleX(-1)' : '';
      });
    }
    function updateFamilySprites() {
      for (const member of familyMembers.children) {
        const activity = familyActivity.get(member);
        const social = familySocial?.pair.includes([...familyMembers.children].indexOf(member)) ? familySocial.kind : undefined;
        const state = isFocusModeEnabled ? 'sleeping' : performance.now() < activity.reactionUntil ? activity.reaction : social === 'curl' ? 'sleeping' : social === 'greet' ? 'love' : social === 'chase' ? 'walk' : activity.state;
        member.dataset.activity = state;
        const size = baseSpriteDisplaySizes[state] || baseSpriteDisplaySizes.idle;
        const scale = (member.dataset.partner === 'true' ? 0.85 : 0.45) * buddySizeScales[buddySize];
        member.style.width = Math.min(parseFloat(size.width) * scale, Math.max(1, stage.clientWidth - 12)) + 'px';
        const source = spriteSources[state] || spriteSources.idle;
        if (member.firstElementChild.getAttribute('src') !== source) member.firstElementChild.src = source;
      }
      updateFamilyLayout();
    }
    const stage = document.querySelector('.stage');
    const healthMeter = document.querySelector('.health-meter');
    const lifeCounter = document.querySelector('.life-counter');
    const focusIndicator = document.querySelector('.focus-indicator');
    const xpMeter = document.querySelector('.xp-meter');
    const xpLevel = document.querySelector('.xp-meter__level');
    const xpValue = document.querySelector('.xp-meter__value');
    const xpBoostIndicator = document.querySelector('.xp-boost');
    const attentionMeter = document.querySelector('.attention-meter');
    const attentionValue = document.querySelector('.attention-meter__value');
    const dailyQuestPanel = document.querySelector('.daily-quests');
    const milestoneToast = document.querySelector('.milestone-toast');
    const milestoneToastMessage = document.querySelector('.milestone-toast__message');
    const milestoneToastXp = document.querySelector('.milestone-toast__xp');
    const spriteImage = document.querySelector('.sprite-image');
    const spriteStage = document.querySelector('.frame-stage');
    const speechBubble = document.querySelector('.speech-bubble');
    const speechBubbleText = speechBubble?.querySelector('span');
    const cookieTreat = document.querySelector('.cookie-treat');
    let buddySize = '${this.buddySize}';
    let lastState = '${this.state}';
    let currentState = '${this.state}';
    let visibleSpriteState = '${initialSpriteState}';
    let stateBeforeWalk = '${this.state}';
    let walkTimer;
    let walkTransitionTimer;
    let walkTransitionCleanup;
    let clickReactionTimer;
    let lookResetTimer;
    let lookReturnSpriteState;
    let cookieDropTimer;
    let cookieEatTimer;
    let deathTimer;
    let reviveTimer;
    let lifeCounterTimer;
    let lifeCounterScrambleTimer;
    let introTimer;
    let introHeartTimer;
    let milestoneToastTimer;
    let currentXpBoost = ${JSON.stringify(xpBoost)};
    let breakPromptTimer;
    let breakScrambleTimer;
    let breakHideTimer;
    let walkX = 0;
    let spriteY = 0;
    let walkDirection = 1;
    let cookieX = 0;
    let cookieActive = false;
    let cookieDashSegmentsRemaining = 0;
    let cookiePhase = 'idle';
    let activeFood = 'cookie';
    let isDead = ${JSON.stringify(health.isDead)};
    let isReviving = false;
    let isIntroPlaying = ${JSON.stringify(shouldPlayIntro)};
    let isBreakPromptActive = false;
    let isFocusModeEnabled = ${JSON.stringify(this.isFocusModeEnabled)};
    let currentHearts = ${JSON.stringify(health.hearts)};
    let previousHearts = ${JSON.stringify(health.hearts)};
    let currentGoldHearts = ${JSON.stringify(health.goldHearts)};
    let previousGoldHearts = ${JSON.stringify(health.goldHearts)};
    let currentAliveSince = ${JSON.stringify(health.aliveSince ?? null)};
    let currentLifeCounterText = ${JSON.stringify(getAliveDayCounterText(health))};
    let currentXp = ${JSON.stringify(xp)};
    let currentDailyQuests = ${JSON.stringify(dailyQuests)};
    let isDailyQuestPanelCollapsed = true;
    let currentAttention = ${JSON.stringify(attention)};
    let activeLookState;
    let heartLostMessageCount = 0;
    let cookieEatingMessageCount = 0;
    let attentionMessageCount = 0;
    let lastAttentionPromptAt = 0;
    let activeSpeechMessage = 'TAKE A BREAK?';
    let deathPhase = isDead ? 'soul' : 'alive';
    const walkSpeedPxPerSecond = 70;
    const dashSpeedPxPerSecond = 230;
    const walkVisibleWidthRatio = 0.42;
    const dashGifDurationMs = 400;
    const cookieDashMinDistancePx = 1;
    const loveGifDurationMs = 1300;
    const cookieDropMs = 580;
    const eatGifDurationMs = 2000;
    const deathGifDurationMs = 950;
    const soulRiseDurationMs = 1100;
    const reviveGifDurationMs = 900;
    const reviveDropDurationMs = 360;
    const spawnGifDurationMs = 450;
    const spawnDropDurationMs = 360;
    const introHeartPopMs = 260;
    const heartFillDurationMs = 1100;
    let breakPromptIntervalMs = ${getBreakPromptIntervalMs(careSettings)};
    const breakPromptScrambleMs = 1800;
    const breakPromptVisibleMs = 9000;
    const statusPromptVisibleMs = 3200;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const lifeCounterScrambleMs = 900;
    const lifeCounterNumberScrambleMs = 1500;
    const lookActivationDistancePx = 64;
    const lookCenterDistancePx = 8;
    const lookResetDelayMs = 120;
    const lookDirections = [
      'lookRight',
      'lookBottomRight',
      'lookBottom',
      'lookBottomLeft',
      'lookLeft',
      'lookTopLeft',
      'lookTop',
      'lookTopRight',
    ];
    const breakPromptMessages = [
      'TAKE A BREAK?',
      'SAVE AND STRETCH?',
      'TOUCH GRASS SIDE QUEST?',
      'SNACK? WATER? BOTH?',
      'YOU HAVE BEEN CODING A WHILE.',
      'HYDRATION QUEST!',
      'STEP AWAY A BIT?',
    ];
    const heartLostMessages = [
      'I LOST A HEART',
      'I NEED FOOD',
    ];
    const cookieEatingMessages = [
      'THANK YOU',
      'NOM NOM NOM',
    ];
    const foodRefusalMessages = [
      "I'M FULL",
      'NO MORE SNACKS',
      'MAYBE LATER',
    ];
    const attentionMessages = [
      'I NEEDS SOME ATTENTION SOON',
      "I'M LOW ON ATTENTION",
      'MAYBE SOME FOOD WILL HELP ME',
      'I FEEL LIKE, ATTENTION IS NEEDED',
    ];
    const introMessage = "HEY, I'M BUDDY";
    const levelUpCardWidth = 960;
    const levelUpCardHeight = 540;

    function getSpriteDisplaySize(state) {
      const displaySize = baseSpriteDisplaySizes[state] || baseSpriteDisplaySizes.idle;
      const scale = buddySizeScales[buddySize] || buddySizeScales.default;

      return {
        width: (parseFloat(displaySize.width) * scale) + 'px',
        aspectRatio: displaySize.aspectRatio,
      };
    }

    function getCookieDisplaySize() {
      const scale = buddySizeScales[buddySize] || buddySizeScales.default;
      return Math.round(${baseCookieDisplayWidth} * scale) + 'px';
    }

    function isLookSpriteState(state) {
      return state === 'lookCenter' || lookDirections.includes(state);
    }

    function setSpriteForState(state, replay = false) {
      if (!spriteImage || !spriteStage) {
        return;
      }

      updateFamilySprites();
      visibleSpriteState = state;
      const source = spriteSources[state] || spriteSources.idle;
      const displaySize = getSpriteDisplaySize(state);
      spriteStage.style.setProperty('--sprite-display-width', displaySize.width);
      spriteStage.style.setProperty('--sprite-aspect-ratio', displaySize.aspectRatio);
      spriteStage.style.setProperty('--sprite-direction', isLookSpriteState(state) ? '1' : String(walkDirection));
      if (source && (replay || spriteImage.getAttribute('src') !== source)) {
        if (replay) {
          spriteImage.removeAttribute('src');
          void spriteImage.offsetWidth;
        }
        spriteImage.setAttribute('src', source);
      }
    }

    function getVisibleSpriteState() {
      if (activeLookState && lookReturnSpriteState) {
        return lookReturnSpriteState;
      }

      if (isIntroPlaying) {
        return 'spawn';
      }

      if (isReviving || deathPhase === 'reviving') {
        return 'revive';
      }

      if (isDead) {
        return deathPhase === 'dying' ? 'death' : 'soul';
      }

      if (visibleSpriteState && !isLookSpriteState(visibleSpriteState)) {
        return visibleSpriteState;
      }

      return document.body.dataset.state || currentState || 'idle';
    }

    function updateCookieSize() {
      if (!cookieTreat) {
        return;
      }

      cookieTreat.style.setProperty('--cookie-size', getCookieDisplaySize());
    }

    function getWalkLimit(useVisibleWalkWidth = false) {
      if (!stage || !spriteStage) {
        return 0;
      }

      const stageWidth = getPanelWidth();
      const spriteWidth = spriteStage.getBoundingClientRect().width * (useVisibleWalkWidth ? walkVisibleWidthRatio : 1);
      return Math.max(0, (stageWidth - spriteWidth) / 2);
    }

    function getPanelWidth() {
      return stage?.getBoundingClientRect().width || window.innerWidth || 0;
    }

    function getSingleDashDistance() {
      const panelWidth = getPanelWidth();
      const timedDistance = dashSpeedPxPerSecond * (dashGifDurationMs / 1000);
      return Math.max(cookieDashMinDistancePx, Math.min(panelWidth, timedDistance));
    }

    function applyWalkPosition(durationMs = 0) {
      updateFamilyLayout();
      if (!spriteStage) {
        return;
      }

      spriteStage.style.setProperty('--walk-duration', durationMs + 'ms');
      spriteStage.style.setProperty('--walk-x', walkX + 'px');
      spriteStage.style.setProperty('--sprite-direction', activeLookState ? '1' : String(walkDirection));
      updateSoulWanderBounds();
    }

    function applySpriteY(durationMs = 0) {
      spriteImage?.style.setProperty('--vertical-duration', durationMs + 'ms');
      spriteStage?.style.setProperty('--vertical-duration', durationMs + 'ms');
      spriteImage?.style.setProperty('--sprite-y', spriteY + 'px');
    }

    function updateSoulWanderBounds() {
      if (!spriteStage || deathPhase !== 'soul') {
        return;
      }

      const limit = getWalkLimit(true);
      const wanderDistance = Math.min(26, limit);
      const leftX = Math.max(-limit, walkX - wanderDistance);
      const rightX = Math.min(limit, walkX + wanderDistance);
      spriteStage.style.setProperty('--soul-left-x', leftX + 'px');
      spriteStage.style.setProperty('--soul-right-x', rightX + 'px');
    }

    function applyCookiePosition() {
      cookieTreat?.style.setProperty('--cookie-x', cookieX + 'px');
    }

    function setCookieState(state) {
      if (!cookieTreat) {
        return;
      }

      cookieTreat.setAttribute('src', imageSources[activeFood] || imageSources.cookie);
      cookieTreat.dataset.state = state;
      cookieTreat.hidden = false;
    }

    function clearHeartFillTimer() {
      if (introHeartTimer) {
        clearTimeout(introHeartTimer);
        introHeartTimer = undefined;
      }
    }

    function clearIntroTimer() {
      if (introTimer) {
        clearTimeout(introTimer);
        introTimer = undefined;
      }

      clearHeartFillTimer();
    }

    function updateSpeechBubblePosition() {
      if (!stage || !speechBubble) {
        return;
      }

      speechBubble.style.setProperty('--speech-offset-x', '-50%');
      speechBubble.style.setProperty('--speech-tail-x', '50%');

      requestAnimationFrame(() => {
        const stageRect = stage.getBoundingClientRect();
        const padding = 8;
        const stageCenterX = stageRect.left + stageRect.width / 2;
        const buddyCenterX = stageCenterX + walkX;
        const bubbleWidth = speechBubble.getBoundingClientRect().width;
        const leftOffset = stageRect.left + padding - buddyCenterX;
        const rightOffset = stageRect.right - padding - bubbleWidth - buddyCenterX;
        const centeredOffset = -bubbleWidth / 2;
        const offsetX = Math.min(Math.max(centeredOffset, leftOffset), rightOffset);
        const tailX = Math.min(bubbleWidth - 12, Math.max(12, -offsetX));

        speechBubble.style.setProperty('--speech-offset-x', offsetX + 'px');
        speechBubble.style.setProperty('--speech-tail-x', tailX + 'px');
      });
    }

    function chooseMessage(messages) {
      return messages[Math.floor(Math.random() * messages.length)] || messages[0] || '';
    }

    function getSpeechLetterCount(message = activeSpeechMessage) {
      return Array.from(message).filter((character) => character !== ' ').length;
    }

    function getScrambledSpeechGlyph() {
      const glyphs = '#%*+=?<>/[]{}~';
      return glyphs[Math.floor(Math.random() * glyphs.length)];
    }

    function getDecodedSpeechText(revealedLetters, message = activeSpeechMessage) {
      let letterIndex = 0;
      return Array.from(message, (character) => {
        if (character === ' ') {
          return ' ';
        }

        letterIndex += 1;
        return letterIndex <= revealedLetters ? character : getScrambledSpeechGlyph();
      }).join('');
    }

    function hideBreakPrompt() {
      isBreakPromptActive = false;

      if (breakScrambleTimer) {
        clearInterval(breakScrambleTimer);
        breakScrambleTimer = undefined;
      }

      if (breakHideTimer) {
        clearTimeout(breakHideTimer);
        breakHideTimer = undefined;
      }

      if (!speechBubble || !speechBubbleText) {
        return;
      }

      speechBubble.dataset.visible = 'false';
      speechBubbleText.textContent = '';
      speechBubble.style.setProperty('--speech-offset-x', '-50%');
      speechBubble.style.setProperty('--speech-tail-x', '50%');
    }

    function clearBreakPromptTimer() {
      if (breakPromptTimer) {
        clearTimeout(breakPromptTimer);
        breakPromptTimer = undefined;
      }
    }

    function startSequentialHeartFill(hearts) {
      clearHeartFillTimer();
      renderHearts(0);

      if (hearts <= 0) {
        introHeartTimer = undefined;
        return;
      }

      playSequentialHeartFill(hearts);
    }

    function playSequentialHeartFill(hearts, heartIndex = 0) {
      renderHearts(heartIndex);
      playHeartFill(heartIndex);

      if (heartIndex >= hearts - 1) {
        introHeartTimer = undefined;
        return;
      }

      introHeartTimer = setTimeout(() => {
        playSequentialHeartFill(hearts, heartIndex + 1);
      }, introHeartPopMs);
    }

    function playIntroSequence(options = {}) {
      removeBall();
      if (!isIntroPlaying || isDead) {
        return;
      }

      clearIntroTimer();
      clearClickReaction();
      clearRandomWalk();
      resetCookie();
      renderHearts(0);
      setSpriteForState('spawn');
      document.body.dataset.introPhase = 'spawning';

      introTimer = setTimeout(() => {
        introTimer = undefined;
        if (!isIntroPlaying || isDead) {
          return;
        }

        preserveSpritePosition(() => {
          currentState = 'idle';
          document.body.dataset.state = 'idle';
          setSpriteForState('idle');
        });

        waitForSpriteImage(() => {
          if (!isIntroPlaying || isDead) {
            return;
          }

          requestAnimationFrame(() => {
            document.body.dataset.introPhase = 'done';
            spriteY = 0;
            applySpriteY(spawnDropDurationMs);

            introTimer = setTimeout(() => {
              introTimer = undefined;
              if (!isIntroPlaying || isDead) {
                return;
              }

              startSequentialHeartFill(currentHearts);
              showSpeechMessage(introMessage, {
                lockBuddy: false,
                scheduleNextBreak: false,
                visibleMs: 5000,
              });
              isIntroPlaying = false;
              if (options.postIntroPlayed !== false) {
                vscode.postMessage({ type: 'introPlayed' });
              }
              scheduleBreakPrompt(true);
              scheduleRandomWalk();
            }, spawnDropDurationMs);
          });
        });
      }, spawnGifDurationMs);
    }

    function playIntroPreview() {
      if (isDead || isReviving) {
        return;
      }

      isIntroPlaying = true;
      currentHearts = ${maxBuddyHearts};
      previousHearts = ${maxBuddyHearts};
      currentGoldHearts = 0;
      previousGoldHearts = 0;
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      playIntroSequence({ postIntroPlayed: false });
    }

    function playLookPreview() {
      if (!isLookEligible()) {
        return;
      }

      clearRandomWalk();
      const previewLookStates = ['lookTopRight', 'lookRight', 'lookBottomRight', 'lookLeft'];
      previewLookStates.forEach((lookState, index) => {
        setTimeout(() => {
          if (isLookEligible() || activeLookState) {
            setLookState(lookState);
          }
        }, index * 520);
      });

      setTimeout(() => {
        clearLookReaction({ resumeWalk: false });
      }, previewLookStates.length * 520 + 260);
    }

    function setPreviewReveal(step) {
      const normalizedStep = String(step || 'done');
      if (normalizedStep === 'done') {
        delete document.body.dataset.previewReveal;
        return;
      }

      document.body.dataset.previewReveal = normalizedStep;
    }

    function scheduleBreakPrompt(reset = false) {
      if (reset) {
        clearBreakPromptTimer();
      }

      if (breakPromptTimer || isDead || isReviving || isFocusModeEnabled) {
        return;
      }

      breakPromptTimer = setTimeout(() => {
        breakPromptTimer = undefined;
        showBreakPrompt();
      }, breakPromptIntervalMs);
    }

    function setCareSettings(settings) {
      const breakPromptMinutes = Math.max(1, Number(settings?.breakPromptIntervalMinutes) || ${defaultBuddyCareSettings.breakPromptIntervalMinutes});
      breakPromptIntervalMs = Math.round(breakPromptMinutes * 60 * 1000);
      scheduleBreakPrompt(true);
    }

    function setFocusMode(enabled) {
      if (enabled) removeBall();
      isFocusModeEnabled = Boolean(enabled);
      tickFamily();
      document.body.dataset.focusMode = String(isFocusModeEnabled);
      if (focusIndicator) {
        focusIndicator.hidden = !isFocusModeEnabled;
      }

      if (isFocusModeEnabled) {
        clearBreakPromptTimer();
        hideBreakPrompt();
        if (!isDead && !isReviving && !isIntroPlaying && !isCookieInteractionActive()) {
          clearLookReaction({ resumeWalk: false });
          clearClickReaction();
          clearRandomWalk();
          currentState = 'sleeping';
          document.body.dataset.state = 'sleeping';
          vscode.setState({ state: 'sleeping', buddySize });
          setSpriteForState('sleeping');
        }
        return;
      }

      if (currentState === 'sleeping' && lastState !== 'sleeping') {
        currentState = lastState || 'idle';
        document.body.dataset.state = currentState;
        vscode.setState({ state: currentState, buddySize });
        setSpriteForState(activeLookState || currentState);
      }

      scheduleBreakPrompt(true);
      scheduleRandomWalk();
    }

    function dismissBreakPrompt() {
      const wasPromptVisible = isBreakPromptActive;

      hideBreakPrompt();
      if (wasPromptVisible) {
        scheduleBreakPrompt(true);
      }
    }

    function showSpeechMessage(message, options = {}) {
      if (!speechBubble || !speechBubbleText) {
        if (options.scheduleNextBreak) {
          scheduleBreakPrompt(true);
        }
        return;
      }

      if (isDead || isReviving || (options.lockBuddy && isCookieInteractionActive())) {
        if (options.scheduleNextBreak) {
          scheduleBreakPrompt(true);
        }
        return;
      }

      hideBreakPrompt();
      activeSpeechMessage = message;
      isBreakPromptActive = Boolean(options.lockBuddy);

      if (options.lockBuddy) {
        removeBall();
        clearClickReaction();
        clearRandomWalk();
        currentState = 'idle';
        document.body.dataset.state = 'idle';
        setSpriteForState('idle');
        applyWalkPosition(0);
      }

      speechBubble.dataset.visible = 'true';
      speechBubbleText.textContent = getDecodedSpeechText(0);
      updateSpeechBubblePosition();

      if (breakScrambleTimer) {
        clearInterval(breakScrambleTimer);
      }

      const startedAt = Date.now();
      const totalLetters = getSpeechLetterCount();
      breakScrambleTimer = setInterval(() => {
        const elapsedMs = Date.now() - startedAt;
        const revealedLetters = Math.min(totalLetters, Math.floor((elapsedMs / breakPromptScrambleMs) * (totalLetters + 1)));
        speechBubbleText.textContent = getDecodedSpeechText(revealedLetters);
        updateSpeechBubblePosition();

        if (revealedLetters < totalLetters) {
          return;
        }

        if (breakScrambleTimer) {
          clearInterval(breakScrambleTimer);
          breakScrambleTimer = undefined;
        }

        speechBubbleText.textContent = activeSpeechMessage;
        updateSpeechBubblePosition();
        breakHideTimer = setTimeout(() => {
          const shouldScheduleWalk = isBreakPromptActive;
          hideBreakPrompt();
          if (options.scheduleNextBreak) {
            scheduleBreakPrompt(true);
          }
          if (shouldScheduleWalk) {
            scheduleRandomWalk();
          }
        }, options.visibleMs ?? statusPromptVisibleMs);
      }, 90);
    }

    function showBreakPrompt() {
      showSpeechMessage(chooseMessage(breakPromptMessages), {
        lockBuddy: true,
        scheduleNextBreak: true,
        visibleMs: breakPromptVisibleMs,
      });
    }

    function showStatusSpeechMessage(messages) {
      if (isBreakPromptActive) {
        return;
      }

      showSpeechMessage(chooseMessage(messages), {
        lockBuddy: false,
        scheduleNextBreak: false,
        visibleMs: statusPromptVisibleMs,
      });
    }

    function shouldShowEveryOtherStatusMessage(count) {
      return count % 2 === 1;
    }

    function toggleBreakPrompt() {
      if (isBreakPromptActive) {
        dismissBreakPrompt();
        return;
      }

      clearBreakPromptTimer();
      showBreakPrompt();
    }

    function renderHearts(hearts, goldHearts = currentGoldHearts) {
      if (!healthMeter) {
        return;
      }

      healthMeter.replaceChildren();
      for (let index = 0; index < ${maxBuddyHearts}; index += 1) {
        const heart = document.createElement('img');
        const isEmpty = index >= hearts;
        heart.className = 'heart' + (isEmpty ? ' is-empty' : '');
        heart.setAttribute('src', isEmpty ? imageSources.heartEmpty : imageSources.heart);
        heart.setAttribute('alt', '');
        heart.setAttribute('aria-hidden', 'true');
        healthMeter.appendChild(heart);
      }
      for (let index = 0; index < Math.max(0, Math.min(${maxBuddyGoldHearts}, goldHearts)); index += 1) {
        const heart = document.createElement('img');
        heart.className = 'heart heart--gold';
        heart.setAttribute('src', imageSources.goldHeart);
        heart.setAttribute('alt', '');
        heart.setAttribute('aria-hidden', 'true');
        healthMeter.appendChild(heart);
      }
    }

    function getAliveDays(aliveSince) {
      if (typeof aliveSince !== 'number' || !Number.isFinite(aliveSince)) {
        return 0;
      }

      return Math.max(1, Math.floor((Date.now() - aliveSince) / oneDayMs) + 1);
    }

    function updateLifeCounter(replay = false) {
      if (!lifeCounter) {
        return;
      }

      const days = isDead ? 0 : getAliveDays(currentAliveSince);
      const nextText = 'Day ' + days;
      lifeCounter.setAttribute(
        'aria-label',
        days === 1 ? 'Buddy has been alive for 1 day' : 'Buddy has been alive for ' + days + ' days',
      );

      if (!replay && nextText === currentLifeCounterText) {
        return;
      }

      currentLifeCounterText = nextText;
      playLifeCounterScramble(days);
    }

    function playLifeCounterScramble(days) {
      if (!lifeCounter) {
        return;
      }

      clearLifeCounterScramble();

      const label = 'Day';
      const value = String(days);
      const startedAt = Date.now();
      const totalLabelLetters = getSpeechLetterCount(label);

      const updateScramble = () => {
        const elapsedMs = Date.now() - startedAt;
        const labelLetters = Math.min(
          totalLabelLetters,
          Math.floor((elapsedMs / lifeCounterScrambleMs) * (totalLabelLetters + 1)),
        );
        const labelText = getDecodedSpeechText(labelLetters, label);
        const numberText = elapsedMs >= lifeCounterNumberScrambleMs ? value : getDecodedSpeechText(0, value);

        lifeCounter.textContent = labelText + ' ' + numberText;

        if (elapsedMs < lifeCounterNumberScrambleMs) {
          const progress = Math.min(1, elapsedMs / lifeCounterNumberScrambleMs);
          const nextDelayMs = 45 + Math.floor(150 * progress * progress);
          lifeCounterScrambleTimer = setTimeout(updateScramble, nextDelayMs);
          return;
        }

        clearLifeCounterScramble();
        lifeCounter.textContent = label + ' ' + value;
      };

      updateScramble();
    }

    function clearLifeCounterScramble() {
      if (lifeCounterScrambleTimer) {
        clearTimeout(lifeCounterScrambleTimer);
        lifeCounterScrambleTimer = undefined;
      }
    }

    function scheduleLifeCounterTick() {
      clearLifeCounterTick();

      if (isDead) {
        return;
      }

      lifeCounterTimer = setInterval(updateLifeCounter, 60 * 1000);
    }

    function clearLifeCounterTick() {
      if (lifeCounterTimer) {
        clearInterval(lifeCounterTimer);
        lifeCounterTimer = undefined;
      }
    }

    function setXp(xp) {
      const previousTotalXp = Number(currentXp?.totalXp) || 0;
      const level = Math.max(1, Math.min(${maxBuddyLevel}, Number(xp?.level) || 1));
      const currentLevelXp = Math.max(0, Number(xp?.currentLevelXp) || 0);
      const nextLevelXp = Math.max(1, Number(xp?.nextLevelXp) || 100);
      const isMaxLevel = Boolean(xp?.isMaxLevel || level >= ${maxBuddyLevel});
      const progress = isMaxLevel ? 1 : Math.max(0, Math.min(1, Number(xp?.progress) || 0));
      currentXp = {
        totalXp: Math.max(0, Number(xp?.totalXp) || 0),
        level,
        currentLevelXp: isMaxLevel ? nextLevelXp : Math.min(currentLevelXp, nextLevelXp),
        nextLevelXp,
        progress,
        isMaxLevel,
      };

      if (xpMeter) {
        xpMeter.style.setProperty('--xp-progress', String(currentXp.progress));
        xpMeter.setAttribute('aria-label', getXpAriaLabel(currentXp));
      }

      if (xpLevel) {
        xpLevel.textContent = 'Lv ' + currentXp.level;
      }

      if (xpValue) {
        xpValue.textContent = currentXp.isMaxLevel ? 'Max' : currentXp.currentLevelXp + '/' + currentXp.nextLevelXp;
      }

      if (currentXp.totalXp > previousTotalXp && !isDead && !isIntroPlaying) {
        playXpBurst();
      }
    }

    function setXpBoost(boost) {
      const multiplier = Math.max(1, Number(boost?.multiplier) || 1);
      const expiresAt = Math.max(0, Number(boost?.expiresAt) || 0);
      currentXpBoost = {
        multiplier,
        expiresAt,
        isActive: Boolean(boost?.isActive) && expiresAt > Date.now(),
      };

      if (!xpBoostIndicator) {
        return;
      }

      xpBoostIndicator.hidden = !currentXpBoost.isActive;
      xpBoostIndicator.textContent = 'x' + formatXpBoostMultiplier(currentXpBoost.multiplier);
      xpBoostIndicator.setAttribute('aria-label', getXpBoostAriaLabel(currentXpBoost));
    }

    function setDailyQuests(dailyQuests) {
      const quests = Array.isArray(dailyQuests?.quests)
        ? dailyQuests.quests.map((quest) => {
          const target = Math.max(1, Number(quest?.target) || 1);
          const progress = Math.max(0, Math.min(target, Number(quest?.progress) || 0));
          return {
            id: String(quest?.id || ''),
            label: String(quest?.label || 'Daily quest'),
            progress,
            target,
            completed: Boolean(quest?.completed || progress >= target),
            rewardXp: Math.max(0, Number(quest?.rewardXp) || 0),
          };
        })
        : [];

      currentDailyQuests = {
        date: String(dailyQuests?.date || ''),
        quests,
        completedCount: Math.max(0, Number(dailyQuests?.completedCount) || quests.filter((quest) => quest.completed).length),
        totalCount: Math.max(quests.length, Number(dailyQuests?.totalCount) || quests.length),
      };

      renderDailyQuestPanel();
    }

    function renderDailyQuestPanel() {
      if (!dailyQuestPanel) {
        return;
      }

      dailyQuestPanel.setAttribute('aria-label', getDailyQuestsAriaLabel(currentDailyQuests));
      dailyQuestPanel.dataset.collapsed = String(isDailyQuestPanelCollapsed);
      dailyQuestPanel.replaceChildren();

      const toggle = document.createElement('button');
      toggle.className = 'daily-quests__toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', String(!isDailyQuestPanelCollapsed));
      toggle.addEventListener('click', () => {
        isDailyQuestPanelCollapsed = !isDailyQuestPanelCollapsed;
        renderDailyQuestPanel();
      });

      const summary = document.createElement('span');
      summary.className = 'daily-quests__summary';

      const chevron = document.createElement('span');
      chevron.className = 'daily-quests__chevron';
      chevron.textContent = '>';
      chevron.setAttribute('aria-hidden', 'true');
      summary.appendChild(chevron);

      const title = document.createElement('span');
      title.textContent = 'Daily';
      summary.appendChild(title);
      toggle.appendChild(summary);

      const count = document.createElement('span');
      count.className = 'daily-quests__count';
      count.textContent = currentDailyQuests.completedCount + '/' + currentDailyQuests.totalCount;
      toggle.appendChild(count);
      dailyQuestPanel.appendChild(toggle);

      const list = document.createElement('ul');
      list.className = 'daily-quests__list';
      currentDailyQuests.quests.forEach((quest) => {
        const item = document.createElement('li');
        item.className = 'daily-quest';
        item.dataset.completed = String(quest.completed);

        const mark = document.createElement('span');
        mark.className = 'daily-quest__mark';
        mark.setAttribute('aria-hidden', 'true');
        item.appendChild(mark);

        const label = document.createElement('span');
        label.className = 'daily-quest__label';
        label.textContent = quest.label;
        item.appendChild(label);

        const progress = document.createElement('span');
        progress.className = 'daily-quest__progress';
        progress.textContent = quest.progress + '/' + quest.target;
        item.appendChild(progress);

        list.appendChild(item);
      });
      dailyQuestPanel.appendChild(list);
    }

    function getDailyQuestsAriaLabel(dailyQuests) {
      const completedCount = Math.max(0, Number(dailyQuests?.completedCount) || 0);
      const totalCount = Math.max(0, Number(dailyQuests?.totalCount) || 0);
      return 'Buddy daily quests, ' + completedCount + ' of ' + totalCount + ' complete';
    }

    function setAttention(attention) {
      const wasLow = Boolean(currentAttention?.isLow);
      const value = Math.max(0, Math.min(100, Number(attention?.value) || 0));
      currentAttention = {
        value,
        progress: Math.max(0, Math.min(1, Number(attention?.progress) || value / 100)),
        isLow: Boolean(attention?.isLow || value <= 35),
        lastInteractionAt: Math.max(0, Number(attention?.lastInteractionAt) || 0),
        nextDecayAt: Math.max(0, Number(attention?.nextDecayAt) || 0),
      };

      if (attentionMeter) {
        attentionMeter.style.setProperty('--attention-progress', String(currentAttention.progress));
        attentionMeter.setAttribute('aria-label', getAttentionAriaLabel(currentAttention));
      }

      if (attentionValue) {
        attentionValue.textContent = getAttentionText(currentAttention);
      }

      if (!wasLow && currentAttention.isLow) {
        maybeShowAttentionPrompt(true);
      }
    }

    function recordCareAction(action) {
      vscode.postMessage({ type: 'careAction', action });
    }

    function maybeShowAttentionPrompt(force = false) {
      if (!currentAttention?.isLow || isDead || isIntroPlaying || isReviving || isCookieInteractionActive()) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastAttentionPromptAt < 20 * 60 * 1000) {
        return;
      }

      lastAttentionPromptAt = now;
      attentionMessageCount += 1;
      if (force || shouldShowEveryOtherStatusMessage(attentionMessageCount)) {
        showStatusSpeechMessage(attentionMessages);
      }
    }

    function getAttentionText(attention) {
      return Math.round(Math.max(0, Math.min(100, Number(attention?.value) || 0))) + '%';
    }

    function getAttentionAriaLabel(attention) {
      return 'Buddy attention is ' + getAttentionText(attention);
    }

    function formatXpBoostMultiplier(multiplier) {
      return Number.isInteger(multiplier) ? String(multiplier) : String(Math.round(multiplier * 10) / 10);
    }

    function getXpBoostAriaLabel(boost) {
      if (!boost?.isActive) {
        return 'Buddy XP boost inactive';
      }

      return 'Buddy XP boost x' + formatXpBoostMultiplier(boost.multiplier) + ' active';
    }

    function getXpAriaLabel(xp) {
      if (xp.isMaxLevel) {
        return 'Buddy is at max level ' + xp.level;
      }

      return 'Buddy is level ' + xp.level + ' with ' + xp.currentLevelXp + ' of ' + xp.nextLevelXp + ' XP';
    }

    function playXpBurst(customBurstCount) {
      if (!spriteStage || !imageSources.xp) {
        return;
      }

      const burstCount = Math.max(1, Math.floor(Number(customBurstCount) || (4 + Math.floor(Math.random() * 3))));
      for (let index = 0; index < burstCount; index += 1) {
        const xpBurst = document.createElement('img');
        const startX = -18 + Math.random() * 36;
        const startY = -2 - Math.random() * 10;
        const endX = startX + (-5 + Math.random() * 10);
        const endY = startY - 34 - Math.random() * 18;
        const scale = 0.9 + Math.random() * 0.25;
        xpBurst.className = 'xp-burst';
        xpBurst.setAttribute('src', imageSources.xp);
        xpBurst.setAttribute('alt', '');
        xpBurst.setAttribute('aria-hidden', 'true');
        xpBurst.style.setProperty('--xp-burst-start-x', startX + 'px');
        xpBurst.style.setProperty('--xp-burst-start-y', startY + 'px');
        xpBurst.style.setProperty('--xp-burst-end-x', endX + 'px');
        xpBurst.style.setProperty('--xp-burst-end-y', endY + 'px');
        xpBurst.style.setProperty('--xp-burst-scale', String(scale));
        xpBurst.style.animationDelay = index * 55 + 'ms';
        xpBurst.addEventListener('animationend', () => {
          xpBurst.remove();
        }, { once: true });
        spriteStage.appendChild(xpBurst);
      }
    }

    function showMilestoneReaction(reaction) {
      if (!milestoneToast || isDead || isIntroPlaying) {
        return;
      }

      if (milestoneToastTimer) {
        clearTimeout(milestoneToastTimer);
        milestoneToastTimer = undefined;
      }

      const message = String(reaction?.message || 'MILESTONE REACHED');
      const xpBonus = Math.max(0, Math.floor(Number(reaction?.xpBonus) || 0));
      if (milestoneToastMessage) {
        milestoneToastMessage.textContent = message;
      }
      if (milestoneToastXp) {
        milestoneToastXp.textContent = xpBonus > 0 ? '+' + xpBonus + ' XP' : '';
      }
      milestoneToast.dataset.visible = 'true';
      playXpBurst(9);

      milestoneToastTimer = setTimeout(() => {
        milestoneToast.dataset.visible = 'false';
        milestoneToastTimer = undefined;
      }, 4200);
    }

    function showDailyQuestReward(reward) {
      if (!milestoneToast || isDead || isIntroPlaying) {
        return;
      }

      if (milestoneToastTimer) {
        clearTimeout(milestoneToastTimer);
        milestoneToastTimer = undefined;
      }

      const label = String(reward?.label || 'Daily quest');
      const message = String(reward?.message || 'DAILY QUEST COMPLETE');
      const xpBonus = Math.max(0, Math.floor(Number(reward?.xpBonus) || 0));
      if (milestoneToastMessage) {
        milestoneToastMessage.textContent = message + ': ' + label;
      }
      if (milestoneToastXp) {
        milestoneToastXp.textContent = xpBonus > 0 ? '+' + xpBonus + ' XP' : '';
      }
      milestoneToast.dataset.visible = 'true';
      playXpBurst(7);

      milestoneToastTimer = setTimeout(() => {
        milestoneToast.dataset.visible = 'false';
        milestoneToastTimer = undefined;
      }, 4200);
    }

    const cardDesign = ${cardDesign.toString()};
    const drawPersonalCard = ${drawPersonalCard.toString()};
    function captureLevelUpCard(snapshot) {
      const canvas = document.createElement('canvas');
      canvas.width = levelUpCardWidth; canvas.height = levelUpCardHeight;
      loadLevelUpBuddyImage().then(buddyImage => {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is not available');
        drawPersonalCard(context, snapshot, buddyImage, cardDesign(snapshot.seed, snapshot.level), drawPixelScene);
        vscode.postMessage({ type: 'levelUpCardCaptured', id: snapshot.id, level: snapshot.level, dataUri: canvas.toDataURL('image/png') });
      }).catch(error => vscode.postMessage({ type: 'levelUpCardFailed', level: snapshot.level, error: String(error) }));
    }

    const cardOverlay = document.querySelector('.card-overlay');
    let savedCards = [], selectedCard = 0, cardReturnFocus;
    function displayCard(index) {
      selectedCard = index;
      cardOverlay.scrollTop = 0;
      const card = savedCards[index];
      if (!card) return;
      document.querySelector('.card-grid').hidden = true;
      document.querySelector('.card-view').hidden = false;
      const preview = document.querySelector('.card-preview');
      preview.src = card.imageUri; preview.alt = card.label;
      document.querySelector('.card-caption').textContent = card.label;
      document.querySelector('#card-heading').textContent = 'LEVEL ' + card.level + ' CARD';
      document.querySelector('.card-previous').disabled = index === 0;
      document.querySelector('.card-next').disabled = index === savedCards.length - 1;
      document.querySelector('.card-open').disabled = false;
    }
    function showCards(cards, gallery) {
      savedCards = cards;
      cardOverlay.scrollTop = 0;
      const grid = document.querySelector('.card-grid');
      grid.replaceChildren();
      document.querySelector('.card-empty').hidden = cards.length !== 0;
      document.querySelector('.card-view').hidden = gallery || cards.length === 0;
      grid.hidden = !gallery;
      document.querySelector('#card-heading').textContent = 'LEVEL-UP GALLERY';
      for (const card of cards) {
        const button = document.createElement('button');
        const image = document.createElement('img');
        image.src = card.imageUri; image.alt = ''; image.loading = 'lazy';
        button.append(image, document.createTextNode(card.label));
        button.addEventListener('click', () => { displayCard(cards.indexOf(card)); document.querySelector('.card-open').focus(); });
        grid.append(button);
      }
      for (const name of ['previous','next','open']) document.querySelector('.card-' + name).disabled = true;
      if (!gallery && cards.length) displayCard(0);
      if (!cardOverlay.open) {
        cardReturnFocus = document.activeElement;
        cardOverlay.showModal();
        document.querySelector('.card-close').focus();
      }
    }
    document.querySelector('.card-close').addEventListener('click', () => cardOverlay.close());
    cardOverlay.addEventListener('close', () => cardReturnFocus?.focus());
    document.querySelector('.card-previous').addEventListener('click', () => displayCard(Math.max(0, selectedCard - 1)));
    document.querySelector('.card-next').addEventListener('click', () => displayCard(Math.min(savedCards.length - 1, selectedCard + 1)));
    document.querySelector('.card-open').addEventListener('click', () => vscode.postMessage({type:'openCard',id:savedCards[selectedCard]?.id}));
    document.querySelector('.card-gallery').addEventListener('click', () => vscode.postMessage({type:'openCardGallery'}));

    function loadLevelUpBuddyImage() {
      return new Promise((resolve) => {
        const source = spriteSources.happy || spriteSources.idle;
        if (!source) {
          resolve(undefined);
          return;
        }

        const image = new Image();
        image.addEventListener('load', () => resolve(image), { once: true });
        image.addEventListener('error', () => resolve(undefined), { once: true });
        image.src = source;
      });
    }

    function setHealth(health, options = {}) {
      const hearts = Math.max(0, Math.min(${maxBuddyHearts}, Number(health?.hearts) || 0));
      const goldHearts = Math.max(0, Math.min(${maxBuddyGoldHearts}, Number(health?.goldHearts) || 0));
      if (health?.isDead || hearts === 0) removeBall();
      const wasDead = isDead;
      const healthDidChange = hearts !== currentHearts || goldHearts !== currentGoldHearts || Boolean(health?.isDead || hearts <= 0) !== isDead;
      const lostHeart = hearts < previousHearts || goldHearts < previousGoldHearts;
      const aliveSince = Number(health?.aliveSince);
      currentHearts = hearts;
      currentGoldHearts = goldHearts;
      previousHearts = hearts;
      previousGoldHearts = goldHearts;
      isDead = Boolean(health?.isDead || hearts <= 0);
      currentAliveSince = Number.isFinite(aliveSince) ? aliveSince : isDead ? null : currentAliveSince || Date.now();
      document.body.dataset.dead = String(isDead);
      healthMeter?.setAttribute(
        'aria-label',
        isDead
          ? 'Buddy has no hearts left'
          : 'Buddy has ' + hearts + ' red hearts and ' + goldHearts + ' gold hearts',
      );
      updateLifeCounter();

      if (isIntroPlaying && !isDead) {
        scheduleLifeCounterTick();
        return;
      }

      if (options.animateHeartFill && !isDead) {
        startSequentialHeartFill(hearts);
      } else {
        clearHeartFillTimer();
        renderHearts(hearts, goldHearts);
      }

      if (options.suppressTransitionAnimations) {
        clearDeathTimer();
        clearReviveTimer();
        isReviving = false;
        spriteY = 0;
        applySpriteY(0);
        setDeathPhase(isDead ? 'soul' : 'alive');
        setSpriteForState(isDead ? 'soul' : currentState);

        if (isDead) {
          clearIntroTimer();
          isIntroPlaying = false;
          document.body.dataset.introPhase = 'done';
          clearBreakPromptTimer();
          clearLifeCounterTick();
          hideBreakPrompt();
          clearClickReaction();
          resetCookie();
          clearRandomWalk();
        } else {
          scheduleLifeCounterTick();
          scheduleBreakPrompt();
          scheduleRandomWalk();
        }

        return;
      }

      if (isDead) {
        clearIntroTimer();
        isIntroPlaying = false;
        document.body.dataset.introPhase = 'done';
        clearBreakPromptTimer();
        clearLifeCounterTick();
        hideBreakPrompt();
        clearReviveTimer();
        isReviving = false;
        spriteY = 0;
        applySpriteY(0);
        clearClickReaction();
        resetCookie();
        clearRandomWalk();
        if (!healthDidChange && deathPhase === 'soul') {
          setSpriteForState('soul');
          setDeathPhase('soul');
          return;
        }

        playDeathSequence(!wasDead);
      } else {
        clearDeathTimer();
        if (wasDead) {
          playReviveSequence();
          return;
        }

        setDeathPhase('alive');
        scheduleLifeCounterTick();
        if (lostHeart) {
          heartLostMessageCount += 1;
          if (shouldShowEveryOtherStatusMessage(heartLostMessageCount)) {
            showStatusSpeechMessage(heartLostMessages);
          }
        }

        if (isCookieInteractionActive()) {
          return;
        }

        setSpriteForState(currentState);
        scheduleBreakPrompt();
        scheduleRandomWalk();
      }
    }

    function setDeathPhase(phase) {
      deathPhase = phase;
      document.body.dataset.deathPhase = phase;
      updateSoulWanderBounds();
    }

    function clearDeathTimer() {
      if (deathTimer) {
        clearTimeout(deathTimer);
        deathTimer = undefined;
      }
    }

    function clearReviveTimer() {
      if (reviveTimer) {
        clearTimeout(reviveTimer);
        reviveTimer = undefined;
      }
    }

    function playDeathSequence(shouldPlayDeathAnimation) {
      clearDeathTimer();

      if (!shouldPlayDeathAnimation) {
        preserveSpriteCenter(() => {
          setSpriteForState('soul');
        });
        setDeathPhase('soul');
        return;
      }

      setDeathPhase('dying');
      preserveSpriteCenter(() => {
        setSpriteForState('death');
      });
      deathTimer = setTimeout(() => {
        deathTimer = undefined;
        if (!isDead) {
          return;
        }

        preserveSpriteCenter(() => {
          setSpriteForState('soul');
        });
        setDeathPhase('rising');
        deathTimer = setTimeout(() => {
          deathTimer = undefined;
          if (!isDead) {
            return;
          }

          setDeathPhase('soul');
        }, soulRiseDurationMs);
      }, deathGifDurationMs);
    }

    function playReviveSequence() {
      clearDeathTimer();
      clearReviveTimer();
      clearBreakPromptTimer();
      hideBreakPrompt();
      clearClickReaction();
      resetCookie();
      clearRandomWalk();
      isReviving = true;
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      captureWalkPosition();

      preserveSpritePosition(() => {
        setDeathPhase('reviving');
        setSpriteForState('revive');
      });

      reviveTimer = setTimeout(() => {
        reviveTimer = undefined;
        if (isDead) {
          isReviving = false;
          return;
        }

        preserveSpritePosition(() => {
          currentState = 'idle';
          document.body.dataset.state = 'idle';
          setSpriteForState('idle');
        });

        waitForSpriteImage(() => {
          if (isDead) {
            isReviving = false;
            return;
          }

          requestAnimationFrame(() => {
            setDeathPhase('alive');
            spriteY = 0;
            applySpriteY(reviveDropDurationMs);

            reviveTimer = setTimeout(() => {
              reviveTimer = undefined;
              isReviving = false;
              applySpriteY(0);
              scheduleBreakPrompt(true);
              scheduleRandomWalk();
            }, reviveDropDurationMs);
          });
        });
      }, reviveGifDurationMs);
    }

    function playHeartFill(heartIndex) {
      if (!healthMeter) {
        return;
      }

      const heart = healthMeter.querySelectorAll('.heart')[heartIndex];
      if (!(heart instanceof HTMLImageElement)) {
        return;
      }

      heart.classList.remove('is-empty');
      const isGoldHeart = heartIndex >= ${maxBuddyHearts};
      heart.setAttribute('src', isGoldHeart ? imageSources.goldHeartFill : imageSources.heartFill);
      setTimeout(() => {
        heart.setAttribute('src', isGoldHeart ? imageSources.goldHeart : imageSources.heart);
      }, heartFillDurationMs);
    }

    function captureWalkPosition() {
      if (!spriteStage) {
        return;
      }

      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        const spriteRect = spriteStage.getBoundingClientRect();
        walkX = spriteRect.left + spriteRect.width / 2 - (stageRect.left + stageRect.width / 2);
      } else {
        const transform = getComputedStyle(spriteStage).transform;
        if (transform && transform !== 'none') {
          const matrix = new DOMMatrixReadOnly(transform);
          walkX = matrix.m41;
        }
      }

      applyWalkPosition(0);
    }

    function getSpriteCenterX() {
      if (!spriteImage) {
        return undefined;
      }

      const rect = spriteImage.getBoundingClientRect();
      return rect.left + rect.width / 2;
    }

    function getSpriteBottom() {
      if (!spriteImage) {
        return undefined;
      }

      return spriteImage.getBoundingClientRect().bottom;
    }

    function preserveSpriteCenter(callback) {
      const previousCenter = getSpriteCenterX();
      callback();

      if (previousCenter === undefined) {
        return;
      }

      const adjustPosition = () => {
        const nextCenter = getSpriteCenterX();
        if (nextCenter === undefined) {
          return;
        }

        walkX += previousCenter - nextCenter;
        applyWalkPosition(0);
        clampWalkPosition();
      };

      requestAnimationFrame(adjustPosition);
      spriteImage?.addEventListener('load', adjustPosition, { once: true });
    }

    function preserveSpritePosition(callback) {
      const previousCenter = getSpriteCenterX();
      const previousBottom = getSpriteBottom();
      callback();

      if (previousCenter === undefined && previousBottom === undefined) {
        return;
      }

      let didAdjust = false;
      const adjustPosition = () => {
        if (didAdjust) {
          return;
        }
        didAdjust = true;

        if (previousCenter !== undefined) {
          const nextCenter = getSpriteCenterX();
          if (nextCenter !== undefined) {
            walkX += previousCenter - nextCenter;
            applyWalkPosition(0);
            clampWalkPosition();
          }
        }

        if (previousBottom !== undefined) {
          const nextBottom = getSpriteBottom();
          if (nextBottom !== undefined) {
            spriteY += previousBottom - nextBottom;
            applySpriteY(0);
          }
        }
      };

      if (spriteImage && !spriteImage.complete) {
        spriteImage.addEventListener('load', adjustPosition, { once: true });
        spriteImage.addEventListener('error', adjustPosition, { once: true });
      } else {
        requestAnimationFrame(adjustPosition);
      }
    }

    function waitForSpriteImage(callback) {
      if (!spriteImage || spriteImage.complete) {
        requestAnimationFrame(callback);
        return;
      }

      const handleReady = () => {
        requestAnimationFrame(callback);
      };
      spriteImage.addEventListener('load', handleReady, { once: true });
      spriteImage.addEventListener('error', handleReady, { once: true });
    }

    function clampWalkPosition(captureCurrentPosition = false) {
      if (captureCurrentPosition) {
        captureWalkPosition();
      }

      const limit = getWalkLimit(true);
      walkX = Math.min(limit, Math.max(-limit, walkX));
      applyWalkPosition(0);
    }

    function clearWalkTransition() {
      if (walkTransitionTimer) {
        clearTimeout(walkTransitionTimer);
        walkTransitionTimer = undefined;
      }

      if (walkTransitionCleanup) {
        walkTransitionCleanup();
        walkTransitionCleanup = undefined;
      }
    }

    function clearRandomWalk() {
      if (walkTimer) {
        clearTimeout(walkTimer);
        walkTimer = undefined;
      }

      clearWalkTransition();

      captureWalkPosition();
    }

    function clearLookTimer() {
      if (lookResetTimer) {
        clearTimeout(lookResetTimer);
        lookResetTimer = undefined;
      }
    }

    function isLookEligible() {
      if (ball) return false;
      const visibleState = getVisibleSpriteState();
      return !isDead
        && !isReviving
        && !isIntroPlaying
        && !isBreakPromptActive
        && !isCookieInteractionActive()
        && !clickReactionTimer
        && spriteImage
        && spriteStage
        && (visibleState === 'idle' || visibleState === 'walk');
    }

    function getLookStateForPointer(event) {
      if (!spriteImage) {
        return undefined;
      }

      const rect = spriteImage.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance > lookActivationDistancePx) {
        return undefined;
      }

      if (distance < lookCenterDistancePx) {
        return 'lookCenter';
      }

      const angle = Math.atan2(deltaY, deltaX);
      const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
      const directionIndex = Math.round(normalizedAngle / (Math.PI / 4)) % lookDirections.length;
      return lookDirections[directionIndex];
    }

    function setLookState(lookState) {
      if (activeLookState === lookState) {
        return;
      }

      if (!activeLookState) {
        lookReturnSpriteState = getVisibleSpriteState();
      }
      activeLookState = lookState;
      preserveSpriteCenter(() => {
        setSpriteForState(lookState);
      });
    }

    function clearLookReaction({ delay = false, resumeWalk = true } = {}) {
      clearLookTimer();

      if (!activeLookState) {
        return;
      }

      const restoreSprite = () => {
        lookResetTimer = undefined;
        if (!activeLookState) {
          return;
        }

        activeLookState = undefined;
        const restoreState = lookReturnSpriteState || getVisibleSpriteState();
        lookReturnSpriteState = undefined;
        if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive()) {
          return;
        }

        preserveSpriteCenter(() => {
          setSpriteForState(restoreState);
        });

        if (resumeWalk) {
          scheduleRandomWalk();
        }
      };

      if (delay) {
        lookResetTimer = setTimeout(restoreSprite, lookResetDelayMs);
      } else {
        restoreSprite();
      }
    }

    function handlePointerMove(event) {
      if (!isLookEligible()) {
        clearLookReaction({ resumeWalk: false });
        return;
      }

      const lookState = getLookStateForPointer(event);
      if (!lookState) {
        clearLookReaction({ delay: true });
        return;
      }

      clearLookTimer();
      if (getVisibleSpriteState() === 'idle') {
        clearRandomWalk();
      }
      setLookState(lookState);
    }

    function handlePointerExit() {
      clearLookReaction({ delay: true });
    }

    function handlePointerOut(event) {
      if (event.relatedTarget === null) {
        handlePointerExit();
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearLookReaction({ resumeWalk: false });
      }
    }

    function clearClickReaction() {
      if (clickReactionTimer) {
        clearTimeout(clickReactionTimer);
        clickReactionTimer = undefined;
      }
    }

    function clearCookieEatTimer() {
      if (cookieDropTimer) {
        clearTimeout(cookieDropTimer);
        cookieDropTimer = undefined;
      }

      if (cookieEatTimer) {
        clearTimeout(cookieEatTimer);
        cookieEatTimer = undefined;
      }
    }

    function resetCookie() {
      clearCookieEatTimer();
      cookieActive = false;
      cookieDashSegmentsRemaining = 0;
      cookiePhase = 'idle';
      activeFood = 'cookie';

      if (!cookieTreat) {
        return;
      }

      cookieTreat.hidden = true;
      cookieTreat.removeAttribute('data-state');
    }

    function isCookieInteractionActive() {
      return cookiePhase !== 'idle';
    }

    function scheduleRandomWalk() {
      if (ball) return;
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || activeLookState || walkTimer || (currentState !== 'idle' && currentState !== 'sleeping')) {
        return;
      }

      const delay = currentState === 'sleeping'
        ? 12000 + Math.random() * 26000
        : 8000 + Math.random() * 14000;
      walkTimer = setTimeout(() => {
        walkTimer = undefined;
        startRandomWalk();
      }, delay);
    }

    function startRandomWalk() {
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || activeLookState || !spriteImage || !spriteStage || (currentState !== 'idle' && currentState !== 'sleeping')) {
        scheduleRandomWalk();
        return;
      }

      if (!spriteSources.walk) {
        return;
      }

      const limit = getWalkLimit();
      if (limit <= 0) {
        scheduleRandomWalk();
        return;
      }

      const targetX = walkDirection > 0 ? limit : -limit;
      const distance = Math.abs(targetX - walkX);
      const durationMs = Math.max(900, Math.round((distance / walkSpeedPxPerSecond) * 1000));

      stateBeforeWalk = currentState;
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      setSpriteForState('walk');
      walkX = targetX;
      applyWalkPosition(durationMs);

      walkTransitionTimer = setTimeout(() => {
        walkTransitionTimer = undefined;
        walkDirection *= -1;
        currentState = stateBeforeWalk;
        document.body.dataset.state = currentState;
        setSpriteForState(currentState);
        applyWalkPosition(0);
        scheduleRandomWalk();
      }, durationMs);
    }

    function returnToCenter() {
      removeBall();
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive() || !spriteImage || !spriteStage) {
        return;
      }

      clearLookReaction({ resumeWalk: false });
      clearClickReaction();
      dismissBreakPrompt();
      clearRandomWalk();
      currentState = 'idle';
      stateBeforeWalk = 'idle';
      document.body.dataset.state = 'idle';

      const targetX = 0;
      const distance = Math.abs(targetX - walkX);
      if (distance <= 1) {
        walkX = targetX;
        applyWalkPosition(0);
        setSpriteForState('idle');
        scheduleRandomWalk();
        return;
      }

      walkDirection = targetX >= walkX ? 1 : -1;
      const shouldDash = canDashToCookie(distance);
      const movementState = shouldDash ? 'dash' : 'walk';
      const durationMs = shouldDash ? dashGifDurationMs : Math.max(700, Math.round((distance / walkSpeedPxPerSecond) * 1000));

      preserveSpriteCenter(() => {
        setSpriteForState(movementState);
      });
      applyWalkPosition(0);
      void spriteStage.offsetWidth;

      waitForSpriteImage(() => {
        if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive()) {
          return;
        }

        const completeReturn = () => {
          if (walkTransitionTimer) {
            clearTimeout(walkTransitionTimer);
            walkTransitionTimer = undefined;
          }

          if (walkTransitionCleanup) {
            walkTransitionCleanup();
            walkTransitionCleanup = undefined;
          }

          walkX = targetX;
          applyWalkPosition(0);
          currentState = 'idle';
          document.body.dataset.state = 'idle';
          setSpriteForState('idle');
          scheduleRandomWalk();
        };
        const handleWalkTransitionEnd = (event) => {
          if (event.target === spriteStage && event.propertyName === 'transform') {
            completeReturn();
          }
        };

        walkTransitionCleanup = () => {
          spriteStage.removeEventListener('transitionend', handleWalkTransitionEnd);
        };

        spriteStage.addEventListener('transitionend', handleWalkTransitionEnd);
        walkTransitionTimer = setTimeout(completeReturn, durationMs + 250);
        walkX = targetX;
        applyWalkPosition(durationMs);
      });
    }

    function getPanelTargetX(event) {
      if (!stage) {
        return 0;
      }

      const stageRect = stage.getBoundingClientRect();
      const stageCenterX = stageRect.left + stageRect.width / 2;
      const limit = getWalkLimit();
      return Math.min(limit, Math.max(-limit, event.clientX - stageCenterX));
    }

    function moveBuddyToPanelTarget(targetX) {
      removeBall();
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive() || !spriteImage || !spriteStage) {
        return;
      }

      recordCareAction('chase');
      clearLookReaction({ resumeWalk: false });
      clearClickReaction();
      dismissBreakPrompt();
      clearRandomWalk();

      const boundedTargetX = Math.min(getWalkLimit(), Math.max(-getWalkLimit(), targetX));
      const distance = Math.abs(boundedTargetX - walkX);
      stateBeforeWalk = currentState;
      currentState = 'idle';
      document.body.dataset.state = 'idle';

      if (distance <= 1) {
        walkX = boundedTargetX;
        applyWalkPosition(0);
        currentState = stateBeforeWalk === 'sleeping' ? 'idle' : stateBeforeWalk;
        document.body.dataset.state = currentState;
        setSpriteForState(currentState);
        scheduleRandomWalk();
        return;
      }

      walkDirection = boundedTargetX >= walkX ? 1 : -1;
      const shouldDash = canDashToCookie(distance);
      const movementState = shouldDash ? 'dash' : 'walk';
      const durationMs = shouldDash ? dashGifDurationMs : Math.max(700, Math.round((distance / walkSpeedPxPerSecond) * 1000));

      preserveSpriteCenter(() => {
        setSpriteForState(movementState);
      });
      applyWalkPosition(0);
      void spriteStage.offsetWidth;

      waitForSpriteImage(() => {
        if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive()) {
          return;
        }

        const completeMove = () => {
          if (walkTransitionTimer) {
            clearTimeout(walkTransitionTimer);
            walkTransitionTimer = undefined;
          }

          if (walkTransitionCleanup) {
            walkTransitionCleanup();
            walkTransitionCleanup = undefined;
          }

          walkX = boundedTargetX;
          applyWalkPosition(0);
          currentState = stateBeforeWalk === 'sleeping' ? 'idle' : stateBeforeWalk;
          document.body.dataset.state = currentState;
          setSpriteForState(currentState);
          scheduleRandomWalk();
        };
        const handleWalkTransitionEnd = (event) => {
          if (event.target === spriteStage && event.propertyName === 'transform') {
            completeMove();
          }
        };

        walkTransitionCleanup = () => {
          spriteStage.removeEventListener('transitionend', handleWalkTransitionEnd);
        };

        spriteStage.addEventListener('transitionend', handleWalkTransitionEnd);
        walkTransitionTimer = setTimeout(completeMove, durationMs + 250);
        walkX = boundedTargetX;
        applyWalkPosition(durationMs);
      });
    }

    function handlePanelDoubleClick(event) {
      event.preventDefault();
      moveBuddyToPanelTarget(getPanelTargetX(event));
    }

    function handlePanelMouseDown(event) {
      if (event.detail >= 2) {
        event.preventDefault();
      }
    }

    function handlePanelClick(event) {
      if (!event.metaKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      vscode.postMessage({ type: 'foodRequested', food: 'cookie', targetX: getPanelTargetX(event) });
    }

    function spawnCookie(targetX, food = 'cookie') {
      removeBall();
      if (!cookieTreat) {
        return;
      }

      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive()) {
        return;
      }

      clearLookReaction({ resumeWalk: false });
      clearClickReaction();
      dismissBreakPrompt();
      clearCookieEatTimer();
      clearRandomWalk();
      activeFood = imageSources[food] ? food : 'cookie';
      const limit = getWalkLimit(true);
      const defaultCookieX = walkX <= 0 ? Math.max(0, limit - 12) : -Math.max(0, limit - 12);
      cookieX = typeof targetX === 'number'
        ? Math.min(limit, Math.max(-limit, targetX))
        : defaultCookieX;
      cookieActive = true;
      cookieDashSegmentsRemaining = 0;
      cookiePhase = 'dropping';
      applyCookiePosition();
      setCookieState('ready');
      void cookieTreat.offsetWidth;

      requestAnimationFrame(() => {
        setCookieState('dropping');
        cookieDropTimer = setTimeout(() => {
          cookieDropTimer = undefined;
          setCookieState('landed');
          cookieDashSegmentsRemaining = getCookieDashSegmentCount(Math.abs(cookieX - walkX));
          startCookieWalk();
        }, cookieDropMs);
      });
    }

    function getCookieDashSegmentCount(distance) {
      if (!spriteSources.dash || !spriteSources.dashContinue || distance <= cookieDashMinDistancePx) {
        return 0;
      }

      return Math.max(1, Math.ceil(distance / getSingleDashDistance()));
    }

    function canDashToCookie(distance) {
      return Boolean(spriteSources.dash && spriteSources.dashContinue && distance > cookieDashMinDistancePx);
    }

    function getCookieMovementPlan(distance) {
      const shouldDash = canDashToCookie(distance) && cookieDashSegmentsRemaining > 0;

      if (!shouldDash) {
        return {
          state: 'walk',
          targetX: cookieX,
          durationMs: Math.max(700, Math.round((distance / walkSpeedPxPerSecond) * 1000)),
        };
      }

      const isFinalDash = cookieDashSegmentsRemaining <= 1;
      const dashDistance = isFinalDash ? distance : distance / cookieDashSegmentsRemaining;

      return {
        state: isFinalDash ? 'dash' : 'dashContinue',
        targetX: walkX + walkDirection * dashDistance,
        durationMs: dashGifDurationMs,
      };
    }

    function startCookieWalk(preserveReturnState = false) {
      if (!spriteStage || !spriteImage || !cookieActive) {
        return;
      }

      clearWalkTransition();
      if (!preserveReturnState) {
        stateBeforeWalk = currentState;
      }
      cookiePhase = 'walking';
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      walkDirection = cookieX >= walkX ? 1 : -1;
      const distanceToCookie = Math.abs(cookieX - walkX);
      if (canDashToCookie(distanceToCookie) && cookieDashSegmentsRemaining <= 0) {
        cookieDashSegmentsRemaining = getCookieDashSegmentCount(distanceToCookie);
      }
      const movementPlan = getCookieMovementPlan(distanceToCookie);
      preserveSpriteCenter(() => {
        setSpriteForState(movementPlan.state, movementPlan.state === 'dashContinue');
      });
      applyWalkPosition(0);
      void spriteStage.offsetWidth;

      waitForSpriteImage(() => {
        if (!cookieActive || cookiePhase !== 'walking') {
          return;
        }

        applyWalkPosition(0);
        void spriteStage.offsetWidth;

        const distance = Math.abs(cookieX - walkX);
        if (canDashToCookie(distance) && cookieDashSegmentsRemaining <= 0) {
          cookieDashSegmentsRemaining = getCookieDashSegmentCount(distance);
        }
        const activeMovementPlan = getCookieMovementPlan(distance);
        const completeCookieWalk = () => {
          if (!cookieActive || cookiePhase !== 'walking') {
            return;
          }

          if (walkTransitionTimer) {
            clearTimeout(walkTransitionTimer);
            walkTransitionTimer = undefined;
          }

          if (walkTransitionCleanup) {
            walkTransitionCleanup();
            walkTransitionCleanup = undefined;
          }

          cookieDashSegmentsRemaining = Math.max(0, cookieDashSegmentsRemaining - 1);

          if (Math.abs(cookieX - walkX) <= 1) {
            eatCookie();
          } else {
            startCookieWalk(true);
          }
        };
        const handleWalkTransitionEnd = (event) => {
          if (event.target === spriteStage && event.propertyName === 'transform') {
            completeCookieWalk();
          }
        };
        walkTransitionCleanup = () => {
          spriteStage.removeEventListener('transitionend', handleWalkTransitionEnd);
        };

        spriteStage.addEventListener('transitionend', handleWalkTransitionEnd);
        walkTransitionTimer = setTimeout(completeCookieWalk, activeMovementPlan.durationMs + 250);
        walkX = activeMovementPlan.targetX;
        applyWalkPosition(activeMovementPlan.durationMs);
      });
    }

    function eatCookie() {
      if (!cookieTreat) {
        return;
      }

      cookiePhase = 'waiting';
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      setSpriteForState('idle');
      applyWalkPosition(0);
      vscode.postMessage({ type: 'foodReached', food: activeFood });
    }

    function acceptFood() {
      if (!cookieTreat || cookiePhase !== 'waiting') {
        return;
      }

      cookieActive = false;
      cookiePhase = 'eating';
      setCookieState('eaten');
      setSpriteForState('eat');
      applyWalkPosition(0);
      cookieEatingMessageCount += 1;
      if (shouldShowEveryOtherStatusMessage(cookieEatingMessageCount)) {
        showStatusSpeechMessage(cookieEatingMessages);
      }

      cookieEatTimer = setTimeout(() => {
        cookiePhase = 'loving';
        recordCareAction('feed');
        vscode.postMessage({ type: 'foodEaten', food: activeFood });
        setSpriteForState('love');

        cookieEatTimer = setTimeout(() => {
          cookieEatTimer = undefined;
          cookiePhase = 'idle';
          currentState = stateBeforeWalk === 'sleeping' ? 'idle' : stateBeforeWalk;
          document.body.dataset.state = currentState;
          setSpriteForState(currentState);
          scheduleBreakPrompt(true);
          scheduleRandomWalk();
        }, loveGifDurationMs);
      }, eatGifDurationMs);
    }

    function refuseFood() {
      if (cookiePhase !== 'waiting') {
        return;
      }

      resetCookie();
      currentState = stateBeforeWalk === 'sleeping' ? 'idle' : stateBeforeWalk;
      document.body.dataset.state = currentState;
      setSpriteForState(currentState);
      showStatusSpeechMessage(foodRefusalMessages);
      scheduleRandomWalk();
    }

    function showFoodRefusal() {
      if (isDead || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive()) {
        return;
      }

      clearLookReaction({ resumeWalk: false });
      clearClickReaction();
      dismissBreakPrompt();
      showStatusSpeechMessage(foodRefusalMessages);
    }

    function setBuddySize(size) {
      preserveSpriteCenter(() => {
        buddySize = buddySizeScales[size] ? size : 'small';
        vscode.setState({
          state: document.body.dataset.state || 'idle',
          buddySize,
        });
        setSpriteForState(activeLookState || getVisibleSpriteState());
        updateCookieSize();
      });
    }

    function setState(state) {
      if (ball) { lastState = state; return; }
      if (isFocusModeEnabled) {
        clearLookReaction({ resumeWalk: false });
        lastState = state;
        return;
      }

      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive) {
        clearLookReaction({ resumeWalk: false });
        lastState = state;
        return;
      }

      if (isCookieInteractionActive()) {
        clearLookReaction({ resumeWalk: false });
        stateBeforeWalk = state;
        vscode.setState({ state, buddySize });
        lastState = state;
        return;
      }

      clearLookReaction({ resumeWalk: false });
      clearClickReaction();
      dismissBreakPrompt();
      if (!activeLookState) {
        clearRandomWalk();
      }
      currentState = state;
      document.body.dataset.state = state;
      vscode.setState({ state, buddySize });
      setSpriteForState(activeLookState || state);
      if (!activeLookState) {
        scheduleRandomWalk();
      }
      lastState = state;
    }

    function triggerBuddyClick() {
      removeBall();
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive()) {
        return;
      }

      recordCareAction('love');
      clearLookReaction({ resumeWalk: false });
      clearClickReaction();
      dismissBreakPrompt();
      preserveSpriteCenter(() => {
        clearRandomWalk();
        setSpriteForState('love');
      });
      clickReactionTimer = setTimeout(() => {
        clickReactionTimer = undefined;
        preserveSpriteCenter(() => {
          setSpriteForState(currentState);
        });
        scheduleRandomWalk();
      }, loveGifDurationMs);
    }

    stage?.addEventListener('click', handlePanelClick, true);
    spriteStage?.addEventListener('click', triggerBuddyClick);
    stage?.addEventListener('mousedown', handlePanelMouseDown);
    stage?.addEventListener('dblclick', handlePanelDoubleClick);
    spriteStage?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        triggerBuddyClick();
      }
    });
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerExit);
    window.addEventListener('pointerout', handlePointerOut);
    window.addEventListener('mouseout', handlePointerOut);
    window.addEventListener('blur', () => {
      clearLookReaction({ resumeWalk: false });
    });
    document.addEventListener('mouseleave', handlePointerExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('visibilitychange', tickFamily);
    window.addEventListener('pagehide', () => clearTimeout(familyTimer));
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'setDecorations') {
        setDecorations(message.items);
      } else if (message.type === 'focusDeadline') {
        updateFocusDeadline(message.endsAt);
      } else if (message.type === 'focusComplete') {
        finishFocusSession();
      } else if (message.type === 'setColors') {
        setColors(message.colors);
      } else if (message.type === 'toggleBall') {
        if (ball) removeBall(); else spawnBall();
      } else if (message.type === 'spawnBall') {
        spawnBall();
      } else if (message.type === 'removeBall') {
        removeBall();
      } else if (message.type === 'setBackground') {
        sceneBackground = message.background;
        drawBackground();
      } else if (message.type === 'setFamily') {
        currentFamily = message.family;
        renderFamily();
      } else if (message.type === 'setState') {
        setState(message.state);
      } else if (message.type === 'setBuddySize') {
        setBuddySize(message.size);
      } else if (message.type === 'setHealth') {
        setHealth(message.health, message.options);
      } else if (message.type === 'setXp') {
        setXp(message.xp);
      } else if (message.type === 'setXpBoost') {
        setXpBoost(message.boost);
      } else if (message.type === 'setDailyQuests') {
        setDailyQuests(message.dailyQuests);
      } else if (message.type === 'setAttention') {
        setAttention(message.attention);
      } else if (message.type === 'setCareSettings') {
        setCareSettings(message.careSettings);
      } else if (message.type === 'setFocusMode') {
        setFocusMode(message.enabled);
      } else if (message.type === 'showMilestoneReaction') {
        showMilestoneReaction(message.reaction);
      } else if (message.type === 'showDailyQuestReward') {
        showDailyQuestReward(message.reward);
      } else if (message.type === 'captureLevelUpCard') {
        captureLevelUpCard(message.snapshot);
      } else if (message.type === 'showCards') {
        showCards(message.cards, message.gallery);
      } else if (message.type === 'playHeartFill') {
        playHeartFill(message.heartIndex);
      } else if (message.type === 'spawnCookie') {
        spawnCookie(message.targetX, message.food);
      } else if (message.type === 'acceptFood') {
        acceptFood();
      } else if (message.type === 'refuseFood') {
        refuseFood();
      } else if (message.type === 'showFoodRefusal') {
        showFoodRefusal();
      } else if (message.type === 'returnToCenter') {
        returnToCenter();
      } else if (message.type === 'moveBuddy') {
        moveBuddyToPanelTarget(message.targetX);
      } else if (message.type === 'playIntroPreview') {
        playIntroPreview();
      } else if (message.type === 'playLookPreview') {
        playLookPreview();
      } else if (message.type === 'showPreviewSpeech') {
        showSpeechMessage(String(message.message || ''), {
          lockBuddy: false,
          scheduleNextBreak: false,
          visibleMs: statusPromptVisibleMs,
        });
      } else if (message.type === 'setPreviewReveal') {
        setPreviewReveal(message.step);
      } else if (message.type === 'toggleBreakPrompt') {
        toggleBreakPrompt();
      }
    });

    const colorPresets = ${JSON.stringify(buddyColorPresets)};
    function setColors(colors) {
      for (const target of ['buddy', 'partner', 'children']) {
        const preset = colorPresets.find((color) => color.id === colors[target]);
        document.body.style.setProperty('--' + target + '-hue', (preset?.rotation ?? 0) + 'deg');
      }
    }
    setColors(${JSON.stringify(this.colors)});
    const stepBall = ${stepBall.toString()};
    const stepBallPlay = ${stepBallPlay.toString()};
    const drawPixelScene = ${drawPixelScene.toString()};
    const ballElement = document.querySelector('.play-ball');
    let ball;
    let ballFrame;
    let ballLastTime = 0;
    let ballPlay;
    let sceneBackground = ${JSON.stringify(this.getBackgroundMessage())};
    const backgroundCanvas = document.querySelector('canvas.scene-background');
    const backgroundImage = document.querySelector('.custom-background');
    let loadedBackgroundSource;

    function removeBall() {
      const wasPlaying = Boolean(ball);
      ball = undefined;
      if (ballFrame !== undefined) cancelAnimationFrame(ballFrame);
      ballFrame = undefined;
      ballElement.hidden = true;
      ballPlay = undefined;
      delete ballElement.dataset.playPhase;
      if (wasPlaying) {
        spriteY = 0;
        applySpriteY(0);
        currentState = lastState || 'idle';
        setSpriteForState(currentState);
        applyWalkPosition(0);
        scheduleRandomWalk();
      }
    }
    function spawnBall() {
      if (isDead || isReviving || isIntroPlaying || isFocusModeEnabled || isBreakPromptActive || isCookieInteractionActive()) return;
      removeBall();
      clearLookReaction({ resumeWalk: false });
      clearClickReaction();
      clearRandomWalk();
      const bounds = stage.getBoundingClientRect();
      ball = { x: Math.max(8, bounds.width * 0.75), y: Math.min(bounds.height - 8, 100), vx: -140, vy: 200 };
      ballLastTime = 0;
      ballPlay = { phase: 'watch', elapsed: 0, round: 0, startX: walkX, targetX: walkX, direction: 1, pause: 1.2 + Math.random() * 2 };
      ballElement.hidden = false;
      ballFrame = requestAnimationFrame(animateBall);
    }
    function animateBall(time) {
      if (!ball) return;
      if (document.hidden) { ballFrame = undefined; ballLastTime = 0; return; }
      if (isDead || isReviving || isIntroPlaying || isFocusModeEnabled || isBreakPromptActive || isCookieInteractionActive()) { removeBall(); return; }
      const dt = ballLastTime ? Math.min(0.04, (time - ballLastTime) / 1000) : 0;
      ballLastTime = time;
      const bounds = stage.getBoundingClientRect();
      if (ballPlay.phase !== 'mouth') ball = stepBall(ball, bounds.width, Math.max(16, bounds.height - 8), dt);
      if (ballPlay.phase === 'watch' && time > familyBallCooldown && ball.y < 30) {
        for (const member of familyMembers.children) {
          const activity = familyActivity.get(member);
          if (member.dataset.activity === 'sleeping' || familySocial?.kind === 'curl') continue;
          const box = member.getBoundingClientRect();
          const x = box.left + box.width/2 - bounds.left;
          if (Math.abs(x-ball.x) < box.width/2+12 && Math.abs(bounds.bottom-box.bottom-8) < 12) {
            ball.vx = x < bounds.width/2 ? 130 : -130; ball.vy = 160;
            familyBallCooldown = time + 2200;
            activity.reaction='happy';activity.reactionUntil=performance.now()+1300;
            updateFamilySprites();break;
          }
        }
      }
      const result = stepBallPlay(ballPlay, ball, walkX, bounds.width, getWalkLimit(), dt);
      ballPlay = result.play;
      ball = result.ball;
      walkX = result.x;
      walkDirection = result.direction;
      spriteY = -result.lift;
      ballElement.hidden = result.hidden;
      ballElement.dataset.playPhase = ballPlay.phase;
      setSpriteForState(result.sprite);
      applyWalkPosition(0);
      applySpriteY(0);
      ballElement.style.transform = 'translate(' + (ball.x - 8) + 'px,' + (bounds.height - 8 - ball.y - 8) + 'px)';
      ballFrame = requestAnimationFrame(animateBall);
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && ball && ballFrame === undefined) ballFrame = requestAnimationFrame(animateBall);
    });
    window.addEventListener('pagehide', () => { if (ballFrame !== undefined) cancelAnimationFrame(ballFrame); });

    function drawBackground() {
      const kind = sceneBackground.kind;
      backgroundCanvas.hidden = kind === 'none' || (kind === 'custom' && sceneBackground.fit !== 'tile');
      backgroundImage.hidden = kind !== 'custom' || sceneBackground.fit === 'tile';
      if (kind === 'none') return;
      if (kind === 'custom') {
        backgroundImage.style.objectFit = sceneBackground.fit === 'contain' ? 'contain' : 'cover';
        if (sceneBackground.imageUri !== loadedBackgroundSource) {
          loadedBackgroundSource = sceneBackground.imageUri;
          backgroundImage.src = loadedBackgroundSource || '';
          return;
        }
        if (sceneBackground.fit !== 'tile') return;
      }
      const bounds = stage.getBoundingClientRect();
      // A four-CSS-pixel grid remains crisp and fills portrait, landscape, and short panels.
      backgroundCanvas.width = Math.max(1, Math.ceil(bounds.width / 4));
      backgroundCanvas.height = Math.max(1, Math.ceil(bounds.height / 4));
      const ctx = backgroundCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const w = backgroundCanvas.width, h = backgroundCanvas.height;
      if (kind === 'custom') {
        if (!backgroundImage.complete || !backgroundImage.naturalWidth) return;
        const pattern = ctx.createPattern(backgroundImage, 'repeat');
        if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, w, h); }
        return;
      }
      if (drawPixelScene(ctx, w, h, kind)) return;
      const night = kind === 'night';
      ctx.fillStyle = night ? '#171d38' : '#82b9cc'; ctx.fillRect(0, 0, w, h);
      if (night) {
        ctx.fillStyle = '#e8dca0';
        for (let x = 4; x < w; x += 13) ctx.fillRect(x, 3 + ((x * 7) % Math.max(1, Math.floor(h * 0.55))), 1, 1);
        ctx.fillRect(Math.floor(w * 0.75), Math.max(2, Math.floor(h * 0.16)), 5, 5);
      } else {
        ctx.fillStyle = '#e3edd9';
        for (let x = 5; x < w; x += 29) { const y = 6 + (x % 11); ctx.fillRect(x, y, 12, 2); ctx.fillRect(x + 3, y - 2, 6, 2); }
      }
      for (let layer = 0; layer < 2; layer++) {
        ctx.fillStyle = night ? ['#303855', '#354955'][layer] : ['#60978f', '#4f846c'][layer];
        for (let x = 0; x < w; x += 2) {
          const ridge = Math.floor(h * (0.68 + layer * 0.13) + Math.sin(x / 13 + layer * 2) * Math.min(8, h * 0.12));
          ctx.fillRect(x, ridge, 2, h - ridge);
        }
      }
      ctx.fillStyle = night ? '#263b3c' : '#426b43'; ctx.fillRect(0, h - 5, w, 5);
      ctx.fillStyle = night ? '#53745a' : '#9aba63';
      for (let x = 2; x < w; x += 7) ctx.fillRect(x, h - 5, 2, 1);
    }
    backgroundImage.addEventListener('load', drawBackground);
    backgroundImage.addEventListener('error', () => { backgroundImage.hidden = true; backgroundCanvas.hidden = true; });
    new ResizeObserver(drawBackground).observe(stage);
    drawBackground();

    renderFamily();
    if (isIntroPlaying) {
      playIntroSequence();
    } else {
      setHealth(${JSON.stringify(health)}, { animateHeartFill: true });
    }
    updateLifeCounter(true);
    setXp(${JSON.stringify(xp)});
    setXpBoost(${JSON.stringify(xpBoost)});
    setDailyQuests(${JSON.stringify(dailyQuests)});
    setAttention(${JSON.stringify(attention)});
    setCareSettings(${JSON.stringify(careSettings)});
    setFocusMode(${JSON.stringify(this.isFocusModeEnabled)});
    scheduleLifeCounterTick();
    vscode.postMessage({ type: 'cardsReady' });
    updateCookieSize();
    clampWalkPosition();
    window.addEventListener('resize', () => {
      updateFamilySprites();
      const shouldResumeCookieWalk = cookiePhase === 'walking';
      clampWalkPosition(true);
      if (cookieActive) {
        const limit = getWalkLimit(true);
        cookieX = Math.min(limit, Math.max(-limit, cookieX));
        applyCookiePosition();
      }
      if (shouldResumeCookieWalk) {
        cookieDashSegmentsRemaining = getCookieDashSegmentCount(Math.abs(cookieX - walkX));
        startCookieWalk(true);
      }
      if (speechBubble?.dataset.visible === 'true') {
        updateSpeechBubblePosition();
      }
    });
  </script>
</body>
</html>`;
  }
}

function getSpriteSources(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
): Record<SpriteKey, string> {
  const spriteFiles: Record<SpriteKey, string> = {
    idle: 'idle-trim.gif',
    typing: 'think-trim.gif',
    searching: 'search-trim.gif',
    thinking: 'think-trim.gif',
    sleeping: 'sleep-trim.gif',
    happy: 'happy-trim.gif',
    jump: 'jump-trim.gif',
    lookCenter: 'look-center.png',
    lookTop: 'look-top.png',
    lookTopRight: 'look-top-right.png',
    lookRight: 'look-right.png',
    lookBottomRight: 'look-bottom-right.png',
    lookBottom: 'look-bottom.png',
    lookBottomLeft: 'look-bottom-left.png',
    lookLeft: 'look-left.png',
    lookTopLeft: 'look-top-left.png',
    walk: 'walk-trim.gif',
    dash: 'dash-trim.gif',
    dashContinue: 'dash-continue-trim.gif',
    love: 'love-trim.gif',
    eat: 'eat-trim.gif',
    death: 'death-trim.gif',
    soul: 'soul-trim.gif',
    revive: 'revive-trim.gif',
    spawn: 'spawn-trim.gif',
  };

  return Object.fromEntries(
    Object.entries(spriteFiles).map(([state, file]) => [
      state,
      webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'images', file)).toString(),
    ]),
  ) as Record<SpriteKey, string>;
}

function getImageSources(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
): Record<ImageKey, string> {
  const imageFiles: Record<ImageKey, string> = {
    cookie: 'cookie-trim.gif',
    coffee: 'coffee-trim.gif',
    sandwich: 'sandwich-trim.gif',
    cake: 'cake-trim.gif',
    heart: 'heart-trim.gif',
    heartEmpty: 'heart-empty-trim.gif',
    heartFill: 'heart-fill-trim.gif',
    goldHeart: 'gold-heart-trim.gif',
    goldHeartFill: 'gold-heart-fill-trim.gif',
    xp: 'xp-trim.gif',
  };

  return Object.fromEntries(
    Object.entries(imageFiles).map(([key, file]) => [
      key,
      webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'images', file)).toString(),
    ]),
  ) as Record<ImageKey, string>;
}

function renderHearts(hearts: number, imageSources: Record<ImageKey, string>, goldHearts = 0): string {
  const redHearts = Array.from({ length: maxBuddyHearts }, (_, index) => {
    const isEmpty = index >= hearts;
    const className = isEmpty ? 'heart is-empty' : 'heart';
    const source = isEmpty ? imageSources.heartEmpty : imageSources.heart;
    return `<img class="${className}" src="${source}" alt="" aria-hidden="true" />`;
  });
  const goldHeartCount = Math.max(0, Math.min(maxBuddyGoldHearts, Math.round(goldHearts)));
  const goldHeartImages = Array.from({ length: goldHeartCount }, () =>
    `<img class="heart heart--gold" src="${imageSources.goldHeart}" alt="" aria-hidden="true" />`,
  );

  return [...redHearts, ...goldHeartImages].join('');
}

function renderDailyQuests(dailyQuests: BuddyDailyQuests): string {
  const quests = dailyQuests.quests.length > 0 ? dailyQuests.quests : [];

  return [
    '<button class="daily-quests__toggle" type="button" aria-expanded="false">',
    '<span class="daily-quests__summary"><span class="daily-quests__chevron" aria-hidden="true">&gt;</span><span>Daily</span></span>',
    `<span class="daily-quests__count">${dailyQuests.completedCount}/${dailyQuests.totalCount}</span>`,
    '</button>',
    '<ul class="daily-quests__list">',
    ...quests.map((quest) => [
      `<li class="daily-quest" data-completed="${quest.completed}">`,
      '<span class="daily-quest__mark" aria-hidden="true"></span>',
      `<span class="daily-quest__label">${escapeHtml(quest.label)}</span>`,
      `<span class="daily-quest__progress">${quest.progress}/${quest.target}</span>`,
      '</li>',
    ].join('')),
    '</ul>',
  ].join('');
}

function getDailyQuestsLabel(dailyQuests: BuddyDailyQuests): string {
  return `Buddy daily quests, ${dailyQuests.completedCount} of ${dailyQuests.totalCount} complete`;
}

function getAliveDayCounterText(health: BuddyHealth): string {
  return `Day ${health.isDead ? 0 : health.aliveDays}`;
}

function getAliveDaysLabel(health: BuddyHealth): string {
  const days = health.isDead ? 0 : health.aliveDays;

  return days === 1 ? 'Buddy has been alive for 1 day' : `Buddy has been alive for ${days} days`;
}

function getXpLevelText(xp: BuddyXp): string {
  return `Lv ${xp.level}`;
}

function getXpProgressText(xp: BuddyXp): string {
  return xp.isMaxLevel ? 'Max' : `${xp.currentLevelXp}/${xp.nextLevelXp}`;
}

function getXpBoostText(boost: BuddyXpBoost): string {
  return boost.isActive ? `x${formatMultiplier(boost.multiplier)}` : '';
}

function getXpLabel(xp: BuddyXp): string {
  if (xp.isMaxLevel) {
    return `Buddy is at max level ${xp.level}`;
  }

  return `Buddy is level ${xp.level} with ${xp.currentLevelXp} of ${xp.nextLevelXp} XP`;
}

function getAttentionProgressText(attention: BuddyAttention): string {
  return `${Math.round(Math.max(0, Math.min(100, attention.value)))}%`;
}

function getAttentionLabel(attention: BuddyAttention): string {
  return `Buddy attention is ${getAttentionProgressText(attention)}`;
}

function getXpBoostLabel(boost: BuddyXpBoost): string {
  if (!boost.isActive) {
    return 'Buddy XP boost inactive';
  }

  return `Buddy XP boost x${formatMultiplier(boost.multiplier)} active`;
}

function formatMultiplier(multiplier: number): string {
  return Number.isInteger(multiplier) ? String(multiplier) : String(Math.round(multiplier * 10) / 10);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeLevel(level: number | undefined): number {
  if (typeof level !== 'number' || !Number.isFinite(level)) {
    return 1;
  }

  return Math.max(1, Math.min(maxBuddyLevel, Math.round(level)));
}

function normalizeFoodType(food: string | undefined): FoodType {
  return food === 'coffee' || food === 'sandwich' || food === 'cake' ? food : 'cookie';
}

function normalizeTargetX(targetX: number | undefined): number | undefined {
  return typeof targetX === 'number' && Number.isFinite(targetX) ? targetX : undefined;
}

function normalizeCareAction(action: string | undefined): CareAction {
  return action === 'feed' || action === 'chase' ? action : 'love';
}

function getSpriteDisplaySizes(size: BuddySize = 'default'): Record<SpriteKey, { width: string; aspectRatio: string }> {
  const scale = buddySizeScales[size] ?? buddySizeScales.default;

  return Object.fromEntries(
    Object.entries(spriteTrimSizes).map(([state, size]) => [
      state,
      {
        width: `${(size.width / baseSpriteCanvasWidth) * baseSpriteDisplayWidth * scale}px`,
        aspectRatio: String(size.width / size.height),
      },
    ]),
  ) as Record<SpriteKey, { width: string; aspectRatio: string }>;
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
