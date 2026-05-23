import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('docfox.helloWorld', () => {
    vscode.window.showInformationMessage('DocFox is awake.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
