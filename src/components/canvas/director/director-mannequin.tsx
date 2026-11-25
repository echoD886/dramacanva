import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Bone, CapsuleGeometry, Matrix4, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3, Euler } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { buildNeutralMannequinParts, mannequinBoneRotation, resolveNeutralMannequin } from "@/lib/canvas/director/director-mannequin";
import { PREVIS_MATERIAL, PREVIS_PALETTE } from "@/lib/canvas/director/director-previs-look";
import type { DirectorHumanoidBone, DirectorObject, DirectorVec3 } from "@/types/director";
import { DirectorStageProp } from "./director-stage-prop";
import { useThree } from "@react-three/fiber";
import { alignPrevisPelvis, createPrevisMotionPlayer, PREVIS_ANIMATIONS_URL, type PrevisMotionState } from "@/lib/canvas/director/director-previs-motion-clips";

type Props = Pick<DirectorObject, "archetype" | "actorProfile" | "pose" | "boneOverrides" | "boneTracks"> & {
    selected: boolean;
    playhead?: number;
    holdingScript?: boolean;
    holdingUmbrella?: boolean;
    seatedWeight?: number;
    seatPelvis?: DirectorVec3 | null;
    motion?: PrevisMotionState;
};

/** 只复用 Quaternius CC0 骨架；可见外形由中性体块组成。 */
export function DirectorClayActor({ archetype, actorProfile, pose = "stand", boneOverrides, boneTracks, selected, playhead = 0, holdingScript, holdingUmbrella, seatedWeight, seatPelvis, motion }: Props) {
    const invalidate = useThree((state) => state.invalidate);
    const profile = resolveNeutralMannequin({ archetype, actorProfile });
    const shoulderWidth = actorProfile?.mannequinVersion === 2 ? actorProfile.shoulderWidth : 1;
    const torsoRatio = actorProfile?.mannequinVersion === 2 ? actorProfile.torsoRatio : 1;
    const source = useGLTF(profile.modelUrl);
    // useGLTF 按 URL 缓存并挂起整个截图子树，动作未加载时 P6 哨兵不能提交。
    const animations = useGLTF(PREVIS_ANIMATIONS_URL);
    const rig = useMemo(() => {
        const model = clone(source.scene);
        const material = new MeshStandardMaterial({ color: PREVIS_PALETTE.actorShell, ...PREVIS_MATERIAL });
        const joint = new MeshStandardMaterial({ color: PREVIS_PALETTE.actorJoint, roughness: 0.64, metalness: 0.14 });
        material.userData.directorSelectionHighlight = true;
        model.updateMatrixWorld(true);
        const bones = new Map<string, { bone: Bone; rotation: Quaternion; direction: Vector3; position: Vector3 }>();
        model.traverse((node) => {
            if (node instanceof Mesh) node.visible = false;
            if (node instanceof Bone) {
                const child = node.children.find((item) => item instanceof Bone);
                bones.set(node.name.toLowerCase(), {
                    bone: node,
                    rotation: node.getWorldQuaternion(new Quaternion()),
                    direction: child ? child.getWorldPosition(new Vector3()).sub(node.getWorldPosition(new Vector3())).normalize() : new Vector3(0, -1, 0),
                    position: node.position.clone(),
                });
            }
        });
        const parts = buildNeutralMannequinParts([...bones.values()].map(({ bone }) => bone.name)).map((part) => {
            const [width, height, depth] = part.size;
            const geometry =
                part.geometry === "capsule"
                    ? new CapsuleGeometry(width / 2, height - width, 4, 12)
                    : part.geometry === "roundedBox"
                      ? new RoundedBoxGeometry(width, height, depth, 2, Math.min(width, height, depth) * 0.22)
                      : new SphereGeometry(0.5, 20, 16);
            // The local +Y end meets the wrist, ankle or knee. Narrow the shell
            // there without changing the joint centre or the animation rig.
            if (geometry instanceof CapsuleGeometry && part.name !== "neck") {
                const vertices = geometry.attributes.position;
                for (let i = 0; i < vertices.count; i++) {
                    const along = Math.min(1, Math.max(0, vertices.getY(i) / height + 0.5));
                    const widthScale = 1.1 - 0.39 * along + 0.1 * Math.sin(Math.PI * 2 * along);
                    vertices.setXYZ(i, vertices.getX(i) * widthScale, vertices.getY(i), vertices.getZ(i) * widthScale);
                }
                geometry.computeVertexNormals();
            }
            // Shape the shell in bone space so its silhouette follows every pose.
            if (part.name === "head" || part.name === "chest" || part.name === "pelvis") {
                const vertices = geometry.attributes.position;
                for (let i = 0; i < vertices.count; i++) {
                    const y = vertices.getY(i);
                    const belowCentre = Math.max(0, -2 * y);
                    const taper = part.name === "chest" ? 0.48 : 0.32;
                    const width = 1 - taper * belowCentre;
                    vertices.setXYZ(i, vertices.getX(i) * width, y, vertices.getZ(i) * (1 - 0.16 * belowCentre));
                }
                geometry.computeVertexNormals();
            }
            const mesh = new Mesh(geometry, part.geometry === "sphere" || part.name === "neck" || part.name === "abdomen" ? joint : material);
            mesh.name = part.name;
            mesh.position.set(...part.position);
            if (part.rotation) mesh.rotation.set(...part.rotation);
            if (part.geometry === "ellipsoid" || part.geometry === "sphere") mesh.scale.set(...part.size);
            if (part.name === "chest" || part.name === "abdomen" || part.name === "pelvis") {
                mesh.scale.x *= part.name === "chest" ? shoulderWidth : torsoRatio;
                mesh.scale.z *= torsoRatio;
            }
            mesh.castShadow = mesh.receiveShadow = true;
            mesh.userData.directorActor = true;
            bones.get(part.bone.toLowerCase())!.bone.add(mesh);
            return mesh;
        });
        return { model, material, joint, bones, parts, restY: model.position.y, feet: parts.filter((part) => part.name === "foot_l" || part.name === "foot_r") };
    }, [source.scene, shoulderWidth, torsoRatio]);
    const player = useMemo(() => createPrevisMotionPlayer(rig.model, animations.animations), [rig, animations.animations]);
    useEffect(() => () => player.dispose(), [player]);
    useEffect(
        () => () => {
            rig.parts.forEach((part) => part.geometry.dispose());
            rig.material.dispose();
            rig.joint.dispose();
        },
        [rig],
    );
    useEffect(() => {
        rig.material.emissive.set(selected ? PREVIS_PALETTE.selected : PREVIS_PALETTE.shadow);
        rig.material.emissiveIntensity = selected ? 0.12 : 0;
        const seated = pose === "sit" || pose === "squat";
        const seat = seatedWeight ?? (seated ? 1 : 0);
        const holding = holdingScript || holdingUmbrella;
        rig.model.position.y = rig.restY;
        rig.model.updateMatrixWorld(true);
        const poseClip = pose === "walk" ? "Walk_Loop" : pose === "run" ? "Jog_Fwd_Loop" : pose === "sit" ? "Sitting_Idle_Loop" : "Idle_Loop";
        player.evaluate(motion?.layers ?? [{ clip: poseClip, time: playhead, weight: 1, loop: true }], motion?.startSupport);
        const pelvis = rig.bones.get("pelvis");
        if (pelvis && pose === "squat") {
            // 原模型为 Z-up；蹲姿仍是静态预设，坐姿的骨盆高度由动作和座位锚点控制。
            const offset = new Vector3(0, -0.35 * seat, 0);
            if (rig.model.parent) offset.applyQuaternion(rig.model.parent.getWorldQuaternion(new Quaternion()));
            offset.applyQuaternion(pelvis.bone.parent!.getWorldQuaternion(new Quaternion()).invert());
            pelvis.bone.position.copy(pelvis.position).add(offset);
        }
        rig.bones.get("head")?.bone.scale.setScalar(profile.headRatio);
        // 将显式覆盖或持物预设对齐到世界方向，未覆盖的骨骼保留片段结果。
        const align = (name: string, semantic: DirectorHumanoidBone, direction?: Vector3, lean = 0) => {
            const entry = rig.bones.get(name);
            if (!entry) return;
            const world = entry.rotation.clone();
            const authored = Boolean(boneOverrides?.[semantic] || boneTracks?.some((track) => track.bone === semantic && track.keyframes.length));
            if (!direction && !authored && !lean) return;
            const override = mannequinBoneRotation({ boneOverrides, boneTracks }, semantic, playhead);
            if (direction && authored) direction = new Vector3(0, -1, 0).applyEuler(new Euler(...override));
            if (direction) world.premultiply(new Quaternion().setFromUnitVectors(entry.direction, direction.normalize()));
            if (lean && !authored) world.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), lean));
            if (!direction && authored) world.premultiply(new Quaternion().setFromEuler(new Euler(...override)));
            if (rig.model.parent) world.premultiply(rig.model.parent.getWorldQuaternion(new Quaternion()));
            entry.bone.quaternion.copy(entry.bone.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(world));
            entry.bone.updateMatrixWorld(true);
        };
        align("pelvis", "hips");
        align("spine_01", "spine", undefined, pose === "lean" ? 0.28 : 0);
        align("spine_03", "chest");
        align("neck_01", "neck");
        align("head", "head");
        for (const side of ["l", "r"] as const) {
            const left = side === "l",
                prefix = left ? "left" : "right",
                sign = left ? 1 : -1;
            const reaching = !left && pose === "reach";
            const phone = !left && pose === "phone";
            align(`clavicle_${side}`, `${prefix}Shoulder`);
            const upperBone = `${prefix}UpperArm` as DirectorHumanoidBone;
            const upperAuthored = Boolean(boneOverrides?.[upperBone] || boneTracks?.some((track) => track.bone === upperBone && track.keyframes.length));
            const upperDirection = upperAuthored
                ? new Vector3(0, -1, 0).applyEuler(new Euler(...mannequinBoneRotation({ boneOverrides, boneTracks }, upperBone, playhead)))
                : new Vector3(sign * 0.08, reaching ? -0.1 : holding ? -0.4 : -0.95, holding ? 0.9 : reaching ? 1 : 0);
            align(`upperarm_${side}`, upperBone, holding || reaching || upperAuthored ? upperDirection.clone() : undefined);
            const forearm = upperAuthored && !holding ? upperDirection.clone() : new Vector3(0, phone ? 1 : holding ? -0.15 : reaching ? 0 : -0.95, holding || reaching ? 1 : 0.12);
            align(`lowerarm_${side}`, `${prefix}LowerArm`, holding || reaching || phone || upperAuthored ? forearm.clone() : undefined);
            align(`hand_${side}`, `${prefix}Hand`, holding || reaching || phone || upperAuthored ? forearm.clone() : undefined);
            for (const finger of ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const)
                for (const segment of [1, 2, 3] as const) {
                    const semantic = `${prefix}${finger}${segment}` as DirectorHumanoidBone;
                    if (boneOverrides?.[semantic] || boneTracks?.some((track) => track.bone === semantic)) align(`${finger.toLowerCase()}_0${segment}_${side}`, semantic);
                }
            align(`thigh_${side}`, `${prefix}UpperLeg`, pose === "squat" ? new Vector3(0, -1 + 0.82 * seat, 0.98 * seat) : undefined);
            align(`calf_${side}`, `${prefix}LowerLeg`, pose === "squat" ? new Vector3(0, -1, -0.08 * seat) : undefined);
            align(`foot_${side}`, `${prefix}Foot`);
        }
        rig.model.updateMatrixWorld(true);
        if (pelvis && seatPelvis && seated) {
            alignPrevisPelvis(rig.model, seatPelvis);
        }
        // Ground the visible shell in actor space. The animated ankle pivot
        // sits above the sole, and the toe becomes the support late in a step.
        const grounded = motion ? ["idle", "walk"].includes(motion.kind) : pose === "stand" || pose === "walk";
        if (grounded && !seated && !boneTracks?.length && !Object.keys(boneOverrides ?? {}).length && rig.model.parent && rig.feet.length) {
            const toActor = new Matrix4().copy(rig.model.parent.matrixWorld).invert();
            const footToActor = new Matrix4();
            let lowest = Infinity;
            for (const foot of rig.feet) {
                footToActor.multiplyMatrices(toActor, foot.matrixWorld);
                const m = footToActor.elements;
                const vertices = foot.geometry.attributes.position;
                for (let i = 0; i < vertices.count; i++) lowest = Math.min(lowest, m[1] * vertices.getX(i) + m[5] * vertices.getY(i) + m[9] * vertices.getZ(i) + m[13]);
            }
            rig.model.position.y -= lowest;
            rig.model.updateMatrixWorld(true);
        }
        invalidate();
    }, [rig, player, motion, selected, pose, playhead, seatedWeight, seatPelvis, holdingScript, holdingUmbrella, boneOverrides, boneTracks, profile.headRatio, invalidate]);
    return (
        <group userData={{ directorActor: true, directorMannequin: true }} scale={profile.height} rotation={mannequinBoneRotation({ boneOverrides, boneTracks }, "root", playhead)}>
            <primitive object={rig.model} />
            {holdingScript && (
                <mesh position={[0, pose === "sit" ? 0.82 : 1.2, 0.43]} rotation={[-0.25, 0, 0]} castShadow>
                    <boxGeometry args={[0.3, 0.012, 0.22]} />
                    <meshStandardMaterial color={PREVIS_PALETTE.paper} {...PREVIS_MATERIAL} />
                </mesh>
            )}
            {pose === "phone" && (
                <group position={[-0.2, 1.43, 0.06]}>
                    <DirectorStageProp kind="phone" selected={false} />
                </group>
            )}
        </group>
    );
}
