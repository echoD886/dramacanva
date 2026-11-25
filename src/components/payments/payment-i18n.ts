/**
 * 8-language localized dictionary for DramaCanvas payment popover and payment methods section.
 * Plain, neutral, objective copy without exclamation marks or internal jargon (e.g. no 渠道 / 通道).
 */

export const PAYMENT_LOCALES = ["zh-CN", "zh-TW", "zh-HK", "en-US", "ja-JP", "ko-KR", "es-ES", "pt-BR"] as const;
export type PaymentLocale = (typeof PAYMENT_LOCALES)[number];

export interface PaymentI18nCopy {
    checkout: {
        choose: string;
        continue: string;
        redirecting: string;
        unavailable: string;
        notSupported: string;
        taxAtCheckout: string;
        retry: string;
        error: string;
        lastUsed: string;
        methodsSupportedHint: string;
        closeAria: string;
        openingTab: string;
        openedTitle: string;
        openedBody: string;
        reopen: string;
        dismiss: string;
    };
    paymentMethods: {
        title: string;
        subtitle: string;
        ctaMiniLabel: string;
        securityNotice: string;
        groups: {
            cards: string;
            wallets: string;
            local: string;
        };
        names: Record<string, string>;
    };
}

const copyZhCn: PaymentI18nCopy = {
    checkout: {
        choose: "选择付款方式",
        continue: "继续付款",
        redirecting: "正在前往付款页...",
        unavailable: "当前服务暂不可用",
        notSupported: "暂不支持当前商品规格",
        taxAtCheckout: "税费在付款页按地区计算",
        retry: "重新尝试",
        error: "暂时无法打开付款页，本次未扣款，请重试",
        lastUsed: "上次使用",
        methodsSupportedHint: "支持的主流付款方式",
        closeAria: "关闭付款方式选择",
        openingTab: "正在打开安全付款页…",
        openedTitle: "付款页已在新标签页打开",
        openedBody: "完成付款后积分或会员会自动到账；不想付款时直接关闭那个标签页即可，不会扣款。",
        reopen: "重新打开付款页",
        dismiss: "知道了",
    },
    paymentMethods: {
        title: "支持的付款方式",
        subtitle: "支持多种银行卡、电子钱包和本地支付方式，可用方式以付款页显示为准。",
        ctaMiniLabel: "支持银行卡、电子钱包和本地支付",
        securityNotice: "付款在第三方安全收银台完成",
        groups: {
            cards: "信用卡与借记卡",
            wallets: "电子钱包",
            local: "本地支付",
        },
        names: {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            unionpay: "银联",
            jcb: "JCB",
            apple_pay: "Apple Pay",
            applepay: "Apple Pay",
            google_pay: "Google Pay",
            googlepay: "Google Pay",
            paypal: "PayPal",
            alipay: "支付宝",
            wechat_pay: "微信支付",
            wechatpay: "微信支付",
            link: "Link",
            pix: "Pix",
        },
    },
};

const copyZhTw: PaymentI18nCopy = {
    checkout: {
        choose: "選擇付款方式",
        continue: "繼續付款",
        redirecting: "正在前往付款頁...",
        unavailable: "當前服務暫不可用",
        notSupported: "暫不支援當前商品規格",
        taxAtCheckout: "稅費在付款頁依地區計算",
        retry: "重新嘗試",
        error: "暫時無法開啟付款頁面，本次未扣款，請重試",
        lastUsed: "上次使用",
        methodsSupportedHint: "支援的主流付款方式",
        closeAria: "關閉付款方式選擇",
        openingTab: "正在前往安全付款頁面…",
        openedTitle: "付款頁面已在分頁開啟",
        openedBody: "付款完成後點數或會員將自動入帳；若取消付款，直接關閉該分頁即可，不會扣款。",
        reopen: "重新開啟付款頁",
        dismiss: "知道了",
    },
    paymentMethods: {
        title: "支援的付款方式",
        subtitle: "支援多種銀行卡、電子錢包及在地支付方式，可用方式以付款頁面顯示為準。",
        ctaMiniLabel: "支援銀行卡、電子錢包及在地支付",
        securityNotice: "付款在第三方安全收銀台完成",
        groups: {
            cards: "信用卡與簽帳金融卡",
            wallets: "電子錢包",
            local: "在地支付",
        },
        names: {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            unionpay: "銀聯",
            jcb: "JCB",
            apple_pay: "Apple Pay",
            applepay: "Apple Pay",
            google_pay: "Google Pay",
            googlepay: "Google Pay",
            paypal: "PayPal",
            alipay: "支付寶",
            wechat_pay: "微信支付",
            wechatpay: "微信支付",
            link: "Link",
            pix: "Pix",
        },
    },
};

