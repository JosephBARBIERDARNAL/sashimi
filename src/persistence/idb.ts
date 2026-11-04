/** Tiny promise wrapper around a single IndexedDB key-value store. */
let dbp: Promise<IDBDatabase> | null = null;
const db = () =>
  (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open("sashimi", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));

export const idbGet = async <T>(key: string): Promise<T | undefined> => {
  const d = await db();
  return new Promise((res, rej) => {
    const r = d.transaction("kv").objectStore("kv").get(key);
    r.onsuccess = () => res(r.result as T);
    r.onerror = () => rej(r.error);
  });
};
export const idbSet = async (key: string, val: unknown) => {
  const d = await db();
  return new Promise<void>((res, rej) => {
    const tx = d.transaction("kv", "readwrite");
    tx.objectStore("kv").put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
};
