import type { BlogLocale } from "../content/blog-locales";
import { PUBLIC_MARKET_COPY } from "./public-market-copy";
import { SIGNUP_CREDITS_COPY } from "./signup-credits-copy";

/** Editorial source shared by visible copy, metadata, JSON-LD and public Markdown.
 * Public claims describe supported workflows, not unverified market-first comparisons.
 * Free planning and zero markup do not waive workspace or provider charges.
 */
export interface HomePositioning {
    h1: string;
    title: string;
    description: string;
    keywords: string;
    question: string;
    answer: string;
    usageNote: string;
    imageRole: string;
    videoRole: string;
    agentSentence: string;
    intro?: string;
}

const chinese = {
    agentSentence: "在 DramaCanvas 内可直接使用内置 AI Agent。MCP 是可选的外部集成，支持 Claude Code、Codex、Cursor 等外部工具连接画布。",
    h1: "免费 AI 短剧与影视创作平台",
    title: "免费 AI 短剧制作与 AI 影视创作平台 | DramaCanvas",
    description: "使用 DramaCanvas 创作 AI 短剧。在无限画布上规划故事，使用 AI 积分生成画面，并通过内置 Agent 完善视频。免费开始。",
    keywords: "免费AI短剧制作, AI短剧平台, AI影视创作平台, AI视频生成, AI分镜, 无限画布, 内置Agent, 可灵, 即梦",
    question: "DramaCanvas 是什么？",
    intro: "DramaCanvas 是一个可免费开始使用的 AI 影视创作平台，适用于短剧、短片、音乐视频、广告与创意视频。把故事、角色、参考素材、分镜、音频与声音参考、剪辑集中在无限画布上，结合手动控制、AI 生成与内置制作 Agent，将创意转化为可导出的成片。",
    answer: "DramaCanvas 是一个可免费开始使用的 AI 影视创作平台，适用于短剧、短片、音乐视频、广告与创意视频。把故事、角色、参考素材、分镜、音频与声音参考、剪辑集中在无限画布上，结合手动控制、AI 生成与内置制作 Agent，将创意转化为可导出的成片。",
    usageNote: "手动写剧本与手动编辑分镜完全免费。AI 生成剧本、AI 分镜、图片和视频均按所选任务与模型扣除积分；Agent 任务按其实际执行的收费操作计费，没有单独的 Agent 服务费。生成前显示的积分为最终扣费，生成失败退回积分。使用自备 API Key（BYOK）时，模型费用由您的服务商直接收取，平台另收工作空间服务费。",
    imageRole: "Nano Banana：生成角色参考图、角色三面图和分镜图。",
    videoRole: "Seedance 2.5：结合首尾帧与运镜设置，生成视频镜头。",
} satisfies HomePositioning;

const english = {
    agentSentence: "Use the built-in AI Agent directly in DramaCanvas. MCP is an optional integration for external tools such as Claude Code, Codex, and Cursor.",
    h1: "Free AI Film Maker for Short Dramas",
    title: "Free AI Film Maker for Short Dramas | DramaCanvas",
    description: "Create short dramas with DramaCanvas. Plan on an infinite canvas, generate with AI credits, and refine videos with the built-in Agent. Free to start.",
    keywords: "free ai film maker, ai video generator, ai filmmaking, micro drama, ai short dramas, seedance, kling",
    intro: "DramaCanvas is a free-to-start AI filmmaking platform for short dramas, films, music videos, commercials, and creative videos. Bring your script, characters, references, storyboards, video scenes, audio and sound references, and timeline edits together on an infinite canvas. Combine manual control, AI generation, and the built-in production Agent to develop your project from idea to finished video.",
    question: "What is DramaCanvas?",
    answer: "DramaCanvas is a free-to-start AI filmmaking platform for short dramas, films, music videos, commercials, and creative videos. Bring your script, characters, references, storyboards, video scenes, audio and sound references, and timeline edits together on an infinite canvas. Combine manual control, AI generation, and the built-in production Agent to develop your project from idea to finished video.",
    usageNote:
        "Manual scriptwriting and storyboard editing are free. AI-generated scripts, storyboards, images, and videos use credits according to the selected task and model. Agent tasks are billed for the chargeable operations they perform, with no separate Agent service fee. Confirmed credits are displayed before generation, and credits are returned to your balance if generation fails. With supported BYOK connections, your model provider bills API usage directly, and DramaCanvas workspace service is billed separately.",
    imageRole: "Nano Banana: character references, storyboard artwork and shot visuals.",
    videoRole: "Seedance 2.5: first/last frames, camera motion and video generation.",
} satisfies HomePositioning;

