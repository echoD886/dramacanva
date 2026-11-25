import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { useI18n } from "@/i18n/use-i18n";
// 预演台右侧检查器：物体、灯光、镜头、变换与骨骼旋转字段，以及场景列表的小控件。

import {
    type DirectorAspectRatio,
    type DirectorCamera,
    type DirectorCameraMove,
    type DirectorHumanoidBone,
    type DirectorLight,
    type DirectorObject,
    type DirectorActorArchetype,
    type DirectorPose,
    type DirectorQuat,
    type DirectorScene,
    type DirectorShot,
    type DirectorShotSize,
    type DirectorTransform,
    type DirectorVec3,
} from "@/types/director";
import { type DirectorModeCapabilities } from "@/lib/canvas/director/director-modes";
import { DIRECTOR_ACTOR_ARCHETYPES, DIRECTOR_ACTOR_COLORS, directorActorArchetypeLabel, directorActorProfileForArchetype, directorBoneLabel, directorFocalLengthToFov, directorPoseLabel } from "@/lib/canvas/director/director-scene";
import { Button, ColorPicker, Dropdown, Input, InputNumber, type MenuProps, Slider } from "antd";
import { Select } from "antd";
import { Switch } from "@/components/ui/base/switch";
import { Camera, ChevronDown, Copy, Focus, Plus, Trash2, Video } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Euler, Quaternion } from "three";
import { releaseDirectorFocusAfterPointer } from "@/lib/canvas/director/director-shortcuts";

const DIRECTOR_HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function normalizeDirectorHexColor(value: string, fallback = "#ffffff") {
    const trimmed = value.trim().toLowerCase();
    if (!DIRECTOR_HEX_COLOR_PATTERN.test(trimmed)) return fallback;
    if (trimmed.length === 4)
        return `#${trimmed
            .slice(1)
            .split("")
            .map((part) => part + part)
            .join("")}`;
    return trimmed;
}

function HexColorInput({ value, onChange, label = t("previs.v165.message236") }: { value: string; onChange: (value: string) => void; label?: string }) {
    useI18n();
    const normalized = normalizeDirectorHexColor(value);
    const [draft, setDraft] = useState(normalized);
    useEffect(() => setDraft(normalized), [normalized]);
    const commit = () => {
        const next = normalizeDirectorHexColor(draft, "");
        if (!next) {
            setDraft(normalized);
            return;
        }
        setDraft(next);
        onChange(next);
    };
    return <Input size="small" aria-label={label} value={draft} maxLength={9} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onPressEnter={commit} placeholder="#RRGGBB" />;
}

export const poseOptions: Array<{ label: string; value: DirectorPose }> = [
    {
        get label() {
            return t("canvasExtra.directorWB.poseStand");
        },
        value: "stand",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseTPose");
        },
        value: "t_pose",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseWalk");
        },
        value: "walk",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseRun");
        },
        value: "run",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseSit");
        },
        value: "sit",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseSquat");
        },
        value: "squat",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseKneelSingle");
        },
        value: "kneel_single",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseKneelDouble");
        },
        value: "kneel_double",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseHandsHips");
        },
        value: "hands_hips",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseLean");
        },
        value: "lean",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseBow");
        },
        value: "bow",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseThink");
        },
        value: "think",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseFight");
        },
        value: "fight",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseKick");
        },
        value: "kick",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseThrow");
        },
        value: "throw",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.movePushIn");
        },
        value: "push",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseWave");
        },
        value: "wave",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseReach");
        },
        value: "reach",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.poseArmsCrossed");
        },
        value: "arms_crossed",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.posePhone");
        },
        value: "phone",
    },
];

export const poseEditBones: DirectorHumanoidBone[] = ["head", "spine", "leftUpperArm", "leftLowerArm", "rightUpperArm", "rightLowerArm", "leftUpperLeg", "rightUpperLeg"];

