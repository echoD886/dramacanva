export type DirectorVec3 = [number, number, number];
export type DirectorQuat = [number, number, number, number];

export type DirectorActorArchetype = "adult" | "child" | "elderly" | "man" | "woman" | "monster";
export type DirectorActorAccessory = "none" | "cane" | "horns" | "crown";
export type DirectorActorProfile = {
    mannequinVersion?: 2;
    height: number;
    headRatio: number;
    shoulderWidth: number;
    torsoRatio: number;
    accessory: DirectorActorAccessory;
};
export type DirectorTransform = {
    position: DirectorVec3;
    rotation: DirectorVec3;
    scale: DirectorVec3;
};

export type DirectorPrimitiveKind = "box" | "sphere" | "cylinder" | "plane" | "character";
export type DirectorObjectKind = "primitive" | "model" | "actor" | "billboard";
export type DirectorStageProp = "conference-table" | "office-chair" | "sofa" | "bed" | "door" | "window" | "whiteboard" | "car" | "phone" | "cup" | "document" | "plant" | "rug" | "ceiling-light" | "bench" | "platform-column";
export type DirectorPose = "neutral" | "stand" | "t_pose" | "walk" | "run" | "sit" | "squat" | "kneel_single" | "kneel_double" | "hands_hips" | "lean" | "bow" | "think" | "fight" | "kick" | "throw" | "push" | "wave" | "reach" | "arms_crossed" | "phone";
export type DirectorCameraMove = "static" | "push_in" | "pull_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "orbit_left" | "orbit_right" | "handheld" | "truck_left" | "truck_right" | "pedestal_up" | "pedestal_down";
export type DirectorShotSize = "extreme_wide" | "wide" | "full" | "medium" | "close_up" | "extreme_close_up";
export type DirectorAspectRatio = import("./previs").PrevisAspectRatio;
export type DirectorRenderMode = "beauty" | "clay" | "depth" | "normal" | "pose";
export type DirectorKeyframeEasing = "step" | "linear" | "smooth";
export type DirectorMotionPath = {
    points: DirectorVec3[];
    speed: "slow" | "walk" | "run";
    startDelay: number;
    orientToPath: boolean;
};

export type DirectorKeyframe = {
    id: string;
    time: number;
    transform: DirectorTransform;
    easing?: DirectorKeyframeEasing;
};

export type DirectorFingerBone =
    | "leftThumb1"
    | "leftThumb2"
    | "leftThumb3"
    | "leftIndex1"
    | "leftIndex2"
    | "leftIndex3"
    | "leftMiddle1"
    | "leftMiddle2"
    | "leftMiddle3"
    | "leftRing1"
    | "leftRing2"
    | "leftRing3"
    | "leftPinky1"
    | "leftPinky2"
    | "leftPinky3"
    | "rightThumb1"
    | "rightThumb2"
    | "rightThumb3"
    | "rightIndex1"
    | "rightIndex2"
    | "rightIndex3"
    | "rightMiddle1"
    | "rightMiddle2"
    | "rightMiddle3"
    | "rightRing1"
    | "rightRing2"
    | "rightRing3"
    | "rightPinky1"
    | "rightPinky2"
    | "rightPinky3";

export type DirectorHumanoidBone =
    | "root"
    | "hips"
    | "spine"
    | "chest"
    | "neck"
    | "head"
    | "leftShoulder"
    | "leftUpperArm"
    | "leftLowerArm"
    | "leftHand"
    | "rightShoulder"
    | "rightUpperArm"
    | "rightLowerArm"
    | "rightHand"
    | "leftUpperLeg"
    | "leftLowerLeg"
    | "leftFoot"
    | "rightUpperLeg"
    | "rightLowerLeg"
    | "rightFoot"
    | DirectorFingerBone;

export type DirectorBoneKeyframe = {
    id: string;
    time: number;
    rotation: DirectorQuat;
    easing?: DirectorKeyframeEasing;
};

export type DirectorBoneTrack = {
    bone: DirectorHumanoidBone;
    keyframes: DirectorBoneKeyframe[];
};

