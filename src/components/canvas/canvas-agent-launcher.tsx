import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { useDcPosition } from "@/components/layout/use-dc-position";
import { DcPortrait } from "@/components/layout/dc-portrait";
import type { CanvasTheme } from "@/lib/canvas-theme";

import type { DcActivity } from "@/components/layout/dc-motion";

export function AgentLauncher({ theme, statusColor, approvalPending, activity = "idle", reducedMotion, onOpen }: { theme: CanvasTheme; statusColor: string; approvalPending: boolean; activity?: DcActivity; reducedMotion: boolean; onOpen: () => void }) {
    const { t } = useI18n();
    const { ref, position, handlers } = useDcPosition();
    const action = t(approvalPending ? "canvasAgentEntry.reviewAction" : "canvasAgentEntry.chatAction");
    return (
        <motion.button
            ref={ref}
            {...handlers}
            type="button"
            aria-label={`DC · ${action}`}
            title={approvalPending ? t("canvasCloudAgent.launcherApprovalTitle") : t("canvasCloudAgent.launcherTitle")}
            className="canvas-agent-launcher fixed bottom-5 right-5 z-[var(--z-modal-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/35 max-sm:bottom-36"
            style={{ ...position, color: theme.node.text, "--canvas-agent-status-color": statusColor } as CSSProperties}
            data-canvas-no-zoom
            onClick={onOpen}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
        >
            <DcPortrait action={action} activity={activity} />
        </motion.button>
    );
}
