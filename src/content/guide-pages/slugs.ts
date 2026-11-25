/** Guide URLs only, so the router and startup code never bundle the guide copy itself. */
export const GUIDE_SLUGS = ["comfyui-workflow", "runninghub"] as const;

export const isGuidePath = (cleanPath: string) => GUIDE_SLUGS.some((slug) => cleanPath === "/" + slug);
