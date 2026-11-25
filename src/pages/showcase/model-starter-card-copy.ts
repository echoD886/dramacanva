/** Card-only projection of the reviewed copy; keeps canvas examples out of the home entry. */
export const MODEL_STARTER_CARD_COPY = {
    "zh-CN": {
        cardGptImageDesc: "输入文字或参考图，制作角色、海报和分镜",
        cardShotBreakdownDesc: "上传一段视频，拆解分镜、运镜和剪辑节奏",
        cardRemakeDesc: "上传一段视频，用提示词直接修改指定片段",
    },
    "zh-HK": {
        cardGptImageDesc: "輸入文字或參考圖，製作角色、海報和分鏡",
        cardShotBreakdownDesc: "上傳一段影片，拆解分鏡、運鏡與剪接節奏",
        cardRemakeDesc: "上傳一段影片，用提示詞直接修改指定片段",
    },
    "zh-TW": {
        cardGptImageDesc: "輸入文字或參考圖，製作角色、海報和分鏡",
        cardShotBreakdownDesc: "上傳一段影片，拆解分鏡、運鏡與剪輯節奏",
        cardRemakeDesc: "上傳一段影片，用提示詞直接修改指定片段",
    },
    "en-US": {
        cardGptImageDesc: "Make characters, posters, and shots from text or references.",
        cardShotBreakdownDesc: "Upload a video to analyze shot types, angles, and pacing.",
        cardRemakeDesc: "Upload a video and rewrite one part with a prompt.",
    },
    "ja-JP": {
        cardGptImageDesc: "文字や画像からキャラ、ポスター、絵コンテを作成",
        cardShotBreakdownDesc: "動画をアップして、画角やカメラワーク、テンポを分析",
        cardRemakeDesc: "動画をアップして、プロンプトで特定シーンを変更",
    },
    "ko-KR": {
        cardGptImageDesc: "글이나 이미지로 캐릭터와 포스터, 콘티 제작",
        cardShotBreakdownDesc: "영상을 올려 컷별 구도와 카메라 워크, 템포 분석",
        cardRemakeDesc: "영상을 올려 프롬프트로 원하는 구간만 수정",
    },
    "es-ES": {
        cardGptImageDesc: "Crea personajes, carteles y escenas con texto o fotos.",
        cardShotBreakdownDesc: "Sube un vídeo y analiza planos, movimientos y ritmo.",
        cardRemakeDesc: "Sube un vídeo y cambia una parte con un prompt.",
    },
    "pt-BR": {
        cardGptImageDesc: "Crie personagens, pôsteres e cenas com texto ou fotos.",
        cardShotBreakdownDesc: "Envie um vídeo e veja planos, movimentos e ritmo.",
        cardRemakeDesc: "Envie um vídeo e mude um trecho com um prompt.",
    },
} as const;
