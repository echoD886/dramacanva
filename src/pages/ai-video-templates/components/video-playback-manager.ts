type VideoEntry = {
    id: string;
    videoElement: HTMLVideoElement | null;
    intersectionRatio: number;
    isVisible: boolean;
    onStateChange: (shouldPlay: boolean) => void;
};

class VideoPlaybackManager {
    private entries = new Map<string, VideoEntry>();
    private maxConcurrent = 2;
    private isReducedData = false;

    constructor() {
        if (typeof window !== "undefined") {
            // Check Save-Data header or prefers-reduced-data media query
            const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
            const mq = window.matchMedia?.("(prefers-reduced-data: reduce)");
            this.isReducedData = Boolean(conn?.saveData || mq?.matches);
            mq?.addEventListener?.("change", (e) => {
                this.isReducedData = e.matches;
                this.recalculate();
            });
        }
    }

    public register(id: string, onStateChange: (shouldPlay: boolean) => void) {
        this.entries.set(id, {
            id,
            videoElement: null,
            intersectionRatio: 0,
            isVisible: false,
            onStateChange,
        });
        return () => {
            this.entries.delete(id);
            this.recalculate();
        };
    }

    public updateIntersection(id: string, isVisible: boolean, ratio: number, videoElement?: HTMLVideoElement | null) {
        const entry = this.entries.get(id);
        if (!entry) return;

        entry.isVisible = isVisible;
        entry.intersectionRatio = ratio;
        if (videoElement !== undefined) {
            entry.videoElement = videoElement;
        }

        this.recalculate();
    }

    private recalculate() {
        if (this.isReducedData) {
            for (const entry of this.entries.values()) {
                entry.onStateChange(false);
            }
            return;
        }

        // Candidates: visible cards with >= 50% intersection
        const candidates = Array.from(this.entries.values())
            .filter((e) => e.isVisible && e.intersectionRatio >= 0.5)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const playingSet = new Set(candidates.slice(0, this.maxConcurrent).map((c) => c.id));

        for (const entry of this.entries.values()) {
            const shouldPlay = playingSet.has(entry.id);
            entry.onStateChange(shouldPlay);
        }
    }

    public get reducedData(): boolean {
        return this.isReducedData;
    }
}

export const videoPlaybackManager = new VideoPlaybackManager();
