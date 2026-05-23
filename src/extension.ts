import * as vscode from 'vscode';

import { DocFoxProvider } from './DocFoxProvider';
import { DocFoxStateManager, docFoxStates } from './stateManager';

export function activate(context: vscode.ExtensionContext) {
  const provider = new DocFoxProvider(context.extensionUri);
  const stateManager = new DocFoxStateManager();
  const stateSubscription = stateManager.onDidChangeState((state) => {
    provider.setState(state);
  });
  const disposable = vscode.commands.registerCommand('docfox.helloWorld', () => {
    vscode.window.showInformationMessage('DocFox is awake.');
  });
  const stateCommands = docFoxStates.map((state) =>
    vscode.commands.registerCommand(`docfox.setState.${state}`, () => {
      stateManager.setState(state);
    }),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DocFoxProvider.viewType, provider),
    stateSubscription,
    disposable,
    ...stateCommands,
  );

  provider.setState(stateManager.state);
}

export function deactivate() {}
