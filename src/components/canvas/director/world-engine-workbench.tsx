import { useMemo, useRef } from "react";
import type { ComponentProps } from "react";
import type { CanvasDirectorWorkbench } from "./canvas-director-workbench";
import { CanvasPrevisWorkbench } from "../previs/canvas-previs-workbench";
import { directorToWorldEngine, worldEngineToDirector } from "@/lib/canvas/director/director-world-engine";

export function WorldEngineWorkbench(
    props: ComponentProps<typeof CanvasDirectorWorkbench> & {
        keepViewport?: boolean;
        onAddToCanvas?: ComponentProps<typeof CanvasPrevisWorkbench>["onAddToCanvas"];
        onPrompt: (scene: NonNullable<ComponentProps<typeof CanvasDirectorWorkbench>["scene"]>, shot: import("@/types/director").DirectorShot, prompt: string) => Promise<void>;
    },
) {
    const latest = useRef(props.scene);
    latest.current = props.scene;
    const scene = useMemo(() => (props.scene ? directorToWorldEngine(props.scene) : null), [props.scene]);
    return (
        <CanvasPrevisWorkbench
            {...props}
            scene={scene}
            initialMode="animate"
            onChange={(world) => {
                if (!latest.current) return;
                const next = worldEngineToDirector(latest.current, world);
                latest.current = next;
                props.onChange(next);
            }}
            onApply={async (output) => {
                if (!latest.current) return;
                const next = worldEngineToDirector(latest.current, output.scene);
                props.onChange(next);
                await props.onApply({ ...output, scene: next, shot: next.shots.find((shot) => shot.id === output.shot.id)! });
            }}
            onAddToCanvas={async (output) => {
                if (!latest.current) return;
                const shot = latest.current.shots.find((item) => item.id === output.shotId);
                if (!shot) return;
                if (props.onAddToCanvas) await props.onAddToCanvas(output);
                if (output.kind === "prompt") await props.onPrompt(latest.current, shot, output.prompt);
            }}
        />
    );
}
