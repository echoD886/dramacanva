import type { LegalDocumentKind } from "../content/legal/legal-documents";
import { changelogCopy } from "../components/changelog/copy";
import { toTraditionalChinese } from "./i18n-traditional";

import { BYOK_RELAY_COPY, byokRelayFaq } from "./byok-relay-copy";
import { skillPublicPaths } from "../content/skill-pages";
import { resolveSkillPageSEO } from "./skill-page-seo";
import { MCP_PAGE_META } from "./mcp-page-meta";
import { MCP_PUBLIC_COPY } from "./mcp-public-copy";
import { PUBLIC_MARKET_COPY, isMarketLocale } from "./public-market-copy";
import { PUBLIC_PAGE_TERMS } from "./public-product-copy";
import { HOME_POSITIONING, FILM_MAKER_DESCRIPTION } from "./home-positioning";
import { MODEL_PAGES, modelPageForPath, modelPageCopy } from "../content/model-pages";
import { getModelCases } from "../content/model-cases";
import { GUIDE_SEO, GUIDE_UPDATED } from "../content/guide-pages/seo";
import { GUIDE_SLUGS } from "../content/guide-pages/slugs";
import { publicPricingFaqs, pricingMessage } from "./pricing-public-copy";
import { publicFaqs } from "../content/public-faqs";
import { PRICING_FAQS } from "./pricing-faqs";
import { OWNED_PRICING, ownedQuote, ownedPlanKeys } from "./owned-pricing";
import { localizedPublicPath } from "../i18n/locale-routing";
import { findArticle, isPublicMedia, publicArticles, type BlogArticle } from "../content/blog";
import { loadedArticle } from "../content/blog-body";
import { BLOG_LOCALES, blogPath, blogFeedPath, parseBlogPath, type BlogLocale } from "../content/blog-locales";
import { WESTERN_HOME_SHOWS } from "../pages/home/western-opening-works";
import { getWorkBySlug, getWorkTranslation, localizedWorkPath, workSeoTitle } from "../pages/showcase/works-data";
import { ARCHIVED_CASE_INDEX } from "../pages/showcase/archive-loader";
import { getLocalizedShowcase } from "../pages/showcase/showcase-translations";
import { LOCKED_SEO_REGISTRY } from "./locked-seo-keywords";
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL, defaultShareImage, splitLocaleAndPath } from "./site-identity";
import { ALL_TEMPLATE_UUIDS } from "./public-template-ids";
import { visibleArticleAuthor, OFFICIAL_SOCIAL_LINKS, OFFICIAL_TWITTER_HANDLE, OPERATOR_PROFILE, TRUST_LABELS } from "../content/public-trust";
import { excludeBlogRedirects } from "../content/blog-redirects";

// Descriptions are the first body paragraph of each published document (up to 160 characters).
const NEW_LEGAL_COPY = {
    "zh-CN": {
        refund: {
            title: "退款政策",
            description: "自付款之日起 14 个自然日内，若该笔付款包含的平台积分尚未全部使用，您可以申请按未使用积分的比例退款。退款将扣除 6% 的手续费，用于覆盖支付渠道与处理成本。",
        },
        "acceptable-use": {
            title: "可接受使用政策",
            description: "本政策说明在 DramaCanvas 上可以做什么、不可以做什么，以及我们如何审核、处理违规和接收举报。本政策是《DramaCanvas用户协议》的组成部分，违反本政策即违反《用户协议》。",
        },
    },
    "en-US": {
        refund: {
            title: "Refund Policy",
            description: "Within 14 calendar days from the payment date, if the platform credits included in that payment have not been fully used, you may request a refund proportional ",
        },
        "acceptable-use": {
            title: "Acceptable Use Policy",
            description: "This policy outlines what is and is not permitted on DramaCanvas, as well as how we moderate content, handle violations, and receive reports. This policy forms ",
        },
    },
    "ja-JP": {
        refund: {
            title: "返金ポリシー",
            description:
                "お支払い日から14日（暦日）以内に、当該お支払いに含まれるプラットフォームクレジットをすべて使い切っていない場合（未使用分がある場合）、未使用クレジットの割合に応じて返金をご申請いただけます。なお、決済手数料および処理コストに充当するため、返金額から6%の手数料が差し引かれます。",
        },
        "acceptable-use": {
            title: "利用ポリシー",
            description:
                "本ポリシーは、DramaCanvas上で許可される行為および禁止される行為、ならびに当社による審査、違反への対処、および通報の受付方法について説明するものです。本ポリシーは『DramaCanvas利用規約』の一部を構成し、本ポリシーへの違反は『利用規約』への違反とみなされます。",
        },
    },
    "ko-KR": {
        refund: {
            title: "환불 정책",
            description:
                "결제일로부터 14일(주말·공휴일 포함) 이내에 해당 결제에 포함된 플랫폼 크레딧을 모두 소진하지 않은 경우, 미사용 크레딧 비율에 따른 환불을 신청하실 수 있습니다. 결제 대행 수수료 및 처리 비용을 충당하기 위해 환불 금액에서 6%의 수수료가 공제됩니다.",
        },
        "acceptable-use": {
            title: "이용 정책",
            description:
                "본 정책은 DramaCanvas에서 허용되는 행위와 금지되는 행위, 그리고 당사의 검토 방식, 위반 행위 처리 및 신고 접수 절차를 설명합니다. 본 정책은 《DramaCanvas 이용약관》의 일부를 구성하며, 본 정책을 위반하는 것은 《이용약관》을 위반하는 것으로 간주됩니다.",
        },
    },
    "es-ES": {
        refund: {
            title: "Política de reembolso",
            description: "Durante los 14 días naturales siguientes a la fecha del pago, si los créditos de la plataforma incluidos en dicho pago no se han utilizado en su totalidad, pued",
        },
        "acceptable-use": {
            title: "Política de uso aceptable",
            description: "Esta política explica qué está permitido y qué no está permitido hacer en DramaCanvas, así como nuestros procesos de moderación, gestión de infracciones y recep",
        },
    },
    "pt-BR": {
        refund: {
            title: "Política de reembolso",
            description: "Em até 14 dias corridos a partir da data de pagamento, caso os créditos da plataforma incluídos nesse pagamento não tenham sido totalmente utilizados, você pode",
        },
        "acceptable-use": {
            title: "Política de uso aceitável",
            description: "Esta política explica o que é e o que não é permitido no DramaCanvas, bem como nossos processos de moderação, tratamento de violações e recebimento de denúncias",
        },
    },
};
function legalMetadata(kind: "refund" | "acceptable-use") {
    return Object.fromEntries(
        BLOG_LOCALES.map((locale) => {
            const traditional = locale === "zh-HK" || locale === "zh-TW";
            const copy = NEW_LEGAL_COPY[traditional ? "zh-CN" : locale][kind];
            const title = traditional ? toTraditionalChinese(copy.title, locale) : copy.title;
            const description = traditional ? toTraditionalChinese(copy.description, locale) : copy.description;
            return [locale, { title: `${title} | DramaCanvas`, description, keywords: `${title}, DramaCanvas` }];
        }),
    ) as Record<BlogLocale, { title: string; description: string; keywords: string }>;
}

// Light constants live in site-identity / public-template-ids so the app shell
// can use them without loading this module's structured data and copy.
export { SITE_NAME, SITE_URL, splitLocaleAndPath, HOME_TITLE, HOME_DESCRIPTION } from "./site-identity";
export { ALL_TEMPLATE_UUIDS } from "./public-template-ids";
/** Page titles end with " | DramaCanvas"; older titles used other separators. */
export function titleWithoutBrand(title: string | undefined): string {
    return (title ?? "").replace(/ (?:\||／|｜|-|·) DramaCanvas$/, "");
}
export const BRAND_IMAGE = `${SITE_URL}/brand/say-action/mark-dark.png`;
// 社交分享卡片（summary_large_image）需要 1200×630 横图；方形 Logo 在微信、X 中会被裁成一小块。
export { SHARE_IMAGE } from "./site-identity";

export type PageSEO = {
    title: string;
    description: string;
    keywords?: string;
    canonical?: string;
    index: boolean;
    follow?: boolean;
    type?: "website" | "article";
    language?: BlogLocale;
    alternates?: { language: string; href: string }[];
    blogFeedLocale?: BlogLocale;
    image?: string;
    schema?: Record<string, unknown>;
};

export type LocaleMetadata = {
    title: string;
    description: string;
    keywords?: string;
};

