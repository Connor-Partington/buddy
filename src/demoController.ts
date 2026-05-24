import * as vscode from 'vscode';

import { BuddyState, BuddyStateManager } from './stateManager';

const previewStates: BuddyState[] = ['idle', 'typing', 'searching', 'thinking', 'sleeping', 'happy', 'panic'];
const previewStepMs = 1200;

export class BuddyDemoController implements vscode.Disposable {
  private timers: ReturnType<typeof setTimeout>[] = [];

  public constructor(private readonly stateManager: BuddyStateManager) {}

  public play(): void {
    this.stop();

    previewStates.forEach((state, index) => {
      const timer = setTimeout(() => {
        this.stateManager.setState(state);
      }, index * previewStepMs);

      this.timers.push(timer);
    });

    const resetTimer = setTimeout(() => {
      this.stateManager.setState('idle');
      this.timers = [];
    }, previewStates.length * previewStepMs);

    this.timers.push(resetTimer);
  }

  public dispose(): void {
    this.stop();
  }

  private stop(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}
