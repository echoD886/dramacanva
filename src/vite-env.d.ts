/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_CHANGELOG__: string;

// hls.js ships no declarations for its light build; it is the same API without subtitles/EME.
declare module "hls.js/light" {
    export * from "hls.js";
    export { default } from "hls.js";
}
