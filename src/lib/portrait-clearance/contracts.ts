/**
 * 肖像可识别性排查的跨组件合同。
 *
 * 画布只持久化这里的紧凑节点状态；图片、embedding、候选列表和完整模型响应
 * 必须留在 Local Runtime 任务目录中。
 */

export const PORTRAIT_CLEARANCE_SCHEMA_VERSION = 1 as const;
export const PORTRAIT_CLEARANCE_PLUGIN_ID = "portrait-clearance" as const;
export const PORTRAIT_CLEARANCE_NODE_TYPE = "portrait-clearance" as const;

export type PortraitRiskLevel =
    | "high"
    | "medium"
    | "low_to_medium"
    | "low"
    | "unable_to_determine";

export type PortraitClearanceMode = "direct-compare" | "network-search";
export type PortraitClearanceAnalysisMode = "local-plus-vision" | "local-only";
export type PortraitClearanceDedupMode = "phash" | "arcface";
export type PortraitClearanceInputRole = "query" | "reference" | "candidate";

export type PortraitClearanceInputBinding = {
    nodeId: string;
    role: PortraitClearanceInputRole;
};

export type PortraitClearanceModelPolicy =
    | { mode: "project-default" }
    | { mode: "pinned"; modelRef: string };

export type PortraitClearanceTaskStatus =
    | "queued"
    | "running"
    | "waiting_model"
    | "partial"
    | "completed"
    | "failed"
    | "cancelled";

export type PortraitClearanceTaskStage =
    | "validating-inputs"
    | "checking-model-resources"
    | "preparing-query"
    | "searching"
    | "downloading-candidates"
    | "deduplicating"
    | "local-comparing"
    | "waiting-for-model"
    | "model-comparing"
    | "building-report"
    | "done";

export type PortraitClearanceNodeState = {
    schemaVersion: typeof PORTRAIT_CLEARANCE_SCHEMA_VERSION;
    mode: PortraitClearanceMode;
    analysisMode: PortraitClearanceAnalysisMode;
    modelPolicy: PortraitClearanceModelPolicy;
    inputBindings: PortraitClearanceInputBinding[];
    settings: {
        maxCandidates: number;
        searchScrolls: number;
        dedupMode: PortraitClearanceDedupMode;
        modelConcurrency: number;
        showBrowserForDebug: boolean;
    };
    activeTaskId?: string;
    task?: {
        status: PortraitClearanceTaskStatus;
        stage: PortraitClearanceTaskStage;
        progress: number;
        processedCandidates: number;
        totalCandidates?: number;
        errorCode?: string;
        errorMessage?: string;
        updatedAt: string;
    };
    lastResult?: {
        taskId: string;
        highestRisk: PortraitRiskLevel;
        riskCounts: Partial<Record<PortraitRiskLevel, number>>;
        candidateCount: number;
        comparedCount: number;
        modelRef?: string;
        completedAt: string;
        detailsAvailable: boolean;
    };
};

export const DEFAULT_PORTRAIT_CLEARANCE_SETTINGS: PortraitClearanceNodeState["settings"] = {
    maxCandidates: 30,
    searchScrolls: 5,
    dedupMode: "phash",
    modelConcurrency: 2,
    showBrowserForDebug: false,
};

export function createDefaultPortraitClearanceState(): PortraitClearanceNodeState {
    return {
        schemaVersion: PORTRAIT_CLEARANCE_SCHEMA_VERSION,
        mode: "direct-compare",
        analysisMode: "local-plus-vision",
        modelPolicy: { mode: "project-default" },
        inputBindings: [],
        settings: { ...DEFAULT_PORTRAIT_CLEARANCE_SETTINGS },
    };
}

