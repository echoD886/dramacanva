import type { AppLocale } from "./app-locale";
import type { MessageLocale } from "./messages";
import type { DramaJob } from "@/services/api/drama";

// Match labels written by the scheduler, including jobs already in the queue.
const patterns = {
    bible: /^建立作品圣经：角色、场景与风格$/,
    plan: /^分集规划：第 (\d+)-(\d+) 章$/,
    cast_image: /^参考图：([\s\S]+)$/,
    script: /^第 (\d+) 集 剧本与分镜$/,
    segment_prompt: /^第 (\d+) 集第 (\d+) 段 视频提示词$/,
    segment_video: /^第 (\d+) 集 第 (\d+) 段视频$/,
    render: /^第 (\d+) 集 合成成片$/,
} satisfies Record<DramaJob["kind"], RegExp>;

const copy = {
    "zh-CN": {
        bible: "整理剧集设定：角色、场景与风格",
        plan: "把第 {1} 至 {2} 章拆成分集",
        cast_image: "{1}的参考图",
        script: "第 {1} 集 · 剧本与分镜",
        segment_prompt: "第 {1} 集第 {2} 段 · 视频提示词",
        segment_video: "第 {1} 集第 {2} 段 · 生成视频",
        render: "第 {1} 集 · 合成成片",
    },
    "zh-HK": {
        bible: "整理劇集設定：角色、場景同風格",
        plan: "第 {1} 至 {2} 章分集大綱",
        cast_image: "{1}嘅參考圖",
        script: "第 {1} 集 · 劇本同分鏡",
        segment_prompt: "第 {1} 集第 {2} 段 · 影片提示詞",
        segment_video: "第 {1} 集第 {2} 段 · 生成片段",
        render: "第 {1} 集 · 合成出片",
    },
    "zh-TW": {
        bible: "建立影集設定集：角色、場景與風格",
        plan: "第 {1} 到 {2} 章的分集大綱",
        cast_image: "{1}的參考圖",
        script: "第 {1} 集 · 劇本與分鏡",
        segment_prompt: "第 {1} 集第 {2} 段 · 影片提示詞",
        segment_video: "第 {1} 集第 {2} 段 · 產生影片",
        render: "第 {1} 集 · 輸出成片",
    },
    "en-US": {
        bible: "Build the series bible",
        plan: "Break chapters {1}–{2} into episodes",
        cast_image: "Reference image for {1}",
        script: "Episode {1} · Script and boards",
        segment_prompt: "Episode {1}, clip {2} · Video prompt",
        segment_video: "Episode {1}, clip {2} · Generate video",
        render: "Episode {1} · Render final cut",
    },
    "ja-JP": {
        bible: "シリーズ設定資料をまとめる",
        plan: "第{1}章〜第{2}章の話数割り",
        cast_image: "{1}の参考画像",
        script: "第{1}話 · 脚本と絵コンテ",
        segment_prompt: "第{1}話・カット{2}の動画プロンプト",
        segment_video: "第{1}話・カット{2}の動画生成",
        render: "第{1}話 · 完成版の書き出し",
    },
    "ko-KR": {
        bible: "시리즈 설정집 만들기",
        plan: "{1}~{2}장 회차 구성",
        cast_image: "{1} 참고 이미지",
        script: "{1}화 · 대본과 콘티",
        segment_prompt: "{1}화 클립 {2} · 영상 프롬프트",
        segment_video: "{1}화 클립 {2} · 영상 생성",
        render: "{1}화 · 최종본 렌더링",
    },
    "es-ES": {
        bible: "Preparar la biblia de la serie",
        plan: "Repartir los capítulos {1} a {2} en episodios",
        cast_image: "Imagen de referencia de {1}",
        script: "Episodio {1} · Guion y storyboard",
        segment_prompt: "Episodio {1}, clip {2} · Indicaciones para el vídeo",
        segment_video: "Episodio {1}, clip {2} · Generar vídeo",
        render: "Episodio {1} · Exportar el montaje final",
    },
    "pt-BR": {
        bible: "Montar a bíblia da série",
        plan: "Dividir os capítulos {1} a {2} em episódios",
        cast_image: "Imagem de referência de {1}",
        script: "Episódio {1} · Roteiro e storyboard",
        segment_prompt: "Episódio {1}, clipe {2} · Prompt de vídeo",
        segment_video: "Episódio {1}, clipe {2} · Gerar vídeo",
        render: "Episódio {1} · Exportar o corte final",
    },
} satisfies Record<MessageLocale, Record<DramaJob["kind"], string>>;

export function dramaJobLabel(locale: AppLocale, job: Pick<DramaJob, "kind" | "label">) {
    const match = patterns[job.kind]?.exec(job.label);
    if (!match) return job.label;
    const catalog = Object.hasOwn(copy, locale) ? copy[locale as MessageLocale] : copy["en-US"];
    return catalog[job.kind].replace(/\{([12])\}/g, (_, index: string) => match[Number(index)]);
}