export const ROUTE_METADATA: Record<string, Record<BlogLocale, LocaleMetadata>> = {
    mcp: MCP_PAGE_META,
    home: {
        "pt-BR": { title: LOCKED_SEO_REGISTRY["pt-BR"].pageTitle, description: LOCKED_SEO_REGISTRY["pt-BR"].pageDescription, keywords: LOCKED_SEO_REGISTRY["pt-BR"].pageKeywords },
        "zh-CN": {
            title: LOCKED_SEO_REGISTRY["zh-CN"].pageTitle,
            description: LOCKED_SEO_REGISTRY["zh-CN"].pageDescription,
            keywords: LOCKED_SEO_REGISTRY["zh-CN"].pageKeywords,
        },
        "zh-HK": {
            title: LOCKED_SEO_REGISTRY["zh-HK"].pageTitle,
            description: LOCKED_SEO_REGISTRY["zh-HK"].pageDescription,
            keywords: LOCKED_SEO_REGISTRY["zh-HK"].pageKeywords,
        },
        "zh-TW": {
            title: LOCKED_SEO_REGISTRY["zh-TW"].pageTitle,
            description: LOCKED_SEO_REGISTRY["zh-TW"].pageDescription,
            keywords: LOCKED_SEO_REGISTRY["zh-TW"].pageKeywords,
        },
        "en-US": {
            title: LOCKED_SEO_REGISTRY["en-US"].pageTitle,
            description: LOCKED_SEO_REGISTRY["en-US"].pageDescription,
            keywords: LOCKED_SEO_REGISTRY["en-US"].pageKeywords,
        },
        "ja-JP": {
            title: LOCKED_SEO_REGISTRY["ja-JP"].pageTitle,
            description: LOCKED_SEO_REGISTRY["ja-JP"].pageDescription,
            keywords: LOCKED_SEO_REGISTRY["ja-JP"].pageKeywords,
        },
        "ko-KR": {
            title: LOCKED_SEO_REGISTRY["ko-KR"].pageTitle,
            description: LOCKED_SEO_REGISTRY["ko-KR"].pageDescription,
            keywords: LOCKED_SEO_REGISTRY["ko-KR"].pageKeywords,
        },
        "es-ES": {
            title: LOCKED_SEO_REGISTRY["es-ES"].pageTitle,
            description: LOCKED_SEO_REGISTRY["es-ES"].pageDescription,
            keywords: LOCKED_SEO_REGISTRY["es-ES"].pageKeywords,
        },
    },
    pricing: {
        "pt-BR": {
            title: `${LOCKED_SEO_REGISTRY["pt-BR"].pricingPainPointH1} | DramaCanvas`,
            description: "Comece grátis no DramaCanvas e escolha planos ou créditos para filmes com IA. Se a geração falhar, os créditos voltam ao saldo. Suporte a chaves BYOK.",
            keywords: PUBLIC_PAGE_TERMS["pt-BR"].pricingKeywords,
        },
        "zh-CN": {
            title: `${LOCKED_SEO_REGISTRY["zh-CN"].pricingPainPointH1} | DramaCanvas`,
            description: "免费开始AI影视创作：剧本与分镜编辑免费，生成任务按模型扣积分。提供月付、年付订阅与积分包，生成失败积分退回到余额，支持自备API Key。",
            keywords: PUBLIC_PAGE_TERMS["zh-CN"].pricingKeywords,
        },
        "zh-HK": {
            title: `${LOCKED_SEO_REGISTRY["zh-HK"].pricingPainPointH1} | DramaCanvas`,
            description: "免費開始 AI 影視創作：手動劇本與分鏡編輯免費，生成任務按模型扣除積分。支援月費、年費訂閱與積分包，生成失敗積分退回到餘額，並支援自備 API 金鑰。",
            keywords: PUBLIC_PAGE_TERMS["zh-HK"].pricingKeywords,
        },
        "zh-TW": {
            title: `${LOCKED_SEO_REGISTRY["zh-TW"].pricingPainPointH1} | DramaCanvas`,
            description: "免費開始 AI 影視創作：手動寫劇本與編輯分鏡免費，生成任務依模型扣點數。提供月繳、年繳與加值點數包，生成失敗點數退回到餘額，支援自備 API Key。",
            keywords: PUBLIC_PAGE_TERMS["zh-TW"].pricingKeywords,
        },
        "en-US": {
            title: `${LOCKED_SEO_REGISTRY["en-US"].pricingPainPointH1} | DramaCanvas`,
            description: "Start free on DramaCanvas. Choose a plan or credit pack for AI filmmaking. Credits go back to your balance if a task fails. BYOK API keys are supported.",
            keywords: PUBLIC_PAGE_TERMS["en-US"].pricingKeywords,
        },
        "ja-JP": {
            title: `${LOCKED_SEO_REGISTRY["ja-JP"].pricingPainPointH1} | DramaCanvas`,
            description: "無料登録でAI映像制作を開始。脚本・絵コンテ作成は無料で、生成はモデル別クレジット制です。月額・年額プランに対応し、失敗時はクレジットが残高に戻ります。",
            keywords: PUBLIC_PAGE_TERMS["ja-JP"].pricingKeywords,
        },
        "ko-KR": {
            title: `${LOCKED_SEO_REGISTRY["ko-KR"].pricingPainPointH1} | DramaCanvas`,
            description: "AI 영상 제작 무료 시작: 대본·콘티 무료, 생성만 크레딧 차감. 구독·충전 팩과 BYOK 지원, 실패 시 크레딧은 잔고로 반환됩니다.",
            keywords: PUBLIC_PAGE_TERMS["ko-KR"].pricingKeywords,
        },
        "es-ES": {
            title: `${LOCKED_SEO_REGISTRY["es-ES"].pricingPainPointH1} | DramaCanvas`,
            description: "Empieza gratis: guion y storyboard manuales sin coste y créditos para crear cine con IA. Si una tarea falla, los créditos vuelven a tu saldo. Con BYOK.",
            keywords: PUBLIC_PAGE_TERMS["es-ES"].pricingKeywords,
        },
    },
    help: {
        "pt-BR": { title: `${LOCKED_SEO_REGISTRY["pt-BR"].helpPainPointH1} | DramaCanvas`, description: PUBLIC_MARKET_COPY["pt-BR"].help.description, keywords: PUBLIC_MARKET_COPY["pt-BR"].help.keywords + ", " + BYOK_RELAY_COPY["pt-BR"].keywords },
        "zh-CN": {
            title: `${LOCKED_SEO_REGISTRY["zh-CN"].helpPainPointH1} | DramaCanvas`,
            description: "快速掌握AI影视创作：从剧本、分镜、角色连贯到音轨与剪辑成片，按步骤排查生成问题，轻松解决积分与自备API Key（BYOK）使用疑问。",
            keywords: BYOK_RELAY_COPY["zh-CN"].keywords,
        },
        "zh-HK": {
            title: `${LOCKED_SEO_REGISTRY["zh-HK"].helpPainPointH1} | DramaCanvas`,
            description: PUBLIC_MARKET_COPY["zh-HK"].help.description,
            keywords: PUBLIC_MARKET_COPY["zh-HK"].help.keywords + ", " + BYOK_RELAY_COPY["zh-HK"].keywords,
        },
        "zh-TW": {
            title: `${LOCKED_SEO_REGISTRY["zh-TW"].helpPainPointH1} | DramaCanvas`,
            description: PUBLIC_MARKET_COPY["zh-TW"].help.description,
            keywords: PUBLIC_MARKET_COPY["zh-TW"].help.keywords + ", " + BYOK_RELAY_COPY["zh-TW"].keywords,
        },
        "en-US": {
            title: `${LOCKED_SEO_REGISTRY["en-US"].helpPainPointH1} | DramaCanvas`,
            description: "Learn AI filmmaking on DramaCanvas: from script and storyboards to final editing. Troubleshoot generation issues and manage your credits or BYOK keys.",
            keywords: BYOK_RELAY_COPY["en-US"].keywords,
        },
        "ja-JP": {
            title: `${LOCKED_SEO_REGISTRY["ja-JP"].helpPainPointH1} | DramaCanvas`,
            description: PUBLIC_MARKET_COPY["ja-JP"].help.description,
            keywords: PUBLIC_MARKET_COPY["ja-JP"].help.keywords + ", " + BYOK_RELAY_COPY["ja-JP"].keywords,
        },
        "ko-KR": {
            title: `${LOCKED_SEO_REGISTRY["ko-KR"].helpPainPointH1} | DramaCanvas`,
            description: PUBLIC_MARKET_COPY["ko-KR"].help.description,
            keywords: PUBLIC_MARKET_COPY["ko-KR"].help.keywords + ", " + BYOK_RELAY_COPY["ko-KR"].keywords,
        },
        "es-ES": {
            title: `${LOCKED_SEO_REGISTRY["es-ES"].helpPainPointH1} | DramaCanvas`,
            description: PUBLIC_MARKET_COPY["es-ES"].help.description,
            keywords: PUBLIC_MARKET_COPY["es-ES"].help.keywords + ", " + BYOK_RELAY_COPY["es-ES"].keywords,
        },
    },
    refund: legalMetadata("refund"),
    "acceptable-use": legalMetadata("acceptable-use"),
    terms: {
        "pt-BR": {
            title: "Termos de Serviço | DramaCanvas",
            description: "Consulte as regras de uso do DramaCanvas, direitos autorais das suas criações e diretrizes comerciais. Esclareça responsabilidades e condições da conta.",
            keywords: "termos de serviço, condições de uso, DramaCanvas",
        },
        "zh-CN": { title: "服务条款 | DramaCanvas", description: "DramaCanvas 的用户协议：账号注册、生成内容的商业使用、积分充值与退还规则，以及使用中需要遵守的规定。", keywords: "服务条款, 用户协议, 商业授权, DramaCanvas" },
        "zh-HK": { title: "服務條款 | DramaCanvas", description: "DramaCanvas 服務條款詳細說明帳戶註冊、商業使用授權、點數與積分收費機制，以及雙方權利與責任，保障創作者合法權益。", keywords: "服務條款, 用戶協議, 商業授權, DramaCanvas" },
        "zh-TW": { title: "服務條款 | DramaCanvas", description: "DramaCanvas 服務條款詳細說明帳戶註冊、商業使用授權、點數與積分收費機制，以及雙方權利與責任，保障創作者合法權益。", keywords: "服務條款, 用戶協議, 商業授權, DramaCanvas" },
        "en-US": {
            title: "Terms of Service | DramaCanvas",
            description: "Review the DramaCanvas terms covering user accounts, commercial rights for generated media, subscription credits, BYOK usage, and service guidelines.",
            keywords: "terms of service, commercial licensing, DramaCanvas",
        },
        "ja-JP": { title: "利用規約 | DramaCanvas", description: "サービスの利用条件や生成コンテンツの商用利用ライセンスを確認できます。クレジットの消費ルールやアカウント規約について詳しく定めています。", keywords: "利用規約, ライセンス, DramaCanvas" },
        "ko-KR": {
            title: "서비스 이용약관 | DramaCanvas",
            description: "DramaCanvas 이용 시 지켜야 할 기본 약관과 권리를 안내합니다. 계정 운영 기준과 유료 크레딧 결제, 창작물 라이선스 범위를 투명하게 정리했어요.",
            keywords: "이용약관, 상업적 라이선스, DramaCanvas",
        },
        "es-ES": {
            title: "Términos del servicio | DramaCanvas",
            description: "Revisa las condiciones de uso, derechos sobre el contenido generado y licencias comerciales al crear tus proyectos en la plataforma de DramaCanvas.",
            keywords: "términos del servicio, licencias comerciales, DramaCanvas",
        },
    },
    privacy: {
        "pt-BR": {
            title: "Política de Privacidade | DramaCanvas",
            description: "Entenda como o DramaCanvas protege suas informações, projetos de vídeo e dados de conta. Saiba quais termos se aplicam ao uso seguro da nossa plataforma.",
            keywords: "política de privacidade, dados pessoais, armazenamento, DramaCanvas",
        },
        "zh-CN": { title: "隐私政策 | DramaCanvas", description: "说明 DramaCanvas 会收集哪些个人信息、怎么使用和保存，以及你怎样查看、更正或删除自己的数据和作品素材。", keywords: "隐私政策, 数据安全, 本地存储, DramaCanvas" },
        "zh-HK": { title: "私隱政策 | DramaCanvas", description: "查閱 DramaCanvas 的私隱政策，了解我們如何收集、使用及保護你的帳戶資料與專案素材。我們承諾尊重用戶私隱並保障資料安全。", keywords: "私隱政策, 數據安全, 本地存儲, DramaCanvas" },
        "zh-TW": { title: "隱私政策 | DramaCanvas", description: "了解 DramaCanvas 如何保護你的帳號資料、專案內容與使用紀錄。我們說明 Cookie 運作、資料安全與使用者權利，保障你的個人隱私。", keywords: "隱私政策, 資料安全, 本地儲存, DramaCanvas" },
        "en-US": {
            title: "Privacy Policy | DramaCanvas",
            description: "Read how DramaCanvas collects, uses, and protects your personal data and project assets, including your account details, cookies, and data retention rights.",
            keywords: "privacy policy, data security, local-first, DramaCanvas",
        },
        "ja-JP": {
            title: "プライバシーポリシー | DramaCanvas",
            description: "当サービスにおける個人情報の取り扱いとデータ保護方針を確認できます。生成した画像や動画データの管理方法、プライバシー保護の取り組みを明記しています。",
            keywords: "プライバシーポリシー, データ保護, DramaCanvas",
        },
        "ko-KR": {
            title: "개인정보 처리방침 | DramaCanvas",
            description: "회원님의 개인정보와 소중한 창작 데이터를 안전하게 보호합니다. 수집하는 정보 항목과 보관 기간, 이용자의 열람 및 삭제 권리를 투명하게 설명해 드려요.",
            keywords: "개인정보 처리방침, 데이터 보호, DramaCanvas",
        },
        "es-ES": {
            title: "Política de privacidad | DramaCanvas",
            description: "Consulta cómo cuidamos tus datos y protegemos tu privacidad en DramaCanvas. Te explicamos de forma transparente el uso de cookies y tus derechos.",
            keywords: "política de privacidad, seguridad de datos, DramaCanvas",
        },
    },
};

