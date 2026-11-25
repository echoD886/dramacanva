const TEAM_CONTEXT_PREFIX = "open-ai-canvas:active-team";

let activeUserId = "";
let activeTeamId = "";

export function hydrateTeamContext(userId?: string | null) {
    activeUserId = userId || "";
    if (!activeUserId || typeof localStorage === "undefined") {
        activeTeamId = "";
        return activeTeamId;
    }
    activeTeamId = localStorage.getItem(teamContextKey(activeUserId)) || "";
    return activeTeamId;
}

export function setActiveTeamContext(teamId?: string | null) {
    activeTeamId = teamId || "";
    if (typeof localStorage !== "undefined" && activeUserId) {
        if (activeTeamId) localStorage.setItem(teamContextKey(activeUserId), activeTeamId);
        else localStorage.removeItem(teamContextKey(activeUserId));
    }
}

export function getActiveTeamContext() {
    return activeTeamId;
}

function teamContextKey(userId: string) {
    return `${TEAM_CONTEXT_PREFIX}:${userId}`;
}
