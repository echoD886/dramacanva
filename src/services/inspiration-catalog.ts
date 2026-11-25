import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
/**
 * 全量灵感目录的运行时加载。
 *
 * 3MB 量级的目录不能打进主 JS，全量留给灵感页按需拉取；
 * 首页纵深画廊的池子同理，连提示词正文有几百 KB，走 gallery-pool.json，
 * 浏览器 HTTP 缓存之外再做一层内存缓存，同一次会话只请求一遍。
 */
import { curatedInspirations, type CreationInspiration, type InspirationSourceId } from "@/lib/inspirations/catalog";

/** manifest.json 里每个来源带的分类码译名表。 */
type SourceManifest = { revision?: string; count?: number; categories?: Record<string, string> };
type CatalogManifest = { generatedAt?: string; sources?: Record<string, SourceManifest> };

export type InspirationCategoryOption = {
    id: string;
    label: string;
    count: number;
};

export type InspirationCatalog = {
    /** 原创 + 全部外部来源，已按来源归并。 */
    entries: CreationInspiration[];
    /** 各来源的分类选项，只保留有条目的那些。 */
    categoriesBySource: Record<InspirationSourceId, InspirationCategoryOption[]>;
    /** 未知分类码的兜底译名表，页面直接用 code 显示。 */
    revisions: Record<string, string>;
    loadedAt: number;
};

const CATALOG_SOURCES: { key: InspirationSourceId; file: string }[] = [
    { key: "seedance", file: "/inspirations/seedance.json" },
    { key: "haohaoxue", file: "/inspirations/haohaoxue.json" },
    { key: "youmind", file: "/inspirations/youmind.json" },
];

let pending: Promise<InspirationCatalog> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(upstreamText("upstream.v165.message497", { p0: url, p1: response.status }));
    return (await response.json()) as T;
}

/** 目录文件是构建期生成的，但仍然是外部数据：形状不对就抛错，不能当成空目录糊过去。 */
function readEntries(payload: unknown, file: string): CreationInspiration[] {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error(upstreamText("upstream.v165.message498", { p0: file }));
    const entries = (payload as { entries?: unknown }).entries;
    if (!Array.isArray(entries)) throw new Error(upstreamText("upstream.v165.message499", { p0: file }));
    return entries as CreationInspiration[];
}

async function buildCatalog(): Promise<InspirationCatalog> {
    const [manifest, ...packs] = await Promise.all([
        fetchJson<CatalogManifest>("/inspirations/manifest.json").catch(() => ({ sources: {} }) as CatalogManifest),
        ...CATALOG_SOURCES.map((source) => fetchJson<unknown>(source.file).then((payload) => readEntries(payload, source.file))),
    ]);

    const entriesBySource = new Map<InspirationSourceId, CreationInspiration[]>();
    CATALOG_SOURCES.forEach((source, index) => entriesBySource.set(source.key, packs[index]));
    entriesBySource.set("original", curatedInspirations);

    const categoriesBySource = {} as Record<InspirationSourceId, InspirationCategoryOption[]>;
    const revisions: Record<string, string> = {};
    for (const [sourceId, sourceEntries] of entriesBySource) {
        if (manifest.sources?.[sourceId]?.revision) revisions[sourceId] = manifest.sources[sourceId]!.revision!;
        const labels = manifest.sources?.[sourceId]?.categories ?? {};
        const counts = new Map<string, number>();
        for (const entry of sourceEntries) {
            const category = entry.category?.trim();
            if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
        }
        categoriesBySource[sourceId] = [...counts.entries()].map(([id, count]) => ({ id, label: labels[id] ?? id, count })).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-Hans-CN"));
    }

    return {
        entries: [...entriesBySource.values()].flat(),
        categoriesBySource,
        revisions,
        loadedAt: Date.now(),
    };
}

/** 同一次会话只拉一遍；失败后清空缓存，下次进入页面还能重试。 */
export function loadInspirationCatalog(): Promise<InspirationCatalog> {
    if (!pending) {
        pending = buildCatalog().catch((error) => {
            pending = null;
            throw error;
        });
    }
    return pending;
}
