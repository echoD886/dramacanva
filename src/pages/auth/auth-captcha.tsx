import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "antd";
import { createCaptchaDialogFlow } from "@/lib/auth-captcha-dialog-flow";
import { createAuthCaptchaFlow, type CaptchaState, CaptchaInterruption } from "@/lib/auth-captcha-flow";
import { loadTurnstile, type TurnstileAPI } from "@/lib/turnstile";
import { loadHCaptcha, type HCaptchaAPI } from "@/lib/hcaptcha";
import { issueAuthCaptcha, type CaptchaProof, type CaptchaPurpose } from "@/services/api/auth-captcha";
import { useCaptchaMessages } from "@/i18n/auth-captcha-messages";

export function useAuthCaptcha(requireBeforeSubmit = true) {
    const [state, setState] = useState<CaptchaState>(null);
    const t = useCaptchaMessages();
    const flow = useRef<ReturnType<typeof createAuthCaptchaFlow> | null>(null);
    const dialog = useRef<ReturnType<typeof createCaptchaDialogFlow> | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [retryNotice, setRetryNotice] = useState(false);
    useEffect(() => {
        const current = createAuthCaptchaFlow(issueAuthCaptcha, setState, Date.now, true);
        const currentDialog = createCaptchaDialogFlow(current, setVerifying, () => setRetryNotice(true));
        dialog.current = currentDialog; flow.current = current;
        return () => {
            currentDialog.dispose(); current.dispose();
            if (flow.current === current) flow.current = null;
            if (dialog.current === currentDialog) dialog.current = null;
        };
    }, []);
    return {
        state, requireBeforeSubmit, verifying, retryNotice,
        confirm: (token: string) => dialog.current?.confirm(token),
        cancel: () => dialog.current?.cancel(),
        run<T>(purpose: CaptchaPurpose, subject: string, action: (proof?: CaptchaProof) => Promise<T>) {
            setRetryNotice(false);
            if (!dialog.current) return Promise.reject<T>(new CaptchaInterruption("incomplete"));
            if (purpose !== "login") return dialog.current.run(purpose, subject, action);
            return action().catch((error: unknown) => {
                const required = typeof error === "object" && error !== null && ((error as { status?: number }).status === 428 || (error as { code?: number }).code === 428);
                if (!required) throw error;
                if (!dialog.current) throw new CaptchaInterruption("incomplete");
                return dialog.current.run(purpose, subject, action);
            });
        },
        refresh: () => flow.current?.retry(),
        error: (error: unknown) => (error instanceof CaptchaInterruption ? t[error.reason] : null),
    };
}

export function AuthCaptcha({ value }: { value: ReturnType<typeof useAuthCaptcha>; disabled?: boolean }) {
    const t = useCaptchaMessages();
    if (!value.state) return null;
    return (
        <Modal open zIndex={1700} title={t.puzzleTitle} footer={null} width={380} onCancel={value.cancel} closable={!value.verifying} mask={{ closable: !value.verifying }} keyboard={!value.verifying} centered destroyOnHidden>
            {value.state?.challenge?.kind === "hcaptcha" ? <HCaptchaChallenge value={value} /> : <TurnstileChallenge value={value} />}
        </Modal>
    );
}

function HCaptchaChallenge({ value }: { value: ReturnType<typeof useAuthCaptcha> }) {
    const t = useCaptchaMessages();
    const container = useRef<HTMLDivElement>(null);
    const latest = useRef(value);
    latest.current = value;
    const [failed, setFailed] = useState(false);
    const challenge = value.state?.challenge;
    useEffect(() => {
        setFailed(false);
        if (!challenge || challenge.kind !== "hcaptcha" || !challenge.siteKey || !container.current) return;
        let active = true;
        let api: HCaptchaAPI | undefined;
        let widget: number | undefined;
        let submitted = false;
        const unavailable = () => { if (active && !submitted) setFailed(true); };
        const timer = setTimeout(unavailable, Math.max(0, Date.parse(challenge.expiresAt) - Date.now()));
        void loadHCaptcha().then((provider) => {
            if (!active || !container.current) return;
            api = provider;
            widget = provider.render(container.current, {
                sitekey: challenge.siteKey!,
                callback: (token) => {
                    if (!active || submitted || Date.parse(challenge.expiresAt) <= Date.now()) return;
                    submitted = true;
                    void latest.current.confirm(token);
                },
                "error-callback": unavailable,
                "expired-callback": unavailable,
            });
        }).catch(unavailable);
        return () => { active = false; clearTimeout(timer); if (widget !== undefined) api?.remove(widget); };
    }, [challenge?.id]);
    return (
        <div className="space-y-4" aria-busy={value.verifying || value.state?.loading}>
            <div ref={container} className="min-h-16" />
            <p role="status">{failed || value.state?.failed ? t.unavailable : value.state?.loading ? t.loading : value.retryNotice ? t.retry : t.help}</p>
            <Button htmlType="button" onClick={() => void value.refresh()} disabled={value.verifying || value.state?.loading}>{t.refresh}</Button>
        </div>
    );
}

function TurnstileChallenge({ value }: { value: ReturnType<typeof useAuthCaptcha> }) {
    const t = useCaptchaMessages();
    const container = useRef<HTMLDivElement>(null);
    const latest = useRef(value);
    latest.current = value;
    const [failed, setFailed] = useState(false);
    const challenge = value.state?.challenge;
    useEffect(() => {
        setFailed(false);
        if (!challenge || !container.current) return;
        if (challenge.kind !== "turnstile" || !challenge.siteKey || !challenge.action) { setFailed(true); return; }
        let active = true;
        let api: TurnstileAPI | undefined;
        let widget: string | undefined;
        let submitted = false;
        const unavailable = () => { if (active && !submitted) setFailed(true); };
        const timer = setTimeout(unavailable, Math.max(0, Date.parse(challenge.expiresAt) - Date.now()));
        void loadTurnstile().then((provider) => {
            if (!active || !container.current) return;
            api = provider;
            widget = provider.render(container.current, {
                sitekey: challenge.siteKey!, action: challenge.action!, cData: challenge.id, theme: "auto", appearance: "always",
                callback: (token) => {
                    if (!active || submitted || Date.parse(challenge.expiresAt) <= Date.now()) return;
                    submitted = true;
                    void latest.current.confirm(token);
                },
                "error-callback": unavailable, "expired-callback": unavailable, "timeout-callback": unavailable,
            });
        }).catch(unavailable);
        return () => { active = false; clearTimeout(timer); if (widget !== undefined) api?.remove(widget); };
    }, [challenge?.id]);
    return (
        <div className="space-y-4" aria-busy={value.verifying || value.state?.loading}>
            <div ref={container} className="min-h-16" />
            <p role="status">{failed || value.state?.failed ? t.unavailable : value.state?.loading ? t.loading : value.retryNotice ? t.retry : t.help}</p>
            <Button htmlType="button" onClick={() => void value.refresh()} disabled={value.verifying || value.state?.loading}>{t.refresh}</Button>
        </div>
    );
}
