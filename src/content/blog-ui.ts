import type { BlogLocale } from "./blog-locales";

export type BlogUI = {
    read: string;
    takeaways: string;
    guide: string;
    compare: string;
    models: string;
    news: string;
    series: string;
    step: string;
    previous: string;
    next: string;
    copy: string;
    copied: string;
    copyError: string;
    close: string;
    zoom: string;
    tip: string;
    warning: string;
    all: string;
    viewAll: string;
    featured: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaAction: string;
    firstStep: string;
    lastStep: string;
    articlesCount: string;
    stepUnit: string;
};

export const BLOG_UI: Record<BlogLocale, BlogUI> = {
    "zh-CN": {
        read: "{n} 分钟阅读",
        takeaways: "核心要点",
        guide: "产品教程",
        compare: "工具对比",
        models: "行业与模型",
        news: "官方动态",
        series: "系列",
        step: "第 {n}/{total} 步",
        previous: "上一步",
        next: "下一步",
        copy: "复制",
        copied: "已复制",
        copyError: "复制失败，请手动复制",
        close: "关闭",
        zoom: "点击放大",
        tip: "提示",
        warning: "注意",
        all: "全部",
        viewAll: "查看全部",
        featured: "精选推荐",
        ctaTitle: "在画布里打开这个案例",
        ctaSubtitle: "进入 DramaCanvas 创作工作区，在节点画布中尝试本篇教程的操作。",
        ctaAction: "在画布里打开",
        firstStep: "已是第一步",
        lastStep: "已是最后一步",
        articlesCount: "{n} 篇文章",
        stepUnit: "步",
    },
    "zh-HK": {
        read: "{n} 分鐘閱讀",
        takeaways: "核心要點",
        guide: "產品教程",
        compare: "工具對比",
        models: "行業與模型",
        news: "官方動態",
        series: "系列",
        step: "第 {n}/{total} 步",
        previous: "上一步",
        next: "下一步",
        copy: "複製",
        copied: "已複製",
        copyError: "複製失敗，請手動複製",
        close: "關閉",
        zoom: "點擊放大",
        tip: "提示",
        warning: "注意",
        all: "全部",
        viewAll: "查看全部",
        featured: "精選推薦",
        ctaTitle: "在畫布裡打開這個案例",
        ctaSubtitle: "進入 DramaCanvas 創作工作區，在節點畫布中嘗試本篇教學的操作。",
        ctaAction: "在畫布裡打開",
        firstStep: "已是第一步",
        lastStep: "已是最後一步",
        articlesCount: "{n} 篇文章",
        stepUnit: "步",
    },
    "zh-TW": {
        read: "{n} 分鐘閱讀",
        takeaways: "核心要點",
        guide: "產品教程",
        compare: "工具對比",
        models: "行業與模型",
        news: "官方動態",
        series: "系列",
        step: "第 {n}/{total} 步",
        previous: "上一步",
        next: "下一步",
        copy: "複製",
        copied: "已複製",
        copyError: "複製失敗，請手動複製",
        close: "關閉",
        zoom: "點擊放大",
        tip: "提示",
        warning: "注意",
        all: "全部",
        viewAll: "查看全部",
        featured: "精選推薦",
        ctaTitle: "在畫布裡打開這個案例",
        ctaSubtitle: "進入 DramaCanvas 創作工作區，在節點畫布中嘗試本篇教學的操作。",
        ctaAction: "在畫布裡打開",
        firstStep: "已是第一步",
        lastStep: "已是最後一步",
        articlesCount: "{n} 篇文章",
        stepUnit: "步",
    },
    "en-US": {
        read: "{n} min read",
        takeaways: "Key Takeaways",
        guide: "Guides",
        compare: "Comparisons",
        models: "Industry & Models",
        news: "Updates",
        series: "Series",
        step: "Step {n}/{total}",
        previous: "Previous",
        next: "Next",
        copy: "Copy",
        copied: "Copied",
        copyError: "Copy failed. Please copy manually",
        close: "Close",
        zoom: "Enlarge image",
        tip: "Tip",
        warning: "Warning",
        all: "All",
        viewAll: "View all",
        featured: "Featured",
        ctaTitle: "Open this project in Canvas",
        ctaSubtitle: "Jump into the DramaCanvas workspace and try this workflow directly on your node board.",
        ctaAction: "Open in Canvas",
        firstStep: "First step in series",
        lastStep: "End of series",
        articlesCount: "{n} articles",
        stepUnit: "steps",
    },
    "ja-JP": {
        read: "読了まで {n} 分",
        takeaways: "重要なポイント",
        guide: "製品ガイド",
        compare: "ツール比較",
        models: "業界動向・モデル",
        news: "公式アップデート",
        series: "シリーズ",
        step: "ステップ {n}/{total}",
        previous: "前へ",
        next: "次へ",
        copy: "コピー",
        copied: "コピーしました",
        copyError: "コピーできません。手動でコピーしてください",
        close: "閉じる",
        zoom: "画像を拡大",
        tip: "ヒント",
        warning: "注意",
        all: "すべて",
        viewAll: "すべて見る",
        featured: "注目記事",
        ctaTitle: "キャンバスでこの事例を開く",
        ctaSubtitle: "DramaCanvas ワークスペースで、本チュートリアルのノード連携を体験できます。",
        ctaAction: "キャンバスを開く",
        firstStep: "最初のステップ",
        lastStep: "最後のステップ",
        articlesCount: "{n} 件の記事",
        stepUnit: "ステップ",
    },
    "ko-KR": {
        read: "{n}분 읽기",
        takeaways: "핵심 요약",
        guide: "제품 튜토리얼",
        compare: "도구 비교",
        models: "업계 및 모델",
        news: "공식 소식",
        series: "시리즈",
        step: "{n}/{total} 단계",
        previous: "이전",
        next: "다음",
        copy: "복사",
        copied: "복사됨",
        copyError: "복사 실패. 직접 복사해 주세요",
        close: "닫기",
        zoom: "이미지 확대",
        tip: "팁",
        warning: "주의",
        all: "전체",
        viewAll: "전체 보기",
        featured: "추천 가이드",
        ctaTitle: "캔버스에서 이 사례 열기",
        ctaSubtitle: "DramaCanvas 워크스페이스에서 튜토리얼 워크플로를 노드 보드로 바로 시작하세요.",
        ctaAction: "캔버스에서 열기",
        firstStep: "첫 번째 단계",
        lastStep: "마지막 단계",
        articlesCount: "{n}개의 글",
        stepUnit: "단계",
    },
    "es-ES": {
        read: "{n} min de lectura",
        takeaways: "Puntos clave",
        guide: "Guías de producto",
        compare: "Comparativas",
        models: "Industria y modelos",
        news: "Actualizaciones oficiales",
        series: "Serie",
        step: "Paso {n}/{total}",
        previous: "Anterior",
        next: "Siguiente",
        copy: "Copiar",
        copied: "Copiado",
        copyError: "Error al copiar. Copia manualmente",
        close: "Cerrar",
        zoom: "Ampliar imagen",
        tip: "Consejo",
        warning: "Atención",
        all: "Todos",
        viewAll: "Ver todos",
        featured: "Destacados",
        ctaTitle: "Abrir este ejemplo en el lienzo",
        ctaSubtitle: "Entra al espacio de trabajo de DramaCanvas y prueba este flujo de nodos paso a paso.",
        ctaAction: "Abrir en lienzo",
        firstStep: "Primer paso de la serie",
        lastStep: "Fin de la serie",
        articlesCount: "{n} artículos",
        stepUnit: "pasos",
    },
    "pt-BR": {
        read: "{n} min de leitura",
        takeaways: "Pontos principais",
        guide: "Guias de produto",
        compare: "Comparações",
        models: "Indústria e modelos",
        news: "Atualizações oficiais",
        series: "Série",
        step: "Passo {n}/{total}",
        previous: "Anterior",
        next: "Próximo",
        copy: "Copiar",
        copied: "Copiado",
        copyError: "Falha ao copiar. Copie manualmente",
        close: "Fechar",
        zoom: "Ampliar imagem",
        tip: "Dica",
        warning: "Atenção",
        all: "Todos",
        viewAll: "Ver todos",
        featured: "Destaques",
        ctaTitle: "Abrir este projeto no canvas",
        ctaSubtitle: "Acesse o espaço de trabalho do DramaCanvas e experimente este fluxo diretamente no quadro de nós.",
        ctaAction: "Abrir no canvas",
        firstStep: "Primeiro passo da série",
        lastStep: "Fim da série",
        articlesCount: "{n} artigos",
        stepUnit: "passos",
    },
};

