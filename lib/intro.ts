/**
 * The moment the loading curtain lifts.
 *
 * The opening chrome waits for it instead of running on mount, where it would
 * play out unseen behind the loader. A plain module-level signal rather than
 * context: there is exactly one loader and it fires exactly once per visit.
 */
let released = false;
const listeners = new Set<() => void>();

export function releaseIntro() {
  if (released) return;
  released = true;
  for (const listener of listeners) listener();
  listeners.clear();
}

export function onIntro(listener: () => void) {
  if (released) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
