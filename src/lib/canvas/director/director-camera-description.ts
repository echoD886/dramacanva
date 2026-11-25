import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { DirectorCamera, DirectorScene, DirectorShot } from "@/types/director";

const shotSizeLabels: Record<DirectorShot["shotSize"], string> = {
    get extreme_wide() {
        return t("canvasExtra.directorWB.shotExtremeWide");
    },
    get wide() {
        return t("scriptEditor.shotSizeLong");
    },
    get full() {
        return t("canvasExtra.directorWB.shotFull");
    },
    get medium() {
        return t("canvasDialog.angle.medium");
    },
    get close_up() {
        return t("previs.v165.message168");
    },
    get extreme_close_up() {
        return t("canvasExtra.directorWB.shotExtremeCloseUp");
    },
};

const cameraMoveLabels: Record<DirectorShot["cameraMove"], string> = {
    get truck_left() {
        return t("directorR3.truck_left");
    },
    get truck_right() {
        return t("directorR3.truck_right");
    },
    get pedestal_up() {
        return t("directorR3.pedestal_up");
    },
    get pedestal_down() {
        return t("directorR3.pedestal_down");
    },
    get static() {
        return t("previs.v165.message169");
    },
    get push_in() {
        return t("previs.v165.message170");
    },
    get pull_out() {
        return t("previs.v165.message171");
    },
    get pan_left() {
        return t("previs.v165.message172");
    },
    get pan_right() {
        return t("previs.v165.message173");
    },
    get tilt_up() {
        return t("previs.v165.message174");
    },
    get tilt_down() {
        return t("previs.v165.message175");
    },
    get orbit_left() {
        return t("previs.v165.message176");
    },
    get orbit_right() {
        return t("previs.v165.message177");
    },
    get handheld() {
        return t("previs.v165.message178");
    },
};

export function compileDirectorCameraDescription(scene: DirectorScene, shot: DirectorShot) {
    const camera = scene.cameras.find((item) => item.id === shot.cameraId) || scene.cameras[0];
    return [t("previs.v165.message274", { p0: shotSizeLabels[shot.shotSize], p1: cameraMoveLabels[shot.cameraMove], p2: formatNumber(shot.duration) }), camera ? cameraPrompt(camera) : ""].filter(Boolean).join("\n");
}

function cameraPrompt(camera: DirectorCamera) {
    const [x, y, z] = camera.transform.position;
    const [tx, ty, tz] = camera.target;
    const height = y < ty - 0.4 ? t("previs.v165.message181") : y > ty + 1.2 ? t("previs.v165.message182") : t("previs.v165.message183");
    const side = x < tx - 0.8 ? t("previs.v165.message184") : x > tx + 0.8 ? t("previs.v165.message185") : t("previs.v165.message186");
    const distance = Math.hypot(x - tx, y - ty, z - tz);
    return t("previs.v165.message283", {
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

function formatNumber(value: number) {
    return Number(value.toFixed(2));
}
