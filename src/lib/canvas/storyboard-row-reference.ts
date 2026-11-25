import { CanvasNodeType, type CanvasNodeData, type StoryboardRow } from "@/types/canvas";

/** A row is an addressable text input; the table itself is not a media resource. */
export function storyboardRowReference(script: CanvasNodeData, row: StoryboardRow): CanvasNodeData {
    const characters = (row.characters || [])
        .map((character) => [character.characterName, character.characterDescription].filter(Boolean).join("："))
        .filter(Boolean)
        .join("、");
    const content = [
        `【分镜 ${row.shotNumber}】`,
        `时长：${row.durationSeconds} 秒`,
        row.plotDescription && `画面描述：${row.plotDescription}`,
        row.narrativeIntent && `镜头意图：${row.narrativeIntent}`,
        row.viewerPOV && `观众视角：${row.viewerPOV}`,
        row.performanceBlocking && `表演调度：${row.performanceBlocking}`,
        row.dialogue && `台词/旁白：${row.dialogue}`,
        characters && `角色：${characters}`,
        row.shotSize && `景别：${row.shotSize}`,
        row.emotion && `情绪：${row.emotion}`,
        row.lightingAndAtmosphere && `光影氛围：${row.lightingAndAtmosphere}`,
        row.audioEffects && `音效：${row.audioEffects}`,
        row.camera && `镜头设计：${row.camera}`,
        row.motion && `运镜：${row.motion}`,
        row.timeBeats && `时间节拍：${row.timeBeats}`,
        row.imageGenerationPrompt && `图片提示词：${row.imageGenerationPrompt}`,
        row.videoMotionPrompt && `视频提示词：${row.videoMotionPrompt}`,
        row.negativePrompt && `负面要求：${row.negativePrompt}`,
        row.continuityOut && `连续性：${row.continuityOut}`,
    ]
        .filter(Boolean)
        .join("\n");
    return { id: `${script.id}:row:${row.id}`, type: CanvasNodeType.Text, title: `${script.title} · Shot ${row.shotNumber}`, position: script.position, width: 0, height: 0, metadata: { content } };
}
