import localforage from "localforage";
import type { StateStorage } from "zustand/middleware";

import { scopedStorageKey } from "@/lib/user-scope";

localforage.config({
    name: "dramacanva-public",
    storeName: "app_state",
});

let pageHideDatabase: IDBDatabase | undefined;
let pageHideReady: Promise<void> | undefined;

/** Open the same localforage store before editing, outside the unload deadline. */
export function preparePageHideStorage(): Promise<void> {
    if (typeof indexedDB === "undefined") return Promise.resolve();
    return pageHideReady ||= localforage.ready().then(async () => {
        if (localforage.driver() !== localforage.INDEXEDDB) return;
        const config = localforage.config();
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(config.name!);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const database = request.result;
                pageHideDatabase = database;
                database.onversionchange = () => {
                    database.close();
                    pageHideDatabase = undefined;
                    pageHideReady = undefined;
                };
                resolve();
            };
        });
    });
}

export function writePageHideStorage(name: string, value: string, scope: string) {
    if (!pageHideDatabase) return localForageStorageForScope(scope).setItem(name, value);
    // Start and commit synchronously while the document still owns its event.
    // localforage.setItem waits for driver readiness even after it is initialized;
    // navigation can terminate that continuation before the transaction commits.
    return new Promise<void>((resolve, reject) => {
        const transaction = pageHideDatabase!.transaction(localforage.config().storeName!, "readwrite");
        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error("Canvas draft transaction aborted"));
        transaction.objectStore(localforage.config().storeName!).put(value, scopedStorageKey(name, scope));
        transaction.commit?.();
    });
}

export async function scopedLocalForageKeys(prefix: string, scope: string) {
    const suffix = scopedStorageKey("", scope);
    return (await localforage.keys()).filter(key => key.startsWith(prefix) && key.endsWith(suffix)).map(key => key.slice(0, -suffix.length));
}

export function localForageStorageForScope(scope?: string): StateStorage {
    const keyFor = (name: string) => scopedStorageKey(name, scope);
    return {
        getItem: async (name) => {
            if (typeof window === "undefined") return null;
            return (await localforage.getItem<string>(keyFor(name))) || null;
        },
        setItem: async (name, value) => {
            if (typeof window === "undefined") return;
            await localforage.setItem(keyFor(name), value);
        },
        removeItem: async (name) => {
            if (typeof window === "undefined") return;
            await localforage.removeItem(keyFor(name));
        },
    };
}

export const localForageStorage: StateStorage = localForageStorageForScope();
