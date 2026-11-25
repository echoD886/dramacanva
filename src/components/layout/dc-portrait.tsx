import "./dc-companion.css";
import { DcMotion, type DcActivity } from "./dc-motion";

export function DcPortrait({ action, activity = "idle" }: { action: string; activity?: DcActivity }) {
    return (
        <span className="dc-portrait" aria-hidden="true">
            <DcMotion activity={activity} />
            <span className="dc-name">DC · <span>{action}</span></span>
        </span>
    );
}
