import { buildImageResolutionOptions, imageRatioForSize, imageResolutionOption } from "@/lib/image-resolution-tiers";
import type { ImageCapabilityConfig } from "@/lib/model-capabilities";

/** Some channels use quality for the resolution tier rather than rendering quality. */
export function imageQualityIsResolution(profile: ImageCapabilityConfig) {
    return profile.quality.supported && profile.quality.values.length > 0 && profile.quality.values.every((value) => /^(?:auto|\d+k)$/i.test(value));
}

export function imageQualityDuplicatesResolution(profile: ImageCapabilityConfig) {
    return Boolean(profile.resolution?.supported && imageQualityIsResolution(profile) && profile.quality.values.every((value) => profile.resolution!.values.some((resolution) => resolution.toLowerCase() === value.toLowerCase())));
}

export function imageParameterSummary(
    profile: ImageCapabilityConfig,
    value: { size: string; quality: string; imageResolution?: string; count: string },
    labels: { automatic: string; quality: (value: string) => string; count: (value: string) => string },
    showCount = true,
) {
    const pixel = profile.size.parameter === "size" ? imageResolutionOption(buildImageResolutionOptions([value.size]), value.size) : undefined;
    const ratio = imageRatioForSize(value.size) || value.size;
    const resolution = profile.resolution?.supported ? value.imageResolution : imageQualityIsResolution(profile) ? value.quality : pixel?.tier;
    return [
        ...(profile.size.parameter !== "none" ? [ratio === "auto" ? labels.automatic : ratio] : []),
        ...(resolution ? [resolution === "auto" ? labels.automatic : resolution.toUpperCase()] : []),
        ...(profile.quality.supported && !imageQualityIsResolution(profile) ? [labels.quality(value.quality)] : []),
        ...(showCount && profile.maxOutputs > 1 ? [labels.count(value.count)] : []),
    ]
        .filter((part, index, parts) => parts.indexOf(part) === index)
        .join(" · ");
}