const blogMetadata: Record<BlogLocale, { title: string; description: string; keywords?: string }> = {
    "pt-BR": PUBLIC_MARKET_COPY["pt-BR"].blog,
    "zh-CN": {
        title: "AI视频生成与短剧创作教程",
        description: "这里整理了实用的 AI 短剧与视频制作技巧。你可以跟着教程从写剧本开始，练习文生视频、图生视频与首尾帧控制，做出节奏连贯的镜头片段。",
        keywords: "AI视频生成, AI短剧, AI漫剧, AI生成视频, 文生视频, 图生视频, AI短剧教程, 分镜制作",
    },
    "zh-HK": PUBLIC_MARKET_COPY["zh-HK"].blog,
    "zh-TW": PUBLIC_MARKET_COPY["zh-TW"].blog,
    "en-US": {
        title: "AI Filmmaking Guides & Video Tutorials",
        description: "Explore step-by-step AI filmmaking guides to plan stories, generate visual storyboards, help keep characters consistent, and create videos on a free canvas.",
        keywords: "AI filmmaking guides, storyboard tutorials, character consistency, video creation",
    },
    "ja-JP": PUBLIC_MARKET_COPY["ja-JP"].blog,
    "ko-KR": PUBLIC_MARKET_COPY["ko-KR"].blog,
    "es-ES": PUBLIC_MARKET_COPY["es-ES"].blog,
};

// The about page names the former brand so searches for it reach the brand history.
const FORMER_BRAND = "Say Action";
const ABOUT_KEYWORDS: Record<BlogLocale, string> = {
    "pt-BR": `DramaCanvas, ${FORMER_BRAND}, criar video com ia, ia para criar videos, ia que cria videos, novela vertical, minisséries, storyboard, ${TRUST_LABELS["pt-BR"].policy}`,
    "zh-CN": `DramaCanvas, ${FORMER_BRAND}, AI视频生成, AI生成视频, AI短剧, AI漫剧, 文生视频, 图生视频, ${TRUST_LABELS["zh-CN"].policy}`,
    "zh-HK": `DramaCanvas, ${FORMER_BRAND}, AI影片生成, AI生成影片, AI短劇, 文字生成影片, 圖片生成影片, ${TRUST_LABELS["zh-HK"].policy}`,
    "zh-TW": `DramaCanvas, ${FORMER_BRAND}, AI影片生成, AI短劇, AI生成影片, 分鏡腳本, 圖片生成影片, ${TRUST_LABELS["zh-TW"].policy}`,
    "en-US": `DramaCanvas, ${FORMER_BRAND}, ${TRUST_LABELS["en-US"].policy}`,
    "ja-JP": `DramaCanvas, ${FORMER_BRAND}, 動画生成AI, 画像生成AI, ショートドラマ, 縦型ショートドラマ, 絵コンテ, ${TRUST_LABELS["ja-JP"].policy}`,
    "ko-KR": `DramaCanvas, ${FORMER_BRAND}, AI 영상 생성, AI 동영상 만들기, 숏드라마, 스토리보드, AI 영상 편집, ${TRUST_LABELS["ko-KR"].policy}`,
    "es-ES": `DramaCanvas, ${FORMER_BRAND}, crear videos con ia, ia para crear videos, generador de videos con ia, series cortas, storyboard, ${TRUST_LABELS["es-ES"].policy}`,
};

