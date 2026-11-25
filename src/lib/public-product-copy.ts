import type { BlogLocale } from "../content/blog-locales";
import { toTraditionalChinese } from "./i18n-traditional";

/** Public generation-credit handling, not a payment-refund SLA.
 * Keep UI, article FAQs and discovery exports aligned with task_terminal.go:
 * an ambiguous provider outcome requires review, not an immediate refund.
 */
const chineseRefund = "生成失败时，这次扣的积分会退回你的账户。如果网络中断、暂时看不到结果，系统会先核对，确认失败后再退回，不会重复扣费。";
export const GENERATION_REFUND_COPY: Record<BlogLocale, string> = {
    "pt-BR":
        "Se a geração falhar, os créditos gastos voltam para a sua conta. Caso ocorra queda de conexão e o resultado não apareça de imediato, o sistema verifica a solicitação e devolve os créditos assim que a falha for confirmada, sem cobrança duplicada.",
    "zh-CN": chineseRefund,
    "zh-HK": "生成失敗時，本次扣除的積分會退回你的帳戶。若因網絡中斷而暫時未見到結果，系統會先核對，確認失敗後即會退回積分，不會重複扣費。",
    "zh-TW": "生成失敗時，本次扣除的點數會退回你的帳號。若遇到網路中斷或暫時無法讀取結果，系統會先核對狀態，確認生成失敗後即刻退回，不會重複扣點。",
    "en-US": "If a generation fails, the deducted credits are returned to your account. If a network interruption delays the result, the system verifies the failure before returning your credits so you are not charged twice.",
    "ja-JP": "生成に失敗した場合は、消費されたクレジットがアカウントへ返還されます。通信の中断などで結果がすぐに確認できない場合も、状況を確認したのち、失敗が確定した時点でクレジットを返還します。二重に引き落とされることはありません。",
    "ko-KR": "생성에 실패하면 차감된 크레딧은 계정으로 다시 돌려드려요. 네트워크 오류 등으로 결과를 바로 확인하기 어려울 때는 시스템이 실패 여부를 먼저 확인한 뒤 돌려드리며, 크레딧이 중복으로 빠져나가지 않아요.",
    "es-ES": "Si una generación falla, los créditos utilizados se devuelven a tu cuenta. Si hay un corte de conexión y no ves el resultado al momento, el sistema lo comprueba primero y devuelve los créditos al confirmar el error, sin cobros duplicados.",
};

/** Page-specific intent stays distinct from the homepage; no unsupported guarantees. */
export const PUBLIC_PAGE_TERMS: Record<BlogLocale, { pricingKeywords: string; pricingLink: string; guideLabel: string; articleCategory: string }> = {
    "pt-BR": {
        pricingKeywords: "preços DramaCanvas, criar video com ia, ia para criar videos, ia que cria videos, novela vertical, minisséries, gerador de video com ia gratis, storyboard ia",
        pricingLink: "Preços e créditos",
        guideLabel: "guias",
        articleCategory: "Criação com IA",
    },
    "zh-CN": {
        pricingKeywords: "AI视频生成价格, AI视频生成, AI短剧, AI漫剧, 文生视频, 图生视频, AI生成视频免费, DramaCanvas 价格",
        pricingLink: "价格与积分说明",
        guideLabel: "指南",
        articleCategory: "AI创作",
    },
    "zh-HK": {
        pricingKeywords: "AI 影片 價格, AI影片生成, AI短劇, AI生成影片, 圖片生成影片, 文字生成影片, AI生成影片 免費, 分鏡腳本",
        pricingLink: "價格與積分說明",
        guideLabel: "指南",
        articleCategory: "AI創作",
    },
    "zh-TW": {
        pricingKeywords: "AI 影片 價格, AI影片生成, AI短劇, AI 影片製作, AI生成影片 免費, 圖片生成影片, 文字生成影片, 分鏡腳本",
        pricingLink: "價格與點數說明",
        guideLabel: "指南",
        articleCategory: "AI創作",
    },
    "en-US": {
        pricingKeywords: "DramaCanvas pricing, membership plans, AI video credits, BYOK workspace, Seedance 2.5 cost, Nano Banana cost, failed generation credits",
        pricingLink: "Pricing & credits",
        guideLabel: "guides",
        articleCategory: "AI creation",
    },
    "ja-JP": {
        pricingKeywords: "動画生成AI 料金, 動画生成AI 無料, 画像生成AI 無料, 動画生成AI おすすめ, AI 動画 作成 無料, 縦型ショートドラマ, 絵コンテ AI, DramaCanvas 料金",
        pricingLink: "料金・クレジット",
        guideLabel: "ガイド",
        articleCategory: "AI制作",
    },
    "ko-KR": {
        pricingKeywords: "AI 영상 만들기 가격, AI 동영상 만들기, AI 영상 생성 무료, 무료 ai 이미지 생성, 숏드라마, 영상 편집 ai, 스토리 보드 ai, DramaCanvas 요금",
        pricingLink: "요금 및 크레딧",
        guideLabel: "가이드",
        articleCategory: "AI 창작",
    },
    "es-ES": {
        pricingKeywords: "precios DramaCanvas, crear videos con ia, ia para crear videos, crear videos con ia gratis, ia para hacer videos, generador de videos con ia gratis, creador de videos ia, series cortas",
        pricingLink: "Precios y créditos",
        guideLabel: "guías",
        articleCategory: "Creación con IA",
    },
};

/** Public banners do not promise the default price; pricing reads the current offer. */
export const PUBLIC_BYOK_PRICE: Record<BlogLocale, string> = {
    "zh-CN": "价格与周期以当前商品为准",
    "zh-HK": "價格同服務期以現行方案為準",
    "zh-TW": "價格與服務期間依目前方案為準",
    "en-US": "Price and period follow the current offer",
    "ja-JP": "料金と期間は現在のプランをご確認ください",
    "ko-KR": "가격과 기간은 현재 상품을 확인하세요",
    "es-ES": "Precio y periodo según la oferta vigente",
    "pt-BR": "Preço e período conforme a oferta atual",
};
