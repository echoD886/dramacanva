import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Moon, Pause, Play, Sun, X } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { aceternityMotion } from "@/lib/aceternity-motion";
import { useThemeStore } from "@/stores/use-theme-store";
import "./auth-scene.css";
import { useI18n } from "@/i18n/use-i18n";
import { LocalePicker } from "@/i18n/locale-picker";
import { BrandLogo } from "@/components/brand/brand-logo";

const AUTH_VIDEO_WEBM = "/auth/yingce-auth-film-grain.webm?v=yingce-original-20260901";
const AUTH_VIDEO_MP4 = "/auth/yingce-auth-film-grain.mp4?v=yingce-original-20260901";
const AUTH_VIDEO_POSTER = "/auth/yingce-auth-film-grain-poster.jpg?v=yingce-original-20260901";
const AUTH_LOGIN_TITLE_ART = "/auth/login-title-calligraphy.png";
const AUTH_LOGIN_SLOGAN_ART = "/auth/login-slogan-calligraphy.png";
const AUTH_ACTIVATION_MARK = "dramacanva-public:auth-entry-activation";
const AUTH_COMMIT_MARK = "dramacanva-public:auth-dialog-commit";
const AUTH_FIRST_FRAME_MARK = "dramacanva-public:auth-dialog-first-frame";

const authCopy = {
    login: {
        eyebrow: "WELCOME BACK · DramaCanvas",
        title: "auth.loginTitle",
        description: "auth.registerDescription",
    },
    register: {
        eyebrow: "BEGIN YOUR STORY · DramaCanvas",
        title: "auth.registerTitle",
        description: "auth.registerDescription",
    },
    recovery: {
        eyebrow: "ACCOUNT RECOVERY",
        title: "auth.recoveryTitle",
        description: "auth.recoveryDescription",
    },
} as const;

const focusableSelector = ["a[href]", "button:not([disabled])", "input:not([disabled])", "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])"].join(",");

