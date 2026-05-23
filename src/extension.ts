import * as vscode from 'vscode';

import { DocFoxActivityController } from './activityController';
import { DocFoxDemoController } from './demoController';
import { DocFoxProvider } from './DocFoxProvider';
import { DocFoxStateManager, docFoxStates } from './stateManager';

export function activate(context: vscode.ExtensionContext) {
  let soundsEnabled = context.globalState.get<boolean>('soundsEnabled', false);
  const provider = new DocFoxProvider(context.extensionUri, () => {
    void setSoundsEnabled(!soundsEnabled);
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
  const toggleSoundsCommand = vscode.commands.registerCommand('docfox.toggleSounds', () => {
    void setSoundsEnabled(!soundsEnabled);
  });

  async function setSoundsEnabled(enabled: boolean): Promise<void> {
    soundsEnabled = enabled;
    await context.globalState.update('soundsEnabled', enabled);
    provider.setSoundsEnabled(enabled);
    vscode.window.showInformationMessage(`Luna sounds ${enabled ? 'enabled' : 'disabled'}.`);
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DocFoxProvider.viewType, provider),
    activityController,
    demoController,
    stateSubscription,
    disposable,
    previewCommand,
    toggleSoundsCommand,
    ...stateCommands,
  );

  provider.setState(stateManager.state);
  provider.setSoundsEnabled(soundsEnabled);
}

export function deactivate() {}
