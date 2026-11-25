import { useDcAgent } from "@/stores/use-dc-agent";

export function useCanvasAssistantVisibility() {
    const assistantOpen = useDcAgent((state) => state.open);
    const openAgent = useDcAgent((state) => state.openAgent);
    const closeAgent = useDcAgent((state) => state.closeAgent);
    return {
        assistantClosing: false,
        assistantMounted: true,
        assistantOpen,
        closeAgent,
        openAgent,
    };
}