export const shotSizeOptions = [
    {
        get label() {
            return t("canvasExtra.directorWB.shotExtremeWide");
        },
        value: "extreme_wide",
    },
    {
        get label() {
            return t("scriptEditor.shotSizeLong");
        },
        value: "wide",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.shotFull");
        },
        value: "full",
    },
    {
        get label() {
            return t("canvasDialog.angle.medium");
        },
        value: "medium",
    },
    {
        get label() {
            return t("canvasDialog.angle.near");
        },
        value: "close_up",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.shotExtremeCloseUp");
        },
        value: "extreme_close_up",
    },
];

export const cameraMoveOptions = [
    {
        get label() {
            return t("shotCamera.static");
        },
        value: "static",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.movePushIn");
        },
        value: "push_in",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.movePullOut");
        },
        value: "pull_out",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.movePanLeft");
        },
        value: "pan_left",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.movePanRight");
        },
        value: "pan_right",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.moveTiltUp");
        },
        value: "tilt_up",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.moveTiltDown");
        },
        value: "tilt_down",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.moveOrbitLeft");
        },
        value: "orbit_left",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.moveOrbitRight");
        },
        value: "orbit_right",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.moveHandheld");
        },
        value: "handheld",
    },
    {
        get label() {
            return t("directorR3.truck_left");
        },
        value: "truck_left",
    },
    {
        get label() {
            return t("directorR3.truck_right");
        },
        value: "truck_right",
    },
    {
        get label() {
            return t("directorR3.pedestal_up");
        },
        value: "pedestal_up",
    },
    {
        get label() {
            return t("directorR3.pedestal_down");
        },
        value: "pedestal_down",
    },
];

