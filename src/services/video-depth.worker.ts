import { env, pipeline, RawImage, type DepthEstimationPipeline } from "@huggingface/transformers";
import runtimeUrl from "../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url";
import wasmUrl from "../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url";

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = "/models/";
const wasm = env.backends.onnx.wasm!;
wasm.numThreads = 1;
wasm.wasmPaths = { mjs: new URL(runtimeUrl, self.location.origin).href, wasm: new URL(wasmUrl, self.location.origin).href };

let estimator: DepthEstimationPipeline | undefined;
let range: { low: number; high: number } | undefined;

self.onmessage = async ({ data }: MessageEvent<Blob>) => {
    try {
        estimator ??= await pipeline<"depth-estimation">("depth-estimation", "depth-anything-v2-small", { device: "wasm", dtype: "q8" });
        const result = await estimator(await RawImage.fromBlob(data));
        const { predicted_depth, depth } = Array.isArray(result) ? result[0] : result;
        const values = predicted_depth.data as Float32Array;
        let low = Infinity,
            high = -Infinity;
        for (const value of values) {
            low = Math.min(low, value);
            high = Math.max(high, value);
        }
        // Smooth the display range across frames without blending moving silhouettes.
        range = range ? { low: range.low * 0.75 + low * 0.25, high: range.high * 0.75 + high * 0.25 } : { low, high };
        const scale = 255 / Math.max(0.00001, range.high - range.low);
        for (let i = 0; i < values.length; i++) depth.data[i] = Math.max(0, Math.min(255, (values[i] - range.low) * scale));
        self.postMessage({ frame: await depth.toBlob("image/png") });
    } catch (error) {
        self.postMessage({ error: error instanceof Error ? error.message : String(error) });
    }
};
