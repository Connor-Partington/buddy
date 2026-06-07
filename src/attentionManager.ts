import * as vscode from 'vscode';

export const maxBuddyAttention = 100;
export const buddyAttentionDecayIntervalMs = (8 * 60 * 60 * 1000) / maxBuddyAttention;
export const buddyAttentionCareAmount = 34;

export type BuddyAttention = {
  value: number;
  progress: number;
  isLow: boolean;
  lastInteractionAt: number;
  nextDecayAt: number;
};

const attentionValueKey = 'buddyAttention.value';
const lastInteractionAtKey = 'buddyAttention.lastInteractionAt';
const nextDecayAtKey = 'buddyAttention.nextDecayAt';
const lowAttentionThreshold = 35;
const attentionTickMs = 5 * 60 * 1000;

export class BuddyAttentionManager implements vscode.Disposable {
  private value: number;
  private lastInteractionAt: number;
  private nextDecayAt: number;
  private tickTimer?: ReturnType<typeof setTimeout>;
  private readonly listeners = new Set<(attention: BuddyAttention) => void>();

  public constructor(private readonly globalState: vscode.Memento) {
    const now = Date.now();
    this.value = normalizeAttentionValue(globalState.get<number>(attentionValueKey, maxBuddyAttention));
    this.lastInteractionAt = normalizeTimestamp(globalState.get<number>(lastInteractionAtKey), now);
    this.nextDecayAt = normalizeDecayTimestamp(globalState.get<number>(nextDecayAtKey), now + buddyAttentionDecayIntervalMs);

    if (this.value > 0 && now >= this.nextDecayAt) {
      const elapsedIntervals = Math.floor((now - this.nextDecayAt) / buddyAttentionDecayIntervalMs) + 1;
      this.value = normalizeAttentionValue(this.value - elapsedIntervals);
      this.nextDecayAt += elapsedIntervals * buddyAttentionDecayIntervalMs;
      while (this.nextDecayAt <= now) {
        this.nextDecayAt += buddyAttentionDecayIntervalMs;
      }
      void this.persist();
    }
  }

  public get attention(): BuddyAttention {
    return {
      value: this.value,
      progress: this.value / maxBuddyAttention,
      isLow: this.value <= lowAttentionThreshold,
      lastInteractionAt: this.lastInteractionAt,
      nextDecayAt: this.nextDecayAt,
    };
  }

  public startAttentionTimer(): void {
    if (this.tickTimer) {
      return;
    }

    this.tickTimer = setTimeout(() => {
      this.tickTimer = undefined;
      void this.applyPassiveDecay().then(() => {
        this.startAttentionTimer();
      });
    }, attentionTickMs);
  }

  public async recordCareAction(amount = buddyAttentionCareAmount): Promise<void> {
    await this.applyPassiveDecay(false);

    const now = Date.now();
    const nextValue = normalizeAttentionValue(this.value + Math.max(0, Math.round(amount)));
    const didChange = nextValue !== this.value;
    this.value = nextValue;
    this.lastInteractionAt = now;
    this.nextDecayAt = now + buddyAttentionDecayIntervalMs;
    await this.persist();

    if (didChange) {
      this.notify();
    }
  }

  public onDidChangeAttention(listener: (attention: BuddyAttention) => void): vscode.Disposable {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  public dispose(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = undefined;
    }
    this.listeners.clear();
  }

  private async applyPassiveDecay(notify = true): Promise<void> {
    const now = Date.now();
    if (now < this.nextDecayAt || this.value <= 0) {
      return;
    }

    const elapsedIntervals = Math.floor((now - this.nextDecayAt) / buddyAttentionDecayIntervalMs) + 1;
    this.value = normalizeAttentionValue(this.value - elapsedIntervals);
    this.nextDecayAt += elapsedIntervals * buddyAttentionDecayIntervalMs;
    while (this.nextDecayAt <= now) {
      this.nextDecayAt += buddyAttentionDecayIntervalMs;
    }

    await this.persist();
    if (notify) {
      this.notify();
    }
  }

  private async persist(): Promise<void> {
    await this.globalState.update(attentionValueKey, this.value);
    await this.globalState.update(lastInteractionAtKey, this.lastInteractionAt);
    await this.globalState.update(nextDecayAtKey, this.nextDecayAt);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.attention));
  }
}

function normalizeAttentionValue(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return maxBuddyAttention;
  }

  return Math.max(0, Math.min(maxBuddyAttention, Math.round(value)));
}

function normalizeTimestamp(timestamp: number | undefined, fallback: number): number {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now()) {
    return fallback;
  }

  return Math.round(timestamp);
}

function normalizeDecayTimestamp(timestamp: number | undefined, fallback: number): number {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    return fallback;
  }

  return Math.round(timestamp);
}
