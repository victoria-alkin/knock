// Shared store for the unread notification count so every screen's bell (and
// live realtime updates) stay in sync.
type Listener = (count: number) => void;

let count = 0;
const listeners = new Set<Listener>();

export function setUnreadNotifications(next: number) {
  if (next === count) return;
  count = next;
  listeners.forEach((l) => l(count));
}

export function getUnreadNotificationsValue(): number {
  return count;
}

export function subscribeUnreadNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
