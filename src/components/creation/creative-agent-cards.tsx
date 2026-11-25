import { Button } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { type CreativeQuote } from "@/lib/creation/creative-agent-contract";
import "./creative-agent-cards.css";

export function CreativeQuoteCard({ quote, onApprove, onRefresh, busy, disabled }: { quote: CreativeQuote; onApprove: () => void; onRefresh?: () => void; busy?: boolean; disabled?: boolean }) {
    const { t } = useI18n();
    const quantity = quote.items.reduce((total, item) => total + item.quantity, 0);
    return <section className="creative-agent-card creative-agent-quote-card" aria-label={t("miscPages.creativeQuoteAria")} data-canvas-no-zoom data-canvas-wheel-scroll>
        <div className="creative-agent-overline">{t("miscPages.creativeQuoteOverline")}</div>
        <h3>{quote.title}</h3><div className="creative-agent-quote-total"><span>{t("miscPages.creativeQuoteBatch", { count: quantity })}</span><strong>{quote.amountLabel}</strong></div>
        <details className="creative-agent-quote-details"><summary>{t("miscPages.creativeQuoteDetails")}</summary><div className="creative-agent-card-content"><ul className="creative-agent-quote-items">{quote.items.map((item) => <li key={item.id}><div><strong>{item.label}</strong><span>{item.model} · {item.specification}</span></div><b>× {item.quantity}</b></li>)}</ul><p className="creative-agent-muted">{quote.basis}</p>
        {quote.expiresAt && <p>{t("miscPages.creativeQuoteExpires", { time: quote.expiresAt })}</p>}{quote.approvedQuantity !== undefined && <p>{t("miscPages.creativeQuoteApproved", { count: quote.approvedQuantity })}</p>}
        {onRefresh && <Button className="creative-agent-detail-toggle" type="text" disabled={disabled || busy} onClick={onRefresh}>{t("miscPages.creativeQuoteRefresh")}</Button>}</div></details>
        {quote.externalBilling && <p>{t("miscPages.creativeQuoteExternal")}</p>}
        <div className="creative-agent-actions creative-agent-primary-actions"><Button type="primary" loading={busy} disabled={disabled || busy} onClick={onApprove}>{t("miscPages.creativeQuoteConfirm", { amount: quote.amountLabel })}</Button></div>
    </section>;
}
