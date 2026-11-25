import { create } from "zustand";
import type { ComponentProps } from "react";
import type { CanvasCloudAgentPanel } from "@/components/canvas/canvas-cloud-agent-panel";

export type DcCanvasBinding = Omit<ComponentProps<typeof CanvasCloudAgentPanel>, "open" | "onCollapse"> & { hidden: boolean };

export const useDcAgent = create<{
    open: boolean;
    canvas: DcCanvasBinding | null;
    openAgent: () => void;
    closeAgent: () => void;
}>((set) => ({
    open: false,
    canvas: null,
    openAgent: () => set({ open: true }),
    closeAgent: () => set({ open: false }),
}));