const copyZhHk: PaymentI18nCopy = {
    checkout: {
        choose: "選擇付款方式",
        continue: "繼續付款",
        redirecting: "正在前往付款頁...",
        unavailable: "當前服務暫不可用",
        notSupported: "暫不支援當前商品規格",
        taxAtCheckout: "稅費將於付款頁按地區計算",
        retry: "重新嘗試",
        error: "暫時無法打開付款頁面，本次未扣款，請重試",
        lastUsed: "上次使用",
        methodsSupportedHint: "支援的主流付款方式",
        closeAria: "關閉付款方式選擇",
        openingTab: "正在前往安全付款頁面…",
        openedTitle: "付款頁面已在新分頁開啟",
        openedBody: "付款完成後積分或會員將自動入帳；若取消付款，直接關閉該分頁即可，不會扣款。",
        reopen: "重新開啟付款頁",
        dismiss: "知道了",
    },
    paymentMethods: {
        title: "支援的付款方式",
        subtitle: "支援多種銀行卡、電子錢包及本地付款方式，可用方式以付款頁面顯示為準。",
        ctaMiniLabel: "支援銀行卡、電子錢包及本地付款",
        securityNotice: "付款在第三方安全收銀台完成",
        groups: {
            cards: "信用卡及扣賬卡",
            wallets: "電子錢包",
            local: "本地付款",
        },
        names: {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            unionpay: "銀聯",
            jcb: "JCB",
            apple_pay: "Apple Pay",
            applepay: "Apple Pay",
            google_pay: "Google Pay",
            googlepay: "Google Pay",
            paypal: "PayPal",
            alipay: "支付寶",
            wechat_pay: "WeChat Pay",
            wechatpay: "WeChat Pay",
            link: "Link",
            pix: "Pix",
        },
    },
};

const copyEnUs: PaymentI18nCopy = {
    checkout: {
        choose: "Select payment method",
        continue: "Continue to payment",
        redirecting: "Redirecting to checkout...",
        unavailable: "Currently unavailable",
        notSupported: "Not supported for this item",
        taxAtCheckout: "Taxes calculated at checkout by region",
        retry: "Retry",
        error: "Unable to open the checkout page. You have not been charged. Please try again.",
        lastUsed: "Last used",
        methodsSupportedHint: "Supported payment methods",
        closeAria: "Close payment method selection",
        openingTab: "Opening secure checkout…",
        openedTitle: "Checkout opened in a new tab",
        openedBody: "Credits or membership will apply automatically once paid. Close the tab to cancel without being charged.",
        reopen: "Reopen checkout",
        dismiss: "Got it",
    },
    paymentMethods: {
        title: "Supported Payment Methods",
        subtitle: "Supports cards, digital wallets, and local payment methods; available options are shown on the checkout page.",
        ctaMiniLabel: "Supports cards, digital wallets, and local payments",
        securityNotice: "Payments are completed at a secure third-party checkout",
        groups: {
            cards: "Credit & Debit Cards",
            wallets: "Digital Wallets",
            local: "Local Payments",
        },
        names: {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            unionpay: "UnionPay",
            jcb: "JCB",
            apple_pay: "Apple Pay",
            applepay: "Apple Pay",
            google_pay: "Google Pay",
            googlepay: "Google Pay",
            paypal: "PayPal",
            alipay: "Alipay",
            wechat_pay: "WeChat Pay",
            wechatpay: "WeChat Pay",
            link: "Link",
            pix: "Pix",
        },
    },
};

