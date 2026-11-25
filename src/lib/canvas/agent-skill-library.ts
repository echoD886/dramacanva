export function initialAgentSkillLibraryTab(selectedCount: number, installedCount: number): "enabled" | "installed" | "market" {
    return selectedCount > 0 ? "enabled" : installedCount > 0 ? "installed" : "market";
}
