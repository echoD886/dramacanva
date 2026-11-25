import { useEffect, useRef, type RefObject } from "react";
import { Quaternion, Vector3 } from "three";
import { useI18n } from "@/i18n/use-i18n";
import type { DirectorViewportHandle } from "./director-viewport";
import { DIRECTOR_VIEW_MODES, type DirectorViewMode } from "@/lib/canvas/director/director-view-modes";

const axes = [
    { label: "X", vector: new Vector3(1, 0, 0), mode: "right", color: "#ff767a" },
    { label: "Y", vector: new Vector3(0, 1, 0), mode: "top", color: "#70dec0" },
    { label: "Z", vector: new Vector3(0, 0, 1), mode: "front", color: "#819eff" },
] as const;

export function DirectorOrientation({ viewport, onView, onReset }: { viewport: RefObject<DirectorViewportHandle | null>; onView: (mode: DirectorViewMode) => void; onReset: () => void }) {
    const { t } = useI18n();
    const svg = useRef<SVGSVGElement>(null);
    const lens = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const parts = [...svg.current!.querySelectorAll<SVGGElement>("[data-axis]")];
        const orientation = new Quaternion(),
            direction = new Vector3();
        let frame = 0,
            previous = "";
        const paint = () => {
            frame = requestAnimationFrame(paint);
            const camera = viewport.current?.readViewCamera?.();
            if (!camera) return;
            const projection = camera.getWorldQuaternion(orientation).toArray().join() + ":" + camera.type + ":" + ("fov" in camera ? camera.fov : "");
            if (projection === previous) return;
            previous = projection;
            orientation.invert();
            const depth = parts.map((part, i) => {
                direction
                    .copy(axes[i % 3].vector)
                    .applyQuaternion(orientation)
                    .multiplyScalar(i < 3 ? 1 : -1);
                const x = direction.x * 26,
                    y = -direction.y * 26;
                part.firstElementChild!.setAttribute("x2", String(x));
                part.firstElementChild!.setAttribute("y2", String(y));
                part.lastElementChild!.setAttribute("transform", `translate(${x} ${y})`);
                return { part, z: direction.z };
            });
            depth.sort((a, b) => a.z - b.z).forEach(({ part }) => part.parentNode?.appendChild(part));
            if (lens.current) lens.current.textContent = "fov" in camera ? `FOV ${Math.round(Number(camera.fov))}°` : "ORTHO";
        };
        paint();
        return () => cancelAnimationFrame(frame);
    }, [viewport]);
    return (
        <div className="director-axis-controls">
            <section>
                <svg ref={svg} viewBox="-40 -36 80 72">
                    {[...axes, ...axes].map((axis, i) => (
                        <g key={i} data-axis={axis.label}>
                            <line stroke={i < 3 ? axis.color : "#686868"} strokeWidth="2" />
                            <g
                                role={i < 3 ? "button" : undefined}
                                tabIndex={i < 3 ? 0 : undefined}
                                aria-label={i < 3 ? axis.label : undefined}
                                onClick={i < 3 ? () => onView(axis.mode) : undefined}
                                onKeyDown={(e) => {
                                    if (i < 3 && (e.key === "Enter" || e.key === " ")) {
                                        e.preventDefault();
                                        onView(axis.mode);
                                    }
                                }}
                            >
                                <circle r={i < 3 ? 9 : 4} fill={i < 3 ? axis.color : "#686868"} />
                                {i < 3 && (
                                    <>
                                        <title>{DIRECTOR_VIEW_MODES.find((v) => v.mode === axis.mode)?.hint}</title>
                                        <text textAnchor="middle" dy=".35em">
                                            {axis.label}
                                        </text>
                                    </>
                                )}
                            </g>
                        </g>
                    ))}
                </svg>
                <span ref={lens} />
            </section>
            <button type="button" onClick={onReset}>
                ↶ {t("canvasExtra.panorama.resetViewTitle")}
            </button>
        </div>
    );
}
