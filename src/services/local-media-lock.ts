import { waitForLocalMedia } from "@/services/local-media-wait";

type Lease = { scope: string; owner: string; fence: number; expiresAt: number };

async function leaseDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("dramacanva-public-local-media-locks", 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore("leases", { keyPath: "scope" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("LOCAL_MEDIA_LOCK_UNAVAILABLE"));
    });
}

async function changeLease(db: IDBDatabase, scope: string, owner: string, expectedFence?: number, release = false): Promise<Lease | null> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("leases", "readwrite");
        const store = transaction.objectStore("leases");
        const request = store.get(scope);
        let result: Lease | null = null;
        request.onsuccess = () => {
            const previous = request.result as Lease | undefined;
            const now = Date.now();
            if (expectedFence !== undefined) {
                if (!previous || previous.owner !== owner || previous.fence !== expectedFence || previous.expiresAt <= now) return;
                result = { ...previous, expiresAt: release ? 0 : now + 120_000 };
            } else {
                if (previous && previous.expiresAt > now) return;
                result = { scope, owner, fence: (previous?.fence ?? 0) + 1, expiresAt: now + 120_000 };
            }
            store.put(result);
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

export async function withLocalMediaLock(scope: string, explicit: boolean, controller: AbortController, action: (assertHeld: () => Promise<void>) => Promise<void>) {
    if (navigator.locks) {
        let entered!: () => void;
        let failed!: (error: unknown) => void;
        const acquisition = new Promise<void>((resolve, reject) => {
            entered = resolve;
            failed = reject;
        });
        const request = navigator.locks.request(`dramacanva-public-local-media:${scope}`, { ifAvailable: true }, async (lock) => {
            entered();
            controller.signal.throwIfAborted();
            if (lock)
                await action(async () => {
                    controller.signal.throwIfAborted();
                });
            else if (explicit) throw new Error("LOCAL_MEDIA_LOCK_BUSY");
        });
        void request.catch(failed);
        await waitForLocalMedia(acquisition, null, controller.signal);
        // Once entered, await the writer's cleanup before releasing the lock.
        await request;
        return;
    }
    if (!explicit) return;
    // Only explicit saves may use the transactional fallback. No localforage
    // read/write pair is ever treated as an atomic lock.
    const db = await leaseDatabase();
    const owner = crypto.randomUUID();
    try {
        const lease = await changeLease(db, scope, owner);
        if (!lease) throw new Error("LOCAL_MEDIA_LOCK_BUSY");
        const assertHeld = async () => {
            controller.signal.throwIfAborted();
            if (!(await changeLease(db, scope, owner, lease.fence))) {
                controller.abort();
                throw new Error("LOCAL_MEDIA_LOCK_LOST");
            }
        };
        const timer = setInterval(() => {
            void assertHeld().catch(() => controller.abort());
        }, 30_000);
        try {
            await action(assertHeld);
        } finally {
            clearInterval(timer);
            await changeLease(db, scope, owner, lease.fence, true);
        }
    } finally {
        db.close();
    }
}
