import type { PrevisCameraSegment, PrevisFps, PrevisSequence } from "@/types/director";

export type PrevisDiagnostic = { code: string; message: string; path: string };

export function frameToTime(frame: number, fps: PrevisFps): number {
    return frame / fps;
}

// 加上 1e-6，避免浮点误差使整帧时间被向下取到前一帧。
export function timeToFrame(time: number, fps: PrevisFps): number {
    return Math.max(0, Math.floor(time * fps + 1e-6));
}

export function resolvePrevisSegmentBoundaries(sequence: PrevisSequence): { sequence: PrevisSequence; diagnostics: PrevisDiagnostic[] } {
    const diagnostics: PrevisDiagnostic[] = [];
    let startFrame = 0;
    const segments = sequence.segments.map((segment, index) => {
        const rule = segment.endRule;
        const action = rule.kind === "actionEnd" ? sequence.actions.find((item) => item.id === rule.actionId) : undefined;
        if (rule.kind === "actionEnd" && !action) {
            diagnostics.push({ code: "unknown_action", message: "段落结束规则引用的动作不存在", path: `segments[${index}].endRule.actionId` });
            startFrame = segment.endFrameExclusive;
            return { ...segment };
        }
        const endFrameExclusive = rule.kind === "frame" ? rule.frame : action!.endFrameExclusive + rule.offsetFrames;
        if (endFrameExclusive <= startFrame) {
            diagnostics.push({ code: "negative_duration", message: "段落结束帧必须大于起始帧", path: `segments[${index}].endFrameExclusive` });
            startFrame = segment.endFrameExclusive;
            return { ...segment };
        }
        const resolved = { ...segment, startFrame, endFrameExclusive };
        startFrame = endFrameExclusive;
        return resolved;
    });
    return { sequence: { ...sequence, segments }, diagnostics };
}

export function getPrevisTotalFrames(sequence: PrevisSequence): number {
    return resolvePrevisSegmentBoundaries(sequence).sequence.segments.at(-1)?.endFrameExclusive ?? 0;
}

export function clampPrevisFrame(sequence: PrevisSequence, frame: number): number {
    const total = getPrevisTotalFrames(sequence);
    return total === 0 ? 0 : Math.max(0, Math.min(total - 1, frame));
}

export function findPrevisSegmentAtFrame(sequence: PrevisSequence, frame: number): PrevisCameraSegment | null {
    return resolvePrevisSegmentBoundaries(sequence).sequence.segments.find((segment) => segment.startFrame <= frame && frame < segment.endFrameExclusive) ?? null;
}

export function toDisplayFrame(frame: number): number {
    return frame + 1;
}

