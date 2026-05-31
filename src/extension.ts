import * as vscode from 'vscode';

import { BuddyActivityController } from './activityController';
import { BuddyDemoController } from './demoController';
import { BuddyHealthManager } from './healthManager';
import { Provider, type BuddySize } from './Provider';
import { BuddyStateManager, buddyStates } from './stateManager';

export async function activate(context: vscode.ExtensionContext) {
  let buddySize = normalizeBuddySize(context.globalState.get<string>('buddySize', 'default'));
  const provider = new Provider(context.extensionUri);
  const stateManager = new BuddyStateManager();
  const healthManager = new BuddyHealthManager(context.globalState);
  const activityController = new BuddyActivityController(stateManager);
  const demoController = new BuddyDemoController(stateManager);
  const stateSubscription = stateManager.onDidChangeState((state) => {
    provider.setState(state);
  });
  const feedCookieSubscription = provider.onDidFeedCookie(() => {
    void healthManager.feedCookie().then((restoredHeartIndex) => {
      if (restoredHeartIndex !== undefined) {
        provider.playHeartFill(restoredHeartIndex);
      }
    });
  });
  const healthSubscription = healthManager.onDidChangeHealth((health) => {
    provider.setHealth(health);
    if (health.isDead) {
      vscode.window.showWarningMessage('Buddy is dead.');
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
  const removeHeartCommand = vscode.commands.registerCommand('buddy.removeHeart', async () => {
    await healthManager.loseHeart();
  });
  const killCommand = vscode.commands.registerCommand('buddy.kill', async () => {
    if (healthManager.health.isDead) {
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
    demoController,
    healthManager,
    stateSubscription,
    feedCookieSubscription,
    healthSubscription,
    windowStateSubscription,
    disposable,
    previewCommand,
    showSidebarCommand,
    toggleSizeCommand,
    spawnCookieCommand,
    removeHeartCommand,
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
}

export function deactivate() {}

function normalizeBuddySize(size: string | undefined): BuddySize {
  return size === 'small' ? 'small' : 'default';
}
