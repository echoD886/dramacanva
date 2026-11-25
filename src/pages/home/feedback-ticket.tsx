import { SUPPORT_EMAIL } from "@/lib/site-identity";
import { SupportEmails } from "@/components/layout/support-emails";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { apiClient, request } from "@/services/api/request";
import { useI18n } from "@/i18n/use-i18n";
import { localizedPublicPath } from "@/i18n/locale-routing";
import "./feedback-ticket.css";

const labels = {
    "zh-CN": { ticket: "把故事告诉我们", short: "反馈", stub: "反馈入场券", title: "你的下一幕，我们想听", issue: "遇到问题", idea: "有个点子", channel: "渠道用不了", email: "联系邮箱", message: "说说发生了什么", placeholder: "描述问题、操作步骤或你的想法（至少 10 字）", send: "投递反馈", sending: "投递中…", success: "收到！我们会通过邮箱与你联系。", error: `投递失败，请稍后重试或写信至 ${SUPPORT_EMAIL}。`, safety: "不要填写密码、验证码或 API 密钥。", close: "关闭反馈", back: "返回分类" },
    "zh-HK": { ticket: "把故事告訴我們", short: "意見", stub: "意見入場券", title: "你的下一幕，我們想聽", issue: "遇到問題", idea: "有個點子", channel: "渠道用不了", email: "聯絡電郵", message: "說說發生了甚麼", placeholder: "描述問題、操作步驟或你的想法（至少 10 字）", send: "送出意見", sending: "送出中…", success: "收到！我們會透過電郵聯絡你。", error: `送出失敗，請稍後重試或電郵 ${SUPPORT_EMAIL}。`, safety: "不要填寫密碼、驗證碼或 API 金鑰。", close: "關閉意見表單", back: "返回分類" },
    "zh-TW": { ticket: "把故事告訴我們", short: "意見", stub: "意見入場券", title: "你的下一幕，我們想聽", issue: "遇到問題", idea: "有個點子", channel: "渠道無法使用", email: "聯絡信箱", message: "說說發生了什麼", placeholder: "描述問題、操作步驟或你的想法（至少 10 字）", send: "送出意見", sending: "送出中…", success: "收到！我們會透過電子郵件聯絡你。", error: `送出失敗，請稍後重試或寄信至 ${SUPPORT_EMAIL}。`, safety: "不要填寫密碼、驗證碼或 API 金鑰。", close: "關閉意見表單", back: "返回分類" },
    "en-US": { ticket: "Tell us your story", short: "FEEDBACK", stub: "FEEDBACK PASS", title: "We want to hear your next scene", issue: "Something broke", idea: "I have an idea", channel: "Channel needs support", email: "Your email", message: "Tell us what happened", placeholder: "Describe the issue, steps or idea (at least 10 characters)", send: "Send feedback", sending: "Sending…", success: "Received! We will follow up by email.", error: `Could not send. Try again or email ${SUPPORT_EMAIL}.`, safety: "Do not share passwords, codes or API keys.", close: "Close feedback", back: "Back to choices" },
} as const;

