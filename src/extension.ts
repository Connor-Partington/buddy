import * as vscode from 'vscode';

import { DocFoxActivityController } from './activityController';
import { DocFoxDemoController } from './demoController';
import { DocFoxProvider } from './DocFoxProvider';
import { DocFoxStateManager, docFoxStates } from './stateManager';

export function activate(context: vscode.ExtensionContext) {
  let soundsEnabled = context.globalState.get<boolean>('soundsEnabled', false);
  let frameAnimationsEnabled = context.globalState.get<boolean>('frameAnimationsEnabled', false);
  const provider = new DocFoxProvider(context.extensionUri, () => {
    void setSoundsEnabled(!soundsEnabled);
  }, () => {
    void setFrameAnimationsEnabled(!frameAnimationsEnabled);
  });
  const stateManager = new DocFoxStateManager();
  const activityController = new DocFoxActivityController(stateManager);
  const demoController = new DocFoxDemoController(stateManager);
  const stateSubscription = stateManager.onDidChangeState((state) => {
    provider.setState(state);
  });
  const disposable = vscode.commands.registerCommand('docfox.helloWorld', () => {
    vscode.window.showInformationMessage('Luna is awake.');
  });
  const stateCommands = docFoxStates.map((state) =>
    vscode.commands.registerCommand(`docfox.setState.${state}`, () => {
      stateManager.setState(state);
    }),
  );
  const previewCommand = vscode.commands.registerCommand('docfox.previewAnimations', () => {
    demoController.play();
  });
  const showSidebarCommand = vscode.commands.registerCommand('docfox.showSidebar', async () => {
    await vscode.commands.executeCommand('workbench.view.extension.docfox');
    try {
      await vscode.commands.executeCommand(`${DocFoxProvider.viewType}.focus`);
    } catch {
      // Older VS Code builds may not expose generated focus commands for every view.
    }
  });
  const toggleSoundsCommand = vscode.commands.registerCommand('docfox.toggleSounds', () => {
    void setSoundsEnabled(!soundsEnabled);
  });
  const toggleFrameAnimationsCommand = vscode.commands.registerCommand('docfox.toggleFrameAnimations', () => {
    void setFrameAnimationsEnabled(!frameAnimationsEnabled);
  });

  async function setSoundsEnabled(enabled: boolean): Promise<void> {
    soundsEnabled = enabled;
    await context.globalState.update('soundsEnabled', enabled);
    provider.setSoundsEnabled(enabled);
    vscode.window.showInformationMessage(`Luna sounds ${enabled ? 'enabled' : 'disabled'}.`);
  }

  async function setFrameAnimationsEnabled(enabled: boolean): Promise<void> {
    frameAnimationsEnabled = enabled;
    await context.globalState.update('frameAnimationsEnabled', enabled);
    provider.setFrameAnimationsEnabled(enabled);
    vscode.window.showInformationMessage(`Luna frame animations ${enabled ? 'enabled' : 'disabled'}.`);
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DocFoxProvider.viewType, provider),
    activityController,
    demoController,
    stateSubscription,
    disposable,
    previewCommand,
    showSidebarCommand,
    toggleSoundsCommand,
    toggleFrameAnimationsCommand,
    ...stateCommands,
  );

  provider.setState(stateManager.state);
  provider.setSoundsEnabled(soundsEnabled);
  provider.setFrameAnimationsEnabled(frameAnimationsEnabled);
}

export function deactivate() {}