export function ObjectInspector({
    object,
    rendered,
    playhead,
    selectedBone,
    capabilities,
    onSelectBone,
    onUpdate,
    onTransformEdit,
    onBoneRotationStage,
    onBoneRotationCommit,
    onAddKeyframe,
    onDuplicate,
    onDelete,
}: {
    object: DirectorObject;
    rendered: DirectorTransform;
    playhead: number;
    selectedBone: string | null;
    capabilities: DirectorModeCapabilities;
    onSelectBone: (bone: string | null) => void;
    onUpdate: (patch: Partial<DirectorObject>) => void;
    onTransformEdit: (transform: DirectorTransform) => void;
    onBoneRotationStage: (rotation: DirectorQuat) => void;
    onBoneRotationCommit: () => void;
    onAddKeyframe: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    useI18n();
    const motionClips = object.motionClips || [];
    const activeMotionClip = motionClips.find((clip) => clip.id === object.activeMotionClipId);
    const isActor = object.kind === "actor" || object.primitive === "character";
    const mappedBones = Object.keys(object.rig?.boneMap || {}) as DirectorHumanoidBone[];
    const poseBones = mappedBones.length ? mappedBones : poseEditBones;
    const selectedBoneId = selectedBone as DirectorHumanoidBone | null;
    const selectedBoneRotation = selectedBoneId ? object.boneOverrides?.[selectedBoneId] || ([0, 0, 0, 1] as DirectorQuat) : null;
    const updateActiveMotion = (patch: Partial<NonNullable<DirectorObject["motionClips"]>[number]>) => activeMotionClip && onUpdate({ motionClips: motionClips.map((clip) => (clip.id === activeMotionClip.id ? { ...clip, ...patch } : clip)) });
    const applyPose = (pose: DirectorPose) => onUpdate({ pose, activeMotionClipId: undefined, boneOverrides: {} });
    const resetSelectedBone = () => {
        if (!selectedBoneId) return;
        const boneOverrides = { ...(object.boneOverrides || {}) };
        delete boneOverrides[selectedBoneId];
        onUpdate({ boneOverrides });
    };
    return (
        <Inspector title={object.name} onTitleChange={(name) => onUpdate({ name })} onDuplicate={onDuplicate} onDelete={onDelete}>
            <TransformFields transform={rendered} onChange={onTransformEdit} scaleLabel={isActor ? t("videoSettings.ratio") : t("previs.v165.message237")} scaleAxisLabels={isActor ? undefined : ["W", "H", "D"]} />
            {isActor ? (
                <>
                    <Field label={t("previs.v165.message238")}>
                        <Select
                            className="w-full"
                            size="small"
                            value={object.archetype || "adult"}
                            options={DIRECTOR_ACTOR_ARCHETYPES.map((item) => ({ label: item.label, value: item.value }))}
                            onChange={(archetype: DirectorActorArchetype) => onUpdate({ archetype, actorProfile: directorActorProfileForArchetype(archetype) })}
                        />
                        <div className="mt-1 text-[10px] opacity-50">
                            {directorActorArchetypeLabel(object.archetype)}
                            {t("previs.v165.message239")}
                        </div>
                    </Field>
                    <Field label={t("canvasExtra.directorWB.actorColor")}>
                        <div className="director-actor-colors">
                            {DIRECTOR_ACTOR_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`director-actor-color ${object.color.toLowerCase() === color ? "is-active" : ""}`}
                                    style={{ background: color }}
                                    aria-label={t("previs.v165.message289", { p0: color })}
                                    onClick={() => onUpdate({ color })}
                                />
                            ))}
                            <ColorPicker value={normalizeDirectorHexColor(object.color)} size="small" onChange={(color) => onUpdate({ color: color.toHexString() })} />
                        </div>
                        <div className="mt-1">
                            <HexColorInput value={object.color} onChange={(color) => onUpdate({ color })} label={t("previs.v165.message240")} />
                        </div>
                    </Field>
                </>
            ) : (
                <Field label={t("canvasDialog.lighting.color")}>
                    <div className="space-y-1">
                        <ColorPicker value={normalizeDirectorHexColor(object.color)} onChange={(color) => onUpdate({ color: color.toHexString() })} />
                        <HexColorInput value={object.color} onChange={(color) => onUpdate({ color })} />
                    </div>
                </Field>
            )}
            {/*
          骨骼与姿势入口：只在姿态/动画模式出现，且只对演员出现。
          规格要求「仅在演员选择时展示现有骨骼/姿势入口」——
          带动画的普通模型不是演员，不应拿到姿势预设与骨骼控制。
        */}
            {capabilities.bones && (object.kind === "actor" || object.primitive === "character") ? (
                <>
                    <section className="director-pose-section">
                        <div className="director-inspector-section-title">
                            <span>{t("canvasExtra.directorWB.posePresets")}</span>
                            <span>{directorPoseLabel(object.pose || "stand")}</span>
                        </div>
                        <div className="director-pose-grid">
                            {poseOptions.map((option) => (
                                <button key={option.value} type="button" className={`director-pose-button ${object.pose === option.value && !object.activeMotionClipId ? "is-active" : ""}`} title={option.label} onClick={() => applyPose(option.value)}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <Button size="small" block onClick={() => applyPose("stand")}>
                            {t("canvasExtra.directorWB.resetPose")}
                        </Button>
                    </section>
                    <div className="flex items-center justify-between border-y py-2 text-[var(--fs-label)]">
                        <span>{t("canvasExtra.directorWB.rigBinding")}</span>
                        <span>{mappedBones.length ? t("previs.v165.message290", { p0: mappedBones.length }) : t("previs.v165.message241")}</span>
                    </div>
                    {poseBones.length ? (
                        <Field label={t("previs.v165.message242")}>
                            <Select className="w-full" allowClear value={selectedBone || undefined} options={poseBones.map((bone) => ({ label: directorBoneLabel(bone), value: bone }))} onChange={(bone) => onSelectBone(bone || null)} />
                        </Field>
                    ) : null}
                    {selectedBoneId && selectedBoneRotation ? (
                        <>
                            <BoneRotationFields rotation={selectedBoneRotation} onChange={onBoneRotationStage} onChangeComplete={onBoneRotationCommit} />
                            <Button size="small" block onClick={resetSelectedBone}>
                                {t("canvasExtra.directorWB.resetBone")}
                            </Button>
                        </>
                    ) : null}
                    {/* 演员还没加载出模型时给一句解释，避免「动作片段」区域凭空消失。 */}
                    {motionClips.length ? null : <div className="text-[var(--fs-tiny)] opacity-50">{t("canvasExtra.directorWB.clipsAfterLoad")}</div>}
                </>
            ) : null}
            {/* 动作片段是动画内容而非骨骼入口：任何带 Clip 的对象都能调，不限演员。 */}
            {motionClips.length ? (
                <>
                    <Field label={t("canvasExtra.directorSeq.motionClipsRow")}>
                        <Select
                            className="w-full"
                            value={object.activeMotionClipId || ""}
                            options={[{ label: t("canvasExtra.directorWB.staticPose"), value: "" }, ...motionClips.map((clip) => ({ label: clip.name, value: clip.id }))]}
                            onChange={(activeMotionClipId) => onUpdate({ activeMotionClipId: activeMotionClipId || undefined })}
                        />
                    </Field>
                    {activeMotionClip ? (
                        <div className="grid grid-cols-2 gap-2">
                            <Field label={t("canvasExtra.directorWB.playbackSpeed")}>
                                <InputNumber className="w-full" min={0.1} max={4} step={0.1} value={activeMotionClip.playbackRate} onChange={(playbackRate) => updateActiveMotion({ playbackRate: playbackRate || 1 })} />
                            </Field>
                            <Field label={t("canvasExtra.directorWB.loop")}>
                                <Switch checked={activeMotionClip.loop} onChange={(loop) => updateActiveMotion({ loop })} />
                            </Field>
                        </div>
                    ) : null}
                </>
            ) : null}
            <Field label={t("canvasExtra.directorWB.visible")}>
                <Switch checked={object.visible} onChange={(visible) => onUpdate({ visible })} />
            </Field>
            <Field label={t("canvasExtra.directorWB.castShadow")}>
                <Switch checked={object.castShadow} onChange={(castShadow) => onUpdate({ castShadow })} />
            </Field>
            {/* 记录关键帧属于动画模式；摆场与姿态模式不默认制造关键帧。 */}
            {capabilities.keyframes ? (
                <>
                    <Button block icon={<Focus className="size-3.5" />} onClick={onAddKeyframe}>
                        {selectedBone ? t("previs.v165.message291", { p0: playhead.toFixed(1) }) : t("previs.v165.message292", { p0: playhead.toFixed(1) })}
                    </Button>
                    <div className="text-[var(--fs-tiny)] opacity-50">
                        Transform {object.keyframes.length}
                        {t("previs.v165.message243")}
                        {object.boneTracks?.reduce((sum, track) => sum + track.keyframes.length, 0) || 0}
                        {t("modelPickerCapability.items")}
                    </div>
                </>
            ) : null}
        </Inspector>
    );
}

export function LightInspector({ light, onUpdate, onDelete }: { light: DirectorLight; onUpdate: (patch: Partial<DirectorLight>) => void; onDelete: () => void }) {
    useI18n();
    return (
        <Inspector title={light.name} onTitleChange={(name) => onUpdate({ name })} onDelete={onDelete}>
            <Field label={t("wallet.colType")}>
                <Select
                    className="w-full"
                    value={light.type}
                    options={[
                        { label: t("canvasExtra.directorWB.lightDirectional"), value: "directional" },
                        { label: t("canvasExtra.directorWB.lightPoint"), value: "point" },
                        { label: t("canvasExtra.directorWB.lightSpot"), value: "spot" },
                        { label: t("canvasExtra.directorWB.lightAmbient"), value: "ambient" },
                    ]}
                    onChange={(type) => onUpdate({ type })}
                />
            </Field>
            <Vec3Field label={t("nodeInfo.position")} value={light.transform.position} onChange={(position) => onUpdate({ transform: { ...light.transform, position } })} />
            <Field label={t("canvasDialog.lighting.color")}>
                <div className="space-y-1">
                    <ColorPicker value={normalizeDirectorHexColor(light.color)} onChange={(color) => onUpdate({ color: color.toHexString() })} />
                    <HexColorInput value={light.color} onChange={(color) => onUpdate({ color })} />
                </div>
            </Field>
            <Field label={t("canvasExtra.directorWB.intensity")}>
                <InputNumber className="w-full" min={0} max={20} step={0.1} value={light.intensity} onChange={(value) => onUpdate({ intensity: value || 0 })} />
            </Field>
            <Field label={t("canvasExtra.directorWB.castShadow")}>
                <Switch checked={light.castShadow} onChange={(castShadow) => onUpdate({ castShadow })} />
            </Field>
        </Inspector>
    );
}

export function InspectorSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={`director-inspector-section ${open ? "is-open" : "is-collapsed"}`}>
            <button
                type="button"
                className="director-inspector-section__header flex w-full items-center justify-between py-1.5 text-[13px] font-semibold text-[var(--pd-t1)] hover:text-[var(--pd-t0)] transition-colors select-none"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                <span>{title}</span>
                <ChevronDown className={`size-3.5 transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90 opacity-60"}`} />
            </button>
            {open && <div className="director-inspector-section__body space-y-2.5 pt-1">{children}</div>}
        </div>
    );
}

