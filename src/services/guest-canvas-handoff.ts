import localforage from "localforage";
import { getOnboardingProgress, saveOnboardingProgress, type OnboardingProgressState } from "@/lib/canvas/canvas-onboarding-template";
import { guestCanvasLoginPath } from "@/lib/canvas/guest-canvas-navigation";

import { currentLocaleText } from "@/i18n/current-locale-text";

import { getActiveUserScope, GUEST_SCOPE } from "@/lib/user-scope";
import { rescopeLocalStorageKey } from "@/services/local-workspace-storage";
import { getImageBlob, resolveImageUrl, setImageBlob } from "@/services/image-storage";
import { getMediaBlob, resolveMediaUrl, setMediaBlob } from "@/services/file-storage";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { saveRemoteUserDataNow } from "@/services/user-data-sync";
import { useUserStore } from "@/stores/use-user-store";
import { createProject, type Project } from "@/services/api/projects";
import { guestProjectForCanvas } from "@/services/guest-projects";

type StagedMedia = { key: string; url: string; blob: Blob };
type StagedCanvas = { project: CanvasProject; media: StagedMedia[]; guestProject?: Project; onboarding?: OnboardingProgressState | null };

const handoffs = localforage.createInstance({ name: "dramacanva-public", storeName: "guest_canvas_handoff" });

function localStorageKeys(value: unknown, keys = new Set<string>()): string[] {
    if (!value || typeof value !== "object") return [...keys];
    Object.entries(value).forEach(([field, child]) => {
        if (/storageKey$/i.test(field) && typeof child === "string" && child && !child.startsWith("resource:")) keys.add(child);
        if (Array.isArray(child)) child.forEach((item) => localStorageKeys(item, keys));
        else localStorageKeys(child, keys);
    });
    return [...keys];
}

function remapStrings<T>(value: T, replacements: Map<string, string>): T {
    if (typeof value === "string") return (replacements.get(value) ?? value) as T;
    if (Array.isArray(value)) return value.map((item) => remapStrings(item, replacements)) as T;
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remapStrings(item, replacements)])) as T;
    }
    return value;
}

/** Persist the current guest draft and its local media before the auth scope changes. */
export async function stageGuestCanvasForSignIn(projectId: string) {
    if (getActiveUserScope() !== GUEST_SCOPE) throw new Error(currentLocaleText("miscPages.guestSwitchedAccountCanvas"));
    const project = useCanvasStore.getState().openProject(projectId);
    if (!project) throw new Error(currentLocaleText("miscPages.guestCanvasMissing"));
    const media = await Promise.all(
        localStorageKeys(project).map(async (key) => {
            const image = key.startsWith("image:");
            const blob = image ? await getImageBlob(key) : await getMediaBlob(key);
            if (!blob) throw new Error(currentLocaleText("miscPages.guestMediaMissing"));
            const url = image ? await resolveImageUrl(key) : await resolveMediaUrl(key);
            return { key, url, blob };
        }),
    );
    const token = crypto.randomUUID();
    const guestProject = await guestProjectForCanvas(projectId);
    await handoffs.setItem<StagedCanvas>(token, { project, media, guestProject, onboarding: getOnboardingProgress(projectId) });
    return token;
}

/** Shared gate for canvas generation actions outside the node executor. */
export async function requireCanvasGenerationAccount(projectId: string) {
    if (useUserStore.getState().user?.id) return true;
    const token = await stageGuestCanvasForSignIn(projectId);
    window.location.assign(guestCanvasLoginPath(token, window.location.search));
    return false;
}

/** Import only the draft explicitly staged by this tab's Generate action. */
export async function importStagedGuestCanvas(token: string) {
    const scope = getActiveUserScope();
    if (scope === GUEST_SCOPE) throw new Error(currentLocaleText("miscPages.guestSignInFirst"));
    const staged = await handoffs.getItem<StagedCanvas>(token);
    if (!staged?.project) throw new Error(currentLocaleText("miscPages.guestDraftExpired"));
    const replacements = new Map<string, string>();
    for (const item of staged.media) {
        const nextKey = rescopeLocalStorageKey(item.key, scope);
        const nextUrl = item.key.startsWith("image:") ? await setImageBlob(nextKey, item.blob) : await setMediaBlob(nextKey, item.blob);
        replacements.set(item.key, nextKey);
        if (item.url) replacements.set(item.url, nextUrl);
    }
    const project = remapStrings(staged.project, replacements);
    const linkedProject = staged.guestProject
        ? await createProject({
              name: staged.guestProject.name,
              type: staged.guestProject.type,
              aspectRatio: staged.guestProject.aspectRatio,
              sourceType: staged.guestProject.sourceType,
              description: staged.guestProject.description,
              stylePresetId: staged.guestProject.stylePresetId,
              styleProfileJson: staged.guestProject.styleProfileJson,
          })
        : undefined;
    const id = useCanvasStore.getState().importProject({ ...project, projectId: linkedProject?.project.id });
    if (staged.onboarding) saveOnboardingProgress(id, staged.onboarding);
    await handoffs.removeItem(token);
    try {
        await saveRemoteUserDataNow(id);
        return { id, syncError: undefined };
    } catch (syncError) {
        return { id, syncError };
    }
}
