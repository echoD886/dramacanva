import { MODEL_STARTER_CARD_COPY } from "./model-starter-card-copy";
import type { BlogLocale } from "@/content/blog-locales";

/** Home model/tool starter copy (Gemini-authored, owner-reviewed): card lines, empty-node "Try:" entries and composer placeholders. */
export type ModelStarterCopy = Record<
    | "cardGptImageDesc"
    | "cardShotBreakdownDesc"
    | "cardRemakeDesc"
    | "tryLabel"
    | "hintTextToImage"
    | "hintEditImage"
    | "hintTextToVideo"
    | "hintFirstFrame"
    | "hintReferenceVideo"
    | "hintUploadVideo"
    | "placeholderImage"
    | "placeholderSeedance"
    | "placeholderWan"
    | "placeholderMinimax"
    | "placeholderShotBreakdown"
    | "placeholderRemake",
    string
>;

export const MODEL_STARTER_COPY: Record<BlogLocale, ModelStarterCopy> = {
    "zh-CN": {
        ...MODEL_STARTER_CARD_COPY["zh-CN"],
        tryLabel: "试试：",
        hintTextToImage: "文字生成图片",
        hintEditImage: "上传参考图改图",
        hintTextToVideo: "文字生成视频",
        hintFirstFrame: "首帧生成视频",
        hintReferenceVideo: "参考素材生成视频",
        hintUploadVideo: "上传视频",
        placeholderImage: "描述你想要的角色或场景，例如：民国茶馆窗边，穿旗袍倒茶的女掌柜",
        placeholderSeedance: "描述你想要的镜头运动，例如：镜头慢速推向雨夜巷口，撑黑伞的保镖转身",
        placeholderWan: "描述你想要的角色动作，例如：白衣剑客侧身拔剑，竹叶随剑锋在风中飘散",
        placeholderMinimax: "描述你想要的情绪特写，例如：女主眼含泪光抬头苦笑，发丝被夜风吹乱",
        placeholderShotBreakdown: "描述你想拆解的内容，例如：拆出每个镜头的景别、运镜方式和剪辑节奏",
        placeholderRemake: "描述你想替换的画面，例如：@视频 把第二段雨天改成黄昏晴天，动作不变",
    },
    "zh-HK": {
        ...MODEL_STARTER_CARD_COPY["zh-HK"],
        tryLabel: "試試：",
        hintTextToImage: "文字生成圖片",
        hintEditImage: "上傳參考圖改圖",
        hintTextToVideo: "文字生成影片",
        hintFirstFrame: "首幀生成影片",
        hintReferenceVideo: "參考素材生影片",
        hintUploadVideo: "上傳影片",
        placeholderImage: "描述你想要的角色或場景，例如：復古茶餐廳窗邊，穿旗袍倒茶的老闆娘",
        placeholderSeedance: "描述你想要的鏡頭運動，例如：鏡頭慢速推向雨夜巷口，撐黑傘的保鏢轉身",
        placeholderWan: "描述你想要的角色動作，例如：白衣劍客側身拔劍，竹葉隨劍鋒在風中飄散",
        placeholderMinimax: "描述你想要的情緒特寫，例如：女主眼泛淚光抬頭苦笑，髮絲被夜風吹亂",
        placeholderShotBreakdown: "描述你想拆解的重點，例如：拆出每個鏡頭的景別、運鏡方式與剪接節奏",
        placeholderRemake: "描述你想替換的畫面，例如：@影片 把第二段雨天改成黃昏晴天，動作不變",
    },
    "zh-TW": {
        ...MODEL_STARTER_CARD_COPY["zh-TW"],
        tryLabel: "試試：",
        hintTextToImage: "文字生成圖片",
        hintEditImage: "上傳參考圖改圖",
        hintTextToVideo: "文字生成影片",
        hintFirstFrame: "首幀生成影片",
        hintReferenceVideo: "參考素材生影片",
        hintUploadVideo: "上傳影片",
        placeholderImage: "描述你想要的角色或場景，例如：復古茶館窗邊，穿旗袍倒茶的女掌櫃",
        placeholderSeedance: "描述你想要的鏡頭運動，例如：鏡頭慢速推向雨夜巷口，撐黑傘的保鏢轉身",
        placeholderWan: "描述你想要的角色動作，例如：白衣劍客側身拔劍，竹葉隨劍氣在風中飄散",
        placeholderMinimax: "描述你想要的情緒特寫，例如：女主角眼眶含淚苦笑，髮絲被晚風吹亂",
        placeholderShotBreakdown: "描述你想分析的重點，例如：拆出每個鏡頭的景別、運鏡方式與剪輯節奏",
        placeholderRemake: "描述你想替換的畫面，例如：@影片 把第二段雨天改成黃昏晴天，動作不變",
    },
    "en-US": {
        ...MODEL_STARTER_CARD_COPY["en-US"],
        tryLabel: "Try:",
        hintTextToImage: "Text to Image",
        hintEditImage: "Edit with a Reference",
        hintTextToVideo: "Text to Video",
        hintFirstFrame: "First Frame to Video",
        hintReferenceVideo: "Reference to Video",
        hintUploadVideo: "Upload Video",
        placeholderImage: "Describe what you want, e.g.: A 1930s teahouse owner pouring tea by the window, wearing a qipao.",
        placeholderSeedance: "Describe the camera movement, e.g.: Slow push-in on a bodyguard holding a black umbrella in a rainy alley.",
        placeholderWan: "Describe character action, e.g.: A swordsman in white drawing a blade as bamboo leaves swirl around him.",
        placeholderMinimax: "Describe facial emotion, e.g.: Close-up of a tearful woman smiling bitterly as the wind blows her hair.",
        placeholderShotBreakdown: "Describe what to break down, e.g.: Analyze shot sizes, camera motion, and cut pacing for each shot.",
        placeholderRemake: "Describe the change, e.g.: @video change the rain in scene two to a sunny sunset, keep actions.",
    },
    "ja-JP": {
        ...MODEL_STARTER_CARD_COPY["ja-JP"],
        tryLabel: "お試し：",
        hintTextToImage: "テキストから画像",
        hintEditImage: "参考画像で編集",
        hintTextToVideo: "テキストから動画",
        hintFirstFrame: "画像から動画化",
        hintReferenceVideo: "素材から動画化",
        hintUploadVideo: "動画をアップ",
        placeholderImage: "作りたい画像を説明、例：レトロな喫茶店の窓際で紅茶を注ぐ着物の女性",
        placeholderSeedance: "カメラの動きを説明、例：雨の路地へゆっくり寄り、黒傘の男が振り返る",
        placeholderWan: "キャラクターの動きを説明、例：白装束の剣士が抜刀し、竹の葉が風に舞う",
        placeholderMinimax: "表情を説明、例：涙を浮かべながら苦笑いする女性のアップ、風で揺れる髪",
        placeholderShotBreakdown: "分析したい内容を説明、例：カットごとの画角・カメラワーク・テンポを分解",
        placeholderRemake: "変更点を説明、例：@動画 2つ目の雨のシーンを夕暮れに変えて、動きは維持",
    },
    "ko-KR": {
        ...MODEL_STARTER_CARD_COPY["ko-KR"],
        tryLabel: "추천:",
        hintTextToImage: "텍스트로 이미지",
        hintEditImage: "참고 이미지 수정",
        hintTextToVideo: "텍스트로 영상",
        hintFirstFrame: "첫 프레임 영상",
        hintReferenceVideo: "참고 자료로 영상 만들기",
        hintUploadVideo: "영상 업로드",
        placeholderImage: "원하는 장면 설명, 예: 개화기 찻집 창가에서 차를 따르는 한복 차림의 여인",
        placeholderSeedance: "카메라 앵글 설명, 예: 비 오는 골목으로 천천히 다가가며 우산 쓴 남자가 뒤돌아봄",
        placeholderWan: "원하는 동작 설명, 예: 흰옷을 입은 무사가 검을 뽑자 대나무 잎이 바람에 흩날림",
        placeholderMinimax: "원하는 감정 설명, 예: 눈물을 글썽이며 쓰게 웃는 여자의 얼굴 클로즈업",
        placeholderShotBreakdown: "분석할 내용 설명, 예: 각 컷의 샷 크기와 카메라 워크, 편집 리듬 정리",
        placeholderRemake: "수정할 내용 설명, 예: @영상 두 번째 비 오는 장면을 노을빛 맑은 날로 변경",
    },
    "es-ES": {
        ...MODEL_STARTER_CARD_COPY["es-ES"],
        tryLabel: "Prueba:",
        hintTextToImage: "Texto a imagen",
        hintEditImage: "Editar con imagen",
        hintTextToVideo: "Texto a vídeo",
        hintFirstFrame: "Vídeo desde imagen",
        hintReferenceVideo: "Vídeo con referencia",
        hintUploadVideo: "Subir vídeo",
        placeholderImage: "Describe la imagen que buscas, por ejemplo: Dueña de una taberna antigua sirviendo té junto a la ventana.",
        placeholderSeedance: "Describe la toma que quieres, por ejemplo: Cámara que avanza en un callejón lluvioso hacia un hombre con paraguas.",
        placeholderWan: "Describe la acción, por ejemplo: Espadachín de blanco desenvainando rápido mientras las hojas vuelan alrededor.",
        placeholderMinimax: "Describe la emoción, por ejemplo: Primer plano de una chica sonriendo con lágrimas mientras el viento mueve su pelo.",
        placeholderShotBreakdown: "Describe el análisis, por ejemplo: Desglosa el tipo de plano, movimiento de cámara y ritmo de cada toma.",
        placeholderRemake: "Describe el cambio, por ejemplo: @vídeo cambia la lluvia de la segunda escena por un atardecer despejado.",
    },
    "pt-BR": {
        ...MODEL_STARTER_CARD_COPY["pt-BR"],
        tryLabel: "Experimente:",
        hintTextToImage: "Texto para imagem",
        hintEditImage: "Editar com imagem",
        hintTextToVideo: "Texto para vídeo",
        hintFirstFrame: "Vídeo do primeiro frame",
        hintReferenceVideo: "Vídeo com referência",
        hintUploadVideo: "Enviar vídeo",
        placeholderImage: "Descreva a imagem que você quer, por exemplo: Dona de café antigo servindo chá na janela, usando vestido clássico.",
        placeholderSeedance: "Descreva a cena que você quer, por exemplo: Câmera avança em beco chuvoso até segurança de terno virar.",
        placeholderWan: "Descreva a ação que você quer, por exemplo: Espadachim de branco desembainha a espada e folhas voam com o golpe.",
        placeholderMinimax: "Descreva a emoção que você quer, por exemplo: Close no rosto da mulher sorrindo com lágrimas enquanto o vento sopra.",
        placeholderShotBreakdown: "Descreva a análise que você quer, por exemplo: Mostre enquadramento, movimento de câmera e ritmo de cada corte.",
        placeholderRemake: "Descreva a mudança que você quer, por exemplo: @vídeo mude a chuva da segunda cena para um pôr do sol limpo.",
    },
};
