import { randomUUID } from 'node:crypto';
import type * as vscode from 'vscode';
import type { BuddyColors } from './colorSettings';
import type { BuddyFamily } from './familyManager';

export type CardSnapshot = {
  id: string; seed: string; level: number; earnedAt: string;
  aliveDays: number; careStreak: number; questsCompleted: number; questsTotal: number;
  totalXp: number; family: BuddyFamily; colors: BuddyColors;
};
export type SavedCard = { id: string; level: number; label: string; imageUri: string };
const seedKey = 'buddyCards.seed';
const pendingKey = 'buddyCards.pending';

// The seed belongs to this local profile, not the current family or current life.
export class LevelUpCards {
  private pending: CardSnapshot[];
  private writing: Promise<void> = Promise.resolve();
  public constructor(private readonly storage: vscode.Memento, public readonly seed: string) {
    const saved = storage.get<CardSnapshot[]>(pendingKey, []);
    this.pending = (Array.isArray(saved) ? saved : []).filter(card =>
      typeof card?.id === 'string' && typeof card.seed === 'string' && Number.isInteger(card.level)
      && card.level >= 1 && card.level <= 100 && typeof card.earnedAt === 'string' && card.family && card.colors);
  }
  public static async create(storage: vscode.Memento): Promise<LevelUpCards> {
    let seed = storage.get<string>(seedKey);
    if (typeof seed !== 'string' || !seed) {
      seed = randomUUID();
      await storage.update(seedKey, seed);
    }
    return new LevelUpCards(storage, seed);
  }
  public get waiting(): CardSnapshot[] { return structuredClone(this.pending); }
  public async earn(details: Omit<CardSnapshot, 'id' | 'seed' | 'earnedAt'>): Promise<CardSnapshot> {
    const card = structuredClone({ ...details, id: randomUUID(), seed: this.seed, earnedAt: new Date().toISOString() });
    this.pending.push(card);
    await this.persist();
    return card;
  }
  public async complete(id: string): Promise<void> {
    this.pending = this.pending.filter(card => card.id !== id);
    await this.persist();
  }
  private persist(): Promise<void> {
    const snapshot = structuredClone(this.pending);
    this.writing = this.writing.catch(() => undefined).then(() => this.storage.update(pendingKey, snapshot));
    return this.writing;
  }
}

// Self-contained so the exact same design function can run in the webview and tests.
export function cardDesign(seed: string, level: number) {
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  const index = Math.max(0, Math.min(99, Math.floor(level) - 1));
  const chapter = Math.floor(index / 10);
  const variant = index % 10;
  const scene = (chapter + hash % 10) % 10;
  const palettes = ['#ffcd75', '#95dfbe', '#ff9fae', '#9ac8ff', '#c4a4ff', '#f0d89e', '#75dadd', '#f8ac77', '#d8efa1', '#efade2'];
  const places = ['SAKURA', 'TEMPLE', 'ORBIT', 'NEON', 'CORAL', 'MUSHROOM', 'DUNES', 'SUMMIT', 'ISLAND', 'STARFIELD'];
  const moods = ['DAWN', 'GLOW', 'DREAM', 'BLOOM', 'DRIFT', 'SPARK', 'ECHO', 'WISH', 'AURORA', 'CROWN'];
  return { index, scene, variant, hash: (hash ^ Math.imul(index + 1, 2654435761)) >>> 0,
    accent: palettes[(variant + hash % 10) % 10], hue: ((hash >>> 8) % 12) * 8 + variant * 3,
    title: places[scene] + ' ' + moods[variant] };
}
