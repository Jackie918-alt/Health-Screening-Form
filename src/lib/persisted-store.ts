/**
 * A minimal `localStorage`-backed external store shaped for
 * `useSyncExternalStore`.
 *
 * Reading persisted state this way — rather than `useEffect` + `setState` —
 * keeps the server render and the first client render in agreement, avoids the
 * cascading re-render React 19 warns about, and gives cross-tab sync for free.
 */

type Listener = () => void;

export type PersistedStore = {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => string | null;
  getServerSnapshot: () => null;
  set: (value: string) => void;
  clear: () => void;
};

export function createPersistedStore(key: string): PersistedStore {
  const listeners = new Set<Listener>();
  let snapshot: string | null = null;
  let primed = false;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  // Cached so repeated `getSnapshot` calls return an identical value, which is
  // what `useSyncExternalStore` requires to avoid render loops.
  const read = (): string | null => {
    if (!primed) {
      try {
        snapshot = window.localStorage.getItem(key);
      } catch {
        snapshot = null; // Private browsing or storage disabled.
      }
      primed = true;
    }
    return snapshot;
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) {
          primed = false;
          emit();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => null,
    set(value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore quota / disabled storage — the in-memory snapshot still works.
      }
      snapshot = value;
      primed = true;
      emit();
    },
    clear() {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore.
      }
      snapshot = null;
      primed = true;
      emit();
    },
  };
}
