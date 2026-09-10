import { randomBytes } from 'node:crypto';
import type { Memento, SecretStorage } from 'vscode';

export const leaderboardDay = 86_400_000;
const cacheDuration = 6 * 60 * 60 * 1000;
const stateKey = 'buddy.leaderboard';
const tokenKey = 'buddy.leaderboard.token';
// Public connection details only; private capabilities live in SecretStorage.
export const leaderboardBackend = { url: 'https://btfheebiolwadzktxspk.supabase.co', key: 'sb_publishable_lWcP0zcm_0YV0eJvBlslWg_idWxhwkq' };
export type LeaderboardScore = { days: number; level: number };
export type LeaderboardRow = LeaderboardScore & { nickname: string; rank: number; updated: string };
export type LeaderboardPage = { rows: LeaderboardRow[]; me: LeaderboardRow | null };
type State = { joined?: boolean; nickname?: string; lastUpload?: number; uploaded?: string;
  nextRequest?: number; cachedAt?: number; cache?: LeaderboardPage };
type Reply = Partial<LeaderboardPage> & { status: string; retry_after?: number };

export function validNickname(value: string): boolean { return /^[A-Za-z0-9 _-]{2,20}$/.test(value.trim()); }
export function validScore(score: LeaderboardScore): boolean {
  return Number.isInteger(score.days) && score.days >= 0 && score.days <= 36500 &&
    Number.isInteger(score.level) && score.level >= 1 && score.level <= 100;
}

/** Only opt-in leaderboard data leaves the host. Tokens never enter a webview or settings. */
export class BuddyLeaderboard {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: Memento, private secrets: SecretStorage,
    private backend = leaderboardBackend, private request: typeof fetch = fetch,
    private now: () => number = Date.now) {}
  get configured(): boolean { return /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(this.backend.url) && !!this.backend.key; }
  get state(): State { return this.storage.get<State>(stateKey, {}); }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation); this.queue = next.catch(() => undefined); return next;
  }
  private async save(change: Partial<State>): Promise<void> { await this.storage.update(stateKey, { ...this.state, ...change }); }
  private async call(action: string, extra: object = {}): Promise<Reply> {
    if (!this.configured) throw new Error('The Buddy leaderboard has not been connected yet.');
    if (action !== 'leave' && (this.state.nextRequest ?? 0) > this.now()) throw new Error('Leaderboard sync is paused. Please try later; cached rankings are still available.');
    const token = action === 'browse' ? undefined : await this.secrets.get(tokenKey);
    if (action !== 'browse' && !token) throw new Error('Leaderboard identity is missing. Join again to create a new entry.');
    // Persist backoff before sending, including failures/reloads. Never retry in a loop.
    await this.save({ nextRequest: this.now() + 60_000 });
    const response = await this.request(`${this.backend.url}/rest/v1/rpc/${action === 'browse' ? 'buddy_leaderboard_public' : 'buddy_leaderboard'}`, {
      method: 'POST', headers: { apikey: this.backend.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'browse' ? {} : { p_token: token, p_action: action, ...extra }), signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    // Bound response memory as well as the server's 50-row response.
    const reader = response.body?.getReader(); let body = ''; let bytes = 0;
    if (!reader) throw new Error('Leaderboard returned an empty response.');
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 32_768) { await reader.cancel(); throw new Error('Leaderboard response was too large.'); }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    if (!response.ok) throw new Error('Leaderboard is unavailable. Please try later.');
    const reply = JSON.parse(body) as Reply;
    if (reply.status !== 'ok') {
      const delay = Math.max(60, Math.min(32 * 86400, Number(reply.retry_after) || 3600));
      await this.save({ nextRequest: this.now() + delay * 1000 });
      throw new Error(reply.status === 'budget' ? 'Community sync is paused to conserve the free allowance.' :
        reply.status === 'full' ? 'The leaderboard is at its current free-tier capacity.' :
          'Leaderboard request could not be accepted yet. Please try later.');
    }
    await this.save({ nextRequest: 0 });
    return reply;
  }
  join(nickname: string, score: LeaderboardScore): Promise<void> { return this.serial(async () => {
    if (!validNickname(nickname) || !validScore(score)) throw new Error('Use a nickname of 2–20 letters, numbers, spaces, underscores or hyphens.');
    if (!(await this.secrets.get(tokenKey))) await this.secrets.store(tokenKey, randomBytes(32).toString('hex'));
    await this.call('join', { p_nickname: nickname.trim(), p_days: score.days, p_level: score.level });
    await this.save({ joined: true, nickname: nickname.trim(), lastUpload: this.now(), uploaded: JSON.stringify(score), cachedAt: 0 });
  }); }
  sync(score: LeaderboardScore): Promise<void> { return this.serial(async () => {
    const state = this.state;
    if (!state.joined || !validScore(score) || !this.configured ||
      this.now() - (state.lastUpload ?? 0) < leaderboardDay || state.uploaded === JSON.stringify(score)) return;
    await this.call('submit', { p_days: score.days, p_level: score.level });
    await this.save({ lastUpload: this.now(), uploaded: JSON.stringify(score), cachedAt: 0 });
  }); }
  read(): Promise<{ page?: LeaderboardPage; cached: boolean; notice?: string }> { return this.serial(async () => {
    const state = this.state;
    if (state.cache && this.now() - (state.cachedAt ?? 0) < cacheDuration) return { page: state.cache, cached: true };
    try {
      const reply = await this.call(state.joined ? 'read' : 'browse');
      const rowValid = (row: LeaderboardRow) => validNickname(row.nickname) && validScore(row) &&
        Number.isSafeInteger(row.rank) && row.rank > 0 && Number.isFinite(Date.parse(row.updated));
      if (!Array.isArray(reply.rows) || reply.rows.length > 50 || !reply.rows.every(rowValid) ||
        !(reply.me === null || (reply.me && rowValid(reply.me)))) throw new Error('Invalid leaderboard response.');
      const page = { rows: reply.rows, me: reply.me };
      await this.save({ cache: page, cachedAt: this.now() }); return { page, cached: false };
    } catch (error) { return { page: state.cache, cached: true, notice: error instanceof Error ? error.message : 'Leaderboard unavailable.' }; }
  }); }
  leave(): Promise<void> { return this.serial(async () => {
    // Stop all automatic uploads immediately; retain credentials if deletion must be retried.
    await this.save({ joined: false, cache: undefined, cachedAt: 0 });
    await this.call('leave');
    await this.storage.update(stateKey, {});
    await this.secrets.delete(tokenKey);
  }); }
}
