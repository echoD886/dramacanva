import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { MessageKey } from "@/i18n/messages";
import { decodeChannelModel, encodeChannelModel, type AiConfig } from "@/stores/use-config-store";
import type { CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";
import { GENERATION_CONTRACT_VERSION, GENERATION_LIMITS, GENERATION_OPTION_FIELDS, type GenerationSpec, type ModelSelection, type Options, type ReferenceBinding } from "./generation-contract.generated";

export type { GenerationSpec, ModelSelection, ReferenceBinding } from "./generation-contract.generated";

export function canvasGenerationMode(mode: string): GenerationSpec["mode"] | undefined {
    return mode === "image" || mode === "video" || mode === "audio" ? mode : undefined;
}

function fieldError(path: string, message: MessageKey): never {
    throw new Error(t("creationRuntime.contractError", { path, reason: t(message) }));
}

function object(value: unknown, path: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return fieldError(path, "creationRuntime.objectRequired");
    return value as Record<string, unknown>;
}

function allowKeys(value: Record<string, unknown>, keys: string[], path: string) {
    const unexpected = Object.keys(value).find((key) => !keys.includes(key));
    if (unexpected) fieldError(path, "creationRuntime.unsupportedFields");
}

function optionValue(value: unknown, kind: string, path: string) {
    if (kind === "boolean") {
        if (value === true || value === "true") return true;
        if (value === false || value === "false") return false;
    } else if (kind === "number") {
        const number = typeof value === "number" ? value : typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : NaN;
        if (Number.isSafeInteger(number)) return number;
    } else if (typeof value === "string") return value;
    return fieldError(path, kind === "boolean" ? "creationRuntime.booleanRequired" : kind === "number" ? "creationRuntime.integerRequired" : "creationRuntime.textRequired");
}

export function validateGenerationSpec(value: unknown): GenerationSpec {
    const raw = object(value, "generationSpec");
    allowKeys(raw, ["version", "mode", "prompt", "modelSelection", "options", "referenceBindings", "textInputMode"], "generationSpec");
    if (raw.version !== GENERATION_CONTRACT_VERSION) fieldError("version", "creationRuntime.versionUnsupported");
    const mode = typeof raw.mode === "string" ? canvasGenerationMode(raw.mode) : undefined;
    if (!mode) fieldError("mode", "creationRuntime.invalidChoice");
    if (typeof raw.prompt !== "string" || Array.from(raw.prompt).length > GENERATION_LIMITS.prompt) fieldError("prompt", "creationRuntime.promptInvalid");
    if (raw.textInputMode !== "prompt-only" && raw.textInputMode !== "append-sources") fieldError("textInputMode", "creationRuntime.invalidChoice");
    let modelSelection: ModelSelection | undefined;
    if (raw.modelSelection !== undefined) {
        const selection = object(raw.modelSelection, "modelSelection");
        if (selection.kind === "logical") {
            allowKeys(selection, ["kind", "logicalModelId"], "modelSelection");
            if (typeof selection.logicalModelId !== "string" || !selection.logicalModelId.trim()) fieldError("modelSelection.logicalModelId", "creationRuntime.nonemptyRequired");
            modelSelection = { kind: "logical", logicalModelId: selection.logicalModelId };
        } else if (selection.kind === "channel") {
            allowKeys(selection, ["kind", "channelId", "modelKey"], "modelSelection");
            if (typeof selection.channelId !== "string" || !selection.channelId.trim() || typeof selection.modelKey !== "string" || !selection.modelKey.trim()) fieldError("modelSelection", "creationRuntime.nonemptyRequired");
            modelSelection = { kind: "channel", channelId: selection.channelId, modelKey: selection.modelKey };
        } else fieldError("modelSelection.kind", "creationRuntime.invalidChoice");
    }
    const rawOptions = object(raw.options, "options");
    allowKeys(
        rawOptions,
        GENERATION_OPTION_FIELDS.map((field) => field.name),
        "options",
    );
    const options: Record<string, unknown> = {};
    for (const field of GENERATION_OPTION_FIELDS) {
        const current = rawOptions[field.name];
        if (current === undefined) continue;
        if (!(field.modes as readonly string[]).includes(mode)) fieldError(`options.${field.name}`, "creationRuntime.modeMismatch");
        if (typeof current !== field.kind) fieldError(`options.${field.name}`, "creationRuntime.typeInvalid");
        options[field.name] = optionValue(current, field.kind, `options.${field.name}`);
    }
    if (typeof options.durationSeconds === "number" && options.durationSeconds < 0) fieldError("options.durationSeconds", "creationRuntime.nonnegativeRequired");
    if (typeof options.count === "number" && options.count < 1) fieldError("options.count", "creationRuntime.positiveRequired");
    if (!Array.isArray(raw.referenceBindings)) fieldError("referenceBindings", "creationRuntime.arrayRequired");
    const ids = new Set<string>();
    const orders = new Set<number>();
    const referenceBindings = raw.referenceBindings.map((value, index): ReferenceBinding => {
        const ref = object(value, `referenceBindings[${index}]`);
        allowKeys(ref, ["id", "nodeId", "resourceId", "transientId", "mediaType", "role", "order", "resolution"], "referenceBindings");
        if (typeof ref.id !== "string" || !ref.id || ids.has(ref.id)) fieldError("referenceBindings.id", "creationRuntime.uniqueRequired");
        if (typeof ref.order !== "number" || !Number.isSafeInteger(ref.order) || ref.order < 0 || orders.has(ref.order)) fieldError("referenceBindings.order", "creationRuntime.uniqueRequired");
        for (const key of ["nodeId", "resourceId", "transientId"]) if (ref[key] !== undefined && (typeof ref[key] !== "string" || !ref[key])) fieldError(`referenceBindings.${key}`, "creationRuntime.nonemptyRequired");
        if (!ref.nodeId && !ref.resourceId && !ref.transientId) fieldError("referenceBindings", "creationRuntime.referenceSourceMissing");
        if (ref.transientId && (ref.nodeId || ref.resourceId)) fieldError("referenceBindings", "creationRuntime.referenceSourceMixed");
        if (!["image", "video", "audio", "text"].includes(String(ref.mediaType))) fieldError("referenceBindings.mediaType", "creationRuntime.invalidChoice");
        if (!["reference", "source-text", "first-frame", "last-frame", "mask"].includes(String(ref.role))) fieldError("referenceBindings.role", "creationRuntime.invalidChoice");
        if (ref.role === "source-text" && ref.mediaType !== "text") fieldError("referenceBindings.role", "creationRuntime.textReferenceRequired");
        if (["first-frame", "last-frame", "mask"].includes(String(ref.role)) && ref.mediaType !== "image") fieldError("referenceBindings.role", "creationRuntime.imageReferenceRequired");
        if (ref.resolution !== "latest" && ref.resolution !== "snapshot") fieldError("referenceBindings.resolution", "creationRuntime.invalidChoice");
        ids.add(ref.id);
        orders.add(ref.order);
        return ref as unknown as ReferenceBinding;
    });
    return { version: GENERATION_CONTRACT_VERSION, mode, prompt: raw.prompt, options, modelSelection, referenceBindings, textInputMode: raw.textInputMode } as GenerationSpec;
}

/** The single compatibility boundary for the existing flat canvas wire format. */
export function readNodeGenerationSpec(node: Pick<CanvasNodeData, "type" | "metadata">): GenerationSpec | undefined {
    const mode = canvasGenerationMode(node.type);
    if (!mode) return undefined;
    const metadata = (node.metadata || {}) as Record<string, unknown>;
    const stored = metadata.generationSpec ? validateGenerationSpec(metadata.generationSpec) : undefined;
    if (stored && stored.mode !== mode) fieldError("mode", "creationRuntime.modeMismatch");
    const options: Record<string, unknown> = { ...stored?.options };
    // generationSpec is the canonical contract once present. Legacy node fields are only
    // read for migration, otherwise a stale compatibility mirror can silently overwrite
    // an explicitly stored false/zero value.
    if (!stored) {
        for (const field of GENERATION_OPTION_FIELDS) {
            if (!(field.modes as readonly string[]).includes(mode)) continue;
            if (!(field.node in metadata)) continue;
            const value = metadata[field.node];
            if (value === undefined || value === null || value === "") delete options[field.name];
            else options[field.name] = optionValue(value, field.kind, field.node);
        }
    }
    const modelSelection = stored
        ? stored.modelSelection
        : (typeof metadata.logicalModelId === "string" && metadata.logicalModelId ? ({ kind: "logical", logicalModelId: metadata.logicalModelId } as const) : undefined) ||
          (typeof metadata.channelId === "string" && typeof metadata.channelModelKey === "string" ? ({ kind: "channel", channelId: metadata.channelId, modelKey: metadata.channelModelKey } as const) : undefined) ||
          (typeof metadata.model === "string"
              ? (() => {
                    const model = decodeChannelModel(metadata.model);
                    return model ? ({ kind: "channel", channelId: model.channelId, modelKey: model.model } as const) : undefined;
                })()
              : undefined);
    const prompt = stored?.prompt ?? (typeof metadata.composerContent === "string" ? metadata.composerContent : typeof metadata.prompt === "string" ? metadata.prompt : "");
    return validateGenerationSpec({
        version: GENERATION_CONTRACT_VERSION,
        mode,
        prompt,
        options,
        ...(modelSelection ? { modelSelection } : {}),
        referenceBindings: stored?.referenceBindings || [],
        textInputMode: stored?.textInputMode || (mode === "video" ? "prompt-only" : "append-sources"),
    });
}

export function nodeGenerationPrompt(node: Pick<CanvasNodeData, "type" | "metadata">): string {
    const mode = canvasGenerationMode(node.type);
    if (mode) {
        try {
            const spec = readNodeGenerationSpec(node);
            if (spec?.mode === mode) return spec.prompt;
        } catch {
            // A malformed legacy contract should not make canvas discovery fail.
        }
    }
    const metadata = node.metadata || {};
    return typeof metadata.composerContent === "string" ? metadata.composerContent : typeof metadata.prompt === "string" ? metadata.prompt : "";
}

export function canonicalGenerationMetadata(node: CanvasNodeData, mode: string): CanvasNodeMetadata {
    if (!canvasGenerationMode(mode)) return { ...node.metadata };
    const spec = readNodeGenerationSpec(node);
    return spec?.mode === mode ? { ...node.metadata, ...generationSpecMetadata(spec) } : { ...node.metadata };
}

export function resolveGenerationSelection(config: AiConfig, selection: ModelSelection | undefined): string {
    if (!selection) return "";
    if (selection.kind === "channel") {
        const channel = config.channels.find((item) => item.id === selection.channelId && item.enabled !== false);
        return channel?.models.includes(selection.modelKey) ? encodeChannelModel(channel.id, selection.modelKey) : "";
    }
    for (const channel of config.channels) {
        if (channel.enabled === false) continue;
        const model = channel.modelCosts?.find((item) => item.logicalModelId === selection.logicalModelId && channel.models.includes(item.model));
        if (model) return encodeChannelModel(channel.id, model.model);
    }
    return "";
}

export function selectionForConfig(config: AiConfig): ModelSelection | undefined {
    const selected = decodeChannelModel(config.model);
    if (!selected) return undefined;
    const logicalModelId = config.channels.find((channel) => channel.id === selected.channelId)?.modelCosts?.find((item) => item.model === selected.model)?.logicalModelId;
    return logicalModelId ? { kind: "logical", logicalModelId } : { kind: "channel", channelId: selected.channelId, modelKey: selected.model };
}

export function specFromConfig(mode: GenerationSpec["mode"], prompt: string, config: AiConfig, referenceBindings: ReferenceBinding[] = [], textInputMode: GenerationSpec["textInputMode"] = "prompt-only"): GenerationSpec {
    const options: Record<string, unknown> = {};
    for (const field of GENERATION_OPTION_FIELDS) {
        if (!(field.modes as readonly string[]).includes(mode)) continue;
        const value = config[field.task as keyof AiConfig];
        if (value !== undefined && value !== null && value !== "") options[field.name] = optionValue(value, field.kind, field.task);
    }
    return validateGenerationSpec({ version: GENERATION_CONTRACT_VERSION, mode, prompt, modelSelection: selectionForConfig(config), options, referenceBindings, textInputMode });
}

export function generationSpecMetadata(spec: GenerationSpec): CanvasNodeMetadata {
    // model is always projected, including undefined. This clears a stale
    // physical-channel mirror when the canonical contract selects a logical model.
    const result: Record<string, unknown> = { generationSpec: spec, composerContent: spec.prompt, model: undefined, logicalModelId: undefined, channelId: undefined, channelModelKey: undefined };
    for (const field of GENERATION_OPTION_FIELDS) {
        if (!(field.modes as readonly string[]).includes(spec.mode)) continue;
        const value = spec.options[field.name as keyof Options];
        result[field.node] = value === undefined ? undefined : field.node === "count" ? value : String(value);
    }
    if (spec.modelSelection?.kind === "channel") result.model = encodeChannelModel(spec.modelSelection.channelId, spec.modelSelection.modelKey);
    if (spec.modelSelection?.kind === "logical") result.logicalModelId = spec.modelSelection.logicalModelId;
    return result as CanvasNodeMetadata;
}

export function synchronizeGenerationSpec(node: CanvasNodeData, patch: Partial<CanvasNodeMetadata> = {}): CanvasNodeData {
    const metadata = { ...node.metadata, ...patch };
    if (!canvasGenerationMode(node.type)) return { ...node, metadata };
    if (Object.prototype.hasOwnProperty.call(patch, "generationSpec") && patch.generationSpec !== undefined) {
        const spec = readNodeGenerationSpec({ ...node, metadata });
        return { ...node, metadata: { ...metadata, ...generationSpecMetadata(spec!) } };
    }
    const current = readNodeGenerationSpec(node);
    if (!current) return { ...node, metadata };
    const next: GenerationSpec = { ...current, options: { ...current.options } };
    for (const field of GENERATION_OPTION_FIELDS) {
        if (!(field.modes as readonly string[]).includes(current.mode) || !Object.prototype.hasOwnProperty.call(patch, field.node)) continue;
        const value = patch[field.node as keyof CanvasNodeMetadata];
        if (value === undefined || value === null || value === "") delete next.options[field.name as keyof Options];
        else next.options[field.name as keyof Options] = optionValue(value, field.kind, field.node) as never;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "composerContent") && typeof patch.composerContent === "string") next.prompt = patch.composerContent;
    else if (Object.prototype.hasOwnProperty.call(patch, "prompt") && typeof patch.prompt === "string") next.prompt = patch.prompt;
    if (Object.prototype.hasOwnProperty.call(patch, "model")) {
        const model = patch.model ? decodeChannelModel(patch.model) : null;
        next.modelSelection = model ? { kind: "channel", channelId: model.channelId, modelKey: model.model } : undefined;
        delete (metadata as Record<string, unknown>).logicalModelId;
        delete (metadata as Record<string, unknown>).channelId;
        delete (metadata as Record<string, unknown>).channelModelKey;
    }
    return { ...node, metadata: { ...metadata, ...generationSpecMetadata(validateGenerationSpec(next)) } };
}