export function buildHreflangAlternates(cleanPath: string): { language: string; href: string }[] {
    const suffix = cleanPath === "/" ? "" : cleanPath;
    return [
        { language: "zh-CN", href: `${SITE_URL}/zh${suffix}` },
        { language: "zh-HK", href: `${SITE_URL}/hk${suffix}` },
        { language: "zh-TW", href: `${SITE_URL}/tw${suffix}` },
        { language: "en-US", href: `${SITE_URL}/${suffix.replace(/^\//, "")}` },
        { language: "ja-JP", href: `${SITE_URL}/ja${suffix}` },
        { language: "ko-KR", href: `${SITE_URL}/ko${suffix}` },
        { language: "es-ES", href: `${SITE_URL}/es${suffix}` },
        { language: "pt-BR", href: `${SITE_URL}/pt${suffix}` },
        { language: "x-default", href: `${SITE_URL}/${suffix.replace(/^\//, "")}` },
    ];
}

// Own keys only: paths such as "/constructor" must not resolve to Object.prototype members.
const guideSEO = (cleanPath: string, locale: BlogLocale) => (Object.hasOwn(GUIDE_SEO, cleanPath.slice(1)) ? GUIDE_SEO[cleanPath.slice(1)][locale] : undefined);

export function buildBreadcrumbsSchema(cleanPath: string, title: string, locale: BlogLocale) {
    const homeLabel = isMarketLocale(locale) ? PUBLIC_MARKET_COPY[locale].homeLabel : locale === "en-US" ? "Home" : "首页";
    const langPrefix = localizedPublicPath("/", locale);
    const items: { "@type": "ListItem"; position: number; name: string; item: string }[] = [
        {
            "@type": "ListItem",
            position: 1,
            name: homeLabel,
            item: `${SITE_URL}${langPrefix}` || `${SITE_URL}/`,
        },
    ];

    const model = modelPageForPath(cleanPath);
    if (model) {
        items.push({ "@type": "ListItem", position: 2, name: modelPageCopy(model, locale).h1, item: SITE_URL + localizedPublicPath(cleanPath, locale) });
    } else if (guideSEO(cleanPath, locale)) {
        items.push({ "@type": "ListItem", position: 2, name: guideSEO(cleanPath, locale)!.h1, item: SITE_URL + localizedPublicPath(cleanPath, locale) });
    } else if (cleanPath === "/about") {
        items.push({ "@type": "ListItem", position: 2, name: TRUST_LABELS[locale].about, item: `${SITE_URL}${localizedPublicPath(cleanPath, locale)}` });
    } else if (cleanPath === "/pricing") {
        items.push({
            "@type": "ListItem",
            position: 2,
            name: titleWithoutBrand(ROUTE_METADATA.pricing[locale]?.title) || "价格与会员套餐",
            item: `${SITE_URL}${localizedPublicPath("/pricing", locale)}`,
        });
    } else if (cleanPath === "/help") {
        items.push({
            "@type": "ListItem",
            position: 2,
            name: titleWithoutBrand(ROUTE_METADATA.help[locale]?.title) || "帮助中心",
            item: `${SITE_URL}${localizedPublicPath("/help", locale)}`,
        });
    } else if (cleanPath.startsWith("/legal/")) {
        const sub = cleanPath.replace("/legal/", "");
        items.push({
            "@type": "ListItem",
            position: 2,
            name: titleWithoutBrand(ROUTE_METADATA[(["terms", "privacy", "refund", "acceptable-use"].includes(sub) ? sub : "privacy") as LegalDocumentKind][locale].title),
            item: `${SITE_URL}${localizedPublicPath(cleanPath, locale)}`,
        });
    } else if (cleanPath === "/blog") {
        items.push({
            "@type": "ListItem",
            position: 2,
            name: titleWithoutBrand(blogMetadata[locale]?.title) || "AI视频生成与短剧创作指南",
            item: `${SITE_URL}${blogPath(locale)}`,
        });
    } else if (cleanPath.startsWith("/blog/")) {
        items.push({
            "@type": "ListItem",
            position: 2,
            name: titleWithoutBrand(blogMetadata[locale]?.title) || "AI视频生成与短剧创作指南",
            item: `${SITE_URL}${blogPath(locale)}`,
        });
        items.push({
            "@type": "ListItem",
            position: 3,
            name: titleWithoutBrand(title),
            item: `${SITE_URL}${blogPath(locale, cleanPath.slice(6))}`,
        });
    } else if (cleanPath.startsWith("/detail/")) {
        const showcaseNames: Record<BlogLocale, string> = {
            "pt-BR": "Fluxos em destaque",
            "zh-CN": "精选工作流",
            "zh-HK": "精選工作流",
            "zh-TW": "精選工作流程",
            "en-US": "Featured Workflows",
            "ja-JP": "厳選ワークフロー",
            "ko-KR": "추천 워크플로우",
            "es-ES": "Flujos Destacados",
        };
        items.push({
            "@type": "ListItem",
            position: 2,
            name: showcaseNames[locale] || showcaseNames["zh-CN"],
            item: `${SITE_URL}${langPrefix || "/"}`,
        });
        items.push({
            "@type": "ListItem",
            position: 3,
            name: titleWithoutBrand(title),
            item: `${SITE_URL}${localizedPublicPath(cleanPath, locale)}`,
        });
    }

    return {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}${localizedPublicPath(cleanPath, locale)}#breadcrumb`,
        itemListElement: items,
    };
}

export function buildOrganizationSchema(locale: BlogLocale = "en-US") {
    return {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        // 保留旧品牌名作为别名，向搜索引擎声明同一实体改名。
        alternateName: ["Say Action", "isayaction", "Say Action Studio"],
        url: `${SITE_URL}/`,
        logo: {
            "@type": "ImageObject",
            "@id": `${SITE_URL}/#logo`,
            url: BRAND_IMAGE,
            caption: SITE_NAME,
        },
        image: BRAND_IMAGE,
        description: locale === "en-US" ? FILM_MAKER_DESCRIPTION : HOME_POSITIONING[locale].answer,
        knowsAbout: [
            "AI Video Generation",
            "First & Last Frame Keyframing",
            "Consistent Character Diffusion",
            "Multi-Shot Storyboard Orchestration",
            "Seedance 2.5",
            "Nano Banana",
            "BYOK AI Video Canvas",
            "AI Storyboard Generator",
            "Video Inpainting",
            "Camera Motion Control",
        ],
        areaServed: ["Global", "US", "JP", "KR", "ES", "BR", "TW", "HK", "CN"],
        ...(OFFICIAL_SOCIAL_LINKS.length ? { sameAs: OFFICIAL_SOCIAL_LINKS } : {}),
        ...(OPERATOR_PROFILE.legalName?.trim() ? { legalName: OPERATOR_PROFILE.legalName } : {}),
        ...(OPERATOR_PROFILE.founder?.name.trim() ? { founder: { "@type": "Person", ...OPERATOR_PROFILE.founder } } : {}),
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: SUPPORT_EMAIL,
            url: `${SITE_URL}/help`,
        },
    };
}

const SOFTWARE_FEATURES = Object.fromEntries(
    BLOG_LOCALES.map((locale) => [locale, ["pricing.modelBenefitVideo", "pricing.modelBenefitImage", "pricing.modelBenefitText", "pricing.modelBenefitWorkflow"].map((key) => pricingMessage(locale, key))]),
) as Record<BlogLocale, string[]>;

export { PRICING_FAQS };

