import { nanoid } from "nanoid";
import type { DirectorCamera, DirectorCameraMove, DirectorKeyframe, DirectorVec3 } from "@/types/director";
export const DIRECTOR_CAMERA_MOVES: DirectorCameraMove[] = ["static", "push_in", "pull_out", "pan_left", "pan_right", "tilt_up", "tilt_down", "orbit_left", "orbit_right", "handheld", "truck_left", "truck_right", "pedestal_up", "pedestal_down"];

/** Authored camera presets, sampled identically by plan, viewport and recording. */
export function directorCameraMotionFrames(camera: DirectorCamera, move: DirectorCameraMove, duration: number, distance = 2): DirectorKeyframe[] {
    const frames = move.startsWith("orbit") ? 25 : 2;
    return Array.from({ length: frames }, (_, index) => {
        const p = index / (frames - 1),
            transform = structuredClone(camera.transform);
        if (move.startsWith("orbit")) {
            const [cx, , cz] = camera.target,
                dx = transform.position[0] - cx,
                dz = transform.position[2] - cz;
            const angle = ((p * Math.PI) / 3) * (move === "orbit_left" ? -1 : 1);
            transform.position = [cx + dx * Math.cos(angle) + dz * Math.sin(angle), transform.position[1], cz - dx * Math.sin(angle) + dz * Math.cos(angle)];
        } else if (move.startsWith("pan")) transform.rotation[1] += p * (move === "pan_left" ? 0.4 : -0.4);
        else if (move.startsWith("tilt")) transform.rotation[0] += p * (move === "tilt_up" ? 0.25 : -0.25);
        else {
            const offsets: Partial<Record<DirectorCameraMove, DirectorVec3>> = {
                push_in: [0, 0, -distance],
                pull_out: [0, 0, distance],
                truck_left: [-distance, 0, 0],
                truck_right: [distance, 0, 0],
                pedestal_up: [0, 1.2, 0],
                pedestal_down: [0, -0.8, 0],
                handheld: [0.18, 0.08, -0.15],
            };
            const offset = offsets[move] || [0, 0, 0];
            transform.position = transform.position.map((value, axis) => value + offset[axis] * p) as DirectorVec3;
        }
        return { id: nanoid(), time: duration * p, transform };
    });
}
