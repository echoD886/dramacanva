import type { BlogLocale } from "@/content/blog-locales";

type HolidayCopy = {
    close: string;
    limitedOffer: string;
    title: (percent: number) => string;
    body: string;
    code: string;
    cta: string;
    terms: string;
    eventNames: Record<string, string>;
};

const copy: Record<BlogLocale, HolidayCopy> = {
    "en-US": {
        close: "Close offer",
        limitedOffer: "limited offer",
        title: (percent) => `${percent}% off your first month`,
        body: "Your next story starts here. New customers can use this code on a Creator monthly plan. Renewals return to the regular price; the payment page shows your final total.",
        code: "Checkout code",
        cta: "Explore monthly plans",
        terms: "Limited time · Eligible new customers, first month only · One code per checkout",
        eventNames: { "halloween-2026": "Halloween", "black-friday-2026": "Black Friday", "holiday-2026": "Holiday season" },
    },
    "zh-CN": {
        close: "关闭活动弹窗",
        limitedOffer: "限时优惠",
        title: (percent) => `创作会员首月立减 ${percent}%`,
        body: "你的下一个故事，从这里开始。新用户订阅创作会员月付时可在结账页使用优惠码；续费恢复原价，实际金额以支付页面为准。",
        code: "结账优惠码",
        cta: "查看月付方案",
        terms: "限活动期 · 符合条件的新用户首月使用 · 每笔订单限用一个优惠码",
        eventNames: { "halloween-2026": "万圣节", "black-friday-2026": "黑色星期五", "holiday-2026": "年末节日" },
    },
    "zh-HK": {
        close: "關閉活動視窗",
        limitedOffer: "限時優惠",
        title: (percent) => `創作會員首月減 ${percent}%`,
        body: "你的下一個故事，從這裏開始。新用戶訂閱創作會員月付方案時可在結帳頁使用優惠碼；續訂恢復原價，實際金額以付款頁面為準。",
        code: "結帳優惠碼",
        cta: "查看月付方案",
        terms: "活動期間限定 · 合資格新用戶首月使用 · 每筆訂單限用一個優惠碼",
        eventNames: { "halloween-2026": "萬聖節", "black-friday-2026": "黑色星期五", "holiday-2026": "年末節日" },
    },
    "zh-TW": {
        close: "關閉活動視窗",
        limitedOffer: "限時優惠",
        title: (percent) => `創作會員首月享 ${percent}% 折扣`,
        body: "你的下一個故事，從這裡開始。新用戶訂閱創作會員月付方案時可於結帳頁使用優惠碼；續訂恢復原價，實際金額以付款頁面為準。",
        code: "結帳優惠碼",
        cta: "查看月付方案",
        terms: "活動期間限定 · 符合資格的新用戶首月使用 · 每筆訂單限用一個優惠碼",
        eventNames: { "halloween-2026": "萬聖節", "black-friday-2026": "黑色星期五", "holiday-2026": "年末節日" },
    },
    "ja-JP": {
        close: "特典を閉じる",
        limitedOffer: "期間限定オファー",
        title: (percent) => `初月 ${percent}% オフ`,
        body: "次の物語を、ここから。新規のお客様はクリエイター向け月額プランの初月にこのコードをご利用いただけます。更新後は通常料金に戻ります。最終金額は決済画面でご確認ください。",
        code: "決済用コード",
        cta: "月額プランを見る",
        terms: "期間限定 · 対象となる新規のお客様の初月のみ · 1回の決済につき1コード",
        eventNames: { "halloween-2026": "ハロウィン", "black-friday-2026": "ブラックフライデー", "holiday-2026": "ホリデーシーズン" },
    },
    "ko-KR": {
        close: "혜택 닫기",
        limitedOffer: "기간 한정 혜택",
        title: (percent) => `첫 달 ${percent}% 할인`,
        body: "다음 이야기를 여기서 시작하세요. 신규 고객은 크리에이터 월간 요금제 첫 달에 이 코드를 사용할 수 있습니다. 갱신 시 정상 요금이 적용되며 최종 결제 금액은 결제 화면에서 확인할 수 있습니다.",
        code: "결제 할인 코드",
        cta: "월간 요금제 보기",
        terms: "기간 한정 · 대상 신규 고객의 첫 달에만 적용 · 결제당 코드 1개",
        eventNames: { "halloween-2026": "할로윈", "black-friday-2026": "블랙 프라이데이", "holiday-2026": "연말 시즌" },
    },
    "es-ES": {
        close: "Cerrar oferta",
        limitedOffer: "oferta por tiempo limitado",
        title: (percent) => `${percent} % de descuento el primer mes`,
        body: "Tu próxima historia empieza aquí. Los nuevos clientes pueden usar este código en el primer mes de un plan mensual Creator. Las renovaciones vuelven al precio habitual; la página de pago muestra el total final.",
        code: "Código de descuento",
        cta: "Ver planes mensuales",
        terms: "Tiempo limitado · Solo el primer mes para nuevos clientes elegibles · Un código por compra",
        eventNames: { "halloween-2026": "Halloween", "black-friday-2026": "Black Friday", "holiday-2026": "Fiestas de fin de año" },
    },
    "pt-BR": {
        close: "Fechar oferta",
        limitedOffer: "oferta por tempo limitado",
        title: (percent) => `${percent}% de desconto no primeiro mês`,
        body: "Sua próxima história começa aqui. Novos clientes podem usar este código no primeiro mês de um plano mensal Creator. As renovações voltam ao preço normal; a página de pagamento mostra o total final.",
        code: "Código de desconto",
        cta: "Ver planos mensais",
        terms: "Por tempo limitado · Apenas no primeiro mês para novos clientes elegíveis · Um código por compra",
        eventNames: { "halloween-2026": "Halloween", "black-friday-2026": "Black Friday", "holiday-2026": "Festas de fim de ano" },
    },
};

export function holidayOfferCopy(locale: string): HolidayCopy {
    return copy[locale as BlogLocale] ?? copy["en-US"];
}
