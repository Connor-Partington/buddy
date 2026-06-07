import * as vscode from 'vscode';

import { BuddyActivityController } from './activityController';
import { BuddyAttentionManager } from './attentionManager';
import { BuddyDemoController } from './demoController';
import { BuddyGitActivityController } from './gitActivityController';
import { BuddyHealthManager, maxBuddyHearts } from './healthManager';
import { Provider, type BuddySize, type FoodType, type LevelUpCardCapture } from './Provider';
import { BuddyStateManager, buddyStates } from './stateManager';
import { BuddyXpManager, defaultBuddyXpMultiplier } from './xpManager';

const testXpAwardAmount = 25;
const feedBuddyXpAwardAmount = 5;
const xpMultiplierOptions = [0.5, 1, 1.5, 2, 3];
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

export async function activate(context: vscode.ExtensionContext) {
  let buddySize = normalizeBuddySize(context.globalState.get<string>('buddySize', 'default'));
  let isDemoRunning = false;
  const provider = new Provider(context.extensionUri, !context.globalState.get<boolean>('buddyIntro.hasPlayed', false));
  const stateManager = new BuddyStateManager();
  const healthManager = new BuddyHealthManager(context.globalState);
  const xpManager = new BuddyXpManager(context.globalState);
  const attentionManager = new BuddyAttentionManager(context.globalState);
  const activityController = new BuddyActivityController(stateManager, (award) => {
    void xpManager.awardXp(award);
  });
  const gitActivityController = await BuddyGitActivityController.create((award) => {
    void xpManager.awardXp(award);
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
  const careActionSubscription = provider.onDidCareAction(() => {
    void attentionManager.recordCareAction();
  });
  const introSubscription = provider.onDidPlayIntro(() => {
    void context.globalState.update('buddyIntro.hasPlayed', true);
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
    if (change.leveledUp) {
      vscode.window.showInformationMessage(`Buddy reached level ${change.xp.level}.`);
      void provider.captureLevelUpCard(change.xp.level).then((didPost) => {
        if (!didPost) {
          vscode.window.showInformationMessage('Open the Buddy sidebar to save level-up cards.');
        }
      });
    }
  });
  const xpBoostSubscription = xpManager.onDidChangeXpBoost((boost) => {
    provider.setXpBoost(boost);
  });
  const attentionSubscription = attentionManager.onDidChangeAttention((attention) => {
    provider.setAttention(attention);
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
  const spawnCookieCommand = vscode.commands.registerCommand('buddy.spawnCookie', () => {
    provider.spawnCookie();
  });
  const spawnCoffeeCommand = vscode.commands.registerCommand('buddy.spawnCoffee', () => {
    provider.spawnFood('coffee');
  });
  const spawnSandwichCommand = vscode.commands.registerCommand('buddy.spawnSandwich', () => {
    provider.spawnFood('sandwich');
  });
  const spawnCakeCommand = vscode.commands.registerCommand('buddy.spawnCake', () => {
    provider.spawnFood('cake');
  });
  const toggleBreakPromptCommand = vscode.commands.registerCommand('buddy.toggleBreakPrompt', () => {
    provider.toggleBreakPrompt();
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
    await context.globalState.update('buddySize', size);
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

      provider.spawnCookie();
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
    stateSubscription,
    feedCookieSubscription,
    careActionSubscription,
    introSubscription,
    levelUpCardSubscription,
    levelUpCardFailureSubscription,
    healthSubscription,
    xpSubscription,
    xpBoostSubscription,
    attentionSubscription,
    disposable,
    previewCommand,
    showSidebarCommand,
    toggleSizeCommand,
    spawnCookieCommand,
    spawnCoffeeCommand,
    spawnSandwichCommand,
    spawnCakeCommand,
    toggleBreakPromptCommand,
    removeHeartCommand,
    addXpCommand,
    resetXpCommand,
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
  provider.setAttention(attentionManager.attention);

  async function handleFoodEaten(food: FoodType): Promise<void> {
    if (food === 'coffee') {
      await xpManager.activateCoffeeXpBoost();
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
}

export function deactivate() {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function saveLevelUpCard(context: vscode.ExtensionContext, capture: LevelUpCardCapture): Promise<void> {
  const base64 = capture.dataUri.replace(/^data:image\/png;base64,/, '');
  if (!base64 || base64 === capture.dataUri) {
    throw new Error('Buddy level-up card capture did not contain PNG data.');
  }

  const cardsDirectory = vscode.Uri.joinPath(context.globalStorageUri, 'level-up-cards');
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

function normalizeBuddySize(size: string | undefined): BuddySize {
  return size === 'small' ? 'small' : 'default';
}
