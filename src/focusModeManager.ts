import * as vscode from 'vscode';

const focusModeKey = 'buddyFocusMode.enabled';

export class BuddyFocusModeManager implements vscode.Disposable {
  private enabled: boolean;
  private readonly listeners = new Set<(enabled: boolean) => void>();

  public constructor(private readonly globalState: vscode.Memento) {
    this.enabled = Boolean(globalState.get<boolean>(focusModeKey, false));
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  public async setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled === this.enabled) {
      return this.enabled;
    }

    this.enabled = enabled;
    await this.globalState.update(focusModeKey, enabled);
    this.listeners.forEach((listener) => listener(enabled));

    return this.enabled;
  }

  public async toggle(): Promise<boolean> {
    return this.setEnabled(!this.enabled);
  }

  public async reset(): Promise<void> {
    await this.setEnabled(false);
  }

  public onDidChangeFocusMode(listener: (enabled: boolean) => void): vscode.Disposable {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  public dispose(): void {
    this.listeners.clear();
  }
}
