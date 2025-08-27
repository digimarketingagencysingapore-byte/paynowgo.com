export function isPgrst205(err) {
  return err?.code === 'PGRST205' || /schema cache/i.test(err?.message ?? '');
}
export async function withSchemaRetry(fn) {
  try {
    return await fn();
  } catch (e) {
    if (isPgrst205(e)) {
      await new Promise(r => setTimeout(r, 1200));
      return await fn();
    }
    throw e;
  }
}
export function nowIso() { return new Date().toISOString(); }
export function uuid() { return crypto.randomUUID(); }