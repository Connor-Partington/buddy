import * as vscode from 'vscode';

import { BuddyXpAward } from './xpManager';

export type BuddyDailyQuestId = 'saveFiles' | 'makeCommit' | 'takeBreak' | 'pushWork';

export type BuddyDailyQuest = {
  id: BuddyDailyQuestId;
  label: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardXp: number;
};

export type BuddyDailyQuests = {
  date: string;
  completedCount: number;
  totalCount: number;
  quests: BuddyDailyQuest[];
};

export type BuddyDailyQuestReward = {
  id: BuddyDailyQuestId;
  label: string;
  message: string;
  xpBonus: number;
};

type StoredDailyQuestState = {
  date?: string;
  progress?: Partial<Record<BuddyDailyQuestId, number>>;
  completed?: BuddyDailyQuestId[];
};

const dailyQuestStateKey = 'buddyDailyQuests.state';
const defaultDailyQuestRewardXp = 10;
const questDefinitions: Array<Omit<BuddyDailyQuest, 'progress' | 'completed'>> = [
  {
    id: 'saveFiles',
    label: 'Save 10 files',
    target: 10,
    rewardXp: defaultDailyQuestRewardXp,
  },
  {
    id: 'makeCommit',
    label: 'Make 1 commit',
    target: 1,
    rewardXp: defaultDailyQuestRewardXp,
  },
  {
    id: 'takeBreak',
    label: 'Take a break',
    target: 1,
    rewardXp: defaultDailyQuestRewardXp,
  },
  {
    id: 'pushWork',
    label: "Push today's work",
    target: 1,
    rewardXp: defaultDailyQuestRewardXp,
  },
];

export class BuddyDailyQuestManager implements vscode.Disposable {
  private state: StoredDailyQuestState;
  private readonly onDidChangeDailyQuestsEmitter = new vscode.EventEmitter<BuddyDailyQuests>();
  public readonly onDidChangeDailyQuests = this.onDidChangeDailyQuestsEmitter.event;

  public constructor(
    private readonly globalState: vscode.Memento,
    private readonly onReward: (reward: BuddyDailyQuestReward) => void,
    private readonly onXpAward: (award: BuddyXpAward) => void,
  ) {
    this.state = this.normalizeState(globalState.get<StoredDailyQuestState>(dailyQuestStateKey));
  }

  public get dailyQuests(): BuddyDailyQuests {
    this.ensureToday();
    return this.toDailyQuests();
  }

  public async recordSave(): Promise<void> {
    await this.recordProgress('saveFiles', 1);
  }

  public async recordGitCommit(): Promise<void> {
    await this.recordProgress('makeCommit', 1);
  }

  public async recordGitPush(): Promise<void> {
    await this.recordProgress('pushWork', 1);
  }

  public async recordBreak(): Promise<void> {
    await this.recordProgress('takeBreak', 1);
  }

  public async reset(): Promise<void> {
    this.state = this.createState(getLocalDateKey());
    await this.globalState.update(dailyQuestStateKey, undefined);
    this.emitChange();
  }

  public dispose(): void {
    this.onDidChangeDailyQuestsEmitter.dispose();
  }

  private async recordProgress(id: BuddyDailyQuestId, amount: number): Promise<void> {
    this.ensureToday();

    const definition = getQuestDefinition(id);
    if (!definition || this.isCompleted(id)) {
      return;
    }

    const progress = this.state.progress ?? {};
    const nextProgress = Math.min(definition.target, normalizeCount(progress[id]) + amount);
    progress[id] = nextProgress;
    this.state.progress = progress;

    if (nextProgress >= definition.target) {
      this.state.completed = [...new Set([...(this.state.completed ?? []), id])];
    }

    await this.persist();
    this.emitChange();

    if (nextProgress >= definition.target) {
      this.emitReward({
        id,
        label: definition.label,
        message: 'DAILY QUEST COMPLETE',
        xpBonus: definition.rewardXp,
      });
    }
  }

  private emitReward(reward: BuddyDailyQuestReward): void {
    this.onReward(reward);
    if (reward.xpBonus > 0) {
      this.onXpAward({ source: 'dailyQuest', amount: reward.xpBonus });
    }
  }

  private emitChange(): void {
    this.onDidChangeDailyQuestsEmitter.fire(this.toDailyQuests());
  }

  private async persist(): Promise<void> {
    await this.globalState.update(dailyQuestStateKey, this.state);
  }

  private ensureToday(): void {
    const today = getLocalDateKey();
    if (this.state.date === today) {
      return;
    }

    this.state = this.createState(today);
    void this.persist();
    this.emitChange();
  }

  private toDailyQuests(): BuddyDailyQuests {
    const progress = this.state.progress ?? {};
    const completed = new Set(this.state.completed ?? []);
    const quests = questDefinitions.map((definition) => {
      const questProgress = Math.min(definition.target, normalizeCount(progress[definition.id]));
      const isCompleted = completed.has(definition.id) || questProgress >= definition.target;

      return {
        ...definition,
        progress: questProgress,
        completed: isCompleted,
      };
    });

    return {
      date: this.state.date ?? getLocalDateKey(),
      completedCount: quests.filter((quest) => quest.completed).length,
      totalCount: quests.length,
      quests,
    };
  }

  private isCompleted(id: BuddyDailyQuestId): boolean {
    return this.toDailyQuests().quests.some((quest) => quest.id === id && quest.completed);
  }

  private normalizeState(state: StoredDailyQuestState | undefined): StoredDailyQuestState {
    const today = getLocalDateKey();
    if (!state || state.date !== today) {
      return this.createState(today);
    }

    const completed = (state.completed ?? []).filter(isDailyQuestId);
    const progress = Object.fromEntries(
      questDefinitions.map((definition) => [
        definition.id,
        Math.min(definition.target, normalizeCount(state.progress?.[definition.id])),
      ]),
    ) as Record<BuddyDailyQuestId, number>;

    return {
      date: today,
      progress,
      completed,
    };
  }

  private createState(date: string): StoredDailyQuestState {
    return {
      date,
      progress: {},
      completed: [],
    };
  }
}

function getQuestDefinition(id: BuddyDailyQuestId): Omit<BuddyDailyQuest, 'progress' | 'completed'> | undefined {
  return questDefinitions.find((quest) => quest.id === id);
}

function isDailyQuestId(value: string): value is BuddyDailyQuestId {
  return questDefinitions.some((quest) => quest.id === value);
}

function normalizeCount(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