export const HELP_FAQS: Record<BlogLocale, { question: string; answer: string }[]> = {
    "pt-BR": PUBLIC_MARKET_COPY["pt-BR"].helpQuestions.map((question, index) => ({
        question,
        answer: pricingMessage("pt-BR", ["pricing.referenceGuidance", "pricing.faq2b", "pricing.storageBoundary", "pricing.teamBoundary", "pricing.modelNamesNote", "pricing.licenseBoundary"][index]),
    })),
    "zh-CN": [
        { question: "如何使用首尾帧节点锁死人物一致性？", answer: pricingMessage("zh-CN", "pricing.referenceGuidance") },
        { question: "生成失败会扣算力积分吗？积分退回机制如何运作？", answer: pricingMessage("zh-CN", "pricing.faq2b") },
        { question: "本地素材优先模式是如何保护商业版权的？", answer: pricingMessage("zh-CN", "pricing.storageBoundary") },
        { question: "如何邀请团队成员共享算力池？", answer: pricingMessage("zh-CN", "pricing.teamBoundary") },
        { question: "平台支持哪些分辨率和算力计费标准？", answer: pricingMessage("zh-CN", "pricing.modelNamesNote") },
        { question: "生成的视频与图片有商业授权保障吗？", answer: pricingMessage("zh-CN", "pricing.licenseBoundary") },
    ],
    "zh-HK": [
        { question: PUBLIC_MARKET_COPY["zh-HK"].helpQuestions[0], answer: pricingMessage("zh-HK", "pricing.referenceGuidance") },
        { question: PUBLIC_MARKET_COPY["zh-HK"].helpQuestions[1], answer: pricingMessage("zh-HK", "pricing.faq2b") },
        { question: PUBLIC_MARKET_COPY["zh-HK"].helpQuestions[2], answer: pricingMessage("zh-HK", "pricing.storageBoundary") },
        { question: PUBLIC_MARKET_COPY["zh-HK"].helpQuestions[3], answer: pricingMessage("zh-HK", "pricing.teamBoundary") },
        { question: PUBLIC_MARKET_COPY["zh-HK"].helpQuestions[4], answer: pricingMessage("zh-HK", "pricing.modelNamesNote") },
        { question: PUBLIC_MARKET_COPY["zh-HK"].helpQuestions[5], answer: pricingMessage("zh-HK", "pricing.licenseBoundary") },
    ],
    "zh-TW": [
        { question: PUBLIC_MARKET_COPY["zh-TW"].helpQuestions[0], answer: pricingMessage("zh-TW", "pricing.referenceGuidance") },
        { question: PUBLIC_MARKET_COPY["zh-TW"].helpQuestions[1], answer: pricingMessage("zh-TW", "pricing.faq2b") },
        { question: PUBLIC_MARKET_COPY["zh-TW"].helpQuestions[2], answer: pricingMessage("zh-TW", "pricing.storageBoundary") },
        { question: PUBLIC_MARKET_COPY["zh-TW"].helpQuestions[3], answer: pricingMessage("zh-TW", "pricing.teamBoundary") },
        { question: PUBLIC_MARKET_COPY["zh-TW"].helpQuestions[4], answer: pricingMessage("zh-TW", "pricing.modelNamesNote") },
        { question: PUBLIC_MARKET_COPY["zh-TW"].helpQuestions[5], answer: pricingMessage("zh-TW", "pricing.licenseBoundary") },
    ],
    "en-US": [
        { question: "How do I prevent character face drift using first & last frame nodes?", answer: pricingMessage("en-US", "pricing.referenceGuidance") },
        { question: "Will failed generations consume credits? How are credits returned to your balance?", answer: pricingMessage("en-US", "pricing.faq2b") },
        { question: "How does the local-first mode protect commercial creative assets?", answer: pricingMessage("en-US", "pricing.storageBoundary") },
        { question: "How do team spaces share compute pools?", answer: pricingMessage("en-US", "pricing.teamBoundary") },
        { question: "What resolutions and compute pricing tiers are supported?", answer: pricingMessage("en-US", "pricing.modelNamesNote") },
        { question: "Are generated videos cleared for commercial licensing and monetization?", answer: pricingMessage("en-US", "pricing.licenseBoundary") },
    ],
    "ja-JP": [
        { question: PUBLIC_MARKET_COPY["ja-JP"].helpQuestions[0], answer: pricingMessage("ja-JP", "pricing.referenceGuidance") },
        { question: PUBLIC_MARKET_COPY["ja-JP"].helpQuestions[1], answer: pricingMessage("ja-JP", "pricing.faq2b") },
        { question: PUBLIC_MARKET_COPY["ja-JP"].helpQuestions[2], answer: pricingMessage("ja-JP", "pricing.storageBoundary") },
        { question: PUBLIC_MARKET_COPY["ja-JP"].helpQuestions[3], answer: pricingMessage("ja-JP", "pricing.teamBoundary") },
        { question: PUBLIC_MARKET_COPY["ja-JP"].helpQuestions[4], answer: pricingMessage("ja-JP", "pricing.modelNamesNote") },
        { question: PUBLIC_MARKET_COPY["ja-JP"].helpQuestions[5], answer: pricingMessage("ja-JP", "pricing.licenseBoundary") },
    ],
    "ko-KR": [
        { question: PUBLIC_MARKET_COPY["ko-KR"].helpQuestions[0], answer: pricingMessage("ko-KR", "pricing.referenceGuidance") },
        { question: PUBLIC_MARKET_COPY["ko-KR"].helpQuestions[1], answer: pricingMessage("ko-KR", "pricing.faq2b") },
        { question: PUBLIC_MARKET_COPY["ko-KR"].helpQuestions[2], answer: pricingMessage("ko-KR", "pricing.storageBoundary") },
        { question: PUBLIC_MARKET_COPY["ko-KR"].helpQuestions[3], answer: pricingMessage("ko-KR", "pricing.teamBoundary") },
        { question: PUBLIC_MARKET_COPY["ko-KR"].helpQuestions[4], answer: pricingMessage("ko-KR", "pricing.modelNamesNote") },
        { question: PUBLIC_MARKET_COPY["ko-KR"].helpQuestions[5], answer: pricingMessage("ko-KR", "pricing.licenseBoundary") },
    ],
    "es-ES": [
        { question: PUBLIC_MARKET_COPY["es-ES"].helpQuestions[0], answer: pricingMessage("es-ES", "pricing.referenceGuidance") },
        { question: PUBLIC_MARKET_COPY["es-ES"].helpQuestions[1], answer: pricingMessage("es-ES", "pricing.faq2b") },
        { question: PUBLIC_MARKET_COPY["es-ES"].helpQuestions[2], answer: pricingMessage("es-ES", "pricing.storageBoundary") },
        { question: PUBLIC_MARKET_COPY["es-ES"].helpQuestions[3], answer: pricingMessage("es-ES", "pricing.teamBoundary") },
        { question: PUBLIC_MARKET_COPY["es-ES"].helpQuestions[4], answer: pricingMessage("es-ES", "pricing.modelNamesNote") },
        { question: PUBLIC_MARKET_COPY["es-ES"].helpQuestions[5], answer: pricingMessage("es-ES", "pricing.licenseBoundary") },
    ],
};

for (const locale of BLOG_LOCALES) {
    const authored = publicFaqs(locale, "help");
    HELP_FAQS[locale] = [...(authored ?? HELP_FAQS[locale]), byokRelayFaq(locale)];
}

export function buildSoftwareSchema(locale: BlogLocale = "zh-CN") {
    const meta = ROUTE_METADATA.home[locale] || ROUTE_METADATA.home["zh-CN"];
    return {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "All (Web Browser, Chrome, Safari, Edge, Firefox)",
        description: locale === "en-US" ? FILM_MAKER_DESCRIPTION : HOME_POSITIONING[locale].answer,
        image: BRAND_IMAGE,
        publisher: { "@id": `${SITE_URL}/#organization` },
        // Catalog prices describe billing periods; payment availability remains deployment-dependent.
        offers: ownedPlanKeys.flatMap((key) =>
            (["monthly", "quarterly", "annual"] as const).map((interval) => {
                const quote = ownedQuote(key, interval);
                return {
                    "@type": "Offer",
                    name: pricingMessage(locale, OWNED_PRICING.plans.find((plan) => plan.key === key)!.nameKey),
                    identifier: quote.version + ":" + key + ":" + interval,
                    url: SITE_URL + localizedPublicPath("/pricing", locale),
                    price: quote.amountMinor / 100,
                    priceCurrency: OWNED_PRICING.currency,
                    priceSpecification: { "@type": "UnitPriceSpecification", price: quote.amountMinor / 100, priceCurrency: OWNED_PRICING.currency, billingDuration: interval === "monthly" ? "P1M" : interval === "quarterly" ? "P3M" : "P1Y" },
                };
            }),
        ),
        featureList: [...(SOFTWARE_FEATURES[locale] || SOFTWARE_FEATURES["zh-CN"]), BYOK_RELAY_COPY[locale].title],
    };
}

