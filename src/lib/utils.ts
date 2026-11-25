import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** 普通对象判断：排除 null 与数组。全站统一用这一份，避免各处版本对数组的处理不一致。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 把数值限制在 [min, max]；可用区间为空（max < min）时返回 min，避免算出负的位置或尺寸。 */
export function clamp(value: number, min: number, max: number) {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
}