export type AuthorId = "admin-team" | "luma-veylo" | "nori-quenva" | "tavi-orvex" | "sora-nelvo" | "elia-vunaro";

export interface BlogAuthorInfo {
    id: AuthorId;
    name: string;
    initials: string;
    colorToken: string;
    avatarSrc?: string;
}

export const BLOG_AUTHORS: Record<AuthorId, { names: Record<BlogLocale, string>; avatarSrc?: string }> = {
    "admin-team": {
        names: {
            "zh-CN": "管理团队",
            "zh-HK": "管理團隊",
            "zh-TW": "管理團隊",
            "en-US": "Admin Team",
            "ja-JP": "運営チーム",
            "ko-KR": "운영팀",
            "es-ES": "Admin Team",
            "pt-BR": "Admin Team",
        },
    },
    "luma-veylo": {
        avatarSrc: "/blog-media/authors/luma-veylo.svg",
        names: {
            "zh-CN": "露玛·维洛",
            "zh-HK": "露瑪·維洛",
            "zh-TW": "露瑪·維洛",
            "en-US": "Luma Veylo",
            "ja-JP": "ルマ・ヴェイロ",
            "ko-KR": "루마 베일로",
            "es-ES": "Luma Veylo",
            "pt-BR": "Luma Veylo",
        },
    },
    "nori-quenva": {
        avatarSrc: "/blog-media/authors/nori-quenva.svg",
        names: {
            "zh-CN": "诺里·昆瓦",
            "zh-HK": "諾里·昆瓦",
            "zh-TW": "諾里·昆瓦",
            "en-US": "Nori Quenva",
            "ja-JP": "ノリ・クエンヴァ",
            "ko-KR": "노리 퀜바",
            "es-ES": "Nori Quenva",
            "pt-BR": "Nori Quenva",
        },
    },
    "tavi-orvex": {
        avatarSrc: "/blog-media/authors/tavi-orvex.svg",
        names: {
            "zh-CN": "塔维·奥维克斯",
            "zh-HK": "塔維·奧維克斯",
            "zh-TW": "塔維·奧維克斯",
            "en-US": "Tavi Orvex",
            "ja-JP": "タヴィ・オルヴェクス",
            "ko-KR": "타비 오르벡스",
            "es-ES": "Tavi Orvex",
            "pt-BR": "Tavi Orvex",
        },
    },
    "sora-nelvo": {
        avatarSrc: "/blog-media/authors/sora-nelvo.svg",
        names: {
            "zh-CN": "索拉·内尔沃",
            "zh-HK": "索拉·內爾沃",
            "zh-TW": "索拉·內爾沃",
            "en-US": "Sora Nelvo",
            "ja-JP": "ソラ・ネルヴォ",
            "ko-KR": "소라 넬보",
            "es-ES": "Sora Nelvo",
            "pt-BR": "Sora Nelvo",
        },
    },
    "elia-vunaro": {
        avatarSrc: "/blog-media/authors/elia-vunaro.svg",
        names: {
            "zh-CN": "艾莉娅·武纳罗",
            "zh-HK": "艾莉婭·武納羅",
            "zh-TW": "艾莉婭·武納羅",
            "en-US": "Elia Vunaro",
            "ja-JP": "エリア・ヴナロ",
            "ko-KR": "엘리아 부나로",
            "es-ES": "Elia Vunaro",
            "pt-BR": "Elia Vunaro",
        },
    },
};

