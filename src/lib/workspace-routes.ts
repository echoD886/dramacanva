export function isCanvasAutoOpenRoute(pathname: string, search = "") {
    if (/^\/canvas\/[^/]+(?:\/|$)/.test(pathname)) return true;
    if (pathname !== "/canvas") return false;
    const params = new URLSearchParams(search);
    const mode = params.get("mode");
    const importKind = params.get("import");
    return mode === "new" || mode === "recent" || mode === "handoff" || importKind === "liblib" || importKind === "libtv-starter" || importKind === "model-starter";
}

export function usesLibTVWorkspaceShell(pathname: string, search = "") {
    if (pathname === "/") return false;
    if (/^\/home\/?$/.test(pathname)) return false;
    // HomePage already owns its campaign strip, sidebar and top navigation. Locale-prefixed
    // home routes must follow the same rule or they receive a second workspace shell.
    if (/^\/(?:zh|hk|tw|en|ja|ko|es|pt)(?:\/home)?\/?$/.test(pathname)) return false;
    if (/^\/(?:login|register|forgot-password)\/?$/.test(pathname)) return false;
    if (pathname.startsWith("/admin")) return false;
    return !isCanvasAutoOpenRoute(pathname, search);
}

export function isSpatialWorkbenchPath(pathname: string, search = "") {
    // 画布列表属于用户工作台，只有具体画布编辑器与运营后台保留各自现有视觉契约。
    const canvasEditor = isCanvasAutoOpenRoute(pathname, search);
    return !canvasEditor && !pathname.startsWith("/admin");
}
