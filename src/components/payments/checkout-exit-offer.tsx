import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createStripeCheckout, createStripeCustomCreditCheckout, createSubscriptionCheckout, getCheckoutExitOffer, type CheckoutExitOffer, type PaymentProviderId } from "@/services/api/wallet";
import { checkoutErrorText, goToCheckout, releaseCheckoutTab, reserveCheckoutTab } from "@/lib/checkout-tab";
import { countdownParts, EXIT_OFFER_MIN_AWAY_MS, EXIT_OFFER_SETTLE_MS, exitOfferPrice, forgetCheckoutSource, paidSince, peekCheckoutSource, type CheckoutSource } from "@/lib/checkout-exit-offer";
import { formatPaymentAmount } from "@/lib/payment-money";
import { useUserStore } from "@/stores/use-user-store";
import "./checkout-exit-offer.css";

type Copy = {
    /** "zhe": Chinese buyers read discounts as 折 (15% off = 8.5 折); elsewhere "10%". */
    style: "percent" | "zhe";
    /** Printed along the top of the ticket. */
    admit: string;
    title: string;
    body: string;
    applied: string;
    off: string;
    endsIn: string;
    was: string;
    now: string;
    claim: string;
    opening: string;
    expired: string;
    stamp: string;
    close: string;
    fine: string;
    loading: string;
    error: string;
};

