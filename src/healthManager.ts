import * as vscode from 'vscode';

export const maxBuddyHearts = 3;
export const buddyHeartLossIntervalMs = 3 * 60 * 60 * 1000;

export type BuddyHealth = {
  hearts: number;
  isDead: boolean;
  aliveSince?: number;
  aliveDays: number;
};

const heartsKey = 'buddyHealth.hearts';
const aliveSinceKey = 'buddyHealth.aliveSince';
const oneDayMs = 24 * 60 * 60 * 1000;

export class BuddyHealthManager implements vscode.Disposable {
  private hearts: number;
  private aliveSince?: number;
  private heartLossTimer?: ReturnType<typeof setTimeout>;
  private remainingHeartLossMs = buddyHeartLossIntervalMs;
  private heartLossTimerStartedAt?: number;
  private readonly listeners = new Set<(health: BuddyHealth) => void>();

  public constructor(private readonly globalState: vscode.Memento) {
    this.hearts = normalizeHearts(globalState.get<number>(heartsKey, maxBuddyHearts));
    this.aliveSince = normalizeTimestamp(globalState.get<number>(aliveSinceKey));

    if (!this.health.isDead && this.aliveSince === undefined) {
      this.aliveSince = Date.now();
      void this.globalState.update(aliveSinceKey, this.aliveSince);
    }
  }

  public get health(): BuddyHealth {
    const isDead = this.hearts <= 0;

    return {
      hearts: this.hearts,
      isDead,
      aliveSince: isDead ? undefined : this.aliveSince,
      aliveDays: isDead ? 0 : getAliveDays(this.aliveSince),
    };
  }

  public startActiveHeartLoss(): void {
    if (this.heartLossTimer || this.health.isDead) {
      return;
    }

    this.heartLossTimerStartedAt = Date.now();
    this.heartLossTimer = setTimeout(() => {
      void this.loseHeart();
    }, this.remainingHeartLossMs);
  }

  public pauseActiveHeartLoss(): void {
    if (!this.heartLossTimer || this.heartLossTimerStartedAt === undefined) {
      return;
    }

    clearTimeout(this.heartLossTimer);
    this.heartLossTimer = undefined;
    this.remainingHeartLossMs = Math.max(1000, this.remainingHeartLossMs - (Date.now() - this.heartLossTimerStartedAt));
    this.heartLossTimerStartedAt = undefined;
  }

  public async loseHeart(): Promise<void> {
    this.clearHeartLossTimer();
    await this.setHearts(this.hearts - 1);
    this.remainingHeartLossMs = buddyHeartLossIntervalMs;

    if (!this.health.isDead && vscode.window.state.focused) {
      this.startActiveHeartLoss();
    }
  }

  public async feedCookie(): Promise<number | undefined> {
    const restoredHeartIndex = this.hearts < maxBuddyHearts ? this.hearts : undefined;
    await this.setHearts(this.hearts + 1);

    return restoredHeartIndex;
  }

  public async revive(): Promise<void> {
    await this.setHearts(maxBuddyHearts);
    this.remainingHeartLossMs = buddyHeartLossIntervalMs;

    if (vscode.window.state.focused) {
      this.startActiveHeartLoss();
    }
  }

  public async kill(): Promise<void> {
    this.clearHeartLossTimer();
    await this.setHearts(0);
    this.remainingHeartLossMs = buddyHeartLossIntervalMs;
  }

  public onDidChangeHealth(listener: (health: BuddyHealth) => void): vscode.Disposable {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  public dispose(): void {
    this.clearHeartLossTimer();
    this.listeners.clear();
  }

  private async setHearts(hearts: number): Promise<void> {
    const nextHearts = normalizeHearts(hearts);
    if (nextHearts === this.hearts) {
      return;
    }

    const wasDead = this.health.isDead;
    this.hearts = nextHearts;
    const isDead = this.health.isDead;

    if (!wasDead && isDead) {
      this.aliveSince = undefined;
      await this.globalState.update(aliveSinceKey, undefined);
    } else if (wasDead && !isDead) {
      this.aliveSince = Date.now();
      await this.globalState.update(aliveSinceKey, this.aliveSince);
    }

    await this.globalState.update(heartsKey, this.hearts);
    this.listeners.forEach((listener) => listener(this.health));
  }

  private clearHeartLossTimer(): void {
    if (this.heartLossTimer) {
      clearTimeout(this.heartLossTimer);
      this.heartLossTimer = undefined;
    }

    this.heartLossTimerStartedAt = undefined;
  }
}

function normalizeHearts(hearts: number | undefined): number {
  if (typeof hearts !== 'number' || !Number.isFinite(hearts)) {
    return maxBuddyHearts;
  }

  return Math.min(maxBuddyHearts, Math.max(0, Math.round(hearts)));
}

function normalizeTimestamp(timestamp: number | undefined): number | undefined {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now()) {
    return undefined;
  }

  return timestamp;
}

function getAliveDays(aliveSince: number | undefined): number {
  if (aliveSince === undefined) {
    return 1;
  }

  return Math.max(1, Math.floor((Date.now() - aliveSince) / oneDayMs) + 1);
}
