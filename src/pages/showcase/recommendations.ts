import { WESTERN_HOME_SHOWS } from "../home/western-opening-works";
import { ARCHIVED_CASE_INDEX } from "./archive-loader";
import { getShowcaseSummary, listShowcaseSummaries, type ShowcaseDetail, type ShowcaseSummary } from "./data";

const WESTERN_HOME_UUIDS = new Set(WESTERN_HOME_SHOWS.map((show) => show.templateUuid));

/**
 * A detail route only works when the page can render it (a case summary or a
 * western home show) and the prerender registry emits it (western or archived,
 * mirroring ALL_TEMPLATE_UUIDS); otherwise nginx returns 404 on direct loads.
 */
export function isResolvableShowcaseDetail(templateUuid: string | undefined) {
    if (!templateUuid) return false;
    const renderable = Boolean(getShowcaseSummary(templateUuid)) || WESTERN_HOME_UUIDS.has(templateUuid);
    const prerendered = WESTERN_HOME_UUIDS.has(templateUuid) || ARCHIVED_CASE_INDEX.has(templateUuid);
    return renderable && prerendered;
}

/**
 * Archived recommendation lists reference upstream works that were never
 * recovered. Keep only resolvable ones and backfill with other local cases so
 * the rail never links to a missing page.
 */
export function resolvableShowcaseRecommendations(showcaseCase: ShowcaseSummary): ShowcaseDetail[] {
    const seen = new Set<string>([showcaseCase.detail.templateUuid]);
    const result: ShowcaseDetail[] = [];
    const push = (item: ShowcaseDetail) => {
        if (seen.has(item.templateUuid) || !isResolvableShowcaseDetail(item.templateUuid)) return;
        seen.add(item.templateUuid);
        result.push(item);
    };
    showcaseCase.recommendations.forEach(push);
    listShowcaseSummaries().forEach((summary) => push(summary.detail));
    return result;
}
