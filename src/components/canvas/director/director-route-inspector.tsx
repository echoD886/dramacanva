import { Button, InputNumber, Select } from "antd";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { applyPathTimingPolicy } from "@/lib/canvas/director/director-previs-path";
import { directorRouteIssues } from "@/lib/canvas/director/director-route-editing";
import type { DirectorRouteEditor } from "./use-director-route-editing";
import type { DirectorCameraPathEditor } from "./use-director-camera-path-editing";

export function DirectorCameraPathInspector({ editor }: { editor: DirectorCameraPathEditor }) {
    const { route } = editor;
    if (!route) return null;
    const { path, segment } = route;
    const selected = path.points.findIndex((point) => point.id === editor.selectedPointId);
    return (
        <section className="pv-control-block director-route-inspector" aria-label={t("directorP17.title")}>
            <strong className="pv-control-block__label">{t("directorP17.title")}</strong>
            {segment.move !== "path" ? (
                <>
                    <p>{t("directorP17.derived")}</p>
                    <Button onClick={editor.convert}>{t("directorP17.convert")}</Button>
                </>
            ) : (
                <>
                    <label className="grid gap-2 mb-3">
                        <span>{t("directorP16.shape")}</span>
                        <Select
                            aria-label={t("directorP16.shape")}
                            value={path.interpolation}
                            options={[
                                { value: "linear", label: t("directorP16.linear") },
                                { value: "smooth", label: t("directorP16.smooth") },
                            ]}
                            onChange={editor.setInterpolation}
                        />
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <Button disabled={selected < 0} aria-pressed={editor.heightEditing} onClick={editor.toggleHeight}>
                            {t("directorP17.height")}
                        </Button>
                        <Button aria-pressed={editor.adding} onClick={editor.startAdding}>
                            {t("directorP16.add")}
                        </Button>
                        <Button disabled={selected <= 0 || selected === path.points.length - 1} onClick={editor.deleteSelected}>
                            {t("directorP16.delete")}
                        </Button>
                    </div>
                    {selected >= 0 && (
                        <label className="grid gap-2 mt-3">
                            <span>{t("directorP17.heightValue")}</span>
                            <InputNumber aria-label={t("directorP17.heightValue")} min={0} step={0.1} value={path.points[selected].position[1]} onChange={(value) => value !== null && editor.setHeight(value)} />
                        </label>
                    )}
                    <p>{t(editor.adding ? "directorP17.addHint" : "directorP17.dragHint")}</p>
                </>
            )}
            {route.issues.length > 0 && (
                <ul role="status">
                    {[...new Set(route.issues.map((issue) => issue.kind))].map((kind) => (
                        <li key={kind}>{t(kind === "collision" ? "directorP17.collision" : "directorP17.occlusion")}</li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export function DirectorRouteInspector({ editor }: { editor: DirectorRouteEditor }) {
    const { route } = editor;
    if (!route) return null;
    const { path, area, action } = route;
    const issues = directorRouteIssues(path, area);
    const selected = path.points.findIndex((point) => point.id === editor.selectedPointId);
    const speedWarning =
        editor.scene?.previs &&
        applyPathTimingPolicy({ ...editor.scene.previs, paths: editor.scene.previs.paths?.map((item) => (item.id === path.id ? { ...item, timingPolicy: "keepDuration" } : item)) }, action.id).diagnostics.some(
            (item) => item.code === "gait_speed_mismatch",
        );
    return (
        <section className="pv-control-block director-route-inspector" aria-label={t("directorP16.title")}>
            <strong className="pv-control-block__label">{t("directorP16.title")}</strong>
            <label className="grid gap-2 mb-3">
                <span>{t("directorP16.shape")}</span>
                <Select
                    value={path.interpolation}
                    aria-label={t("directorP16.shape")}
                    options={[
                        { value: "linear", label: t("directorP16.linear") },
                        { value: "smooth", label: t("directorP16.smooth") },
                    ]}
                    onChange={editor.setInterpolation}
                />
            </label>
            <label className="grid gap-2 mb-3">
                <span>{t("directorP16.timing")}</span>
                <Select
                    value={path.timingPolicy}
                    aria-label={t("directorP16.timing")}
                    options={[
                        { value: "keepDuration", label: t("directorP16.keepDuration") },
                        { value: "keepSpeed", label: t("directorP16.keepSpeed") },
                    ]}
                    onChange={editor.setTimingPolicy}
                />
            </label>
            <div className="flex flex-wrap gap-2">
                <Button aria-pressed={editor.adding} onClick={editor.startAdding}>
                    {t("directorP16.add")}
                </Button>
                <Button disabled={selected <= 0 || selected === path.points.length - 1} onClick={editor.deleteSelected}>
                    {t("directorP16.delete")}
                </Button>
                <Button onClick={editor.reset}>{t("directorP16.reset")}</Button>
            </div>
            {editor.adding && <p role="status">{t("directorP16.addHint")}</p>}
            {speedWarning && <p role="status">{t("directorP16.speedWarning")}</p>}
            {issues.length > 0 && (
                <ul role="status">
                    {issues.map((issue, index) => (
                        <li key={index}>
                            {t(issue.kind === "outside_walkable" ? "directorP16.outside" : area?.obstacles.find((item) => item.objectId === issue.obstacleId)?.assetId === "platform-column" ? "directorP16.column" : "directorP16.obstacle", {
                                n: issue.section,
                            })}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
