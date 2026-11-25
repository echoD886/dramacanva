import { homePreviewVideoPath } from "./preview-playback";
import westernOpeningWorksJson from "./western-opening-works.local.json";
import withdrawnWorksJson from "./withdrawn-works.json";

import { showcaseCanvasImportHref } from "../showcase/canvas-route";
import { hasArchivedShowcaseGraph } from "../showcase/archive-loader";
import { getLocalizedShowcase } from "../showcase/showcase-translations";
import { localizedWorkPath } from "../showcase/works-data";
import type { BlogLocale } from "@/content/blog-locales";

export type WesternHomeCategory = "Seedance 2.5" | "精选画布" | "专业影视" | "短剧漫剧" | "商业广告" | "动漫游戏" | "教育生活";
export type WesternCreatorBadgeKind = "director" | "visual" | "workflow" | "featured" | "challenge" | "community";

interface ResearchWork {
    rank: number;
    templateUuid: string;
    title: string;
    description: string;
    proposedBrandDisplayName: string;
    proposedCategory: string;
    requestedFirstScreenFixed: boolean;
    coverPath: string;
    avatarPath: string;
    videoPath: string | null;
    originalAuthor: string | null;
    originalAuthorId: number | null;
    sourcePlatform: "LibTV";
    originalPublishAt: string | null;
}

export interface WesternHomeShow {
    id: string;
    title: string;
    author: string | null;
    originalAuthorId: number | null;
    sourcePlatform: "LibTV";
    originalPublishAt: string | null;
    description: string;
    /** Original cover: kept for SEO/share metadata; never render it at card size. */
    src: string;
    /** 640px WebP for cards and rails (the originals are up to 12 MB / 4000px). */
    cardSrc: string;
    /** 1920px WebP for full-bleed posters and backdrops. */
    heroSrc: string;
    videoSrc: string;
    previewVideoSrc: string;
    templateUuid: string;
    detailHref: string;
    processHref: string;
    processLabel: "openCanvas" | "viewInfo";
    categories: WesternHomeCategory[];
    creatorBadge: WesternCreatorBadgeKind;
    requestedFirstScreenFixed: boolean;
}

// Works withdrawn from public display: source forbids reposting without authorization,
// or attribution/story could not be verified. Keep the record; do not render, list or link.
export const WITHDRAWN_WESTERN_WORK_UUIDS = new Set<string>((withdrawnWorksJson.withdrawn as { templateUuid: string }[]).map((work) => work.templateUuid));
const works = (westernOpeningWorksJson.works as ResearchWork[]).filter((work) => !WITHDRAWN_WESTERN_WORK_UUIDS.has(work.templateUuid));

export const ARCHIVED_WESTERN_WORKFLOW_UUIDS = new Set<string>(works.flatMap((work) => hasArchivedShowcaseGraph(work.templateUuid) ? [work.templateUuid] : []));

export const WESTERN_HOME_SHOWS: WesternHomeShow[] = works.map((work) => {
    const hasArchivedWorkflow = ARCHIVED_WESTERN_WORKFLOW_UUIDS.has(work.templateUuid);
    const archivedDetailHref = localizedWorkPath(work.templateUuid, "en-US");
    const archivedProcessHref = hasArchivedWorkflow ? showcaseCanvasImportHref(work.templateUuid) : undefined;
    const detailHref = archivedDetailHref ?? `/detail/${work.templateUuid}`;
    return {
        id: `western-${String(work.rank).padStart(2, "0")}-${work.templateUuid}`,
        title: work.title,
        author: work.originalAuthor,
        originalAuthorId: work.originalAuthorId,
        sourcePlatform: work.sourcePlatform,
        originalPublishAt: work.originalPublishAt,
        description: work.description || work.proposedCategory,
        src: work.coverPath,
        cardSrc: westernImageVariant(work.coverPath, "covers-640"),
        heroSrc: westernImageVariant(work.coverPath, "covers-1920"),
        videoSrc: work.videoPath ?? "",
        previewVideoSrc: homePreviewVideoPath(work.videoPath ?? ""),
        templateUuid: work.templateUuid,
        detailHref,
        // 未归档工作流的案例链到可索引的详情页；/showcase/canvas 预览页是 noindex 的空壳，不能作为首页内链。
        processHref: archivedProcessHref ?? detailHref,
        processLabel: hasArchivedWorkflow ? "openCanvas" : "viewInfo",
        categories: categoriesFor(work.proposedCategory),
        creatorBadge: creatorBadgeFor(work),
        requestedFirstScreenFixed: work.requestedFirstScreenFixed,
    };
});

