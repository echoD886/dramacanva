import type { ComponentProps, ReactNode } from "react";
import { Input, Select } from "antd";
import { ChevronRight, Plus, WandSparkles, X } from "lucide-react";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { GenerationErrorCard } from "@/components/generation-error-card";
import { sampleDirectorTransform } from "@/lib/canvas/director/director-playback";
import { directorActorProfileForArchetype, directorBoneLabel } from "@/lib/canvas/director/director-scene";
import type { directorModeCapabilities } from "@/lib/canvas/director/director-modes";
import type { DirectorTransaction } from "@/lib/canvas/director/director-gesture-transaction";
import type { CanvasNodeData } from "@/types/canvas";
import type { DirectorScene, DirectorShot, DirectorObject, DirectorLight, DirectorCamera, DirectorTransform, DirectorQuat, DirectorHumanoidBone } from "@/types/director";
import { BoneRotationFields, poseEditBones, ObjectInspector, LightInspector, ShotInspector } from "./director-inspectors";
import { DirectorActorFrameInspector, DirectorSegmentInspector } from "./director-segment-inspector";
import { directorWorkbenchFrameAtTime, directorWorkbenchSequence } from "@/lib/canvas/director/director-workbench-layout";
import { convertDirectorLegacySegment, updateDirectorSegment } from "@/lib/canvas/director/director-segment-settings";
import { DirectorCameraPathInspector, DirectorRouteInspector } from "./director-route-inspector";
import type { DirectorRouteEditor } from "./use-director-route-editing";
import type { DirectorCameraPathEditor } from "./use-director-camera-path-editing";

type DirectorContextPanelProps = {
    objectList?: ReactNode;
    previsV2: boolean;
    routeEditor?: DirectorRouteEditor;
    cameraPathEditor?: DirectorCameraPathEditor;
    draft: DirectorScene;
    activeShot: DirectorShot;
    selectedObject: DirectorObject | null;
    selectedLight: DirectorLight | null;
    selectedActor: DirectorObject | null;
    inspectorCamera: DirectorCamera | null;
    selectedCameraId: string | null;
    selectedBone: string | null;
    selectedObjectRendered: DirectorTransform | null;
    snappedPlayhead: number;
    capabilities: ReturnType<typeof directorModeCapabilities>;
    inspectorOpen: boolean;
    imageNodes: CanvasNodeData[];
    recording: boolean;
    saving: boolean;
    lastClayExport: { shotId: string; at: number } | null;
    outputFailure: { error: unknown; recording: boolean } | null;
    compiledPrompt: string;
    onCollapse: () => void;
    updateShot: (id: string, patch: Partial<DirectorShot>) => void;
    setSelectedCameraId: (id: string | null) => void;
    addShot: () => void;
    enterAnimationMode: () => void;
    updateObject: (id: string, patch: Partial<DirectorObject>) => void;
    setSelectedBone: (bone: string | null) => void;
    writeBoneRotation: (id: string, bone: string, rotation: DirectorQuat, phase: "stage") => void;
    stagedTransaction: Pick<DirectorTransaction, "end">;
    handleObjectTransform: (id: string, from: DirectorTransform, to: DirectorTransform) => void;
    recordSelectedKeyframe: () => void;
    duplicateObject: (id: string) => void;
    removeObject: (id: string) => void;
    updateLight: (id: string, patch: Partial<DirectorLight>) => void;
    removeLight: (id: string) => void;
    commit: (updater: (current: DirectorScene) => DirectorScene) => void;
    addCameraKeyframe: () => void;
    applyCameraMove: ComponentProps<typeof ShotInspector>["onApplyCameraMove"];
    alignCameraToView: () => void;
    exportClayVideo: () => void;
    applyToCanvas: () => void;
    setSelectedObjectId: (id: string | null) => void;
    copyCompiledPrompt: () => void;
};

