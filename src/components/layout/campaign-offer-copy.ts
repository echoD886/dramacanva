import type { BlogLocale } from "@/content/blog-locales";

/** 活动弹窗文案。付费活动只写“购买 / 首月”，不写“送 / 领取 / 免费”。 */
export type CampaignOfferCopy = {
    eyebrow: string;
    daysLeft: (days: number) => string;
    title: string;
    credits: (credits: string) => string;
    trialNote: string;
    packLabel: string;
    monthlyLabel: string;
    monthlyRenewal: (renewal: string) => string;
    sharedCredits: string;
    creditsCta: (price: string) => string;
    monthlyCta: string;
    terms: (endsAt: string) => string;
    close: string;
};

const copy: Record<BlogLocale, CampaignOfferCopy> = {
    "en-US": {
        eyebrow: "October offer",
        daysLeft: (days) => (days <= 1 ? "Last day" : `${days} days left`),
        title: "Start your AI films for less",
        credits: (credits) => `${credits} credits`,
        trialNote: "Once per account · credits never expire",
        packLabel: "Credit pack",
        monthlyLabel: "Monthly plan, first month",
        monthlyRenewal: (renewal) => `then ${renewal}/mo`,
        sharedCredits: "One balance for Seedance video and Nano Banana images. Credits are returned to your balance if generation fails.",
        creditsCta: (price) => `Buy for ${price}`,
        monthlyCta: "See all plans",
        terms: (endsAt) => `Ends ${endsAt} · USD, secure checkout`,
        close: "Close offer",
    },
    "zh-CN": {
        eyebrow: "十月限时活动",
        daysLeft: (days) => (days <= 1 ? "最后一天" : `还剩 ${days} 天`),
        title: "AI 短片创作，低价开拍",
        credits: (credits) => `${credits} 积分`,
        trialNote: "每个账号限购一次 · 积分用完为止",
        packLabel: "积分包",
        monthlyLabel: "月付会员首月",
        monthlyRenewal: (renewal) => `之后每月 ${renewal}`,
        sharedCredits: "Seedance 视频与 Nano Banana 图片共用积分，生成失败自动退回。",
        creditsCta: (price) => `${price} 立即购买`,
        monthlyCta: "查看全部方案",
        terms: (endsAt) => `活动截至 ${endsAt} · 美元结算，安全支付`,
        close: "关闭活动弹窗",
    },
    "zh-HK": {
        eyebrow: "十月限時活動",
        daysLeft: (days) => (days <= 1 ? "最後一天" : `尚餘 ${days} 天`),
        title: "AI 短片創作，低價開拍",
        credits: (credits) => `${credits} 積分`,
        trialNote: "每個帳戶限購一次 · 積分用完為止",
        packLabel: "積分包",
        monthlyLabel: "月付會員首月",
        monthlyRenewal: (renewal) => `之後每月 ${renewal}`,
        sharedCredits: "Seedance 影片與 Nano Banana 圖片共用積分，生成失敗自動退回。",
        creditsCta: (price) => `${price} 立即購買`,
        monthlyCta: "查看全部方案",
        terms: (endsAt) => `活動截至 ${endsAt} · 美元結算，安全付款`,
        close: "關閉活動視窗",
    },
    "zh-TW": {
        eyebrow: "十月限時活動",
        daysLeft: (days) => (days <= 1 ? "最後一天" : `還剩 ${days} 天`),
        title: "AI 短片創作，低價開拍",
        credits: (credits) => `${credits} 點`,
        trialNote: "每個帳號限購一次 · 點數用完為止",
        packLabel: "點數包",
        monthlyLabel: "月付會員首月",
        monthlyRenewal: (renewal) => `之後每月 ${renewal}`,
        sharedCredits: "Seedance 影片與 Nano Banana 圖片共用點數，生成失敗自動退回。",
        creditsCta: (price) => `${price} 立即購買`,
        monthlyCta: "查看全部方案",
        terms: (endsAt) => `活動截至 ${endsAt} · 美元結算，安全付款`,
        close: "關閉活動視窗",
    },
    "ja-JP": {
        eyebrow: "10月限定キャンペーン",
        daysLeft: (days) => (days <= 1 ? "本日まで" : `残り ${days} 日`),
        title: "AI映像づくりを、お手頃に",
        credits: (credits) => `${credits} クレジット`,
        trialNote: "1アカウント1回限り · クレジットは無期限",
        packLabel: "クレジットパック",
        monthlyLabel: "月額プラン初月",
        monthlyRenewal: (renewal) => `翌月以降 ${renewal}/月`,
        sharedCredits: "Seedanceの動画もNano Bananaの画像も共通クレジット。生成失敗時は返還されます。",
        creditsCta: (price) => `${price}で購入`,
        monthlyCta: "すべてのプランを見る",
        terms: (endsAt) => `${endsAt}まで · 米ドル建て、安全なお支払い`,
        close: "キャンペーンを閉じる",
    },
    "ko-KR": {
        eyebrow: "10월 한정 이벤트",
        daysLeft: (days) => (days <= 1 ? "오늘 마감" : `${days}일 남음`),
        title: "AI 영상 제작, 부담 없이 시작",
        credits: (credits) => `${credits} 크레딧`,
        trialNote: "계정당 1회 구매 · 크레딧 소진 시까지 사용",
        packLabel: "크레딧 팩",
        monthlyLabel: "월간 플랜 첫 달",
        monthlyRenewal: (renewal) => `이후 월 ${renewal}`,
        sharedCredits: "Seedance 영상과 Nano Banana 이미지가 같은 크레딧을 사용하며, 생성 실패 시 반환됩니다.",
        creditsCta: (price) => `${price}에 구매`,
        monthlyCta: "전체 플랜 보기",
        terms: (endsAt) => `${endsAt}까지 · 미국 달러 결제, 안전한 결제`,
        close: "이벤트 닫기",
    },
    "es-ES": {
        eyebrow: "Oferta de octubre",
        daysLeft: (days) => (days <= 1 ? "Último día" : `Quedan ${days} días`),
        title: "Crea vídeo con IA por menos",
        credits: (credits) => `${credits} créditos`,
        trialNote: "Una vez por cuenta · los créditos no caducan",
        packLabel: "Paquete de créditos",
        monthlyLabel: "Plan mensual, primer mes",
        monthlyRenewal: (renewal) => `después ${renewal}/mes`,
        sharedCredits: "Un solo saldo para vídeo Seedance e imágenes Nano Banana. Si la generación falla, se devuelven los créditos a tu saldo.",
        creditsCta: (price) => `Comprar por ${price}`,
        monthlyCta: "Ver todos los planes",
        terms: (endsAt) => `Hasta el ${endsAt} · USD, pago seguro`,
        close: "Cerrar oferta",
    },
    "pt-BR": {
        eyebrow: "Oferta de outubro",
        daysLeft: (days) => (days <= 1 ? "Último dia" : `Faltam ${days} dias`),
        title: "Crie vídeos com IA por menos",
        credits: (credits) => `${credits} créditos`,
        trialNote: "Uma vez por conta · os créditos não expiram",
        packLabel: "Pacote de créditos",
        monthlyLabel: "Plano mensal, primeiro mês",
        monthlyRenewal: (renewal) => `depois ${renewal}/mês`,
        sharedCredits: "Um só saldo para vídeo Seedance e imagens Nano Banana. Se a geração falhar, os créditos são devolvidos ao seu saldo.",
        creditsCta: (price) => `Comprar por ${price}`,
        monthlyCta: "Ver todos os planos",
        terms: (endsAt) => `Até ${endsAt} · USD, pagamento seguro`,
        close: "Fechar oferta",
    },
};

export function campaignOfferCopy(locale: string): CampaignOfferCopy {
    return copy[locale as BlogLocale] ?? copy["en-US"];
}
