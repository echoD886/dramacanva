import type { BlogLocale } from "./blog-locales";
import { KLING4_COPY } from "./kling4-copy";

// Native search terms per market, chosen from Google Ads volumes (DataForSEO, 2026-10-12):
// local model names (ソラ2, 나노바나나, 클링, 可灵/可靈, 即梦/即夢, 海螺 AI, 通义万相) and local
// modifiers (無料/使い方/料金, 무료/사용법/가격, gratis/precio, grátis/preço, 免费/教程/价格).
// These are written per market, not translated from English.
export interface NativeModelSEO {
    title: string;
    description: string;
    h1: string;
    keywords: string;
}
type NativeLocale = BlogLocale;

export const NATIVE_MODEL_SEO: Record<string, Record<NativeLocale, NativeModelSEO>> = {
    "kling-4": KLING4_COPY,
    "seedance-2-0": {
        "en-US": {
            title: "Seedance 2.0 AI Video Generator | DramaCanvas",
            description: "Fast-track video scenes using Seedance 2.0 Fast and HC modes. Lay out your storyboards on a free canvas, preview ideas, and use credits for completed shots.",
            h1: "Seedance 2.0 AI Video Generator",
            keywords: "Seedance 2.0, Seedance 2.0 AI video generator, Seedance 2.0 Fast, Seedance 2.0 Mini, AI video generator, micro drama, Seedance 2.0 free, Seedance 2.0 online, Seedance 2.0 API",
        },
        "zh-CN": {
            title: "即梦同款 Seedance 2.0 | DramaCanvas",
            description: "调用字节跳动即梦同款 Seedance 2.0 视频模型，在线生成动作自然的短剧镜头，支持 Fast 与 Mini 版本。画布规划镜头免费，生成按积分结算，附完整价格与教程。",
            h1: "即梦同款 Seedance 2.0 视频生成",
            keywords: "Seedance 2.0, Seedance 2.0 免费, Seedance 2.0 教程, Seedance 2.0 价格, 即梦, 即梦 AI, AI 视频生成, AI 短剧",
        },
        "zh-HK": {
            title: "Seedance 2.0 影片生成 | DramaCanvas",
            description: "製作短劇想用即夢同款模型？你可以在畫布直接調用 Seedance 2.0，支援 Fast、Mini 與 HC 版本。排布分鏡卡片後即可生成連貫動作，附教學指引，免費開始排版。",
            h1: "Seedance 2.0 網上 AI 短劇影片生成",
            keywords: "Seedance 2.0, Seedance 2.0 教學, Seedance 2.0 免費, 即夢, 即夢 AI, AI 影片生成, AI 生成影片, 短劇",
        },
        "zh-TW": {
            title: "Seedance 2.0 免費線上用 | DramaCanvas",
            description: "想要即夢同款模型？在畫布上體驗字節跳動 Seedance 2.0，支援 Fast、Mini 與 HC 版本生成短劇鏡頭。畫布免費使用，附教學與價格。",
            h1: "Seedance 2.0 線上生成短劇影片",
            keywords: "Seedance 2.0, Seedance 2.0 教學, Seedance 2.0 免費, 即夢 AI, 即夢, AI 影片生成, AI 短劇",
        },
        "ja-JP": {
            title: "Seedance 2.0の使い方と料金 | DramaCanvas",
            description: "テンポの速いショートドラマの各カットをブラウザ上で手軽に映像化できます。Seedance 2.0（FastやMini含む）の生成手順と、必要な料金の目安を案内します。",
            h1: "Seedance 2.0 の使い方と料金",
            keywords: "Seedance 2.0, Seedance 2.0 使い方, Seedance 2.0 料金, Seedance 2.0 無料, 動画生成AI, ショートドラマ",
        },
        "ko-KR": {
            title: "Seedance 2.0 사용법·가격 안내 | DramaCanvas",
            description: "빠른 카메라 전환과 역동적인 액션 장면을 캔버스에서 완성해보세요. Fast, Mini, HC 버전으로 각 씬을 연속해서 만듭니다.",
            h1: "Seedance 2.0으로 만드는 역동적인 AI 영상",
            keywords: "Seedance 2.0, Seedance 2.0 사용법, Seedance 2.0 가격, Seedance 2.0 무료, AI 영상 생성, 숏폼 드라마",
        },
        "es-ES": {
            title: "Seedance 2.0 gratis: crear vídeos con IA | DramaCanvas",
            description: "Genera tomas para tus series con Seedance 2.0 (Fast, Mini y HC). Prueba prompts y monta el storyboard gratis; usa créditos para procesar vídeo.",
            h1: "Seedance 2.0: crea vídeos con IA para tus historias",
            keywords: "Seedance 2.0, Seedance 2.0 gratis, Seedance 2.0 precio, crear videos con IA, generador de videos IA, dramas cortos",
        },
        "pt-BR": {
            title: "Seedance 2.0 grátis: crie vídeos com IA | DramaCanvas",
            description: "Explore o Seedance 2.0 da ByteDance nas versões Fast, Mini e HC. Monte o storyboard grátis e veja o consumo de créditos antes de gerar os clipes.",
            h1: "Seedance 2.0: gere vídeos com IA",
            keywords: "Seedance 2.0, Seedance 2.0 como usar, Seedance 2.0 preço, Seedance 2.0 grátis, criar vídeo com IA, novela vertical",
        },
    },
    "seedance-2-5": {
        "en-US": {
            title: "Seedance 2.5 AI Video Generator | DramaCanvas",
            description: "Make 1080P Max videos with Seedance 2.5. Plan drama on a free canvas; generation uses credits. Credits for failed clips return to your balance.",
            h1: "Seedance 2.5 AI Video Generator",
            keywords: "Seedance 2.5, Seedance 2.5 1080P, AI video generator, AI movie maker, micro drama, Seedance 2.5 free, Seedance 2.5 online, Seedance 2.5 API",
        },
        "zh-CN": {
            title: "即梦同款 Seedance 2.5 | DramaCanvas",
            description: "体验字节跳动即梦新一代 Seedance 2.5 模型，生成 1080P Max 高清短剧镜头与细腻动作画面。在画布上整理剧情卡片完全免费，生成视频按积分扣费，附使用教程与价格。",
            h1: "Seedance 2.5 在线生成高清视频",
            keywords: "Seedance 2.5, Seedance 2.5 价格, Seedance 2.5 免费, 即梦, AI 视频生成, 文生视频, AI 短剧",
        },
        "zh-HK": {
            title: "Seedance 2.5 影片生成 | DramaCanvas",
            description: "想讓 AI 短劇畫面更清晰？字節跳動新一代 Seedance 2.5 支援 1080P Max 高畫質輸出。在畫布整理好劇本就能直接生成短劇鏡頭，分鏡排版完全免費，按量消耗積分。",
            h1: "Seedance 2.5 網上生成 1080P 高清影片",
            keywords: "Seedance 2.5, Seedance 2.5 價格, Seedance 2.5 免費, 即夢, AI 影片生成, AI 生成影片, 短劇",
        },
        "zh-TW": {
            title: "Seedance 2.5 線上生成影片 | DramaCanvas",
            description: "體驗字節跳動新一代 Seedance 2.5 影片模型，支援 1080P Max 高畫質短劇生成。先在免費畫布規劃鏡頭，再按需消耗點數生成影片片段。",
            h1: "Seedance 2.5 線上生成 1080P 影片",
            keywords: "Seedance 2.5 免費, Seedance 2.5, Seedance 2.5 價格, 即夢 AI, AI 影片生成, AI 短劇",
        },
        "ja-JP": {
            title: "Seedance 2.5動画生成AIの使い方 | DramaCanvas",
            description: "高精細な1080P画質でショートドラマの映像カットをブラウザ上で生成できます。最新のSeedance 2.5（1080P Max対応）の操作方法とクレジット料金を解説します。",
            h1: "Seedance 2.5 の使い方と料金",
            keywords: "Seedance 2.5, Seedance 2.5 料金, Seedance 2.5 無料, 動画生成AI, ショートドラマ",
        },
        "ko-KR": {
            title: "Seedance 2.5 1080P 사용법·가격 | DramaCanvas",
            description: "선명한 1080P Max 화질로 인물과 배경의 질감을 살려보세요. 최신 Seedance 2.5 모델로 캔버스에서 고화질 씬을 만듭니다.",
            h1: "Seedance 2.5로 만드는 1080P 고화질 AI 영상",
            keywords: "Seedance 2.5, Seedance 2.5 가격, Seedance 2.5 사용법, AI 영상 생성, 숏폼 드라마, Seedance 2.5 무료",
        },
        "es-ES": {
            title: "Seedance 2.5 gratis: vídeos con IA en 1080P | DramaCanvas",
            description: "Lleva tus planos a 1080P Max con Seedance 2.5. Organiza la secuencia en el lienzo sin coste y decide cuándo generar según los créditos de tu cuenta.",
            h1: "Seedance 2.5: genera vídeos con IA en 1080P",
            keywords: "Seedance 2.5, Seedance 2.5 precio, generador de videos IA, crear videos con IA, dramas cortos",
        },
        "pt-BR": {
            title: "Seedance 2.5: crie vídeos com IA em 1080P | DramaCanvas",
            description: "Crie vídeos nítidos em 1080P Max usando o modelo Seedance 2.5 da ByteDance. Organize a narrativa no canvas grátis e pague em créditos por cena gerada.",
            h1: "Seedance 2.5: crie vídeos com IA em 1080P",
            keywords: "Seedance 2.5, Seedance 2.5 preço, gerador de vídeo IA, criar vídeo com IA, novela vertical, Seedance 2.5 grátis",
        },
    },
    "sora-2": {
        "en-US": {
            title: "Sora 2 AI Video Generator Online | DramaCanvas",
            description: "Direct narrative scenes and motion clips with Sora 2. Sketch your shots freely on the visual canvas, test prompt pacing, and use credits when rendering.",
            h1: "Sora 2 AI Video Generator",
            keywords: "Sora 2, Sora 2 AI video generator, Sora 2 online, AI video generator, AI filmmaking, Sora 2 free, Sora 2 online, Sora 2 API",
        },
        "zh-CN": {
            title: "Sora 2 在线视频生成与教程 | DramaCanvas",
            description: "直接在浏览器里调用 OpenAI Sora 2 模型，把分镜提示词转为高清晰度的短剧镜头与场景视频。画布免费梳理故事结构，生成镜头按积分结算，附详细教程与价格说明。",
            h1: "Sora 2 在线生成短剧视频",
            keywords: "Sora 2, Sora 2 免费, Sora 2 教程, Sora 2 价格, OpenAI Sora, AI 视频生成, AI 短剧",
        },
        "zh-HK": {
            title: "Sora 2 AI 影片生成教學 | DramaCanvas",
            description: "無需排隊或下載獨立軟件，在畫布直接體驗 OpenAI Sora 2 影片生成。輸入鏡頭場景提示詞即可產生逼真動態，附完整教學與收費說明。畫布免費規劃，生成按積分收費。",
            h1: "Sora 2 網上 AI 影片生成與短劇創作",
            keywords: "Sora 2, Sora 2 教學, Sora 2 免費, OpenAI Sora, AI 影片生成, AI 生成影片",
        },
        "zh-TW": {
            title: "Sora 2 免費線上影片生成 | DramaCanvas",
            description: "想體驗 OpenAI Sora 2 卻沒有邀請碼？直接在畫布輸入提示詞生成短劇鏡頭，免下載其他軟體。畫布整理分鏡完全免費，附操作教學與價格。",
            h1: "Sora 2 線上生成 AI 影片",
            keywords: "Sora 2, Sora 2 教學, Sora 2 免費, OpenAI Sora, AI 影片生成, AI 短劇",
        },
        "ja-JP": {
            title: "Sora 2（ソラ2）の使い方と料金 | DramaCanvas",
            description: "招待コード不要で、話題の動画モデルをキャンバスから直接動かして映像を作れます。Sora 2（ソラ2）の生成手順や料金、無料枠で確認できる内容をまとめています。",
            h1: "Sora 2（ソラ2）の使い方と料金",
            keywords: "Sora 2, ソラ2, Sora 2 使い方, Sora 2 料金, Sora 2 無料, 動画生成AI",
        },
        "ko-KR": {
            title: "소라2(Sora 2) 사용법·가격, AI 영상 | DramaCanvas",
            description: "원근감과 카메라 패닝이 돋보이는 장면을 직접 연출해보세요. OpenAI 소라2(Sora 2)를 웹 캔버스에서 크레딧으로 쓸 수 있어요.",
            h1: "소라2(Sora 2)로 연출하는 실감 나는 AI 영상",
            keywords: "소라2, Sora 2, 소라2 사용법, 소라2 가격, 소라2 무료, AI 영상 생성",
        },
        "es-ES": {
            title: "Sora 2 gratis online sin invitación | DramaCanvas",
            description: "Prueba Sora 2 de OpenAI directamente en el navegador, sin invitaciones. Organiza tus planos en el lienzo gratis y genera vídeo pagando solo con créditos.",
            h1: "Sora 2 online: genera vídeos con IA",
            keywords: "Sora 2, Sora 2 gratis, Sora 2 precio, Sora 2 sin código, crear videos con IA",
        },
        "pt-BR": {
            title: "Sora 2 grátis: crie vídeos com IA online | DramaCanvas",
            description: "Acesse o Sora 2 da OpenAI diretamente pelo navegador, sem fila ou convite. Monte as cenas no storyboard grátis e gere trechos em vídeo usando créditos.",
            h1: "Sora 2 online: crie vídeos com IA",
            keywords: "Sora 2, Sora 2 grátis, Sora 2 como usar, Sora 2 preço, criar vídeo com IA",
        },
    },
    "veo-3-1": {
        "en-US": {
            title: "Veo 3.1 AI Video Generator Online | DramaCanvas",
            description: "Generate clear video scenes with Veo 3.1. Structure your visual storyboard for free, chat with the assistant to refine prompts, and pay as you render.",
            h1: "Veo 3.1 AI Video Generator",
            keywords: "Veo 3.1, Veo 3.1 AI video generator, Google Veo, AI video generator, AI filmmaking, Veo 3.1 free, Veo 3.1 online, Veo 3.1 API",
        },
        "zh-CN": {
            title: "谷歌 Veo 3.1 视频生成教程 | DramaCanvas",
            description: "贴入镜头画面描述，调用 Google Veo 3.1 模型生成 720P 与 1080P 连贯短剧视频。在画布上排布机位与故事卡片完全免费，生成按积分扣费，附使用教程与价格。",
            h1: "谷歌 Veo 3.1 在线生成视频",
            keywords: "Veo 3.1, Veo 3, Veo 3 免费, Google Veo, 谷歌 AI 视频, AI 视频生成",
        },
        "zh-HK": {
            title: "Veo 3.1 AI 影片生成教學 | DramaCanvas",
            description: "體驗 Google 最新影視模型 Veo 3.1，支援 720P 與 1080P 解像度。在畫布規劃鏡頭並輸入描述，輕鬆生成短劇動態畫面。附詳細教學與計費說明，免費開始使用畫布。",
            h1: "Google Veo 3.1 網上 AI 影片生成",
            keywords: "Veo 3.1, Veo 3, Google Veo, AI 影片生成, AI 生成影片, Veo 3.1 免費",
        },
        "zh-TW": {
            title: "Veo 3.1 免費線上影片生成 | DramaCanvas",
            description: "搶先體驗 Google 旗艦模型 Veo 3.1 與 Veo 3，支援 1080P 高畫質生成短劇片段。先在免費畫布規劃鏡頭節奏，再依用量點數產出畫面。",
            h1: "Veo 3.1 線上 AI 影片生成",
            keywords: "Veo 3.1, Veo 3, Google Veo, AI 影片生成, AI 短劇",
        },
        "ja-JP": {
            title: "Veo 3.1動画生成AIの使い方と料金 | DramaCanvas",
            description: "Googleの最新モデルを活用し、縦型ドラマの高品質な映像シーンを出力できます。Veo 3.1（720P・1080P）の利用手順や料金プランをわかりやすく案内します。",
            h1: "Veo 3.1 の使い方と料金案内",
            keywords: "Veo 3.1, Veo 3, Veo 3 無料, Veo 3 料金, Google Veo, 動画生成AI",
        },
        "ko-KR": {
            title: "Veo 3.1 사용법·가격, AI 영상 만들기 | DramaCanvas",
            description: "구글 Veo 3.1 모델로 720P·1080P 영상 장면을 만들어 보세요. 캔버스에서 장면을 무료로 정리하고, 영상 생성과 AI 대본·스토리보드에는 크레딧이 차감돼요.",
            h1: "구글 Veo 3.1로 AI 영상 만들기",
            keywords: "Veo 3.1, Veo 3, Veo 3 무료, 구글 Veo, AI 영상 생성",
        },
        "es-ES": {
            title: "Veo 3 gratis: usa Veo 3.1 de Google online | DramaCanvas",
            description: "Crea tomas cinemáticas con Veo 3.1 de Google en 720P o 1080P. Plantea tu escena en el storyboard gratis y usa créditos para procesar el vídeo.",
            h1: "Veo 3.1 online: genera vídeos con IA de Google",
            keywords: "Veo 3, Veo 3.1, Veo 3 gratis, Veo 3 precio, Google Veo, crear videos con IA",
        },
        "pt-BR": {
            title: "Veo 3 grátis: use o Veo 3.1 do Google | DramaCanvas",
            description: "Produza clipes com o Veo 3.1 do Google em 720P ou 1080P. Esboce a cena no canvas grátis e consulte os créditos para gerar o vídeo.",
            h1: "Veo 3.1: crie vídeos com IA",
            keywords: "Veo 3, Veo 3.1, Veo 3 grátis, Veo 3 preço, Google Veo, criar vídeo com IA",
        },
    },
    "kling-3-0": {
        "en-US": {
            title: "Kling 3.0 AI Video Generator | DramaCanvas",
            description: "Bring your scenes to life using Kling 3.0 Turbo and motion control. Plan your shots on a free canvas, then generate video clips using flexible credits.",
            h1: "Kling 3.0 AI Video Generator",
            keywords: "Kling 3.0, Kling AI, Kling 3.0 Turbo, Kling motion control, AI video generator, Kling 3.0 free, Kling 3.0 online, Kling 3.0 API",
        },
        "zh-CN": {
            title: "可灵 Kling 3.0 在线视频生成 | DramaCanvas",
            description: "选定角色参考图或输入提示词，调用快手可灵 Kling 3.0 与 Turbo 模型生成连贯的短剧视频镜头。画布整理分镜完全免费，生成视频按积分扣费，附详细价格与教程。",
            h1: "可灵 Kling 3.0 在线生成 AI 短剧视频",
            keywords: "可灵, 可灵 AI, Kling 3.0, 可灵 AI 免费, 可灵 AI 价格, Kling AI, AI 视频生成",
        },
        "zh-HK": {
            title: "可靈 Kling AI 影片生成教學 | DramaCanvas",
            description: "想製作高畫質短劇動態鏡頭？在畫布調用可靈 Kling 3.0 與 Turbo 版，Kling 3.0 支援運動控制，Turbo 支援文字或首幀生成。免費用畫布構思分鏡，生成鏡頭按積分扣除。",
            h1: "可靈 Kling 3.0 網上 AI 影片生成",
            keywords: "可靈, 可靈 AI, Kling 3.0, Kling AI, AI 影片生成, 可靈 免費",
        },
        "zh-TW": {
            title: "可靈 Kling 3.0 影片生成 | DramaCanvas",
            description: "線上使用快手可靈 Kling 3.0 與 Turbo 版生成短劇鏡頭。在畫布上整理分鏡並預覽畫面，畫布排版免費，影片按點數扣費，附使用教學與價格。",
            h1: "可靈 Kling 3.0 線上生成 AI 影片",
            keywords: "可靈, 可靈 AI, 可靈 AI 免費, Kling 3.0, Kling AI, AI 影片生成",
        },
        "ja-JP": {
            title: "Kling AIの使い方と料金プラン | DramaCanvas",
            description: "動きの大きなシーンや登場人物のアクション動画をブラウザ上で生成できます。Kling 3.0やTurboの生成手順と、必要なクレジット料金をまとめています。",
            h1: "Kling AI（3.0）の使い方と料金",
            keywords: "Kling AI, Kling 3.0, Kling AI 料金, Kling AI 無料, Kling AI 使い方, 動画生成AI",
        },
        "ko-KR": {
            title: "클링 AI 3.0 사용법·가격, AI 영상 | DramaCanvas",
            description: "카메라 앵글과 인물 움직임을 섬세하게 다뤄보세요. 클링 AI(Kling 3.0)와 Turbo 모델을 지원하며 캔버스에서 씬별로 바로 생성할 수 있어요.",
            h1: "클링 AI 3.0(Kling)으로 만드는 고화질 AI 영상",
            keywords: "클링, 클링 AI, 클링 AI 무료, 클링 AI 가격, Kling AI, Kling 3.0, AI 영상 생성",
        },
        "es-ES": {
            title: "Kling AI gratis: vídeos con IA online | DramaCanvas",
            description: "Crea escenas con Kling AI 3.0 y Turbo desde el lienzo. Ajusta el movimiento de cámara, mantén el estilo de tus planos y revisa el coste en créditos antes.",
            h1: "Kling AI 3.0: genera vídeos con IA para tus historias",
            keywords: "Kling AI, Kling 3.0, Kling AI gratis, Kling AI precio, crear videos con IA",
        },
        "pt-BR": {
            title: "Kling AI 3.0 grátis: crie vídeos com IA | DramaCanvas",
            description: "Anime seus roteiros com o Kling AI 3.0 e Turbo no DramaCanvas. Crie cenas no storyboard grátis e veja o preço do Kling AI em créditos antes de gerar.",
            h1: "Kling AI 3.0: gere vídeos com IA",
            keywords: "Kling AI, Kling 3.0, Kling AI grátis, Kling AI preço, criar vídeo com IA",
        },
    },
    "minimax-h3": {
        "en-US": {
            title: "MiniMax H3 AI Video Generator | DramaCanvas",
            description: "Produce video scenes with MiniMax H3 Max using 1 image as a start frame. Organize your story on a free canvas and use credits as you generate clips.",
            h1: "MiniMax H3 AI Video Generator",
            keywords: "MiniMax H3, Hailuo AI, MiniMax H3 Max, AI video generator, image to video AI, MiniMax H3 free, MiniMax H3 online, MiniMax H3 API",
        },
        "zh-CN": {
            title: "海螺 AI MiniMax视频生成 | DramaCanvas",
            description: "输入剧本对话与镜头描述，调用海螺 AI MiniMax H3 模型生成神态自然的短剧人物与对白视频。分镜排布完全免费，生成视频按积分扣费，附教程与价格说明。",
            h1: "海螺 AI MiniMax 在线生成视频",
            keywords: "海螺 AI, 海螺, MiniMax H3, MiniMax, Hailuo, AI 视频生成, AI 短剧, 海螺 AI 免费",
        },
        "zh-HK": {
            title: "MiniMax 海螺 AI 影片生成 | DramaCanvas",
            description: "擅長對白與人物表情的 MiniMax 海螺 AI H3 來了。在畫布輸入文字或圖片即可生成 H3 Max 短劇鏡頭，附詳細教學與價格。畫布免費排版，生成失敗退還積分。",
            h1: "MiniMax 海螺 AI（H3）網上生成影片",
            keywords: "海螺 AI, 海螺, MiniMax H3, MiniMax, Hailuo, AI 影片生成, 海螺 AI 免費",
        },
        "zh-TW": {
            title: "MiniMax 海螺 AI 影片生成 | DramaCanvas",
            description: "想做生動對白鏡頭？在畫布使用 MiniMax 海螺 AI H3 與 H3 Max 生成短劇角色影片。畫布免費整理分鏡，生成失敗自動退還點數，附教學與價格。",
            h1: "MiniMax 海螺 AI 線上生成短劇影片",
            keywords: "海螺 AI, 海螺, MiniMax H3, MiniMax, Hailuo, AI 影片生成, 海螺 AI 免費",
        },
        "ja-JP": {
            title: "Hailuo動画生成AIの使い方と料金 | DramaCanvas",
            description: "人物の会話シーンや自然な身振りを含む動画クリップを生成できます。MiniMax H3やH3 Maxの具体的な使い方と、生成にかかる料金を解説しています。",
            h1: "Hailuo（MiniMax H3）の使い方と料金",
            keywords: "MiniMax, Hailuo, MiniMax H3, Hailuo 使い方, 動画生成AI, MiniMax 無料",
        },
        "ko-KR": {
            title: "하이루오 MiniMax H3 사용법과 가격 | DramaCanvas",
            description: "등장인물의 섬세한 표정 연기와 대화 장면을 자연스럽게 연출해보세요. MiniMax H3 및 H3 Max를 지원하며 텍스트나 사진으로 영상을 만듭니다.",
            h1: "하이루오(MiniMax H3)로 만드는 자연스러운 인물 영상",
            keywords: "하이루오, Hailuo, MiniMax, MiniMax H3, AI 영상 생성, 하이루오 무료",
        },
        "es-ES": {
            title: "Hailuo AI (MiniMax H3) gratis online | DramaCanvas",
            description: "Prueba Hailuo AI (MiniMax H3 y Max) para dar movimiento a tus planos. Coloca tus tomas en el lienzo gratis y calcula los créditos necesarios antes de crear.",
            h1: "Hailuo AI (MiniMax H3): genera vídeos con IA",
            keywords: "Hailuo AI, Hailuo AI gratis, MiniMax, MiniMax H3, crear videos con IA",
        },
        "pt-BR": {
            title: "Hailuo AI (MiniMax H3) grátis online | DramaCanvas",
            description: "Dê vida a personagens realistas com o Hailuo AI MiniMax H3 e H3 Max. Monte os quadros no canvas grátis e confira o custo de créditos para cada segundo.",
            h1: "Hailuo AI (MiniMax H3): gere vídeos com IA",
            keywords: "Hailuo AI, Hailuo AI grátis, MiniMax, MiniMax H3, criar vídeo com IA",
        },
    },
    "wan-3-0": {
        "en-US": {
            title: "Wan 3.0 AI Video Generator | DramaCanvas",
            description: "Turn written prompts into video action with Wan 3.0 Prime. Organize your scene on an interactive free canvas and generate clips using on-demand credits.",
            h1: "Wan 3.0 AI Video Generator",
            keywords: "Wan 3.0, Wan 3.0 Prime, AI video generator, text to video AI, Wan 3.0 free, Wan 3.0 online, Wan 3.0 API",
        },
        "zh-CN": {
            title: "通义万相 Wan 3.0 视频生成 | DramaCanvas",
            description: "选定画面比例与分辨率，调用阿里通义万相 Wan 3.0 与 Prime 生成运镜平稳的短剧视频片段。画布排布镜头卡片免费，生成视频消耗积分，附新手教程与价格表。",
            h1: "通义万相 Wan 3.0 在线生成视频",
            keywords: "通义万相, Wan 3.0, Wan AI, 阿里 AI 视频, AI 视频生成, 文生视频, 通义万相 免费",
        },
        "zh-HK": {
            title: "通義萬相 Wan 3.0 影片生成 | DramaCanvas",
            description: "在畫布調用阿里開源旗艦模型通義萬相 Wan 3.0 與 Prime，靈活輸出 480P 至 1080P 鏡頭畫面。附完整操作教學與價格說明，免費排版分鏡，生成按積分扣費。",
            h1: "通義萬相 Wan 3.0 網上 AI 影片生成",
            keywords: "通義萬相, Wan 3.0, Wan AI, AI 影片生成, 通義萬相 免費",
        },
        "zh-TW": {
            title: "通義萬相 Wan 3.0 影片生成 | DramaCanvas",
            description: "透過阿里通義萬相 Wan 3.0 與 Prime 版本，在畫布生成最高 1080P 短劇與動畫鏡頭。畫布免費排版分鏡，生成按點數計費，附完整教學。",
            h1: "通義萬相 Wan 3.0 線上生成 AI 影片",
            keywords: "通義萬相, Wan 3.0, Wan AI, AI 影片生成, 通義萬相 免費",
        },
        "ja-JP": {
            title: "Wan AI 3.0の使い方と料金 | DramaCanvas",
            description: "構図やカメラワークを指定しながら、ブラウザ上で手軽に動画カットを出力できます。Wan 3.0（Prime含む）の具体的な使い方と、生成料金の仕組みを解説します。",
            h1: "Wan AI 3.0 の使い方と料金",
            keywords: "Wan AI, Wan 3.0, Wan AI 無料, Wan AI 使い方, 動画生成AI",
        },
        "ko-KR": {
            title: "Wan 3.0 사용법·가격, AI 영상 만들기 | DramaCanvas",
            description: "진한 색채와 섬세한 텍스처를 살린 클립을 만들어보세요. Wan 3.0과 Prime 모델을 캔버스에서 바로 생성할 수 있어요.",
            h1: "Wan 3.0으로 제작하는 선명한 AI 영상 클립",
            keywords: "Wan, Wan 3.0, Wan AI, Wan 사용법, AI 영상 생성, Wan 무료",
        },
        "es-ES": {
            title: "Wan AI 3.0 gratis: vídeos con IA online | DramaCanvas",
            description: "Experimenta con Wan AI 3.0 y Prime desde 480P hasta 1080P. Ordena las tomas de tu historia en el lienzo sin pagar y consume créditos al renderizar.",
            h1: "Wan AI 3.0: genera vídeos con IA",
            keywords: "Wan AI, Wan 3.0, Wan AI gratis, crear videos con IA",
        },
        "pt-BR": {
            title: "Wan AI 3.0 grátis: crie vídeos com IA | DramaCanvas",
            description: "Direcione movimentos de câmera suaves com o Wan AI 3.0 e Prime da Alibaba. Estruture a ordem das cenas no storyboard grátis e pague em créditos ao gerar.",
            h1: "Wan AI 3.0: crie vídeos com IA",
            keywords: "Wan AI, Wan 3.0, Wan AI grátis, criar vídeo com IA",
        },
    },
    "grok-imagine": {
        "en-US": {
            title: "Grok Imagine Video 1.5 AI Video Generator | DramaCanvas",
            description: "Turn text prompts and scene ideas into video clips with Grok Imagine Video 1.5 and Fast mode. Sketch your scenes on a free canvas before spending credits.",
            h1: "Grok Imagine Video 1.5 AI Video Generator",
            keywords: "Grok Imagine, Grok Imagine Video 1.5, AI video generator, AI image generator, Grok Imagine free, Grok Imagine online, Grok Imagine API",
        },
        "zh-CN": {
            title: "Grok Imagine 视频生成教程 | DramaCanvas",
            description: "用文字描述你的故事画面，调用 xAI Grok Imagine Video 1.5 与 Image 2.0 生成短剧视频或剧照。在画布上排布镜头免费，生成按积分结算。",
            h1: "Grok Imagine 在线视频与剧照生成",
            keywords: "Grok Imagine, Grok Imagine 免费, Grok 视频生成, xAI, AI 视频生成",
        },
        "zh-HK": {
            title: "Grok Imagine 影片生成 | DramaCanvas",
            description: "想用 xAI 模型創作短片？你可以在畫布調用 Grok Imagine Video 1.5 與 Image 2.0，將靈感轉成劇照與連貫鏡頭。提供教學與價格指引，生成失敗自動退回積分。",
            h1: "Grok Imagine 網上 AI 影片與圖片生成",
            keywords: "Grok Imagine, Grok 影片生成, xAI, AI 影片生成, Grok Imagine 免費",
        },
        "zh-TW": {
            title: "Grok Imagine 影片生成 | DramaCanvas",
            description: "想試試 xAI 的最新模型？透過 Grok Imagine Video 1.5 與 Image 2.0 製作短劇鏡頭與劇照，畫布免費整理分鏡，生成按點數計費。",
            h1: "Grok Imagine 線上 AI 影片與圖片生成",
            keywords: "Grok Imagine, Grok 影片生成, xAI, AI 影片生成, Grok Imagine 免費",
        },
        "ja-JP": {
            title: "Grok Imagine動画生成AIの使い方 | DramaCanvas",
            description: "短編のシーン画像や動画クリップを同じ画面上でまとめて生成できます。Grok Imagine Video 1.5の操作手順や料金体系を確認できます。",
            h1: "Grok Imagine の使い方と料金案内",
            keywords: "Grok Imagine, Grok Imagine 無料, Grok Imagine 使い方, 動画生成AI",
        },
        "ko-KR": {
            title: "그록 이매진 사용법과 가격, AI 영상 | DramaCanvas",
            description: "xAI의 비주얼 모델로 감각적인 장면을 시험해보세요. Grok Imagine Video 1.5와 Image 2.0으로 영상과 컷 이미지를 함께 만듭니다.",
            h1: "그록 이매진으로 영상과 콘티 이미지 만들기",
            keywords: "그록 이매진, Grok Imagine, 그록 이매진 무료, 그록 이매진 사용법, AI 영상 생성",
        },
        "es-ES": {
            title: "Grok Imagine gratis: vídeos con IA | DramaCanvas",
            description: "Prueba Grok Imagine Video 1.5 e Image 2.0 en tu navegador. Organiza tus planos en el lienzo gratis y genera clips con créditos solo cuando te convenzan.",
            h1: "Grok Imagine: genera vídeos e imágenes con IA",
            keywords: "Grok Imagine, Grok Imagine gratis, xAI, crear videos con IA",
        },
        "pt-BR": {
            title: "Grok Imagine grátis: crie vídeos com IA | DramaCanvas",
            description: "Transforme textos em cenas com o Grok Imagine Video 1.5 e Image 2.0 da xAI. Organize seus cortes na tela e gere clipes para novelinhas usando créditos.",
            h1: "Grok Imagine: gere vídeos e fotos com IA",
            keywords: "Grok Imagine, Grok Imagine grátis, xAI, criar vídeo com IA",
        },
    },
    "nano-banana": {
        "en-US": {
            title: "Nano Banana AI Image Generator | DramaCanvas",
            description: "Draft scene visuals and character looks with Nano Banana 2 and Pro. Plan shots on a free canvas; images and AI scripts or storyboards use credits.",
            h1: "Nano Banana AI Image Generator",
            keywords: "Nano Banana, Nano Banana 2, Nano Banana Pro, AI image generator, AI storyboard generator, Nano Banana free, Nano Banana online, Nano Banana API",
        },
        "zh-CN": {
            title: "Nano Banana 在线生图教程 | DramaCanvas",
            description: "上传角色参考图或输入外貌细节，调用 Google Nano Banana 与 Pro 版本生成连贯的短剧角色图与剧照。在画布上排布构思免费，生成图片消耗积分，附价格与上手教程。",
            h1: "Nano Banana 在线生图与剧照生成",
            keywords: "Nano Banana, Nano Banana Pro, Nano Banana 教程, Nano Banana 免费, AI 绘画, AI 生图",
        },
        "zh-HK": {
            title: "Nano Banana 免費生圖教學 | DramaCanvas",
            description: "Google Nano Banana 系列現已登陸畫布，支援 2、2.1 及 Pro 版本。輸入提示詞即出高清角色圖與分鏡劇照，附完整教學與收費說明。免費排版，按積分扣費。",
            h1: "Nano Banana 網上 AI 生圖與角色分鏡設計",
            keywords: "Nano Banana, Nano Banana Pro, Nano Banana 教學, AI 繪圖, AI 生圖",
        },
        "zh-TW": {
            title: "Nano Banana 免費線上生圖 | DramaCanvas",
            description: "利用 Nano Banana 與 Pro 系列生成短劇角色設定圖與分鏡畫面，支援高解析度。在畫布上整理分鏡完全免費，附詳細教學與計費說明。",
            h1: "Nano Banana 線上 AI 生圖與教學",
            keywords: "Nano Banana, Nano Banana Pro, Nano Banana 教學, Nano Banana 免費, AI 繪圖, AI 生圖",
        },
        "ja-JP": {
            title: "ナノバナナの使い方と料金プラン | DramaCanvas",
            description: "絵コンテに使う登場人物の表情や舞台背景の画像をすばやく生成できます。Nano BananaやNano Banana Proの操作手順と、消費クレジットの仕組みを説明します。",
            h1: "ナノバナナ（Nano Banana）の使い方と料金",
            keywords: "ナノバナナ, Nano Banana, Nano Banana Pro, ナノバナナ 使い方, Nano Banana 無料, 画像生成AI",
        },
        "ko-KR": {
            title: "나노바나나 프로 사용법과 가격, 이미지 | DramaCanvas",
            description: "콘티 구상에 필요한 캐릭터 시안을 웹에서 간편하게 뽑아보세요. 나노바나나 2.1부터 프로까지 지원하며 캔버스에서 바로 쓸 수 있어요.",
            h1: "나노바나나(Nano Banana)와 프로로 그리는 콘티 이미지",
            keywords: "나노바나나, 나노바나나 프로, 나노바나나 사용법, 나노바나나 무료, Nano Banana, AI 이미지 생성",
        },
        "es-ES": {
            title: "Nano Banana gratis: genera imágenes con IA | DramaCanvas",
            description: "Genera imágenes de personajes con Nano Banana y Nano Banana Pro en tu navegador. Ajusta el estilo en el storyboard gratis y usa créditos para cada imagen.",
            h1: "Nano Banana: genera imágenes con IA para tus escenas",
            keywords: "Nano Banana, Nano Banana Pro, Nano Banana gratis, crear imágenes con IA, generador de imágenes IA",
        },
        "pt-BR": {
            title: "Nano Banana grátis: crie imagens com IA | DramaCanvas",
            description: "Faça testes visuais de alta resolução com o Nano Banana e Nano Banana Pro do Google. Esboce cenas no storyboard grátis e use créditos para gerar.",
            h1: "Nano Banana e Pro: crie imagens com IA",
            keywords: "Nano Banana, Nano Banana Pro, Nano Banana grátis, ia para criar imagens, gerador de imagens IA",
        },
    },
    "gpt-image-2": {
        "en-US": {
            title: "GPT Image 2 AI Image Generator | DramaCanvas",
            description: "Create character portraits and scene art with GPT Image 2, 2.5, and 2.6. Plan shots on a free canvas and pay only for what you generate.",
            h1: "GPT Image 2 AI Image Generator",
            keywords: "GPT Image 2, GPT Image 2.5, GPT Image 2.6, AI image generator, AI storyboard generator, GPT Image 2 free, GPT Image 2 online, GPT Image 2 API",
        },
        "zh-CN": {
            title: "GPT Image 2 在线生图教程 | DramaCanvas",
            description: "输入角色外貌与场景描述，调用 OpenAI GPT Image 2、2.5 或 2.6 生成高清设定图与分镜画面。画布可免费排布卡片，生成图片按积分扣费。",
            h1: "GPT Image 2 在线 AI 生图与创作",
            keywords: "GPT Image 2, GPT Image, ChatGPT 生图, OpenAI 图片生成, AI 绘画, GPT Image 2 免费",
        },
        "zh-HK": {
            title: "GPT Image 2 網上生圖教學 | DramaCanvas",
            description: "在畫布直接調用 OpenAI GPT Image 2、2.5 與 2.6 生成高解像度角色圖與分鏡。支援上傳參考圖控制畫面風格，註冊即可免費排版，生成按積分扣費。",
            h1: "GPT Image 2 網上 AI 生圖與分鏡製作",
            keywords: "GPT Image 2, GPT Image, ChatGPT 生圖, AI 繪圖, GPT Image 2 免費",
        },
        "zh-TW": {
            title: "GPT Image 2 免費線上生圖 | DramaCanvas",
            description: "在畫布輸入提示詞，讓 OpenAI GPT Image 2、2.5 與 2.6 畫出角色設定與分鏡圖。畫布免費排版，生成圖片按點數扣費，隨附完整教學與價格。",
            h1: "GPT Image 2 線上 AI 分鏡與角色生圖",
            keywords: "GPT Image 2, GPT Image, ChatGPT 生圖, AI 繪圖",
        },
        "ja-JP": {
            title: "GPT Image 2の使い方と料金 | DramaCanvas",
            description: "物語の登場人物や場面のイメージ画像を会話感覚で生成できます。GPT Image 2、2.5や2.6の設定画作成手順と、クレジット料金の目安を案内します。",
            h1: "GPT Image 2 の使い方と料金",
            keywords: "GPT Image 2, GPT Image, ChatGPT 画像生成, 画像生成AI, GPT Image 2 無料",
        },
        "ko-KR": {
            title: "GPT Image 2 AI 이미지 생성과 가격 | DramaCanvas",
            description: "텍스트 설명으로 인물 외형과 배경 이미지를 그려보세요. GPT Image 2, 2.5와 2.6을 지원하며 캔버스에서 콘티 카드로 바로 정리할 수 있어요.",
            h1: "GPT Image 2로 캐릭터와 배경 이미지 만들기",
            keywords: "GPT Image 2, 챗GPT 이미지 생성, GPT Image, AI 이미지 생성, GPT Image 2 무료",
        },
        "es-ES": {
            title: "GPT Image 2 gratis: imágenes con IA | DramaCanvas",
            description: "Genera imágenes con GPT Image 2, 2.5 y 2.6 para tus personajes y carteles. Diseña en el lienzo gratis y paga solo en créditos cuando decidas generar fotos.",
            h1: "GPT Image 2: genera imágenes con IA para tus historias",
            keywords: "GPT Image 2, ChatGPT imágenes, GPT Image, crear imágenes con IA",
        },
        "pt-BR": {
            title: "GPT Image 2 grátis: crie imagens com IA | DramaCanvas",
            description: "Gere ilustrações e fotos de personagens com o GPT Image 2, 2.5 e 2.6 da OpenAI. Monte o visual da sua novelinha no canvas grátis e pague apenas o que gerar.",
            h1: "GPT Image 2, 2.5 e 2.6: crie imagens com IA",
            keywords: "GPT Image 2, ChatGPT imagem, GPT Image, ia para criar imagens",
        },
    },
    "midjourney-v7": {
        "en-US": {
            title: "Midjourney V7 AI Image Generator | DramaCanvas",
            description: "Generate high-detail concept art and character frames with Midjourney V7. Build your storyboard on a free canvas and use credits when you render.",
            h1: "Midjourney V7 AI Image Generator",
            keywords: "Midjourney V7, Midjourney AI, AI image generator, concept art, Midjourney V7 free, Midjourney V7 online, Midjourney V7 API",
        },
        "zh-CN": {
            title: "Midjourney V7 生图教程 | DramaCanvas",
            description: "在网页上直接使用 Midjourney V7，无需打开 Discord 即可生成概念设定、角色服装与短剧场景图。画布整理免费，生成按积分扣费，附教程与价格。",
            h1: "Midjourney V7 在线 AI 绘画与创作",
            keywords: "Midjourney, Midjourney V7, Midjourney 教程, Midjourney 价格, AI 绘画, Midjourney 免费",
        },
        "zh-HK": {
            title: "Midjourney 免費繪圖教學 | DramaCanvas",
            description: "想用 Midjourney 畫角色或場景，又不想打開 Discord？在畫布直接輸入提示詞即可生成 V7 概念圖與劇照，輕鬆設定美術風格。畫布免費排版，生成按積分扣費。",
            h1: "Midjourney V7 網上 AI 繪圖與短劇美術設計",
            keywords: "Midjourney, Midjourney V7, Midjourney 教學, Midjourney 免費, AI 繪圖",
        },
        "zh-TW": {
            title: "Midjourney V7 線上繪圖 | DramaCanvas",
            description: "不用開 Discord，直接在畫布使用 Midjourney V7 畫出角色與場景美術圖，作為短劇畫面參考。畫布免費排版，附操作教學與價格。",
            h1: "Midjourney V7 線上 AI 繪圖教學",
            keywords: "Midjourney, Midjourney V7, Midjourney 教學, Midjourney 免費, AI 繪圖",
        },
        "ja-JP": {
            title: "Midjourneyの使い方と料金案内 | DramaCanvas",
            description: "Discordを使わずにブラウザ上で人物設定や美術イメージを生成できます。Midjourney V7の操作方法や料金、無料枠の範囲を詳しくまとめています。",
            h1: "Midjourney V7 の使い方と料金",
            keywords: "Midjourney, Midjourney V7, Midjourney 使い方, Midjourney 料金, Midjourney 無料, 画像生成AI",
        },
        "ko-KR": {
            title: "미드저니 V7 사용법과 가격, 웹 이미지 | DramaCanvas",
            description: "디스코드 없이 웹 브라우저에서 바로 고화질 이미지를 만들어보세요. Midjourney V7 모델로 캐릭터 설정과 배경 콘셉트 아트를 쉽게 완성할 수 있어요.",
            h1: "웹에서 바로 쓰는 미드저니 V7(Midjourney)",
            keywords: "미드저니, 미드저니 무료, 미드저니 사용법, 미드저니 가격, Midjourney V7, AI 이미지 생성",
        },
        "es-ES": {
            title: "Midjourney V7 gratis online, sin Discord | DramaCanvas",
            description: "Genera imágenes con Midjourney V7 en la web sin pelearte con Discord. Diseña personajes y fondos para tus series cortas pagando solo los créditos que uses.",
            h1: "Midjourney V7 online: crea imágenes sin Discord",
            keywords: "Midjourney, Midjourney V7, Midjourney gratis, Midjourney precio, crear imágenes con IA",
        },
        "pt-BR": {
            title: "Midjourney V7 grátis: crie imagens com IA | DramaCanvas",
            description: "Desenvolva cenários e figurinos no Midjourney V7 direto pelo navegador, sem Discord. Estruture referências no canvas grátis e pague em créditos ao gerar.",
            h1: "Midjourney V7 online: crie imagens com IA",
            keywords: "Midjourney, Midjourney V7, Midjourney grátis, Midjourney preço, ia para criar imagens",
        },
    },
};
