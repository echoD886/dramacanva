import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { appearanceLogoURL, useAppearanceStore } from "@/stores/use-appearance-store";
import { useThemeStore, type ThemeName } from "@/stores/use-theme-store";

type BrandLogoProps = {
    className?: string;
    fallback?: ReactNode;
    alt?: string;
    theme?: ThemeName | "auto";
};

export function BrandLogo({ className, fallback, alt = "", theme = "auto" }: BrandLogoProps) {
    const appearance = useAppearanceStore((state) => state.appearance);
    const currentTheme = useThemeStore((state) => state.theme);
    if (!appearance.logoConfigured && fallback !== undefined) return <>{fallback}</>;
    return <img src={appearanceLogoURL(appearance, theme === "auto" ? currentTheme : theme)} alt={alt} width={512} height={405} className={cn("block object-contain", className)} draggable={false} />;
}

