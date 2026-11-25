const messages = {
    "chapterReplacement.title": "替换本章已有的 {count} 个分镜？",
    "chapterReplacement.timing": "新分镜生成成功后，系统才会整体替换本章数据；如果生成失败，现有分镜不会受到影响。",
    "chapterReplacement.impact": "替换会移除 {shots} 个镜头、{revisions} 个脚本版本、{references} 个资产引用、{artifacts} 个生成产物，此操作无法撤销。",
    "chapterReplacement.impactCandidates": "替换会移除 {shots} 个镜头、{revisions} 个脚本版本、{references} 个资产引用、{artifacts} 个生成产物及 {candidates} 个相关候选资产，此操作无法撤销。",
    "chapterReplacement.confirm": "生成成功后替换",
    "chapterReplacement.cancel": "保留现有分镜",
} as const;
export default messages;
