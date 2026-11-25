import { createPreloadablePage } from "./preloadable-page";

const loaders = {
    "/login": () => import("@/pages/auth/login"),
    "/register": () => import("@/pages/auth/register"),
};

export const loadLoginPage = loaders["/login"];
export const loadRegisterPage = loaders["/register"];
export const AuthScenePortal = createPreloadablePage(() => import("@/pages/auth/auth-scene-portal"));

export function preloadAuthRoute(pathname: string) {
    const load = loaders[pathname as keyof typeof loaders];
    if (load) {
        void load().catch(() => undefined);
        void AuthScenePortal.preload().catch(() => undefined);
    }
}

export function isAuthEntry(pathname: string) {
    return pathname === "/login" || pathname === "/register";
}