export default function AuthScenePortal() {
    const { t, locale } = useI18n();
    const location = useLocation();
    const navigate = useNavigate();
    const reducedMotion = useReducedMotion();
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const dialogRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(false);
    const [backdropReady, setBackdropReady] = useState(false);
    const recovery = location.pathname === "/forgot-password";
    const activeTab = location.pathname === "/register" ? "register" : "login";
    const isLogin = !recovery && activeTab === "login";
    const useOriginalTitleArt = isLogin && locale === "zh-CN";
    const copy = recovery ? authCopy.recovery : activeTab === "register" ? authCopy.register : authCopy.login;

    useLayoutEffect(() => {
        if (!performance.getEntriesByName(AUTH_ACTIVATION_MARK, "mark").length) return;
        performance.mark(AUTH_COMMIT_MARK);
        const commitMeasure = performance.measure("dramacanva-public:auth-entry-to-dialog-commit", AUTH_ACTIVATION_MARK, AUTH_COMMIT_MARK);
        dialogRef.current?.setAttribute("data-auth-commit-ms", commitMeasure.duration.toFixed(2));
        let secondFrame = 0;
        const firstFrame = window.requestAnimationFrame(() => {
            secondFrame = window.requestAnimationFrame(() => {
                performance.mark(AUTH_FIRST_FRAME_MARK);
                const firstFrameMeasure = performance.measure("dramacanva-public:auth-entry-to-dialog-first-frame", AUTH_ACTIVATION_MARK, AUTH_FIRST_FRAME_MARK);
                dialogRef.current?.setAttribute("data-auth-first-frame-ms", firstFrameMeasure.duration.toFixed(2));
            });
        });
        return () => {
            window.cancelAnimationFrame(firstFrame);
            window.cancelAnimationFrame(secondFrame);
        };
    }, []);

    const close = () => {
        if (dialogRef.current?.querySelector('[aria-busy="true"]')) return;
        navigate("/home", { replace: true });
    };

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setBackdropReady(true));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        if (reducedMotion) return;
        let frame = 0;
        let nextFrame = 0;
        const enable = () => {
            if (!dialogRef.current?.querySelector("form input")) return;
            observer.disconnect();
            frame = window.requestAnimationFrame(() => {
                nextFrame = window.requestAnimationFrame(() => setVideoEnabled(true));
            });
        };
        const observer = new MutationObserver(enable);
        if (dialogRef.current) observer.observe(dialogRef.current, { childList: true, subtree: true });
        enable();
        return () => {
            observer.disconnect();
            window.cancelAnimationFrame(frame);
            window.cancelAnimationFrame(nextFrame);
        };
    }, [reducedMotion]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoEnabled) return;
        video.load();
        void video
            .play()
            .then(() => setVideoPlaying(true))
            .catch(() => setVideoPlaying(false));
    }, [videoEnabled]);

    useEffect(() => {
        const workspace = document.querySelector<HTMLElement>(".app-workspace-shell");
        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousAriaHidden = workspace?.getAttribute("aria-hidden");
        const previousInert = workspace?.inert ?? false;

        document.body.classList.add("auth-route-open");
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        if (workspace) {
            workspace.inert = true;
            workspace.setAttribute("aria-hidden", "true");
        }

        return () => {
            document.body.classList.remove("auth-route-open");
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
            if (workspace) {
                workspace.inert = previousInert;
                if (previousAriaHidden == null) workspace.removeAttribute("aria-hidden");
                else workspace.setAttribute("aria-hidden", previousAriaHidden);
            }
            let focusedTarget: HTMLElement | undefined;
            const restoreFocus = () => {
                if (document.querySelector(".auth-route-layer")) {
                    return;
                }
                const active = document.activeElement;
                if (active && active !== document.body && active.isConnected) {
                    if (active !== focusedTarget) {
                        observer.disconnect();
                        window.clearTimeout(timeout);
                    }
                    return;
                }
                const fallback = document.querySelector<HTMLElement>("main, [role='main']") ?? document.querySelector<HTMLElement>(".app-workspace-stage");
                if (!fallback || !fallback.getClientRects().length || fallback.closest("[inert]")) return;
                const hadTabIndex = fallback.hasAttribute("tabindex");
                if (!hadTabIndex) fallback.setAttribute("tabindex", "-1");
                fallback.focus({ preventScroll: true });
                if (document.activeElement !== fallback) {
                    if (!hadTabIndex) fallback.removeAttribute("tabindex");
                    return;
                }
                focusedTarget = fallback;
                if (!hadTabIndex)
                    fallback.addEventListener(
                        "blur",
                        () => {
                            fallback.removeAttribute("tabindex");
                            window.requestAnimationFrame(restoreFocus);
                        },
                        { once: true },
                    );
            };
            const observer = new MutationObserver(restoreFocus);
            observer.observe(document.body, { childList: true, subtree: true });
            const timeout = window.setTimeout(() => observer.disconnect(), 5_000);
            window.requestAnimationFrame(restoreFocus);
        };
    }, []);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        let frame = 0;
        const focus = () => {
            const initialFocus = recovery ? dialog.querySelector<HTMLElement>("#recovery-code, #recovery-email") : activeTab === "register" ? dialog.querySelector<HTMLElement>("#register-username") : dialog.querySelector<HTMLElement>("#login-account");
            if (!initialFocus) return;
            observer.disconnect();
            frame = window.requestAnimationFrame(() => initialFocus.focus({ preventScroll: true }));
        };
        const observer = new MutationObserver(focus);
        observer.observe(dialog, { childList: true, subtree: true });
        focus();
        return () => {
            observer.disconnect();
            window.cancelAnimationFrame(frame);
        };
    }, [activeTab, recovery]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const dialog = dialogRef.current;
            if (!dialog) return;
            if (event.key === "Escape") {
                event.preventDefault();
                close();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.offsetParent !== null);
            if (!focusable.length) {
                event.preventDefault();
                dialog.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    const toggleVideo = () => {
        if (!videoEnabled) {
            setVideoEnabled(true);
            return;
        }
        const video = videoRef.current;
        if (!video) return;
        if (video.paused)
            void video
                .play()
                .then(() => setVideoPlaying(true))
                .catch(() => setVideoPlaying(false));
        else {
            video.pause();
            setVideoPlaying(false);
        }
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="auth-route-layer" role="presentation" data-popup-container="">
            <div className="auth-route-backdrop" data-ready={backdropReady || undefined} aria-hidden onPointerDown={(event) => event.button === 0 && close()} />
            <m.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-dialog-title"
                aria-describedby={isLogin ? undefined : "auth-dialog-description"}
                tabIndex={-1}
                className="auth-route-dialog"
                data-auth-route={recovery ? "recovery" : activeTab}
                initial={reducedMotion ? false : { scale: 0.99, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: aceternityMotion.duration.panel, ease: aceternityMotion.easing.enter }}
            >
                <section className="auth-visual-panel" aria-label={t("auth.brandFilm")}>
                    <img className="auth-visual-poster" src={AUTH_VIDEO_POSTER} alt="" aria-hidden decoding="async" fetchPriority="high" />
                    <video
                        ref={videoRef}
                        className="auth-visual-video"
                        data-ready={videoReady || undefined}
                        poster={AUTH_VIDEO_POSTER}
                        autoPlay={videoEnabled}
                        muted
                        loop
                        playsInline
                        preload="none"
                        aria-hidden="true"
                        tabIndex={-1}
                        onLoadedData={() => setVideoReady(true)}
                        onError={() => setVideoReady(false)}
                        onPlay={() => setVideoPlaying(true)}
                        onPause={() => setVideoPlaying(false)}
                    >
                        {videoEnabled ? <source src={AUTH_VIDEO_WEBM} type="video/webm" /> : null}
                        {videoEnabled ? <source src={AUTH_VIDEO_MP4} type="video/mp4" /> : null}
                    </video>
                    <div className="auth-visual-vignette" aria-hidden />
                    <div className="auth-brand-row">
                        <BrandLogo className="auth-brand-mark" theme="dark" />
                        <span>DramaCanvas</span>
                    </div>
                    <button type="button" className="auth-video-control" onClick={toggleVideo} aria-label={t(videoPlaying ? "auth.pauseFilm" : "auth.playFilm")}>
                        {videoPlaying ? <Pause /> : <Play />}
                        <span>{t(videoPlaying ? "auth.filmPlaying" : "auth.playFilmShort")}</span>
                    </button>
                    <div className="auth-visual-copy">
                        <p>DramaCanvas</p>
                        <h1 className={useOriginalTitleArt ? "auth-slogan-art-heading" : undefined}>
                            {useOriginalTitleArt ? (
                                <img src={AUTH_LOGIN_SLOGAN_ART} alt={t("miscPages.authSloganAlt")} draggable={false} />
                            ) : (
                                <>
                                    {t("auth.sloganFirst")}
                                    <br />
                                    {t("auth.sloganLast")}
                                </>
                            )}
                        </h1>
                    </div>
                </section>

                <section className="auth-form-panel">
                    <div className="auth-panel-tools">
                        <AnimatedThemeToggler
                            className="auth-icon-button"
                            duration={420}
                            viewTransition={false}
                            theme={theme}
                            onThemeChange={setTheme}
                            aria-label={t("nav.switchTheme", { theme: t(theme === "dark" ? "nav.light" : "nav.dark") })}
                            title={t(theme === "dark" ? "nav.light" : "nav.dark")}
                        >
                            {theme === "dark" ? <Sun /> : <Moon />}
                        </AnimatedThemeToggler>
                        <button type="button" className="auth-icon-button" onClick={close} aria-label={t("auth.closeDialog")} title={t("common.close")}>
                            <X />
                        </button>
                    </div>

                    <div className="auth-form-scroll">
                        <m.div className="auth-form-shell" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: aceternityMotion.duration.panel, ease: aceternityMotion.easing.enter }}>
                            <header className="auth-form-header">
                                {!isLogin ? <p className="auth-eyebrow">{copy.eyebrow}</p> : null}
                                <h2 id="auth-dialog-title" className={useOriginalTitleArt ? "auth-art-heading" : undefined}>
                                    {useOriginalTitleArt ? <img src={AUTH_LOGIN_TITLE_ART} alt={t("miscPages.authTitleAlt")} draggable={false} /> : t(copy.title)}
                                </h2>
                                {!isLogin ? (
                                    <p id="auth-dialog-description" className="auth-description">
                                        {t(copy.description)}
                                    </p>
                                ) : null}
                            </header>

                            {!recovery ? (
                                <p className="auth-route-switch">
                                    {t(activeTab === "login" ? "auth.newUser" : "auth.existingUser")}
                                    <Link to={{ pathname: activeTab === "login" ? "/register" : "/login", search: location.search }}>{t(activeTab === "login" ? "auth.register" : "auth.backLogin")}</Link>
                                </p>
                            ) : null}

                            <AnimatePresence mode="wait" initial={false}>
                                <m.div
                                    key={location.pathname}
                                    className="auth-route-content"
                                    initial={reducedMotion ? false : { opacity: 0, x: activeTab === "register" ? 8 : -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={reducedMotion ? undefined : { opacity: 0, x: activeTab === "register" ? -8 : 8 }}
                                    transition={{ duration: reducedMotion ? 0 : aceternityMotion.duration.state, ease: aceternityMotion.easing.enter }}
                                >
                                    <LocalePicker />
                                    <Outlet />
                                </m.div>
                            </AnimatePresence>

                            {!recovery ? (
                                <p className="auth-policy-note">
                                    {t("auth.consent")}{" "}
                                    <Link to="/legal/terms" target="_blank" rel="noopener noreferrer">
                                        {t("auth.terms")}
                                    </Link>{" "}
                                    {t("auth.and")}{" "}
                                    <Link to="/legal/privacy" target="_blank" rel="noopener noreferrer">
                                        {t("auth.privacy")}
                                    </Link>
                                </p>
                            ) : null}
                        </m.div>
                    </div>
                </section>
            </m.div>
        </div>,
        document.body,
    );
}
