const messages = {
    // Permission options
    "canvasCloudAgentSettings.permission.readOnly": "Read only",
    "canvasCloudAgentSettings.permission.readOnlyDesc": "Analysis and suggestions only",
    "canvasCloudAgentSettings.permission.requestApproval": "Request approval",
    "canvasCloudAgentSettings.permission.requestApprovalDesc": "Confirm before writing or generating",
    "canvasCloudAgentSettings.permission.auto": "Automatic",
    "canvasCloudAgentSettings.permission.autoDesc": "Runs authorized tools within budget",
    "canvasCloudAgentSettings.permission.fallback": "Request approval",

    // Context scope
    "canvasCloudAgentSettings.context.canvas": "Saved canvas summary",
    "canvasCloudAgentSettings.context.canvasDesc": "Titles and text snippets of up to 80 nodes; no media content or unsynced edits",

    // Reasoning options
    "canvasCloudAgentSettings.reasoning.off": "Off",
    "canvasCloudAgentSettings.reasoning.offDesc": "Run directly",
    "canvasCloudAgentSettings.reasoning.auto": "Auto",
    "canvasCloudAgentSettings.reasoning.autoDesc": "Decide per task",
    "canvasCloudAgentSettings.reasoning.deep": "Deep",
    "canvasCloudAgentSettings.reasoning.deepDesc": "Plan first for complex tasks",

    // Header
    "canvasCloudAgentSettings.homeTitle": "Agent settings",
    "canvasCloudAgentSettings.backToChat": "Back to conversation",
    "canvasCloudAgentSettings.backToSettings": "Back to settings",
    "canvasCloudAgentSettings.homeHint": "Applies to the next new run",
    "canvasCloudAgentSettings.enabledBadge": "{count} enabled",
    "canvasCloudAgentSettings.currentAgentBadge": "Current Agent",

    // Settings home
    "canvasCloudAgentSettings.section.reasoning": "Reasoning mode",
    "canvasCloudAgentSettings.section.model": "Conversation model",
    "canvasCloudAgentSettings.section.permission": "Execution permission",
    "canvasCloudAgentSettings.section.capabilities": "Capabilities & scope",
    "canvasCloudAgentSettings.hint.newRun": "Applies to new runs",
    "canvasCloudAgentSettings.reasoningNote": "Reasoning is used only for goal breakdown, gap checks and tool selection; internal thinking is never shown to users.",
    "canvasCloudAgentSettings.permissionNote": "Each step is approved by default. Automatic mode may edit authorized canvas content; images and videos always draft first and go through a separate approval before generation.",
    "canvasCloudAgentSettings.selectTextModel": "Select a text model",
    "canvasCloudAgentSettings.row.context": "Context",
    "canvasCloudAgentSettings.row.contextSummary": "{nodes} nodes · {scopes} scopes",
    "canvasCloudAgentSettings.row.profile": "Long-term preferences",
    "canvasCloudAgentSettings.row.skills": "Skills · user library",
    "canvasCloudAgentSettings.row.skillsSummary": "{installed} installed · {enabled} enabled this run",
    "canvasCloudAgentSettings.row.mcp": "Tools & connections",
    "canvasCloudAgentSettings.row.mcpSummary": "Canvas, skill reference files, generation tasks",
    "canvasCloudAgentSettings.row.budget": "Budget",
    "canvasCloudAgentSettings.row.budgetSummary": "Up to {credits} credits per run · fixed-price models",
    "canvasCloudAgentSettings.budgetUnset": "not set",

    // Skills workspace
    "canvasCloudAgentSettings.skills.tabInstalled": "Installed {count}",
    "canvasCloudAgentSettings.skills.tabMarket": "Skill market",
    "canvasCloudAgentSettings.skills.searchMarket": "Search the skill market",
    "canvasCloudAgentSettings.skills.searchInstalled": "Filter installed skills",
    "canvasCloudAgentSettings.skills.searchAria": "Search skills",
    "canvasCloudAgentSettings.skills.marketHint": "Discover skills for your current work",
    "canvasCloudAgentSettings.skills.matchCount": "{count} matching skills",
    "canvasCloudAgentSettings.skills.selectAll": "Select all shown",
    "canvasCloudAgentSettings.skills.deselectAll": "Deselect all",
    "canvasCloudAgentSettings.skills.loading": "Loading skills…",
    "canvasCloudAgentSettings.skills.noMatch": "No matches; try another keyword",
    "canvasCloudAgentSettings.skills.loadingMore": "Loading…",
    "canvasCloudAgentSettings.skills.loadMore": "Load more",

    // Profile workspace
    "canvasCloudAgentSettings.profile.title": "Long-term preference document",
    "canvasCloudAgentSettings.profile.intro": "Defines the Agent's long-term habits, tone and output structure. It adds no tools, nodes, budget or approval permissions; the safety contract stays in server code.",
    "canvasCloudAgentSettings.profile.tabUser": "User",
    "canvasCloudAgentSettings.profile.tabProject": "Project",
    "canvasCloudAgentSettings.profile.tabCanvas": "Canvas",
    "canvasCloudAgentSettings.profile.projectUnbound": "This canvas is not linked to a project; project preferences are unavailable.",
    "canvasCloudAgentSettings.profile.loading": "Loading preference snapshot…",
    "canvasCloudAgentSettings.profile.revision": "Revision {revision}",
    "canvasCloudAgentSettings.profile.unsaved": " · unsaved",
    "canvasCloudAgentSettings.profile.placeholder": "e.g. lead with the conclusion, then list the shots to change; provide prompts in both Chinese and English.",
    "canvasCloudAgentSettings.profile.saveHint": "Saving only affects the next new run. A running Agent keeps its original snapshot.",
    "canvasCloudAgentSettings.profile.save": "Save",
    "canvasCloudAgentSettings.profile.retry": "Reload",
    "canvasCloudAgentSettings.profile.scopeUser": "User preferences",
    "canvasCloudAgentSettings.profile.scopeProject": "Project preferences",
    "canvasCloudAgentSettings.profile.scopeCanvas": "Current canvas preferences",
    "canvasCloudAgentSettings.profile.configured": "{count} layers configured · behavior preferences only",
    "canvasCloudAgentSettings.profile.empty": "Not configured · behavior preferences only",

    // Skill row
    "canvasCloudAgentSettings.skill.enableAria": "Enable {name}",
    "canvasCloudAgentSettings.skill.noDescription": "No description",
    "canvasCloudAgentSettings.skill.installed": "Installed",
    "canvasCloudAgentSettings.skill.add": "Add",

    // MCP workspace
    "canvasCloudAgentSettings.mcp.title": "Built-in server tools",
    "canvasCloudAgentSettings.mcp.intro": "Opened per this run's permissions; actual capabilities are confirmed with the backend before sending. Skills add know-how, never tool permissions.",
    "canvasCloudAgentSettings.mcp.scope": "Tool scope",
    "canvasCloudAgentSettings.mcp.toolCanvasRead": "Saved canvas reading",
    "canvasCloudAgentSettings.mcp.toolSkillFiles": "Skill reference files (fixed versions)",
    "canvasCloudAgentSettings.mcp.toolNodeWrite": "Text / Markdown node writing",
    "canvasCloudAgentSettings.mcp.toolMediaGenerate": "System-model media generation and task queries",
    "canvasCloudAgentSettings.mcp.permissionBound": "Permission-bound",
    "canvasCloudAgentSettings.mcp.customNote": "Custom MCP is not open yet. Actual tool permissions, keys and call quotas are verified by the Agent backend; never assume they are enabled in the browser.",

    // Context workspace
    "canvasCloudAgentSettings.context.title": "What the Agent can read",
    "canvasCloudAgentSettings.context.subtitle": "Only affects the context scope of this new run",

    // Budget workspace
    "canvasCloudAgentSettings.budget.title": "Budget for this run",
    "canvasCloudAgentSettings.budget.intro": "The credit budget protects against overspend; 0 for generation tasks or video seconds means no cap for that item. The model loop is governed by budget and run state, not fixed step counts.",
    "canvasCloudAgentSettings.budget.credits": "Credit cap",
    "canvasCloudAgentSettings.budget.creditsHint": "Required, greater than 0; accumulated across steps",
    "canvasCloudAgentSettings.budget.tasks": "Generation task cap",
    "canvasCloudAgentSettings.budget.tasksHint": "0 = unlimited; read-only mode generates nothing",
    "canvasCloudAgentSettings.budget.video": "Video seconds cap",
    "canvasCloudAgentSettings.budget.videoHint": "0 = unlimited; accumulated per request duration",

    // Section titles
    "canvasCloudAgentSettings.sectionTitle.profile": "Long-term preferences",
    "canvasCloudAgentSettings.sectionTitle.mcp": "MCP & tools",
    "canvasCloudAgentSettings.sectionTitle.context": "Context",
    "canvasCloudAgentSettings.sectionTitle.budget": "Budget",
    "canvasCloudAgentSettings.sectionSubtitle.profile": "Long-term behavior preferences for user, project and canvas",
    "canvasCloudAgentSettings.sectionSubtitle.skills": "Search, install and select skills for this run",
    "canvasCloudAgentSettings.sectionSubtitle.mcp": "Cloud tools and connection status",
    "canvasCloudAgentSettings.sectionSubtitle.context": "Control what the Agent can read",
    "canvasCloudAgentSettings.sectionSubtitle.budget": "Control credits and generation usage for this run",
} as const;
export default messages;
