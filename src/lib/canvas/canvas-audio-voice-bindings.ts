import { createAudioValidationError } from "@/i18n/ddcat-updates";
import type { CanvasResourceReference } from "./canvas-resource-references";

export type CanvasAudioVoiceBinding = { characterNodeId: string; audioNodeId: string };

export function normalizeCanvasAudioVoiceBindings(value: unknown): CanvasAudioVoiceBinding[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.flatMap((item) => {
        const characterNodeId = typeof item?.characterNodeId === "string" ? item.characterNodeId.trim() : "";
        const audioNodeId = typeof item?.audioNodeId === "string" ? item.audioNodeId.trim() : "";
        if (!characterNodeId || !audioNodeId || characterNodeId === audioNodeId || seen.has(characterNodeId)) return [];
        seen.add(characterNodeId);
        return [{ characterNodeId, audioNodeId }];
    });
}

export function filterActiveCanvasAudioVoiceBindings(bindings: unknown, references: Pick<CanvasResourceReference, "nodeId" | "kind" | "active">[]): CanvasAudioVoiceBinding[] {
    const activeCharacters = new Set(references.filter((item) => item.kind === "character" && item.active !== false).map((item) => item.nodeId));
    const activeAudios = new Set(references.filter((item) => item.kind === "audio" && item.active !== false).map((item) => item.nodeId));
    return normalizeCanvasAudioVoiceBindings(bindings).filter((item) => activeCharacters.has(item.characterNodeId) && activeAudios.has(item.audioNodeId));
}

export function stripCanvasAudioVoiceBindingLines(prompt: string) {
    return prompt.replace(/\n*【角色音色对应】[^\n]*/g, "").trim();
}

export function compileCanvasAudioVoiceBindings(prompt: string, bindings: CanvasAudioVoiceBinding[], references: Pick<CanvasResourceReference, "nodeId" | "kind" | "title" | "label">[]) {
    const lines = normalizeCanvasAudioVoiceBindings(bindings).map((binding) => {
        const character = references.find((item) => item.nodeId === binding.characterNodeId && item.kind === "character");
        const audio = references.find((item) => item.nodeId === binding.audioNodeId && item.kind === "audio");
        if (!character || !audio) throw createAudioValidationError("角色或参考音频连接已变化，请重新确认音色对应关系");
        return `【角色音色对应】${character.title || character.label} → @[node:${audio.nodeId}]`;
    });
    const base = stripCanvasAudioVoiceBindingLines(prompt);
    return lines.length ? `${base}\n\n${lines.join("\n")}` : base;
}

export function resolveCompiledAudioVoiceBindingsPrompt(prompt: string, bindings: CanvasAudioVoiceBinding[], references: Pick<CanvasResourceReference, "nodeId" | "kind" | "title" | "label">[], referenceAudios: Array<{ id: string }>) {
    const compiled = compileCanvasAudioVoiceBindings(prompt, bindings, references);
    if (!bindings.length) return compiled;
    return compiled.replace(/(【角色音色对应】[^\n]*?→\s*)@\[node:([^\]]+)\]/g, (_full, prefix: string, audioNodeId: string) => {
        const audioIndex = referenceAudios.findIndex((item) => item.id === audioNodeId);
        if (audioIndex < 0) throw createAudioValidationError("角色或参考音频连接已变化，请重新确认音色对应关系");
        return `${prefix}@音频${audioIndex + 1}`;
    });
}

export function restoreConnectedAudioReferences<T extends { referenceAudios: Array<{ id: string }>; characterReferences: Array<{ nodeId: string }>; audioCount: number }>(
    context: T,
    connectedInputs: Array<{ nodeId: string; type: string; audio?: T["referenceAudios"][number]; character?: T["characterReferences"][number] }>,
    bindings: CanvasAudioVoiceBinding[],
): T {
    const hasExplicitAudioMention = context.referenceAudios.length > 0;
    const audioIds = new Set(context.referenceAudios.map((item) => item.id));
    const boundAudioIds = new Set(bindings.map((item) => item.audioNodeId));
    const nextAudios = [...context.referenceAudios];
    for (const input of connectedInputs) {
        if (input.type !== "audio" || !input.audio || audioIds.has(input.audio.id)) continue;
        if (!hasExplicitAudioMention || boundAudioIds.has(input.nodeId)) {
            nextAudios.push(input.audio);
            audioIds.add(input.audio.id);
        }
    }
    const hasExplicitCharacterMention = context.characterReferences.length > 0;
    const charNodeIds = new Set(context.characterReferences.map((item) => item.nodeId));
    const boundCharIds = new Set(bindings.map((item) => item.characterNodeId));
    const nextCharacters = [...context.characterReferences];
    for (const input of connectedInputs) {
        if (input.type !== "character" || !input.character || charNodeIds.has(input.character.nodeId)) continue;
        if (!hasExplicitCharacterMention || boundCharIds.has(input.nodeId)) {
            nextCharacters.push(input.character);
            charNodeIds.add(input.character.nodeId);
        }
    }
    if (nextAudios.length === context.referenceAudios.length && nextCharacters.length === context.characterReferences.length) return context;
    return { ...context, referenceAudios: nextAudios, characterReferences: nextCharacters, audioCount: nextAudios.length };
}

export function trimAudioGenerationContext<T extends { referenceImages: unknown[]; referenceAudios: unknown[]; imageCount: number; audioCount: number }>(context: T, audioMode: "tts" | "unified_edit" | undefined, usesWorkflowProvider = false): T {
    if (usesWorkflowProvider) return context;
    if (audioMode === "unified_edit") {
        if (!context.referenceImages.length && context.imageCount === 0) return context;
        return { ...context, referenceImages: [], imageCount: 0 };
    }
    if (!context.referenceImages.length && !context.referenceAudios.length && context.imageCount === 0 && context.audioCount === 0) return context;
    return { ...context, referenceImages: [], referenceAudios: [], imageCount: 0, audioCount: 0 };
}
