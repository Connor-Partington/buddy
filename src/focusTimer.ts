import type * as vscode from 'vscode';
export type FocusSession = { endsAt: number; restoreFocus: boolean };
export class FocusTimer {
  private session?: FocusSession;
  private busy = false;
  public constructor(private storage: vscode.Memento, private focus: { isEnabled: boolean; setEnabled(value: boolean): Promise<boolean> }) {
    const saved = storage.get<FocusSession>('buddy.focusTimer');
    if (saved && Number.isFinite(saved.endsAt)) this.session = { endsAt: saved.endsAt, restoreFocus: saved.restoreFocus === true };
  }
  public get current(): FocusSession | undefined { return this.session && { ...this.session }; }
  public async start(minutes: number, now = Date.now()): Promise<void> {
    if (this.busy) return;
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) throw new Error('Choose 1–180 minutes.');
    this.busy = true;
    try {
      const next = { endsAt: now + Math.round(minutes * 60000), restoreFocus: this.session?.restoreFocus ?? this.focus.isEnabled };
      await this.storage.update('buddy.focusTimer', next);
      this.session = next;
      await this.focus.setEnabled(true);
    } finally { this.busy = false; }
  }
  public async stop(): Promise<void> {
    if (!this.session || this.busy) return;
    this.busy = true;
    try {
      const previous = this.session;
      await this.focus.setEnabled(previous.restoreFocus);
      await this.storage.update('buddy.focusTimer', undefined);
      this.session = undefined;
    } finally { this.busy = false; }
  }
  public async tick(now = Date.now()): Promise<boolean> {
    if (!this.session || this.busy || now < this.session.endsAt) return false;
    await this.stop();
    return true;
  }
}
