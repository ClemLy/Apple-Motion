/**
 * Opens the command palette from outside it.
 *
 * The header's trigger button and the global `/` key both need to open the
 * same overlay, and the overlay itself owns whether it is mounted. A tiny
 * pub/sub is simpler than lifting the open state into a context two other
 * components would have to thread through.
 */
export type PaletteMode = "jump" | "shortcuts";

const listeners = new Set<(mode: PaletteMode) => void>();

export function openPalette(mode: PaletteMode) {
  for (const listener of listeners) listener(mode);
}

export function onPaletteRequest(listener: (mode: PaletteMode) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
