import { trackAuthEvent } from "@/services/public-analytics";
import { useI18n } from "@/i18n/use-i18n";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { GithubFilled, GoogleOutlined, WindowsOutlined } from "@ant-design/icons";
import { App, Button, Divider } from "antd";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { preloadWorkspaceRoute } from "@/lib/workspace-route-modules";
import { getAuthSession, getAuthSettings, linuxDOLoginURL, login, socialOAuthLoginURL, type SocialOAuthProvider } from "@/services/api/auth";
import { navigateAfterReferralClick } from "@/lib/referral-attribution";
import { useUserStore } from "@/stores/use-user-store";
import { loginValidationError, safeAuthNext, type LoginValidationError } from "./auth-route-utils";
import { LinuxDOIcon } from "./auth-scene";
import { DragEntryButton } from "./drag-entry-button";
import { AuthCaptcha, useAuthCaptcha } from "./auth-captcha";

export default function LoginPage() {
    const captcha = useAuthCaptcha(true);
    const { t } = useI18n();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { message } = App.useApp();
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [authSettings, setAuthSettings] = useState<Awaited<ReturnType<typeof getAuthSettings>> | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [fieldError, setFieldError] = useState<LoginValidationError["field"] | null>(null);
    const [providerNotice, setProviderNotice] = useState<string | null>(null);
    const next = safeAuthNext(params.get("next"));
    const forgotPasswordURL = `/forgot-password?next=${encodeURIComponent(next)}`;
    const user = useUserStore((state) => state.user);
    const hydrated = useUserStore((state) => state.hydrated);

    useEffect(() => {
        if (hydrated && user) navigate(next, { replace: true });
    }, [hydrated, user, next, navigate]);

    useEffect(() => {
        void getAuthSettings()
            .then(setAuthSettings)
            .catch(() => undefined);
        const oauthError = params.get("oauth_error");
        if (oauthError) {
            setLoginError(oauthError);
            message.error(oauthError);
        }
    }, [message, params]);

    const clearFieldFeedback = (key: "username" | "password") => {
        setLoginError(null);
        setProviderNotice(null);
        if (fieldError === key) setFieldError(null);
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Enter can resubmit the form while the drag control is locked; one request per attempt.
        if (submitting) return;
        const username = usernameRef.current?.value ?? "";
        const password = passwordRef.current?.value ?? "";
        const validation = loginValidationError(username, password);
        if (validation) {
            setFieldError(validation.field);
            setLoginError(t(validation.field === "username" ? "auth.enterUsername" : "auth.enterPassword"));
            window.requestAnimationFrame(() => document.getElementById(validation.field === "username" ? "login-account" : "login-password")?.focus({ preventScroll: true }));
            return;
        }
        setFieldError(null);
        setLoginError(null);
        setSubmitting(true);
        try {
            performance.mark("login-submit");
            const sessionModule = import("@/lib/user-session");
            void sessionModule.catch(() => undefined);
            preloadWorkspaceRoute(next, { includeCanvasEditor: false });
            await captcha.run("login", username, (proof) => login({ username, password, captcha: proof }));
            performance.mark("login-identity-ready");
            const session = await getAuthSession();
            performance.mark("login-session-read");
            const { applyUserSession } = await sessionModule;
            await applyUserSession(session, {
                backgroundRemoteData: true,
                beforeReady: () => {
                    navigate(next, { replace: true });
                    performance.mark("login-navigate");
                },
            });
            performance.mark("login-session-applied");
            trackAuthEvent("login", "email");
            message.success(t("auth.success"));
        } catch (error) {
            const detail = captcha.error(error) || (error instanceof Error ? error.message : t("auth.failed"));
            setLoginError(detail);
            message.error(detail);
        } finally {
            setSubmitting(false);
        }
    };

    const explainUnavailableProvider = (provider: string) => {
        setProviderNotice(t("auth.providerUnavailable", { provider, alternative: authSettings?.linuxdoEnabled ? t("auth.linuxAlternative") : "" }));
    };

    return (
        <form onSubmit={submit} className="auth-login-form space-y-4" aria-busy={submitting} noValidate>
            <AuthField label={t("auth.usernameLabel")} htmlFor="login-account">
                <div className="auth-native-field" data-invalid={fieldError === "username" || undefined}>
                    <UserRound className="auth-field-icon" aria-hidden />
                    <input
                        ref={usernameRef}
                        id="login-account"
                        type="text"
                        onInput={() => clearFieldFeedback("username")}
                        placeholder={t("auth.username")}
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        aria-invalid={fieldError === "username"}
                        aria-describedby={loginError ? "auth-login-error" : undefined}
                    />
                </div>
            </AuthField>
            <AuthField
                label={t("auth.password")}
                htmlFor="login-password"
                action={
                    <Link to={forgotPasswordURL} className="auth-text-link inline-flex min-h-8 items-center rounded-sm text-xs font-medium">
                        {t("auth.forgot")}
                    </Link>
                }
            >
                <div className="auth-native-field" data-invalid={fieldError === "password" || undefined}>
                    <LockKeyhole className="auth-field-icon" aria-hidden />
                    <input
                        ref={passwordRef}
                        id="login-password"
                        type={passwordVisible ? "text" : "password"}
                        onInput={() => clearFieldFeedback("password")}
                        placeholder={t("auth.enterPassword")}
                        autoComplete="current-password"
                        required
                        aria-invalid={fieldError === "password"}
                        aria-describedby={loginError ? "auth-login-error" : undefined}
                    />
                    <button type="button" className="auth-password-visibility" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? t("auth.hidePassword") : t("auth.showPassword")}>
                        {passwordVisible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    </button>
                </div>
            </AuthField>
            {loginError ? (
                <p id="auth-login-error" className="auth-inline-error" role="alert">
                    {loginError}
                </p>
            ) : null}
            <AuthCaptcha value={captcha} disabled={submitting} />
            <DragEntryButton submitting={submitting} hasError={Boolean(loginError)} />
            <Divider plain className="auth-divider">
                {t("auth.otherLogin")}
            </Divider>
            <div className="auth-provider-grid" aria-label={t("auth.socialLogin")}>
                <OAuthLoginButton provider="google" label="Google" next={next} enabled={authSettings?.googleEnabled} icon={<GoogleOutlined className="auth-provider-icon auth-provider-icon-google" />} onUnavailable={explainUnavailableProvider} />
                <OAuthLoginButton provider="github" label="GitHub" next={next} enabled={authSettings?.githubEnabled} icon={<GithubFilled className="auth-provider-icon" />} onUnavailable={explainUnavailableProvider} />
                {authSettings?.microsoftEnabled ? <OAuthLoginButton provider="microsoft" label="Microsoft" next={next} enabled={true} icon={<WindowsOutlined className="auth-provider-icon" />} onUnavailable={explainUnavailableProvider} /> : null}
            </div>
            {providerNotice ? (
                <p className="auth-provider-notice" role="status">
                    {providerNotice}
                </p>
            ) : null}
            {authSettings?.linuxdoEnabled !== false ? (
                <Button
                    className="auth-provider-button auth-linuxdo-button"
                    size="large"
                    block
                    icon={<LinuxDOIcon />}
                    href={authSettings?.linuxdoEnabled ? linuxDOLoginURL(next) : undefined}
                    onClick={(event) => navigateAfterReferralClick(event, linuxDOLoginURL(next))}
                    disabled={authSettings?.linuxdoEnabled !== true}
                >
                    {t("auth.linuxdo")}
                </Button>
            ) : null}
        </form>
    );
}

function OAuthLoginButton({ provider, label, next, enabled, icon, onUnavailable }: { provider: SocialOAuthProvider; label: string; next: string; enabled: boolean | undefined; icon: ReactNode; onUnavailable: (label: string) => void }) {
    return (
        <Button
            htmlType="button"
            className="auth-provider-button"
            size="large"
            icon={icon}
            href={enabled ? socialOAuthLoginURL(provider, next) : undefined}
            onClick={enabled ? (event) => navigateAfterReferralClick(event, socialOAuthLoginURL(provider, next)) : () => onUnavailable(label)}
        >
            {label}
        </Button>
    );
}

function AuthField({ label, htmlFor, action, children }: { label: string; htmlFor: string; action?: ReactNode; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <label htmlFor={htmlFor} className="auth-field-label text-xs font-medium">
                    {label}
                </label>
                {action}
            </div>
            {children}
        </div>
    );
}
