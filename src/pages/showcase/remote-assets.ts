import caseSummariesJson from "./fixtures/case-summaries.local.json";
import type { ShowcaseCase, ShowcaseSummary } from "./data";

/**
 * The published archive already rewrites media to local `/liblib-clone/...`
 * paths, which `resolveLocalAsset` returns without consulting the manifest.
 * Only a value that still points elsewhere needs the full manifest (~0.5 MB
 * gzip across every case), so callers use this to skip that download.
 */
function needsManifestLookup(value: unknown) {
    return typeof value === "string" && value.trim() !== "" && !value.startsWith("/");
}

export function showcaseCaseNeedsManifest(caseData: ShowcaseCase) {
    return caseData.graph.nodes.some((node) => node.data.url?.some(needsManifestLookup)
        || needsManifestLookup(node.data.poster)
        || needsManifestLookup(node.data.coverUrl));
}

function summariesNeedManifest(summaries: Iterable<ShowcaseSummary>) {
    for (const summary of summaries) {
        for (const detail of [summary.detail, ...summary.recommendations]) {
            if (needsManifestLookup(detail.finalOutput) || needsManifestLookup(detail.coverUrl) || needsManifestLookup(detail.avatar)) return true;
        }
    }
    return false;
}

/** Detail pages only render summary media, so one check covers every case. */
export const SHOWCASE_SUMMARIES_NEED_MANIFEST = summariesNeedManifest(Object.values(caseSummariesJson as Record<string, ShowcaseSummary>));
