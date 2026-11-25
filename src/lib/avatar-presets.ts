export type AccountAvatarPreset = {
    id: "frog-sunny" | "frog-sleepy" | "croc-sky" | "croc-peach";
    label: string;
    kind: "青蛙" | "鳄鱼";
    url: string;
};

export const DEFAULT_ACCOUNT_AVATAR_URL = "/account/default-avatar.png";

export const ACCOUNT_AVATAR_PRESETS: AccountAvatarPreset[] = [
    { id: "frog-sunny", label: "坏笑蛙", kind: "青蛙", url: "/account/avatars/frog-sunny.png" },
    { id: "frog-sleepy", label: "侧眼蛙", kind: "青蛙", url: "/account/avatars/frog-sleepy.png" },
    { id: "croc-sky", label: "歪嘴鳄", kind: "鳄鱼", url: "/account/avatars/croc-sky.png" },
    { id: "croc-peach", label: "眯眼鳄", kind: "鳄鱼", url: "/account/avatars/croc-peach.png" },
];
