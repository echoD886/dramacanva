export function finalMediaSize(width?: number, height?: number) {
    if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
    const w = Math.round(width),
        h = Math.round(height);
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const divisor = gcd(w, h);
    return { width: w, height: h, ratio: w / h, label: `${w / divisor}:${h / divisor}`, compact: w / h < 4 / 3 };
}
