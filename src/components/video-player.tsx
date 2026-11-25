import { deferredCanvasComponent } from "./canvas/deferred-canvas-component";

export const VideoPlayer = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./video-player-renderer"))["VideoPlayer"]>>(() => import("./video-player-renderer").then((module) => ({ default: module.VideoPlayer })));
