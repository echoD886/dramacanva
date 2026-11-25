import { useLayoutEffect } from "react";
import { useDcAgent, type DcCanvasBinding } from "@/stores/use-dc-agent";

export function CanvasAgentBinding(binding: DcCanvasBinding) {
    useLayoutEffect(() => {
        useDcAgent.setState({ canvas: binding });
        return () => {
            if (useDcAgent.getState().canvas === binding) useDcAgent.setState({ canvas: null });
        };
    }, [binding]);
    return null;
}