export function validatePrevisSequence(sequence: PrevisSequence, context: { actorIds: readonly string[] }): PrevisDiagnostic[] {
    const diagnostics: PrevisDiagnostic[] = [];
    const actorIds = new Set(context.actorIds);
    const actionIds = new Set<string>();
    const segmentIds = new Set<string>();
    const validateFrame = (frame: number, path: string) => {
        if (!Number.isInteger(frame) || frame < 0) {
            diagnostics.push({ code: "frame_out_of_range", message: "帧必须是非负整数", path });
        }
    };
    if (sequence.schemaVersion !== 2) {
        diagnostics.push({ code: "schema_version", message: "预演序列的 schemaVersion 必须为 2", path: "schemaVersion" });
    }
    if (![24, 25, 30].includes(sequence.fps)) {
        diagnostics.push({ code: "fps", message: "预演帧率必须为 24、25 或 30", path: "fps" });
    }
    sequence.paths?.forEach((path, index) => {
        if (path.points.length < 2) diagnostics.push({ code: "path_too_short", message: "路径至少需要两个点", path: `paths[${index}].points` });
        if (path.space !== "world") diagnostics.push({ code: "path_space_unsupported", message: "暂不支持目标局部坐标路径", path: `paths[${index}].space` });
    });
    sequence.actions.forEach((action, index) => {
        const path = `actions[${index}]`;
        if (actionIds.has(action.id)) {
            diagnostics.push({ code: "duplicate_id", message: "动作 ID 重复", path: `${path}.id` });
        }
        actionIds.add(action.id);
        if (action.pathId !== undefined) {
            const referenced = sequence.paths?.find((item) => item.id === action.pathId);
            if (!referenced) diagnostics.push({ code: "unknown_path", message: "动作引用的路径不存在", path: `${path}.pathId` });
            else if (referenced.ownerId !== action.actorId) diagnostics.push({ code: "path_owner_mismatch", message: "路径所属人物与动作人物不一致", path: `${path}.pathId` });
        }
        if (!actorIds.has(action.actorId)) {
            diagnostics.push({ code: "unknown_actor", message: "动作引用的人物不存在", path: `${path}.actorId` });
        }
        validateFrame(action.startFrame, `${path}.startFrame`);
        validateFrame(action.endFrameExclusive, `${path}.endFrameExclusive`);
        if (action.endFrameExclusive <= action.startFrame) {
            diagnostics.push({ code: "negative_duration", message: "动作结束帧必须大于起始帧", path: `${path}.endFrameExclusive` });
        }
    });
    sequence.segments.forEach((segment, index) => {
        const path = `segments[${index}]`;
        if (segmentIds.has(segment.id)) {
            diagnostics.push({ code: "duplicate_id", message: "段落 ID 重复", path: `${path}.id` });
        }
        segmentIds.add(segment.id);
        if (segment.move === "path") {
            const referenced = sequence.paths?.find((item) => item.id === segment.pathId);
            if (!referenced) diagnostics.push({ code: "camera_path_missing", message: "摄影机路线不存在", path: `${path}.pathId` });
            else if (referenced.ownerId !== segment.id) diagnostics.push({ code: "camera_path_owner_mismatch", message: "摄影机路线所属段落不匹配", path: `${path}.pathId` });
        }
        validateFrame(segment.startFrame, `${path}.startFrame`);
        validateFrame(segment.endFrameExclusive, `${path}.endFrameExclusive`);
        if (segment.endFrameExclusive <= segment.startFrame) {
            diagnostics.push({ code: "negative_duration", message: "段落结束帧必须大于起始帧", path: `${path}.endFrameExclusive` });
        }
        // 检查传入缓存，避免边界重算掩盖原数据中的空隙或重叠。
        const previousEnd = index === 0 ? 0 : sequence.segments[index - 1].endFrameExclusive;
        if (segment.startFrame > previousEnd) {
            diagnostics.push({ code: "segment_gap", message: "段落之间存在未覆盖的帧", path: `${path}.startFrame` });
        } else if (segment.startFrame < previousEnd) {
            diagnostics.push({ code: "segment_overlap", message: "段落之间存在重叠的帧", path: `${path}.startFrame` });
        }
        segment.targetIds.forEach((actorId, targetIndex) => {
            if (!actorIds.has(actorId)) {
                diagnostics.push({ code: "unknown_actor", message: "段落目标引用的人物不存在", path: `${path}.targetIds[${targetIndex}]` });
            }
        });
        if (segment.transitionFrames !== undefined) validateFrame(segment.transitionFrames, `${path}.transitionFrames`);
        const rule = segment.endRule;
        if (rule.kind === "frame") {
            validateFrame(rule.frame, `${path}.endRule.frame`);
        } else {
            if (!Number.isInteger(rule.offsetFrames)) {
                diagnostics.push({ code: "frame_out_of_range", message: "动作结束偏移必须是整数帧", path: `${path}.endRule.offsetFrames` });
            }
            const action = sequence.actions.find((item) => item.id === rule.actionId);
            if (action) validateFrame(action.endFrameExclusive + rule.offsetFrames, `${path}.endRule`);
        }
    });
    for (const diagnostic of resolvePrevisSegmentBoundaries(sequence).diagnostics) {
        if (!diagnostics.some((item) => item.code === diagnostic.code && item.path === diagnostic.path)) diagnostics.push(diagnostic);
    }
    return diagnostics;
}
