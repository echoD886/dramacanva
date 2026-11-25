import { Suspense, type ReactNode, useEffect } from "react";
import { useLocation } from "react-router";
import { AuthScenePortal } from "@/lib/auth-route-modules";
import "./auth-scene.css";
import "@/i18n/locale-picker.css";

const AUTH_ROUTE_PATHS = new Set(["/login", "/register", "/forgot-password"]);
const AUTH_ACTIVATION_MARK = "dramacanva-public:auth-entry-activation";
const AUTH_COMMIT_MARK = "dramacanva-public:auth-dialog-commit";
const AUTH_FIRST_FRAME_MARK = "dramacanva-public:auth-dialog-first-frame";

export function LinuxDOIcon() {
    return <img aria-hidden className="auth-linuxdo-icon" src="/icons/linuxdo.svg" alt="" />;
}

export function AuthScene({ background }: { background: ReactNode }) {
    const location = useLocation();

    useEffect(() => {
        performance.mark("dramacanva-public:auth-shell-mount");
        const markAuthActivation = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest<HTMLAnchorElement>('a[href^="/login"], a[href*="/login?"]');
            if (!anchor) return;
            performance.clearMarks(AUTH_ACTIVATION_MARK);
            performance.clearMarks(AUTH_COMMIT_MARK);
            performance.clearMarks(AUTH_FIRST_FRAME_MARK);
            performance.clearMeasures("dramacanva-public:auth-entry-to-dialog-commit");
            performance.clearMeasures("dramacanva-public:auth-entry-to-dialog-first-frame");
            performance.mark(AUTH_ACTIVATION_MARK);
        };
        document.addEventListener("click", markAuthActivation, true);
        return () => document.removeEventListener("click", markAuthActivation, true);
    }, []);

    return (
        <>
            {background}
            {AUTH_ROUTE_PATHS.has(location.pathname) ? (
                <Suspense fallback={null}>
                    <AuthScenePortal />
                </Suspense>
            ) : null}
        </>
    );
}
