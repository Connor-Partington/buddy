import * as vscode from 'vscode';

import { BuddyActivityController } from './activityController';
import { BuddyAttentionManager } from './attentionManager';
import { BuddyDailyQuestManager } from './dailyQuestManager';
import { BuddyDemoController } from './demoController';
import { BuddyGitActivityController } from './gitActivityController';
import { BuddyHealthManager, maxBuddyGoldHearts, maxBuddyHearts } from './healthManager';
import { BuddyMilestoneManager, buddyLevelMilestones, type BuddyMilestoneReaction } from './milestoneManager';
import { Provider, type BuddySize, type FoodRequest, type FoodType, type LevelUpCardCapture } from './Provider';
import { BuddyStateManager, buddyStates } from './stateManager';
import { BuddyXpManager, defaultBuddyXpMultiplier, type BuddyXpAward } from './xpManager';

const testXpAwardAmount = 25;
const feedBuddyXpAwardAmount = 5;
const xpMultiplierOptions = [0.5, 1, 1.5, 2, 3];
const coffeeDropCommitInterval = 5;
const coffeeDropCommitCountKey = 'buddyCoffeeDrop.commitCount';
const autoFoodSpawnDebounceMs = 1000;
const autoSandwichCooldownMs = 6 * 60 * 60 * 1000;
const autoSandwichProductiveActionThreshold = 10;
const autoSandwichLastDropAtKey = 'buddyAutoRewards.sandwichLastDropAt';
const autoSandwichProductiveActionCountKey = 'buddyAutoRewards.sandwichProductiveActionCount';
const autoCakeLastDropDateKey = 'buddyAutoRewards.cakeLastDropDate';
const autoCakeFirstPushCompletedKey = 'buddyAutoRewards.cakeFirstPushCompleted';
const introHasPlayedKey = 'buddyIntro.hasPlayed';
const buddySizeKey = 'buddySize';
const careStreakCakeDelayMs = 3500;
const rareCakeChance = 0.15;
const pushCakeChance = 0.2;
const firstCommitCakeChance = 0.2;
const demoStepMs = 1200;
const demoStateStepMs: Partial<Record<(typeof buddyStates)[number], number>> = {
  typing: 2200,
  thinking: 2200,
  sleeping: 2200,
  happy: 1400,
};
const demoHeartLossMs = 5600;
const demoCookieMs = 6000;
const demoReturnToCenterMs = 2200;
const demoBreakPromptMs = 5000;
const demoDeathHeartLossMs = 5600;
const demoDeathBeforeReviveMs = 6000;
const demoTriggerFileName = '.buddy-demo-trigger';
const debugDashboardViewType = 'buddy.debugDashboard';