export const HOME_POSITIONING: Record<BlogLocale, HomePositioning> = {
    "zh-CN": chinese,
    "zh-HK": { ...PUBLIC_MARKET_COPY["zh-HK"].home },
    "zh-TW": { ...PUBLIC_MARKET_COPY["zh-TW"].home },
    "en-US": english,
    "ja-JP": { ...PUBLIC_MARKET_COPY["ja-JP"].home },
    "ko-KR": { ...PUBLIC_MARKET_COPY["ko-KR"].home },
    "es-ES": { ...PUBLIC_MARKET_COPY["es-ES"].home },
    "pt-BR": { ...PUBLIC_MARKET_COPY["pt-BR"].home },
};

const localized: Partial<Record<BlogLocale, Partial<HomePositioning>>> = {
    "zh-HK": {
        h1: "免費 AI 短劇與影視創作平台",
        title: "免費 AI 短劇製作與 AI 影視創作平台 | DramaCanvas",
        description: "使用 DramaCanvas 創作 AI 短劇。在無限畫布上規劃故事，使用 AI 積分生成畫面，並透過內建 Agent 完善影片。免費開始。",
        keywords: "免費AI短劇製作, AI生成影片, AI短劇平台, AI影視創作平台, AI分鏡, 無限畫布, 內建Agent, 可靈, 即夢",
        intro: "DramaCanvas 是一個可免費開始使用的 AI 影視創作平台，適用於短劇、短片、音樂影片、廣告與創意影片。把故事、角色、參考素材、分鏡、音頻與聲音參考、剪輯集中在無限畫布上，結合手動控制、AI 生成與內建製作 Agent，將創意轉化為可匯出的成片。",
    },
    "zh-TW": {
        h1: "免費 AI 短劇與影視創作平台",
        title: "免費 AI 短劇製作與 AI 影視創作平台 | DramaCanvas",
        description: "使用 DramaCanvas 創作 AI 短劇。在無限畫布上規劃故事，使用 AI 點數生成畫面，並透過內建 Agent 完善影片。免費開始。",
        keywords: "免費AI短劇製作, AI短劇平台, AI影視創作平台, AI影片生成, AI分鏡腳本, 無限畫布, 內建Agent, 可靈, 即夢",
        intro: "DramaCanvas 是一款可免費開始使用的 AI 影視創作平台，適用於短劇、短片、音樂錄影帶、廣告與創意影片。把故事、角色、參考素材、分鏡、音訊與聲音參考、剪輯集中在無限畫布上，結合手動控制、AI 生成與內建製作 Agent，將創意轉化為可匯出的成片。",
    },
    "ja-JP": {
        h1: "ショートドラマ制作向け無料AI映像制作ツール",
        title: "ショートドラマ制作向け無料AI映像制作ツール | DramaCanvas",
        description: "DramaCanvasでショートドラマを制作。無限キャンバスで構想し、AIクレジットで生成、内蔵Agentで映像を仕上げます。無料でお試し可能。",
        keywords: "動画生成AI, ショートドラマ制作, 画像から動画, AI映像制作, AI絵コンテ, 無限キャンバス, 内蔵Agent, Kling, Seedance",
        intro: "DramaCanvasは、ショートドラマ、短編映画、ミュージックビデオ、CM、クリエイティブ動画の制作に対応した、無料から始められるAI映像制作プラットフォームです。ストーリー、キャラクター、参考資料、シーン、音声や音声リファレンス、編集をひとつの無限キャンバスに集約。手動操作、AI生成、内蔵制作Agentを組み合わせ、アイデアから完成映像まで作り上げることができます。",
    },
    "ko-KR": {
        h1: "숏폼 드라마를 위한 무료 AI 영상 제작 플랫폼",
        title: "숏폼 드라마를 위한 무료 AI 영상 제작 툴 | DramaCanvas",
        description: "DramaCanvas로 숏폼 드라마를 제작하세요. 무한 캔버스에서 기획하고, AI 크레딧으로 생성하며, 내장 에이전트로 영상을 완성할 수 있습니다. 무료로 시작하세요.",
        keywords: "무료 AI 영상 제작, AI 동영상 만들기, 숏드라마, AI 영화 제작, AI 스토리보드, 무한 캔버스, 내장 에이전트, 클링, Seedance",
        intro: "DramaCanvas는 숏폼 드라마, 단편 영화, 뮤직비디오, 광고 및 크리에이티브 영상을 위한 무료 시작 AI 영상 제작 플랫폼입니다. 스토리, 캐릭터, 참고 자료, 장면, 오디오 및 음성 레퍼런스, 편집을 하나의 무한 캔버스에서 통합 관리하세요. 수동 편집, AI 생성, 내장 제작 에이전트를 결합하여 아이디어 구상부터 완성 영상 내보내기까지 프로젝트를 발전시킬 수 있습니다.",
    },
    "es-ES": {
        h1: "Creador de cine con IA gratis para series cortas",
        title: "Creador de cine con IA gratis | DramaCanvas",
        description: "Crea series cortas con DramaCanvas. Planifica en un lienzo infinito, genera con créditos de IA y perfecciona tus vídeos con el Agent integrado. Empieza gratis.",
        keywords: "creador de cine con ia gratis, crear videos con ia, series cortas, storyboard ia, generador de video ia, lienzo infinito, agent ia",
        intro: "DramaCanvas es una plataforma de cine con IA para empezar gratis, pensada para series cortas, cortos, vídeos musicales, anuncios y proyectos creativos. Reúne tu historia, personajes, referencias, planos, audio, referencias de sonido y edición en un lienzo infinito. Combina el control manual, la generación con IA y el Agent de producción integrado para llevar tu proyecto desde la idea inicial hasta el vídeo final.",
    },
    "pt-BR": {
        h1: "Criador de filmes com IA grátis para novelas verticais",
        title: "Criador de filmes com IA grátis | DramaCanvas",
        description: "Crie novelas verticais com o DramaCanvas. Planeje em um canvas infinito, gere com créditos de IA e aperfeiçoe vídeos com o Agent integrado. Comece grátis.",
        keywords: "criador de filmes com ia gratis, criar video com ia, novela vertical, minisséries, storyboard ia, gerador de video ia, canvas infinito, agent ia",
        intro: "O DramaCanvas é uma plataforma de criação de filmes com IA para começar grátis, ideal para novelas verticais, curtas-metragens, videoclipes, comerciais e vídeos criativos. Reúna história, personagens, referências, cenas, áudio, referências sonoras e edição em um canvas infinito. Combine controle manual, geração por IA e o Agent de produção integrado para transformar ideias em vídeos finalizados.",
    },
};
for (const [locale, copy] of Object.entries(localized)) Object.assign(HOME_POSITIONING[locale as BlogLocale], copy);
for (const locale of Object.keys(HOME_POSITIONING) as BlogLocale[]) {
    const copy = HOME_POSITIONING[locale];
    copy.intro ??= copy.description;
    // Lead with the signup credits so readers and AI assistants learn AI generation can be tried for free.
    copy.usageNote = `${SIGNUP_CREDITS_COPY[locale].lead}${/^(zh|ja)/.test(locale) ? "" : " "}${copy.usageNote}`;
    // The answer is the plain definition; pricing lives in usageNote so the homepage FAQ never repeats it.
    if (locale !== "en-US") copy.answer = copy.intro;
}
HOME_POSITIONING["en-US"].answer =
    "DramaCanvas is a free-to-start AI filmmaking platform for short dramas, films, music videos, commercials, and creative videos. Bring your script, characters, references, storyboards, video scenes, and timeline edits together on an infinite canvas. Combine manual control, AI generation, and the built-in production Agent to develop your project from idea to finished video.";
export const FILM_MAKER_DESCRIPTION = HOME_POSITIONING["en-US"].answer;