const COPY: Record<string, Copy> = {
    "en-US": {
        style: "percent",
        admit: "Your exclusive offer · Admit one",
        title: "Your exclusive offer is here",
        body: "The order you just left is now {percent}% off. Your code is already applied. It is valid for 3 minutes and works once.",
        applied: "Applied",
        off: "OFF",
        endsIn: "Offer ends in",
        was: "Was",
        now: "Now",
        claim: "Claim my {percent}% off",
        opening: "Opening checkout…",
        expired: "This offer has ended",
        stamp: "Expired",
        close: "No thanks",
        fine: "Not valid on the $9.90 trial pack · Memberships: first billing period only · Tax, if any, added at checkout",
        loading: "Opening secure checkout…",
        error: "We couldn’t open checkout. Please try again.",
    },
    "zh-CN": {
        style: "zhe",
        admit: "你的专属优惠券 · 仅限本人",
        title: "这是你的专属优惠",
        body: "刚才没付的那一单，现在直接打 {percent}。优惠码已帮你填好，3 分钟内有效，只能用一次。",
        applied: "已应用",
        off: "专属折扣",
        endsIn: "专属优惠剩余",
        was: "原价",
        now: "到手",
        claim: "领取我的 {percent}",
        opening: "正在打开收银台…",
        expired: "这个优惠已结束",
        stamp: "已结束",
        close: "不用了",
        fine: "9.9 体验包不参与 · 会员仅优惠首期 · 如有税费在收银台另计",
        loading: "正在打开安全收银台…",
        error: "收银台没能打开，请再试一次。",
    },
    "zh-TW": {
        style: "zhe",
        admit: "你的專屬優惠券 · 僅限本人",
        title: "這是你的專屬優惠",
        body: "剛才未付款的那一筆，現在直接打 {percent}。優惠碼已幫你填好，3 分鐘內有效，限用一次。",
        applied: "已套用",
        off: "專屬折扣",
        endsIn: "專屬優惠剩餘",
        was: "原價",
        now: "到手",
        claim: "領取我的 {percent}",
        opening: "正在開啟結帳頁…",
        expired: "這個優惠已結束",
        stamp: "已結束",
        close: "不用了",
        fine: "9.9 體驗包不適用 · 會員僅優惠首期 · 如有稅費於結帳頁另計",
        loading: "正在開啟安全結帳頁…",
        error: "結帳頁未能開啟，請再試一次。",
    },
    "ja-JP": {
        style: "percent",
        admit: "あなただけの特別優待 · ご本人さま限定",
        title: "あなただけの特別優待です",
        body: "さきほどのご注文が、今なら {percent}% オフ。コードは入力済みで、3 分間・1 回限り有効です。",
        applied: "適用済み",
        off: "OFF",
        endsIn: "優待の残り時間",
        was: "通常",
        now: "割引後",
        claim: "{percent}% オフで購入する",
        opening: "決済ページを開いています…",
        expired: "この特典は終了しました",
        stamp: "終了",
        close: "今回は見送る",
        fine: "9.90 のお試しパックは対象外 · メンバーシップは初回期間のみ · 税金は決済ページで加算",
        loading: "安全な決済ページを開いています…",
        error: "決済ページを開けませんでした。もう一度お試しください。",
    },
    "ko-KR": {
        style: "percent",
        admit: "회원님 전용 혜택 · 본인 전용",
        title: "회원님만을 위한 전용 혜택",
        body: "방금 그 주문, 지금 {percent}% 할인돼요. 코드는 이미 적용됐고 3분 동안 한 번만 쓸 수 있어요.",
        applied: "적용됨",
        off: "할인",
        endsIn: "혜택 남은 시간",
        was: "정가",
        now: "할인가",
        claim: "{percent}% 할인 받기",
        opening: "결제 페이지를 여는 중…",
        expired: "혜택이 종료되었습니다",
        stamp: "종료",
        close: "괜찮아요",
        fine: "9.90 체험 팩 제외 · 멤버십은 첫 결제 기간만 · 세금은 결제 페이지에서 추가",
        loading: "안전한 결제 페이지를 여는 중…",
        error: "결제 페이지를 열지 못했어요. 다시 시도해 주세요.",
    },
    "es-ES": {
        style: "percent",
        admit: "Tu oferta exclusiva · Admit one",
        title: "Tu oferta exclusiva ya está aquí",
        body: "El pedido que dejaste, ahora con un {percent}% de descuento. El código ya está aplicado y vale 3 minutos, un solo uso.",
        applied: "Aplicado",
        off: "DTO.",
        endsIn: "La oferta termina en",
        was: "Antes",
        now: "Ahora",
        claim: "Usar mi {percent}% de descuento",
        opening: "Abriendo el pago…",
        expired: "Esta oferta ha terminado",
        stamp: "Caducada",
        close: "No, gracias",
        fine: "No válido para el pack de prueba de 9,90 · Suscripciones: solo el primer periodo · Impuestos, si los hay, al pagar",
        loading: "Abriendo el pago seguro…",
        error: "No pudimos abrir el pago. Inténtalo de nuevo.",
    },
    "pt-BR": {
        style: "percent",
        admit: "Sua oferta exclusiva · Admit one",
        title: "Sua oferta exclusiva chegou",
        body: "Aquele pedido, agora com {percent}% de desconto. O código já está aplicado e vale por 3 minutos, uma única vez.",
        applied: "Aplicado",
        off: "OFF",
        endsIn: "A oferta termina em",
        was: "De",
        now: "Por",
        claim: "Usar meus {percent}% de desconto",
        opening: "Abrindo o pagamento…",
        expired: "Esta oferta terminou",
        stamp: "Expirada",
        close: "Agora não",
        fine: "Não vale para o pacote de teste de 9,90 · Assinaturas: só o primeiro período · Impostos, se houver, no pagamento",
        loading: "Abrindo o pagamento seguro…",
        error: "Não conseguimos abrir o pagamento. Tente de novo.",
    },
};
COPY["zh-HK"] = COPY["zh-TW"];

export function exitOfferCopy(locale: string): Copy {
    return COPY[locale] || COPY[locale.split("-")[0] === "zh" ? "zh-CN" : "en-US"] || COPY["en-US"];
}

/** 15 -> "8.5 折", 10 -> "9 折" for 折-style locales; otherwise the bare number (copy adds "%"). */
export function dealLabel(style: Copy["style"], percent: number) {
    if (style === "percent") return String(percent);
    const zhe = (100 - percent) / 10;
    return `${Number.isInteger(zhe) ? zhe : zhe.toFixed(1).replace(/\.0$/, "")} 折`;
}
const fill = (text: string, deal: string) => text.replace("{percent}", deal);

