import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { Link } from "react-router";
import { CanvasWorkspaceAssetPanel } from "./canvas-workspace-asset-panel";
import { CanvasWorkspaceHistoryPanel } from "./canvas-workspace-history-panel";
import type { InsertAssetPayload } from "./asset-picker-modal";
import { useDeferredValue, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Button, Grid } from "antd";
import { Home, PanelLeftClose, PanelLeftOpen, Layers3, Images, ListChecks, History, X } from "lucide-react";
import { AppDrawer } from "@/components/ui/product/app-drawer";
import { searchCanvasNodes } from "@/lib/canvas/canvas-node-search";
import { useEffectiveConfig } from "@/stores/use-config-store";
import { canvasDockStyle } from "@/lib/canvas/canvas-aceternity-style";
import { canvasThemes } from "@/lib/canvas-theme";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import type { CanvasNodeData } from "@/types/canvas";
import type { GenerationTask } from "@/services/api/task-center";
import { useCanvasWorkspaceTasks } from "@/pages/canvas/use-canvas-workspace-tasks";
import { CanvasWorkspaceNodeListPanel } from "./canvas-workspace-node-list-panel";
import { CanvasWorkspaceTaskPanel } from "./canvas-workspace-task-panel";
import "./canvas-workspace-panel.css";

export function CanvasWorkspacePanel({
    projectId,
    nodes,
    selectedNodeIds,
    onClose,
    open,
    onOpen,
    onInsertAssets,
    onFocus,
    onAssets,
    onProjectAssets,
    onCancelTask,
}: {
    projectId: string;
    nodes: CanvasNodeData[];
    selectedNodeIds: Set<string>;
    onClose: () => void;
    open: boolean;
    onOpen: () => void;
    onInsertAssets: (payloads: InsertAssetPayload[]) => Promise<unknown>;
    onFocus: (id: string) => void;
    onAssets: () => void;
    onProjectAssets?: () => void;
    onCancelTask: (task: GenerationTask) => void;
}) {
    const [railCollapsed, setRailCollapsed] = useState(true);
    const compact = railCollapsed && !open;
    const railLabel = t(compact ? "nav.expand" : "nav.collapse");
    const [tab, setTab] = useState("nodes");
    const theme = canvasThemes[useActiveTheme()];
    const [query, setQuery] = useState("");
    const history = tab === "history";
    const deferredQuery = useDeferredValue(query);
    const config = useEffectiveConfig();
    const screens = Grid.useBreakpoint();
    const markPointer = (event: PointerEvent<HTMLElement>) => {
        event.currentTarget.dataset.inputModality = "pointer";
    };
    const markKeyboard = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Tab" || event.key === "Enter" || event.key === " ") event.currentTarget.dataset.inputModality = "keyboard";
    };
    const tasks = useCanvasWorkspaceTasks(projectId, open && (tab === "tasks" || history));
    const content = (
        <div
            className="canvas-workspace-panel relative flex h-full min-h-0 flex-col text-foreground"
            style={{ "--canvas-workspace-base": theme.node.panel } as CSSProperties}
            data-canvas-no-zoom
            data-canvas-wheel-scroll
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <button className="canvas-workspace-close" type="button" aria-label={t("common.close")} onClick={onClose}>
                <X className="size-4" />
            </button>
            {tab === "nodes" && (
                <CanvasWorkspaceNodeListPanel
                    nodes={nodes}
                    config={config}
                    results={searchCanvasNodes(nodes, deferredQuery, nodes.length)}
                    query={query}
                    deferredQuery={deferredQuery}
                    selectedNodeIds={selectedNodeIds}
                    onQueryChange={setQuery}
                    onFocus={onFocus}
                />
            )}
            {tab === "assets" && <CanvasWorkspaceAssetPanel onInsert={onInsertAssets} onManage={onAssets} onProjectAssets={onProjectAssets} />}
            {(tab === "tasks" || history) && (
                <>
                    {tasks.error ? (
                        <div role="alert" className="p-4">
                            {t("canvasDialog.panorama.loadFailed")}
                            <Button onClick={() => void tasks.refetch()}>{t("pluginsPage.eagle.retry")}</Button>
                        </div>
                    ) : tasks.loading ? (
                        <p className="p-4">{t("common.loading")}</p>
                    ) : history ? (
                        <CanvasWorkspaceHistoryPanel tasks={tasks.allTasks} refreshing={tasks.refreshing} onRefresh={() => void tasks.refetch()} onCancelTask={onCancelTask} />
                    ) : (
                        <CanvasWorkspaceTaskPanel
                            tasks={history ? tasks.allTasks : tasks.tasks.filter((t) => t.status === "queued" || t.status === "running")}
                            refreshing={tasks.refreshing}
                            onRefresh={() => void tasks.refetch()}
                            onCancelTask={onCancelTask}
                        />
                    )}
                </>
            )}
        </div>
    );
    const entries = [
        { id: "nodes", label: t("canvasContextMenu.nodes"), icon: Layers3 },
        { id: "assets", label: t("pluginsPage.surfaceAssetSource"), icon: Images },
        { id: "tasks", label: t("diagnostics.tasks"), icon: ListChecks },
        { id: "history", label: t("productionAssets.historical"), icon: History },
    ];
    return (
        <>
            <div className={`canvas-workspace-shell ${compact ? "is-compact" : ""} ${open && screens.lg ? "is-expanded" : ""}`} style={{ ...canvasDockStyle(theme), "--canvas-workspace-base": theme.node.panel, background: undefined } as CSSProperties}>
                <nav className="canvas-workspace-rail" aria-label={t("upstreamSix.canvas")} data-canvas-no-zoom onWheel={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                    <Link to="/" className="canvas-workspace-rail-button" aria-label={t("canvasTopBar.home")} title={t("common.backMain")}>
                        <Home />
                        <span>{t("canvasTopBar.home")}</span>
                    </Link>
                    <span className="canvas-workspace-rail-divider" aria-hidden />
                    <div className="canvas-workspace-rail-items">
                        {entries.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                className="canvas-workspace-rail-button"
                                title={label}
                                aria-pressed={open && tab === id}
                                onPointerDown={markPointer}
                                onKeyDown={markKeyboard}
                                onClick={() => {
                                    if (open && tab === id) onClose();
                                    else {
                                        setTab(id);
                                        onOpen();
                                    }
                                }}
                            >
                                <Icon />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                    <span className="canvas-workspace-rail-divider is-end" aria-hidden />
                    <button
                        className="canvas-workspace-rail-button canvas-workspace-rail-toggle"
                        type="button"
                        onClick={() => {
                            setRailCollapsed(!compact);
                            if (open) onClose();
                        }}
                        onPointerDown={markPointer}
                        onKeyDown={markKeyboard}
                        aria-expanded={!compact}
                        aria-label={railLabel}
                        title={railLabel}
                    >
                        {compact ? <PanelLeftOpen /> : <PanelLeftClose />}
                        <span>{t("canvasCloudAgent.collapse")}</span>
                    </button>
                </nav>
                {open && screens.lg ? (
                    <aside className="w-80 shrink-0 min-h-0" aria-label={t("upstreamSix.canvas")}>
                        {content}
                    </aside>
                ) : null}
            </div>
            {open && !screens.lg ? (
                <AppDrawer flush open placement="left" title={null} closable={false} size={320} onClose={onClose}>
                    {content}
                </AppDrawer>
            ) : null}
        </>
    );
}
