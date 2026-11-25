import { worldEngineText as wt } from "@/i18n/world-engine-text";
import type { PrevisCamera, PrevisEnvironment, PrevisMotionPath, PrevisObject, PrevisScene, PrevisShot, PrevisWorld } from "@/types/previs";
import { previsActorArchetypeLabel, previsColorLabel, previsPoseLabel } from "@/lib/canvas/previs/previs-scene";
import { resolvePrevisCatalogProp, resolvePrevisLayoutTemplate } from "@/lib/canvas/previs/previs-prop-catalog";
import { formatPrevisTimeOfDay, PREVIS_GROUND_OPTIONS, PREVIS_WEATHER_OPTIONS } from "@/lib/canvas/previs/previs-world";
import { previsActorPositionAt, resolvePrevisTravelStyle } from "@/lib/canvas/previs/previs-travel";
import { previsCameraMovePhrase, resolvePrevisCameraTechnique } from "@/lib/canvas/previs/previs-camera-techniques";
import { planPrevisMotionPath, PREVIS_PATH_EASINGS } from "@/lib/canvas/previs/previs-motion-path";

const shotSizeLabels: Record<PrevisShot["shotSize"], string> = {
    extreme_wide: "大远景",
    wide: "远景",
    full: "全身景",
    medium: "中景",
    close_up: "近景特写",
    extreme_close_up: "大特写",
};

const cameraMoveLabels: Record<PrevisShot["cameraMove"], string> = {
    static: "固定机位",
    push_in: "镜头缓慢推进",
    pull_out: "镜头缓慢拉远",
    pan_left: "镜头向左横摇",
    pan_right: "镜头向右横摇",
    tilt_up: "镜头向上摇摄",
    tilt_down: "镜头向下摇摄",
    orbit_left: "镜头向左环绕主体",
    orbit_right: "镜头向右环绕主体",
    handheld: "克制的手持摄影运动",
};

export function compilePrevisPrompt(scene: PrevisScene, shot: PrevisShot) {
    const camera = scene.cameras.find((item) => item.id === shot.cameraId) || scene.cameras[0];
    const visibleObjects = scene.objects.filter((item) => item.visible);
    const actors = visibleObjects.filter((item) => item.kind === "actor" || item.primitive === "character");
    const moves = camera ? cameraMovesPrompt(scene, camera) : "";
    return [
        shot.prompt.trim(),
        wt("镜头设计：{p0}，{p1}，时长 {p2} 秒。", { p0: shotSizeLabels[shot.shotSize], p1: moves ? "运镜按下方时间线进行" : cameraMoveLabels[shot.cameraMove], p2: formatNumber(shot.duration) }),
        camera ? cameraPrompt(camera) : "",
        moves,
        scene.world ? worldPrompt(scene.world) : environmentPrompt(scene.environment),
        layoutPrompt(visibleObjects),
        travelPrompt(actors),
        pathPrompt(shot, visibleObjects, camera),
        actors.length ? wt("角色原型与颜色映射：{p0}。生成视频时保持每个角色的体型、轮廓和身份稳定。", { p0: actors.map((actor) => `${wt(previsActorArchetypeLabel(actor.archetype))}${wt(actor.name)}（${actor.color}）`).join("；") }) : "",
        visibleObjects.some((item) => item.kind !== "layout")
            ? wt("空间调度：{p0}。", {
                  p0: visibleObjects
                      .filter((item) => item.kind !== "layout")
                      .map(objectPrompt)
                      .join("；"),
              })
            : "",
        assetReferencePrompt(scene),
        scene.world ? "" : wt("灯光：{p0}。", { p0: scene.lights.map((light) => wt("{p0}{p1}强度{p2}", { p0: light.name, p1: formatNumber(light.intensity), p2: light.color })).join("，") }),
        wt("保持角色、道具、空间方向、光线方向和镜头轴线连续，遵循真实摄影机透视与物理遮挡。"),
    ]
        .filter(Boolean)
        .join("\n");
}

function environmentPrompt(environment?: PrevisEnvironment) {
    if (!environment || environment.mode !== "panorama" || !environment.url) return wt("背景环境：使用工作台灰色预览背景。");
    return wt(`背景环境：使用已绑定的 360° 全景图作为空间背景，保持全景图的水平朝向与镜头旋转连续；白膜角色只参考站位、比例、动作和遮挡，不把全景图拉伸成普通平面。`);
}

function timeOfDayLabel(hours: number) {
    if (hours < 5 || hours >= 20) return "夜晚";
    if (hours < 8) return "清晨";
    if (hours < 11) return "上午";
    if (hours < 14) return "正午";
    if (hours < 17) return "午后";
    return wt("黄昏");
}

