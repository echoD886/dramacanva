import type { MessageKey } from "@/i18n/messages";
import type { Skill } from "@/services/api/skills";

export type SkillPurpose = {
    promiseKey: MessageKey;
    inputKey: MessageKey;
    outputKey: MessageKey;
    bestForKey: MessageKey;
    sourceNoteKey?: MessageKey;
};

type PurposeSkill = Pick<Skill, "skillId" | "skillName" | "description" | "tag">;

const communityListingKeys: Record<string, { name: MessageKey; description: MessageKey }> = {
    "community-episodic-blueprint-v1": { name: "skillsPage.community.blueprint.name", description: "skillsPage.community.blueprint.description" },
    "community-continuity-shot-design-v1": { name: "skillsPage.community.continuity.name", description: "skillsPage.community.continuity.description" },
    "community-visual-keyframe-system-v1": { name: "skillsPage.community.keyframes.name", description: "skillsPage.community.keyframes.description" },
    "community-image-prompt-library-v1": { name: "skillsPage.community.imageLibrary.name", description: "skillsPage.community.imageLibrary.description" },
    "studio-dynamic-character-bible-v1": { name: "skillsPage.community.character.name", description: "skillsPage.community.character.description" },
    "studio-emotion-peak-rhythm-v1": { name: "skillsPage.community.rhythm.name", description: "skillsPage.community.rhythm.description" },
    "studio-production-screenplay-v1": { name: "skillsPage.community.writing.name", description: "skillsPage.community.writing.description" },
    "studio-script-to-shotlist-v1": { name: "skillsPage.community.shotlist.name", description: "skillsPage.community.shotlist.description" },
    "community-seedance-storyboard-v1": { name: "skillsPage.community.seedance.name", description: "skillsPage.community.seedance.description" },
    "community-cinematic-director-v1": { name: "skillsPage.community.director.name", description: "skillsPage.community.director.description" },
    "community-cinematic-colossal-v2": { name: "skillsPage.community.colossal.name", description: "skillsPage.community.colossal.description" },
};

export function skillListingText(skill: Pick<Skill, "skillId" | "skillName" | "description">, t: (key: MessageKey) => string) {
    const keys = communityListingKeys[skill.skillId];
    if (keys) return { name: t(keys.name), description: t(keys.description) };
    // Built-in skills carry Agent-facing text in the database; the catalog holds the reader-facing copy per language.
    const nameKey = `skillCatalog.${skill.skillId}.name` as MessageKey;
    const name = t(nameKey);
    if (name !== nameKey) return { name, description: t(`skillCatalog.${skill.skillId}.description` as MessageKey) };
    return { name: skill.skillName, description: skill.description };
}

