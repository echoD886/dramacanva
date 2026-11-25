import { id3TagLength, parseAudioSampleRate } from "@/lib/audio-sample-rate";
import { getActiveUserScope } from "@/lib/user-scope";
import { resourceIdFromStorageKey, resourceProxyFileUrl } from "@/services/api/resources";
import { getCachedResourceObjectUrl } from "@/services/resource-blob-cache";

// 受控资源通过资源代理读取 Range。外链用普通 GET 并在读到文件头后取消，以兼容对象存储 CORS。

const HEAD_BYTES = 128 * 1024;
// MP3 的 ID3 标签可能内嵌封面图；标签过大时放弃，不为一个采样率下载几 MB。
const MAX_HEAD_BYTES = 4 * 1024 * 1024;
const MAX_CONCURRENT_PROBES = 2;

const results = new Map<string, Promise<number | undefined>>();
let running = 0;
const waiting: Array<() => void> = [];

async function withProbeSlot<T>(task: () => Promise<T>) {
    if (running >= MAX_CONCURRENT_PROBES) await new Promise<void>((resolve) => waiting.push(resolve));
    running += 1;
    try {
        return await task();
    } finally {
        running -= 1;
        waiting.shift()?.();
    }
}

async function readHead(url: string, credentials: RequestCredentials, maxBytes: number, useRange: boolean) {
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), 20_000);
    try {
        const response = await fetch(url, { credentials, mode: "cors", signal: controller.signal, headers: useRange ? { Range: `bytes=0-${maxBytes - 1}` } : undefined });
        if (!response.ok || !response.body) return new Uint8Array();
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (length < maxBytes) {
            const { done, value } = await reader.read();
            if (done || !value) break;
            chunks.push(value);
            length += value.length;
        }
        void reader.cancel().catch(() => undefined);
        const head = new Uint8Array(Math.min(length, maxBytes));
        let offset = 0;
        for (const chunk of chunks) {
            const slice = chunk.subarray(0, head.length - offset);
            head.set(slice, offset);
            offset += slice.length;
            if (offset >= head.length) break;
        }
        return head;
    } finally {
        globalThis.clearTimeout(timer);
        controller.abort();
    }
}

async function probe(storageKey: string | undefined, url: string) {
    let source = url;
    let credentials: RequestCredentials = "same-origin";
    let useRange = false;
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (storageKey && resourceId) {
        const cached = await getCachedResourceObjectUrl(storageKey).catch(() => "");
        source = cached || resourceProxyFileUrl(resourceId);
        credentials = cached ? "omit" : "include";
        useRange = !cached;
    }
    if (!source) return undefined;
    let head = await readHead(source, credentials, HEAD_BYTES, useRange);
    const tagLength = id3TagLength(head);
    if (tagLength + 16 * 1024 > head.length && tagLength + 16 * 1024 <= MAX_HEAD_BYTES && head.length >= HEAD_BYTES) {
        head = await readHead(source, credentials, tagLength + 16 * 1024, useRange);
    }
    return parseAudioSampleRate(head);
}

/** 读取音频素材的源采样率（Hz）；格式不支持、文件头不在开头或读取失败时返回 undefined。 */
export function probeAudioSampleRate(storageKey: string | undefined, url: string) {
    const key = `${getActiveUserScope()}:${storageKey || url}`;
    const cached = results.get(key);
    if (cached) return cached;
    const pending = withProbeSlot(() => probe(storageKey, url)).catch(() => undefined);
    results.set(key, pending);
    return pending;
}
