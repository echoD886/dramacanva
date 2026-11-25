import { resolveModelGenerationDefaults } from "@/lib/model-selection";
import { starterModelForCapability, type AiConfig } from "@/stores/use-config-store";
import { ONBOARDING_IMAGE_SIZE } from "./canvas-onboarding-template";

/** The guided flow uses the same priced catalog presets as a fresh canvas. */
export function onboardingGenerationDefaults(config: AiConfig) {
    const textModel = starterModelForCapability(config, "text") || config.textModel;
    const imageModel = starterModelForCapability(config, "image") || config.imageModel;
    const videoModel = starterModelForCapability(config, "video") || config.videoModel;
    const video = resolveModelGenerationDefaults(config, videoModel, "video", { size: "9:16" });
    return {
        text: { model: textModel },
        image: { model: imageModel, size: ONBOARDING_IMAGE_SIZE },
        video: { model: videoModel, size: video.size, seconds: video.videoSeconds, vquality: video.vquality, generateAudio: video.videoGenerateAudio, watermark: video.videoWatermark },
    };
}
