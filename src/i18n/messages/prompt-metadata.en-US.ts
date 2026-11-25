const promptMetadata = {
    "promptMetadata.categoryStoryboard": "Storyboard",
    "promptMetadata.categoryGeneration": "Generation",
    "promptMetadata.categoryCharacter": "Character",
    "promptMetadata.storyboard_plan.title": "Storyboard planning",
    "promptMetadata.storyboard_plan.description": "Turn plot, visual style, and active character versions into executable shots.",
    "promptMetadata.storyboard_repair.title": "Storyboard repair",
    "promptMetadata.storyboard_repair.description": "Fix storyboard structure, fields, and shot complexity returned by the model.",
    "promptMetadata.storyboard_first_frame.title": "First frame",
    "promptMetadata.storyboard_first_frame.description": "Convert shot data into first-frame prompts for image models.",
    "promptMetadata.storyboard_video.title": "Shot video",
    "promptMetadata.storyboard_video.description": "Convert shot data into compact execution prompts for video models.",
    "promptMetadata.character_extract.title": "Extract character card",
    "promptMetadata.character_extract.description": "Extract character assets from chapter text that require cross-shot consistency.",
    "promptMetadata.character_turnaround.title": "Character turnaround",
    "promptMetadata.character_turnaround.description": "Generate front, side, and back views based on the character version and art style.",
} as const;
export default promptMetadata;