function worldPrompt(world: PrevisWorld) {
    const weather = PREVIS_WEATHER_OPTIONS.find((item) => item.value === world.weather)?.label ?? "晴";
    const ground = PREVIS_GROUND_OPTIONS.find((item) => item.value === world.ground)?.label ?? "草地";
    return wt("环境与光线：{p0}（{p1}），天气{p2}，远景为{p3}{p4}；光线方向、色温与阴影长度符合该时刻的太阳位置。", {
        p0: timeOfDayLabel(world.timeOfDay),
        p1: formatPrevisTimeOfDay(world.timeOfDay),
        p2: weather,
        p3: ground,
        p4: world.horizon ? "与连绵远山" : "",
    });
}

function layoutPrompt(objects: PrevisObject[]) {
    const layouts = objects.filter((item) => item.kind === "layout" && item.layout);
    if (!layouts.length) return "";
    return wt("场景布景：{p0}。白膜只表达建筑体量、街道走向与空间层次，生成时补全真实材质与细节。", {
        p0: layouts
            .map((item) => {
                const info = resolvePrevisLayoutTemplate(item.layout?.template);
                return wt("{p0}（{p1}，约 {p2} 米见方{p3}{p4}）", { p0: item.name, p1: info?.name ?? "布景", p2: Math.round(item.layout?.size ?? 0), p3: info ? `，${wt(info.hint)}` : "", p4: item.layout?.crowd ? "，街上有往来行人" : "" });
            })
            .join("；"),
    });
}

function travelPrompt(actors: PrevisObject[]) {
    const lines = actors.flatMap((actor) =>
        (actor.travels ?? []).map((travel) => {
            const style = resolvePrevisTravelStyle(travel.style);
            const from = previsActorPositionAt(actor, travel.start);
            const to = previsActorPositionAt(actor, travel.start + travel.duration);
            const height = travel.height && travel.height > 0 ? wt("，离地约 {p0} 米", { p0: formatNumber(travel.height) }) : "";
            const flash = travel.style === "teleport" ? "，原地残影消失、终点瞬间出现" : "";
            return wt("{p0} 在 {p1}–{p2} 秒从 ({p3}, {p4}) {p5} ({p6}, {p7}){p8}{p9}", {
                p0: actor.name,
                p1: formatNumber(travel.start),
                p2: formatNumber(travel.start + travel.duration),
                p3: formatNumber(from[0]),
                p4: formatNumber(from[2]),
                p5: style.verb,
                p6: formatNumber(to[0]),
                p7: formatNumber(to[2]),
                p8: height,
                p9: flash,
            });
        }),
    );
    return lines.length ? wt("人物位移：{p0}。移动方向、速度与时长与预演一致。", { p0: lines.join("；") }) : "";
}

const FLYING_TRAVELS = new Set(["fly", "sword_fly", "float"]);

/** 运镜时间线：每段「起止秒 + 手法短语」；跟拍飞行 / 御剑的人物时补一句机位随之升空。 */
function cameraMovesPrompt(scene: PrevisScene, camera: PrevisCamera) {
    const moves = (camera.moves ?? []).filter((move) => resolvePrevisCameraTechnique(move.technique)).toSorted((left, right) => left.start - right.start);
    if (!moves.length) return "";
    const lines = moves.map((move) => {
        let phrase = previsCameraMovePhrase(move, scene);
        if (move.technique === "follow" && move.subjectId) {
            const subject = scene.objects.find((item) => item.id === move.subjectId);
            const flight = subject?.travels?.find((travel) => FLYING_TRAVELS.has(travel.style) && travel.start < move.start + move.duration && move.start < travel.start + travel.duration);
            if (subject && flight) phrase += wt("，{p0}{p1}升空时机位一起升空、保持跟随", { p0: subject.name, p1: resolvePrevisTravelStyle(flight.style).label });
        }
        return wt("{p0}–{p1} 秒{p2}", { p0: formatNumber(move.start), p1: formatNumber(move.start + move.duration), p2: phrase });
    });
    return wt("运镜：{p0}。机位运动的方向、幅度与节奏与预演一致。", { p0: lines.join("；") });
}

