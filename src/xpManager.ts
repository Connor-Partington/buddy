import * as vscode from 'vscode';

export const maxBuddyLevel = 100;
export const targetMaxBuddyXp = 85000;
export const defaultBuddyXpMultiplier = 1;
export const coffeeBuddyXpMultiplier = 2;
export const coffeeBuddyXpBoostDurationMs = 30 * 60 * 1000;

const baseLevelXp = 100;
const levelXpCurveExponent = 1.2;
const levelUpsToMax = maxBuddyLevel - 1;
const levelXpWeights = Array.from({ length: levelUpsToMax }, (_, index) => Math.pow(index, levelXpCurveExponent));
const levelXpWeightTotal = levelXpWeights.reduce((total, weight) => total + weight, 0);
const levelXpScale = (targetMaxBuddyXp - baseLevelXp * levelUpsToMax) / levelXpWeightTotal;
const buddyLevelXpRequirements = Array.from({ length: levelUpsToMax }, (_, index) =>
  Math.max(1, Math.round(baseLevelXp + levelXpWeights[index] * levelXpScale)),
);

export const maxBuddyXp = buddyLevelXpRequirements.reduce((total, xp) => total + xp, 0);

export type BuddyXpSource = 'save' | 'gitCommit' | 'gitPush' | 'feed' | 'milestone' | 'test' | 'death' | 'reset';

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
  leveledDown: boolean;
};

export type BuddyXpBoost = {
  multiplier: number;
  expiresAt: number;
  isActive: boolean;
};

const totalXpKey = 'buddyXp.totalXp';
const xpMultiplierKey = 'buddyXp.multiplier';
const coffeeXpBoostExpiresAtKey = 'buddyXp.coffeeBoostExpiresAt';

export class BuddyXpManager implements vscode.Disposable {
  private totalXp: number;
  private xpMultiplier: number;
  private coffeeXpBoostExpiresAt: number;
  private coffeeXpBoostTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<(change: BuddyXpChange) => void>();
  private readonly boostListeners = new Set<(boost: BuddyXpBoost) => void>();

  public constructor(private readonly globalState: vscode.Memento) {
    this.totalXp = normalizeTotalXp(globalState.get<number>(totalXpKey, 0));
    this.xpMultiplier = normalizeXpMultiplier(globalState.get<number>(xpMultiplierKey, defaultBuddyXpMultiplier));
    this.coffeeXpBoostExpiresAt = normalizeBoostExpiresAt(globalState.get<number>(coffeeXpBoostExpiresAtKey, 0));
    this.scheduleCoffeeXpBoostExpiry();
  }

  public get xp(): BuddyXp {
    return getBuddyXp(this.totalXp);
  }

  public get multiplier(): number {
    return this.xpMultiplier;
  }

  public get xpBoost(): BuddyXpBoost {
    return getCoffeeXpBoost(this.coffeeXpBoostExpiresAt);
  }

  public async awardXp(award: BuddyXpAward): Promise<BuddyXpChange | undefined> {
    const effectiveAmount = getEffectiveAwardAmount(award.amount, this.getEffectiveMultiplier());
    if (effectiveAmount <= 0 || this.xp.isMaxLevel) {
      return undefined;
    }

    const previousLevel = this.xp.level;
    const nextTotalXp = normalizeTotalXp(this.totalXp + effectiveAmount);
    if (nextTotalXp === this.totalXp) {
      return undefined;
    }

    this.totalXp = nextTotalXp;
    await this.globalState.update(totalXpKey, this.totalXp);

    const change: BuddyXpChange = {
      xp: this.xp,
      award: {
        ...award,
        amount: effectiveAmount,
      },
      leveledUp: this.xp.level > previousLevel,
      leveledDown: false,
    };
    this.listeners.forEach((listener) => listener(change));

    return change;
  }

