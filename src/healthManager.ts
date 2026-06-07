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
const nextHeartLossAtKey = 'buddyHealth.nextHeartLossAt';
const oneDayMs = 24 * 60 * 60 * 1000;

export class BuddyHealthManager implements vscode.Disposable {
  private hearts: number;
  private aliveSince?: number;
  private heartLossTimer?: ReturnType<typeof setTimeout>;
  private nextHeartLossAt?: number;
  private readonly listeners = new Set<(health: BuddyHealth) => void>();

  public constructor(private readonly globalState: vscode.Memento) {
    this.hearts = normalizeHearts(globalState.get<number>(heartsKey, maxBuddyHearts));
    this.aliveSince = normalizeTimestamp(globalState.get<number>(aliveSinceKey));
    this.nextHeartLossAt = normalizeTimerTimestamp(globalState.get<number>(nextHeartLossAtKey));

    if (!this.health.isDead && this.aliveSince === undefined) {
      this.aliveSince = Date.now();
      void this.globalState.update(aliveSinceKey, this.aliveSince);
    }

    if (!this.health.isDead && this.nextHeartLossAt === undefined) {
      this.nextHeartLossAt = Date.now() + buddyHeartLossIntervalMs;
      void this.globalState.update(nextHeartLossAtKey, this.nextHeartLossAt);
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

  public startHeartLossTimer(): void {
    if (this.heartLossTimer || this.health.isDead) {
      return;
    }

    if (this.nextHeartLossAt === undefined) {
      this.nextHeartLossAt = Date.now() + buddyHeartLossIntervalMs;
      void this.globalState.update(nextHeartLossAtKey, this.nextHeartLossAt);
    }

    const delayMs = Math.max(1000, this.nextHeartLossAt - Date.now());
    this.heartLossTimer = setTimeout(() => {
      void this.applyOverdueHeartLoss();
    }, delayMs);
  }

  public async loseHeart(): Promise<void> {
    this.clearHeartLossTimer();
    await this.setHearts(this.hearts - 1);
    await this.scheduleNextHeartLoss();

    if (!this.health.isDead) {
      this.startHeartLossTimer();
    }
  }

  public async feedCookie(): Promise<number | undefined> {
    const restoredHeartIndex = this.hearts < maxBuddyHearts ? this.hearts : undefined;
    await this.setHearts(this.hearts + 1);

    return restoredHeartIndex;
  }

  public async revive(): Promise<void> {
    await this.setHearts(maxBuddyHearts);
    await this.scheduleNextHeartLoss();

    this.startHeartLossTimer();
  }

  public async kill(): Promise<void> {
    this.clearHeartLossTimer();
    await this.setHearts(0);
    await this.globalState.update(nextHeartLossAtKey, undefined);
    this.nextHeartLossAt = undefined;
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
  }

  private async applyOverdueHeartLoss(): Promise<void> {
    this.clearHeartLossTimer();

    if (this.health.isDead) {
      return;
    }

    const now = Date.now();
    const nextLossAt = this.nextHeartLossAt ?? now;
    const losses = Math.max(1, Math.floor((now - nextLossAt) / buddyHeartLossIntervalMs) + 1);
    await this.setHearts(this.hearts - losses);

    if (this.health.isDead) {
      await this.globalState.update(nextHeartLossAtKey, undefined);
      this.nextHeartLossAt = undefined;
      return;
    }

    this.nextHeartLossAt = nextLossAt + losses * buddyHeartLossIntervalMs;
    while (this.nextHeartLossAt <= now) {
      this.nextHeartLossAt += buddyHeartLossIntervalMs;
    }
    await this.globalState.update(nextHeartLossAtKey, this.nextHeartLossAt);
    this.startHeartLossTimer();
  }

  private async scheduleNextHeartLoss(): Promise<void> {
    if (this.health.isDead) {
      await this.globalState.update(nextHeartLossAtKey, undefined);
      this.nextHeartLossAt = undefined;
      return;
    }

    this.nextHeartLossAt = Date.now() + buddyHeartLossIntervalMs;
    await this.globalState.update(nextHeartLossAtKey, this.nextHeartLossAt);
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

function normalizeTimerTimestamp(timestamp: number | undefined): number | undefined {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
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
