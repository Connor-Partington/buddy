import * as vscode from 'vscode';

import { BuddyActivityController } from './activityController';
import { BuddyDemoController } from './demoController';
import { Provider, type BuddySize } from './Provider';
import { BuddyStateManager, buddyStates } from './stateManager';

export function activate(context: vscode.ExtensionContext) {
  let buddySize = normalizeBuddySize(context.globalState.get<string>('buddySize', 'default'));
  const provider = new Provider(context.extensionUri);
  const stateManager = new BuddyStateManager();
  const activityController = new BuddyActivityController(stateManager);
  const demoController = new BuddyDemoController(stateManager);
  const stateSubscription = stateManager.onDidChangeState((state) => {
    provider.setState(state);
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
    stateSubscription,
    disposable,
    previewCommand,
    showSidebarCommand,
    toggleSizeCommand,
    spawnCookieCommand,
    ...stateCommands,
  );

  provider.setState(stateManager.state);
  provider.setBuddySize(buddySize);
}

export function deactivate() {}

function normalizeBuddySize(size: string | undefined): BuddySize {
  return size === 'small' ? 'small' : 'default';
}
