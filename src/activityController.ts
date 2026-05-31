import * as vscode from 'vscode';

import { BuddyStateManager } from './stateManager';
import { BuddyXpAward, BuddyXpSource } from './xpManager';

const thinkingDelayMs = 1000;
const searchingDelayMs = 1400;
const sleepingDelayMs = 5500;
const happyDelayMs = 2600;
const jumpDelayMs = 900;

export class BuddyActivityController implements vscode.Disposable {
  private thinkingTimer?: ReturnType<typeof setTimeout>;
  private sleepingTimer?: ReturnType<typeof setTimeout>;
  private happyTimer?: ReturnType<typeof setTimeout>;
  private jumpTimer?: ReturnType<typeof setTimeout>;
  private readonly pendingTerminalXpActions = new WeakMap<vscode.TerminalShellExecution, BuddyXpSource>();
  private readonly subscriptions: vscode.Disposable[] = [];

  public constructor(
    private readonly stateManager: BuddyStateManager,
    private readonly onXpAward?: (award: BuddyXpAward) => void,
  ) {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (isSupportedDocument(event.document)) {
          this.handleTyping();
        }
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (isSupportedDocument(document)) {
          this.handleSave();
          this.awardXp({ source: 'save', amount: 1 });
        }
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (isNavigableDocument(event.textEditor.document) && event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
          this.handleSearching();
        }
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
        if (isNavigableDocument(event.textEditor.document)) {
          this.handleSearching();
        }
      }),
      vscode.window.onDidStartTerminalShellExecution((event) => {
        const commandLine = event.execution.commandLine.value.trim();
        if (commandLine) {
          this.handleTerminalCommand();
          this.trackTerminalXp(event.execution, commandLine);
        }
      }),
      vscode.window.onDidEndTerminalShellExecution((event) => {
        this.handleTerminalXp(event.execution, event.exitCode);
      }),
    );

    this.scheduleIdleSleep();
  }

  public dispose(): void {
    this.clearTimers();
    this.subscriptions.forEach((subscription) => subscription.dispose());
  }

  private handleTyping(): void {
    this.clearTimers();
    this.stateManager.setState('typing');
    this.scheduleThinking(thinkingDelayMs);
  }

  private handleSearching(): void {
    if (this.stateManager.state === 'typing') {
      return;
    }

    this.clearTimers();
    this.stateManager.setState('searching');
    this.scheduleThinking(searchingDelayMs);
  }

  private handleSave(): void {
    this.clearTimers();
    this.stateManager.setState('happy');

    this.happyTimer = setTimeout(() => {
      if (this.stateManager.state !== 'happy') {
        return;
      }

      this.setIdle();
    }, happyDelayMs);
  }

  private handleTerminalCommand(): void {
    this.clearTimers();
    this.stateManager.setState('jump');

    this.jumpTimer = setTimeout(() => {
      if (this.stateManager.state !== 'jump') {
        return;
      }

      this.setIdle();
    }, jumpDelayMs);
  }

  private trackTerminalXp(execution: vscode.TerminalShellExecution, commandLine: string): void {
    const source = getGitXpSource(commandLine);
    if (source) {
      this.pendingTerminalXpActions.set(execution, source);
    }
  }

  private handleTerminalXp(execution: vscode.TerminalShellExecution, exitCode: number | undefined): void {
    const source = this.pendingTerminalXpActions.get(execution);
    this.pendingTerminalXpActions.delete(execution);

    if (!source || exitCode !== 0) {
      return;
    }

    if (source === 'gitPush') {
      this.awardXp({ source, amount: 30 });
    }
  }

  private awardXp(award: BuddyXpAward): void {
    this.onXpAward?.(award);
  }

  private setIdle(): void {
    this.stateManager.setState('idle');
    this.scheduleIdleSleep();
  }

  private scheduleThinking(delayMs: number): void {
    this.thinkingTimer = setTimeout(() => {
      this.stateManager.setState('thinking');

      this.sleepingTimer = setTimeout(() => {
        this.stateManager.setState('sleeping');
      }, sleepingDelayMs);
    }, delayMs);
  }

  private scheduleIdleSleep(): void {
    if (this.sleepingTimer || this.stateManager.state !== 'idle') {
      return;
    }

    this.sleepingTimer = setTimeout(() => {
      if (this.stateManager.state === 'idle') {
        this.stateManager.setState('sleeping');
      }
    }, sleepingDelayMs);
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

    if (this.happyTimer) {
      clearTimeout(this.happyTimer);
      this.happyTimer = undefined;
    }

    if (this.jumpTimer) {
      clearTimeout(this.jumpTimer);
      this.jumpTimer = undefined;
    }
  }
}

function isSupportedDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === 'file' || document.uri.scheme === 'untitled';
}

function isNavigableDocument(document: vscode.TextDocument): boolean {
  return isSupportedDocument(document);
}

function getGitXpSource(commandLine: string): BuddyXpSource | undefined {
  const normalizedCommand = commandLine.trim().toLowerCase();
  if (/^(?:\w+=\S+\s+)*(?:command\s+)?git(?:\s+-c\s+\S+(?:=\S+)?)*\s+push(?:\s|$)/.test(normalizedCommand)) {
    return 'gitPush';
  }

  return undefined;
}
