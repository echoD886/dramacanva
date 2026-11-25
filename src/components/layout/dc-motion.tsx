import { useEffect, useRef, useState } from "react";

import { afterPageInteractive } from "@/lib/after-page-interactive";

export type DcActivity = "idle" | "working" | "waiting";
const root = "/images/dc/companion/";
let wakeDue = true;
let canShowAlpha: boolean | undefined;
// The wake clip is ~760 KB; on a cold visit it competed with the page's own images and hero film.
// Same animation, started once the page has loaded and the main thread is idle.
let settled: Promise<void> | undefined;
function pageSettled() {
    return (settled ??= new Promise<void>((resolve) => afterPageInteractive(resolve)));
}

function transparentCorner(video: HTMLVideoElement) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(video, 0, 0, 1, 1, 0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[3] < 16;
}

export function DcMotion({ activity }: { activity: DcActivity }) {
    const host = useRef<HTMLSpanElement>(null);
    const [animate, setAnimate] = useState(false);
    const [waking, setWaking] = useState(false);
    const hoverTimer = useRef<number | undefined>(undefined);
    function cancelHover() {
        window.clearTimeout(hoverTimer.current);
    }
    const mayWake = animate && activity === "idle" && !waking && canShowAlpha !== false;
    useEffect(() => {
        if (!mayWake) return;
        const timer = window.setTimeout(() => setWaking(true), 40_000);
        return () => {
            window.clearTimeout(timer);
            cancelHover();
        };
    }, [mayWake]);
    const state = activity === "idle" && waking && animate ? "waking" : activity;
    useEffect(() => {
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        let inView = false;
        function sync() {
            const play = inView && !document.hidden && !media.matches;
            if (play && wakeDue) {
                wakeDue = false;
                setWaking(activity === "idle");
            }
            if (!play || activity !== "idle") setWaking(false);
            setAnimate(play);
        }
        let hiddenAt = 0;
        function onVisibilityChange() {
            if (document.hidden) hiddenAt = Date.now();
            else if (hiddenAt && Date.now() - hiddenAt >= 60_000) {
                wakeDue = true;
            }
            sync();
        }
        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            sync();
        });
        let disposed = false;
        void pageSettled().then(() => {
            if (!disposed && host.current) observer.observe(host.current);
        });
        document.addEventListener("visibilitychange", onVisibilityChange);
        media.addEventListener("change", sync);
        return () => {
            disposed = true;
            observer.disconnect();
            document.removeEventListener("visibilitychange", onVisibilityChange);
            media.removeEventListener("change", sync);
        };
    }, [activity]);

    return (
        <span
            ref={host}
            className="dc-sprite"
            data-scene={state}
            aria-hidden="true"
            onPointerEnter={(event) => {
                if (mayWake && event.pointerType === "mouse" && !event.buttons) {
                    cancelHover();
                    hoverTimer.current = window.setTimeout(() => setWaking(true), 750);
                }
            }}
            onPointerLeave={cancelHover}
            onPointerDown={cancelHover}
        >
            <DcClip key={state + animate} state={state} animate={animate} onFinish={() => setWaking(false)} />
        </span>
    );
}

function DcClip({ state, animate, onFinish }: { state: DcActivity | "waking"; animate: boolean; onFinish: () => void }) {
    const [playing, setPlaying] = useState(false);
    return (
        <>
            <img style={{ visibility: playing ? "hidden" : "visible" }} src={root + state + ".webp"} alt="" draggable={false} />
            {animate && canShowAlpha !== false && (
                <video
                    src={root + state + ".webm"}
                    muted
                    playsInline
                    autoPlay
                    loop={state !== "waking"}
                    disablePictureInPicture
                    style={{ visibility: playing ? "visible" : "hidden" }}
                    onLoadedData={(event) => {
                        canShowAlpha ??= transparentCorner(event.currentTarget);
                        if (!canShowAlpha) {
                            event.currentTarget.pause();
                            onFinish();
                        }
                    }}
                    onPlaying={() => {
                        if (canShowAlpha) setPlaying(true);
                    }}
                    onEnded={onFinish}
                    onError={() => {
                        setPlaying(false);
                        onFinish();
                    }}
                />
            )}
        </>
    );
}