export function resolveBlogAuthor(authorRaw?: string, locale: BlogLocale = "zh-CN"): BlogAuthorInfo {
    const raw = (authorRaw ?? "").toLowerCase().trim();
    let id: AuthorId = "admin-team";
    if (raw.includes("luma") || raw.includes("露玛") || raw.includes("露瑪") || raw.includes("ルマ") || raw.includes("루마")) {
        id = "luma-veylo";
    } else if (raw.includes("nori") || raw.includes("诺里") || raw.includes("諾里") || raw.includes("ノリ") || raw.includes("노리")) {
        id = "nori-quenva";
    } else if (raw.includes("tavi") || raw.includes("塔维") || raw.includes("塔維") || raw.includes("タヴィ") || raw.includes("타비")) {
        id = "tavi-orvex";
    } else if (raw.includes("sora") || raw.includes("索拉") || raw.includes("ソラ") || raw.includes("소라")) {
        id = "sora-nelvo";
    } else if (raw.includes("elia") || raw.includes("艾莉") || raw.includes("エリア") || raw.includes("엘리아")) {
        id = "elia-vunaro";
    } else if (raw === "admin-team" || raw.includes("admin") || raw.includes("管理团队") || raw.includes("管理團隊") || raw.includes("運営チーム") || raw.includes("운영팀") || raw.includes("dramacanvas") || raw.includes("团队")) {
        id = "admin-team";
    }
    const record = BLOG_AUTHORS[id];
    const colors = ["--palette-node-frame", "--palette-node-audio", "--palette-node-script", "--palette-node-image", "--palette-node-video", "--palette-node-character"];
    const hash = [...id].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
    const name = record.names[locale] ?? record.names["zh-CN"];
    return {
        id,
        name,
        initials: /^\p{Script=Latin}/u.test(name)
            ? name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => [...word][0])
                  .join("")
                  .toLocaleUpperCase(locale)
            : [...name][0],
        colorToken: colors[hash % colors.length],
        avatarSrc: record.avatarSrc,
    };
}

