import * as vscode from 'vscode';

import { BuddyXpAward } from './xpManager';

export const buddyLevelMilestones = [10, 25, 50, 75, 100] as const;

export type BuddyMilestoneId =
  | 'firstCommitOfDay'
  | 'firstPush'
  | 'longFocusedSession'
  | 'fedBuddy'
  | 'gaveBuddyAttention'
  | 'firstSave'
  | 'careStreak'
  | 'coffeeTime'
  | `level${(typeof buddyLevelMilestones)[number]}`;

export type BuddyMilestoneReaction = {
  id: BuddyMilestoneId;
  label: string;
  message: string;
  xpBonus: number;
};

export type BuddyCareStreak = {
  count: number;
  bestCount: number;
  graceDaysRemaining: number;
  maxGraceDays: number;
  lastCompletedDate: string;
};

type StoredCareStreakState = Partial<Omit<BuddyCareStreak, 'maxGraceDays'>>;

const configurationSection = 'buddy.milestoneReactions';
const firstCommitDateKey = 'buddyMilestones.firstCommitDate';
const firstPushCompletedKey = 'buddyMilestones.firstPushCompleted';
const focusedSessionDateKey = 'buddyMilestones.focusedSessionDate';
const fedBuddyDateKey = 'buddyMilestones.fedBuddyDate';
const gaveBuddyAttentionDateKey = 'buddyMilestones.gaveBuddyAttentionDate';
const firstSaveDateKey = 'buddyMilestones.firstSaveDate';
const careStreakDateKey = 'buddyMilestones.careStreakDate';
const careStreakStateKey = 'buddyMilestones.careStreakState';
const coffeeTimeDateKey = 'buddyMilestones.coffeeTimeDate';
const completedLevelMilestonesKey = 'buddyMilestones.completedLevelMilestones';
const defaultFocusedSessionMinutes = 90;
const defaultMilestoneXpBonus = 15;
const maxCareStreakGraceDays = 2;

export class BuddyMilestoneManager implements vscode.Disposable {
  private focusedSessionStartedAt: number | undefined;
  private focusedSessionTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly subscriptions: vscode.Disposable[] = [];

  public constructor(
    private readonly globalState: vscode.Memento,
    private readonly onReaction: (reaction: BuddyMilestoneReaction) => void,
    private readonly onXpAward: (award: BuddyXpAward) => void,
  ) {
    this.subscriptions.push(
      vscode.window.onDidChangeWindowState((state) => {
        this.handleWindowFocusChange(state.focused);
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(configurationSection)) {
          this.scheduleFocusedSessionTimer();
        }
      }),
    );