  public async deductXp(award: BuddyXpAward): Promise<BuddyXpChange | undefined> {
    const effectiveAmount = normalizeDeductionAmount(award.amount);
    if (effectiveAmount <= 0 || this.totalXp <= 0) {
      return undefined;
    }

    const previousLevel = this.xp.level;
    const nextTotalXp = normalizeTotalXp(this.totalXp - effectiveAmount);
    if (nextTotalXp === this.totalXp) {
      return undefined;
    }

    const deductedAmount = this.totalXp - nextTotalXp;
    this.totalXp = nextTotalXp;
    await this.globalState.update(totalXpKey, this.totalXp);

    const change: BuddyXpChange = {
      xp: this.xp,
      award: {
        ...award,
        amount: deductedAmount,
      },
      leveledUp: false,
      leveledDown: this.xp.level < previousLevel,
    };
    this.listeners.forEach((listener) => listener(change));

    return change;
  }

  public async deductDeathPenalty(): Promise<BuddyXpChange | undefined> {
    return this.deductXp({ source: 'death', amount: getBuddyDeathXpPenalty(this.xp) });
  }

  public async resetXp(): Promise<BuddyXpChange | undefined> {
    if (this.totalXp <= 0) {
      return undefined;
    }

    this.totalXp = 0;
    await this.globalState.update(totalXpKey, this.totalXp);

    const change: BuddyXpChange = {
      xp: this.xp,
      award: { source: 'reset', amount: 0 },
      leveledUp: false,
      leveledDown: false,
    };
    this.listeners.forEach((listener) => listener(change));

    return change;
  }

  public async reset(): Promise<BuddyXpChange> {
    this.totalXp = 0;
    this.xpMultiplier = defaultBuddyXpMultiplier;
    this.coffeeXpBoostExpiresAt = 0;
    if (this.coffeeXpBoostTimer) {
      clearTimeout(this.coffeeXpBoostTimer);
      this.coffeeXpBoostTimer = undefined;
    }

    await this.globalState.update(totalXpKey, this.totalXp);
    await this.globalState.update(xpMultiplierKey, this.xpMultiplier);
    await this.globalState.update(coffeeXpBoostExpiresAtKey, undefined);

    const change: BuddyXpChange = {
      xp: this.xp,
      award: { source: 'reset', amount: 0 },
      leveledUp: false,
      leveledDown: false,
    };
    this.listeners.forEach((listener) => listener(change));
    this.emitBoost();

    return change;
  }

  public async setMultiplier(multiplier: number): Promise<number> {
    this.xpMultiplier = normalizeXpMultiplier(multiplier);
    await this.globalState.update(xpMultiplierKey, this.xpMultiplier);

    return this.xpMultiplier;
  }

  public async activateCoffeeXpBoost(): Promise<BuddyXpBoost> {
    this.coffeeXpBoostExpiresAt = Date.now() + coffeeBuddyXpBoostDurationMs;
    await this.globalState.update(coffeeXpBoostExpiresAtKey, this.coffeeXpBoostExpiresAt);
    this.scheduleCoffeeXpBoostExpiry();
    this.emitBoost();

    return this.xpBoost;
  }

  public async clearCoffeeXpBoost(): Promise<BuddyXpBoost | undefined> {
    if (this.coffeeXpBoostExpiresAt <= 0) {
      return undefined;
    }

    this.coffeeXpBoostExpiresAt = 0;
    if (this.coffeeXpBoostTimer) {
      clearTimeout(this.coffeeXpBoostTimer);
      this.coffeeXpBoostTimer = undefined;
    }

    await this.globalState.update(coffeeXpBoostExpiresAtKey, undefined);
    this.emitBoost();

    return this.xpBoost;
  }