export function localizedWesternHomeShows(locale: BlogLocale) {
    return WESTERN_HOME_SHOWS.map((item) => {
        const localized = getLocalizedShowcase(item.templateUuid, item.title, item.description, locale);
        return {
            ...item,
            ...localized,
            author: item.author || sourceLabel(locale),
            detailHref: localizedWorkPath(item.templateUuid, locale) ?? item.detailHref,
            processHref: item.processLabel === "openCanvas" ? item.processHref : localizedWorkPath(item.templateUuid, locale) ?? item.processHref,
            searchText: [localized.title, localized.description, item.title, item.description, item.author || sourceLabel(locale)].join(" ").toLocaleLowerCase(locale),
        };
    });
}

function sourceLabel(locale: BlogLocale) {
    const labels: Record<BlogLocale, string> = {
        "zh-CN": "精选作品", "zh-HK": "精選作品", "zh-TW": "精選作品",
        "en-US": "Featured work", "ja-JP": "注目作品", "ko-KR": "추천 작품",
        "es-ES": "Obra destacada", "pt-BR": "Obra em destaque",
    };
    return labels[locale];
}

/**
 * Resized WebP copies generated next to the originals by
 * scripts/build-western-image-variants.py. Other paths are returned unchanged,
 * except local showcase PNG covers, whose card copy is `<name>-640.webp`.
 */
export function westernImageVariant(path: string, variant: "covers-640" | "covers-1920" | "avatars-96") {
    // Locally hosted showcase covers ship a 640px WebP card copy next to the original.
    const localCover = /^\/showcase\/covers\/([^/]+)\.png$/i.exec(path);
    if (localCover) return variant === "covers-640" ? `/showcase/covers/${localCover[1]}-640.webp` : path;
    const match = /^\/liblib-clone\/western-opening\/(covers|avatars)\/([^/]+)\.[a-z0-9]+$/i.exec(path);
    if (!match || (variant === "avatars-96") !== (match[1] === "avatars")) return path;
    return `/liblib-clone/western-opening/${variant}/${match[2]}.webp`;
}

function creatorBadgeFor(work: ResearchWork): WesternCreatorBadgeKind {
    if (work.rank === 34 || /比赛|挑战赛|获奖|入选/.test(work.description)) return "challenge";
    if (/minimaxH3|sd2\.5|Seedance\s*2\.5|工作流|直出|workflow/i.test(`${work.proposedCategory} ${work.description}`)) return "workflow";
    if ([12, 14].includes(work.rank) || work.requestedFirstScreenFixed && /精选|专业/.test(work.proposedCategory)) return "featured";
    if (/电影|人像|意识|悬疑|叙事|哲思|治愈|戏曲|角色/.test(work.proposedCategory)) return "director";
    if (/广告|产品|汽车|美妆|香水|时尚|商业|4K|胶片|未来|3D|奇幻|动漫/.test(work.proposedCategory)) return "visual";
    if (work.requestedFirstScreenFixed || /精选|专业/.test(work.proposedCategory)) return "featured";
    return "community";
}

function categoriesFor(category: string): WesternHomeCategory[] {
    if (/广告|产品|汽车|美妆|香水|时尚|商业/.test(category)) return ["商业广告", "精选画布"];
    if (/音乐|MV|偶像/.test(category)) return ["Seedance 2.5", "专业影视"];
    if (/动漫|3D|角色|奇幻|未来|戏曲/.test(category)) return ["动漫游戏", "精选画布"];
    if (/叙事|悬疑|温情|治愈/.test(category)) return ["短剧漫剧", "专业影视"];
    if (/电影|影像|意识|实验|超现实|4K|胶片|动作复刻/.test(category)) return ["专业影视", "精选画布"];
    return ["教育生活", "精选画布"];
}
