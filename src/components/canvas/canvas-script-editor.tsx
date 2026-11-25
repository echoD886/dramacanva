import { upstreamText } from "@/i18n/ddcat-updates";
import { Button, Dropdown, Input, InputNumber, Popconfirm, Popover, Segmented, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clapperboard, Columns3, Copy, Expand, Film, Image as ImageIcon, LockKeyhole, MessageSquare, Minimize2, MoreHorizontal, Pencil, Plus, Search, Square, Trash2, X } from "lucide-react";
import { useEffect, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { useReviewLocale } from "@/i18n/drama-messages";
import { flushCanvasTextEdits } from "@/services/canvas-text-edits";

import { Checkbox, CheckboxGroup } from "@/components/ui/base/checkbox";
import { Select } from "@/components/ui/base/select";
import { AppModal } from "@/components/ui/product/app-modal";
import { createStoryboardRow } from "@/lib/canvas/canvas-project-domain";
import type { CanvasConnection, CanvasGenerationBatch, CanvasNodeData, StoryboardColumn, StoryboardRow, StoryboardVideoInputMode } from "@/types/canvas";
import { AssetThumbnail, ROLE_LABELS } from "./storyboard-assets-cell";
import { generationBatchSummary, StoryboardTextInput } from "./canvas-script-node";
import { STORYBOARD_COLUMN_OPTIONS as SOURCE_COLUMNS, STORYBOARD_READING_COLUMNS, storyboardGenerationTargets, storyboardReadingColumns } from "./canvas-script-editor-model";
import { StoryboardShotProduction } from "./canvas-script-editor-production";
import "./canvas-script-editor.css";

const EMPTY_ROWS: StoryboardRow[] = [];
const EMPTY_CONNECTIONS: CanvasConnection[] = [];
type DetailTab = "story" | "prompts" | "production";
type TextField = Exclude<StoryboardColumn, "shotNumber" | "durationSeconds" | "assets" | "shotSize">;
const ADVANCED_FIELDS: TextField[] = ["narrativeIntent", "viewerPOV", "performanceBlocking", "emotion", "lightingAndAtmosphere", "timeBeats", "continuityOut"];

/** 连续读稿与单镜编辑工作区；消费工作台表面、文字及选中态 token。 */
export function CanvasScriptEditor({
    node,
    nodes,
    connections = EMPTY_CONNECTIONS,
    batch,
    open,
    onClose: closeEditor,
    onUpdateRows,
    onEditAssets,
    onVisibleColumnsChange,
    onGenerateImages,
    onGenerateVideos,
    onVideoInputModeChange,
    onFocusOutput,
    onRetryBatchItem,
    onStopBatch,
    onDiscuss,
}: {
    node: CanvasNodeData | null;
    nodes: CanvasNodeData[];
    connections?: CanvasConnection[];
    batch?: CanvasGenerationBatch;
    open: boolean;
    onClose: () => void;
    onUpdateRows: (rows: StoryboardRow[]) => void;
    onEditAssets: (rowId: string) => void;
    onVisibleColumnsChange: (columns: StoryboardColumn[]) => void;
    onGenerateImages: (rowIds: string[]) => void;
    onGenerateVideos: (rowIds: string[]) => void;
    onVideoInputModeChange: (mode: StoryboardVideoInputMode) => void;
    onFocusOutput: (nodeId: string) => void;
    onRetryBatchItem?: (batchId: string, itemId: string) => void;
    onStopBatch?: (batchId: string) => void;
    onDiscuss: (request: { text: string; displayText: string }) => void;
}) {
    const { t } = useI18n();
    useReviewLocale();
    const onClose = () => {
        flushCanvasTextEdits();
        closeEditor();
    };
    const STORYBOARD_COLUMN_OPTIONS = SOURCE_COLUMNS.map((option) => ({ ...option, label: t(`scriptEditor.${option.value}` as MessageKey) }));
    const STORYBOARD_ASSET_ROLE_LABELS = Object.fromEntries(Object.entries(ROLE_LABELS).map(([key, value]) => [key, t(value)]));
    const [query, setQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [onlySelected, setOnlySelected] = useState(false);
    const [fullscreen, setFullscreen] = useState(true);
    const [activeId, setActiveId] = useState<string>();
    const [detailTab, setDetailTab] = useState<DetailTab>("story");
    const [mobileDetail, setMobileDetail] = useState(false);
    const [focusField, setFocusField] = useState<StoryboardColumn>();
    const [columnsOpen, setColumnsOpen] = useState(false);
    const [rowMenuOpen, setRowMenuOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [tableHeight, setTableHeight] = useState(400);
    const [areaWidth, setAreaWidth] = useState(900);
    const [tableArea, setTableArea] = useState<HTMLDivElement | null>(null);
    const detailRef = useRef<HTMLElement>(null);
    const previousScriptId = useRef<string>(undefined);
    const rows = node?.metadata?.storyboard?.rows || EMPTY_ROWS;
    const latestRows = useRef({ rows, onUpdateRows });
    useInsertionEffect(() => {
        latestRows.current = { rows, onUpdateRows };
    });
    const readOnly = Boolean(node?.metadata?.locked);
    const busy = node?.metadata?.status === "loading";
    const writeDisabled = readOnly || busy;
    const activeRow = rows.find((row) => row.id === activeId) || rows[0];
    const activeIndex = activeRow ? rows.indexOf(activeRow) : -1;
    const visibleColumns = storyboardReadingColumns(node?.metadata?.storyboard?.visibleColumns);
    const videoInputMode = node?.metadata?.storyboardVideoInputMode || "direct";
    const nodeById = useMemo(() => new Map(nodes.map((item) => [item.id, item])), [nodes]);
    const keywordRows = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return rows;
        return rows.filter((row) =>
            [
                String(row.shotNumber),
                ...STORYBOARD_COLUMN_OPTIONS.filter((option) => option.value !== "assets").map((option) => String(row[option.value as Exclude<StoryboardColumn, "assets">] || "")),
                ...row.characters.map((character) => character.characterName),
                ...(row.assetBindings || []).map((binding) => nodeById.get(binding.nodeId)?.title || ""),
            ].some((value) => value.toLowerCase().includes(keyword)),
        );
    }, [nodeById, query, rows]);
    const filteredRows = onlySelected ? keywordRows.filter((row) => selectedIds.includes(row.id)) : keywordRows;
    const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
    const hiddenSelected = selectedRows.filter((row) => !keywordRows.includes(row)).length;
    const targets = node ? storyboardGenerationTargets(node, selectedRows, nodes) : { imageIds: [], videoIds: [], uncertainImageIds: [], uncertainVideoIds: [], missingKeyframeCount: 0 };
    const compact = areaWidth < 680;
    const completedVideos = rows.filter((row) => row.videoNodeId && (nodeById.get(row.videoNodeId)?.metadata?.content || nodeById.get(row.videoNodeId)?.metadata?.storageKey)).length;
    const canStop = batch?.items.some((item) => item.status === "waiting" || item.status === "submitting");

    useEffect(() => {
        if (!open || !node) return;
        if (previousScriptId.current !== node.id) {
            previousScriptId.current = node.id;
            setQuery("");
            setSelectedIds([]);
            setOnlySelected(false);
            setActiveId(undefined);
            setDetailTab("story");
            setMobileDetail(false);
        }
        setFullscreen(true);
        setColumnsOpen(false);
        setRowMenuOpen(false);
        setDeleteOpen(false);
    }, [open, node?.id]);
    useEffect(() => {
        if (!open || !node) return;
        setSelectedIds((current) => current.filter((id) => rows.some((row) => row.id === id)));
    }, [open, rows, node?.id]);
    useEffect(() => {
        if (selectedIds.length === 0) setOnlySelected(false);
    }, [selectedIds.length]);
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || !(event.target instanceof Element)) return;
            if (!event.target.closest(".canvas-script-editor-root, .canvas-script-editor-columns-popover, .canvas-script-editor-row-menu, .canvas-script-editor-delete-popover")) return;
            if (event.target.closest('[role="combobox"][aria-expanded="true"]')) return;
            // 资产预览、菜单与确认浮层先处理自己的 Esc。
            if (!columnsOpen && !rowMenuOpen && !deleteOpen && !fullscreen) return;
            event.preventDefault();
            event.stopPropagation();
            if (deleteOpen) setDeleteOpen(false);
            else if (rowMenuOpen) setRowMenuOpen(false);
            else if (columnsOpen) setColumnsOpen(false);
            else setFullscreen(false);
        };
        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [columnsOpen, rowMenuOpen, deleteOpen, fullscreen, open]);
    useLayoutEffect(() => {
        if (!open || !tableArea) return;
        const measure = () => {
            if (tableArea.clientHeight) setTableHeight(Math.max(120, tableArea.clientHeight - 44));
            if (tableArea.clientWidth) setAreaWidth(tableArea.clientWidth);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(tableArea);
        return () => observer.disconnect();
    }, [open, tableArea]);
    useLayoutEffect(() => {
        if (!focusField || !open) return;
        const field = detailRef.current?.querySelector<HTMLElement>(`[data-editor-field="${focusField}"]`);
        const disclosure = field?.closest("details");
        if (disclosure) disclosure.open = true;
        field?.querySelector<HTMLElement>("textarea, input, button")?.focus();
    }, [focusField, activeRow?.id, detailTab, open]);
    useEffect(() => {
        if (!open || !activeRow) return;
        const rowElement = [...(tableArea?.querySelectorAll<HTMLElement>("[data-storyboard-row-id]") || [])].find((element) => element.dataset.storyboardRowId === activeRow.id);
        rowElement?.scrollIntoView?.({ block: "nearest" });
    }, [activeRow?.id, open, tableArea]);

    const selectRow = (row: StoryboardRow, field?: StoryboardColumn) => {
        flushCanvasTextEdits();
        setActiveId(row.id);
        setMobileDetail(true);
        setFocusField(field);
        setRowMenuOpen(false);
        setDeleteOpen(false);
        if (field) setDetailTab(field === "assets" ? "production" : field.endsWith("Prompt") ? "prompts" : "story");
    };
    const updateRow = (patch: Partial<StoryboardRow>, rowId = activeRow?.id) => {
        if (!activeRow || writeDisabled) return;
        const current = latestRows.current;
        const next = current.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row));
        latestRows.current = { ...current, rows: next };
        current.onUpdateRows(next);
    };
    const insertRow = (copy?: StoryboardRow) => {
        if (writeDisabled) return;
        const index = copy ? rows.indexOf(copy) + 1 : activeRow ? activeIndex + 1 : rows.length;
        const next = [...rows];
        const newRow = createStoryboardRow(index + 1);
        // 复制内容时保留资产配置，但产物、预演和任务身份属于原镜头。
        if (copy) Object.assign(newRow, copy, { id: newRow.id, imageNodeId: undefined, videoNodeId: undefined, previsSceneId: undefined, previsSnapshotUrl: undefined, status: "idle", errorDetails: undefined });
        next.splice(index, 0, newRow);
        onUpdateRows(next.map((row, index) => ({ ...row, shotNumber: index + 1 })));
        selectRow(newRow, "plotDescription");
        setQuery("");
        setOnlySelected(false);
    };
    const moveRow = (direction: -1 | 1) => {
        if (writeDisabled || activeIndex < 0 || !rows[activeIndex + direction]) return;
        const next = [...rows];
        [next[activeIndex], next[activeIndex + direction]] = [next[activeIndex + direction], next[activeIndex]];
        onUpdateRows(next.map((row, index) => ({ ...row, shotNumber: index + 1 })));
    };
    const removeRow = () => {
        if (!activeRow || writeDisabled) return;
        const next = rows.filter((row) => row.id !== activeRow.id);
        setActiveId(next[Math.min(activeIndex, next.length - 1)]?.id);
        onUpdateRows(next.map((row, index) => ({ ...row, shotNumber: index + 1 })));
    };
    const discussRow = () => {
        if (!node || !activeRow || writeDisabled) return;
        setActiveId(activeRow.id);
        onClose();
        onDiscuss({
            text: upstreamText("请优化当前分镜脚本中的这个镜头。节点ID：{0}；镜头行ID：{1}。先读取最新分镜，再根据我的要求提出或执行修改。", [node.id, activeRow.id]),
            displayText: upstreamText("讨论镜头 {0}", [activeRow.shotNumber]),
        });
    };
    const toggleSelected = (rowId: string) => setSelectedIds((current) => (current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId]));
    const textField = (field: TextField, minRows = 2) => (
        <label className="canvas-script-editor-field" data-editor-field={field} key={field}>
            <span>{STORYBOARD_COLUMN_OPTIONS.find((option) => option.value === field)?.label}</span>
            <StoryboardTextInput
                key={`${node?.id}:${activeRow?.id}:${field}`}
                ariaLabel={upstreamText("镜头 {0} {1}", [activeRow?.shotNumber, STORYBOARD_COLUMN_OPTIONS.find((option) => option.value === field)?.label])}
                value={activeRow?.[field] || ""}
                placeholder=""
                draftIdentity={node && activeRow ? { nodeId: node.id, rowId: activeRow.id, field } : undefined}
                disabled={writeDisabled}
                onChange={(value) => updateRow({ [field]: value }, activeRow?.id)}
            />
        </label>
    );
    const assetSummary = (row: StoryboardRow) => (
        <span className="canvas-script-editor-asset-summary">
            {(row.assetBindings || []).slice(0, 3).map((binding) => (
                <span key={binding.nodeId} title={STORYBOARD_ASSET_ROLE_LABELS[binding.role]} data-role={binding.role}>
                    {nodeById.get(binding.nodeId)?.title || upstreamText("资产失效")}
                </span>
            ))}
            {row.assetBindings?.length > 3 ? <small>+{row.assetBindings.length - 3}</small> : null}
            {!row.assetBindings?.length ? <small>{upstreamText("未关联资产")}</small> : null}
        </span>
    );
    const columnKeys = compact ? ["shotNumber", "plotDescription"] : ["shotNumber", ...visibleColumns.filter((key) => key !== "shotNumber")];
    const columns: ColumnsType<StoryboardRow> = columnKeys.map((key) => {
        const label = STORYBOARD_COLUMN_OPTIONS.find((option) => option.value === key)?.label || "";
        return {
            key,
            title: key === "plotDescription" && compact ? upstreamText("画面与台词") : label,
            dataIndex: key,
            width: key === "shotNumber" ? 88 : key === "durationSeconds" ? 72 : key === "assets" ? 156 : undefined,
            fixed: key === "shotNumber" ? "left" : undefined,
            render: (_: unknown, row: StoryboardRow) => {
                const field = key === "plotDescription" && !row.plotDescription && row.videoMotionPrompt ? "videoMotionPrompt" : key;
                const value = field === "assets" ? "" : String(row[field as Exclude<StoryboardColumn, "assets">] || "");
                return key === "shotNumber" ? (
                    <button className="canvas-script-editor-shot" aria-label={upstreamText("编辑镜头 {0}", [row.shotNumber])} onClick={() => selectRow(row, "plotDescription")}>
                        <span>
                            <strong>{String(row.shotNumber).padStart(2, "0")}</strong>
                            <Pencil size={12} />
                        </span>
                        <small>
                            {upstreamText("{0} 秒", [row.durationSeconds])}
                            {row.shotSize ? ` · ${upstreamText(row.shotSize)}` : ""}
                        </small>
                        <small>
                            {row.videoNodeId && nodeById.get(row.videoNodeId)?.metadata?.status === "loading"
                                ? upstreamText("视频生成中")
                                : row.videoNodeId && nodeById.get(row.videoNodeId)?.metadata?.status === "error"
                                  ? upstreamText("视频失败")
                                  : row.videoNodeId && nodeById.get(row.videoNodeId)?.metadata?.content
                                    ? upstreamText("已有视频")
                                    : row.imageNodeId && nodeById.get(row.imageNodeId)?.metadata?.content
                                      ? upstreamText("已有分镜图")
                                      : upstreamText("待制作")}
                        </small>
                    </button>
                ) : key === "assets" ? (
                    <button className="canvas-script-editor-cell-button" aria-label={upstreamText("核对镜头 {0} 资产", [row.shotNumber])} onClick={() => selectRow(row, "assets")}>
                        {row.imageNodeId && nodeById.has(row.imageNodeId) ? (
                            <span className="canvas-script-editor-frame">
                                <AssetThumbnail node={nodeById.get(row.imageNodeId)!} />
                            </span>
                        ) : null}
                        {assetSummary(row)}
                    </button>
                ) : (
                    <button className="canvas-script-editor-cell-button" aria-label={upstreamText("编辑镜头 {0} {1}", [row.shotNumber, label])} onClick={() => selectRow(row, field as StoryboardColumn)}>
                        <span className={`canvas-script-editor-cell-copy ${value ? "" : "is-empty"}`}>{value || (key === "plotDescription" ? upstreamText("待补充画面描述") : "—")}</span>
                        {field !== key ? <small className="canvas-script-editor-cell-audio">{upstreamText("视频提示词摘要")}</small> : null}
                        {key === "plotDescription" && compact ? (
                            <>
                                <span className="canvas-script-editor-cell-dialogue">{row.dialogue || upstreamText("无台词")}</span>
                                {assetSummary(row)}
                            </>
                        ) : null}
                        {key === "dialogue" && row.audioEffects ? (
                            <small className="canvas-script-editor-cell-audio">
                                {upstreamText("声音 ·")}
                                {row.audioEffects}
                            </small>
                        ) : null}
                    </button>
                );
            },
        };
    });
    const readingLayout = columnKeys.length === STORYBOARD_READING_COLUMNS.length && STORYBOARD_READING_COLUMNS.every((column) => columnKeys.includes(column));
    const tableWidth = compact || readingLayout ? undefined : columns.reduce((total, column) => total + Number(column.width || 240), 40);

    return (
        <AppModal
            flush
            aria-labelledby="canvas-script-editor-heading"
            open={open}
            onCancel={() => {
                flushCanvasTextEdits();
                onClose();
            }}
            footer={null}
            closable={false}
            keyboard={!fullscreen}
            width={fullscreen ? "100vw" : "min(1480px, calc(100vw - 32px))"}
            centered={!fullscreen}
            className={`canvas-script-editor-modal ${fullscreen ? "is-fullscreen" : ""}`}
            rootClassName="canvas-script-editor-root"
            styles={{ wrapper: { overflow: "hidden" } }}
        >
            <div className="canvas-script-editor" data-fullscreen={fullscreen} data-mobile-detail={mobileDetail} data-canvas-no-zoom data-canvas-wheel-scroll>
                <header className="canvas-script-editor-header">
                    <div className="canvas-script-editor-title">
                        <Clapperboard size={20} />
                        <div>
                            <h2 id="canvas-script-editor-heading">{node?.title || upstreamText("分镜脚本")}</h2>
                            <p>
                                {upstreamText("{0} 个镜头 · {1} 秒", [rows.length, rows.reduce((total, row) => total + (row.durationSeconds || 0), 0)])}
                                {completedVideos ? upstreamText(" · 已有视频 {0}/{1}", [completedVideos, rows.length]) : ""}
                            </p>
                        </div>
                    </div>
                    <div className="canvas-script-editor-window-actions">
                        {readOnly ? (
                            <span className="canvas-script-editor-readonly">
                                <LockKeyhole size={14} />
                                {upstreamText("已锁定")}
                            </span>
                        ) : null}
                        <Button
                            type="text"
                            icon={fullscreen ? <Minimize2 size={16} /> : <Expand size={16} />}
                            aria-label={fullscreen ? upstreamText("退出全屏") : upstreamText("全屏查看")}
                            title={fullscreen ? upstreamText("退出全屏") : upstreamText("全屏查看")}
                            onClick={() => setFullscreen(!fullscreen)}
                        />
                        <Button type="text" icon={<X size={18} />} aria-label={upstreamText("关闭分镜表格")} onClick={onClose} />
                    </div>
                </header>
                <div className="canvas-script-editor-workspace">
                    <section className="canvas-script-editor-overview" aria-label={upstreamText("连续分镜表")}>
                        <div className="canvas-script-editor-toolbar">
                            <Input
                                className="canvas-script-editor-search"
                                prefix={<Search size={15} />}
                                allowClear
                                placeholder={upstreamText("搜索画面、台词、资产")}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                aria-label={upstreamText("筛选分镜")}
                            />
                            <Popover
                                trigger="click"
                                placement="bottomLeft"
                                classNames={{ root: "canvas-script-editor-columns-popover" }}
                                open={columnsOpen}
                                onOpenChange={setColumnsOpen}
                                content={
                                    <div className="canvas-script-editor-columns">
                                        <strong>{upstreamText("阅读时显示的列")}</strong>
                                        <span>{upstreamText("镜号、时长与景别始终可见；完整内容在右侧编辑。")}</span>
                                        <CheckboxGroup
                                            className="script-column-picker"
                                            options={STORYBOARD_COLUMN_OPTIONS.filter((option) => option.value !== "shotNumber")}
                                            value={visibleColumns.filter((value) => value !== "shotNumber")}
                                            onChange={(values) => onVisibleColumnsChange(["shotNumber", ...values])}
                                        />
                                        <Button size="small" onClick={() => onVisibleColumnsChange(STORYBOARD_READING_COLUMNS)}>
                                            {upstreamText("恢复阅读列")}
                                        </Button>
                                    </div>
                                }
                            >
                                <Button className="canvas-script-editor-columns-trigger" type="text" icon={<Columns3 size={16} />} aria-expanded={columnsOpen}>
                                    {upstreamText("显示列")}
                                </Button>
                            </Popover>
                            <Button icon={<Plus size={16} />} onClick={() => insertRow()} disabled={writeDisabled}>
                                {upstreamText("新增镜头")}
                            </Button>
                        </div>
                        <div className="canvas-script-editor-overview-meta">
                            <span>{query || onlySelected ? upstreamText("显示 {0}/{1} 个镜头", [filteredRows.length, rows.length]) : upstreamText("分镜顺序")}</span>
                            <span>{upstreamText("选择一镜，连续修改")}</span>
                        </div>
                        <div className="canvas-script-editor-table-area" ref={setTableArea}>
                            <Table<StoryboardRow>
                                className="canvas-script-editor-table"
                                rowKey="id"
                                size="middle"
                                pagination={false}
                                tableLayout="fixed"
                                scroll={{ x: tableWidth, y: tableHeight }}
                                dataSource={filteredRows}
                                columns={columns}
                                locale={{
                                    emptyText: (
                                        <div className="canvas-script-editor-empty">
                                            <strong>{rows.length ? upstreamText("没有符合条件的镜头") : upstreamText("从第一个镜头开始")}</strong>
                                            <span>{rows.length ? upstreamText("清除筛选，继续查看完整分镜。") : upstreamText("添加画面和台词，再为镜头配置资产。")}</span>
                                            <Button onClick={() => (rows.length ? (setQuery(""), setOnlySelected(false)) : insertRow())} disabled={!rows.length && writeDisabled}>
                                                {rows.length ? upstreamText("清除筛选") : upstreamText("新增镜头")}
                                            </Button>
                                        </div>
                                    ),
                                }}
                                rowClassName={(row) => `canvas-script-editor-row ${activeRow?.id === row.id ? "is-editing" : ""}`}
                                onRow={(row) => ({
                                    "data-storyboard-row-id": row.id,
                                    onClick: (event) => {
                                        if (!(event.target as HTMLElement).closest("button, input, label")) selectRow(row);
                                    },
                                })}
                                rowSelection={{
                                    columnWidth: 36,
                                    fixed: true,
                                    selectedRowKeys: selectedIds,
                                    columnTitle: (
                                        <Checkbox
                                            aria-label={upstreamText("批量选择当前列表")}
                                            disabled={writeDisabled || !filteredRows.length}
                                            checked={Boolean(filteredRows.length && filteredRows.every((row) => selectedIds.includes(row.id)))}
                                            indeterminate={filteredRows.some((row) => selectedIds.includes(row.id)) && !filteredRows.every((row) => selectedIds.includes(row.id))}
                                            onChange={(event) => setSelectedIds((current) => (event.target.checked ? [...new Set([...current, ...filteredRows.map((row) => row.id)])] : current.filter((id) => !filteredRows.some((row) => row.id === id))))}
                                        />
                                    ),
                                    renderCell: (_, row) => <Checkbox aria-label={upstreamText("批量选择镜头 {0}", [row.shotNumber])} checked={selectedIds.includes(row.id)} disabled={writeDisabled} onChange={() => toggleSelected(row.id)} />,
                                }}
                            />
                        </div>
                        {selectedRows.length ? (
                            <div className="canvas-script-editor-bulk" aria-label={upstreamText("批量制作")}>
                                <div className="canvas-script-editor-bulk-scope">
                                    <strong>{upstreamText("已选 {0} 镜", [selectedRows.length])}</strong>
                                    {hiddenSelected ? (
                                        <span>{upstreamText("其中 {0} 镜被筛选隐藏", [hiddenSelected])}</span>
                                    ) : (
                                        <span title={selectedRows.map((row) => upstreamText("镜头 {0}", [row.shotNumber])).join("、")}>
                                            {upstreamText("镜头")}{" "}
                                            {selectedRows
                                                .slice(0, 6)
                                                .map((row) => row.shotNumber)
                                                .join("、")}
                                            {selectedRows.length > 6 ? "…" : ""}
                                        </span>
                                    )}
                                    <Button
                                        size="small"
                                        type="text"
                                        aria-pressed={onlySelected}
                                        onClick={() => {
                                            setOnlySelected(!onlySelected);
                                            if (!onlySelected) setQuery("");
                                        }}
                                    >
                                        {upstreamText("仅看已选")}
                                    </Button>
                                    <Button size="small" type="text" onClick={() => setSelectedIds([])}>
                                        {upstreamText("取消选择")}
                                    </Button>
                                </div>
                                <div className="canvas-script-editor-bulk-actions">
                                    <Select
                                        ariaLabel={upstreamText("视频生成方式")}
                                        value={videoInputMode}
                                        disabled={writeDisabled}
                                        options={[
                                            { value: "direct", label: upstreamText("直接生成视频") },
                                            { value: "keyframe", label: upstreamText("用首帧生成视频") },
                                        ]}
                                        onChange={(mode) => {
                                            if (!writeDisabled) onVideoInputModeChange(mode);
                                        }}
                                    />
                                    <Button
                                        icon={<ImageIcon size={16} />}
                                        disabled={writeDisabled || !targets.imageIds.length}
                                        onClick={() => {
                                            if (!writeDisabled && targets.imageIds.length) onGenerateImages(targets.imageIds);
                                        }}
                                    >
                                        {upstreamText("生成{0}", [videoInputMode === "keyframe" ? upstreamText("首帧") : upstreamText("分镜图")])} {targets.imageIds.length}
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<Film size={16} />}
                                        disabled={writeDisabled || !targets.videoIds.length || targets.missingKeyframeCount > 0}
                                        onClick={() => {
                                            if (!writeDisabled && targets.videoIds.length && !targets.missingKeyframeCount) onGenerateVideos(targets.videoIds);
                                        }}
                                    >
                                        {upstreamText("生成视频")} {targets.videoIds.length}
                                    </Button>
                                </div>
                                <p>
                                    {targets.missingKeyframeCount
                                        ? upstreamText("{0} 镜缺少首帧，请先生成并在“画面与资产”中核对。", [targets.missingKeyframeCount])
                                        : targets.uncertainImageIds.length || targets.uncertainVideoIds.length
                                          ? upstreamText("费用待确认的任务已排除，请在对应镜头的“画面与资产”中核查后重试。")
                                          : upstreamText("仅生成有描述且尚无结果的镜头，已有结果和进行中的任务会跳过。")}
                                </p>
                            </div>
                        ) : null}
                    </section>
                    <aside ref={detailRef} className="canvas-script-editor-detail" aria-label={upstreamText("当前镜头工作区")}>
                        {activeRow && node ? (
                            <>
                                <div className="canvas-script-editor-detail-header">
                                    <Button className="canvas-script-editor-back" type="text" icon={<ArrowLeft size={16} />} onClick={() => setMobileDetail(false)}>
                                        {upstreamText("分镜表")}
                                    </Button>
                                    <div>
                                        <span>{upstreamText("当前镜头")}</span>
                                        <h3>
                                            {upstreamText("镜头 {0}", [String(activeRow.shotNumber).padStart(2, "0")])}
                                            <small>
                                                {activeIndex + 1} / {rows.length}
                                            </small>
                                        </h3>
                                    </div>
                                    <nav aria-label={upstreamText("连续切换镜头")}>
                                        <Button type="text" aria-label={upstreamText("上一镜")} title={upstreamText("上一镜")} icon={<ChevronLeft size={18} />} disabled={activeIndex <= 0} onClick={() => selectRow(rows[activeIndex - 1])} />
                                        <Button type="text" aria-label={upstreamText("下一镜")} title={upstreamText("下一镜")} icon={<ChevronRight size={18} />} disabled={activeIndex >= rows.length - 1} onClick={() => selectRow(rows[activeIndex + 1])} />
                                    </nav>
                                </div>
                                <Segmented<DetailTab>
                                    className="canvas-script-editor-tabs"
                                    block
                                    value={detailTab}
                                    options={[
                                        { value: "story", label: upstreamText("分镜内容") },
                                        { value: "prompts", label: upstreamText("生成提示") },
                                        { value: "production", label: upstreamText("画面与资产") },
                                    ]}
                                    onChange={(value) => {
                                        setDetailTab(value);
                                        setFocusField(undefined);
                                    }}
                                />
                                <div className="canvas-script-editor-detail-scroll">
                                    {!filteredRows.some((row) => row.id === activeRow.id) ? (
                                        <div className="canvas-script-editor-filter-notice">
                                            {upstreamText("当前镜头不在筛选结果中")}
                                            <Button
                                                type="text"
                                                size="small"
                                                onClick={() => {
                                                    setQuery("");
                                                    setOnlySelected(false);
                                                }}
                                            >
                                                {upstreamText("查看完整分镜")}
                                            </Button>
                                        </div>
                                    ) : null}
                                    {detailTab === "story" ? (
                                        <>
                                            <div className="canvas-script-editor-shot-settings">
                                                <label className="canvas-script-editor-field" data-editor-field="durationSeconds">
                                                    <span>{upstreamText("时长")}</span>
                                                    <InputNumber
                                                        min={1}
                                                        max={60}
                                                        suffix={upstreamText("秒")}
                                                        value={activeRow.durationSeconds}
                                                        aria-label={upstreamText("镜头 {0} 时长", [activeRow.shotNumber])}
                                                        disabled={writeDisabled}
                                                        onChange={(value) => {
                                                            if (value !== null) updateRow({ durationSeconds: Math.max(1, Math.min(60, value)) });
                                                        }}
                                                    />
                                                </label>
                                                <label className="canvas-script-editor-field" data-editor-field="shotSize">
                                                    <span>{upstreamText("景别")}</span>
                                                    <Select
                                                        ariaLabel={upstreamText("镜头 {0} 景别", [activeRow.shotNumber])}
                                                        value={activeRow.shotSize || undefined}
                                                        placeholder={upstreamText("选择景别")}
                                                        disabled={writeDisabled}
                                                        options={["特写", "近景", "中景", "全景", "远景"].map((value) => ({ value, label: upstreamText(value) }))}
                                                        onChange={(shotSize) => updateRow({ shotSize })}
                                                    />
                                                </label>
                                            </div>
                                            {textField("plotDescription", 4)}
                                            {textField("dialogue", 3)}
                                            <div className="canvas-script-editor-field-pair">
                                                {textField("camera")}
                                                {textField("motion")}
                                            </div>
                                            {textField("audioEffects")}
                                            <details className="canvas-script-editor-advanced">
                                                <summary>{upstreamText("表演、氛围与衔接")}</summary>
                                                {ADVANCED_FIELDS.map((field) => textField(field))}
                                            </details>
                                        </>
                                    ) : detailTab === "prompts" ? (
                                        <>
                                            <p className="canvas-script-editor-detail-note">{upstreamText("修改本镜头的生成提示。已有画面可在“画面与资产”中打开，进入画布微调。")}</p>
                                            {textField("videoMotionPrompt", 8)}
                                            {textField("imageGenerationPrompt", 5)}
                                            {textField("negativePrompt", 2)}
                                        </>
                                    ) : (
                                        <>
                                            <label className="canvas-script-editor-field">
                                                <span>{upstreamText("全片视频生成方式")}</span>
                                                <Select
                                                    ariaLabel={upstreamText("当前脚本视频生成方式")}
                                                    value={videoInputMode}
                                                    disabled={writeDisabled}
                                                    options={[
                                                        { value: "direct", label: upstreamText("直接生成视频") },
                                                        { value: "keyframe", label: upstreamText("用首帧生成视频") },
                                                    ]}
                                                    onChange={(mode) => {
                                                        if (!writeDisabled) onVideoInputModeChange(mode);
                                                    }}
                                                />
                                            </label>
                                            <StoryboardShotProduction
                                                script={node}
                                                row={activeRow}
                                                nodes={nodes}
                                                connections={connections}
                                                batch={batch}
                                                readOnly={writeDisabled}
                                                onEditAssets={() => {
                                                    if (!writeDisabled) onEditAssets(activeRow.id);
                                                }}
                                                onFocusOutput={onFocusOutput}
                                                onGenerateImages={() => {
                                                    if (!writeDisabled) onGenerateImages([activeRow.id]);
                                                }}
                                                onGenerateVideos={() => {
                                                    if (!writeDisabled) onGenerateVideos([activeRow.id]);
                                                }}
                                                onRetryBatchItem={onRetryBatchItem}
                                            />
                                        </>
                                    )}
                                </div>
                                <div className="canvas-script-editor-detail-footer">
                                    <Button type="text" icon={<MessageSquare size={16} />} disabled={writeDisabled} onClick={discussRow} aria-label={upstreamText("与助手讨论镜头 {0}", [activeRow.shotNumber])}>
                                        {upstreamText("与助手讨论")}
                                    </Button>
                                    <Dropdown
                                        trigger={["click"]}
                                        open={rowMenuOpen}
                                        onOpenChange={setRowMenuOpen}
                                        classNames={{ root: "canvas-script-editor-row-menu" }}
                                        menu={{
                                            onClick: () => setRowMenuOpen(false),
                                            items: [
                                                { key: "insert", label: upstreamText("在后面新增镜头"), icon: <Plus size={14} />, disabled: writeDisabled, onClick: () => insertRow() },
                                                { key: "copy", label: upstreamText("复制镜头内容"), icon: <Copy size={14} />, disabled: writeDisabled, onClick: () => insertRow(activeRow) },
                                                { key: "up", label: upstreamText("向前移动"), icon: <ArrowLeft size={14} />, disabled: writeDisabled || activeIndex <= 0, onClick: () => moveRow(-1) },
                                                { key: "down", label: upstreamText("向后移动"), icon: <ArrowRight size={14} />, disabled: writeDisabled || activeIndex >= rows.length - 1, onClick: () => moveRow(1) },
                                            ],
                                        }}
                                    >
                                        <Button type="text" icon={<MoreHorizontal size={16} />} aria-label={upstreamText("镜头操作")} />
                                    </Dropdown>
                                    <Popconfirm
                                        open={deleteOpen}
                                        onOpenChange={setDeleteOpen}
                                        classNames={{ root: "canvas-script-editor-delete-popover" }}
                                        title={upstreamText("删除镜头 {0}？", [activeRow.shotNumber])}
                                        description={upstreamText("移除分镜内容和关联，已有媒体仍保留在画布中。")}
                                        onConfirm={removeRow}
                                        okText={upstreamText("删除镜头")}
                                        cancelText={upstreamText("保留")}
                                        disabled={writeDisabled}
                                    >
                                        <Button type="text" icon={<Trash2 size={15} />} aria-label={upstreamText("删除镜头 {0}", [activeRow.shotNumber])} disabled={writeDisabled} />
                                    </Popconfirm>
                                </div>
                            </>
                        ) : (
                            <div className="canvas-script-editor-empty">
                                <Clapperboard size={24} />
                                <span>{upstreamText("添加镜头后，在这里编写分镜并核对画面。")}</span>
                            </div>
                        )}
                    </aside>
                </div>
                <footer className="canvas-script-editor-footer">
                    <span>{batch ? generationBatchSummary(t, batch) : readOnly ? upstreamText("脚本已锁定，可浏览分镜与画面。") : busy ? upstreamText("正在生成分镜，完成后可继续编辑。") : upstreamText("修改即时写入当前画布")}</span>
                    {batch && canStop && onStopBatch ? (
                        <Button
                            size="small"
                            type="text"
                            icon={<Square size={12} />}
                            disabled={writeDisabled}
                            onClick={() => {
                                if (!writeDisabled) onStopBatch(batch.id);
                            }}
                        >
                            {upstreamText("停止剩余任务")}
                        </Button>
                    ) : null}
                    <span className="canvas-script-editor-escape-hint">Esc {fullscreen ? upstreamText("退出全屏") : upstreamText("关闭")}</span>
                </footer>
            </div>
        </AppModal>
    );
}
