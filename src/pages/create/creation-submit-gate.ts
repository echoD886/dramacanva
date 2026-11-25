/**
 * 创作台提交闸门：提交在 await（技能上下文加载等）期间还没进入 busy 状态，
 * 连点会提交两次、重复扣费。闸门在进入 busy 之前挡住第二次点击。
 */
export function createCreationSubmitGate() {
    let locked = false;
    return {
        tryAcquire() {
            if (locked) return false;
            locked = true;
            return true;
        },
        release() {
            locked = false;
        },
    };
}
