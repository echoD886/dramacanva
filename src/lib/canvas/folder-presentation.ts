export const FOLDER_STYLES = ["glass-dark", "pixel", "doodle", "glass-iridescent"] as const;
export { default as FOLDER_GEOMETRY } from "./folder-geometry.json";
export type FolderStyle = (typeof FOLDER_STYLES)[number];

export function resolveFolderStyle(style?: string): FolderStyle {
    return FOLDER_STYLES.includes(style as FolderStyle) ? style as FolderStyle : "glass-dark";
}

export const FOLDER_SKIN_ASSETS: Record<FolderStyle, { front: string; back?: string; particles?: string }> = {
    "glass-dark": { front: "frost-front" },
    pixel: { front: "pixel-front", back: "pixel-back", particles: "pixel-particles" },
    doodle: { front: "doodle-front", back: "doodle-back" },
    "glass-iridescent": { front: "glass-front", back: "glass-back", particles: "glass-sparkles" },
};
