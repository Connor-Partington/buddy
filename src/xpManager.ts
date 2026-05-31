import * as vscode from 'vscode';

export const maxBuddyLevel = 100;
export const buddyXpPerLevel = 100;
export const maxBuddyXp = (maxBuddyLevel - 1) * buddyXpPerLevel;

export type BuddyXpSource = 'save' | 'gitCommit' | 'gitPush';

export type BuddyXp = {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
  isMaxLevel: boolean;
};

export type BuddyXpAward = {
  amount: number;
  source: BuddyXpSource;
};

export type BuddyXpChange = {
  xp: BuddyXp;
  award: BuddyXpAward;
  leveledUp: boolean;
};

const totalXpKey = 'buddyXp.totalXp';

export class BuddyXpManager implements vscode.Disposable {
  private totalXp: number;
  private readonly listeners = new Set<(change: BuddyXpChange) => void>();

  public constructor(private readonly globalState: vscode.Memento) {
    this.totalXp = normalizeTotalXp(globalState.get<number>(totalXpKey, 0));
  }

  public get xp(): BuddyXp {
    return getBuddyXp(this.totalXp);
  }

  public async awardXp(award: BuddyXpAward): Promise<BuddyXpChange | undefined> {
    if (award.amount <= 0 || this.xp.isMaxLevel) {
      return undefined;
    }

    const previousLevel = this.xp.level;
    const nextTotalXp = normalizeTotalXp(this.totalXp + award.amount);
    if (nextTotalXp === this.totalXp) {
      return undefined;
    }

    this.totalXp = nextTotalXp;
    await this.globalState.update(totalXpKey, this.totalXp);

    const change: BuddyXpChange = {
      xp: this.xp,
      award,
      leveledUp: this.xp.level > previousLevel,
    };
    this.listeners.forEach((listener) => listener(change));

    return change;
  }

  public onDidChangeXp(listener: (change: BuddyXpChange) => void): vscode.Disposable {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  public dispose(): void {
    this.listeners.clear();
  }
}

function getBuddyXp(totalXp: number): BuddyXp {
  const normalizedTotalXp = normalizeTotalXp(totalXp);
  const level = Math.min(maxBuddyLevel, Math.floor(normalizedTotalXp / buddyXpPerLevel) + 1);
  const currentLevelStartXp = (level - 1) * buddyXpPerLevel;
  const currentLevelXp = Math.max(0, normalizedTotalXp - currentLevelStartXp);
  const isMaxLevel = level >= maxBuddyLevel;
  const nextLevelXp = isMaxLevel ? buddyXpPerLevel : buddyXpPerLevel;
  const progress = isMaxLevel ? 1 : currentLevelXp / nextLevelXp;

  return {
    totalXp: normalizedTotalXp,
    level,
    currentLevelXp: isMaxLevel ? nextLevelXp : currentLevelXp,
    nextLevelXp,
    progress,
    isMaxLevel,
  };
}

function normalizeTotalXp(totalXp: number | undefined): number {
  if (typeof totalXp !== 'number' || !Number.isFinite(totalXp)) {
    return 0;
  }

  return Math.min(maxBuddyXp, Math.max(0, Math.round(totalXp)));
}
