import { matchAudioValidationMessageKey } from "./ddcat-updates";
import type { MessageKey } from "./messages";
import type { useI18n } from "./use-i18n";

type I18n = Pick<ReturnType<typeof useI18n>, "t" | "number">;
const fixed: Record<string, MessageKey> = {
    "当前输入不受支持": "modelValidation.input",
    "图片模型不支持参考视频": "modelValidation.imageVideo",
    "图片模型不支持参考音频": "modelValidation.imageAudio",
    "文本模型不支持参考音频": "modelValidation.textAudio",
    "角色配音一次只能引用一个角色卡": "modelValidation.oneCharacter",
    "音频模型只接受文本或单个角色卡输入": "modelValidation.audioInput",
};
const labels: Record<string, MessageKey> = {
    "尺寸": "modelValidation.size", "质量": "modelValidation.quality",
    "透明背景": "modelValidation.transparent", "输出数量": "modelPickerCapability.count",
    "时长": "modelValidation.duration", "视频时长": "modelValidation.videoDuration",
    "分辨率": "modelValidation.resolution", "同步音频": "modelValidation.syncAudio",
    "水印设置": "modelValidation.watermark", "音色": "modelPickerCapability.voice",
    "配音方式": "modelValidation.mode",
    "音频格式": "modelPickerCapability.format", "语速": "modelPickerCapability.speed",
    "生成类型": "modelValidation.type", "生成模式": "modelValidation.mode",
    "文生视频": "modelPickerPrice.textVideo", "图生视频": "modelPickerPrice.imageVideo",
    "音频生视频": "modelPickerCapability.audioVideo", "全模态参考": "modelPickerCapability.reference",
    "视频续写": "modelPickerCapability.extend",
};
const kinds: Record<string, MessageKey> = {
    image: "modelPickerShell.image", video: "modelPickerShell.video",
    audio: "modelPickerShell.audio", text: "modelPickerShell.text",
};

/** Display only: validation decisions and original error contracts remain unchanged. */
export function localizeModelCompatibilityMessage(message: string, { t, number }: I18n): string {
    const audioValidationKey = matchAudioValidationMessageKey(message);
    if (audioValidationKey) return t(audioValidationKey);
    if (Object.hasOwn(fixed, message)) return t(fixed[message]);
    const maximum = /^最多支持 (\d+(?:\.\d+)?) (张参考图|个参考视频|个参考音频)$/.exec(message);
    if (maximum) return t(maximum[2] === "张参考图" ? "modelValidation.maxImages" : maximum[2] === "个参考视频" ? "modelValidation.maxVideos" : "modelValidation.maxAudios", { count: number(Number(maximum[1])) });
    const input = /^不支持(image|video|audio|text)输入$/.exec(message);
    if (input) return t("modelValidation.kindInput", { kind: t(kinds[input[1]]) });
    const range = /^(image|video|audio|text)输入需为 (-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?) 个$/.exec(message);
    if (range) return t("modelValidation.range", { kind: t(kinds[range[1]]), min: number(Number(range[2])), max: number(Number(range[3])) });
    const current = /^不支持当前(.+)$/.exec(message);
    if (current) return t("modelValidation.current", { label: Object.hasOwn(labels, current[1]) ? t(labels[current[1]]) : current[1] });
    const unsupported = /^不支持(.+)$/.exec(message);
    if (unsupported && Object.hasOwn(labels, unsupported[1])) return t("modelValidation.unsupported", { label: t(labels[unsupported[1]]) });
    return message;
}
