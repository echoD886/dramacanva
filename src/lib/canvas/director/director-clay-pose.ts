import type { DirectorObject, DirectorVec3 } from "@/types/director";
import { getDirectorAsset } from "./director-asset-registry";

export function resolveSeatedPelvis(seat: DirectorObject): DirectorVec3 | null {
    const anchor = seat.stageProp && getDirectorAsset(seat.stageProp)?.anchors.seatAnchor;
    if (!anchor) return null;
    const [x, y, z] = anchor.position.map((value, axis) => value * seat.transform.scale[axis]);
    const [px, py, pz] = seat.transform.position,
        yaw = seat.transform.rotation[1];
    return [px + x * Math.cos(yaw) + z * Math.sin(yaw), py + y, pz - x * Math.sin(yaw) + z * Math.cos(yaw)];
}

/** Shared with rendering so posture assertions measure the actual hip pivot. */
export function directorClayPelvisHeight(pose: DirectorObject["pose"]) {
    return pose === "sit" || pose === "squat" ? 0.73 : 0.95;
}
