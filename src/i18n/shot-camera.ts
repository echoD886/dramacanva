import type { MessageKey } from "./messages";
import type { useI18n } from "./use-i18n";

const labels: Record<string, MessageKey> = {
    "特写": "shotCamera.extremeClose",
    "近景": "shotCamera.close",
    "中景": "shotCamera.medium",
    "全景": "shotCamera.full",
    "远景": "shotCamera.long",
    "平视": "shotCamera.eye",
    "俯拍": "shotCamera.high",
    "仰拍": "shotCamera.low",
    "侧面": "shotCamera.side",
    "过肩": "shotCamera.shoulder",
    "固定": "shotCamera.static",
    "推镜": "shotCamera.push",
    "拉镜": "shotCamera.pull",
    "摇镜": "shotCamera.pan",
    "移镜": "shotCamera.truck",
    "跟拍": "shotCamera.follow",
};

export function shotCameraLabel(value: string, t: ReturnType<typeof useI18n>["t"]): string {
    return Object.hasOwn(labels, value) ? t(labels[value]) : value;
}
