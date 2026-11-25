const workspaceRouteLoaders = {
    inspirations: () => import("@/pages/inspirations"),
    assets: () => import("@/pages/assets"),
    canvas: () => import("@/pages/canvas"),
    create: () => import("@/pages/create"),
    pricing: () => import("@/pages/pricing"),
    projects: () => import("@/pages/projects"),
    wallet: () => import("@/pages/wallet"),
};

export const loadAssetsPage = workspaceRouteLoaders.assets;
export const loadCanvasPage = workspaceRouteLoaders.canvas;
export const loadCanvasProjectPage = () => import("@/pages/canvas/project");
export const loadCreatePage = workspaceRouteLoaders.create;
export const loadDramaCreatePage = () => import("@/pages/drama/route-loader").then((module) => module.loadDramaCreatePage());
export const loadPricingPage = workspaceRouteLoaders.pricing;
export const loadProjectsPage = workspaceRouteLoaders.projects;
export const loadWalletPage = workspaceRouteLoaders.wallet;
export const loadUserLayout = () => import("@/layouts/user-layout");

// The canvas editor (~250 KB gzip with its render engine) is only needed after a
// canvas is opened. List startup must not import it; opening a card or an
// explicit caller can warm it without making menu actions load an editor.
let workspaceShellRendered = false;
if (typeof window !== "undefined") window.addEventListener("dramacanva:navigation-ready", () => (workspaceShellRendered = true), { once: true });

type IdleWindow = Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number };

function preloadCanvasEditorWhenIdle() {
    // Shortly after the shell's first render: soon enough that a canvas opened from the list
    // finds the editor ready, late enough not to delay the list itself.
    const warm = () => {
        const load = () => void loadCanvasProjectPage().catch(() => undefined);
        const idle = (window as IdleWindow).requestIdleCallback;
        if (idle) idle(load, { timeout: 800 });
        else window.setTimeout(load, 300);
    };
    if (workspaceShellRendered || typeof window === "undefined") warm();
    else window.addEventListener("dramacanva:navigation-ready", warm, { once: true });
}

export function preloadWorkspaceRoute(pathnameOrSlug: string, options: { includeCanvasEditor?: boolean } = {}) {
    const slug = pathnameOrSlug.replace(/^\//, "").split("/", 1)[0] as keyof typeof workspaceRouteLoaders;
    const load = workspaceRouteLoaders[slug];
    if (load) {
        void loadUserLayout().catch(() => undefined);
        if (slug === "projects" && /^\/?projects\/create\/?$/.test(pathnameOrSlug)) {
            void loadDramaCreatePage().catch(() => undefined);
            return;
        }
        if (slug === "canvas" && /^\/?canvas\/(?!share(?:\/|$))[^/]+/.test(pathnameOrSlug)) {
            void loadCanvasProjectPage().catch(() => undefined);
            return;
        }
        void load().catch(() => undefined);
    }
    if (slug === "canvas" && options.includeCanvasEditor === true) preloadCanvasEditorWhenIdle();
}
