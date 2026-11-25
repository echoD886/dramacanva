import { RoundedBox } from "@react-three/drei";
import { Vector2 } from "three";
import type { DirectorObject, DirectorVec3 } from "@/types/director";
import { PREVIS_MATERIAL, PREVIS_PALETTE } from "@/lib/canvas/director/director-previs-look";

/** Original metre-scale studio props. No external meshes, fonts or textures. */
export function DirectorStageProp({ kind, selected }: { kind: NonNullable<DirectorObject["stageProp"]>; selected: boolean }) {
    const highlight = { userData: { directorSelectionHighlight: true }, emissive: selected ? PREVIS_PALETTE.selected : PREVIS_PALETTE.shadow, emissiveIntensity: selected ? 0.12 : 0 };
    const material = <meshStandardMaterial color={kind === "platform-column" ? PREVIS_PALETTE.wall : PREVIS_PALETTE.prop} {...PREVIS_MATERIAL} {...highlight} />;
    const box = (size: DirectorVec3, position: DirectorVec3, radius = 0.02) => (
        <RoundedBox args={size} position={position} radius={radius} smoothness={3} castShadow receiveShadow>
            {material}
        </RoundedBox>
    );
    const cylinder = (radius: number, height: number, position: DirectorVec3) => (
        <mesh position={position} castShadow receiveShadow>
            <cylinderGeometry args={[radius, radius, height, 24]} />
            {material}
        </mesh>
    );
    return (
        <group userData={{ directorStageProp: kind, directorNoMaterialOverride: true }}>
            {kind === "platform-column" && box([0.45, 3.4, 0.45], [0, 1.7, 0])}
            {kind === "bench" && (
                <>
                    {box([2.4, 0.12, 0.6], [0, 0.45, 0])}
                    {box([2.4, 0.6, 0.1], [0, 0.8, -0.25])}
                    {[-0.9, 0.9].map((x) => (
                        <group key={x}>{box([0.15, 0.39, 0.5], [x, 0.195, 0])}</group>
                    ))}
                </>
            )}
            {kind === "rug" && (
                <group userData={{ directorNoMaterialOverride: true }}>
                    <RoundedBox args={[4.8, 0.02, 3.2]} radius={0.009} smoothness={2} receiveShadow>
                        <meshStandardMaterial color={PREVIS_PALETTE.rug} {...PREVIS_MATERIAL} {...highlight} />
                    </RoundedBox>
                    {Array.from({ length: 65 }, (_, i) => (
                        <mesh key={i} position={[0, 0.011, -1.55 + i * 0.048]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[4.7, 0.008]} />
                            <meshStandardMaterial color={PREVIS_PALETTE.rugThread} {...PREVIS_MATERIAL} />
                        </mesh>
                    ))}
                </group>
            )}
            {kind === "ceiling-light" && (
                <group>
                    {box([2, 0.08, 0.12], [0, 0, 0])}
                    <mesh position={[0, -0.042, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[1.9, 0.09]} />
                        <meshStandardMaterial color={PREVIS_PALETTE.paper} {...PREVIS_MATERIAL} emissive={PREVIS_PALETTE.paper} emissiveIntensity={0.8} />
                    </mesh>
                    {[-0.8, 0.8].map((x) => (
                        <mesh key={x} position={[x, 0.12, 0]}>
                            <cylinderGeometry args={[0.009, 0.009, 0.24, 8]} />
                            {material}
                        </mesh>
                    ))}
                </group>
            )}
            {kind === "plant" && (
                <group>
                    <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.24, 0.18, 0.44, 32]} />
                        {material}
                    </mesh>
                    {Array.from({ length: 14 }, (_, i) => (
                        <group key={i} rotation={[0, i * 2.4, 0]}>
                            <mesh position={[0.12, 0.6 + (i % 4) * 0.16, 0]} rotation={[0, 0, -0.22]} castShadow>
                                <cylinderGeometry args={[0.012, 0.016, 0.8, 8]} />
                                {material}
                            </mesh>
                            <mesh position={[0.22, 0.75 + (i % 4) * 0.16, 0]} rotation={[0, 0, -0.7]} scale={[0.13, 0.3, 0.035]} castShadow>
                                <sphereGeometry args={[1, 16, 12]} />
                                {material}
                            </mesh>
                        </group>
                    ))}
                </group>
            )}
            {kind === "sofa" && (
                <>
                    {box([2.2, 0.22, 0.86], [0, 0.3, 0], 0.09)}
                    {box([2.2, 0.6, 0.2], [0, 0.65, -0.36], 0.09)}
                    {[-0.7, 0, 0.7].map((x) => (
                        <group key={x}>
                            {box([0.66, 0.15, 0.68], [x, 0.48, 0.04], 0.065)}
                            {box([0.66, 0.43, 0.15], [x, 0.71, -0.24], 0.065)}
                        </group>
                    ))}
                    {[-1, 1].map((side) => (
                        <group key={side}>
                            {box([0.16, 0.4, 0.88], [side * 1.04, 0.56, 0], 0.07)}
                            {[-0.3, 0.3].map((z) => (
                                <group key={z}>{cylinder(0.04, 0.2, [side * 0.9, 0.1, z])}</group>
                            ))}
                        </group>
                    ))}
                </>
            )}
            {kind === "bed" && (
                <>
                    {box([1.8, 0.25, 2.2], [0, 0.25, 0], 0.06)}
                    {box([1.75, 0.22, 2.1], [0, 0.48, 0], 0.09)}
                    {box([1.85, 0.95, 0.1], [0, 0.55, -1.08], 0.045)}
                    {[-0.45, 0.45].map((x) => (
                        <group key={x}>{box([0.65, 0.13, 0.42], [x, 0.64, -0.7], 0.06)}</group>
                    ))}
                    {box([1.76, 0.035, 1.45], [0, 0.61, 0.31], 0.015)}
                </>
            )}
            {kind === "phone" && (
                <>
                    {box([0.075, 0.15, 0.009], [0, 0.075, 0], 0.004)}
                    <mesh position={[0, 0.075, 0.005]}>
                        <planeGeometry args={[0.065, 0.125]} />
                        <meshStandardMaterial color={PREVIS_PALETTE.propDetail} {...PREVIS_MATERIAL} />
                    </mesh>
                    {box([0.018, 0.002, 0.002], [0, 0.14, 0.006], 0.0008)}
                </>
            )}
            {kind === "car" && (
                <>
                    {box([1.8, 0.12, 4.3], [0, 0.42, 0], 0.05)}
                    {box([1.75, 0.28, 1.05], [0, 0.73, 1.6], 0.12)}
                    {box([1.75, 0.28, 0.9], [0, 0.73, -1.7], 0.12)}
                    {[-0.87, 0.87].map((x) => (
                        <group key={x}>{box([0.08, 0.4, 2.6], [x, 0.69, -0.1], 0.035)}</group>
                    ))}
                    <RoundedBox args={[1.55, 0.65, 2.25]} position={[0, 1.1, -0.1]} radius={0.22} smoothness={4}>
                        <meshStandardMaterial color={PREVIS_PALETTE.glass} {...PREVIS_MATERIAL} transparent opacity={0.18} depthWrite={false} />
                    </RoundedBox>
                    {box([1.4, 0.04, 1.6], [0, 1.45, -0.15], 0.018)}
                    {[-0.44, 0.44].flatMap((x) =>
                        [-0.55, 0.65].map((z) => (
                            <group key={`${x}-${z}`}>
                                {box([0.52, 0.16, 0.58], [x, 0.64, z], 0.07)}
                                {box([0.52, 0.56, 0.14], [x, 0.94, z - 0.24], 0.065)}
                                {box([0.3, 0.2, 0.12], [x, 1.3, z - 0.24], 0.055)}
                            </group>
                        )),
                    )}
                    {box([1.5, 0.17, 0.35], [0, 0.91, 1.1], 0.06)}
                    <mesh position={[-0.44, 1.06, 0.86]} rotation={[-0.3, 0, 0]}>
                        <torusGeometry args={[0.18, 0.022, 12, 32]} />
                        {material}
                    </mesh>
                    {[-1, 1].map((side) => (
                        <group key={side}>
                            {[-1.35, 1.35].map((z) => (
                                <group key={z} position={[side * 0.85, 0.36, z]} rotation={[0, 0, Math.PI / 2]}>
                                    <mesh castShadow>
                                        <cylinderGeometry args={[0.34, 0.34, 0.22, 32]} />
                                        <meshStandardMaterial color={PREVIS_PALETTE.propDetail} {...PREVIS_MATERIAL} />
                                    </mesh>
                                    {cylinder(0.2, 0.23, [0, 0, 0])}
                                </group>
                            ))}
                            {box([0.055, 0.08, 0.24], [side * 0.82, 1.28, 0.65], 0.025)}
                            {box([0.03, 0.035, 0.18], [side * 0.91, 0.86, -0.25], 0.014)}
                            {box([0.38, 0.12, 0.055], [side * 0.58, 0.76, 2.12], 0.04)}
                        </group>
                    ))}
                    {box([1.3, 0.22, 0.04], [0, 0.5, 2.16], 0.04)}
                </>
            )}
            {kind === "conference-table" && (
                <>
                    {box([2.6, 0.09, 1.3], [0, 0.715, 0], 0.04)}
                    {box([2.2, 0.05, 0.9], [0, 0.647, 0])}
                    {[-0.88, 0.88].map((x) => (
                        <group key={x}>
                            {box([0.1, 0.57, 0.7], [x, 0.345, 0])}
                            {box([0.55, 0.06, 0.94], [x, 0.03, 0], 0.025)}
                        </group>
                    ))}
                </>
            )}
            {kind === "office-chair" && (
                <>
                    {box([0.58, 0.1, 0.56], [0, 0.45, 0], 0.045)}
                    <group position={[0, 0.82, -0.25]} rotation={[-0.1, 0, 0]}>
                        {box([0.56, 0.65, 0.09], [0, 0, 0], 0.044)}
                    </group>
                    {cylinder(0.045, 0.3, [0, 0.25, 0])}
                    {[-1, 1].map((side) => (
                        <group key={side}>
                            {box([0.035, 0.22, 0.035], [side * 0.31, 0.58, -0.05], 0.015)}
                            {box([0.075, 0.045, 0.36], [side * 0.31, 0.69, 0], 0.02)}
                        </group>
                    ))}
                    {Array.from({ length: 5 }, (_, i) => (
                        <group key={i} rotation={[0, (i * Math.PI * 2) / 5, 0]}>
                            {box([0.045, 0.045, 0.32], [0, 0.115, 0.14])}
                            <mesh position={[0, 0.055, 0.29]} rotation={[0, 0, Math.PI / 2]} castShadow>
                                <cylinderGeometry args={[0.055, 0.055, 0.05, 20]} />
                                {material}
                            </mesh>
                        </group>
                    ))}
                </>
            )}
            {kind === "door" && (
                <>
                    {box([0.94, 2.25, 0.055], [0, 1.125, 0])}
                    {[-0.51, 0.51].map((x) => (
                        <group key={x}>{box([0.07, 2.35, 0.12], [x, 1.175, 0])}</group>
                    ))}
                    {box([1.09, 0.07, 0.12], [0, 2.35, 0])}
                    {box([0.15, 0.025, 0.04], [0.31, 1.05, 0.06], 0.01)}
                </>
            )}
            {kind === "window" && (
                <>
                    {box([2.1, 1.65, 0.035], [0, 0, -0.015])}
                    {[-1.08, 0, 1.08].map((x) => (
                        <group key={x}>{box([0.045, 1.74, 0.1], [x, 0, 0.035], 0.01)}</group>
                    ))}
                    {[-0.85, 0.85].map((y) => (
                        <group key={y}>{box([2.2, 0.045, 0.1], [0, y, 0.035], 0.01)}</group>
                    ))}
                    {box([2.3, 0.06, 0.22], [0, -0.9, 0.06])}
                </>
            )}
            {kind === "whiteboard" && (
                <>
                    {box([1.6, 1.05, 0.065], [0, 0, 0], 0.03)}
                    {box([1.65, 0.04, 0.13], [0, -0.54, 0.06], 0.01)}
                    {[-0.71, 0.71].map((x) => (
                        <group key={x}>{box([0.025, 0.07, 0.02], [x, -0.49, 0.08], 0.008)}</group>
                    ))}
                </>
            )}
            {kind === "cup" && (
                <>
                    <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
                        <latheGeometry
                            args={[
                                [
                                    [0, 0],
                                    [0.035, 0],
                                    [0.043, 0.008],
                                    [0.047, 0.1],
                                    [0.043, 0.105],
                                    [0.039, 0.098],
                                    [0.035, 0.012],
                                ].map(([x, y]) => new Vector2(x, y)),
                                32,
                            ]}
                        />
                        {material}
                    </mesh>
                    <mesh position={[0.053, 0.11, 0]} castShadow>
                        <torusGeometry args={[0.029, 0.007, 10, 24]} />
                        {material}
                    </mesh>
                    {cylinder(0.075, 0.012, [0, 0.006, 0])}
                </>
            )}
            {kind === "document" && (
                <>
                    {box([0.3, 0.018, 0.22], [0, 0, 0], 0.004)}
                    {[0, 1, 2].map((i) => (
                        <group key={i}>{box([0.295, 0.0015, 0.215], [i * 0.001, 0.011 + i * 0.003, i * 0.002], 0.0006)}</group>
                    ))}
                </>
            )}
        </group>
    );
}