const copyJaJp: PaymentI18nCopy = {
    checkout: {
        choose: "お支払い方法を選択",
        continue: "お支払いを続ける",
        redirecting: "決済画面へ移動しています...",
        unavailable: "現在ご利用いただけません",
        notSupported: "この商品には対応していません",
        taxAtCheckout: "税金は決済画面で地域別に計算されます",
        retry: "再試行",
        error: "決済画面を開くことができませんでした。請求は発生していません。もう一度お試しください。",
        lastUsed: "前回利用",
        methodsSupportedHint: "ご利用可能なお支払い方法",
        closeAria: "お支払い方法の選択を閉じる",
        openingTab: "安全な決済ページを開いています…",
        openedTitle: "決済ページを新しいタブで開きました",
        openedBody: "決済完了後に自動付与されます。購入をやめる場合はタブを閉じれば請求されません。",
        reopen: "決済ページを再度開く",
        dismiss: "了解",
    },
    paymentMethods: {
        title: "対応しているお支払い方法",
        subtitle: "各種クレジットカード、デジタルウォレット、地域の決済方法に対応しており、利用可能な方法は決済画面に表示されます。",
        ctaMiniLabel: "クレジットカード、デジタルウォレット、地域決済に対応",
        securityNotice: "お支払いは安全なサードパーティの決済画面で行われます",
        groups: {
            cards: "クレジットカード・デビットカード",
            wallets: "デジタルウォレット",
            local: "地域決済",
        },
        names: {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            unionpay: "銀聯 (UnionPay)",
            jcb: "JCB",
            apple_pay: "Apple Pay",
            applepay: "Apple Pay",
            google_pay: "Google Pay",
            googlepay: "Google Pay",
            paypal: "PayPal",
            alipay: "Alipay (アリペイ)",
            wechat_pay: "WeChat Pay (ウィーチャットペイ)",
            wechatpay: "WeChat Pay (ウィーチャットペイ)",
            link: "Link",
            pix: "Pix",
        },
    },
};

const copyKoKr: PaymentI18nCopy = {
    checkout: {
        choose: "결제 수단 선택",
        continue: "결제 진행",
        redirecting: "결제 페이지로 이동 중...",
        unavailable: "현재 이용 불가",
        notSupported: "현재 상품 미지원",
        taxAtCheckout: "세금은 결제 페이지에서 지역별로 계산됩니다",
        retry: "다시 시도",
        error: "결제 페이지를 열 수 없습니다. 결제는 진행되지 않았으니 다시 시도해 주세요.",
        lastUsed: "최근 이용",
        methodsSupportedHint: "지원되는 결제 수단",
        closeAria: "결제 수단 선택 닫기",
        openingTab: "안전한 결제 페이지로 이동하고 있습니다…",
        openedTitle: "새 탭에서 결제 페이지가 열렸습니다",
        openedBody: "결제 완료 시 크레딧이나 멤버십이 자동 지급되며, 탭을 닫으면 결제되지 않습니다.",
        reopen: "결제 페이지 다시 열기",
        dismiss: "확인",
    },
    paymentMethods: {
        title: "지원하는 결제 수단",
        subtitle: "다양한 신용카드, 전자지갑 및 현지 결제 수단을 지원하며, 이용 가능한 수단은 결제 페이지에서 확인하실 수 있습니다.",
        ctaMiniLabel: "신용카드, 전자지갑 및 현지 결제 지원",
        securityNotice: "결제는 안전한 제3자 결제 페이지에서 진행됩니다",
        groups: {
            cards: "신용 및 체크카드",
            wallets: "디지털 지갑",
            local: "현지 결제",
        },
        names: {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            unionpay: "유니온페이 (UnionPay)",
            jcb: "JCB",
            apple_pay: "Apple Pay",
            applepay: "Apple Pay",
            google_pay: "Google Pay",
            googlepay: "Google Pay",
            paypal: "PayPal",
            alipay: "알리페이 (Alipay)",
            wechat_pay: "위챗페이 (WeChat Pay)",
            wechatpay: "위챗페이 (WeChat Pay)",
            link: "Link",
            pix: "Pix",
        },
    },
};

