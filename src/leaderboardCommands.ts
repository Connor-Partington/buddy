import * as vscode from 'vscode';
import { BuddyLeaderboard, validNickname, type LeaderboardScore } from './leaderboard';

export function registerLeaderboard(context: vscode.ExtensionContext, score: () => LeaderboardScore): void {
  const board = new BuddyLeaderboard(context.globalState, context.secrets);
  const sync = () => { void board.sync(score()).catch(() => undefined); };
  // Local timer only; nonparticipants make no requests. Server and client both limit uploads.
  const timer = setInterval(sync, 60 * 60 * 1000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
  sync();
  context.subscriptions.push(vscode.commands.registerCommand('buddy.leaderboard', async () => {
    try {
      if (!board.configured) { void vscode.window.showInformationMessage('Buddy leaderboard setup is not complete yet. Buddy continues to work offline.'); return; }
      const choice = await vscode.window.showQuickPick([
        { label: 'View rankings', id: 'view', description: 'No joining required' },
        ...(!board.state.joined ? [{ label: 'Join leaderboard', id: 'join' }] : []),
        { label: 'Leave / remove my entry', id: 'leave' },
      ], { title: 'Buddy leaderboard', placeHolder: 'Friendly rankings by current days alive · updates at most daily' });
      if (!choice) return;
      if (choice.id === 'leave') {
        await board.leave(); void vscode.window.showInformationMessage('Your leaderboard entry has been removed.'); return;
      }
      if (choice.id === 'join') {
        const nickname = await vscode.window.showInputBox({ title: 'Join Buddy leaderboard',
          prompt: 'Your nickname, days alive and level will be public and sent to Supabase. No code or email is sent. Identity is specific to this installation.',
          placeHolder: 'Choose a public nickname', validateInput: value => validNickname(value) ? undefined : 'Use 2–20 letters, numbers, spaces, underscores or hyphens.' });
        if (!nickname) return;
        await board.join(nickname, score());
      }
      await board.sync(score()).catch(() => undefined);
      const result = await board.read();
      if (result.notice) void vscode.window.showInformationMessage(result.notice);
      if (!result.page) return;
      if (!result.page.rows.length) {
        void vscode.window.showInformationMessage('No Buddy rankings yet. You can join whenever you like.'); return;
      }
      const me = result.page.me;
      const items: vscode.QuickPickItem[] = [
        ...(me ? [{ label: `You: #${me.rank} ${me.nickname}`, description: `${me.days} days · level ${me.level}` }] : []),
        { label: 'Community · equal days share a rank', kind: vscode.QuickPickItemKind.Separator },
        ...result.page.rows.map(row => ({ label: `#${row.rank} ${row.nickname}`, description: `${row.days} days · level ${row.level}`,
          detail: `Last shared ${new Date(row.updated).toLocaleDateString()}` })),
      ];
      await vscode.window.showQuickPick(items, { title: 'Buddy leaderboard',
        placeHolder: `${result.cached ? 'Saved' : 'Latest'} rankings · refreshed at most every six hours · scores are self-reported` });
    } catch (error) { void vscode.window.showWarningMessage(error instanceof Error ? error.message : 'Leaderboard unavailable.'); }
  }));
}
