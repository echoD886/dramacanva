import copy from "copy-to-clipboard";

export async function copyText(value: string) {
    try {
        await navigator.clipboard.writeText(value);
    } catch {
        if (!copy(value)) throw new Error("无法复制链接，请手动复制浏览器地址栏");
    }
}