const copyEsEs: PaymentI18nCopy = {
    checkout: {
        choose: "Seleccionar método de pago",
        continue: "Continuar al pago",
        redirecting: "Redirigiendo al pago...",
        unavailable: "No disponible temporalmente",
        notSupported: "No compatible con este artículo",
        taxAtCheckout: "Impuestos calculados en la pantalla de pago según la región",
        retry: "Reintentar",
        error: "No se ha podido abrir la página de pago. No se ha realizado ningún cargo. Inténtelo de nuevo.",
        lastUsed: "Último usado",
        methodsSupportedHint: "Métodos de pago admitidos",
        closeAria: "Cerrar selección de método de pago",
        openingTab: "Abriendo la página de pago seguro…",
        openedTitle: "La página de pago se ha abierto en una nueva pestaña",
        openedBody: "Los créditos o la suscripción se añadirán tras el pago. Si no deseas pagar, cierra la pestaña sin cargos.",
        reopen: "Reabrir página de pago",
        dismiss: "Entendido",
    },
    paymentMethods: {
        title: "Métodos de pago aceptados",
        subtitle: "Admitimos diversas tarjetas, carteras digitales y métodos de pago locales; los métodos disponibles se muestran en la página de pago.",
        ctaMiniLabel: "Admite tarjetas, carteras digitales y pagos locales",
        securityNotice: "El pago se realiza en una pasarela de pago segura de terceros",
        groups: {
            cards: "Tarjetas de crédito y débito",
            wallets: "Carteras digitales",
            local: "Pagos locales",
        },
        names: {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            unionpay: "UnionPay",
            jcb: "JCB",
            apple_pay: "Apple Pay",
            applepay: "Apple Pay",
            google_pay: "Google Pay",
            googlepay: "Google Pay",
            paypal: "PayPal",
            alipay: "Alipay",
            wechat_pay: "WeChat Pay",
            wechatpay: "WeChat Pay",
            link: "Link",
            pix: "Pix",
        },
    },
};

const copyPtBr: PaymentI18nCopy = {
    checkout: {
        choose: "Selecionar método de pagamento",
        continue: "Continuar para o pagamento",
        redirecting: "Redirecionando para o pagamento...",
        unavailable: "Temporariamente indisponível",
        notSupported: "Não compatível com este item",
        taxAtCheckout: "Impostos calculados no checkout de acordo com a região",
        retry: "Tentar novamente",
        error: "Não foi possível abrir a página de pagamento. Nenhuma cobrança foi realizada. Tente novamente.",
        lastUsed: "Usado por último",
        methodsSupportedHint: "Métodos de pagamento aceitos",
        closeAria: "Fechar seleção de forma de pagamento",
        openingTab: "Abrindo a página segura de pagamento…",
        openedTitle: "A página de pagamento foi aberta em uma nova aba",
        openedBody: "Créditos ou assinatura serão liberados após o pagamento. Se desistir, basta fechar a aba sem cobrança.",
        reopen: "Reabrir página de pagamento",
        dismiss: "Entendi",
    },
    paymentMethods: {
        title: "Formas de pagamento aceitas",
        subtitle: "Aceitamos diversos cartões, carteiras digitais e métodos de pagamento locais; as opções disponíveis são exibidas na página de pagamento.",
        ctaMiniLabel: "Suporte a cartões, carteiras digitais e pagamentos locais",
        securityNotice: "O pagamento é concluído em um checkout seguro de terceiros",
        groups: {
            cards: "Cartões de crédito e débito",
            wallets: "Carteiras digitais",
            local: "Pagamentos locais",
        },
        names: {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            unionpay: "UnionPay",
            jcb: "JCB",
            apple_pay: "Apple Pay",
            applepay: "Apple Pay",
            google_pay: "Google Pay",
            googlepay: "Google Pay",
            paypal: "PayPal",
            alipay: "Alipay",
            wechat_pay: "WeChat Pay",
            wechatpay: "WeChat Pay",
            link: "Link",
            pix: "Pix",
        },
    },
};

const PAYMENT_COPIES: Record<PaymentLocale, PaymentI18nCopy> = {
    "zh-CN": copyZhCn,
    "zh-TW": copyZhTw,
    "zh-HK": copyZhHk,
    "en-US": copyEnUs,
    "ja-JP": copyJaJp,
    "ko-KR": copyKoKr,
    "es-ES": copyEsEs,
    "pt-BR": copyPtBr,
};

export function getPaymentI18n(locale?: string): PaymentI18nCopy {
    if (!locale) return copyEnUs;
    if (Object.hasOwn(PAYMENT_COPIES, locale)) {
        return PAYMENT_COPIES[locale as PaymentLocale];
    }
    const prefix = locale.split("-")[0];
    if (prefix === "zh") return copyZhCn;
    if (prefix === "ja") return copyJaJp;
    if (prefix === "ko") return copyKoKr;
    if (prefix === "es") return copyEsEs;
    if (prefix === "pt") return copyPtBr;
    return copyEnUs;
}