export async function activate(context: vscode.ExtensionContext) {
  let buddySize = normalizeBuddySize(context.globalState.get<string>('buddySize', 'default'));
  let coffeeDropCommitCount = normalizeCoffeeDropCommitCount(
    context.globalState.get<number>(coffeeDropCommitCountKey, 0),
  );
  let autoSandwichProductiveActionCount = normalizeCount(
    context.globalState.get<number>(autoSandwichProductiveActionCountKey, 0),
  );
  let isDemoRunning = false;
  let lastAutoFoodRequestedAt = 0;
  let debugDashboardPanel: vscode.WebviewPanel | undefined;
  const debugOutput = vscode.window.createOutputChannel('Buddy Debug');
  const provider = new Provider(context.extensionUri, !context.globalState.get<boolean>(introHasPlayedKey, false));
  const stateManager = new BuddyStateManager();
  const healthManager = new BuddyHealthManager(context.globalState);
  const xpManager = new BuddyXpManager(context.globalState);
  const attentionManager = new BuddyAttentionManager(context.globalState);
  const dailyQuestManager = new BuddyDailyQuestManager(
    context.globalState,
    (reward) => {
      void provider.showDailyQuestReward(reward);
    },
    (award) => {
      void xpManager.awardXp(award);
    },
  );
  const milestoneManager = new BuddyMilestoneManager(
    context.globalState,
    (reaction) => {
      void provider.showMilestoneReaction(reaction);
      void handleMilestoneReaction(reaction);
    },
    (award) => {
      void xpManager.awardXp(award);
    },
  );
  const activityController = new BuddyActivityController(stateManager, (award) => {
    void handleActivityAward(award);
  });
  const gitActivityController = await BuddyGitActivityController.create((award) => {
    void handleGitCommitAward(award);
  });
  const demoController = new BuddyDemoController(stateManager);
  const stateSubscription = stateManager.onDidChangeState((state) => {
    provider.setState(state);
  });
  const feedCookieSubscription = provider.onDidFeedCookie((food) => {
    if (healthManager.health.isDead) {
      provider.setHealth(healthManager.health);
      return;
    }

    void handleFoodEaten(food);
  });
  const foodReachedSubscription = provider.onDidReachFood(async () => {
    if (healthManager.health.isDead) {
      provider.setHealth(healthManager.health);
      provider.refuseFood();
      return;
    }

    if (!healthManager.canEatFood()) {
      provider.refuseFood();
      return;
    }

    await healthManager.recordFoodEaten();
    provider.acceptFood();
  });
  const foodRequestSubscription = provider.onDidRequestFood((request) => {
    void requestFoodSpawn(request);
  });
  const careActionSubscription = provider.onDidCareAction((action) => {
    void attentionManager.recordCareAction();
    if (action === 'love' || action === 'chase') {
      void milestoneManager.recordGaveBuddyAttention();
    }
  });
  const introSubscription = provider.onDidPlayIntro(() => {
    void context.globalState.update(introHasPlayedKey, true);
  });
  const levelUpCardSubscription = provider.onDidCaptureLevelUpCard((capture) => {
    void saveLevelUpCard(context, capture).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(`Buddy could not save the level-up card: ${message}`);
    });
  });
  const levelUpCardFailureSubscription = provider.onDidFailLevelUpCardCapture((failure) => {
    console.warn(`Buddy failed to capture level ${failure.level} card: ${failure.error}`);
  });
  const healthSubscription = healthManager.onDidChangeHealth((health) => {
    provider.setHealth(health);
    appendDebugLine('health changed', health);
    if (health.isDead) {
      void xpManager.clearCoffeeXpBoost();
      void xpManager.deductDeathPenalty().then((change) => {
        if (!change) {
          vscode.window.showWarningMessage('Buddy is dead.');
          return;
        }

        const levelText = change.leveledDown ? ` and dropped to level ${change.xp.level}` : '';
        vscode.window.showWarningMessage(`Buddy is dead. Lost ${change.award.amount} XP${levelText}.`);
      });
    }
  });
  const xpSubscription = xpManager.onDidChangeXp((change) => {
    provider.setXp(change.xp);
    appendDebugLine('xp changed', change);
    if (change.leveledUp) {
      vscode.window.showInformationMessage(`Buddy reached level ${change.xp.level}.`);
      void milestoneManager.recordLevel(change.xp.level);
      void handleLevelUpReward(change.xp.level);
      void provider.captureLevelUpCard(change.xp.level).then((didPost) => {
        if (!didPost) {
          vscode.window.showInformationMessage('Open the Buddy sidebar to save level-up cards.');
        }
      });
    }
  });
  const xpBoostSubscription = xpManager.onDidChangeXpBoost((boost) => {
    provider.setXpBoost(boost);
    appendDebugLine('xp boost changed', boost);
  });
  const attentionSubscription = attentionManager.onDidChangeAttention((attention) => {
    provider.setAttention(attention);
  });
  const dailyQuestSubscription = dailyQuestManager.onDidChangeDailyQuests((dailyQuests) => {
    provider.setDailyQuests(dailyQuests);
  });
  const disposable = vscode.commands.registerCommand('buddy.wakeUp', () => {
    vscode.window.showInformationMessage('Buddy is awake.');
  });
  const stateCommands = buddyStates.map((state) =>
    vscode.commands.registerCommand(`buddy.setState.${state}`, () => {
      stateManager.setState(state);
    }),
  );
  const previewCommand = vscode.commands.registerCommand('buddy.previewAnimations', () => {
    demoController.play();
  });
  const showSidebarCommand = vscode.commands.registerCommand('buddy.showSidebar', async () => {
    await vscode.commands.executeCommand('workbench.view.extension.buddy');
    try {
      await vscode.commands.executeCommand(`${Provider.viewType}.focus`);
    } catch {
      // Older VS Code builds may not expose generated focus commands for every view.
    }
  });
  const toggleSizeCommand = vscode.commands.registerCommand('buddy.toggleSize', () => {
    void setBuddySize(buddySize === 'default' ? 'small' : 'default');
  });
  const showDebugMonitorCommand = vscode.commands.registerCommand('buddy.showDebugMonitor', () => {
    appendDebugSnapshot('manual snapshot');
    showDebugDashboard();
  });
  const openLevelUpGalleryCommand = vscode.commands.registerCommand('buddy.openLevelUpGallery', async () => {
    await openLevelUpGallery(context);
  });
  const spawnCookieCommand = vscode.commands.registerCommand('buddy.spawnCookie', () => {
    void requestFoodSpawn({ food: 'cookie' });
  });
  const spawnCoffeeCommand = vscode.commands.registerCommand('buddy.spawnCoffee', () => {
    void requestFoodSpawn({ food: 'coffee' });
  });
  const spawnSandwichCommand = vscode.commands.registerCommand('buddy.spawnSandwich', () => {
    void requestFoodSpawn({ food: 'sandwich' });
  });
  const spawnCakeCommand = vscode.commands.registerCommand('buddy.spawnCake', () => {
    void requestFoodSpawn({ food: 'cake' });
  });
  const toggleBreakPromptCommand = vscode.commands.registerCommand('buddy.toggleBreakPrompt', () => {
    provider.toggleBreakPrompt();
    void dailyQuestManager.recordBreak();
  });
  const removeHeartCommand = vscode.commands.registerCommand('buddy.removeHeart', async () => {
    await healthManager.loseHeart();
  });
  const addXpCommand = vscode.commands.registerCommand('buddy.addXp', async () => {
    const change = await xpManager.awardXp({ source: 'test', amount: testXpAwardAmount });
    if (change) {
      vscode.window.showInformationMessage(`Buddy gained ${change.award.amount} XP.`);
    } else {
      vscode.window.showInformationMessage('Buddy is already at max level.');
    }
  });
  const resetXpCommand = vscode.commands.registerCommand('buddy.resetXp', async () => {
    const change = await xpManager.resetXp();
    if (change) {
      vscode.window.showInformationMessage('Buddy XP reset to level 1.');
    } else {
      vscode.window.showInformationMessage('Buddy XP is already at level 1.');
    }
  });
  const resetAllStateCommand = vscode.commands.registerCommand('buddy.resetAllState', async () => {
    await resetAllState();
  });
  const setXpMultiplierCommand = vscode.commands.registerCommand('buddy.setXpMultiplier', async () => {
    const selected = await vscode.window.showQuickPick(
      xpMultiplierOptions.map((multiplier) => ({
        label: `${multiplier}x`,
        description: multiplier === defaultBuddyXpMultiplier ? 'Default' : undefined,
        multiplier,
      })),
      {
        placeHolder: `Current XP multiplier: ${xpManager.multiplier}x`,
      },
    );
    if (!selected) {
      return;
    }

    const multiplier = await xpManager.setMultiplier(selected.multiplier);
    vscode.window.showInformationMessage(`Buddy XP multiplier set to ${multiplier}x.`);
  });
  const killCommand = vscode.commands.registerCommand('buddy.kill', async () => {
    if (healthManager.health.isDead) {
      provider.setHealth(healthManager.health);
      vscode.window.showInformationMessage('Buddy is dead.');
      return;
    }

    await healthManager.kill();
  });
  const reviveCommand = vscode.commands.registerCommand('buddy.revive', async () => {
    if (!healthManager.health.isDead) {
      vscode.window.showInformationMessage('Buddy is already alive.');
      return;
    }

    await healthManager.revive();
    stateManager.setState('idle');
    vscode.window.showInformationMessage('Buddy has been revived.');
  });
  const runDemoCommand = vscode.commands.registerCommand('buddy.runDemo', async () => {
    await runFeatureDemo();
  });
  const demoTriggerWatchers = vscode.workspace.workspaceFolders?.map((workspaceFolder) => {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceFolder, demoTriggerFileName),
    );
    const runTriggeredDemo = () => {
      void runFeatureDemo();
    };

    watcher.onDidCreate(runTriggeredDemo);
    watcher.onDidChange(runTriggeredDemo);

    return watcher;
  }) ?? [];
  const uriHandler = vscode.window.registerUriHandler({
    handleUri: async (uri) => {
      if (uri.path === '/demo') {
        await runFeatureDemo();
      }
    },
  });

  async function setBuddySize(size: BuddySize): Promise<void> {
    buddySize = size;
    await context.globalState.update(buddySizeKey, size);
    provider.setBuddySize(size);
    vscode.window.showInformationMessage(`Buddy size set to ${size}.`);
  }

  async function runFeatureDemo(): Promise<void> {
    if (isDemoRunning) {
      vscode.window.showInformationMessage('Buddy feature demo is already running.');
      return;
    }

    isDemoRunning = true;
    await vscode.commands.executeCommand('buddy.showSidebar');
    vscode.window.showInformationMessage('Buddy feature demo started.');

    try {
      if (healthManager.health.isDead || healthManager.health.hearts < maxBuddyHearts) {
        await healthManager.revive();
        await delay(demoStepMs);
      }

      stateManager.setState('idle');
      await delay(demoStepMs);

      for (const state of buddyStates) {
        stateManager.setState(state);
        await delay(demoStateStepMs[state] ?? demoStepMs);
      }

      stateManager.setState('idle');
      await healthManager.loseHeart();
      await delay(demoHeartLossMs);

      void provider.spawnCookie();
      await delay(demoCookieMs);

      provider.returnToCenter();
      await delay(demoReturnToCenterMs);

      provider.toggleBreakPrompt();
      await delay(demoBreakPromptMs);

      stateManager.setState('idle');
      await delay(demoStepMs);

      for (let index = 0; index < 3; index += 1) {
        await xpManager.awardXp({ source: 'test', amount: testXpAwardAmount });
        await delay(Math.round(demoStepMs * 0.8));
      }

      while (healthManager.health.hearts > 1) {
        await healthManager.loseHeart();
        await delay(demoDeathHeartLossMs);
      }

      if (!healthManager.health.isDead) {
        await healthManager.loseHeart();
      }

      await delay(demoDeathBeforeReviveMs);

      await healthManager.revive();
      stateManager.setState('idle');
      await delay(demoStepMs * 2);

      vscode.window.showInformationMessage('Buddy feature demo finished.');
    } finally {
      isDemoRunning = false;
    }
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(Provider.viewType, provider),
    activityController,
    ...(gitActivityController ? [gitActivityController] : []),
    demoController,
    healthManager,
    xpManager,
    attentionManager,
    dailyQuestManager,
    milestoneManager,
    debugOutput,
    stateSubscription,
    feedCookieSubscription,
    foodReachedSubscription,
    foodRequestSubscription,
    careActionSubscription,
    introSubscription,
    levelUpCardSubscription,
    levelUpCardFailureSubscription,
    healthSubscription,
    xpSubscription,
    xpBoostSubscription,
    attentionSubscription,
    dailyQuestSubscription,
    disposable,
    previewCommand,
    showSidebarCommand,
    toggleSizeCommand,
    showDebugMonitorCommand,
    openLevelUpGalleryCommand,
    spawnCookieCommand,
    spawnCoffeeCommand,
    spawnSandwichCommand,
    spawnCakeCommand,
    toggleBreakPromptCommand,
    removeHeartCommand,
    addXpCommand,
    resetXpCommand,
    resetAllStateCommand,
    setXpMultiplierCommand,
    killCommand,
    reviveCommand,
    runDemoCommand,
    ...demoTriggerWatchers,
    uriHandler,
    ...stateCommands,
  );

  healthManager.startHeartLossTimer();
  attentionManager.startAttentionTimer();
  provider.setState(stateManager.state);
  provider.setBuddySize(buddySize);
  provider.setHealth(healthManager.health);
  provider.setXp(xpManager.xp);
  provider.setXpBoost(xpManager.xpBoost);
  provider.setDailyQuests(dailyQuestManager.dailyQuests);
  provider.setAttention(attentionManager.attention);

  async function handleFoodEaten(food: FoodType): Promise<void> {
    await milestoneManager.recordFedBuddy();

    if (food === 'coffee') {
      await xpManager.activateCoffeeXpBoost();
      await milestoneManager.recordCoffeeTime();
      return;
    }

    if (food === 'sandwich') {
      const restoredHeartIndexes = await healthManager.feedSandwich();
      await xpManager.awardXp({ source: 'feed', amount: feedBuddyXpAwardAmount });
      restoredHeartIndexes.forEach((heartIndex) => {
        provider.playHeartFill(heartIndex);
      });
      return;
    }

    if (food === 'cake') {
      const restoredHeartIndex = await healthManager.feedCake();
      await xpManager.awardXp({ source: 'feed', amount: feedBuddyXpAwardAmount });
      if (restoredHeartIndex !== undefined) {
        provider.playHeartFill(restoredHeartIndex);
      }
      return;
    }

    const restoredHeartIndex = await healthManager.feedCookie();
    await xpManager.awardXp({ source: 'feed', amount: feedBuddyXpAwardAmount });
    if (restoredHeartIndex !== undefined) {
      provider.playHeartFill(restoredHeartIndex);
    }
  }

  async function handleActivityAward(award: BuddyXpAward): Promise<void> {
    await xpManager.awardXp(award);

    const didDropRecoveryFood = await tryAutoSandwichReward();

    if (award.source === 'save') {
      await dailyQuestManager.recordSave();
      await milestoneManager.recordSave();
    }

    if (award.source === 'gitPush') {
      await dailyQuestManager.recordGitPush();
      await milestoneManager.recordGitPush();
      if (!didDropRecoveryFood) {
        await tryAutoCakeReward({
          chance: pushCakeChance,
          force: false,
          markFirstPushCompleted: false,
        });
      }
    }
  }

  async function handleGitCommitAward(award: Parameters<BuddyXpManager['awardXp']>[0]): Promise<void> {
    await xpManager.awardXp(award);
    const didDropRecoveryFood = await tryAutoSandwichReward();
    await dailyQuestManager.recordGitCommit();
    await milestoneManager.recordGitCommit();

    coffeeDropCommitCount = normalizeCoffeeDropCommitCount(coffeeDropCommitCount + 1);
    await context.globalState.update(coffeeDropCommitCountKey, coffeeDropCommitCount);

    if (coffeeDropCommitCount === 0 && !didDropRecoveryFood && !wasAutoFoodRecentlyRequested()) {
      await requestFoodSpawn({ food: 'coffee' });
    }
  }

  async function handleMilestoneReaction(reaction: BuddyMilestoneReaction): Promise<void> {
    if (reaction.id === 'firstPush') {
      await tryAutoCakeReward({
        force: true,
        markFirstPushCompleted: true,
      });
      return;
    }

    if (reaction.id === 'firstCommitOfDay') {
      await tryAutoCakeReward({
        chance: firstCommitCakeChance,
        force: false,
      });
      return;
    }

    if (reaction.id === 'careStreak') {
      setTimeout(() => {
        void tryAutoCakeReward({ force: true });
      }, careStreakCakeDelayMs);
      return;
    }

    if (isLevelMilestoneReaction(reaction.id)) {
      await tryAutoCakeReward({ force: true });
    }
  }

  async function handleLevelUpReward(level: number): Promise<void> {
    if (isBuddyLevelMilestone(level)) {
      return;
    }

    await tryAutoCakeReward({
      chance: rareCakeChance,
      force: false,
    });
  }

  async function tryAutoSandwichReward(): Promise<boolean> {
    const health = healthManager.health;
    if (health.isDead || health.hearts !== 1) {
      await resetAutoSandwichProductiveActionCount();
      return false;
    }

    autoSandwichProductiveActionCount = Math.min(
      autoSandwichProductiveActionCount + 1,
      autoSandwichProductiveActionThreshold,
    );
    appendDebugLine('sandwich productive action counted', {
      productiveActionCount: autoSandwichProductiveActionCount,
      threshold: autoSandwichProductiveActionThreshold,
      health,
    });
    if (autoSandwichProductiveActionCount < autoSandwichProductiveActionThreshold) {
      await context.globalState.update(autoSandwichProductiveActionCountKey, autoSandwichProductiveActionCount);
      return false;
    }

    const lastDropAt = normalizeTimestamp(context.globalState.get<number>(autoSandwichLastDropAtKey, 0));
    if (Date.now() - lastDropAt < autoSandwichCooldownMs || wasAutoFoodRecentlyRequested()) {
      appendDebugLine('sandwich drop delayed', {
        cooldownRemainingMs: getRemainingMs(lastDropAt, autoSandwichCooldownMs),
        recentAutoFoodRequest: wasAutoFoodRecentlyRequested(),
      });
      await context.globalState.update(
        autoSandwichProductiveActionCountKey,
        autoSandwichProductiveActionCount,
      );
      return false;
    }

    const didRequestFood = await requestFoodSpawn({ food: 'sandwich' });
    if (!didRequestFood) {
      appendDebugLine('sandwich drop failed to post');
      await context.globalState.update(
        autoSandwichProductiveActionCountKey,
        autoSandwichProductiveActionCount,
      );
      return false;
    }

    lastAutoFoodRequestedAt = Date.now();
    await context.globalState.update(autoSandwichLastDropAtKey, lastAutoFoodRequestedAt);
    appendDebugLine('sandwich drop recorded', {
      lastDropAt: formatDebugTimestamp(lastAutoFoodRequestedAt),
    });
    await resetAutoSandwichProductiveActionCount();
    return true;
  }

  async function tryAutoCakeReward(options: {
    chance?: number;
    force: boolean;
    markFirstPushCompleted?: boolean;
  }): Promise<boolean> {
    const health = healthManager.health;
    if (
      health.isDead ||
      health.hearts < maxBuddyHearts ||
      health.goldHearts >= maxBuddyGoldHearts ||
      wasAutoFoodRecentlyRequested()
    ) {
      appendDebugLine('cake drop skipped', {
        health,
        recentAutoFoodRequest: wasAutoFoodRecentlyRequested(),
      });
      return false;
    }

    if (options.markFirstPushCompleted && context.globalState.get<boolean>(autoCakeFirstPushCompletedKey, false)) {
      appendDebugLine('cake drop skipped: first push cake already completed');
      return false;
    }

    const today = getLocalDateKey();
    if (context.globalState.get<string>(autoCakeLastDropDateKey) === today) {
      appendDebugLine('cake drop skipped: already dropped today', { today });
      return false;
    }

    if (!options.force && Math.random() >= (options.chance ?? rareCakeChance)) {
      appendDebugLine('cake drop skipped: chance roll missed', {
        chance: options.chance ?? rareCakeChance,
      });
      return false;
    }

    const didRequestFood = await requestFoodSpawn({ food: 'cake' });
    if (!didRequestFood) {
      appendDebugLine('cake drop failed to post');
      return false;
    }

    lastAutoFoodRequestedAt = Date.now();
    await context.globalState.update(autoCakeLastDropDateKey, today);
    if (options.markFirstPushCompleted) {
      await context.globalState.update(autoCakeFirstPushCompletedKey, true);
    }
    appendDebugLine('cake drop recorded', { today });
    return true;
  }

  function wasAutoFoodRecentlyRequested(): boolean {
    return Date.now() - lastAutoFoodRequestedAt < autoFoodSpawnDebounceMs;
  }

  async function resetAutoSandwichProductiveActionCount(): Promise<void> {
    if (autoSandwichProductiveActionCount === 0) {
      return;
    }

    autoSandwichProductiveActionCount = 0;
    await context.globalState.update(autoSandwichProductiveActionCountKey, 0);
    appendDebugLine('sandwich productive action count reset');
  }

  async function resetAllState(): Promise<void> {
    const resetAction = 'Reset Buddy';
    const selected = await vscode.window.showWarningMessage(
      'Reset all Buddy stats and local state for testing? This clears health, XP, attention, milestones, auto-reward counters, size, and intro state.',
      { modal: true },
      resetAction,
    );
    if (selected !== resetAction) {
      return;
    }

    coffeeDropCommitCount = 0;
    autoSandwichProductiveActionCount = 0;
    lastAutoFoodRequestedAt = 0;
    buddySize = 'default';

    await Promise.all([
      context.globalState.update(coffeeDropCommitCountKey, undefined),
      context.globalState.update(autoSandwichLastDropAtKey, undefined),
      context.globalState.update(autoSandwichProductiveActionCountKey, undefined),
      context.globalState.update(autoCakeLastDropDateKey, undefined),
      context.globalState.update(autoCakeFirstPushCompletedKey, undefined),
      context.globalState.update(introHasPlayedKey, undefined),
      context.globalState.update(buddySizeKey, undefined),
      healthManager.reset(),
      xpManager.reset(),
      attentionManager.reset(),
      dailyQuestManager.reset(),
      milestoneManager.reset(),
    ]);

    stateManager.setState('idle');
    provider.setBuddySize(buddySize);
    provider.setHealth(healthManager.health);
    provider.setXp(xpManager.xp);
    provider.setXpBoost(xpManager.xpBoost);
    provider.setDailyQuests(dailyQuestManager.dailyQuests);
    provider.setAttention(attentionManager.attention);
    appendDebugSnapshot('reset all state');
    showDebugDashboard();
    vscode.window.showInformationMessage('Buddy state reset for testing.');
  }

  function appendDebugSnapshot(label: string): void {
    appendDebugLine(label, getDebugSnapshot());
    postDebugDashboardSnapshot();
  }

  function getDebugSnapshot(): Record<string, unknown> {
    const sandwichLastDropAt = normalizeTimestamp(context.globalState.get<number>(autoSandwichLastDropAtKey, 0));
    const sandwichCooldownRemainingMs = getRemainingMs(sandwichLastDropAt, autoSandwichCooldownMs);

    return {
      updatedAt: new Date().toISOString(),
      health: healthManager.health,
      xp: xpManager.xp,
      xpBoost: xpManager.xpBoost,
      attention: attentionManager.attention,
      dailyQuests: dailyQuestManager.dailyQuests,
      canEatFood: healthManager.canEatFood(),
      coffeeDropCommitCount,
      autoSandwich: {
        productiveActionCount: autoSandwichProductiveActionCount,
        persistedProductiveActionCount: normalizeCount(
          context.globalState.get<number>(autoSandwichProductiveActionCountKey, 0),
        ),
        threshold: autoSandwichProductiveActionThreshold,
        lastDropAt: formatDebugTimestamp(sandwichLastDropAt),
        cooldownRemainingMs: sandwichCooldownRemainingMs,
        cooldownRemaining: formatDurationMs(sandwichCooldownRemainingMs),
      },
      autoCake: {
        lastDropDate: context.globalState.get<string>(autoCakeLastDropDateKey, ''),
        firstPushCompleted: context.globalState.get<boolean>(autoCakeFirstPushCompletedKey, false),
      },
      lastAutoFoodRequestedAt: formatDebugTimestamp(lastAutoFoodRequestedAt),
      buddySize,
    };
  }

  function showDebugDashboard(): void {
    if (!debugDashboardPanel) {
      debugDashboardPanel = vscode.window.createWebviewPanel(
        debugDashboardViewType,
        'Buddy Debug Dashboard',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );
      debugDashboardPanel.webview.html = getDebugDashboardHtml();
      debugDashboardPanel.webview.onDidReceiveMessage((message: { command?: string }) => {
        if (message.command === 'refresh') {
          appendDebugSnapshot('dashboard refresh');
          return;
        }

        if (message.command === 'resetAllState') {
          void resetAllState();
          return;
        }

        if (message.command === 'openRawLog') {
          appendDebugSnapshot('raw log opened from dashboard');
          debugOutput.show(true);
        }
      });
      debugDashboardPanel.onDidDispose(() => {
        debugDashboardPanel = undefined;
      });
    } else {
      debugDashboardPanel.reveal(vscode.ViewColumn.Beside);
    }

    postDebugDashboardSnapshot();
  }

  function postDebugDashboardSnapshot(): void {
    void debugDashboardPanel?.webview.postMessage({
      type: 'snapshot',
      snapshot: getDebugSnapshot(),
    });
  }

  function appendDebugLine(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    debugOutput.appendLine(`[${timestamp}] ${message}`);
    if (data !== undefined) {
      debugOutput.appendLine(JSON.stringify(data, null, 2));
    }
    postDebugDashboardSnapshot();
  }

  function getDebugDashboardHtml(): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Buddy Debug Dashboard</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: light dark;
    }

    body {
      margin: 0;
      padding: 20px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 650;
    }

    h2 {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 650;
      color: var(--vscode-sideBarTitle-foreground);
    }

    button {
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      padding: 6px 10px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .timestamp {
      margin-top: 4px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }

    .card {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 14px;
      background: var(--vscode-sideBar-background);
    }

    .metric {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding: 5px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .metric:last-child {
      border-bottom: 0;
    }

    .label {
      color: var(--vscode-descriptionForeground);
    }

    .value {
      text-align: right;
      font-family: var(--vscode-editor-font-family);
      overflow-wrap: anywhere;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 2px 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-size: 12px;
    }

    .bar {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--vscode-progressBar-background);
      margin-top: 8px;
    }

    .bar span {
      display: block;
      height: 100%;
      width: 0%;
      background: var(--vscode-charts-green);
    }

    pre {
      margin: 12px 0 0;
      max-height: 360px;
      overflow: auto;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 12px;
      background: var(--vscode-textCodeBlock-background);
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Buddy Debug Dashboard</h1>
      <div class="timestamp" id="updatedAt">Waiting for state...</div>
    </div>
    <div class="actions">
      <button id="refresh">Refresh</button>
      <button class="secondary" id="rawLog">Raw Log</button>
      <button class="secondary" id="reset">Reset All State</button>
    </div>
  </header>

  <main>
    <div class="grid" id="cards"></div>
    <pre id="raw"></pre>
  </main>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const cards = document.getElementById('cards');
    const raw = document.getElementById('raw');
    const updatedAt = document.getElementById('updatedAt');

    document.getElementById('refresh').addEventListener('click', () => {
      vscode.postMessage({ command: 'refresh' });
    });

    document.getElementById('rawLog').addEventListener('click', () => {
      vscode.postMessage({ command: 'openRawLog' });
    });

    document.getElementById('reset').addEventListener('click', () => {
      vscode.postMessage({ command: 'resetAllState' });
    });

    window.addEventListener('message', (event) => {
      if (event.data?.type !== 'snapshot') {
        return;
      }

      render(event.data.snapshot);
    });

    vscode.postMessage({ command: 'refresh' });

    function render(snapshot) {
      updatedAt.textContent = snapshot.updatedAt ? 'Updated ' + snapshot.updatedAt : 'Waiting for state...';
      cards.innerHTML = [
        card('Health', [
          ['Status', snapshot.health?.isDead ? badge('Dead') : badge('Alive')],
          ['Red hearts', snapshot.health?.hearts],
          ['Gold hearts', snapshot.health?.goldHearts],
          ['Alive days', snapshot.health?.aliveDays],
          ['Can eat food', yesNo(snapshot.canEatFood)],
        ]),
        card('XP', [
          ['Level', snapshot.xp?.level],
          ['Total XP', snapshot.xp?.totalXp],
          ['Current level XP', snapshot.xp?.currentLevelXp + ' / ' + snapshot.xp?.nextLevelXp],
          ['Progress', percent(snapshot.xp?.progress)],
          ['Max level', yesNo(snapshot.xp?.isMaxLevel)],
        ], snapshot.xp?.progress),
        card('Attention', [
          ['Value', snapshot.attention?.value],
          ['Progress', percent(snapshot.attention?.progress)],
          ['Low', yesNo(snapshot.attention?.isLow)],
          ['Next decay', snapshot.attention?.nextDecayAt],
        ], snapshot.attention?.progress),
        card('Daily Quests', [
          ['Date', snapshot.dailyQuests?.date],
          ['Completed', snapshot.dailyQuests?.completedCount + ' / ' + snapshot.dailyQuests?.totalCount],
          ...((snapshot.dailyQuests?.quests || []).map((quest) => [
            quest.label,
            quest.progress + ' / ' + quest.target + (quest.completed ? ' complete' : ''),
          ])),
        ], safeRatio(snapshot.dailyQuests?.completedCount, snapshot.dailyQuests?.totalCount)),
        card('Auto Sandwich', [
          ['Actions', snapshot.autoSandwich?.productiveActionCount + ' / ' + snapshot.autoSandwich?.threshold],
          ['Persisted actions', snapshot.autoSandwich?.persistedProductiveActionCount],
          ['Last drop', snapshot.autoSandwich?.lastDropAt || 'Never'],
          ['Cooldown', snapshot.autoSandwich?.cooldownRemaining || 'ready'],
        ], safeRatio(snapshot.autoSandwich?.productiveActionCount, snapshot.autoSandwich?.threshold)),
        card('Auto Cake', [
          ['Last drop date', snapshot.autoCake?.lastDropDate || 'Never'],
          ['First push cake', yesNo(snapshot.autoCake?.firstPushCompleted)],
        ]),
        card('Other State', [
          ['Coffee commit count', snapshot.coffeeDropCommitCount],
          ['Buddy size', snapshot.buddySize],
          ['Last auto food request', snapshot.lastAutoFoodRequestedAt || 'Never'],
          ['XP boost active', yesNo(snapshot.xpBoost?.isActive)],
        ]),
      ].join('');
      applyProgressBars();
      raw.textContent = JSON.stringify(snapshot, null, 2);
    }

    function card(title, rows, progress) {
      return '<section class="card"><h2>' + escapeHtml(title) + '</h2>' +
        rows.map(([label, value]) => '<div class="metric"><span class="label">' + escapeHtml(label) + '</span><span class="value">' + valueToHtml(value) + '</span></div>').join('') +
        (typeof progress === 'number' ? '<div class="bar"><span data-progress="' + Math.max(0, Math.min(100, Math.round(progress * 100))) + '"></span></div>' : '') +
        '</section>';
    }

    function badge(value) {
      return '<span class="status">' + escapeHtml(value) + '</span>';
    }

    function yesNo(value) {
      return value ? 'Yes' : 'No';
    }

    function percent(value) {
      return typeof value === 'number' ? Math.round(value * 100) + '%' : '';
    }

    function safeRatio(value, total) {
      return total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
    }

    function valueToHtml(value) {
      if (typeof value === 'string' && value.startsWith('<span')) {
        return value;
      }

      return escapeHtml(value ?? '');
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function applyProgressBars() {
      document.querySelectorAll('[data-progress]').forEach((element) => {
        element.style.width = element.dataset.progress + '%';
      });
    }
  </script>
</body>
</html>`;
  }

  async function requestFoodSpawn(request: FoodRequest): Promise<boolean> {
    if (healthManager.health.isDead) {
      provider.setHealth(healthManager.health);
      provider.showFoodRefusal();
      appendDebugLine('food spawn blocked: dead', request);
      return false;
    }

    if (!healthManager.canEatFood()) {
      provider.showFoodRefusal();
      appendDebugLine('food spawn blocked: overfeeding guard', request);
      return false;
    }

    const didPost = await provider.spawnFood(request.food, request.targetX);
    appendDebugLine(didPost ? 'food spawn requested' : 'food spawn not posted', request);
    return didPost;
  }
}

export function deactivate() {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeCoffeeDropCommitCount(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value)) % coffeeDropCommitInterval;
}

function normalizeTimestamp(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function normalizeCount(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function getRemainingMs(startedAt: number, durationMs: number): number {
  if (startedAt <= 0) {
    return 0;
  }

  return Math.max(0, startedAt + durationMs - Date.now());
}

function formatDebugTimestamp(timestamp: number): string {
  if (timestamp <= 0) {
    return '';
  }

  return new Date(timestamp).toISOString();
}

function formatDurationMs(durationMs: number): string {
  if (durationMs <= 0) {
    return 'ready';
  }

  const totalSeconds = Math.ceil(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [
    hours > 0 ? `${hours}h` : '',
    minutes > 0 ? `${minutes}m` : '',
    seconds > 0 && hours === 0 ? `${seconds}s` : '',
  ].filter(Boolean);

  return parts.join(' ');
}

function getNonce(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let index = 0; index < 32; index += 1) {
    nonce += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return nonce;
}

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isBuddyLevelMilestone(level: number): boolean {
  return buddyLevelMilestones.some((milestone) => milestone === level);
}

function isLevelMilestoneReaction(id: BuddyMilestoneReaction['id']): boolean {
  return buddyLevelMilestones.some((milestone) => id === `level${milestone}`);
}

async function saveLevelUpCard(context: vscode.ExtensionContext, capture: LevelUpCardCapture): Promise<void> {
  const base64 = capture.dataUri.replace(/^data:image\/png;base64,/, '');
  if (!base64 || base64 === capture.dataUri) {
    throw new Error('Buddy level-up card capture did not contain PNG data.');
  }

  const cardsDirectory = getLevelUpCardsDirectory(context);
  await vscode.workspace.fs.createDirectory(cardsDirectory);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileUri = vscode.Uri.joinPath(cardsDirectory, `buddy-level-${capture.level}-${timestamp}.png`);
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(base64, 'base64'));

  const openAction = 'Open Image';
  const selected = await vscode.window.showInformationMessage(`Buddy level ${capture.level} card saved.`, openAction);
  if (selected === openAction) {
    await vscode.commands.executeCommand('vscode.open', fileUri);
  }
}

async function openLevelUpGallery(context: vscode.ExtensionContext): Promise<void> {
  const cardsDirectory = getLevelUpCardsDirectory(context);
  let entries: [string, vscode.FileType][];

  try {
    entries = await vscode.workspace.fs.readDirectory(cardsDirectory);
  } catch {
    vscode.window.showInformationMessage('Buddy has not saved any level-up cards yet.');
    return;
  }

  const cards = entries
    .filter(([name, type]) => type === vscode.FileType.File && /^buddy-level-\d+-.*\.png$/u.test(name))
    .map(([name]) => {
      const level = name.match(/^buddy-level-(\d+)-/u)?.[1] ?? '?';
      const savedAt = name
        .replace(/^buddy-level-\d+-/u, '')
        .replace(/\.png$/u, '');
      const timestamp = savedAt.replace(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-\d+Z$/u,
        '$1-$2-$3 $4:$5:$6 UTC',
      );
      return {
        label: `Level ${level}`,
        description: timestamp,
        fileUri: vscode.Uri.joinPath(cardsDirectory, name),
      };
    })
    .sort((first, second) => second.description.localeCompare(first.description));

  if (cards.length === 0) {
    vscode.window.showInformationMessage('Buddy has not saved any level-up cards yet.');
    return;
  }

  const selected = await vscode.window.showQuickPick(cards, {
    placeHolder: 'Open a saved Buddy level-up card',
  });

  if (selected) {
    await vscode.commands.executeCommand('vscode.open', selected.fileUri);
  }
}

function getLevelUpCardsDirectory(context: vscode.ExtensionContext): vscode.Uri {
  return vscode.Uri.joinPath(context.globalStorageUri, 'level-up-cards');
}

function normalizeBuddySize(size: string | undefined): BuddySize {
  return size === 'small' ? 'small' : 'default';
}