/**
 * 时间轴上一个可删除关键帧的定位信息。
 * 覆盖时间轴可编辑的关键帧轨道：对象 transform、对象骨骼、摄影机与灯光。
 */
export type DirectorKeyframeDeleteTarget =
    | { track: "object-transform"; objectId: string; keyframeId: string }
    | { track: "object-bone"; objectId: string; bone: DirectorHumanoidBone; keyframeId: string }
    | { track: "camera"; cameraId: string; keyframeId: string }
    | { track: "light"; lightId: string; keyframeId: string };

export type DirectorRig = {
    status: "unmapped" | "ready";
    boneMap: Partial<Record<DirectorHumanoidBone, string>>;
    animationNames: string[];
};

export type DirectorMotionClip = {
    id: string;
    name: string;
    sourceAnimation: string;
    start: number;
    duration: number;
    playbackRate: number;
    loop: boolean;
};

export type DirectorCharacterBinding = {
    characterAssetId: string;
    characterVersionId: string;
    referenceNodeId: string;
    characterName?: string;
    referenceImageUrl?: string;
};

export type DirectorObject = {
    id: string;
    name: string;
    kind: DirectorObjectKind;
    primitive?: DirectorPrimitiveKind;
    stageProp?: DirectorStageProp;
    transform: DirectorTransform;
    color: string;
    visible: boolean;
    castShadow: boolean;
    receiveShadow: boolean;
    pose?: DirectorPose;
    seatObjectId?: string;
    poseKeyframes?: { time: number; pose: DirectorPose }[];
    heldProp?: "folded_umbrella" | "script";
    archetype?: DirectorActorArchetype;
    actorProfile?: DirectorActorProfile;
    rig?: DirectorRig;
    motionClips?: DirectorMotionClip[];
    activeMotionClipId?: string;
    characterBinding?: DirectorCharacterBinding;
    boneOverrides?: Partial<Record<DirectorHumanoidBone, DirectorQuat>>;
    boneTracks?: DirectorBoneTrack[];
    sourceNodeId?: string;
    assetId?: string;
    storageKey?: string;
    url?: string;
    mimeType?: string;
    keyframes: DirectorKeyframe[];
    motionPath?: DirectorMotionPath;
};

export type DirectorCamera = {
    id: string;
    name: string;
    transform: DirectorTransform;
    target: DirectorVec3;
    focalLength: number;
    fov: number;
    aperture: number;
    focusDistance: number;
    near: number;
    far: number;
    keyframes: (DirectorKeyframe & { target?: DirectorVec3 })[];
    motionPath?: DirectorMotionPath;
};

export type DirectorLight = {
    id: string;
    name: string;
    type: "directional" | "point" | "spot" | "ambient";
    transform: DirectorTransform;
    color: string;
    intensity: number;
    angle?: number;
    penumbra?: number;
    shadowRadius?: number;
    castShadow: boolean;
    keyframes?: DirectorLightKeyframe[];
};

export type DirectorLightKeyframe = DirectorKeyframe & { intensity: number; color: string };

export type DirectorShot = {
    id: string;
    name: string;
    cameraId: string;
    duration: number;
    fps: 24 | 25 | 30;
    aspectRatio?: DirectorAspectRatio;
    shotSize: DirectorShotSize;
    cameraMove: DirectorCameraMove;
    prompt: string;
    previewNodeId?: string;
    depthNodeId?: string;
    normalNodeId?: string;
    sourceStoryboardNodeId?: string;
    sourceStoryboardRowId?: string;
    sourceFingerprint?: string;
    actorStates?: Record<string, Pick<DirectorObject, "transform" | "keyframes" | "motionPath" | "pose" | "poseKeyframes" | "visible" | "heldProp" | "boneOverrides" | "boneTracks">>;
    stage?: { objects: DirectorObject[]; lights: DirectorLight[] };
};

export type DirectorEnvironment = {
    mode: "color" | "panorama";
    url?: string;
    storageKey?: string;
    sourceNodeId?: string;
    rotationY?: number;
    opacity?: number;
    exposure?: number;
    useAsLighting?: boolean;
    lightingIntensity?: number;
};

