import { useState, type ImgHTMLAttributes } from "react";

import { responsiveArchivedImage, type ArchivedImageWidth, type ResponsiveImageSource } from "./image-variants";

type ArchivedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
    /** Original /liblib-clone path; always the fallback. */
    src: string;
    widths: readonly ArchivedImageWidth[];
    /** Called once the variant failed and the original is being shown. */
    onFallback?: (src: string) => void;
};

/**
 * Renders a resized variant and swaps to the original on the first error.
 * Variants are generated on the media host at deploy time, so a release that
 * reaches users before the script ran must still show every image.
 */
export function ArchivedImage({ src, widths, sizes, onFallback, onError, ...rest }: ArchivedImageProps) {
    const [failedSrc, setFailedSrc] = useState<string>();
    const source: ResponsiveImageSource = failedSrc === src ? { src, resized: false } : responsiveArchivedImage(src, widths);
    return (
        <img
            {...rest}
            src={source.src}
            srcSet={source.srcSet}
            sizes={source.srcSet ? sizes : undefined}
            onError={(event) => {
                if (source.resized) {
                    setFailedSrc(src);
                    onFallback?.(src);
                    return;
                }
                onError?.(event);
            }}
        />
    );
}
