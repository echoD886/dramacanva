import { useEffect, useMemo, useRef, useState } from "react";
import type { DirectorScene } from "@/types/director";
import { directorSceneForShot } from "@/lib/canvas/director/director-storyboard";
import { DirectorViewport, type DirectorViewportHandle } from "./director-viewport";
import { resolveDirectorAspectRatio } from "@/lib/canvas/director/director-scene-data";
import { buildFrozenSceneFromSnapshot, evaluatePrevisFrameMotions, type PrevisFrameSnapshot } from "@/lib/canvas/director/director-previs-evaluate";
import { mapDirectorSceneToPrevis } from "@/lib/canvas/director/director-previs-legacy";

const noop = () => {};

export function scheduleDirectorSnapshot(
    readViewport: () => Pick<DirectorViewportHandle, "isReady" | "captureSnapshot"> | null,
    onSnapshot: (blob: Blob) => void,
    schedule: (callback: () => void, delay: number) => () => void = (callback, delay) => {
        const timer = setTimeout(callback, delay);
        return () => clearTimeout(timer);
    },
) {
    let cancelled = false;
    let cancelTimer = noop;
    let attempts = 0;
    const capture = async () => {
        if (cancelled) return;
        try {
            const viewport = readViewport();
            if (viewport?.isReady()) {
                const blob = await viewport.captureSnapshot();
                if (!cancelled) {
                    cancelled = true;
                    onSnapshot(blob);
                }
                return;
            }
        } catch {
            // 加载中或上下文暂不可用时继续等待；耗尽重试后不替换实时视口。
        }
        if (!cancelled && ++attempts < 150) cancelTimer = schedule(() => void capture(), 100);
    };
    cancelTimer = schedule(() => void capture(), 250);
    return () => {
        cancelled = true;
        cancelTimer();
    };
}

/** Reuse the shot renderer, then release the idle WebGL context after taking a frame. */
export default function DirectorCardRender({
    scene,
    shotId,
    time = 0,
    snapshot,
    playing,
}: { scene: DirectorScene; playing: boolean } & ({ snapshot: PrevisFrameSnapshot; shotId?: never; time?: never } | { snapshot?: never; shotId: string; time: number })) {
    const viewport = useRef<DirectorViewportHandle>(null);
    const root = useRef<HTMLDivElement>(null);
    const frozen = useMemo(() => (snapshot ? buildFrozenSceneFromSnapshot(scene, snapshot) : directorSceneForShot(scene, shotId!)), [scene, shotId, snapshot]);
    const actorMotion = useMemo(() => (snapshot ? evaluatePrevisFrameMotions(scene, scene.previs ?? mapDirectorSceneToPrevis(scene).sequence, snapshot.frameIndex) : undefined), [scene, snapshot]);
    const playhead = snapshot?.animationTime ?? time;
    const [frame, setFrame] = useState<{ url: string; scene: DirectorScene; time: number }>();
    const [size, setSize] = useState({ width: 0, height: 0 });
    const aspect = resolveDirectorAspectRatio(frozen.shots.find((shot) => shot.id === frozen.activeShotId)?.aspectRatio);
    useEffect(() => {
        if (!root.current) return;
        const observer = new ResizeObserver(([entry]) => {
            const width = Math.min(entry.contentRect.width, entry.contentRect.height * aspect);
            setSize({ width, height: width / aspect });
        });
        observer.observe(root.current);
        return () => observer.disconnect();
    }, [aspect]);
    const live = playing || !frame || frame.scene !== frozen || frame.time !== playhead;
    useEffect(() => {
        if (!live || playing) return;
        return scheduleDirectorSnapshot(
            () => viewport.current,
            (blob) => setFrame({ url: URL.createObjectURL(blob), scene: frozen, time: playhead }),
        );
    }, [live, playing, frozen, playhead]);
    useEffect(
        () => () => {
            if (frame) URL.revokeObjectURL(frame.url);
        },
        [frame],
    );
    return (
        <div ref={root} className="director-card-render" data-director-render="shot">
            <div className="director-card-frame" style={size}>
                {frame && !live ? (
                    <img src={frame.url} alt={frozen.shots.find((shot) => shot.id === frozen.activeShotId)?.name} draggable={false} />
                ) : (
                    <DirectorViewport
                        ref={viewport}
                        scene={frozen}
                        actorMotion={actorMotion}
                        selectedObjectId={null}
                        selectedBone={null}
                        transformMode="translate"
                        renderMode="clay"
                        playhead={playhead}
                        playing={playing}
                        viewMode="camera"
                        showNavigation={false}
                        showModelLoadNotice={false}
                        onSelectObject={noop}
                        onSelectBone={noop}
                        onObjectTransform={noop}
                        onBoneTransform={noop}
                        onActorRigReady={noop}
                    />
                )}
            </div>
            <div className="director-card-cast">
                {frozen.objects
                    .filter((object) => object.kind === "actor" && object.visible !== false)
                    .map((actor) => (
                        <span key={actor.id}>
                            <i style={{ background: actor.color }} />
                            {actor.characterBinding?.characterName || actor.name}
                        </span>
                    ))}
            </div>
        </div>
    );
}
