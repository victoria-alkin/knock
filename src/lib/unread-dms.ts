// Tiny shared store for the total unread DM count, so the tab bar can show a
// dot. The Messages screen updates it whenever it loads conversations.
type Listener = (count: number) => void;

let count = 0;
const listeners = new Set<Listener>();

export function setUnreadDmCount(next: number) {
  if (next === count) return;
  count = next;
  listeners.forEach((l) => l(count));
}

export function getUnreadDmCountValue(): number {
  return count;
}

export function subscribeUnreadDms(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
