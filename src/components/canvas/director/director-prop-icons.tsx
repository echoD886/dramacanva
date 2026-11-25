import { type ReactNode } from "react";

export function PropSilhouette({ name, primitive }: { name: string; primitive?: string }): ReactNode {
    // Match by name or primitive
    const n = name.toLowerCase();

    if (n.includes("单人沙发")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V14C12 11.8 13.8 10 16 10H32C34.2 10 36 11.8 36 14V20" />
                <rect x="8" y="20" width="8" height="16" rx="3" />
                <rect x="32" y="20" width="8" height="16" rx="3" />
                <rect x="16" y="22" width="16" height="14" rx="2" />
                <line x1="12" y1="36" x2="10" y2="42" />
                <line x1="36" y1="36" x2="38" y2="42" />
            </svg>
        );
    }
    if (n.includes("三人沙发") || n.includes("沙发")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 20V14C10 11.8 11.8 10 14 10H34C36.2 10 38 11.8 38 14V20" />
                <rect x="6" y="20" width="6" height="16" rx="2.5" />
                <rect x="36" y="20" width="6" height="16" rx="2.5" />
                <rect x="12" y="22" width="24" height="14" rx="2" />
                <line x1="20" y1="22" x2="20" y2="36" strokeDasharray="1 2" />
                <line x1="28" y1="22" x2="28" y2="36" strokeDasharray="1 2" />
                <line x1="10" y1="36" x2="8" y2="42" />
                <line x1="38" y1="36" x2="40" y2="42" />
            </svg>
        );
    }
    if (n.includes("餐桌") || n.includes("桌")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="16" width="32" height="6" rx="2" fill="currentColor" fillOpacity="0.12" />
                <line x1="12" y1="22" x2="12" y2="40" />
                <line x1="36" y1="22" x2="36" y2="40" />
                <line x1="16" y1="22" x2="16" y2="38" strokeOpacity="0.5" />
                <line x1="32" y1="22" x2="32" y2="38" strokeOpacity="0.5" />
            </svg>
        );
    }
    if (n.includes("茶几")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="24" width="32" height="5" rx="2" fill="currentColor" fillOpacity="0.12" />
                <line x1="12" y1="29" x2="10" y2="40" />
                <line x1="36" y1="29" x2="38" y2="40" />
                <line x1="16" y1="29" x2="14" y2="38" strokeOpacity="0.5" />
                <line x1="32" y1="29" x2="34" y2="38" strokeOpacity="0.5" />
            </svg>
        );
    }
    if (n.includes("凳") || n.includes("椅")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="24" cy="22" rx="14" ry="5" fill="currentColor" fillOpacity="0.12" />
                <line x1="14" y1="24" x2="10" y2="42" />
                <line x1="34" y1="24" x2="38" y2="42" />
                <line x1="24" y1="27" x2="24" y2="42" />
                <ellipse cx="24" cy="34" rx="8" ry="2.5" strokeOpacity="0.4" />
            </svg>
        );
    }
    if (n.includes("床")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="8" width="28" height="8" rx="2" />
                <rect x="10" y="16" width="28" height="24" rx="3" fill="currentColor" fillOpacity="0.08" />
                <rect x="13" y="18" width="10" height="6" rx="1.5" />
                <rect x="25" y="18" width="10" height="6" rx="1.5" />
                <line x1="10" y1="28" x2="38" y2="28" strokeOpacity="0.5" />
            </svg>
        );
    }
    if (n.includes("墙")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="10" width="28" height="30" rx="2" fill="currentColor" fillOpacity="0.1" />
                <line x1="10" y1="20" x2="38" y2="20" />
                <line x1="10" y1="30" x2="38" y2="30" />
                <line x1="24" y1="10" x2="24" y2="20" />
                <line x1="18" y1="20" x2="18" y2="30" />
                <line x1="30" y1="20" x2="30" y2="30" />
                <line x1="24" y1="30" x2="24" y2="40" />
            </svg>
        );
    }
    if (n.includes("门")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="12" y="8" width="24" height="34" rx="2" />
                <rect x="16" y="12" width="16" height="30" rx="1" fill="currentColor" fillOpacity="0.1" />
                <circle cx="28" cy="27" r="1.5" fill="currentColor" />
            </svg>
        );
    }
    if (n.includes("窗")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="10" width="28" height="28" rx="2" />
                <line x1="24" y1="10" x2="24" y2="38" />
                <line x1="10" y1="24" x2="38" y2="24" />
                <rect x="12" y="12" width="10" height="10" fill="currentColor" fillOpacity="0.12" />
                <rect x="26" y="12" width="10" height="10" fill="currentColor" fillOpacity="0.12" />
            </svg>
        );
    }
    if (n.includes("天花板") || n.includes("地板")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="24,10 42,20 24,30 6,20" fill="currentColor" fillOpacity="0.15" />
                <polygon points="24,18 42,28 24,38 6,28" strokeOpacity="0.4" />
            </svg>
        );
    }
    if (n.includes("楼梯") || n.includes("台阶")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 40H16V32H24V24H32V16H40V40H8Z" fill="currentColor" fillOpacity="0.1" />
            </svg>
        );
    }
    if (n.includes("房间") || n.includes("体块")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="24,8 40,17 24,26 8,17" fill="currentColor" fillOpacity="0.15" />
                <polygon points="8,17 24,26 24,42 8,33" fill="currentColor" fillOpacity="0.25" />
                <polygon points="40,17 24,26 24,42 40,33" fill="currentColor" fillOpacity="0.08" />
            </svg>
        );
    }
    if (n.includes("矮丘") || n.includes("山")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 38C12 38 16 22 24 22C32 22 36 38 42 38H6Z" fill="currentColor" fillOpacity="0.15" />
                <path d="M18 38C22 38 24 30 28 30C32 30 35 38 38 38" strokeOpacity="0.4" />
            </svg>
        );
    }
    if (n.includes("柱")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="24" cy="12" rx="10" ry="4" fill="currentColor" fillOpacity="0.2" />
                <line x1="14" y1="12" x2="14" y2="36" />
                <line x1="34" y1="12" x2="34" y2="36" />
                <ellipse cx="24" cy="36" rx="10" ry="4" fill="currentColor" fillOpacity="0.1" />
            </svg>
        );
    }
    if (n.includes("车") || n.includes("轿车")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 26L14 16H34L40 26V34H8V26Z" fill="currentColor" fillOpacity="0.1" />
                <line x1="16" y1="18" x2="32" y2="18" strokeOpacity="0.4" />
                <circle cx="15" cy="35" r="4" fill="currentColor" fillOpacity="0.3" />
                <circle cx="33" cy="35" r="4" fill="currentColor" fillOpacity="0.3" />
            </svg>
        );
    }
    if (n.includes("路灯") || n.includes("灯")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="42" x2="18" y2="14" />
                <path d="M18 14C18 8 30 8 30 14V17" />
                <polygon points="26,17 34,17 36,22 24,22" fill="currentColor" fillOpacity="0.2" />
                <line x1="12" y1="42" x2="24" y2="42" />
            </svg>
        );
    }
    if (n.includes("树") || n.includes("行道树")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="24" y1="28" x2="24" y2="42" strokeWidth="2.5" />
                <circle cx="24" cy="20" r="12" fill="currentColor" fillOpacity="0.15" />
                <path d="M18 22C18 16 30 16 30 22" strokeOpacity="0.4" />
            </svg>
        );
    }
    if (n.includes("货架")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="8" width="28" height="34" rx="2" />
                <line x1="10" y1="18" x2="38" y2="18" />
                <line x1="10" y1="28" x2="38" y2="28" />
                <rect x="14" y="21" width="8" height="7" rx="1" fill="currentColor" fillOpacity="0.12" />
                <rect x="26" y="21" width="8" height="7" rx="1" fill="currentColor" fillOpacity="0.12" />
            </svg>
        );
    }
    if (n.includes("箱") || n.includes("盒子")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="14" width="28" height="24" rx="3" fill="currentColor" fillOpacity="0.12" />
                <line x1="10" y1="22" x2="38" y2="22" />
                <line x1="24" y1="14" x2="24" y2="38" strokeDasharray="2 2" strokeOpacity="0.6" />
            </svg>
        );
    }
    if (n.includes("植") || n.includes("绿植") || n.includes("花")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="17,30 31,30 29,42 19,42" fill="currentColor" fillOpacity="0.2" />
                <path d="M24 30V14" />
                <path d="M24 22C20 18 16 18 16 22C16 26 24 24 24 24" fill="currentColor" fillOpacity="0.15" />
                <path d="M24 18C28 14 32 14 32 18C32 22 24 20 24 20" fill="currentColor" fillOpacity="0.15" />
            </svg>
        );
    }
    if (primitive === "sphere" || n.includes("球")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="14" fill="currentColor" fillOpacity="0.12" />
                <ellipse cx="24" cy="24" rx="14" ry="5" strokeDasharray="2 2" strokeOpacity="0.6" />
            </svg>
        );
    }
    if (primitive === "cylinder" || n.includes("柱")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="24" cy="14" rx="12" ry="5" fill="currentColor" fillOpacity="0.15" />
                <line x1="12" y1="14" x2="12" y2="34" />
                <line x1="36" y1="14" x2="36" y2="34" />
                <ellipse cx="24" cy="34" rx="12" ry="5" fill="currentColor" fillOpacity="0.1" />
            </svg>
        );
    }
    if (primitive === "plane" || n.includes("面")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="24,14 42,24 24,34 6,24" fill="currentColor" fillOpacity="0.15" />
                <line x1="15" y1="19" x2="33" y2="29" strokeOpacity="0.4" strokeDasharray="2 2" />
            </svg>
        );
    }
    if (primitive === "character" || n.includes("角色") || n.includes("演员")) {
        return (
            <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="14" r="5" fill="currentColor" fillOpacity="0.2" />
                <path d="M16 38V28C16 24.5 19.5 22 24 22C28.5 22 32 24.5 32 28V38" fill="currentColor" fillOpacity="0.12" />
                <line x1="20" y1="38" x2="20" y2="44" />
                <line x1="28" y1="38" x2="28" y2="44" />
            </svg>
        );
    }

    // Default Cube / Box
    return (
        <svg viewBox="0 0 48 48" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="24,9 39,17.5 24,26 9,17.5" fill="currentColor" fillOpacity="0.18" />
            <polygon points="9,17.5 24,26 24,39 9,30.5" fill="currentColor" fillOpacity="0.28" />
            <polygon points="39,17.5 24,26 24,39 39,30.5" fill="currentColor" fillOpacity="0.1" />
        </svg>
    );
}
