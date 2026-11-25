import type { BlogLocale } from "./blog-locales";

export type PublicAuthor = { name: string; url: string };
export type OperatorProfile = { legalName?: string; founder?: PublicAuthor; location?: string; background?: string };
// Only populate with owner-supplied, publicly verifiable facts. Empty fields never render.
// Owner-confirmed (2026-10-13): operating company and the author of the guides.
const ECHO: PublicAuthor = { name: "DramaCanvas contributors", url: "https://github.com/echoD886/dramacanva" };
export const OPERATOR_PROFILE: OperatorProfile = {};
// Owner-confirmed official account (already public before the rename).
export const OFFICIAL_SOCIAL_LINKS: string[] = [];
export const OFFICIAL_TWITTER_HANDLE: string | undefined = undefined;
// Per-article overrides; every other guide is written by Echo.
export const ARTICLE_AUTHORS: Record<string, PublicAuthor> = {};
export const articleAuthor = (slug: string): PublicAuthor => ARTICLE_AUTHORS[slug] ?? ECHO;
export function visibleArticleAuthor(slug: string, authoredName?: string) {
    if (authoredName?.trim()) return { name: authoredName, url: "/about", kind: "Organization" as const };
    const author = articleAuthor(slug);
    return author.name.trim() && author.url.trim() ? { ...author, kind: "Person" as const } : { name: "DramaCanvas 团队", url: "/about", kind: "Organization" as const };
}
export const ABOUT_HELP_LABELS: Record<BlogLocale, string> = {
    "zh-CN": "帮助",
    "zh-HK": "幫助",
    "zh-TW": "說明",
    "en-US": "Help",
    "ja-JP": "ヘルプ",
    "ko-KR": "도움말",
    "es-ES": "Ayuda",
    "pt-BR": "Ajuda",
};

export const TRUST_LABELS: Record<BlogLocale, { about: string; policy: string; editorial: string; published: string; updated: string; contact: string; updates: string }> = {
    "zh-CN": { about: "关于 DramaCanvas：无限画布上的 AI 影视创作平台", policy: "内容与编辑政策", editorial: "DramaCanvas 编辑部", published: "发布", updated: "更新", contact: "联系方式", updates: "更新记录" },
    "zh-HK": { about: "關於 DramaCanvas：無限畫布上的 AI 影視創作平台", policy: "內容與編輯政策", editorial: "DramaCanvas 編輯部", published: "發佈", updated: "更新", contact: "聯絡方式", updates: "更新記錄" },
    "zh-TW": { about: "關於 DramaCanvas：無限畫布上的 AI 影視創作平台", policy: "內容與編輯政策", editorial: "DramaCanvas 編輯部", published: "發布", updated: "更新", contact: "聯絡方式", updates: "更新紀錄" },
    "en-US": { about: "About DramaCanvas: AI Filmmaking on an Infinite Canvas", policy: "Content and editorial policy", editorial: "DramaCanvas Editorial", published: "Published", updated: "Updated", contact: "Contact", updates: "Updates" },
    "ja-JP": { about: "DramaCanvasについて：無限キャンバスのAI映像制作プラットフォーム", policy: "コンテンツ・編集方針", editorial: "DramaCanvas 編集部", published: "公開", updated: "更新", contact: "お問い合わせ", updates: "更新履歴" },
    "ko-KR": { about: "DramaCanvas 소개: 무한 캔버스 기반 AI 영상 제작 플랫폼", policy: "콘텐츠 및 편집 정책", editorial: "DramaCanvas 편집부", published: "게시", updated: "수정", contact: "문의", updates: "업데이트 기록" },
    "es-ES": { about: "Sobre DramaCanvas: plataforma de cine con IA en un lienzo infinito", policy: "Política de contenido y edición", editorial: "Redacción de DramaCanvas", published: "Publicado", updated: "Actualizado", contact: "Contacto", updates: "Actualizaciones" },
    "pt-BR": { about: "Sobre o DramaCanvas: plataforma de criação de filmes com IA em canvas infinito", policy: "Política de conteúdo e edição", editorial: "Redação do DramaCanvas", published: "Publicado", updated: "Atualizado", contact: "Contato", updates: "Atualizações" },
};