    this.handleWindowFocusChange(vscode.window.state.focused);
  }

  public async recordGitCommit(): Promise<void> {
    await this.recordDailyMilestone(firstCommitDateKey, {
      id: 'firstCommitOfDay',
      label: 'First Commit',
      message: 'FIRST COMMIT TODAY',
      xpBonus: this.getXpBonus(),
    });
  }

  public async recordGitPush(): Promise<void> {
    if (!this.isEnabled() || this.globalState.get<boolean>(firstPushCompletedKey, false)) {
      return;
    }

    await this.globalState.update(firstPushCompletedKey, true);
    this.emitReaction({
      id: 'firstPush',
      label: 'First Push',
      message: 'FIRST PUSH LANDED',
      xpBonus: this.getXpBonus(),
    });
  }

  public async recordSave(): Promise<void> {
    await this.recordDailyMilestone(firstSaveDateKey, {
      id: 'firstSave',
      label: 'First Save',
      message: 'FIRST SAVE TODAY',
      xpBonus: this.getXpBonus(),
    });
  }

  public async recordFedBuddy(): Promise<void> {
    await this.recordDailyMilestone(fedBuddyDateKey, {
      id: 'fedBuddy',
      label: 'Fed Buddy',
      message: 'FIRST TREAT TODAY',
      xpBonus: this.getXpBonus(),
    });
    await this.recordCareStreak();
  }

  public async recordGaveBuddyAttention(): Promise<void> {
    await this.recordDailyMilestone(gaveBuddyAttentionDateKey, {
      id: 'gaveBuddyAttention',
      label: 'Gave Attention',
      message: 'ATTENTION GIVEN',
      xpBonus: this.getXpBonus(),
    });
    await this.recordCareStreak();
  }

  public async recordCoffeeTime(): Promise<void> {
    await this.recordDailyMilestone(coffeeTimeDateKey, {
      id: 'coffeeTime',
      label: 'Coffee Time',
      message: 'COFFEE TIME',
      xpBonus: this.getXpBonus(),
    });
  }

  public async recordLevel(level: number): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const completedMilestones = this.getCompletedLevelMilestones();
    const nextMilestones = buddyLevelMilestones.filter(
      (candidate) => level >= candidate && !completedMilestones.includes(candidate),
    );
    if (nextMilestones.length === 0) {
      return;
    }

    await this.globalState.update(completedLevelMilestonesKey, [...completedMilestones, ...nextMilestones]);
    nextMilestones.forEach((nextMilestone) => {
      this.emitReaction({
        id: `level${nextMilestone}`,
        label: `Level ${nextMilestone}`,
        message: `LEVEL ${nextMilestone} MILESTONE`,
        xpBonus: this.getXpBonus(),
      });
    });
  }

  public getCareStreak(): BuddyCareStreak {
    const state = this.globalState.get<StoredCareStreakState>(careStreakStateKey);
    if (state) {
      return this.normalizeCareStreakState(state);
    }

    const lastCompletedDate = normalizeDateKey(this.globalState.get<string>(careStreakDateKey));
    if (!lastCompletedDate) {
      return this.normalizeCareStreakState(undefined);
    }

    return {
      count: 1,
      bestCount: 1,
      graceDaysRemaining: maxCareStreakGraceDays,
      maxGraceDays: maxCareStreakGraceDays,
      lastCompletedDate,
    };
  }

  public async reset(): Promise<void> {
    this.clearFocusedSessionTimer();
    this.focusedSessionStartedAt = vscode.window.state.focused ? Date.now() : undefined;
    await Promise.all([
      this.globalState.update(firstCommitDateKey, undefined),
      this.globalState.update(firstPushCompletedKey, undefined),
      this.globalState.update(focusedSessionDateKey, undefined),
      this.globalState.update(fedBuddyDateKey, undefined),
      this.globalState.update(gaveBuddyAttentionDateKey, undefined),
      this.globalState.update(firstSaveDateKey, undefined),
      this.globalState.update(careStreakDateKey, undefined),
      this.globalState.update(careStreakStateKey, undefined),
      this.globalState.update(coffeeTimeDateKey, undefined),
      this.globalState.update(completedLevelMilestonesKey, undefined),
    ]);
    this.scheduleFocusedSessionTimer();
  }

  public dispose(): void {
    this.clearFocusedSessionTimer();
    this.subscriptions.forEach((subscription) => subscription.dispose());
  }

  private handleWindowFocusChange(isFocused: boolean): void {
    if (!isFocused || !this.isEnabled()) {
      this.focusedSessionStartedAt = undefined;
      this.clearFocusedSessionTimer();
      return;
    }

    if (!this.focusedSessionStartedAt) {
      this.focusedSessionStartedAt = Date.now();
    }
    this.scheduleFocusedSessionTimer();
  }

  private scheduleFocusedSessionTimer(): void {
    this.clearFocusedSessionTimer();

    if (!this.isEnabled() || !vscode.window.state.focused || this.globalState.get<string>(focusedSessionDateKey) === getLocalDateKey()) {
      return;
    }

    const startedAt = this.focusedSessionStartedAt ?? Date.now();
    this.focusedSessionStartedAt = startedAt;
    const remainingMs = Math.max(0, this.getFocusedSessionMs() - (Date.now() - startedAt));
    this.focusedSessionTimer = setTimeout(() => {
      this.focusedSessionTimer = undefined;
      void this.recordFocusedSession();
    }, remainingMs);
  }

  private async recordFocusedSession(): Promise<void> {
    if (!this.isEnabled() || !vscode.window.state.focused) {
      this.scheduleFocusedSessionTimer();
      return;
    }

    const today = getLocalDateKey();
    if (this.globalState.get<string>(focusedSessionDateKey) === today) {
      return;
    }

    await this.globalState.update(focusedSessionDateKey, today);
    this.emitReaction({
      id: 'longFocusedSession',
      label: 'Focused Session',
      message: 'LONG FOCUS SESSION',
      xpBonus: this.getXpBonus(),
    });
  }

  private async recordCareStreak(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const today = getLocalDateKey();
    const didFeedToday = this.globalState.get<string>(fedBuddyDateKey) === today;
    const didGiveAttentionToday = this.globalState.get<string>(gaveBuddyAttentionDateKey) === today;
    if (!didFeedToday || !didGiveAttentionToday) {
      return;
    }

    if (this.globalState.get<string>(careStreakDateKey) === today) {
      return;
    }

    const careStreak = this.getNextCareStreak(today);
    await this.globalState.update(careStreakDateKey, today);
    await this.globalState.update(careStreakStateKey, careStreak);
    this.emitReaction({
      id: 'careStreak',
      label: `Care Streak ${careStreak.count}`,
      message: `CARE STREAK ${careStreak.count} DAY${careStreak.count === 1 ? '' : 'S'}`,
      xpBonus: this.getXpBonus(),
    });
  }

  private getNextCareStreak(today: string): BuddyCareStreak {
    const current = this.getCareStreak();
    const missedDays = getCalendarDayDistance(current.lastCompletedDate, today) - 1;
    if (current.count === 0 || missedDays < 0 || missedDays > current.graceDaysRemaining) {
      return {
        count: 1,
        bestCount: Math.max(current.bestCount, 1),
        graceDaysRemaining: maxCareStreakGraceDays,
        maxGraceDays: maxCareStreakGraceDays,
        lastCompletedDate: today,
      };
    }

    const count = current.count + 1;
    return {
      count,
      bestCount: Math.max(current.bestCount, count),
      graceDaysRemaining: maxCareStreakGraceDays - Math.max(0, missedDays),
      maxGraceDays: maxCareStreakGraceDays,
      lastCompletedDate: today,
    };
  }

  private normalizeCareStreakState(state: StoredCareStreakState | undefined): BuddyCareStreak {
    return {
      count: normalizeCount(state?.count),
      bestCount: normalizeCount(state?.bestCount),
      graceDaysRemaining: Math.min(maxCareStreakGraceDays, normalizeCount(state?.graceDaysRemaining)),
      maxGraceDays: maxCareStreakGraceDays,
      lastCompletedDate: normalizeDateKey(state?.lastCompletedDate),
    };
  }

  private async recordDailyMilestone(stateKey: string, reaction: BuddyMilestoneReaction): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const today = getLocalDateKey();
    if (this.globalState.get<string>(stateKey) === today) {
      return;
    }

    await this.globalState.update(stateKey, today);
    this.emitReaction(reaction);
  }

  private emitReaction(reaction: BuddyMilestoneReaction): void {
    this.onReaction(reaction);
    if (reaction.xpBonus > 0) {
      this.onXpAward({ source: 'milestone', amount: reaction.xpBonus });
    }
  }

  private getCompletedLevelMilestones(): number[] {
    const completedMilestones = this.globalState.get<number[]>(completedLevelMilestonesKey, []);
    return completedMilestones.filter((level) => buddyLevelMilestones.some((milestone) => milestone === level));
  }

  private isEnabled(): boolean {
    return vscode.workspace.getConfiguration(configurationSection).get<boolean>('enabled', true);
  }

  private getFocusedSessionMs(): number {
    const minutes = vscode.workspace
      .getConfiguration(configurationSection)
      .get<number>('focusedSessionMinutes', defaultFocusedSessionMinutes);
    return Math.max(1, minutes) * 60 * 1000;
  }

  private getXpBonus(): number {
    const amount = vscode.workspace
      .getConfiguration(configurationSection)
      .get<number>('xpBonus', defaultMilestoneXpBonus);
    return Math.max(0, Math.floor(amount));
  }

  private clearFocusedSessionTimer(): void {
    if (this.focusedSessionTimer) {
      clearTimeout(this.focusedSessionTimer);
      this.focusedSessionTimer = undefined;
    }
  }
}

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function normalizeDateKey(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function getCalendarDayDistance(fromDateKey: string, toDateKey: string): number {
  const from = getDateKeyUtcTime(fromDateKey);
  const to = getDateKeyUtcTime(toDateKey);
  if (from === undefined || to === undefined) {
    return 0;
  }

  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}

function getDateKeyUtcTime(dateKey: string): number | undefined {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) {
    return undefined;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}
