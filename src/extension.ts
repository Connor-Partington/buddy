import * as vscode from 'vscode';

import { BuddyActivityController } from './activityController';
import { BuddyDemoController } from './demoController';
import { Provider, type BuddySize } from './Provider';
import { BuddyStateManager, buddyStates } from './stateManager';

export function activate(context: vscode.ExtensionContext) {
  let soundsEnabled = context.globalState.get<boolean>('soundsEnabled', false);
  let frameAnimationsEnabled = context.globalState.get<boolean>('frameAnimationsEnabled', true);
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
  const toggleSoundsCommand = vscode.commands.registerCommand('buddy.toggleSounds', () => {
    void setSoundsEnabled(!soundsEnabled);
  });
  const toggleFrameAnimationsCommand = vscode.commands.registerCommand('buddy.toggleFrameAnimations', () => {
    void setFrameAnimationsEnabled(!frameAnimationsEnabled);
  });
  const toggleSizeCommand = vscode.commands.registerCommand('buddy.toggleSize', () => {
    void setBuddySize(buddySize === 'default' ? 'small' : 'default');
  });

  async function setSoundsEnabled(enabled: boolean): Promise<void> {
    soundsEnabled = enabled;
    await context.globalState.update('soundsEnabled', enabled);
    provider.setSoundsEnabled(enabled);
    vscode.window.showInformationMessage(`Buddy sounds ${enabled ? 'enabled' : 'disabled'}.`);
  }

  async function setFrameAnimationsEnabled(enabled: boolean): Promise<void> {
    frameAnimationsEnabled = enabled;
    await context.globalState.update('frameAnimationsEnabled', enabled);
    provider.setFrameAnimationsEnabled(enabled);
    vscode.window.showInformationMessage(`Buddy animated sprites ${enabled ? 'enabled' : 'disabled'}.`);
  }

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
    toggleSoundsCommand,
    toggleFrameAnimationsCommand,
    toggleSizeCommand,
    ...stateCommands,
  );

  provider.setState(stateManager.state);
  provider.setSoundsEnabled(soundsEnabled);
  provider.setFrameAnimationsEnabled(frameAnimationsEnabled);
  provider.setBuddySize(buddySize);
}

export function deactivate() {}

function normalizeBuddySize(size: string | undefined): BuddySize {
  return size === 'small' ? 'small' : 'default';
}
