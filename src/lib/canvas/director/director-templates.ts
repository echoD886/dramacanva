import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { MessageKey } from "@/i18n/messages";
import { stageSpringRecord } from "./director-spring-record";
import { nanoid } from "nanoid";

import { createDirectorActor, createDirectorCamera, createDirectorStudio, createDirectorObject, directorFocalLengthToFov, DIRECTOR_ACTOR_COLORS } from "@/lib/canvas/director/director-scene-data";
import type { DirectorCamera, DirectorObject, DirectorScene, DirectorShot } from "@/types/director";
import { createDirectorScenePreset } from "./director-presets";

/**
 * 新建场景模板。
 *
 * 为什么存在：createDirectorScene 无条件塞一个默认演员，产品/空场景根本不需要它，
 * 而双人、走位这类常见开局每次都要手工摆一遍。模板把「开局布局」变成显式选择。
 *
 * 硬约束：
 * - 纯函数 + 确定性布局。同一模板每次生成的结构完全一致，只有 id 与时间戳不同。
 * - 每次调用都产生独立 id（工厂内部 nanoid），两个实例不会共享对象身份。
 * - 不改 DirectorScene schema/version：模板只是预填内容，不引入新字段。
 * - 人物/产品模板的 XZ 占位不重叠；建筑模板允许地面承载道具。
 */

export type DirectorTemplateId = "empty" | "monologue" | "dialogue" | "blocking" | "product" | "subway-platform-v1" | "spring-record";

export type DirectorTemplate = {
    id: DirectorTemplateId;
    name: string;
    description: string;
    /** 列表里给用户的预期提示，不参与生成。 */
    summary: string;
};

/** 展示顺序即用户看到的顺序：空场景在最前，其余按上手复杂度递增。 */
export const DIRECTOR_TEMPLATES: DirectorTemplate[] = [
    {
        id: "empty",
        get name() {
            return t("canvasExtra.directorTpl.emptyName");
        },
        get description() {
            return t("canvasExtra.directorTpl.emptyDesc");
        },
        get summary() {
            return t("canvasExtra.directorTpl.emptySummary");
        },
    },
    {
        id: "monologue",
        get name() {
            return t("canvasExtra.directorTpl.monologueName");
        },
        get description() {
            return t("canvasExtra.directorTpl.monologueDesc");
        },
        get summary() {
            return t("canvasExtra.directorTpl.monologueSummary");
        },
    },
    {
        id: "dialogue",
        get name() {
            return t("canvasExtra.directorTpl.dialogueName");
        },
        get description() {
            return t("canvasExtra.directorTpl.dialogueDesc");
        },
        get summary() {
            return t("canvasExtra.directorTpl.dialogueSummary");
        },
    },
    {
        id: "blocking",
        get name() {
            return t("canvasExtra.directorTpl.blockingName");
        },
        get description() {
            return t("canvasExtra.directorTpl.blockingDesc");
        },
        get summary() {
            return t("canvasExtra.directorTpl.blockingSummary");
        },
    },
    {
        id: "product",
        get name() {
            return t("canvasExtra.directorTpl.productName");
        },
        get description() {
            return t("canvasExtra.directorTpl.productDesc");
        },
        get summary() {
            return t("canvasExtra.directorTpl.productSummary");
        },
    },
    {
        id: "subway-platform-v1",
        get name() {
            return t("directorR3.subwayPlatform");
        },
        get description() {
            return t("directorR3.subwayPlatformDesc");
        },
        get summary() {
            return "16 × 6 m";
        },
    },
    {
        id: "spring-record",
        get name() {
            return t("miscPages.starterDirectorScene");
        },
        get description() {
            return t("miscPages.springRehearsalTemplate");
        },
        summary: "16:9 · 24 fps",
    },
];

type TemplateBlueprint = {
    objects: DirectorObject[];
    camera: DirectorCamera;
    shot: Omit<DirectorShot, "id" | "cameraId">;
};

/** 按模板意图摆机位。focalLength 与 fov 一起写，保证两者自洽。 */
function templateCamera(input: { name: string; position: DirectorCamera["transform"]["position"]; target: DirectorCamera["target"]; focalLength: number; focusDistance: number; aperture: number }): DirectorCamera {
    const base = createDirectorCamera(input.name);
    return {
        ...base,
        transform: { ...base.transform, position: input.position },
        target: input.target,
        focalLength: input.focalLength,
        fov: directorFocalLengthToFov(input.focalLength),
        aperture: input.aperture,
        focusDistance: input.focusDistance,
    };
}

/** 演员朝向：绕 Y 轴。左侧演员朝右为 +PI/2，右侧演员朝左为 -PI/2。 */
function facing(actor: DirectorObject, yaw: number): DirectorObject {
    return { ...actor, transform: { ...actor.transform, rotation: [0, yaw, 0] } };
}