export function FeedbackTicket() {
    const { locale } = useI18n();
    const publicLocale = locale in labels ? locale as keyof typeof labels : "en-US";
    const text = labels[publicLocale];
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState<"issue" | "idea" | null>(null);
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [website, setWebsite] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<"success" | "error" | null>(null);
    const launcher = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleHash = () => {
            if (typeof window !== "undefined" && window.location.hash === "#feedback") {
                setOpen(true);
                setKind((prev) => prev ?? "issue");
            }
        };
        handleHash();
        window.addEventListener("hashchange", handleHash);
        return () => window.removeEventListener("hashchange", handleHash);
    }, []);

    useEffect(() => {
        // The footer link opens the panel via #feedback; drop the hash on close so the link works again.
        if (!open && window.location.hash === "#feedback") window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        if (!open) return;
        const focusTarget = () => {
            const input = panel.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input:not([tabindex='-1']), textarea");
            if (input) {
                input.focus();
            } else {
                panel.current?.querySelector<HTMLElement>("button")?.focus();
            }
        };
        const timer = requestAnimationFrame(focusTarget);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") { setOpen(false); launcher.current?.focus(); }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            cancelAnimationFrame(timer);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, kind]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!kind || sending) return;
        setSending(true); setResult(null);
        try {
            await request(apiClient.post("/feedback", { email: email.trim(), message: `[${kind === "issue" ? text.issue : text.idea}] ${message.trim()}\nPage: ${window.location.pathname}`, website }));
            setMessage(""); setResult("success");
        } catch { setResult("error"); }
        finally { setSending(false); }
    }

    return <div className="sa-feedback-ticket-shell">
        {open && <div id="sa-feedback-ticket-panel" className="sa-feedback-ticket-panel" ref={panel} role="dialog" aria-modal="false" aria-labelledby="sa-feedback-ticket-title">
            <header><span className="sa-feedback-ticket-kicker">DramaCanvas / ADMIT ONE</span><button type="button" aria-label={text.close} onClick={() => { setOpen(false); launcher.current?.focus(); }}><X size={18} aria-hidden /></button></header>
            <h2 id="sa-feedback-ticket-title">{text.title}</h2>
            <SupportEmails />
            {!kind ? <div className="sa-feedback-ticket-choices">
                <button type="button" onClick={() => { setKind("issue"); setResult(null); }}>{text.issue}<span>↗</span></button>
                <button type="button" onClick={() => { setKind("idea"); setResult(null); }}>{text.idea}<span>↗</span></button>
                <a href={`${localizedPublicPath("/pricing", publicLocale)}?plan=byok&adapter=1`}>{text.channel}<span>↗</span></a>
            </div> : <form onSubmit={submit}>
                <button className="sa-feedback-ticket-back" type="button" onClick={() => { setKind(null); setResult(null); }}>← {text.back}</button>
                <label>{text.email}<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
                <label>{text.message}<textarea required minLength={10} maxLength={1900} rows={4} placeholder={text.placeholder} value={message} onChange={event => setMessage(event.target.value)} /></label>
                <label className="sa-feedback-ticket-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
                <small>{text.safety}</small>
                <button className="sa-feedback-ticket-submit" type="submit" disabled={sending}>{sending ? text.sending : text.send} <span>→</span></button>
                {result && <p role="status" className={result === "error" ? "is-error" : "is-success"}>{text[result]}</p>}
            </form>}
        </div>}
        <button ref={launcher} className="sa-feedback-ticket-launcher" type="button" aria-label={text.ticket} aria-expanded={open} aria-controls="sa-feedback-ticket-panel" onClick={() => setOpen(value => !value)}>
            <svg viewBox="0 0 76 76" aria-hidden="true" focusable="false">
                <defs><linearGradient id="ticket-beam" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#f5cc80" stopOpacity=".08"/><stop offset="1" stopColor="#f5cc80" stopOpacity=".75"/></linearGradient><linearGradient id="ticket-paper" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f4dbab"/><stop offset="1" stopColor="#bd965e"/></linearGradient><clipPath id="ticket-outline"><path d="M8 3h60a5 5 0 0 0 5 5v15a8 8 0 0 0 0 16v29a5 5 0 0 0-5 5H8a5 5 0 0 0-5-5V39a8 8 0 0 0 0-16V8a5 5 0 0 0 5-5Z"/></clipPath></defs>
                <path d="M8 3h60a5 5 0 0 0 5 5v15a8 8 0 0 0 0 16v29a5 5 0 0 0-5 5H8a5 5 0 0 0-5-5V39a8 8 0 0 0 0-16V8a5 5 0 0 0 5-5Z" fill="#111820" stroke="url(#ticket-paper)" strokeWidth="2"/>
                <g clipPath="url(#ticket-outline)"><path d="M5 54 33 5 57 5 23 55Z" fill="#3b2024"/><path className="ticket-light" d="M20 31 62 10 62 51Z" fill="url(#ticket-beam)"/><path d="M5 51q15-10 23-35" fill="none" stroke="#a04c42" strokeWidth="3"/><path d="M24 50V34l3-5 3 5v16m-8-5h10" fill="#111820" stroke="#e0bf88" strokeWidth=".8"/><circle cx="27" cy="26" r="2.6" fill="#f3d298"/><path d="M4 55h68" stroke="#d5ae78" strokeDasharray="2 3"/></g>
                <path d="M10 13h5m-5 0v5m56-5h-5m5 0v5" fill="none" stroke="#ed7065" strokeWidth="1.4"/><circle cx="63" cy="47" r="1.5" fill="#eac78e"/>
            </svg>
            <span className="sa-feedback-ticket-text">{text.short}</span>
        </button>
    </div>;
}
