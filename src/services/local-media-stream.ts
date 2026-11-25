import { sha256 } from "@noble/hashes/sha256";

export type MediaDigest = { bytes: number; sha256: string };

// One bounded chunk is retained at a time; writes are awaited for backpressure.
export async function digestMediaStream(stream: ReadableStream<Uint8Array>, signal?: AbortSignal, write?: (chunk: Uint8Array) => Promise<void>): Promise<MediaDigest> {
    const reader = stream.getReader();
    const hash = sha256.create();
    let bytes = 0;
    const cancel = () => {
        void reader.cancel(signal?.reason).catch(() => undefined);
    };
    signal?.addEventListener("abort", cancel, { once: true });
    try {
        for (;;) {
            signal?.throwIfAborted();
            const next = await reader.read();
            signal?.throwIfAborted();
            if (next.done) break;
            if (next.value.byteLength > 16 * 1024 * 1024) throw new Error("LOCAL_MEDIA_BUFFER_LIMIT");
            hash.update(next.value);
            bytes += next.value.byteLength;
            if (write) await write(next.value);
        }
        return { bytes, sha256: Array.from(hash.digest(), (byte) => byte.toString(16).padStart(2, "0")).join("") };
    } catch (error) {
        await reader.cancel(error).catch(() => undefined);
        throw error;
    } finally {
        signal?.removeEventListener("abort", cancel);
        reader.releaseLock();
        hash.destroy();
    }
}

export function assertMediaDigest(actual: MediaDigest, expected: MediaDigest) {
    if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) throw new Error("LOCAL_MEDIA_HASH_MISMATCH");
}

export async function verifyMediaFile(file: File, expected: MediaDigest, signal?: AbortSignal) {
    if (file.size !== expected.bytes) throw new Error("LOCAL_MEDIA_SIZE_MISMATCH");
    assertMediaDigest(await digestMediaStream(file.stream(), signal), expected);
}
