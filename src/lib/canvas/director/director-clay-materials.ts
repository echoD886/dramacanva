import { Mesh, MeshStandardMaterial, Object3D, Scene, type Material } from "three";
import { PREVIS_MATERIAL, PREVIS_PALETTE } from "./director-previs-look";

/**
 * 将场景整体切换为白膜材质，返回恢复函数；恢复时销毁共享的 clay 材质。
 *
 * 两类 mesh 必须跳过，否则切换本身会破坏渲染：
 * - directorActor mesh 的材质由展示层按展示状态自行管理；
 * - 带 uniforms 的 ShaderMaterial（drei Grid/Line 等）由组件自身 useFrame 逐帧读写 uniforms，
 *   换成 clay 后渲染循环会逐帧抛错、画布冻结，白膜录制只剩启动前手动渲染的首帧。
 */
export function applyClaySceneMaterials(scene: Scene) {
    const clayMaterials = new Map<string, MeshStandardMaterial>();
    const originals: Array<{ mesh: Mesh; material: Material | Material[] }> = [];
    scene.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh || hasDirectorActorAncestor(mesh)) return;
        const material = mesh.material;
        const shaderBacked = Array.isArray(material) ? material.some((item) => "uniforms" in item) : "uniforms" in material;
        if (shaderBacked) return;
        originals.push({ mesh, material });
        const color = mesh.userData.directorPrevisColor || PREVIS_PALETTE.prop;
        let clayMaterial = clayMaterials.get(color);
        if (!clayMaterial) {
            clayMaterial = new MeshStandardMaterial({ color, ...PREVIS_MATERIAL });
            clayMaterials.set(color, clayMaterial);
        }
        mesh.material = clayMaterial;
    });
    return () => {
        originals.forEach(({ mesh, material }) => {
            mesh.material = material;
        });
        clayMaterials.forEach((material) => material.dispose());
    };
}

function hasDirectorActorAncestor(object: Object3D) {
    let current: Object3D | null = object;
    while (current) {
        if (current.userData.directorActor || current.userData.directorNoMaterialOverride) return true;
        current = current.parent;
    }
    return false;
}
