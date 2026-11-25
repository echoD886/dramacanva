import { ApiError, http, apiBaseURL, compactApiParams, serializeApiParams, type ApiParams } from "@/services/api/request";
import { getActiveUserScope } from "@/lib/user-scope";

let addedSkillsRequest: { scope: string; promise: Promise<{ skills: Skill[] }> } | null = null;
let addedSkillsCache: { scope: string; value: { skills: Skill[] }; expiresAt: number } | null = null;
let addedSkillsCacheVersion = 0;

export type SkillPreset = {
    presetId: string;
    name: string;
    scene: string;
    skillIds: string[];
    rationale: string;
    source: string;
    evidence: string;
    upgrade: string;
};

export function listSkillPresets() {
    return skillHttp.get<{ presets: SkillPreset[] }>("/skills/presets");
}

export type SkillSort = "popular" | "new" | "updated";
export type SkillScope = "public" | "mine" | "created" | "favorites";
export type SkillMediaType = "image" | "video";

export type SkillShowcaseMedia = {
    type: SkillMediaType;
    showcaseUri: string;
    showcaseUrl: string;
};

export type Skill = {
    skillId: string;
    skillName: string;
    description: string;
    instruction?: string;
    versionId: string;
    version: string;
    contentHash: string;
    fileCount: number;
    totalBytes: number;
    sourceType: "builtin" | "markdown" | "zip" | "github" | string;
    sourceUrl: string;
    sourceRef: string;
    sourceSubdir: string;
    sourceCommit: string;
    syncStatus: "synced" | "failed" | "syncing" | string;
    syncError?: string;
    autoUpdate: boolean;
    lastCheckedAt?: string;
    lastSyncedAt?: string;
    status: number;
    markdownUrl: string;
    createdAt: string;
    updatedAt: string;
    source: number;
    tag: string;
    sortWeight: number;
    isPrivate: boolean;
    likeCount: number;
    isLike: boolean;
    ownerUid: string;
    effectiveUser: { name: string; avatarUrl: string; uid: string };
    originalSkillId: string | null;
    showcaseMedia: SkillShowcaseMedia[];
    addedCount: number;
    isTest: boolean;
    extraInfo: string;
    isAdded: boolean;
    isOwner: boolean;
};

export type SkillCategory = { value: string; label: string };

export type SkillList = {
    skills: Skill[];
    totalCount: number;
    hasMore: boolean;
    nextOffset: number;
    page: number;
    pageSize: number;
    categories: SkillCategory[];
};

export type ListSkillsInput = {
    platformRootId?: string;
    platformCategoryId?: string;
    platformUncategorized?: boolean;
    page?: number;
    pageSize?: number;
    scope?: SkillScope;
    sort?: SkillSort;
    search?: string;
    tag?: string;
};

export type SkillMutationInput = {
    skillName: string;
    description: string;
    instruction?: string;
    tag: string;
    isPrivate: boolean;
    markdownUrl: string;
    showcaseMedia: SkillShowcaseMedia[];
    extraInfo: string;
};

export type SkillPackageFile = {
    path: string;
    kind: "markdown" | "code" | "text" | "image" | "video" | "audio" | "binary" | string;
    mimeType: string;
    size: number;
    sha256: string;
};

export type SkillPackageFileContent = {
    file: SkillPackageFile;
    content: string;
    binary: boolean;
};

export type SkillPackageBundle = {
    skillId: string;
    name: string;
    description: string;
    versionId: string;
    version: string;
    contentHash: string;
    files: Array<{ path: string; mimeType: string; contentBase64: string }>;
};

export type SkillFileSearchResult = { path: string; line: number; snippet: string };

export type InstallSkillUploadInput = {
    file: File;
    sourceType?: "markdown" | "zip";
    name?: string;
    description?: string;
    tag?: string;
    isPrivate?: boolean;
};

export type InstallGitHubSkillInput = {
    url: string;
    ref?: string;
    subdir?: string;
    tag?: string;
    isPrivate?: boolean;
    autoUpdate?: boolean;
};

// 技能接口的后端 JSON 是 snake_case（skill_name、showcase_media、total_count…），前端类型是 camelCase。
// 所有响应在这里统一转换，缺失的数组补默认值；否则技能页读取 skill.showcaseMedia.some 会整页崩溃。
const renamedSkillKeys: Record<string, string> = { create_time: "createdAt", update_time: "updatedAt" };

function camelizeSkillKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(camelizeSkillKeys);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [renamedSkillKeys[key] ?? key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase()), camelizeSkillKeys(item)]));
}

