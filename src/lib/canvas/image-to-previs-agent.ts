import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { canvasResourceMentionToken, type CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { resolveModelChannel, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";

// Tool names and protocol instructions stay stable across interface languages.
// The run's locale governs the Agent's explanation and generated scene names.
export const IMAGE_TO_PREVIS_AGENT_INSTRUCTION = [
    "Reconstruct this canvas image as an editable 3D Previs scene. Do not insert the original image into the scene.",
    "First use canvas_inspect_image to observe the actual image. Do not infer it from its title, prompt or filename. If that tool is unavailable, explain that the model cannot inspect images and stop; image_text_detect is not a substitute.",
    "Use canvas_get_state and previs_scene_read to inspect the current canvas. Update the corresponding scene if it exists; otherwise use previs_scene_create with the current canvas snapshot to create an empty scene. Before writing, read the rules, setup and actors manuals with previs_scene_read.",
    "Use previs_apply_patch to reconstruct the observed actors, props, environment, relative depth, position, orientation, scale, pose, cameras, framing and lighting as individually editable semantic objects.",
    "People must use actor objects that can be moved, rotated and posed. Do not use billboards, background images, reference planes or a prose-only description.",
    "Ordinary photographed people are not character cards. Use name, archetype, pose and position; do not supply characterName, characterAssetId, characterVersionId or referenceNodeId unless canvas_get_state explicitly returns workflowKind=character with all three matching IDs.",
    "Read the completed scene again to verify its objects, layout and camera. State anything the image does not establish. Use the user's requested language, otherwise the interface language, for your response and new object names.",
].join("\n");

export function buildImageToPrevisAgentPrompt(reference: CanvasResourceReference) {
    return `${canvasResourceMentionToken(reference)}\n${IMAGE_TO_PREVIS_AGENT_INSTRUCTION}`;
}
export function buildImageToPrevisDisplayText() {
    return t("previs.imageToScene");
}
export function modelSupportsImageInspection(config: AiConfig, model: string) {
    return (modelCapabilityConfigFor(config, model).text?.references.maxImages || 0) > 0;
}
export function selectImageInspectionModel(config: AiConfig, preferredModel: string) {
    const models = selectableModelsByCapability(config, "text");
    const supported = (model: string) => resolveModelChannel(config, model).scope === "system" && modelSupportsImageInspection(config, model);
    return preferredModel && supported(preferredModel) ? preferredModel : models.find(supported) || "";
}
