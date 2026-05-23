import * as vscode from 'vscode';

import { DocFoxProvider } from './DocFoxProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new DocFoxProvider(context.extensionUri);
  const disposable = vscode.commands.registerCommand('docfox.helloWorld', () => {
    vscode.window.showInformationMessage('DocFox is awake.');
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DocFoxProvider.viewType, provider),
    disposable,
  );
}

export function deactivate() {}
