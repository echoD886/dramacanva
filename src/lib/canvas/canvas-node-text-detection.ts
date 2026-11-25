import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { modelSupportsImageInspection } from "./image-to-previs-agent";
import type { AiConfig } from "@/stores/use-config-store";

/** All canvas text-model requests that carry an image share the capability gate. */
export function canvasTextDetectionSupportError(config: AiConfig, model: string) {
    return model && !modelSupportsImageInspection(config, model) ? t("upstream.v165.message147") : "";
}