function buildBlueprint(id: DirectorTemplateId): TemplateBlueprint {
    if (id === "subway-platform-v1") {
        return {
            objects: createDirectorScenePreset("subwayPlatform"),
            camera: templateCamera({ name: t("previs.v165.message203"), position: [10, 8, 15], target: [0, 1, 0], focalLength: 28, focusDistance: 19, aperture: 4 }),
            shot: { name: t("previs.v165.message201"), duration: 8, fps: 24, shotSize: "wide", cameraMove: "static", prompt: "" },
        };
    }
    if (id === "monologue") {
        return {
            objects: [createDirectorActor(t("previs.v165.message199"), [0, 0, 0], DIRECTOR_ACTOR_COLORS[0])],
            camera: templateCamera({ name: t("previs.v165.message203"), position: [1.5, 1.65, 3.1], target: [0, 1.15, 0], focalLength: 50, focusDistance: 3.4, aperture: 2.2 }),
            shot: { name: t("previs.v165.message201"), duration: 5, fps: 24, shotSize: "medium", cameraMove: "static", prompt: "" },
        };
    }

    if (id === "dialogue") {
        // dx = 1.6 >= (0.8 + 0.8) / 2 + 0.25 = 1.05，两名演员必然不重叠。
        return {
            objects: [facing(createDirectorActor(t("previs.v165.message199"), [-0.8, 0, 0.3], DIRECTOR_ACTOR_COLORS[0]), Math.PI / 2), facing(createDirectorActor(t("previs.v165.message216"), [0.8, 0, -0.3], DIRECTOR_ACTOR_COLORS[2]), -Math.PI / 2)],
            camera: templateCamera({ name: t("previs.v165.message203"), position: [2.9, 1.7, 3.4], target: [0, 1.1, 0], focalLength: 40, focusDistance: 4.2, aperture: 2.8 }),
            shot: { name: t("previs.v165.message201"), duration: 6, fps: 24, shotSize: "medium", cameraMove: "static", prompt: "" },
        };
    }

    if (id === "blocking") {
        // 三名演员两两 dx >= 1.8，全部大于 1.05 阈值。
        return {
            objects: [
                createDirectorActor(t("previs.v165.message199"), [-1.8, 0, 0.6], DIRECTOR_ACTOR_COLORS[0]),
                createDirectorActor(t("previs.v165.message216"), [0, 0, -0.4], DIRECTOR_ACTOR_COLORS[2]),
                createDirectorActor(t("previs.v165.message217"), [1.8, 0, 0.8], DIRECTOR_ACTOR_COLORS[3]),
            ],
            camera: templateCamera({ name: t("previs.v165.message203"), position: [0.6, 3.1, 7.4], target: [0, 1, 0], focalLength: 28, focusDistance: 7.6, aperture: 4 }),
            shot: { name: t("previs.v165.message201"), duration: 8, fps: 24, shotSize: "wide", cameraMove: "static", prompt: "" },
        };
    }

    if (id === "product") {
        // 产品镜头没有演员。背景板靠 dz=1.35 拉开，侧面道具靠 dx=1.15 拉开。
        const product = createDirectorObject("box", t("previs.v165.message218"), [0, 0.5, 0], "#b8c0ca");
        const backdrop = createDirectorObject("plane", t("previs.v165.message219"), [0, 1.4, -1.35], "#e8ebef");
        const prop = createDirectorObject("cylinder", t("previs.v165.message220"), [1.15, 0.4, 0.5], "#8795a5");
        return {
            objects: [
                { ...product, transform: { ...product.transform, scale: [0.9, 0.9, 0.9] } },
                { ...backdrop, transform: { ...backdrop.transform, scale: [3.2, 2, 1] } },
                { ...prop, transform: { ...prop.transform, scale: [0.5, 0.8, 0.5] } },
            ],
            camera: templateCamera({ name: t("previs.v165.message203"), position: [1.1, 1.05, 2.35], target: [0, 0.55, 0], focalLength: 85, focusDistance: 2.6, aperture: 2.8 }),
            shot: { name: t("previs.v165.message201"), duration: 4, fps: 24, shotSize: "close_up", cameraMove: "push_in", prompt: "" },
        };
    }

    return {
        objects: [],
        camera: templateCamera({ name: t("previs.v165.message203"), position: [4.8, 2.7, 6.8], target: [0, 1, 0], focalLength: 35, focusDistance: 5, aperture: 2.8 }),
        shot: { name: t("previs.v165.message201"), duration: 5, fps: 24, shotSize: "medium", cameraMove: "static", prompt: "" },
    };
}

/**
 * 按模板生成全新场景。
 * 未知 id 回落到空场景 —— 宁可少给内容，也不要偷偷塞回默认演员。
 */
export function createDirectorSceneFromTemplate(templateId: DirectorTemplateId, title = t("previs.v165.message198"), translate: (key: MessageKey) => string = t): DirectorScene {
    const blueprint = buildBlueprint(templateId);
    const now = new Date().toISOString();
    const shotId = nanoid();
    const scene: DirectorScene = {
        id: nanoid(),
        version: 1,
        title,
        ...createDirectorStudio(),
        environment: { mode: "color" },
        gridVisible: true,
        objects: blueprint.objects,
        cameras: [blueprint.camera],
        shots: [{ ...blueprint.shot, id: shotId, cameraId: blueprint.camera.id }],
        activeShotId: shotId,
        createdAt: now,
        updatedAt: now,
    };
    return templateId === "spring-record" ? stageSpringRecord(scene, translate) : scene;
}
