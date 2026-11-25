export type DirectorPlanLabel = { id: string; text: string; point: number[]; isCamera?: boolean };
type Rect = { x: number; y: number; width: number; height: number };

function intersectArea(r1: Rect, r2: Rect): number {
    const xOverlap = Math.max(0, Math.min(r1.x + r1.width, r2.x + r2.width) - Math.max(r1.x, r2.x));
    const yOverlap = Math.max(0, Math.min(r1.y + r1.height, r2.y + r2.height) - Math.max(r1.y, r2.y));
    return xOverlap * yOverlap;
}

/** Keep endpoint names apart from each other, camera position, and current A/B station badges. */
export function layoutDirectorPlanLabels(labels: DirectorPlanLabel[], height: number, stations: number[][], obstacles: number[][] = []) {
    const occupied: Rect[] = [...stations.map(([x, y]) => ({ x: x - 14, y: y - 30, width: 28, height: 28 })), ...obstacles.map(([x, y]) => ({ x: x - 20, y: y - 20, width: 40, height: 40 }))];

    return labels.map((label) => {
        const textLen = [...label.text].reduce((sum, char) => sum + (/[^\x00-\x7f]/.test(char) ? 12 : 7), 0);
        const width = textLen + 14;
        const h = 20;
        const candidates = [
            [12, -24],
            [-width - 12, -24],
            [12, 10],
            [-width - 12, 10],
            [-Math.round(width / 2), -32],
            [-Math.round(width / 2), 18],
            [14, -42],
            [-width - 14, -42],
            [14, 28],
            [-width - 14, 28],
            [-Math.round(width / 2), -50],
            [-Math.round(width / 2), 34],
        ];

        let bestRect: Rect = {
            x: Math.max(6, Math.min(594 - width, label.point[0] + candidates[0][0])),
            y: Math.max(6, Math.min(height - 24, label.point[1] + candidates[0][1])),
            width,
            height: h,
        };
        let minOverlap = Number.POSITIVE_INFINITY;

        for (const [dx, dy] of candidates) {
            const rx = Math.max(6, Math.min(594 - width, label.point[0] + dx));
            const ry = Math.max(6, Math.min(height - 24, label.point[1] + dy));
            const candidateRect: Rect = { x: rx, y: ry, width, height: h };

            let overlap = 0;
            for (const other of occupied) {
                // Buffer 4px for breathing room
                const bufferedOther = { x: other.x - 3, y: other.y - 3, width: other.width + 6, height: other.height + 6 };
                overlap += intersectArea(candidateRect, bufferedOther);
            }

            if (overlap === 0) {
                bestRect = candidateRect;
                break;
            }
            if (overlap < minOverlap) {
                minOverlap = overlap;
                bestRect = candidateRect;
            }
        }

        occupied.push(bestRect);
        return { ...label, ...bestRect };
    });
}
