import * as vscode from 'vscode';

import { DocFoxStateManager } from './stateManager';

const thinkingDelayMs = 1000;
const sleepingDelayMs = 2500;

export class DocFoxActivityController implements vscode.Disposable {
  private thinkingTimer?: ReturnType<typeof setTimeout>;
  private sleepingTimer?: ReturnType<typeof setTimeout>;
  private readonly subscriptions: vscode.Disposable[] = [];

  public constructor(private readonly stateManager: DocFoxStateManager) {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (isMarkdownDocument(event.document)) {
          this.handleTyping();
        }
      }),
    );
  }

  public dispose(): void {
    this.clearTimers();
    this.subscriptions.forEach((subscription) => subscription.dispose());
  }

  private handleTyping(): void {
    this.clearTimers();
    this.stateManager.setState('typing');

    this.thinkingTimer = setTimeout(() => {
      this.stateManager.setState('thinking');

      this.sleepingTimer = setTimeout(() => {
        this.stateManager.setState('sleeping');
      }, sleepingDelayMs);
    }, thinkingDelayMs);
  }

  private clearTimers(): void {
    if (this.thinkingTimer) {
      clearTimeout(this.thinkingTimer);
      this.thinkingTimer = undefined;
    }

    if (this.sleepingTimer) {
      clearTimeout(this.sleepingTimer);
      this.sleepingTimer = undefined;
    }
  }
}

function isMarkdownDocument(document: vscode.TextDocument): boolean {
  return document.languageId === 'markdown' || document.fileName.toLowerCase().endsWith('.md');
}