export const readingLabel = (locale: BlogLocale, minutes: number) => BLOG_UI[locale].read.replace("{n}", String(minutes));
export const seriesStepLabel = (locale: BlogLocale, series: { index: number; total: number }) => BLOG_UI[locale].step.replace("{n}", String(series.index)).replace("{total}", String(series.total));
export const articlesCountLabel = (locale: BlogLocale, count: number) => BLOG_UI[locale].articlesCount.replace("{n}", String(count));

export const BLOG_READING_UI: Record<BlogLocale, { readNow: string; toc: string; previous: string; next: string; related: string; progress: string; tryCanvas: string }> = {
    "zh-CN": { readNow: "立即阅读", toc: "本页目录", previous: "上一篇", next: "下一篇", related: "相关文章", progress: "阅读进度", tryCanvas: "在画布里试试" },
    "zh-HK": { readNow: "立即閱讀", toc: "本頁目錄", previous: "上一篇", next: "下一篇", related: "相關文章", progress: "閱讀進度", tryCanvas: "在畫布裡試試" },
    "zh-TW": { readNow: "立即閱讀", toc: "本頁目錄", previous: "上一篇", next: "下一篇", related: "相關文章", progress: "閱讀進度", tryCanvas: "在畫布裡試試" },
    "en-US": { readNow: "Read now", toc: "On this page", previous: "Previous article", next: "Next article", related: "Discover more", progress: "Reading progress", tryCanvas: "Try it in Canvas" },
    "ja-JP": { readNow: "今すぐ読む", toc: "このページの目次", previous: "前の記事", next: "次の記事", related: "関連記事", progress: "読書の進捗", tryCanvas: "キャンバスで試す" },
    "ko-KR": { readNow: "지금 읽기", toc: "페이지 목차", previous: "이전 글", next: "다음 글", related: "관련 글", progress: "읽기 진행률", tryCanvas: "캔버스에서 시작하기" },
    "es-ES": { readNow: "Leer ahora", toc: "En esta página", previous: "Artículo anterior", next: "Artículo siguiente", related: "Artículos relacionados", progress: "Progreso de lectura", tryCanvas: "Pruébalo en el lienzo" },
    "pt-BR": { readNow: "Leia agora", toc: "Nesta página", previous: "Artigo anterior", next: "Próximo artigo", related: "Artigos relacionados", progress: "Progresso da leitura", tryCanvas: "Experimente no canvas" },
};
