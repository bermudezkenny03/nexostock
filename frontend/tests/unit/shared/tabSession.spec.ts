import { afterEach, describe, expect, it } from 'vitest';
import { claimTabSession } from '@/shared/api';

const TAB_KEY = 'nexostock.session.tab';
const channels: BroadcastChannel[] = [];

afterEach(() => {
  channels.splice(0).forEach((channel) => channel.close());
});

/** Simulates the original tab that still owns `tabId`. */
function otherTab(tabId: string): void {
  const channel = new BroadcastChannel('nexostock.session');
  channel.onmessage = (event: MessageEvent<{ type: string; tabId: string; nonce: string }>) => {
    if (event.data.type === 'probe' && event.data.tabId === tabId) {
      channel.postMessage({ type: 'claimed', nonce: event.data.nonce });
    }
  };
  channels.push(channel);
}

describe('claimTabSession', () => {
  it('keeps the session after a reload of the same tab', async () => {
    sessionStorage.setItem(TAB_KEY, 'tab-1');

    await expect(claimTabSession(50)).resolves.toBe('owner');
    expect(sessionStorage.getItem(TAB_KEY)).toBe('tab-1');
  });

  it('detects a duplicated tab whose original is still open', async () => {
    sessionStorage.setItem(TAB_KEY, 'tab-2');
    otherTab('tab-2');

    await expect(claimTabSession(200)).resolves.toBe('duplicate');
    expect(sessionStorage.getItem(TAB_KEY)).not.toBe('tab-2');
  });
});