export function DirectorContextPanel({
    objectList,
    previsV2,
    routeEditor,
    cameraPathEditor,
    draft,
    activeShot,
    selectedObject,
    selectedLight,
    selectedActor,
    inspectorCamera,
    selectedCameraId,
    selectedBone,
    selectedObjectRendered,
    snappedPlayhead,
    capabilities,
    inspectorOpen,
    imageNodes,
    recording,
    saving,
    lastClayExport,
    outputFailure,
    compiledPrompt,
    onCollapse,
    updateShot,
    setSelectedCameraId,
    addShot,
    enterAnimationMode,
    updateObject,
    setSelectedBone,
    writeBoneRotation,
    stagedTransaction,
    handleObjectTransform,
    recordSelectedKeyframe,
    duplicateObject,
    removeObject,
    updateLight,
    removeLight,
    commit,
    addCameraKeyframe,
    applyCameraMove,
    alignCameraToView,
    exportClayVideo,
    applyToCanvas,
    setSelectedObjectId,
    copyCompiledPrompt,
}: DirectorContextPanelProps) {
    const sequence = directorWorkbenchSequence(draft);
    const segment = sequence.segments.find((item) => (item.shotId ?? item.legacyShotId) === activeShot.id) ?? sequence.segments[draft.shots.findIndex((shot) => shot.id === activeShot.id)];
    if (previsV2 && !selectedObject && !selectedLight && segment)
        return (
            <aside id="director-workbench-context" className={`pv-panel pv-panel--right thin-scrollbar ${inspectorOpen ? "is-open" : ""}`}>
                {objectList}
                <div className="pv-panel-header">
                    <strong>{activeShot.name}</strong>
                    <button type="button" className="pv-icon-btn" aria-label={t("previs.v165.collapse")} onClick={onCollapse}>
                        <ChevronRight className="size-3.5" />
                    </button>
                </div>
                <DirectorSegmentInspector
                    scene={draft}
                    segment={cameraPathEditor?.route?.segment ?? segment}
                    onUpdate={(patch) => {
                        cameraPathEditor?.cancel();
                        commit((current) => updateDirectorSegment(current, cameraPathEditor?.route?.segment.id ?? segment.id, patch));
                    }}
                    onConvert={() => commit((current) => convertDirectorLegacySegment(current, cameraPathEditor?.route?.segment.id ?? segment.id))}
                />
                {cameraPathEditor && <DirectorCameraPathInspector editor={cameraPathEditor} />}
            </aside>
        );
    return (
        <aside id="director-workbench-context" className={`pv-panel pv-panel--right thin-scrollbar ${inspectorOpen ? "is-open" : ""}`}>
            {objectList}
            <div className="pv-panel-header pv-inspector-header">
                {(!selectedObject && !selectedLight) || (capabilities.cameraTools && selectedObject?.kind !== "actor") ? (
                    <div className="pv-inspector-heading">
                        <Input aria-label={activeShot.name} value={activeShot.name} onChange={(event) => updateShot(activeShot.id, { name: event.target.value })} />
                        <Select
                            aria-label={t("canvasExtra.directorWB.camera")}
                            value={activeShot.cameraId}
                            options={draft.cameras.map((item) => ({ label: item.name, value: item.id }))}
                            onChange={(cameraId) => {
                                updateShot(activeShot.id, { cameraId });
                                setSelectedCameraId(cameraId);
                            }}
                        />
                    </div>
                ) : (
                    <div className="pv-panel-header__title">
                        <span className="pv-panel-header__label">{selectedObject?.name || selectedLight?.name || inspectorCamera?.name || activeShot.name}</span>
                        <span className="pv-panel-header__sub">
                            {selectedObject ? t("canvasExtra.directorNP.statObjects") : selectedLight ? t("canvasExtra.directorWB.lightDefaultName") : selectedCameraId ? t("canvasExtra.directorWB.camera") : t("canvasDialog.angle.lens")}
                        </span>
                    </div>
                )}
                <div className="pv-panel-header__actions">
                    <button type="button" className="pv-icon-btn" aria-label={t("scriptEditor.add")} title={t("scriptEditor.add")} onClick={addShot}>
                        <Plus className="size-3.5" />
                    </button>
                    <button type="button" className="pv-icon-btn" aria-label={t("previs.v165.message125")} title={t("previs.v165.message125")} onClick={enterAnimationMode}>
                        <WandSparkles className="size-3.5" />
                    </button>
                    <button type="button" className="pv-icon-btn pv-panel-collapse-btn" aria-label={t("previs.v165.collapse")} title={t("previs.v165.collapse")} onClick={onCollapse}>
                        <ChevronRight className="size-3.5" />
                    </button>
                    <button type="button" className="pv-icon-btn pv-mobile-inspector-close" aria-label={t("previs.v165.message126")} title={t("previs.v165.message126")} onClick={onCollapse}>
                        <X className="size-3.5" />
                    </button>
                </div>
            </div>

            {previsV2 && selectedObject?.kind === "actor" && <DirectorActorFrameInspector scene={draft} actorId={selectedObject.id} frame={directorWorkbenchFrameAtTime(draft, activeShot.id, snappedPlayhead)} />}
            {previsV2 && selectedObject?.kind === "actor" && routeEditor && <DirectorRouteInspector editor={routeEditor} />}

            {selectedActor ? (
                <div className="pv-control-block">
                    <div className="pv-control-block__label">
                        {t("previs.v165.message127")}
                        {selectedActor.name}
                    </div>
                    <div className="pv-slider-list">
                        <label className="pv-slider-row">
                            <span>{t("previs.v165.message128")}</span>
                            <input
                                type="range"
                                min={0.5}
                                max={1.5}
                                step={0.01}
                                value={selectedActor.actorProfile?.height ?? 1}
                                onChange={(e) => updateObject(selectedActor.id, { actorProfile: { ...(selectedActor.actorProfile || directorActorProfileForArchetype("adult")), height: Number(e.target.value) } })}
                            />
                            <span className="pv-slider-val">{(selectedActor.actorProfile?.height ?? 1).toFixed(2)}</span>
                        </label>
                        <label className="pv-slider-row">
                            <span>{t("previs.v165.message129")}</span>
                            <input
                                type="range"
                                min={0.5}
                                max={1.5}
                                step={0.01}
                                value={selectedActor.actorProfile?.shoulderWidth ?? 1}
                                onChange={(e) => updateObject(selectedActor.id, { actorProfile: { ...(selectedActor.actorProfile || directorActorProfileForArchetype("adult")), shoulderWidth: Number(e.target.value) } })}
                            />
                            <span className="pv-slider-val">{(selectedActor.actorProfile?.shoulderWidth ?? 1).toFixed(2)}</span>
                        </label>
                        <label className="pv-slider-row">
                            <span>{t("previs.v165.message130")}</span>
                            <input
                                type="range"
                                min={0.5}
                                max={1.6}
                                step={0.01}
                                value={selectedActor.actorProfile?.headRatio ?? 1}
                                onChange={(e) => updateObject(selectedActor.id, { actorProfile: { ...(selectedActor.actorProfile || directorActorProfileForArchetype("adult")), headRatio: Number(e.target.value) } })}
                            />
                            <span className="pv-slider-val">{(selectedActor.actorProfile?.headRatio ?? 1).toFixed(2)}</span>
                        </label>
                    </div>
                    <div className="pv-control-block__label" style={{ marginTop: 10 }}>
                        {t("previs.v165.message131")}
                    </div>
                    <Select
                        className="w-full"
                        size="small"
                        allowClear
                        value={selectedBone || undefined}
                        options={poseEditBones.map((bone) => ({ label: directorBoneLabel(bone), value: bone }))}
                        placeholder={t("previs.v165.message132")}
                        onChange={(bone) => setSelectedBone(bone || null)}
                    />
                    {selectedBone ? (
                        <div style={{ marginTop: 6 }}>
                            <BoneRotationFields
                                rotation={selectedActor.boneOverrides?.[selectedBone as DirectorHumanoidBone] || ([0, 0, 0, 1] as DirectorQuat)}
                                onChange={(rotation) => writeBoneRotation(selectedActor.id, selectedBone, rotation, "stage")}
                                onChangeComplete={() => stagedTransaction.end("commit")}
                            />
                        </div>
                    ) : null}
                </div>
            ) : null}

            {selectedObject && (selectedObject.kind === "actor" || !capabilities.cameraTools) ? (
                <div className="pv-control-block pv-detail-block">
                    {selectedObject.kind === "actor" && (
                        <label className="grid gap-2 mb-3">
                            <span>{t("directorD4.bind")}</span>
                            <Select
                                allowClear
                                placeholder={t("directorD4.unbound")}
                                value={selectedObject.characterBinding?.referenceNodeId}
                                options={imageNodes.map((node) => ({
                                    value: node.id,
                                    label: (
                                        <span className="flex items-center gap-2">
                                            <img src={node.metadata?.content} alt="" className="size-6 rounded object-cover" />
                                            {node.title}
                                        </span>
                                    ),
                                }))}
                                onChange={(id) => {
                                    const node = imageNodes.find((item) => item.id === id);
                                    updateObject(selectedObject.id, {
                                        characterBinding: node
                                            ? {
                                                  referenceNodeId: node.id,
                                                  characterAssetId: node.metadata?.characterAssetId || "",
                                                  characterVersionId: node.metadata?.characterVersionId || "",
                                                  characterName: node.title,
                                                  referenceImageUrl: node.metadata?.content,
                                              }
                                            : undefined,
                                        ...(node ? { name: node.title } : {}),
                                    });
                                }}
                            />
                        </label>
                    )}
                    <div className="pv-control-block__label">{t("previs.v165.message133")}</div>
                    <ObjectInspector
                        object={selectedObject}
                        rendered={selectedObjectRendered || selectedObject.transform}
                        playhead={snappedPlayhead}
                        selectedBone={selectedBone}
                        capabilities={capabilities}
                        onSelectBone={setSelectedBone}
                        onUpdate={(patch) => updateObject(selectedObject.id, patch)}
                        onTransformEdit={(edited) => handleObjectTransform(selectedObject.id, selectedObjectRendered || selectedObject.transform, edited)}
                        onBoneRotationStage={(rotation) => selectedBone && writeBoneRotation(selectedObject.id, selectedBone, rotation, "stage")}
                        onBoneRotationCommit={() => stagedTransaction.end("commit")}
                        onAddKeyframe={recordSelectedKeyframe}
                        onDuplicate={() => duplicateObject(selectedObject.id)}
                        onDelete={() => removeObject(selectedObject.id)}
                    />
                </div>
            ) : selectedLight && !capabilities.cameraTools ? (
                <div className="pv-control-block pv-detail-block">
                    <div className="pv-control-block__label">{t("previs.v165.message134")}</div>
                    <LightInspector light={selectedLight} onUpdate={(patch) => updateLight(selectedLight.id, patch)} onDelete={() => removeLight(selectedLight.id)} />
                </div>
            ) : (
                <div className="pv-control-block pv-detail-block">
                    <ShotInspector
                        shot={activeShot}
                        camera={inspectorCamera}
                        cameras={draft.cameras}
                        capabilities={capabilities}
                        onUpdateShot={(patch) => updateShot(activeShot.id, patch)}
                        onUpdateCamera={(patch) => inspectorCamera && commit((current) => ({ ...current, cameras: current.cameras.map((item) => (item.id === inspectorCamera.id ? { ...item, ...patch } : item)) }))}
                        onAddCameraKeyframe={addCameraKeyframe}
                        onApplyCameraMove={applyCameraMove}
                        onAlignCameraToView={alignCameraToView}
                        onExportClay={previsV2 || !draft.previs ? () => void exportClayVideo() : undefined}
                        recording={recording}
                    />
                </div>
            )}

            <section className="director-blocking-summary">
                {draft.objects
                    .filter((object) => object.kind === "actor" && object.visible)
                    .map((actor, index) => (
                        <button type="button" key={actor.id} onClick={() => setSelectedObjectId(actor.id)}>
                            <strong>
                                {String.fromCharCode(65 + index)} · {actor.name}
                            </strong>
                            <span>
                                {t("directorR3.start")}{" "}
                                <code>
                                    {sampleDirectorTransform(actor.transform, actor.keyframes, 0, actor.motionPath)
                                        .position.filter((_, axis) => axis !== 1)
                                        .map((v) => v.toFixed(1))
                                        .join(" / ")}{" "}
                                    m
                                </code>
                            </span>
                            <span>
                                {t("directorR3.end")}{" "}
                                <code>
                                    {sampleDirectorTransform(actor.transform, actor.keyframes, activeShot.duration, actor.motionPath)
                                        .position.filter((_, axis) => axis !== 1)
                                        .map((v) => v.toFixed(1))
                                        .join(" / ")}{" "}
                                    m
                                </code>
                            </span>
                        </button>
                    ))}
            </section>
            <div className="pv-output-block">
                {outputFailure && (!outputFailure.recording || previsV2 || !draft.previs) ? (
                    <GenerationErrorCard error={outputFailure.error} onRetry={() => void (outputFailure.recording ? exportClayVideo() : applyToCanvas())} retrying={saving || recording} />
                ) : null}
                <div className="pv-output-block__header">
                    <span>{t("adminPrompts.output")}</span>
                    <div className={`pv-output-dot ${lastClayExport?.shotId === activeShot.id ? "pv-output-dot--done" : recording ? "pv-output-dot--recording" : ""}`} />
                </div>
                <div className="pv-output-status">{lastClayExport?.shotId === activeShot.id ? t("previs.v165.message136") : recording ? t("previs.v165.message137") : t("previs.v165.message138")}</div>
                <div className="pv-prompt-preview">
                    <div className="pv-prompt-preview__label">
                        {t("canvasExtra.videoSeg.generationPrompt")}
                        <button type="button" className="pv-prompt-copy" onClick={() => void copyCompiledPrompt()}>
                            {t("mcp.copy")}
                        </button>
                    </div>
                    <div className="pv-prompt-preview__text">{compiledPrompt || t("previs.v165.message139")}</div>
                </div>
            </div>

            <button type="button" className="pv-animation-link" onClick={enterAnimationMode}>
                <WandSparkles className="size-3.5" />
                {t("previs.v165.message125")}
            </button>
        </aside>
    );
}
