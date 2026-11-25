const messages = {
    // 权限选项
    "canvasCloudAgentSettings.permission.readOnly": "只读",
    "canvasCloudAgentSettings.permission.readOnlyDesc": "只分析和建议",
    "canvasCloudAgentSettings.permission.requestApproval": "请求审批",
    "canvasCloudAgentSettings.permission.requestApprovalDesc": "写入和生成前确认",
    "canvasCloudAgentSettings.permission.auto": "自动执行",
    "canvasCloudAgentSettings.permission.autoDesc": "预算内执行已授权工具",
    "canvasCloudAgentSettings.permission.fallback": "请求审批",

    // 上下文范围
    "canvasCloudAgentSettings.context.canvas": "已保存画布摘要",
    "canvasCloudAgentSettings.context.canvasDesc": "最多 80 个节点的标题与文本片段，不含媒体正文或未同步修改",

    // 推理选项
    "canvasCloudAgentSettings.reasoning.off": "关闭",
    "canvasCloudAgentSettings.reasoning.offDesc": "直接执行",
    "canvasCloudAgentSettings.reasoning.auto": "自动",
    "canvasCloudAgentSettings.reasoning.autoDesc": "按任务决定",
    "canvasCloudAgentSettings.reasoning.deep": "深入",
    "canvasCloudAgentSettings.reasoning.deepDesc": "复杂任务优先规划",

    // 顶部
    "canvasCloudAgentSettings.homeTitle": "Agent 设置",
    "canvasCloudAgentSettings.backToChat": "返回对话",
    "canvasCloudAgentSettings.backToSettings": "返回设置",
    "canvasCloudAgentSettings.homeHint": "只影响下一次新运行",
    "canvasCloudAgentSettings.enabledBadge": "{count} 已启用",
    "canvasCloudAgentSettings.currentAgentBadge": "当前 Agent",

    // 设置首页
    "canvasCloudAgentSettings.section.reasoning": "推理模式",
    "canvasCloudAgentSettings.section.model": "对话模型",
    "canvasCloudAgentSettings.section.permission": "执行权限",
    "canvasCloudAgentSettings.section.capabilities": "能力与范围",
    "canvasCloudAgentSettings.hint.newRun": "新运行生效",
    "canvasCloudAgentSettings.reasoningNote": "推理只用于目标拆解、缺口判断和下一步工具选择，不会把内部思考过程展示给用户。",
    "canvasCloudAgentSettings.permissionNote": "默认逐项审批。自动模式可修改已授权的画布内容；图片、视频始终先创建草稿，再经独立审批才提交生成任务。",
    "canvasCloudAgentSettings.selectTextModel": "选择文本模型",
    "canvasCloudAgentSettings.row.context": "上下文",
    "canvasCloudAgentSettings.row.contextSummary": "{nodes} 个节点 · {scopes} 个范围",
    "canvasCloudAgentSettings.row.profile": "长期偏好",
    "canvasCloudAgentSettings.row.skills": "Skills · 用户技能库",
    "canvasCloudAgentSettings.row.skillsSummary": "{installed} 个已安装 · 本轮启用 {enabled} 个",
    "canvasCloudAgentSettings.row.mcp": "工具与连接",
    "canvasCloudAgentSettings.row.mcpSummary": "画布、技能参考文件、生成任务",
    "canvasCloudAgentSettings.row.budget": "预算",
    "canvasCloudAgentSettings.row.budgetSummary": "每轮最多 {credits} 积分 · 固定计价模型",
    "canvasCloudAgentSettings.budgetUnset": "未设置",

    // Skills 工作区
    "canvasCloudAgentSettings.skills.tabInstalled": "已安装 {count}",
    "canvasCloudAgentSettings.skills.tabMarket": "Skill 市场",
    "canvasCloudAgentSettings.skills.searchMarket": "搜索 Skill 市场",
    "canvasCloudAgentSettings.skills.searchInstalled": "筛选已安装 Skill",
    "canvasCloudAgentSettings.skills.searchAria": "搜索 Skills",
    "canvasCloudAgentSettings.skills.marketHint": "发现适合当前创作的技能",
    "canvasCloudAgentSettings.skills.matchCount": "{count} 个匹配的 Skill",
    "canvasCloudAgentSettings.skills.selectAll": "全选当前",
    "canvasCloudAgentSettings.skills.deselectAll": "取消全选",
    "canvasCloudAgentSettings.skills.loading": "正在读取技能…",
    "canvasCloudAgentSettings.skills.noMatch": "没有匹配结果，试试其他关键词",
    "canvasCloudAgentSettings.skills.loadingMore": "加载中…",
    "canvasCloudAgentSettings.skills.loadMore": "加载更多",

    // 长期偏好工作区
    "canvasCloudAgentSettings.profile.title": "长期偏好文档",
    "canvasCloudAgentSettings.profile.intro": "这里定义 Agent 的长期工作习惯、语气和输出结构。它不会增加工具、节点、预算或审批权限；安全契约始终由服务端代码控制。",
    "canvasCloudAgentSettings.profile.tabUser": "用户",
    "canvasCloudAgentSettings.profile.tabProject": "项目",
    "canvasCloudAgentSettings.profile.tabCanvas": "画布",
    "canvasCloudAgentSettings.profile.projectUnbound": "当前画布尚未关联项目，项目偏好暂不可用。",
    "canvasCloudAgentSettings.profile.loading": "正在读取偏好快照…",
    "canvasCloudAgentSettings.profile.revision": "修订 {revision}",
    "canvasCloudAgentSettings.profile.unsaved": " · 未保存",
    "canvasCloudAgentSettings.profile.placeholder": "例如：每次先给结论，再列出将改动的镜头；提示词同时给中文和英文。",
    "canvasCloudAgentSettings.profile.saveHint": "保存后只影响下一次新运行。正在运行的 Agent 会固定原快照。",
    "canvasCloudAgentSettings.profile.save": "保存",
    "canvasCloudAgentSettings.profile.retry": "重新读取",
    "canvasCloudAgentSettings.profile.scopeUser": "用户偏好",
    "canvasCloudAgentSettings.profile.scopeProject": "项目偏好",
    "canvasCloudAgentSettings.profile.scopeCanvas": "当前画布偏好",
    "canvasCloudAgentSettings.profile.configured": "{count} 层已配置 · 仅影响行为偏好",
    "canvasCloudAgentSettings.profile.empty": "未配置 · 仅影响行为偏好",

    // Skill 行
    "canvasCloudAgentSettings.skill.enableAria": "启用 {name}",
    "canvasCloudAgentSettings.skill.noDescription": "暂无技能说明",
    "canvasCloudAgentSettings.skill.installed": "已安装",
    "canvasCloudAgentSettings.skill.add": "添加",

    // MCP 工作区
    "canvasCloudAgentSettings.mcp.title": "服务端内置工具",
    "canvasCloudAgentSettings.mcp.intro": "按本轮权限开放，实际能力在发送前向后端确认。Skills 提供操作知识，不会提升工具权限。",
    "canvasCloudAgentSettings.mcp.scope": "工具范围",
    "canvasCloudAgentSettings.mcp.toolCanvasRead": "已保存画布读取",
    "canvasCloudAgentSettings.mcp.toolSkillFiles": "技能参考文件（固定版本）",
    "canvasCloudAgentSettings.mcp.toolNodeWrite": "文本 / Markdown 节点写入",
    "canvasCloudAgentSettings.mcp.toolMediaGenerate": "系统模型媒体生成与任务查询",
    "canvasCloudAgentSettings.mcp.permissionBound": "受权限约束",
    "canvasCloudAgentSettings.mcp.customNote": "自定义 MCP 暂未开放。实际工具权限、密钥和调用配额需由 Agent 后端校验，不能在浏览器中假设已启用。",

    // 上下文工作区
    "canvasCloudAgentSettings.context.title": "Agent 可以读取什么",
    "canvasCloudAgentSettings.context.subtitle": "只影响本次新运行的上下文范围",

    // 预算工作区
    "canvasCloudAgentSettings.budget.title": "本轮累计预算",
    "canvasCloudAgentSettings.budget.intro": "积分预算用于费用保护；生成任务和视频秒数填 0 表示不设该项上限。模型循环由预算和运行状态控制，不再用固定次数截断。",
    "canvasCloudAgentSettings.budget.credits": "积分上限",
    "canvasCloudAgentSettings.budget.creditsHint": "必填且大于 0；所有步骤累计",
    "canvasCloudAgentSettings.budget.tasks": "生成任务上限",
    "canvasCloudAgentSettings.budget.tasksHint": "0 表示不限；只读模式不执行生成",
    "canvasCloudAgentSettings.budget.video": "视频秒数上限",
    "canvasCloudAgentSettings.budget.videoHint": "0 表示不限；按请求时长累计",

    // 分区标题
    "canvasCloudAgentSettings.sectionTitle.profile": "长期偏好",
    "canvasCloudAgentSettings.sectionTitle.mcp": "MCP 与工具",
    "canvasCloudAgentSettings.sectionTitle.context": "上下文",
    "canvasCloudAgentSettings.sectionTitle.budget": "预算",
    "canvasCloudAgentSettings.sectionSubtitle.profile": "用户、项目和画布的长期行为偏好",
    "canvasCloudAgentSettings.sectionSubtitle.skills": "搜索、安装并选择本轮技能",
    "canvasCloudAgentSettings.sectionSubtitle.mcp": "云端工具与连接状态",
    "canvasCloudAgentSettings.sectionSubtitle.context": "控制 Agent 能读取的范围",
    "canvasCloudAgentSettings.sectionSubtitle.budget": "控制本轮积分与生成消耗",
} as const;
export default messages;
