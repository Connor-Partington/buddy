import * as vscode from 'vscode';

import { BuddyActivityController } from './activityController';
import { BuddyDemoController } from './demoController';
import { BuddyGitActivityController } from './gitActivityController';
import { BuddyHealthManager } from './healthManager';
import { Provider, type BuddySize, type LevelUpCardCapture } from './Provider';
import { BuddyStateManager, buddyStates } from './stateManager';
import { BuddyXpManager, defaultBuddyXpMultiplier } from './xpManager';

const testXpAwardAmount = 25;
const feedBuddyXpAwardAmount = 5;
const xpMultiplierOptions = [0.5, 1, 1.5, 2, 3];

export async function activate(context: vscode.ExtensionContext) {
  let buddySize = normalizeBuddySize(context.globalState.get<string>('buddySize', 'default'));
  const provider = new Provider(context.extensionUri, !context.globalState.get<boolean>('buddyIntro.hasPlayed', false));
  const stateManager = new BuddyStateManager();
  const healthManager = new BuddyHealthManager(context.globalState);
  const xpManager = new BuddyXpManager(context.globalState);
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
  const feedCookieSubscription = provider.onDidFeedCookie(() => {
    if (healthManager.health.isDead) {
      provider.setHealth(healthManager.health);
      return;
    }

    void healthManager.feedCookie().then((restoredHeartIndex) => {
      void xpManager.awardXp({ source: 'feed', amount: feedBuddyXpAwardAmount });
      if (restoredHeartIndex !== undefined) {
        provider.playHeartFill(restoredHeartIndex);
      }
    });
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
  const windowStateSubscription = vscode.window.onDidChangeWindowState((windowState) => {
    if (windowState.focused) {
      healthManager.startActiveHeartLoss();
    } else {
      healthManager.pauseActiveHeartLoss();
    }
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

  async function setBuddySize(size: BuddySize): Promise<void> {
    buddySize = size;
    await context.globalState.update('buddySize', size);
    provider.setBuddySize(size);
    vscode.window.showInformationMessage(`Buddy size set to ${size}.`);
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(Provider.viewType, provider),
    activityController,
    ...(gitActivityController ? [gitActivityController] : []),
    demoController,
    healthManager,
    xpManager,
    stateSubscription,
    feedCookieSubscription,
    introSubscription,
    levelUpCardSubscription,
    levelUpCardFailureSubscription,
    healthSubscription,
    xpSubscription,
    windowStateSubscription,
    disposable,
    previewCommand,
    showSidebarCommand,
    toggleSizeCommand,
    spawnCookieCommand,
    toggleBreakPromptCommand,
    removeHeartCommand,
    addXpCommand,
    resetXpCommand,
    setXpMultiplierCommand,
    killCommand,
    reviveCommand,
    ...stateCommands,
  );

  if (vscode.window.state.focused) {
    healthManager.startActiveHeartLoss();
  }
  provider.setState(stateManager.state);
  provider.setBuddySize(buddySize);
  provider.setHealth(healthManager.health);
  provider.setXp(xpManager.xp);
}

export function deactivate() {}

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
