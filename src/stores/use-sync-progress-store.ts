import { create } from "zustand";

export type SyncProjectProgress = {
    projectId: string;
    total: number;
    completed: number;
    phase: "pending" | "uploading" | "saving" | "done" | "error" | "conflict";
    message?: string;
    draftCount?: number;
    /** Server reason for the last failure, e.g. canvas_history_resources_missing. */
    reason?: string;
};

type SyncProgressStore = {
    syncingProjects: Record<string, SyncProjectProgress>;
    setProjectProgress: (projectId: string, patch: Partial<SyncProjectProgress> | null) => void;
    incrementProjectCompleted: (projectId: string) => void;
    clearAll: () => void;
    isAnySyncing: () => boolean;
};

export const useSyncProgressStore = create<SyncProgressStore>((set, get) => ({
    syncingProjects: {},
    setProjectProgress: (projectId, patch) =>
        set((state) => {
            if (!patch) {
                const next = { ...state.syncingProjects };
                delete next[projectId];
                return { syncingProjects: next };
            }
            const current = state.syncingProjects[projectId] || {
                projectId,
                total: 0,
                completed: 0,
                phase: "uploading",
            };
            if (Object.entries(patch).every(([key, value]) => current[key as keyof SyncProjectProgress] === value)) return state;
            return {
                syncingProjects: {
                    ...state.syncingProjects,
                    [projectId]: { ...current, ...patch },
                },
            };
        }),
    incrementProjectCompleted: (projectId) =>
        set((state) => {
            const current = state.syncingProjects[projectId];
            if (!current) return state;
            return {
                syncingProjects: {
                    ...state.syncingProjects,
                    [projectId]: {
                        ...current,
                        completed: Math.min(current.total, current.completed + 1),
                    },
                },
            };
        }),
    clearAll: () => set({ syncingProjects: {} }),
    isAnySyncing: () => {
        const list = Object.values(get().syncingProjects);
        return list.some((item) => item.phase !== "done");
    },
}));

// 其他模块（如画布本地持久化队列）登记的“离开页面会丢数据”判定，与云端同步共用同一个拦截提示。
const unloadGuards = new Set<() => boolean>();

export function registerUnloadGuard(guard: () => boolean) {
    unloadGuards.add(guard);
    return () => {
        unloadGuards.delete(guard);
    };
}

export function shouldWarnBeforeUnload() {
    if (useSyncProgressStore.getState().isAnySyncing()) return true;
    for (const guard of unloadGuards) {
        try {
            if (guard()) return true;
        } catch {
            // 判定失败不能阻断关闭页面。
        }
    }
    return false;
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("beforeunload", (event) => {
        if (shouldWarnBeforeUnload()) {
            event.preventDefault();
            event.returnValue = "画布正在同步至云端，请勿关闭页面。";
            return "画布正在同步至云端，请勿关闭页面。";
        }
    });
}