function snakeSkillKeys(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`),
            Array.isArray(item) ? item.map((entry) => (entry && typeof entry === "object" ? snakeSkillKeys(entry as Record<string, unknown>) : entry)) : item,
        ]),
    );
}

function normalizeSkill(skill: Skill): Skill {
    return { ...skill, showcaseMedia: Array.isArray(skill.showcaseMedia) ? skill.showcaseMedia : [] };
}

export function normalizeSkillPayload<T>(payload: unknown): T {
    const data = camelizeSkillKeys(payload) as Record<string, unknown>;
    if (Array.isArray(data?.skills)) data.skills = (data.skills as Skill[]).map(normalizeSkill);
    if (data?.skill) data.skill = normalizeSkill(data.skill as Skill);
    if (Array.isArray(data?.skills) && !Array.isArray(data.categories)) data.categories = [];
    return data as T;
}

const skillHttp = {
    get: async <T>(url: string, config?: Parameters<typeof http.get>[1]) => normalizeSkillPayload<T>(await http.get<unknown>(url, config)),
    post: async <T>(url: string, data?: unknown) => normalizeSkillPayload<T>(await http.post<unknown>(url, data)),
    put: async <T>(url: string, data?: unknown) => normalizeSkillPayload<T>(await http.put<unknown>(url, data)),
    delete: async <T>(url: string) => normalizeSkillPayload<T>(await http.delete<unknown>(url)),
};

export function listSkills(input: ListSkillsInput = {}) {
    const params = serializeApiParams(compactApiParams(snakeSkillKeys(input as Record<string, unknown>) as ApiParams));
    return skillHttp.get<SkillList>(`/skills?${params.toString()}`).then((list) => ({ ...list, skills: list.skills ?? [], categories: list.categories ?? [] }));
}

export function getSkill(id: string) {
    return skillHttp.get<{ skill: Skill }>(`/skills/${encodeURIComponent(id)}`);
}

export function listAddedSkills() {
    const scope = getActiveUserScope();
    const version = addedSkillsCacheVersion;
    const now = Date.now();
    if (addedSkillsCache?.scope === scope && addedSkillsCache.expiresAt > now) return Promise.resolve(addedSkillsCache.value);
    if (addedSkillsRequest?.scope === scope) return addedSkillsRequest.promise;
    const promise = readAddedSkillsWithRetry()
        .then((value) => {
            if (version === addedSkillsCacheVersion) addedSkillsCache = { scope, value, expiresAt: Date.now() + 15_000 };
            return value;
        })
        .finally(() => {
            if (addedSkillsRequest?.promise === promise) addedSkillsRequest = null;
        });
    addedSkillsRequest = { scope, promise };
    return promise;
}

async function readAddedSkillsWithRetry() {
    const retryDelays = [300, 900, 1800];
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await skillHttp.get<{ skills: Skill[] }>("/skills/added");
        } catch (cause) {
            if (!(cause instanceof ApiError) || !cause.retryable || attempt >= retryDelays.length) throw cause;
            await new Promise<void>((resolve) => globalThis.setTimeout(resolve, retryDelays[attempt]));
        }
    }
}

function invalidateAddedSkillsCache() {
    addedSkillsCacheVersion++;
    addedSkillsCache = null;
    addedSkillsRequest = null;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("canvas-skills-changed"));
}

export function createSkill(input: SkillMutationInput) {
    return skillHttp.post<{ skill: Skill }>("/skills", snakeSkillKeys(input as unknown as Record<string, unknown>)).finally(invalidateAddedSkillsCache);
}

export function installSkillUpload(input: InstallSkillUploadInput) {
    const form = new FormData();
    form.append("file", input.file);
    if (input.sourceType) form.append("source_type", input.sourceType);
    if (input.name) form.append("name", input.name);
    if (input.description) form.append("description", input.description);
    if (input.tag) form.append("tag", input.tag);
    form.append("is_private", String(input.isPrivate !== false));
    return skillHttp.post<{ skill: Skill }>("/skills/install", form).finally(invalidateAddedSkillsCache);
}

export function installGitHubSkill(input: InstallGitHubSkillInput) {
    return skillHttp
        .post<{ skill: Skill }>("/skills/install/github", {
            url: input.url,
            ref: input.ref,
            subdir: input.subdir,
            tag: input.tag,
            is_private: input.isPrivate !== false,
            auto_update: Boolean(input.autoUpdate),
        })
        .finally(invalidateAddedSkillsCache);
}

export function listSkillFiles(id: string) {
    return skillHttp.get<{ files: SkillPackageFile[] }>(`/skills/${encodeURIComponent(id)}/files`);
}

export function getSkillFile(id: string, path: string) {
    return skillHttp.get<{ file: SkillPackageFileContent }>(`/skills/${encodeURIComponent(id)}/file`, { params: { path } });
}

export function getSkillBundle(id: string) {
    return skillHttp.get<{ bundle: SkillPackageBundle }>(`/skills/${encodeURIComponent(id)}/bundle`);
}

export function searchSkillFiles(id: string, query: string) {
    return skillHttp.get<{ results: SkillFileSearchResult[] }>(`/skills/${encodeURIComponent(id)}/search`, { params: { q: query } });
}

export function syncSkill(id: string) {
    return skillHttp.post<{ skill: Skill }>(`/skills/${encodeURIComponent(id)}/sync`).finally(invalidateAddedSkillsCache);
}

export function skillFileRawURL(id: string, path: string) {
    const base = String(apiBaseURL).replace(/\/$/, "");
    return `${base}/skills/${encodeURIComponent(id)}/file/raw?path=${encodeURIComponent(path)}`;
}

export function updateSkill(id: string, input: SkillMutationInput) {
    return skillHttp.put<{ skill: Skill }>(`/skills/${encodeURIComponent(id)}`, snakeSkillKeys(input as unknown as Record<string, unknown>)).finally(invalidateAddedSkillsCache);
}

export function deleteSkill(id: string) {
    return skillHttp.delete<{ deleted: boolean }>(`/skills/${encodeURIComponent(id)}`).finally(invalidateAddedSkillsCache);
}

export function addSkill(id: string) {
    return skillHttp.post<{ skill: Skill }>(`/skills/${encodeURIComponent(id)}/add`).finally(invalidateAddedSkillsCache);
}

export function removeSkill(id: string) {
    return skillHttp.delete<{ skill: Skill }>(`/skills/${encodeURIComponent(id)}/add`).finally(invalidateAddedSkillsCache);
}

export function likeSkill(id: string) {
    return skillHttp.post<{ skill: Skill }>(`/skills/${encodeURIComponent(id)}/like`);
}

export function unlikeSkill(id: string) {
    return skillHttp.delete<{ skill: Skill }>(`/skills/${encodeURIComponent(id)}/like`);
}