export const skillCoverByID: Record<string, string> = {
    "oss-fizznodes-sync-v1": "/images/skills/skill-cover-audio-frame-sync.jpg",
    "oss-social-ops-v1": "/images/skills/skill-cover-social-operations.jpg",
    "oss-research-workflow-v1": "/images/skills/skill-cover-video-deep-research.jpg",
    "oss-skillalchemy-v1": "/images/skills/skill-cover-skill-alchemy.jpg",
    "oss-open-director-v1": "/images/skills/skill-cover-multi-agent-director.jpg",
    "oss-video-explainer-v1": "/images/skills/skill-cover-science-explainer.jpg",
    "oss-fusion-drama-v1": "/images/skills/skill-cover-full-drama-producer.jpg",
    "oss-openreels-v1": "/images/skills/skill-cover-research-to-reels.jpg",
    "oss-comfy-agent-factory-v1": "/images/skills/skill-cover-agent-video-factory.jpg",
    "oss-storyboardai-v1": "/images/skills/skill-cover-storyboard-to-film.jpg",
    "oss-ltx-keyframes-v1": "/images/skills/skill-cover-multi-keyframes.jpg",
    "oss-diffsynth-video-v1": "/images/skills/skill-cover-multimodal-paperbird.jpg",
    "oss-gen-media-prompts-v1": "/images/skills/skill-cover-media-prompts.jpg",
    "oss-jellyfish-drama-v1": "/images/skills/skill-cover-drama-assets.jpg",
    "oss-video-storyboard-v1": "/images/skills/skill-cover-video-shot-generator.jpg",
    "oss-social-reels-matrix-v1": "/images/skills/skill-cover-social-matrix.jpg",
    "oss-director-skills-v1": "/images/skills/skill-cover-ai-film-director.jpg",
    "oss-cited-research-v1": "/images/skills/skill-cover-cited-research.jpg",
    "oss-multi-perspective-outline-v1": "/images/skills/skill-cover-documentary-perspectives.jpg",
    "oss-evidence-brief-v1": "/images/skills/skill-cover-recursive-evidence.jpg",
    "oss-prompt-quality-gate-v1": "/images/skills/skill-cover-skill-quality.jpg",
    "oss-comfy-production-v1": "/images/skills/skill-cover-node-production.jpg",
    "oss-openmontage-producer-v1": "/images/skills/skill-cover-video-production-chain.jpg",
    "oss-creator-postmortem-v1": "/images/skills/skill-cover-creator-review.jpg",
    "oss-community-signal-radar-v1": "/images/skills/skill-cover-community-radar.jpg",
    "oss-product-demo-beats-v1": "/images/skills/skill-cover-product-demo.jpg",
    "oss-commercial-broll-v1": "/images/skills/skill-cover-commercial-broll.jpg",
    "oss-commercial-claim-evidence-v1": "/images/skills/skill-cover-claim-evidence.jpg",
    "oss-ugc-brief-v1": "/images/skills/skill-cover-ugc-brief.jpg",
    "oss-node-workflow-audit-v1": "/images/skills/skill-cover-node-audit.jpg",
    "oss-shortgpt-vertical-v1": "/images/skills/skill-cover-vertical-hooks.jpg",
    "oss-hook-contrast-lab-v1": "/images/skills/skill-cover-hook-contrast.jpg",
    "oss-content-repurpose-v1": "/images/skills/skill-cover-content-repurpose.jpg",
    "oss-word-caption-v1": "/images/skills/skill-cover-caption-readability.jpg",
    "oss-podcast-to-shorts-v1": "/images/skills/skill-cover-podcast-highlights.jpg",
    "16000000000079": "/images/skills/skill-cover-series-arc.jpg",
    "yingce-image-layer-split": "/images/skills/skill-cover-image-layer-split.jpg",
    "yingce-image-annotation": "/images/skills/skill-cover-image-annotation.jpg",
    "yingce-image-editing": "/images/skills/skill-cover-image-editing.jpg",
    "oss-video-experiment-ladder-v1": "/images/skills/skill-cover-video-experiments.jpg",
    "oss-restoration-finish-v1": "/images/skills/skill-cover-film-restoration.jpg",
    "16000000000086": "/images/skills/skill-cover-acting-lab.jpg",
    "16000000000078": "/images/skills/skill-cover-prose-texture.jpg",
    "16000000000102": "/images/skills/skill-cover-brand-positioning.jpg",
    "16000000000081": "/images/skills/skill-cover-drama-handbook.jpg",
    "16000000000087": "/images/skills/skill-cover-audiovisual-theory.jpg",
    "16000000000075": "/images/skills/skill-cover-dialogue-workshop.jpg",
    "16000000000096": "/images/skills/skill-cover-visual-tone.jpg",
    "16000000000095": "/images/skills/skill-cover-visual-prompt-craft.jpg",
    "16000000000076": "/images/skills/skill-cover-script-factory.jpg",
    "16000000000093": "/images/skills/skill-cover-seedance-prompt.jpg",
    "16000000000092": "/images/skills/skill-cover-seedance-directing.jpg",
    "16000000000099": "/images/skills/skill-cover-decision-models.jpg",
    "16000000000104": "/images/skills/skill-cover-story-marketing.jpg",
    "16000000000074": "/images/skills/skill-cover-comedy-mechanics.jpg",
    "16000000000103": "/images/skills/skill-cover-prompt-patterns.jpg",
    "16000000000085": "/images/skills/skill-cover-crosstalk.jpg",
    "16000000000089": "/images/skills/skill-cover-freestyle-library.jpg",
    "16000000000083": "/images/skills/skill-cover-standup.jpg",
    "16000000000097": "/images/skills/skill-cover-ad-copy.jpg",
    "16000000000077": "/images/skills/skill-cover-one-take.jpg",
    "16000000000073": "/images/skills/skill-cover-character-forging.jpg",
    "16000000000088": "/images/skills/skill-cover-editing-rhythm.jpg",
    "16000000000091": "/images/skills/skill-cover-model-routing.jpg",
    "16000000000105": "/images/skills/skill-cover-ad-campaign.jpg",
    "16000000000101": "/images/skills/skill-cover-launch-variants.jpg",
    "16000000000080": "/images/skills/skill-cover-five-stage-story.jpg",
    "16000000000094": "/images/skills/skill-cover-shot-grammar.jpg",
    "16000000000082": "/images/skills/skill-cover-sitcom-writing.jpg",
    "16000000000107": "/images/skills/skill-cover-skill-concierge.jpg",
    "16000000000084": "/images/skills/skill-cover-story-structure.jpg",
    "14811816983308": "/images/skills/skill-cover-three-act-drama.jpg",
    "14811816969484": "/images/skills/skill-cover-jewelry-design.jpg",
    "14811816961804": "/images/skills/skill-cover-toy-unboxing.jpg",
    "14811816969740": "/images/skills/skill-cover-jewelry-evolution.jpg",
    "14811816961292": "/images/skills/skill-cover-dancing-cat.jpg",
    "yingce-short-drama-workflow": "/images/skills/skill-cover-short-drama-workflow.jpg",
    "14811816969996": "/images/skills/skill-cover-sprite-animation.jpg",
    "14889899551756": "/images/skills/skill-cover-character-charisma.jpg",
    "14811816981260": "/images/skills/skill-cover-cosmic-reversal.jpg",
    "15434297644556": "/images/skills/skill-cover-avant-garde-fashion.jpg",
    "14889292801804": "/images/skills/skill-cover-transformation.jpg",
    "14889292802060": "/images/skills/skill-cover-app-creator.jpg",
    "15215320902412": "/images/skills/skill-cover-healing-mascot.jpg",
    "14811816960524": "/images/skills/skill-cover-director-style.jpg",
    "15507072002828": "/images/skills/skill-cover-portrait-sculpting.jpg",
    "14811816960268": "/images/skills/skill-cover-street-outfit.jpg",
    "14811816962572": "/images/skills/skill-cover-fashion-model.jpg",
    "14811816981516": "/images/skills/skill-cover-animation-color.jpg",
    "14811816962316": "/images/skills/skill-cover-fashion-tryon.jpg",
    "14811816981004": "/images/skills/skill-cover-visual-effects.jpg",
    "14811816961036": "/images/skills/skill-cover-creator-sales.jpg",
    "14811816960780": "/images/skills/skill-cover-jewelry-commerce.jpg",
    "14811816962060": "/images/skills/skill-cover-future-electronics.jpg",
    "14811816980748": "/images/skills/skill-cover-comic-interview.jpg",
    "14811816982540": "/images/skills/skill-cover-world-art.jpg",
    "14811816982028": "/images/skills/skill-cover-image-series.jpg",
    "14811816982284": "/images/skills/skill-cover-character-concept-neutral.jpg",
    "14811816983052": "/images/skills/skill-cover-story-development.jpg",
    "14811816982796": "/images/skills/skill-cover-screenplay-writing.jpg",
    "14519800321292": "/images/skills/skill-cover-pop-commercial.jpg",
    "14811816981772": "/images/skills/skill-cover-image-to-film.jpg",
    "14811816970252": "/images/skills/skill-cover-script-to-production.jpg",
    "14889899552012": "/images/skills/skill-cover-actor-microexpression.jpg",
    "14811816970508": "/images/skills/skill-cover-narrative-storywall.jpg",
    "community-episodic-blueprint-v1": "/images/skills/skill-cover-community-episodic-blueprint.jpg",
    "community-continuity-shot-design-v1": "/images/skills/skill-cover-community-continuity-shot-design.jpg",
    "community-visual-keyframe-system-v1": "/images/skills/skill-cover-community-visual-keyframe-system.jpg",
    "community-image-prompt-library-v1": "/images/skills/skill-cover-community-image-prompt-library.jpg",
    "studio-dynamic-character-bible-v1": "/images/skills/skill-cover-community-dynamic-character.jpg",
    "studio-emotion-peak-rhythm-v1": "/images/skills/skill-cover-community-dynamic-rhythm.jpg",
    "studio-production-screenplay-v1": "/images/skills/skill-cover-community-dynamic-writing.jpg",
    "studio-script-to-shotlist-v1": "/images/skills/skill-cover-community-dynamic-shotlist.jpg",
    "community-seedance-storyboard-v1": "/images/skills/skill-cover-community-seedance-storyboard.jpg",
    "community-cinematic-director-v1": "/images/skills/skill-cover-community-cinematic-director.jpg",
    "community-cinematic-colossal-v2": "/images/skills/skill-cover-community-cinematic-colossal.jpg",
    "studio-video-storyboard-timeline-v1": "/images/skills/skill-cover-timeline-board.jpg",
    "studio-cinematic-scale-image-v1": "/images/skills/skill-cover-cinematic-scale.jpg",
    "studio-cinematic-frame-composer-v1": "/images/skills/skill-cover-frame-composition.jpg",
    "studio-cinematic-video-shot-v1": "/images/skills/skill-cover-image-video-shot.jpg",
    "oss-drama-beat-sheet-v1": "/images/skills/skill-cover-episode-hook.jpg",
    "oss-character-bible-v1": "/images/skills/skill-cover-character-continuity.jpg",
    "oss-shot-arc-plan-v1": "/images/skills/skill-cover-shot-arc.jpg",
    "oss-shot-boundary-index-v1": "/images/skills/skill-cover-media-index.jpg",
    "oss-transcript-edl-v1": "/images/skills/skill-cover-interview-edl.jpg",
    "oss-silence-cut-v1": "/images/skills/skill-cover-silence-cut.jpg",
    "oss-subtitle-timing-qc-v1": "/images/skills/skill-cover-subtitle-qc.jpg",
    "oss-final-render-qc-v1": "/images/skills/skill-cover-render-qc.jpg",
    "oss-video-continuity-lab-v1": "/images/skills/skill-cover-continuity-lab.jpg",
    "oss-video-motion-planner-v1": "/images/skills/skill-cover-motion-plan.jpg",
};

