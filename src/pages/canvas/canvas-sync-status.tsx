import { formatFullTime } from "@/lib/display-format";
import { App, Button, Dropdown, Popover } from "antd";
import { CloudCheck, CloudOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { readAllCanvasSyncDrafts, readCanvasSyncDrafts, type CanvasSyncDraft } from "@/services/canvas-sync-drafts";
import { getActiveUserScope } from "@/lib/user-scope";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useSyncProgressStore } from "@/stores/use-sync-progress-store";
import { useI18n } from "@/i18n/use-i18n";
import { CANVAS_RESOURCES_MISSING, isCanvasResourcesMissing, repairMissingResourcesAndSave } from "@/services/user-data-sync";

export function CanvasSyncStatus({ projectId, onLoadLatest, onOpenVersions }: { projectId: string; onLoadLatest: () => Promise<void>; onOpenVersions?: () => void }) {
    const { message } = App.useApp();
    const { t } = useI18n();
    const progress = useSyncProgressStore((state) => state.syncingProjects[projectId]);
    const [busy, setBusy] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const phase = progress?.phase;
    const conflict = phase === "conflict";
    const failed = phase === "error" || conflict || !phase;
    const saving = phase === "pending" || phase === "saving" || phase === "uploading";
    const label = conflict ? t("canvasExtra.cloudSync.statusConflict") : !phase ? t("canvasExtra.cloudSync.statusNever") : failed ? t("canvasExtra.cloudSync.statusFailed") : saving ? t("canvasExtra.cloudSync.statusSaving") : t("canvasExtra.cloudSync.statusSaved");
    const run = async (operation: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await operation();
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("canvasExtra.cloudSync.opFailed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Popover
                trigger="click"
                placement="bottom"
                open={statusOpen}
                onOpenChange={setStatusOpen}
                content={
                    <div className="max-w-80 space-y-3" data-canvas-no-zoom>
                        <p role="status" className="text-sm">
                            {progress?.message || (phase === "done" ? t("canvasExtra.cloudSync.synced") : t("canvasExtra.cloudSync.unconfirmed"))}
                        </p>
                        {conflict ? <p className="text-xs text-muted-foreground">{t("canvasExtra.cloudSync.conflictNote")}</p> : null}
                        <div className="flex flex-wrap gap-2">
                            {progress?.reason === CANVAS_RESOURCES_MISSING ? (
                                <Button
                                    size="small"
                                    type="primary"
                                    loading={busy}
                                    onClick={() =>
                                        void run(async () => {
                                            try {
                                                const result = await repairMissingResourcesAndSave(projectId);
                                                message.success(result.clearedPreviews > 0 ? t("canvasExtra.cloudSync.repairDone", { count: result.clearedPreviews }) : t("canvasExtra.cloudSync.repairSaved"));
                                            } catch (error) {
                                                // Original media is still missing: repair only drops derived previews.
                                                if (isCanvasResourcesMissing(error)) throw new Error(t("canvasExtra.cloudSync.repairStillMissing"));
                                                throw error;
                                            }
                                        })
                                    }
                                >
                                    {t("canvasExtra.cloudSync.repairAndSave")}
                                </Button>
                            ) : null}
                            <Button size="small" loading={busy} onClick={() => void run(onLoadLatest)}>
                                {t("canvasExtra.cloudSync.loadLatest")}
                            </Button>
                            <Button
                                size="small"
                                disabled={busy}
                                onClick={() =>
                                    void run(async () => {
                                        const project = useCanvasStore.getState().openProject(projectId);
                                        if (project) await exportCanvasProjects([project], `${project.title}-${t("canvasExtra.versions.localDraft")}`);
                                    })
                                }
                            >
                                {t("canvasExtra.cloudSync.downloadCurrent")}
                            </Button>
                            {onOpenVersions ? (
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setStatusOpen(false);
                                        onOpenVersions();
                                    }}
                                >
                                    {t("canvasExtra.cloudSync.versionsButton")}{progress?.draftCount ? t("canvasExtra.cloudSync.draftsSuffix", { count: progress.draftCount }) : ""}
                                </Button>
                            ) : null}
                        </div>
                    </div>
                }
            >
                <Button
                    type="text"
                    size="small"
                    danger={failed}
                    aria-label={t("canvasExtra.cloudSync.statusAria", { label })}
                    icon={saving ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" /> : failed ? <CloudOff className="size-3.5" /> : <CloudCheck className="size-3.5" />}
                >
                    <span className="canvas-sync-status-label text-xs">{label}</span>
                </Button>
            </Popover>
        </>
    );
}

export function CanvasSyncDraftMenu({ projectId, className }: { projectId?: string; className?: string }) {
    const { message } = App.useApp();
    const { t, locale } = useI18n();
    const [drafts, setDrafts] = useState<CanvasSyncDraft[]>([]);
    const [draftScope, setDraftScope] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    return (
        <Dropdown
            trigger={["click"]}
            onOpenChange={(open) => {
                if (!open) return;
                const scope = getActiveUserScope();
                setDraftScope(scope);
                setDrafts([]);
                setLoading(true);
                void (projectId ? readCanvasSyncDrafts(projectId, scope) : readAllCanvasSyncDrafts(scope))
                    .then((items) => {
                        if (getActiveUserScope() === scope) setDrafts(items.reverse());
                    })
                    .catch(() => message.error(t("canvasExtra.cloudSync.draftReadFailed")))
                    .finally(() => setLoading(false));
            }}
            menu={{
                items: drafts.length
                    ? drafts.map((draft) => ({
                          key: draft.id,
                          label: `${draft.project.title} · ${formatFullTime(draft.savedAt, locale)}`,
                          onClick: () => {
                              if (getActiveUserScope() !== draftScope) {
                                  setDrafts([]);
                                  message.error(t("canvasExtra.cloudSync.draftAccountSwitched"));
                                  return;
                              }
                              setExporting(true);
                              void exportCanvasProjects([draft.project], `${draft.project.title}-${t("canvasExtra.versions.localDraft")}`, { includeLocalDrawings: false })
                                  .then(() => message.success(t("canvasExtra.cloudSync.draftDownloaded")))
                                  .catch(() => message.error(t("canvasExtra.cloudSync.draftDownloadFailed")))
                                  .finally(() => setExporting(false));
                          },
                      }))
                    : [{ key: "empty", label: loading ? t("canvasExtra.cloudSync.draftsLoading") : t("canvasExtra.versions.emptyDrafts"), disabled: true }],
            }}
        >
            <Button className={className} size={projectId ? "small" : "middle"} loading={exporting}>
                {t("canvasExtra.versions.draftsTab")}
            </Button>
        </Dropdown>
    );
}