// Preview plans are not InStock offers or fabricated review ratings.
// Machine-readable facts and the visible FAQ use the same versioned USD catalog.
export function buildPricingSchema(locale: BlogLocale = "en-US") {
    const url = SITE_URL + localizedPublicPath("/pricing", locale);
    const facts = PRICING_FAQS[locale] ?? publicPricingFaqs(locale);
    return [
        {
            "@type": "CollectionPage",
            "@id": url + "#pricing",
            name: ROUTE_METADATA.pricing[locale].title,
            url,
            inLanguage: locale,
            description: facts[0].answer,
            mainEntity: {
                "@type": "ItemList",
                itemListElement: ownedPlanKeys.map((key, index) => {
                    const m = ownedQuote(key, "monthly"),
                        y = ownedQuote(key, "annual");
                    const name = pricingMessage(locale, OWNED_PRICING.plans.find((p) => p.key === key)!.nameKey);
                    return {
                        "@type": "ListItem",
                        position: index + 1,
                        item: {
                            "@type": "Service",
                            name,
                            identifier: m.version + ":" + key,
                            description: `${m.amountMinor / 100} USD/month, ${m.credits} credits per monthly period; ${y.amountMinor / 100} USD/year, ${y.credits} credits per annual period; ${m.unitAmount.toFixed(6)} USD/credit in each period.`,
                            url,
                            provider: { "@id": SITE_URL + "/#organization" },
                        },
                    };
                }),
            },
        },
        {
            "@type": "Service",
            name: "BYOK Studio Pass",
            identifier: OWNED_PRICING.version + ":byok",
            url: url + "?plan=byok",
            description: `Separate workspace service: USD ${OWNED_PRICING.byok.amountMinor / 100} per ${OWNED_PRICING.byok.months} months. No included model credits; provider usage is paid separately.`,
        },
        { "@type": "FAQPage", "@id": url + "#faq", mainEntity: facts.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
    ];
}

export function buildHelpSchema(locale: BlogLocale = "zh-CN") {
    const faqs = HELP_FAQS[locale] || HELP_FAQS["zh-CN"];
    return [
        {
            "@type": "FAQPage",
            "@id": `${SITE_URL}${localizedPublicPath("/help", locale)}#faq`,
            mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
        },
    ];
}

export function articleSchema(article: BlogArticle, language: BlogLocale, canonical: string) {
    const author = visibleArticleAuthor(article.slug, article.author);
    const approved = article.media.filter(isPublicMedia);
    const images = approved.filter((media) => media.kind === "image").map((media) => SITE_URL + media.src);
    const video = approved.find((media) => media.kind === "video");
    return {
        "@type": "BlogPosting",
        "@id": `${canonical}#article`,
        headline: article.title,
        description: article.summary,
        datePublished: article.date,
        dateModified: article.modifiedDate || article.date,
        inLanguage: language,
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
        isPartOf: { "@id": `${SITE_URL}/#website` },
        author: { "@type": author.kind, name: author.name, url: new URL(author.url, SITE_URL).href },
        publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: BRAND_IMAGE } },
        about: article.category,
        ...(images.length ? { image: images } : {}),
        ...(video
            ? {
                  video: {
                      "@type": "VideoObject",
                      name: video.title,
                      description: video.caption,
                      contentUrl: SITE_URL + video.src,
                      ...(video.uploadDate ? { uploadDate: video.uploadDate } : {}),
                      ...(video.duration ? { duration: video.duration } : {}),
                      width: video.width,
                      height: video.height,
                      ...(video.poster ? { thumbnailUrl: SITE_URL + video.poster } : {}),
                  },
              }
            : {}),
        // FAQPage 只在 @graph 中出现一次（见 resolvePageSEO），这里按 @id 引用；
        // 内联第二份会让 Google 判定重复 FAQPage 而不展示富结果。
        ...(article.faq.length ? { hasPart: { "@id": `${canonical}#faq` } } : {}),
    };
}

export function articleHowToSchema(article: BlogArticle, language: BlogLocale, canonical: string) {
    const steps = article.sections.flatMap((section) =>
        (section.steps ?? []).map((step, index) => ({
            "@type": "HowToStep",
            name: step.title,
            text: step.body,
            url: `${canonical}#${section.id}-step-${index + 1}`,
            ...(step.figure ? { image: new URL(step.figure.src, SITE_URL).href } : {}),
        })),
    );
    return steps.length ? { "@type": "HowTo", "@id": `${canonical}#howto`, name: article.title, description: article.summary, inLanguage: language, step: steps.map((step, index) => ({ ...step, position: index + 1 })) } : undefined;
}

