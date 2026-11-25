import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import type { AiConfig } from "@/stores/use-config-store";

const names: Record<"text" | "image" | "video" | "audio", string[]> = {
    text: ["reasoning_effort", "max_tokens", "max_completion_tokens", "temperature", "top_p", "top_k", "response_format"],
    image: ["output_format", "response_format", "background", "model_params.speed"],
    video: ["fps", "mode", "draft", "output_format", "seed", "person_generation", "resize_mode", "enhance_prompt", "content_filter", "fast_mode", "context_ir"],
    audio: [],
};

export function documentedParameterChoices(config: AiConfig, mode: keyof typeof names) {
    const parameters = modelCapabilityConfigFor(config, config.model).parameters || {};
    return Object.entries(parameters).filter(([name, parameter]) => names[mode].includes(name) && (parameter.values?.length || parameter.range));
}

export function selectedModelParameters(config: AiConfig, mode: keyof typeof names): Record<string, unknown> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(config.modelParameters || "{}");
    } catch {
        return {};
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // A stale catalog must not erase a saved selection before backend routing
    // validates it against the chosen channel's current capability.
    const available = new Set(names[mode]);
    return Object.fromEntries(Object.entries(parsed).filter(([name, value]) => available.has(name) && value !== undefined && value !== null && value !== ""));
}