const purpose = (promiseKey: MessageKey, inputKey: MessageKey, outputKey: MessageKey, bestForKey: MessageKey, sourceNoteKey?: MessageKey): SkillPurpose => ({ promiseKey, inputKey, outputKey, bestForKey, sourceNoteKey });

const purposeByID: Record<string, SkillPurpose> = {
    "community-image-prompt-library-v1": purpose("skillsPage.purposeMatch.visual.promise", "skillsPage.purposeMatch.visual.input", "skillsPage.purposeMatch.visual.output", "skillsPage.purposeMatch.visual.bestFor"),
    "studio-video-storyboard-timeline-v1": purpose("skillsPage.purpose.timeline.promise", "skillsPage.purpose.timeline.input", "skillsPage.purpose.timeline.output", "skillsPage.purpose.timeline.bestFor", "skillsPage.noteScriptCollection"),
    "studio-dynamic-character-bible-v1": purpose(
        "skillsPage.purpose.characterBible.promise",
        "skillsPage.purpose.characterBible.input",
        "skillsPage.purpose.characterBible.output",
        "skillsPage.purpose.characterBible.bestFor",
        "skillsPage.noteScriptCollection",
    ),
    "studio-emotion-peak-rhythm-v1": purpose("skillsPage.purpose.emotionRhythm.promise", "skillsPage.purpose.emotionRhythm.input", "skillsPage.purpose.emotionRhythm.output", "skillsPage.purpose.emotionRhythm.bestFor", "skillsPage.noteScriptCollection"),
    "studio-production-screenplay-v1": purpose("skillsPage.purpose.screenplay.promise", "skillsPage.purpose.screenplay.input", "skillsPage.purpose.screenplay.output", "skillsPage.purpose.screenplay.bestFor", "skillsPage.noteScriptCollection"),
    "studio-script-to-shotlist-v1": purpose("skillsPage.purpose.shotlist.promise", "skillsPage.purpose.shotlist.input", "skillsPage.purpose.shotlist.output", "skillsPage.purpose.shotlist.bestFor", "skillsPage.noteScriptCollection"),
    "studio-cinematic-scale-image-v1": purpose("skillsPage.purpose.scaleImage.promise", "skillsPage.purpose.scaleImage.input", "skillsPage.purpose.scaleImage.output", "skillsPage.purpose.scaleImage.bestFor", "skillsPage.noteCinematicCollection"),
    "studio-cinematic-frame-composer-v1": purpose(
        "skillsPage.purpose.frameComposer.promise",
        "skillsPage.purpose.frameComposer.input",
        "skillsPage.purpose.frameComposer.output",
        "skillsPage.purpose.frameComposer.bestFor",
        "skillsPage.noteCinematicCollection",
    ),
    "studio-cinematic-video-shot-v1": purpose("skillsPage.purpose.videoShot.promise", "skillsPage.purpose.videoShot.input", "skillsPage.purpose.videoShot.output", "skillsPage.purpose.videoShot.bestFor", "skillsPage.noteCinematicCollection"),
    "oss-drama-beat-sheet-v1": purpose("skillsPage.purpose.beatSheet.promise", "skillsPage.purpose.beatSheet.input", "skillsPage.purpose.beatSheet.output", "skillsPage.purpose.beatSheet.bestFor"),
    "oss-character-bible-v1": purpose("skillsPage.purpose.characterContinuity.promise", "skillsPage.purpose.characterContinuity.input", "skillsPage.purpose.characterContinuity.output", "skillsPage.purpose.characterContinuity.bestFor"),
    "oss-shot-arc-plan-v1": purpose("skillsPage.purpose.shotArc.promise", "skillsPage.purpose.shotArc.input", "skillsPage.purpose.shotArc.output", "skillsPage.purpose.shotArc.bestFor"),
    "oss-shot-boundary-index-v1": purpose("skillsPage.purpose.boundaryIndex.promise", "skillsPage.purpose.boundaryIndex.input", "skillsPage.purpose.boundaryIndex.output", "skillsPage.purpose.boundaryIndex.bestFor"),
    "oss-transcript-edl-v1": purpose("skillsPage.purpose.transcriptEdl.promise", "skillsPage.purpose.transcriptEdl.input", "skillsPage.purpose.transcriptEdl.output", "skillsPage.purpose.transcriptEdl.bestFor"),
    "oss-silence-cut-v1": purpose("skillsPage.purpose.silenceCut.promise", "skillsPage.purpose.silenceCut.input", "skillsPage.purpose.silenceCut.output", "skillsPage.purpose.silenceCut.bestFor"),
    "oss-subtitle-timing-qc-v1": purpose("skillsPage.purpose.subtitleQc.promise", "skillsPage.purpose.subtitleQc.input", "skillsPage.purpose.subtitleQc.output", "skillsPage.purpose.subtitleQc.bestFor"),
    "oss-final-render-qc-v1": purpose("skillsPage.purpose.renderQc.promise", "skillsPage.purpose.renderQc.input", "skillsPage.purpose.renderQc.output", "skillsPage.purpose.renderQc.bestFor"),
    "oss-video-continuity-lab-v1": purpose("skillsPage.purpose.continuityLab.promise", "skillsPage.purpose.continuityLab.input", "skillsPage.purpose.continuityLab.output", "skillsPage.purpose.continuityLab.bestFor"),
    "oss-video-motion-planner-v1": purpose("skillsPage.purpose.motionPlanner.promise", "skillsPage.purpose.motionPlanner.input", "skillsPage.purpose.motionPlanner.output", "skillsPage.purpose.motionPlanner.bestFor"),
};

