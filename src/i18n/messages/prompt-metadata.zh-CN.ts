const promptMetadata = {
    "promptMetadata.categoryStoryboard": "分镜",
    "promptMetadata.categoryGeneration": "生成",
    "promptMetadata.categoryCharacter": "角色",
    "promptMetadata.storyboard_plan.title": "分镜规划",
    "promptMetadata.storyboard_plan.description": "把剧情、项目画风和当前角色版本规划为可执行镜头。",
    "promptMetadata.storyboard_repair.title": "分镜修复",
    "promptMetadata.storyboard_repair.description": "修复模型返回的分镜结构、字段和镜头复杂度。",
    "promptMetadata.storyboard_first_frame.title": "分镜首帧",
    "promptMetadata.storyboard_first_frame.description": "把单镜头结构转换为图片模型使用的首帧提示词。",
    "promptMetadata.storyboard_video.title": "分镜视频",
    "promptMetadata.storyboard_video.description": "把单镜头结构转换为视频模型使用的紧凑执行提示词。",
    "promptMetadata.character_extract.title": "角色卡提取",
    "promptMetadata.character_extract.description": "从章节正文提取需要跨镜头保持一致的角色资产。",
    "promptMetadata.character_turnaround.title": "角色三视图",
    "promptMetadata.character_turnaround.description": "按当前角色版本和项目画风生成正、侧、背三视图。",
} as const;
export default promptMetadata;
