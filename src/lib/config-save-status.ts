import { create } from "zustand";

export const useConfigSaveStatus = create<{ scope: string; status: "idle" | "saving" | "saved" | "failed" }>(() => ({ scope: "", status: "idle" }));
let revision = 0;
export function beginConfigSave(scope: string) {
    const current = ++revision;
    useConfigSaveStatus.setState({ scope, status: "saving" });
    return (success: boolean) => {
        if (revision === current) useConfigSaveStatus.setState({ scope, status: success ? "saved" : "failed" });
    };
}
