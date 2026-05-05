export function createId(prefix: string) {
  const randomUUID = globalThis.crypto?.randomUUID?.();

  if (randomUUID) {
    return `${prefix}-${randomUUID}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