/** Watches for the buyer coming back from an unpaid cashier and shows the one-time offer. Mount once per page. */
export function CheckoutExitOfferHost({ locale }: { locale: string }) {
    const user = useUserStore((s) => s.user);
    const [offer, setOffer] = useState<{ data: CheckoutExitOffer; source: CheckoutSource; skew: number } | null>(null);
    const hiddenAt = useRef<number | null>(null);
    const asking = useRef(false);

    const ask = useCallback(() => {
        const source = peekCheckoutSource();
        if (!user || !source || asking.current) return;
        if (Date.now() - source.at < EXIT_OFFER_MIN_AWAY_MS) return;
        asking.current = true;
        window.setTimeout(() => {
            // Paid in the cashier tab meanwhile? Then there is nothing to rescue.
            if (paidSince(source.at)) {
                forgetCheckoutSource();
                asking.current = false;
                return;
            }
            getCheckoutExitOffer(source.kind, source.id)
                .then(({ offer: data }) => {
                    forgetCheckoutSource();
                    if (data) setOffer({ data, source, skew: Date.parse(data.serverNow) - Date.now() });
                })
                .catch(() => {
                    /* No offer this time; the source stays for the next return. */
                })
                .finally(() => {
                    asking.current = false;
                });
        }, EXIT_OFFER_SETTLE_MS);
    }, [user]);

    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === "hidden") {
                hiddenAt.current = Date.now();
                return;
            }
            const away = hiddenAt.current ? Date.now() - hiddenAt.current : Infinity;
            hiddenAt.current = null;
            if (away >= EXIT_OFFER_MIN_AWAY_MS) ask();
        };
        const onPageShow = () => ask();
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pageshow", onPageShow);
        window.addEventListener("focus", onPageShow);
        // Same-tab cashiers come back as a fresh page load.
        ask();
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pageshow", onPageShow);
            window.removeEventListener("focus", onPageShow);
        };
    }, [ask]);

    if (!offer) return null;
    return <CheckoutExitOfferDialog locale={locale} offer={offer.data} source={offer.source} skew={offer.skew} onClose={() => setOffer(null)} />;
}

