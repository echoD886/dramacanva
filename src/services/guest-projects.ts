import localforage from "localforage";

import { currentLocaleText } from "@/i18n/current-locale-text";

import type { Project, ProjectListPage, ProjectSummary } from "@/services/api/projects";
import { createCanvasProjectWithRemoteSync } from "@/services/user-data-sync";
import { flushCanvasStorePersistence, useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { getActiveUserScope, GUEST_SCOPE } from "@/lib/user-scope";

export type GuestProjectSummary = ProjectSummary & { canvasId: string };

const store = localforage.createInstance({ name: "dramacanva-public", storeName: "guest_projects" });
const PROJECTS_KEY = "projects";

function assertGuestScope() {
    if (getActiveUserScope() !== GUEST_SCOPE) throw new Error(currentLocaleText("miscPages.guestSwitchedAccountProject"));
}

async function readProjects(): Promise<GuestProjectSummary[]> {
    assertGuestScope();
    return (await store.getItem<GuestProjectSummary[]>(PROJECTS_KEY)) || [];
}

export async function listGuestProjects(): Promise<ProjectListPage & { projects: GuestProjectSummary[] }> {
    const projects = await readProjects();
    return { projects, page: 1, pageSize: projects.length, total: projects.length, hasMore: false };
}

export async function createGuestProject(input: Parameters<typeof import("@/services/api/projects").createProject>[0]) {
    assertGuestScope();
    const now = new Date().toISOString();
    const project: Project = {
        id: `guest-${crypto.randomUUID()}`,
        userId: GUEST_SCOPE,
        name: input.name,
        type: input.type,
        aspectRatio: input.aspectRatio,
        sourceType: input.sourceType,
        description: input.description || "",
        stylePresetId: input.stylePresetId || "",
        styleProfileJson: input.styleProfileJson,
        status: "active",
        revision: 0,
        createdAt: now,
        updatedAt: now,
    };
    const { id: canvasId, syncError } = await createCanvasProjectWithRemoteSync(project.name);
    if (syncError) throw syncError;
    const summary: GuestProjectSummary = { project, canvasId, canvasCount: 1, assetCount: 0, unitCount: 0, completedUnitCount: 0 };
    await store.setItem(PROJECTS_KEY, [summary, ...(await readProjects())]);
    return { project, canvasId };
}

export async function deleteGuestProject(id: string) {
    const projects = await readProjects();
    const deleted = projects.find((item) => item.project.id === id);
    if (!deleted) return;
    await store.setItem(
        PROJECTS_KEY,
        projects.filter((item) => item.project.id !== id),
    );
    useCanvasStore.getState().deleteProjects([deleted.canvasId]);
    await flushCanvasStorePersistence();
}

export async function guestProjectCanvasId(id: string) {
    return (await readProjects()).find((item) => item.project.id === id)?.canvasId || "";
}

export async function guestProjectForCanvas(canvasId: string) {
    return (await readProjects()).find((item) => item.canvasId === canvasId)?.project;
}
