import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { History, RefreshCw } from "lucide-react";

import { WorkspaceState } from "@/components/layout/workspace-state";
import type { GenerationTask } from "@/services/api/task-center";
import { TaskListItem } from "./canvas-workspace-task-list-item";

// 历史面板：展示项目最近任务（含云端 Agent 根任务与步骤任务），与任务面板互不依赖。
export function CanvasWorkspaceHistoryPanel({ tasks, refreshing, onRefresh, onCancelTask }: { tasks: GenerationTask[]; refreshing?: boolean; onRefresh?: () => void; onCancelTask?: (task: GenerationTask) => void }) {
    return (
        <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2">
                <History className="size-3.5 shrink-0" />
                <span className="truncate text-xs font-semibold">{t("adminUserOverview.taskHistory")}</span>
                <span className="tabular-nums text-foreground/32">{tasks.length.toLocaleString(undefined)}</span>
                <span className="ml-auto">
                    <button type="button" className="icon-btn tip-down" data-tip={t("pluginsPage.eagle.refresh")} aria-label={t("pluginsPage.eagle.refresh")} onClick={onRefresh}>
                        <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                </span>
            </header>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                {tasks.length ? (
                    <div className="space-y-0.5">
                        {tasks.map((task) => (
                            <TaskListItem key={task.id} task={task} onCancelTask={onCancelTask} />
                        ))}
                    </div>
                ) : (
                    <WorkspaceState icon="canvas" compact title={t("canvasExtra.localAgent.noHistory")} description={t("canvasRuntime.activeTasks.title")} />
                )}
            </div>
        </>
    );
}