export function ShotInspector({
    shot,
    camera,
    cameras,
    capabilities,
    onUpdateShot,
    onUpdateCamera,
    onAddCameraKeyframe,
    onApplyCameraMove,
    onAlignCameraToView,
    onExportClay,
    recording,
}: {
    shot: DirectorShot;
    camera: DirectorCamera | null;
    cameras: DirectorScene["cameras"];
    capabilities: DirectorModeCapabilities;
    onUpdateShot: (patch: Partial<DirectorShot>) => void;
    onUpdateCamera: (patch: Partial<DirectorCamera>) => void;
    onAddCameraKeyframe: () => void;
    onApplyCameraMove: () => void;
    onAlignCameraToView: () => void;
    onExportClay?: () => void;
    recording: boolean;
}) {
    useI18n();
    return (
        <Inspector title={shot.name} showTitle={false} onTitleChange={(name) => onUpdateShot({ name })}>
            {/* 变换 (Transform) */}
            {camera ? (
                <InspectorSection title={t("previs.v165.groupTransform")} defaultOpen>
                    <Vec3Field label={t("canvasExtra.directorWB.cameraPosition")} value={camera.transform.position} onChange={(position) => onUpdateCamera({ transform: { ...camera.transform, position } })} />
                    <Vec3Field label={t("canvasExtra.directorWB.focusPoint")} value={camera.target} onChange={(target) => onUpdateCamera({ target })} />
                </InspectorSection>
            ) : null}

            {/* 镜头 (Camera / Lens) */}
            <InspectorSection title={t("previs.v165.groupCamera")} defaultOpen>
                {camera ? (
                    <>
                        <Field label={t("canvasDialog.cameraDialog.focalLength")}>
                            <div className="space-y-1.5">
                                <InputNumber
                                    className="w-full"
                                    min={12}
                                    max={200}
                                    value={camera.focalLength}
                                    addonAfter="mm"
                                    onChange={(focalLength) => onUpdateCamera({ focalLength: focalLength || 35, fov: directorFocalLengthToFov(focalLength || 35) })}
                                />
                                <div className="director-focal-chips">
                                    {[24, 35, 50, 85, 135].map((focal) => (
                                        <button
                                            key={focal}
                                            type="button"
                                            className={`director-chip flex-1 text-center py-0.5 px-1 text-[10px] font-mono rounded border transition-colors ${camera.focalLength === focal ? "bg-[var(--pd-a-bg)] border-[var(--pd-a-bd)] text-[var(--pd-t0)] font-semibold" : "border-[var(--pd-b0)] bg-[var(--pd-s2)] text-[var(--pd-t1)] hover:bg-[var(--pd-s3)]"}`}
                                            onClick={() => onUpdateCamera({ focalLength: focal, fov: directorFocalLengthToFov(focal) })}
                                        >
                                            {focal}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                            <Field label={t("canvasDialog.cameraDialog.aperture")}>
                                <InputNumber className="w-full" min={0.7} max={32} step={0.1} value={camera.aperture} addonBefore="f/" onChange={(aperture) => onUpdateCamera({ aperture: aperture || 2.8 })} />
                            </Field>
                            <Field label={t("canvasExtra.directorWB.focusDistance")}>
                                <InputNumber className="w-full" min={0.1} max={200} step={0.1} value={camera.focusDistance} addonAfter="m" onChange={(focusDistance) => onUpdateCamera({ focusDistance: focusDistance || 5 })} />
                            </Field>
                        </div>
                    </>
                ) : null}
            </InspectorSection>

            {/* 构图 (Framing / Composition) */}
            <InspectorSection title={t("previs.v165.groupFraming")} defaultOpen>
                <div className="grid grid-cols-2 gap-2">
                    <Field label={t("scriptEditor.shotSize")}>
                        <Select className="w-full" value={shot.shotSize} options={shotSizeOptions} onChange={(shotSize: DirectorShotSize) => onUpdateShot({ shotSize })} />
                    </Field>
                    <Field label={t("creationSettings.frame")}>
                        <Select className="w-full" value={shot.aspectRatio || "9:16"} options={["9:16", "16:9", "2.39:1"].map((value) => ({ label: value, value }))} onChange={(aspectRatio: DirectorAspectRatio) => onUpdateShot({ aspectRatio })} />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Field label={t("canvasExtra.directorWB.fps")}>
                        <Select className="w-full" value={shot.fps} options={[24, 25, 30].map((fps) => ({ label: `${fps} fps`, value: fps }))} onChange={(fps: 24 | 25 | 30) => onUpdateShot({ fps })} />
                    </Field>
                    <Field label={t("editorTools.duration")}>
                        <InputNumber className="w-full" min={0.5} max={60} step={0.5} value={shot.duration} addonAfter={t("pricing.countdownSecond")} onChange={(value) => onUpdateShot({ duration: value || 5 })} />
                    </Field>
                </div>
            </InspectorSection>

            {/* 运镜 (Motion) */}
            <InspectorSection title={t("previs.v165.groupMovement")} defaultOpen>
                <Field label={t("scriptEditor.motion")}>
                    <Select className="w-full" value={shot.cameraMove} options={cameraMoveOptions} onChange={(cameraMove: DirectorCameraMove) => onUpdateShot({ cameraMove })} />
                </Field>
                <div className="space-y-1.5 pt-1">
                    <Button block icon={<Camera className="size-3.5" />} onClick={onAlignCameraToView}>
                        {t("canvasExtra.directorWB.alignCameraToView")}
                    </Button>
                    <Button block icon={<Video className="size-3.5" />} title={t("previs.v165.message244")} onClick={onApplyCameraMove}>
                        {t("previs.v165.message245")}
                    </Button>
                    {capabilities.keyframes ? (
                        <Button block icon={<Focus className="size-3.5" />} onClick={onAddCameraKeyframe}>
                            {t("canvasExtra.directorWB.recordCameraKeyframe")}
                        </Button>
                    ) : null}
                </div>
            </InspectorSection>

            {/* 输出 (Output) */}
            <InspectorSection title={t("previs.v165.groupOutput")} defaultOpen>
                <Field label={t("scriptEditor.narrativeIntent")}>
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} value={shot.prompt} placeholder={t("canvasExtra.directorWB.shotIntentPlaceholder")} onChange={(event) => onUpdateShot({ prompt: event.target.value })} />
                </Field>
                {onExportClay && (
                    <Button block icon={<Video className="size-3.5" />} loading={recording} onClick={onExportClay}>
                        {t("canvasExtra.directorWB.exportClayVideo")}
                    </Button>
                )}
            </InspectorSection>
        </Inspector>
    );
}

export function Inspector({ title, children, showTitle = true, onTitleChange, onDuplicate, onDelete }: { title: string; children: ReactNode; showTitle?: boolean; onTitleChange: (value: string) => void; onDuplicate?: () => void; onDelete?: () => void }) {
    useI18n();
    return (
        <div className="director-inspector-content space-y-3 p-4">
            {showTitle && (
                <div className="flex items-center gap-2">
                    <Input aria-label={title} value={title} className="min-w-0 flex-1 font-medium" onChange={(event) => onTitleChange(event.target.value)} />
                    {onDuplicate ? (
                        <IconButton label={t("mcp.copy")} onClick={onDuplicate}>
                            <Copy className="size-4" />
                        </IconButton>
                    ) : null}
                    {onDelete ? (
                        <IconButton label={t("cloudAgent.delete")} onClick={onDelete}>
                            <Trash2 className="size-4" />
                        </IconButton>
                    ) : null}
                </div>
            )}
            {children}
        </div>
    );
}

export function TransformFields({
    transform,
    onChange,
    scaleLabel = t("canvasExtra.directorWB.scale"),
    scaleAxisLabels,
}: {
    transform: DirectorTransform;
    onChange: (transform: DirectorTransform) => void;
    scaleLabel?: string;
    scaleAxisLabels?: [string, string, string];
}) {
    useI18n();
    return (
        <>
            <Vec3Field label={t("nodeInfo.position")} value={transform.position} onChange={(position) => onChange({ ...transform, position })} />
            <Vec3Field label={t("canvasExtra.directorWB.rotation")} value={transform.rotation} step={0.05} onChange={(rotation) => onChange({ ...transform, rotation })} />
            <Vec3Field label={scaleLabel} value={transform.scale} step={0.1} axisLabels={scaleAxisLabels} onChange={(scale) => onChange({ ...transform, scale })} />
        </>
    );
}

export function BoneRotationFields({ rotation, onChange, onChangeComplete }: { rotation: DirectorQuat; onChange: (rotation: DirectorQuat) => void; onChangeComplete: () => void }) {
    useI18n();
    const initialDegrees = useMemo(() => {
        const euler = new Euler().setFromQuaternion(new Quaternion(...rotation), "XYZ");
        return [euler.x, euler.y, euler.z].map((value) => Number(((value * 180) / Math.PI).toFixed(1))) as DirectorVec3;
    }, [rotation]);
    const [degrees, setDegrees] = useState<DirectorVec3>(initialDegrees);
    const lastEmittedRotation = useRef<DirectorQuat | null>(null);
    useEffect(() => {
        if (lastEmittedRotation.current && sameDirectorQuaternion(rotation, lastEmittedRotation.current)) {
            lastEmittedRotation.current = null;
            return;
        }
        setDegrees(initialDegrees);
    }, [initialDegrees, rotation]);
    const updateAxis = (index: number, value: number) => {
        const next = degrees.map((entry, entryIndex) => (entryIndex === index ? value : entry)) as DirectorVec3;
        const radians = next.map((entry) => (entry * Math.PI) / 180) as DirectorVec3;
        const nextRotation = new Quaternion().setFromEuler(new Euler(radians[0], radians[1], radians[2], "XYZ")).toArray() as DirectorQuat;
        setDegrees(next);
        lastEmittedRotation.current = nextRotation;
        onChange(nextRotation);
    };
    return (
        <Field label={t("canvasExtra.directorWB.boneRotation")}>
            <div className="space-y-1.5">
                {degrees.map((value, index) => (
                    <div key={index} className="grid grid-cols-[18px_minmax(0,1fr)_48px] items-center gap-2">
                        <span className="text-[var(--fs-tiny)] font-medium opacity-65">{["X", "Y", "Z"][index]}</span>
                        <Slider className="m-0" min={-180} max={180} step={1} value={value} onChange={(next) => updateAxis(index, Array.isArray(next) ? (next[0] ?? 0) : next)} onChangeComplete={onChangeComplete} />
                        <span className="text-right text-[var(--fs-tiny)] tabular-nums opacity-65">{value.toFixed(1)}°</span>
                    </div>
                ))}
            </div>
        </Field>
    );
}

export function sameDirectorQuaternion(left: DirectorQuat, right: DirectorQuat) {
    const directDistance = left.reduce((sum, value, index) => sum + Math.abs(value - right[index]), 0);
    const inverseDistance = left.reduce((sum, value, index) => sum + Math.abs(value + right[index]), 0);
    return Math.min(directDistance, inverseDistance) < 0.0001;
}

const AXIS_BADGES = [
    { label: "X", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", text: "#f87171" },
    { label: "Y", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", text: "#34d399" },
    { label: "Z", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa" },
];

export function Vec3Field({ label, value, step = 0.1, axisLabels, onChange }: { label: string; value: DirectorVec3; step?: number; axisLabels?: [string, string, string]; onChange: (value: DirectorVec3) => void }) {
    useI18n();

    const handleScrub = (index: number, startX: number, startVal: number) => {
        const onPointerMove = (e: MouseEvent) => {
            const dx = e.clientX - startX;
            const delta = dx * (step || 0.1) * 0.2;
            const nextVal = Number((startVal + delta).toFixed(2));
            onChange(value.map((entry, itemIndex) => (itemIndex === index ? nextVal : entry)) as DirectorVec3);
        };
        const onPointerUp = () => {
            window.removeEventListener("mousemove", onPointerMove);
            window.removeEventListener("mouseup", onPointerUp);
        };
        window.addEventListener("mousemove", onPointerMove);
        window.addEventListener("mouseup", onPointerUp);
    };

    return (
        <Field label={label}>
            <div className="grid grid-cols-3 gap-1.5">
                {value.map((item, index) => {
                    const badge = AXIS_BADGES[index];
                    return (
                        <div key={index} className="director-axis-field relative flex items-center">
                            <span
                                className="director-axis-badge"
                                style={{ color: badge.text, backgroundColor: badge.bg, borderColor: badge.color }}
                                title="按住拖拽微调"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleScrub(index, e.clientX, item);
                                }}
                            >
                                {badge.label}
                            </span>
                            <InputNumber
                                className="w-full director-axis-input"
                                size="small"
                                controls={false}
                                step={step}
                                value={Number(item.toFixed(2))}
                                onChange={(next) => onChange(value.map((entry, itemIndex) => (itemIndex === index ? (next ?? 0) : entry)) as DirectorVec3)}
                            />
                            {axisLabels ? <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] opacity-45">{axisLabels[index]}</span> : null}
                        </div>
                    );
                })}
            </div>
        </Field>
    );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
    useI18n();
    return (
        <label className="director-property-field block">
            <span className="mb-1 block text-[var(--fs-label)] opacity-55">{label}</span>
            {children}
        </label>
    );
}

/**
 * 场景列表行。选择按钮点完必须释放焦点：
 *「点选对象 -> 按 Delete」是 delete-selected 快捷键的主流程，
 * 焦点留在按钮上会让守卫把 Delete 吃掉。
 */
export function SceneRow({ active, icon, label, onClick, onDelete }: { active?: boolean; icon: ReactElement; label: string; onClick: () => void; onDelete?: () => void }) {
    useI18n();
    return (
        <div className={`flex h-8 w-full items-center gap-1 px-1 text-left text-xs transition ${active ? "bg-black/10 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"}`}>
            <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-1 text-left"
                onClick={(event) => {
                    onClick();
                    releaseDirectorFocusAfterPointer(event);
                }}
            >
                <span className="[&>svg]:size-3.5">{icon}</span>
                <span className="truncate">{label}</span>
            </button>
            {onDelete ? (
                <button
                    type="button"
                    aria-label={t("previs.v165.message293", { p0: label })}
                    title={t("previs.v165.message293", { p0: label })}
                    className="grid size-6 shrink-0 place-items-center rounded opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete();
                        releaseDirectorFocusAfterPointer(event);
                    }}
                >
                    <Trash2 className="size-3.5" />
                </button>
            ) : null}
        </div>
    );
}

export function AddMenuButton({ label, items }: { label: string; items: MenuProps["items"] }) {
    useI18n();
    return (
        <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items }}>
            <button type="button" aria-label={label} title={label} className="grid size-8 shrink-0 place-items-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10">
                <Plus className="size-3.5" />
            </button>
        </Dropdown>
    );
}

export function IconButton({ label, disabled, children, onClick }: { label: string; disabled?: boolean; children: ReactNode; onClick: () => void }) {
    useI18n();
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            className="grid size-8 shrink-0 place-items-center rounded-md transition hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
            onClick={(event) => {
                onClick();
                releaseDirectorFocusAfterPointer(event);
            }}
        >
            {children}
        </button>
    );
}
