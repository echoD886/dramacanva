import { trackAuthEvent } from "@/services/public-analytics";
import { useI18n } from "@/i18n/use-i18n";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { GithubFilled, GoogleOutlined, WindowsOutlined } from "@ant-design/icons";
import { App, Button, Divider, Input } from "antd";
import { ArrowRight, Info, LockKeyhole, Mail, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import { collectSignupAttribution, clearSignupAttribution, signupSourceCategory } from "@/lib/signup-attribution";
import { ApiError } from "@/services/api/request";
import type { CaptchaProof } from "@/services/api/auth-captcha";
import { getAuthSession, getAuthSettings, linuxDOLoginURL, register, sendRegistrationEmailCode, socialOAuthLoginURL, type SocialOAuthProvider } from "@/services/api/auth";
import { navigateAfterReferralClick } from "@/lib/referral-attribution";
import { AuthCaptcha, useAuthCaptcha } from "./auth-captcha";
import { useAuthCountdown } from "./auth-route-state";
import { safeAuthNext } from "./auth-route-utils";
import { LinuxDOIcon } from "./auth-scene";

type AuthSettings = Awaited<ReturnType<typeof getAuthSettings>>;

export default function RegisterPage() {
    const captcha = useAuthCaptcha(true);
    const emailCaptcha = useAuthCaptcha(true);
    const { t } = useI18n();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { message } = App.useApp();
    const [registerDraft, setRegisterDraft] = useState({ username: "", email: "", emailCode: "", displayName: "", password: "", confirmPassword: "", codeExpiresAt: 0 });
    const [settings, setSettings] = useState<AuthSettings | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const countdown = useAuthCountdown(registerDraft.codeExpiresAt);
    const next = safeAuthNext(params.get("next"));
    const invitationToken = params.get("invite")?.trim() || "";

    useEffect(() => {
        let cancelled = false;
        void getAuthSettings()
            .then((value) => !cancelled && setSettings(value))
            .catch((error) => !cancelled && message.error(error instanceof Error ? error.message : t("auth.settingsFailed")));
        return () => {
            cancelled = true;
        };
    }, [message, t]);

    const updateDraft = <K extends keyof typeof registerDraft>(key: K, value: (typeof registerDraft)[K]) => {
        setRegisterDraft((draft) => ({ ...draft, [key]: value }));
    };

    const sendCode = async () => {
        const normalizedEmail = registerDraft.email.trim();
        if (!normalizedEmail) {
            message.warning(t("auth.emailRequired"));
            return;
        }
        setSendingCode(true);
        try {
            await emailCaptcha.run("register-email", normalizedEmail, (proof) => sendRegistrationEmailCode(normalizedEmail, invitationToken, proof));
            setRegisterDraft((draft) => ({ ...draft, email: normalizedEmail, codeExpiresAt: Date.now() + 60_000 }));
            message.success(t("auth.codeSent"));
        } catch (error) {
            if (error instanceof ApiError && error.status === 429 && error.retryAfterMs) {
                setRegisterDraft((draft) => ({ ...draft, codeExpiresAt: Date.now() + Math.min(error.retryAfterMs!, 3_600_000) }));
            }
            message.error(emailCaptcha.error(error) || (error instanceof Error ? error.message : t("auth.codeFailed")));
        } finally {
            setSendingCode(false);
        }
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Enter can resubmit the form while the drag control is locked; one request per attempt.
        if (submitting) return;
        if (registerDraft.password !== registerDraft.confirmPassword) {
            message.error(t("auth.passwordMismatch"));
            return;
        }
        setSubmitting(true);
        try {
            const sessionModule = import("@/lib/user-session");
            void sessionModule.catch(() => undefined);
            const attribution = collectSignupAttribution();
            const attributionParams = new URLSearchParams(attribution.utm);
            const submitRegistration = (proof?: CaptchaProof) =>
                register({
                    username: registerDraft.username,
                    email: registerDraft.email,
                    emailCode: registerDraft.emailCode,
                    displayName: registerDraft.displayName,
                    password: registerDraft.password,
                    invitationToken,
                    acquisitionSource: attributionParams.get("utm_source") || attribution.referrer || "direct",
                    acquisitionMedium: attributionParams.get("utm_medium") || "",
                    acquisitionCampaign: attributionParams.get("utm_campaign") || "",
                    signupEntry: attribution.entry,
                    signupReferrer: attribution.referrer,
                    signupUtm: attribution.utm,
                    captcha: proof,
                });
            if (settings?.firstUser) {
                await captcha.run("register", registerDraft.username, submitRegistration);
            } else {
                await submitRegistration();
            }
            // Registration already installs a session and invalidates its cache.
            // A second password login could now unnecessarily demand a CAPTCHA.
            const session = await getAuthSession();
            const { applyUserSession } = await sessionModule;
            await applyUserSession(session);
            trackAuthEvent("sign_up", "email", signupSourceCategory(attribution, Boolean(invitationToken)));
            clearSignupAttribution();
            if (!settings?.firstUser) {
                try {
                    window.sessionStorage.setItem("infinite-canvas:model-setup-guide", "1");
                } catch {
                    /* Optional onboarding must not turn successful registration into a failure. */
                }
            }
            message.success(t(settings?.firstUser ? "auth.adminCreated" : "auth.registerSuccess"));
            navigate(invitationToken ? "/teams" : next, { replace: true });
        } catch (error) {
            message.error(captcha.error(error) || (error instanceof Error ? error.message : t("auth.registerFailed")));
        } finally {
            setSubmitting(false);
        }
    };

    const registrationClosed = settings?.registrationEnabled === false && !invitationToken;
    const mailUnavailable = Boolean(settings && !settings.firstUser && settings.emailCodeRequired && !settings.emailEnabled);
    const disabled = registrationClosed || mailUnavailable;
    const requireCode = Boolean(settings && !settings.firstUser && settings.emailCodeRequired);

    return (
        <form onSubmit={submit} className="auth-register-form space-y-4" aria-busy={submitting || sendingCode}>
            {settings?.firstUser ? (
                <Notice icon={<Info />} tone="blue">
                    {t("auth.firstAdmin")}
                </Notice>
            ) : null}
            {registrationClosed ? (
                <Notice icon={<TriangleAlert />} tone="amber">
                    {t("auth.registrationClosed")}
                </Notice>
            ) : null}
            {mailUnavailable ? (
                <Notice icon={<TriangleAlert />} tone="amber">
                    {t("auth.mailNotReady")}
                </Notice>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
                <AuthField label={t("auth.userName")} htmlFor="register-username">
                    <Input
                        id="register-username"
                        size="large"
                        prefix={<UserRound className="auth-field-icon" />}
                        value={registerDraft.username}
                        onChange={(event) => updateDraft("username", event.target.value)}
                        placeholder={t("auth.userNameHint")}
                        autoComplete="username"
                        autoCapitalize="none"
                        minLength={3}
                        maxLength={32}
                        required
                        disabled={disabled}
                    />
                </AuthField>
                <AuthField label={t("auth.displayName")} htmlFor="register-display-name">
                    <Input id="register-display-name" size="large" value={registerDraft.displayName} onChange={(event) => updateDraft("displayName", event.target.value)} placeholder={t("auth.displayNameHint")} disabled={disabled} />
                </AuthField>
            </div>

            <AuthField label={t("auth.email")} htmlFor="register-email">
                <Input
                    id="register-email"
                    size="large"
                    prefix={<Mail className="auth-field-icon" />}
                    value={registerDraft.email}
                    onChange={(event) => updateDraft("email", event.target.value)}
                    placeholder={t("auth.emailHint")}
                    autoComplete="email"
                    inputMode="email"
                    required={!settings?.firstUser}
                    disabled={disabled}
                />
            </AuthField>

            {requireCode ? (
                <>
                    <AuthCaptcha value={emailCaptcha} disabled={submitting || sendingCode || disabled} />
                    <AuthField label={t("auth.emailCode")} htmlFor="register-email-code">
                        <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-2">
                            <Input
                                id="register-email-code"
                                size="large"
                                prefix={<ShieldCheck className="auth-field-icon" />}
                                value={registerDraft.emailCode}
                                onChange={(event) => updateDraft("emailCode", event.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder={t("auth.codeHint")}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                required
                                disabled={disabled}
                            />
                            <Button htmlType="button" size="large" loading={sendingCode} disabled={disabled || countdown > 0} onClick={() => void sendCode()}>
                                {countdown > 0 ? `${countdown}s` : t("auth.getCode")}
                            </Button>
                        </div>
                    </AuthField>
                </>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
                <AuthField label={t("auth.password")} htmlFor="register-password">
                    <Input.Password
                        id="register-password"
                        size="large"
                        prefix={<LockKeyhole className="auth-field-icon" />}
                        value={registerDraft.password}
                        onChange={(event) => updateDraft("password", event.target.value)}
                        placeholder={t("auth.passwordHint")}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        disabled={disabled}
                    />
                </AuthField>
                <AuthField label={t("auth.confirmPassword")} htmlFor="register-confirm-password">
                    <Input.Password
                        id="register-confirm-password"
                        size="large"
                        prefix={<LockKeyhole className="auth-field-icon" />}
                        value={registerDraft.confirmPassword}
                        onChange={(event) => updateDraft("confirmPassword", event.target.value)}
                        placeholder={t("auth.passwordAgain")}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        disabled={disabled}
                    />
                </AuthField>
            </div>

            {settings?.firstUser ? <AuthCaptcha value={captcha} disabled={submitting || sendingCode} /> : null}
            <Button type="primary" htmlType="submit" size="large" block loading={submitting} disabled={disabled} icon={<ArrowRight className="size-4" />} iconPlacement="end">
                {t("auth.createAccount")}
            </Button>
            {settings && (settings.googleEnabled || settings.githubEnabled || settings.microsoftEnabled || settings.linuxdoEnabled) ? (
                <>
                    <Divider plain className="auth-divider">
                        {t("auth.otherLogin")}
                    </Divider>
                    <div className="auth-provider-grid" aria-label={t("auth.socialRegister")}>
                        {settings.googleEnabled ? <OAuthButton provider="google" label="Google" next={next} icon={<GoogleOutlined className="auth-provider-icon auth-provider-icon-google" />} /> : null}
                        {settings.githubEnabled ? <OAuthButton provider="github" label="GitHub" next={next} icon={<GithubFilled className="auth-provider-icon" />} /> : null}
                        {settings.microsoftEnabled ? <OAuthButton provider="microsoft" label="Microsoft" next={next} icon={<WindowsOutlined className="auth-provider-icon" />} /> : null}
                    </div>
                    {settings.linuxdoEnabled ? (
                        <Button className="auth-provider-button auth-linuxdo-button" size="large" block icon={<LinuxDOIcon />} href={linuxDOLoginURL(next)} onClick={(event) => navigateAfterReferralClick(event, linuxDOLoginURL(next))}>
                            {t("auth.linuxRegister")}
                        </Button>
                    ) : null}
                </>
            ) : null}
        </form>
    );
}

function OAuthButton({ provider, label, next, icon }: { provider: SocialOAuthProvider; label: string; next: string; icon: ReactNode }) {
    return (
        <Button className="auth-provider-button" size="large" icon={icon} href={socialOAuthLoginURL(provider, next)} onClick={(event) => navigateAfterReferralClick(event, socialOAuthLoginURL(provider, next))}>
            {label}
        </Button>
    );
}

function AuthField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <label htmlFor={htmlFor} className="auth-field-label block text-xs font-medium">
                {label}
            </label>
            {children}
        </div>
    );
}

function Notice({ icon, tone, children }: { icon: ReactNode; tone: "blue" | "amber"; children: ReactNode }) {
    return (
        <div className="auth-notice" data-tone={tone}>
            {icon}
            {children}
        </div>
    );
}