  public onDidChangeXp(listener: (change: BuddyXpChange) => void): vscode.Disposable {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  public onDidChangeXpBoost(listener: (boost: BuddyXpBoost) => void): vscode.Disposable {
    this.boostListeners.add(listener);

    return {
      dispose: () => {
        this.boostListeners.delete(listener);
      },
    };
  }

  public dispose(): void {
    if (this.coffeeXpBoostTimer) {
      clearTimeout(this.coffeeXpBoostTimer);
      this.coffeeXpBoostTimer = undefined;
    }
    this.listeners.clear();
    this.boostListeners.clear();
  }

  private getEffectiveMultiplier(): number {
    return this.xpMultiplier * (this.xpBoost.isActive ? coffeeBuddyXpMultiplier : 1);
  }

  private scheduleCoffeeXpBoostExpiry(): void {
    if (this.coffeeXpBoostTimer) {
      clearTimeout(this.coffeeXpBoostTimer);
      this.coffeeXpBoostTimer = undefined;
    }

    const remainingMs = this.coffeeXpBoostExpiresAt - Date.now();
    if (remainingMs <= 0) {
      return;
    }

    this.coffeeXpBoostTimer = setTimeout(() => {
      this.coffeeXpBoostTimer = undefined;
      void this.expireCoffeeXpBoost();
    }, remainingMs);
  }

  private async expireCoffeeXpBoost(): Promise<void> {
    if (this.coffeeXpBoostExpiresAt > Date.now()) {
      this.scheduleCoffeeXpBoostExpiry();
      return;
    }

    if (this.coffeeXpBoostExpiresAt <= 0) {
      return;
    }

    this.coffeeXpBoostExpiresAt = 0;
    await this.globalState.update(coffeeXpBoostExpiresAtKey, undefined);
    this.emitBoost();
  }

  private emitBoost(): void {
    const boost = this.xpBoost;
    this.boostListeners.forEach((listener) => listener(boost));
  }
}

function getBuddyXp(totalXp: number): BuddyXp {
  const normalizedTotalXp = normalizeTotalXp(totalXp);
  const level = getLevelForTotalXp(normalizedTotalXp);
  const currentLevelStartXp = getTotalXpForLevel(level);
  const isMaxLevel = level >= maxBuddyLevel;
  const nextLevelXp = isMaxLevel
    ? buddyLevelXpRequirements[buddyLevelXpRequirements.length - 1]
    : buddyLevelXpRequirements[level - 1];
  const currentLevelXp = isMaxLevel ? nextLevelXp : Math.max(0, normalizedTotalXp - currentLevelStartXp);
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

export function getBuddyDeathXpPenalty(xp: BuddyXp): number {
  if (xp.totalXp <= 0) {
    return 0;
  }

  const currentLevelRequirement = getXpRequirementForLevel(xp.level);
  return Math.min(xp.totalXp, Math.max(1, Math.round(currentLevelRequirement * 0.25)));
}

function getLevelForTotalXp(totalXp: number): number {
  let remainingXp = totalXp;
  for (let index = 0; index < buddyLevelXpRequirements.length; index += 1) {
    if (remainingXp < buddyLevelXpRequirements[index]) {
      return index + 1;
    }

    remainingXp -= buddyLevelXpRequirements[index];
  }

  return maxBuddyLevel;
}

function getTotalXpForLevel(level: number): number {
  return buddyLevelXpRequirements
    .slice(0, Math.max(0, Math.min(maxBuddyLevel, level) - 1))
    .reduce((total, xp) => total + xp, 0);
}

function getXpRequirementForLevel(level: number): number {
  const index = Math.max(0, Math.min(maxBuddyLevel - 2, level - 1));

  return buddyLevelXpRequirements[index] ?? buddyLevelXpRequirements[buddyLevelXpRequirements.length - 1] ?? baseLevelXp;
}

function normalizeTotalXp(totalXp: number | undefined): number {
  if (typeof totalXp !== 'number' || !Number.isFinite(totalXp)) {
    return 0;
  }

  return Math.min(maxBuddyXp, Math.max(0, Math.round(totalXp)));
}

function normalizeXpMultiplier(multiplier: number | undefined): number {
  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier)) {
    return defaultBuddyXpMultiplier;
  }

  return Math.min(5, Math.max(0.25, multiplier));
}

function normalizeBoostExpiresAt(expiresAt: number | undefined): number {
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) {
    return 0;
  }

  return Math.max(0, Math.round(expiresAt));
}

function getCoffeeXpBoost(expiresAt: number): BuddyXpBoost {
  return {
    multiplier: coffeeBuddyXpMultiplier,
    expiresAt,
    isActive: expiresAt > Date.now(),
  };
}

function getEffectiveAwardAmount(amount: number, multiplier: number): number {
  if (amount <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(amount * multiplier));
}

function normalizeDeductionAmount(amount: number): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount);
}