export type PrevisFps = 24 | 25 | 30;
export type PrevisAspect = "16:9" | "9:16" | "2.39:1";
export type PrevisActionKind = "idle" | "walk" | "run" | "turn" | "sit";
export type PrevisFraming = "full" | "half" | "face" | "group" | "wide";
export type PrevisCameraMove = "fixed" | "follow" | "push" | "pull" | "orbit" | "crane" | "path";
export type PrevisCameraSide = "front" | "back" | "left" | "right";
export type PrevisTargetAnchor = "head" | "chest" | "hips" | "feet";

export type PrevisPathPoint = { id: string; position: DirectorVec3 };
export type PrevisPathSpec = {
    id: string;
    ownerId: string;
    space: "world" | "targetLocal";
    interpolation: "linear" | "smooth";
    points: PrevisPathPoint[];
    timingPolicy: "keepDuration" | "keepSpeed";
};

export type PrevisActorAction = {
    id: string;
    actorId: string;
    kind: PrevisActionKind;
    startFrame: number;
    endFrameExclusive: number;
    pathId?: string;
    seatId?: string;
    lookAtId?: string;
};

export type PrevisSegmentEndRule = { kind: "frame"; frame: number } | { kind: "actionEnd"; actionId: string; offsetFrames: number };

export type PrevisCameraSegment = {
    id: string;
    legacyShotId?: string;
    shotId?: string;
    cameraId?: string;
    startFrame: number;
    endFrameExclusive: number;
    targetIds: string[];
    targetAnchor?: PrevisTargetAnchor;
    framing: PrevisFraming;
    move: PrevisCameraMove;
    // 摄影机路径使用世界坐标，ownerId 为段 id，点的 y 为相机高度。
    pathId?: string;
    side?: PrevisCameraSide;
    transitionIn: "cut" | "continuous";
    transitionFrames?: number;
    targetPoint?: DirectorVec3;
    // 固定预演保留原机位与滚转；烘焙路线时保留段首焦距和视场角。
    cameraStart?: { position: DirectorVec3; quaternion: DirectorQuat; fov: number; focalLength: number; lookAt: DirectorVec3 };
    // 转换旧段时保留该镜头的局部舞台动作，不覆盖其他段或全局动作。
    initialStage?: DirectorShot["stage"];
    params?: {
        distance?: number;
        heightFrom?: number;
        heightTo?: number;
        orbitDirection?: "left" | "right";
        orbitDegrees?: number;
    };
    endRule: PrevisSegmentEndRule;
};

export type PrevisSequence = {
    schemaVersion: 2;
    sceneId: string;
    revision: number;
    fps: PrevisFps;
    aspect: PrevisAspect;
    actions: PrevisActorAction[];
    paths?: PrevisPathSpec[];
    segments: PrevisCameraSegment[];
};

export type DirectorScene = {
    /** World documents are isolated by source shot; legacy data remains intact. */
    worldEngine?: Record<string, import("./previs").PrevisScene>;
    id: string;
    version: 1;
    title: string;
    background: string;
    environmentIntensity: number;
    environment?: DirectorEnvironment;
    gridVisible: boolean;
    editorView?: { position: [number, number, number]; target: [number, number, number] };
    stageExposure?: number;
    groundVisible?: boolean;
    groundOpacity?: number;
    groundColor?: string;
    groundSize?: number;
    stageLook?: "studio";
    objects: DirectorObject[];
    cameras: DirectorCamera[];
    lights: DirectorLight[];
    shots: DirectorShot[];
    previs?: PrevisSequence;
    activeShotId: string;
    createdAt: string;
    updatedAt: string;
    locationKey?: string;
};

export type DirectorSceneOutput = {
    scene: DirectorScene;
    shot: DirectorShot;
    prompt: string;
    beauty: Blob;
    depth?: Blob;
    depthVideo?: Blob;
    normal?: Blob;
    clayVideo?: Blob;
    clayVideoMimeType?: string;
    previsSequenceFingerprint?: string;
    worldRecordingRevision?: string;
};
