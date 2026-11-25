/**
 * 滚轮 / 触控板捏合的缩放倍率。结果总是乘到当前缩放上，因此在 5% 和 150% 时每格的相对变化一致。
 *
 * - 离散鼠标滚轮按“格”计算，每格 ≈14%（与 Windows Chrome 每格 deltaY=100 时的原有手感一致）：
 *   deltaMode=1（行，Firefox 每格 3 行）、deltaMode=2（页）、像素模式下接近 100 整数倍的 delta，
 *   以及 macOS Chrome 普通鼠标特有的 4.000244140625px（0.1 行 × 40px）整数倍 delta。
 *   后者以前被当作连续滚动，每格只有 0.5%（Ctrl 时约 1.6%），20 格几乎不动。
 * - 触控板捏合（Chrome 合成的 Ctrl/Meta + 小数 delta）：exp(-deltaY / 100)，与手指张合比例 1:1。
 * - 其余无修饰键的连续像素滚动保持原速率。
 */
export const WHEEL_ZOOM_STEP = Math.pow(1.1, 100 / 72);
const MAC_MOUSE_WHEEL_QUANTUM = 4.000244140625;
const WHEEL_ZOOM_DELTA = 72;

export type CanvasWheelZoomInput = {
    deltaY: number;
    deltaMode: number;
    pinch: boolean;
};

export function canvasWheelNotches(deltaY: number, deltaMode: number): number | null {
    if (deltaMode === 1) return deltaY / 3;
    if (deltaMode === 2) return deltaY;
    const abs = Math.abs(deltaY);
    if (abs >= 80 && Math.abs(abs - Math.round(abs / 100) * 100) < 1) return deltaY / 100;
    const quanta = Math.round(abs / MAC_MOUSE_WHEEL_QUANTUM);
    if (quanta >= 1 && Math.abs(abs - quanta * MAC_MOUSE_WHEEL_QUANTUM) < 1e-6) return Math.sign(deltaY) * quanta;
    return null;
}

export function canvasWheelZoomFactor({ deltaY, deltaMode, pinch }: CanvasWheelZoomInput) {
    const notches = canvasWheelNotches(deltaY, deltaMode);
    // 单个事件最多按 1.2 格（macOS 加速滚动最多 3 格）计算，避免一次整页 delta 把画布直接缩到极限。
    if (notches !== null) {
        const cap = deltaMode === 0 && Math.abs(deltaY) < 80 ? 3 : 1.2;
        return Math.pow(WHEEL_ZOOM_STEP, -Math.max(-cap, Math.min(cap, notches)));
    }
    if (pinch) return Math.exp(-Math.max(-50, Math.min(50, deltaY)) / 100);
    return Math.pow(1.1, -Math.max(-120, Math.min(120, deltaY)) / WHEEL_ZOOM_DELTA);
}