export function CheckoutExitOfferDialog({ locale, offer, source, skew, onClose }: { locale: string; offer: CheckoutExitOffer; source: Pick<CheckoutSource, "flow" | "quantity">; skew: number; onClose: () => void }) {
    const copy = exitOfferCopy(locale);
    const deadline = Date.parse(offer.claimBy);
    const [now, setNow] = useState(() => Date.now() + skew);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const primary = useRef<HTMLButtonElement>(null);
    const left = countdownParts(deadline - now);
    const urgent = !left.done && deadline - now <= 60_000;

    useEffect(() => {
        if (left.done) return;
        // Frames tick at 24 fps; with reduced motion the clock updates once a second.
        const step = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1000 : 1000 / 24;
        const timer = window.setInterval(() => setNow(Date.now() + skew), step);
        return () => window.clearInterval(timer);
    }, [left.done, skew]);
    useEffect(() => {
        // Focus the action for keyboard and screen-reader users without drawing the keyboard ring on open.
        primary.current?.focus({ focusVisible: false } as FocusOptions);
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
        };
    }, [onClose]);

    const claim = async () => {
        if (busy || left.done) return;
        // The tab must be opened inside the click, before any await.
        reserveCheckoutTab(copy.loading);
        setBusy(true);
        setError("");
        const provider = offer.provider as PaymentProviderId;
        const options = { promo: offer.code, locale, provider };
        try {
            const result =
                source.flow === "subscription"
                    ? await createSubscriptionCheckout(offer.sku, offer.code, provider)
                    : source.flow === "custom" && source.quantity
                      ? await createStripeCustomCreditCheckout(source.quantity, crypto.randomUUID(), options)
                      : await createStripeCheckout(offer.sku, crypto.randomUUID(), options);
            const target = new URL(result.url);
            if (target.protocol !== "https:") throw new Error(copy.error);
            goToCheckout(target.toString());
            onClose();
        } catch (err) {
            releaseCheckoutTab();
            setError(checkoutErrorText(err, copy.error));
            setBusy(false);
        }
    };

    const price = exitOfferPrice(offer.listMinor, offer.percentOff);
    const deal = dealLabel(copy.style, offer.percentOff);
    const remaining = Math.max(0, deadline - now);
    // Editing timecode HH:MM:SS:FF at 24 fps — the frames are the heartbeat of the countdown.
    const frames = left.done ? "00" : String(Math.floor((remaining % 1000) / (1000 / 24))).padStart(2, "0");
    const progress = Math.min(1, remaining / (3 * 60_000));
    const figure = copy.style === "zhe" ? deal.replace(" 折", "") : String(offer.percentOff);
    return createPortal(
        <div className="xo-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div className="xo-ticket" role="dialog" aria-modal="true" aria-labelledby="xo-title" data-state={left.done ? "expired" : urgent ? "urgent" : "live"} data-style={copy.style} data-busy={busy || undefined}>
                <section className="xo-main">
                    <header className="xo-print">
                        <span>DramaCanvas</span>
                        <span>{copy.admit}</span>
                    </header>
                    <button type="button" className="xo-close" aria-label={copy.close} onClick={onClose}>
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                    </button>

                    <div className="xo-hero">
                        <p className="xo-figure" aria-label={copy.style === "zhe" ? deal : `${offer.percentOff}% ${copy.off}`}>
                            <span className="xo-figure-num">{figure}</span>
                            <span className="xo-figure-unit">{copy.style === "zhe" ? "折" : "%"}</span>
                            <span className="xo-figure-off">{copy.off}</span>
                        </p>
                        <div className="xo-copy">
                            <h2 id="xo-title">{copy.title}</h2>
                            <p>{fill(copy.body, deal)}</p>
                        </div>
                    </div>

                    <div className="xo-timecode" role="timer" aria-label={`${copy.endsIn} ${left.minutes}:${left.seconds}`}>
                        <span className="xo-rec" aria-hidden="true" />
                        <span className="xo-tc-label">{copy.endsIn}</span>
                        <span className="xo-tc" aria-hidden="true">
                            <span className="xo-tc-dim">00:</span>
                            {left.minutes}:{left.seconds}
                            <span className="xo-tc-frames">:{frames}</span>
                        </span>
                        <span className="xo-reel" aria-hidden="true">
                            <span style={{ transform: `scaleX(${progress})` }} />
                        </span>
                    </div>

                    <p className="xo-code">
                        <code>{offer.code}</code>
                        <span>
                            <svg viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M3.5 8.5l3 3 6-7" />
                            </svg>
                            {copy.applied}
                        </span>
                    </p>
                    {left.done && (
                        <span className="xo-stamp" aria-hidden="true">
                            {copy.stamp}
                        </span>
                    )}
                </section>

                <section className="xo-stub">
                    {offer.listMinor > 0 && (
                        <p className="xo-price">
                            <span className="xo-was">
                                {copy.was} <s>{formatPaymentAmount(offer.listMinor, offer.currency, locale)}</s>
                            </span>
                            <span className="xo-now">
                                <small>{copy.now}</small>
                                {formatPaymentAmount(price, offer.currency, locale)}
                            </span>
                        </p>
                    )}
                    {error && (
                        <p className="xo-error" role="alert">
                            {error}
                        </p>
                    )}
                    <button ref={primary} type="button" className="xo-claim" disabled={busy || left.done} onClick={claim}>
                        <span>{left.done ? copy.expired : busy ? copy.opening : fill(copy.claim, deal)}</span>
                        {!left.done && !busy && (
                            <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M4 10h11M11 5.5L15.5 10 11 14.5" />
                            </svg>
                        )}
                    </button>
                    <button type="button" className="xo-dismiss" onClick={onClose}>
                        {copy.close}
                    </button>
                    <p className="xo-fine">{copy.fine}</p>
                </section>
            </div>
        </div>,
        document.body,
    );
}