/** 路径动画：起止时间、途经点数、运动规律、停留与最高离地高度。 */
function pathPrompt(shot: PrevisShot, objects: PrevisObject[], camera?: PrevisCamera) {
    const describe = (name: string, path: PrevisMotionPath) => {
        let plan;
        try {
            plan = planPrevisMotionPath(path, shot.duration);
        } catch {
            return "";
        }
        if (plan.stationary) return "";
        const first = path.points[0];
        const last = path.points[path.points.length - 1];
        const law = PREVIS_PATH_EASINGS.find((item) => item.value === (path.easing ?? "linear"))?.label ?? "匀速";
        const top = Math.max(...path.points.map((point) => point[1]));
        const holds = (path.holds ?? []).map((value, index) => (value > 0 ? wt("在第 {p0} 个途经点停留 {p1} 秒", { p0: index + 1, p1: formatNumber(value) }) : "")).filter(Boolean);
        return [
            wt("{p0} 在 {p1}–{p2} 秒沿{p3}路径{p4}移动，经过 {p5} 个途经点，从 ({p6}, {p7}) 到 ({p8}, {p9})，全长约 {p10} 米", {
                p0: name,
                p1: formatNumber(plan.start),
                p2: formatNumber(plan.end),
                p3: path.curve ? "平滑曲线" : "折线",
                p4: law,
                p5: path.points.length,
                p6: formatNumber(first[0]),
                p7: formatNumber(first[2]),
                p8: formatNumber(last[0]),
                p9: formatNumber(last[2]),
                p10: formatNumber(plan.length),
            }),
            top > 0.05 ? wt("离地高度在 {p0}–{p1} 米之间变化", { p0: formatNumber(Math.min(...path.points.map((point) => point[1]))), p1: formatNumber(top) }) : "",
            ...holds,
        ]
            .filter(Boolean)
            .join("，");
    };
    const lines = [...objects.filter((object) => object.motionPath).map((object) => describe(object.name, object.motionPath!)), camera?.motionPath ? describe(wt("摄影机{p0}", { p0: camera.name }), camera.motionPath) : ""].filter(Boolean);
    return lines.length ? wt("路径运动：{p0}。速度变化、停顿与高度起伏与预演一致。", { p0: lines.join("；") }) : "";
}

function assetReferencePrompt(scene: PrevisScene) {
    const assets = scene.objects.filter((object) => object.visible && (object.sourceNodeId || object.assetId));
    if (!assets.length) return "";
    return wt("资产引用：{p0}。生成时优先参考这些已绑定资产，并保持其主体身份、构图关系和空间方向。", { p0: assets.map((object) => object.name).join("；") });
}

function cameraPrompt(camera: PrevisCamera) {
    const [x, y, z] = camera.transform.position;
    const [tx, ty, tz] = camera.target;
    const height = y < ty - 0.4 ? "低机位" : y > ty + 1.2 ? "高机位" : "平视机位";
    const side = x < tx - 0.8 ? "主体左前侧" : x > tx + 0.8 ? "主体右前侧" : "主体正面";
    const distance = Math.hypot(x - tx, y - ty, z - tz);
    return wt("摄影机：{p0}mm 焦段，f/{p1} 光圈，焦点距离 {p2} 米，{p3}，位于{p4}，机位距离约 {p5} 米，焦点指向 ({p6}, {p7}, {p8})，景深遵循真实镜头光学。", {
        p0: formatNumber(camera.focalLength),
        p1: formatNumber(camera.aperture),
        p2: formatNumber(camera.focusDistance),
        p3: height,
        p4: side,
        p5: formatNumber(distance),
        p6: formatNumber(tx),
        p7: formatNumber(ty),
        p8: formatNumber(tz),
    });
}

function objectPrompt(object: PrevisObject) {
    const [x, y, z] = object.transform.position;
    const pose = object.pose ? wt("，姿势{p0}", { p0: previsPoseLabel(object.pose) }) : "";
    const archetype = object.kind === "actor" || object.primitive === "character" ? wt("，角色原型{p0}", { p0: previsActorArchetypeLabel(object.archetype) }) : "";
    const color = object.kind === "actor" || object.primitive === "character" ? wt("，{p0}参考色", { p0: previsColorLabel(object.color) }) : "";
    const catalog = object.kind === "prop" ? resolvePrevisCatalogProp(object.propId) : undefined;
    const kindLabel = catalog && catalog.name !== object.name ? `（${wt(catalog.name)}）` : "";
    return wt("{p0}{p1}{p2}{p3}位于 ({p4}, {p5}, {p6}){p7}", { p0: object.name, p1: kindLabel, p2: archetype, p3: color, p4: formatNumber(x), p5: formatNumber(y), p6: formatNumber(z), p7: pose });
}

function formatNumber(value: number) {
    return Number(value.toFixed(2));
}