const fallbackByTag: Record<string, SkillPurpose> = {
    drama: purpose("skillsPage.purposeTag.drama.promise", "skillsPage.purposeTag.drama.input", "skillsPage.purposeTag.drama.output", "skillsPage.purposeTag.drama.bestFor"),
    ecommerce: purpose("skillsPage.purposeTag.ecommerce.promise", "skillsPage.purposeTag.ecommerce.input", "skillsPage.purposeTag.ecommerce.output", "skillsPage.purposeTag.ecommerce.bestFor"),
    creative: purpose("skillsPage.purposeTag.creative.promise", "skillsPage.purposeTag.creative.input", "skillsPage.purposeTag.creative.output", "skillsPage.purposeTag.creative.bestFor"),
    social: purpose("skillsPage.purposeTag.social.promise", "skillsPage.purposeTag.social.input", "skillsPage.purposeTag.social.output", "skillsPage.purposeTag.social.bestFor"),
    others: purpose("skillsPage.purposeTag.others.promise", "skillsPage.purposeTag.others.input", "skillsPage.purposeTag.others.output", "skillsPage.purposeTag.others.bestFor"),
};

export function describeSkill(skill: PurposeSkill): SkillPurpose {
    const direct = purposeByID[skill.skillId];
    if (direct) return direct;

    const text = `${skill.skillName} ${skill.description}`.toLowerCase();
    if (/字幕|转写|剪辑|静音|渲染|质检|修复|配音/.test(text)) return purpose("skillsPage.purposeMatch.post.promise", "skillsPage.purposeMatch.post.input", "skillsPage.purposeMatch.post.output", "skillsPage.purposeMatch.post.bestFor");
    if (/分镜|镜头|机位|拉片|storyboard|shot/.test(text)) return purpose("skillsPage.purposeMatch.shot.promise", "skillsPage.purposeMatch.shot.input", "skillsPage.purposeMatch.shot.output", "skillsPage.purposeMatch.shot.bestFor");
    if (/角色|人物|人像|世界观|ip|character/.test(text)) return purpose("skillsPage.purposeMatch.character.promise", "skillsPage.purposeMatch.character.input", "skillsPage.purposeMatch.character.output", "skillsPage.purposeMatch.character.bestFor");
    if (/剧本|故事|叙事|大纲|script|story/.test(text)) return purpose("skillsPage.purposeMatch.script.promise", "skillsPage.purposeMatch.script.input", "skillsPage.purposeMatch.script.output", "skillsPage.purposeMatch.script.bestFor");
    if (/节奏|尾钩|三幕|冲突|爽点|beat|rhythm/.test(text)) return purpose("skillsPage.purposeMatch.rhythm.promise", "skillsPage.purposeMatch.rhythm.input", "skillsPage.purposeMatch.rhythm.output", "skillsPage.purposeMatch.rhythm.bestFor");
    if (/生图|构图|图生|电影感|视觉|image|video/.test(text)) return purpose("skillsPage.purposeMatch.visual.promise", "skillsPage.purposeMatch.visual.input", "skillsPage.purposeMatch.visual.output", "skillsPage.purposeMatch.visual.bestFor");
    return fallbackByTag[skill.tag] ?? fallbackByTag.others;
}