export function resolvePageSEO(pathname: string, search = "", suppliedArticle?: { title: string; summary: string; slug: string; seoApproved: boolean }): PageSEO {
    const skillSEO = resolveSkillPageSEO(pathname, search);
    if (skillSEO) return skillSEO;
    const { locale, cleanPath } = splitLocaleAndPath(pathname);
    const home = cleanPath === "/" || cleanPath === "/home";
    const model = modelPageForPath(cleanPath);
    const modelCopy = model ? modelPageCopy(model, locale) : undefined;
    const guide = guideSEO(cleanPath, locale);
    const pricing = cleanPath === "/pricing";
    const ecommerce = false;
    const help = cleanPath === "/help";
    const changelog = cleanPath === "/changelog";
    const about = false;
    const mcp = cleanPath === "/mcp";
    const terms = cleanPath === "/legal/terms";
    const privacy = cleanPath === "/legal/privacy";
    const newLegal = cleanPath === "/legal/refund" ? "refund" : cleanPath === "/legal/acceptable-use" ? "acceptable-use" : undefined;
    const detailMatch = cleanPath.match(/^\/detail\/([a-f0-9-]+)$/i);
    const workMatch = cleanPath.match(/^\/works\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);

    const blog = parseBlogPath(pathname);
    const language = locale;
    const registeredArticle = blog?.slug ? findArticle(blog.slug, language) : undefined;
    const article = registeredArticle ? (suppliedArticle?.slug === registeredArticle.slug ? suppliedArticle : registeredArticle) : undefined;
    const blogList = cleanPath === "/blog";

    const knownDetail = Boolean(detailMatch && ALL_TEMPLATE_UUIDS.includes(detailMatch[1]));
    const publicWork = workMatch ? getWorkBySlug(workMatch[1]) : undefined;
    const completeWork = publicWork && publicWork.originalPublishAt && publicWork.videoPath && publicWork.coverPath;
    const knownWork = Boolean(completeWork);
    const knownPublic = Boolean(changelog || ecommerce || model || guide || home || about || pricing || help || mcp || terms || privacy || newLegal || knownDetail || knownWork || article || blogList);
    const safeQuery = [...new URLSearchParams(search).keys()].every((key) => /^(utm_[a-z0-9_]+|gclid|fbclid|msclkid|theme)$/.test(key));
    const approved = article ? registeredArticle?.seoApproved === true : blogList ? publicArticles(language).some((item) => item.seoApproved) : knownPublic;
    const isIndexable = knownPublic && approved && safeQuery && (!knownDetail || knownWork);

    // Self-canonical for each localized path
    const langPrefix = localizedPublicPath("/", locale);
    const canonicalPath = knownWork && publicWork ? localizedWorkPath(publicWork.templateUuid, locale) : knownPublic ? localizedPublicPath(home ? "/" : cleanPath, locale) : undefined;
    const canonical = canonicalPath ? `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}` : undefined;

    let title = ROUTE_METADATA.home[language]?.title || ROUTE_METADATA.home["zh-CN"].title;
    let description = ROUTE_METADATA.home[language]?.description || ROUTE_METADATA.home["zh-CN"].description;
    let keywords = ROUTE_METADATA.home[language]?.keywords || ROUTE_METADATA.home["zh-CN"].keywords;
    let image: string | undefined = knownPublic ? defaultShareImage(locale) : undefined;

    if (changelog) {
        title = `${changelogCopy(locale)[0]} | ${SITE_NAME}`;
        description = changelogCopy(locale)[4];
        keywords = `DramaCanvas, ${changelogCopy(locale)[0]}, ${changelogCopy(locale)[5]}, ${changelogCopy(locale)[7]}`;
    } else if (ecommerce) {
        title = "";
        description = "";
        keywords = "";
    } else if (modelCopy) {
        title = modelCopy.title;
        description = modelCopy.description;
        keywords = modelCopy.keywords;
    } else if (guide) {
        title = `${guide.seo.title} | ${SITE_NAME}`;
        description = guide.seo.description;
        keywords = guide.seo.keywords;
    } else if (about) {
        title = `${TRUST_LABELS[language].about} | ${SITE_NAME}`;
        description = "";
        keywords = ABOUT_KEYWORDS[language] || ABOUT_KEYWORDS["zh-CN"];
    } else if (home) {
        title = ROUTE_METADATA.home[language]?.title || ROUTE_METADATA.home["zh-CN"].title;
        description = ROUTE_METADATA.home[language]?.description || ROUTE_METADATA.home["zh-CN"].description;
        keywords = ROUTE_METADATA.home[language]?.keywords;
    } else if (mcp) {
        title = ROUTE_METADATA.mcp[language].title;
        description = ROUTE_METADATA.mcp[language].description;
        keywords = ROUTE_METADATA.mcp[language].keywords;
    } else if (pricing) {
        title = ROUTE_METADATA.pricing[language]?.title || ROUTE_METADATA.pricing["zh-CN"].title;
        description = ROUTE_METADATA.pricing[language]?.description || ROUTE_METADATA.pricing["zh-CN"].description;
        keywords = ROUTE_METADATA.pricing[language]?.keywords;
    } else if (help) {
        title = ROUTE_METADATA.help[language]?.title || ROUTE_METADATA.help["zh-CN"].title;
        description = ROUTE_METADATA.help[language]?.description || ROUTE_METADATA.help["zh-CN"].description;
        keywords = ROUTE_METADATA.help[language]?.keywords;
    } else if (terms) {
        title = ROUTE_METADATA.terms[language]?.title || ROUTE_METADATA.terms["zh-CN"].title;
        description = ROUTE_METADATA.terms[language]?.description || ROUTE_METADATA.terms["zh-CN"].description;
        keywords = ROUTE_METADATA.terms[language]?.keywords;
    } else if (newLegal) {
        ({ title, description, keywords } = ROUTE_METADATA[newLegal][language]);
    } else if (privacy) {
        title = ROUTE_METADATA.privacy[language]?.title || ROUTE_METADATA.privacy["zh-CN"].title;
        description = ROUTE_METADATA.privacy[language]?.description || ROUTE_METADATA.privacy["zh-CN"].description;
        keywords = ROUTE_METADATA.privacy[language]?.keywords;
    } else if (workMatch && publicWork) {
        const translated = getWorkTranslation(publicWork.templateUuid, language);
        const source = getWorkTranslation(publicWork.templateUuid, "zh-CN");
        const copy = translated ?? source;
        if (copy) {
            title = workSeoTitle(copy.title, language);
            description = copy.seoDescription;
            keywords = `${copy.title}, ${copy.seoDescription}`;
        }
        image = `${SITE_URL}${publicWork.coverPath}`;
    } else if (detailMatch) {
        const uuid = detailMatch[1];
        const show = WESTERN_HOME_SHOWS.find((s) => s.templateUuid === uuid);
        const detailSuffixes: Record<BlogLocale, { workflow: string; descSuffix: string; keywords: string }> = {
            "pt-BR": {
                workflow: "Fluxo de produção de vídeos e storyboards com IA",
                descSuffix: "Veja os prompts, os quadros inicial e final e os movimentos de câmera. Duplique o fluxo no seu canvas para começar a criar.",
                keywords: "fluxo de vídeo com IA, storyboard, movimento de câmera, quadros inicial e final, duplicar canvas, DramaCanvas",
            },
            "zh-CN": {
                workflow: "AI 视频画布工作流",
                descSuffix: "在 DramaCanvas 画布中查看完整分镜提示词、首尾帧与镜头运镜，一键复刻到画布开始创作。",
                keywords: "AI视频工作流, 影视画布, 镜头分镜, 首尾帧控制, 一键复刻画布, DramaCanvas",
            },
            "zh-HK": {
                workflow: "AI 影片畫布工作流",
                descSuffix: "在 DramaCanvas 畫布中查看完整分鏡提示詞、首尾幀與鏡頭運鏡，一鍵復刻到畫布開始創作。",
                keywords: "AI影片工作流, 影視畫布, 鏡頭分鏡, 首尾幀控制, 一鍵復刻畫布, DramaCanvas",
            },
            "zh-TW": {
                workflow: "AI 視訊畫布工作流程",
                descSuffix: "在 DramaCanvas 畫布中查看完整分鏡提示詞、首尾影格與鏡頭運鏡，一鍵復刻到畫布開始創作。",
                keywords: "AI視訊工作流程, 影視畫布, 鏡頭分鏡, 首尾影格控制, 一鍵復刻畫布, DramaCanvas",
            },
            "en-US": {
                workflow: "AI Video Storyboard Workflow",
                descSuffix: "Inspect shot prompts, First & Last Frame keyframing, and camera motion on DramaCanvas. Duplicate this workflow to your infinite canvas with one click.",
                keywords: "AI video workflow, video storyboard, camera motion, first and last frame, duplicate to canvas, DramaCanvas",
            },
            "ja-JP": {
                workflow: "AI動画・絵コンテ制作ワークフロー",
                descSuffix: "DramaCanvasの無限キャンバスでプロンプト、首尾フレーム、カメラワークを確認し、ワンクリックでキャンバスに複製して創作を開始できます。",
                keywords: "AI動画ワークフロー, 絵コンテ, キャラ固定, 首尾フレーム, キャンバス複製, DramaCanvas",
            },
            "ko-KR": {
                workflow: "AI 비디오 스토리보드 워크플로우",
                descSuffix: "DramaCanvas 무한 캔버스에서 샷 프롬프트, 첫/끝 프레임 키프레임 및 카메라 모션을 확인하고, 원클릭으로 캔버스에 복제하여 작업을 시작하세요.",
                keywords: "AI 비디오 워크플로우, 스토리보드, 캐릭터 얼굴 고정, 첫끝프레임, 캔버스 복제, DramaCanvas",
            },
            "es-ES": {
                workflow: "Flujo de Trabajo de Guion Gráfico IA",
                descSuffix: "Inspecciona los prompts, fotogramas clave inicial/final y movimientos de cámara en DramaCanvas. Duplica este flujo de trabajo en tu lienzo infinito con un clic.",
                keywords: "flujo de trabajo vídeo IA, guion gráfico, consistencia facial, fotogramas clave, duplicar en lienzo, DramaCanvas",
            },
        };

        const localizedMeta = detailSuffixes[language] || detailSuffixes["zh-CN"];
        const defaultTitle = show?.title || ARCHIVED_CASE_INDEX.get(uuid)?.title || "AI Video Workflow";
        const defaultDesc = show?.description || (ARCHIVED_CASE_INDEX.get(uuid) ? `${ARCHIVED_CASE_INDEX.get(uuid)!.title} - ${localizedMeta.workflow}` : "");
        const localizedInfo = getLocalizedShowcase(uuid, defaultTitle, defaultDesc, language);
        title = `${localizedInfo.title} | ${SITE_NAME}`;
        description = `${localizedInfo.description} ${localizedMeta.descSuffix}`;
        keywords = `${localizedInfo.title}, ${localizedMeta.keywords}`;
        if (show) {
            image = `${SITE_URL}${show.src}`;
        }
    } else if (article) {
        title = registeredArticle?.seoTitle || `${article.title} | ${SITE_NAME}`;
        description = article.summary;
        const img = registeredArticle?.media?.find((m) => m.kind === "image" && isPublicMedia(m));
        if (img) image = `${SITE_URL}${img.src}`;
        const category = registeredArticle?.category || PUBLIC_PAGE_TERMS[language].articleCategory;
        keywords = `${article.title}, ${category}, DramaCanvas ${PUBLIC_PAGE_TERMS[language].guideLabel}`;
    } else if (blogList) {
        title = `${blogMetadata[language]?.title || blogMetadata["zh-CN"].title} | ${SITE_NAME}`;
        description = blogMetadata[language]?.description || blogMetadata["zh-CN"].description;
        keywords = blogMetadata[language]?.keywords || blogMetadata["zh-CN"].keywords;
    }

    let alternates = isIndexable ? buildHreflangAlternates(home ? "/" : cleanPath) : undefined;
    if (knownWork && publicWork && isIndexable) {
        alternates = BLOG_LOCALES.flatMap((candidate) => {
            const path = localizedWorkPath(publicWork.templateUuid, candidate);
            return path ? [{ language: candidate, href: SITE_URL + path }] : [];
        });
        alternates.push({ language: "x-default", href: SITE_URL + localizedWorkPath(publicWork.templateUuid, "en-US")! });
    }
    if (blog && isIndexable) {
        const locales = BLOG_LOCALES.filter((candidate) => (blog.slug ? findArticle(blog.slug, candidate)?.seoApproved === true : publicArticles(candidate).some((item) => item.seoApproved)));
        alternates = locales.map((candidate) => ({ language: candidate, href: SITE_URL + blogPath(candidate, blog.slug) }));
        const defaultLocale = locales.includes("en-US") ? "en-US" : locales[0];
        if (defaultLocale) alternates.push({ language: "x-default", href: SITE_URL + blogPath(defaultLocale, blog.slug) });
    }

    const schemaGraph: any[] = [{ "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: SITE_NAME, inLanguage: language, publisher: { "@id": `${SITE_URL}/#organization` } }, buildOrganizationSchema(language)];

    if (isIndexable) {
        schemaGraph.push(buildBreadcrumbsSchema(cleanPath, title, language));
    }
    if (knownWork && publicWork && canonical && isIndexable) {
        const copy = getWorkTranslation(publicWork.templateUuid, language) ?? getWorkTranslation(publicWork.templateUuid, "zh-CN");
        const workTitle = copy?.title ?? publicWork.title;
        const workDescription = copy?.description ?? publicWork.description;
        schemaGraph.push({
            "@type": "VideoObject",
            "@id": `${canonical}#video`,
            name: workTitle,
            description: workDescription,
            thumbnailUrl: `${SITE_URL}${publicWork.coverPath}`,
            uploadDate: publicWork.originalPublishAt,
            contentUrl: `${SITE_URL}${publicWork.videoPath}`,
            ...(publicWork.originalAuthor ? { author: { "@type": "Person", name: publicWork.originalAuthor } } : {}),
            ...(publicWork.originalAuthor ? { creditText: publicWork.originalAuthor } : {}),
        });
    }

    function resolveLicenseUrl(license: string): string {
        const trimmed = license.trim();
        if (/^mit$/i.test(trimmed)) return "https://opensource.org/licenses/MIT";
        if (/^cc\s*by\s*4\.0$/i.test(trimmed)) return "https://creativecommons.org/licenses/by/4.0/";
        if (/^cc0(\s*1\.0)?$/i.test(trimmed)) return "https://creativecommons.org/publicdomain/zero/1.0/";
        return license;
    }

    if (modelCopy) {
        schemaGraph.push({
            "@type": "SoftwareApplication",
            "@id": `${canonical}#application`,
            name: modelCopy.h1,
            url: canonical,
            description,
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            inLanguage: language,
            publisher: { "@id": `${SITE_URL}/#organization` },
            ...(modelCopy.capabilities?.length ? { featureList: modelCopy.capabilities.map((c) => c.title) } : {}),
        });

        const cases = model ? getModelCases(model.slug) : [];
        if (cases.length > 0) {
            schemaGraph.push({
                "@type": "ItemList",
                "@id": `${canonical}#cases`,
                itemListElement: cases.map((item) => {
                    const title = item.title[language] ?? item.title["en-US"] ?? item.title["zh-CN"] ?? "";
                    const use = item.use[language] ?? item.use["en-US"] ?? item.use["zh-CN"] ?? "";
                    const authorDisplay = item.credit.author.startsWith("@") ? item.credit.author : `@${item.credit.author}`;
                    return {
                        "@type": "ImageObject",
                        contentUrl: item.image.startsWith("http") ? item.image : `${SITE_URL}${item.image}`,
                        name: title,
                        description: use,
                        creator: {
                            "@type": "Person",
                            name: item.credit.author,
                            url: item.credit.authorUrl,
                        },
                        license: resolveLicenseUrl(item.credit.license),
                        creditText: `${authorDisplay} via ${item.credit.sourceName}`,
                        acquireLicensePage: item.credit.sourceRepo,
                        isBasedOn: item.credit.postUrl,
                    };
                }),
            });
        }

        schemaGraph.push({
            "@type": "FAQPage",
            "@id": `${canonical}#faq`,
            inLanguage: language,
            mainEntity: modelCopy.faq.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
        });
    } else if (guide) {
        schemaGraph.push(
            {
                "@type": "TechArticle",
                "@id": `${canonical}#article`,
                headline: guide.h1,
                description,
                url: canonical,
                inLanguage: language,
                dateModified: GUIDE_UPDATED,
                author: { "@id": `${SITE_URL}/#organization` },
                publisher: { "@id": `${SITE_URL}/#organization` },
                isPartOf: { "@id": `${SITE_URL}/#website` },
            },
            { "@type": "FAQPage", "@id": `${canonical}#faq`, inLanguage: language, mainEntity: guide.faq.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) },
        );
    } else if (about) {
        schemaGraph.push({ "@type": "AboutPage", "@id": `${canonical}#webpage`, url: canonical, name: title, description, inLanguage: language, about: { "@id": `${SITE_URL}/#organization` }, isPartOf: { "@id": `${SITE_URL}/#website` } });
    } else if (home) {
        schemaGraph.push(buildSoftwareSchema(language));
        const definition = HOME_POSITIONING[language];
        schemaGraph.push({
            "@type": "FAQPage",
            "@id": `${canonical}#faq`,
            inLanguage: language,
            // Mirrors the FAQ visible on the homepage when an authored set exists for this language.
            mainEntity: (
                publicFaqs(language, "home") ?? [
                    { question: definition.question, answer: definition.answer },
                    { question: BYOK_RELAY_COPY[language].question, answer: BYOK_RELAY_COPY[language].answer },
                ]
            ).map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
        });
        schemaGraph.push({ "@type": "WebPage", "@id": `${canonical}#webpage`, url: canonical || `${SITE_URL}/`, name: title, description, isPartOf: { "@id": `${SITE_URL}/#website` }, inLanguage: language });
    } else if (mcp) {
        const copy = MCP_PUBLIC_COPY[language];
        schemaGraph.push(
            { "@type": "SoftwareApplication", "@id": `${canonical}#application`, name: title.replace(" | DramaCanvas", ""), url: canonical, description, applicationCategory: "MultimediaApplication", operatingSystem: "Web", inLanguage: language },
            { "@type": "WebAPI", "@id": `${canonical}#api`, name: title.replace(" | DramaCanvas", ""), url: `${SITE_URL}/api/mcp`, documentation: canonical, description: `${description} MCP / Streamable HTTP: ${SITE_URL}/api/mcp`, inLanguage: language },
            {
                "@type": "HowTo",
                "@id": `${canonical}#setup`,
                name: copy["mcp.steps"],
                inLanguage: language,
                step: (["mcp.getKey", "mcp.paste", "mcp.explore"] as const).map((key, index) => ({ "@type": "HowToStep", position: index + 1, name: copy[key], text: copy[key], url: `${canonical}#setup` })),
            },
            {
                "@type": "FAQPage",
                "@id": `${canonical}#faq`,
                inLanguage: language,
                mainEntity: (["mcp.faq1", "mcp.faq2", "mcp.faq3", "mcp.faq4"] as const).map((key) => {
                    const [question, answer] = copy[key].split("|");
                    return { "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } };
                }),
            },
        );
    } else if (pricing) {
        schemaGraph.push(...buildPricingSchema(language));
    } else if (ecommerce) {
        schemaGraph.push({
            "@type": "WebApplication",
            "@id": `${canonical}#application`,
            name: "",
            url: canonical,
            description,
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            inLanguage: language,
        });
    } else if (help) {
        schemaGraph.push(...buildHelpSchema(language));
    } else if (registeredArticle && canonical) {
        const body = loadedArticle(registeredArticle.slug, language);
        if (body) {
            schemaGraph.push(articleSchema({ ...body, ...registeredArticle }, language, canonical));
            const howTo = articleHowToSchema(body, language, canonical);
            if (howTo) schemaGraph.push(howTo);
            if (body.faq.length) schemaGraph.push({ "@type": "FAQPage", "@id": canonical + "#faq", mainEntity: body.faq.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) });
        }
    }

    return {
        title,
        description,
        keywords,
        canonical,
        index: isIndexable,
        follow: knownPublic && safeQuery,
        type: article ? "article" : "website",
        language,
        alternates,
        blogFeedLocale: blog && isIndexable ? language : undefined,
        image,
        schema:
            knownPublic && safeQuery
                ? {
                      "@context": "https://schema.org",
                      "@graph": schemaGraph,
                  }
                : undefined,
    };
}

export { escapeHTML, safeJSON, renderSEOHead, applyPageSEO } from "./page-seo-head";

/** HTML, response headers and sitemap use the same approved publication set. */
export function indexedPublicPaths(articles?: { slug: string; status: string; seoApproved: boolean; seoApprovedLocales?: BlogLocale[] }[]): string[] {
    const approved = articles ? new Set(articles.filter((article) => article.status === "published" && article.seoApproved).map((article) => article.slug)) : undefined;
    const staticRoutes = BLOG_LOCALES.flatMap((locale) =>
        [
            "/",
            "/changelog",
            "/pricing",
            "/help",
            "/mcp",
            "/legal/terms",
            "/legal/privacy",
            "/legal/refund",
            "/legal/acceptable-use",
            ...MODEL_PAGES.map((model) => "/" + model.slug),
            ...GUIDE_SLUGS.map((slug) => "/" + slug),
        ].map((path) => localizedPublicPath(path, locale)),
    );
    const blogs = BLOG_LOCALES.flatMap((locale) => {
        const items = publicArticles(locale).filter((a) => a.seoApproved && (!approved || approved.has(a.slug)));
        return items.length ? [blogPath(locale), ...items.map((a) => blogPath(locale, a.slug))] : [];
    });
    const works = BLOG_LOCALES.flatMap((locale) =>
        WESTERN_HOME_SHOWS.flatMap((work) => {
            const path = localizedWorkPath(work.templateUuid, locale);
            return path ? [path] : [];
        }),
    );
    return excludeBlogRedirects([...new Set([...staticRoutes, ...blogs, ...works, ...skillPublicPaths()])]).filter((path) => resolvePageSEO(path).index);
}
