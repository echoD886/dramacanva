export function projectWorkspaceHref(project: { id: string; type: string }, view: "overview" | "chapters" = "chapters") {
    if (project.type === "drama-pipeline") return `/projects/${project.id}${view === "chapters" ? "?tab=script" : ""}`;
    return `/projects/${project.id}/${view}`;
}
