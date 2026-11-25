export function audiencePath(path: string) {
    let clean = path.replace(/^\/(zh|hk|tw|en|ja|ko|es|pt)(?=\/|$)/, "") || "/";
    if (/^\/canvas(?:\/|$)/.test(clean)) clean = "/canvas";
    if (clean.length > 160 || !/^\/(?:[a-zA-Z0-9-]+\/)*[a-zA-Z0-9-]*$/.test(clean)) return null;
    if (
        ["/", "/canvas", "/pricing", "/workbench", "/login", "/register", "/help", "/about"].includes(clean) ||
        /^\/(blog|skills|guides|works)\/[a-zA-Z0-9-]+$/.test(clean) ||
        /^\/(seedance-|kling-|sora-|veo-|wan-|nano-banana|gpt-image-|midjourney-|grok-imagine|minimax-)[a-zA-Z0-9-]*$/.test(clean)
    )
        return clean;
    return null;
}
