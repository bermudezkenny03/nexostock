import { randomId } from '../utils/id';

const TAB_KEY = 'nexostock.session.tab';
const CHANNEL_NAME = 'nexostock.session';

type TabMessage = { type: 'probe'; tabId: string; nonce: string } | { type: 'claimed'; nonce: string };

let currentTabId: string | null = null;
let channel: BroadcastChannel | null = null;

/**
 * "Duplicate tab" copies sessionStorage, including the single-use refresh token.
 * If two tabs rotated the same token the backend would detect reuse and revoke
 * every session of the user, so a duplicated tab must drop the inherited token.
 */
export async function claimTabSession(timeoutMs = 150): Promise<'owner' | 'duplicate'> {
  const store = window.sessionStorage;
  const inherited = store.getItem(TAB_KEY);

  if (typeof BroadcastChannel === 'undefined') {
    currentTabId = inherited ?? randomId();
    store.setItem(TAB_KEY, currentTabId);
    return 'owner';
  }

  channel ??= new BroadcastChannel(CHANNEL_NAME);
  const activeChannel = channel;
  activeChannel.onmessage = (event: MessageEvent<TabMessage>) => {
    const message = event.data;
    if (message?.type === 'probe' && currentTabId !== null && message.tabId === currentTabId) {
      activeChannel.postMessage({ type: 'claimed', nonce: message.nonce } satisfies TabMessage);
    }
  };

  let claimedElsewhere = false;
  if (inherited) {
    const nonce = randomId();
    claimedElsewhere = await new Promise<boolean>((resolve) => {
      const onClaim = (event: MessageEvent<TabMessage>) => {
        if (event.data?.type === 'claimed' && event.data.nonce === nonce) {
          clearTimeout(timer);
          activeChannel.removeEventListener('message', onClaim);
          resolve(true);
        }
      };
      const timer = setTimeout(() => {
        activeChannel.removeEventListener('message', onClaim);
        resolve(false);
      }, timeoutMs);
      activeChannel.addEventListener('message', onClaim);
      activeChannel.postMessage({ type: 'probe', tabId: inherited, nonce } satisfies TabMessage);
    });
  }

  currentTabId = inherited && !claimedElsewhere ? inherited : randomId();
  store.setItem(TAB_KEY, currentTabId);
  return claimedElsewhere ? 'duplicate' : 'owner';
}
