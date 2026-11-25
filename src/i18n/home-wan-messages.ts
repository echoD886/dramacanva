import type { AppLocale } from "./app-locale";
import type { HomeHeroCampaignMessage } from "./home-messages";

const copy: Record<AppLocale, readonly [string, string, string, string]> = {
    "zh-CN": ["视频创作 · WAN 3.0", "让细节进入镜头", "从人物参考到视频镜头，在同一条工作流中编排表情、光线与动作。", "探索 Wan 3.0"],
    "zh-HK": ["影片創作 · WAN 3.0", "讓細節走進鏡頭", "由人物參考到影片鏡頭，在同一個工作流程編排表情、光線與動作。", "探索 Wan 3.0"],
    "zh-TW": ["影片創作 · WAN 3.0", "讓細節走進鏡頭", "從角色參考到影片鏡頭，在同一個工作流程安排表情、光線與動作。", "探索 Wan 3.0"],
    "en-US": ["VIDEO WORKFLOW · WAN 3.0", "Every detail, in motion", "From character references to cinematic shots. Bring expression, light and movement into one workflow.", "Explore Wan 3.0"],
    "ja-JP": ["動画制作 · WAN 3.0", "細部まで、映像に", "キャラクター参照から映像のショットへ。表情、光、動きをひとつのワークフローで。", "Wan 3.0 を見る"],
    "ko-KR": ["영상 제작 · WAN 3.0", "디테일을 움직이다", "캐릭터 참조에서 영상 샷까지. 표정, 빛과 움직임을 하나의 워크플로로 구성하세요.", "Wan 3.0 살펴보기"],
    "es-ES": ["FLUJO DE VÍDEO · WAN 3.0", "Cada detalle en movimiento", "De referencias de personajes a planos cinematográficos. Expresión, luz y movimiento en un mismo flujo.", "Explorar Wan 3.0"],
    "fr-FR": ["CRÉATION VIDÉO · WAN 3.0", "Chaque détail en mouvement", "Des références de personnages aux plans de cinéma. Expression, lumière et mouvement dans un seul espace.", "Découvrir Wan 3.0"],
    "de-DE": ["VIDEO-WORKFLOW · WAN 3.0", "Jedes Detail in Bewegung", "Von Charakterreferenzen zu filmischen Einstellungen. Ausdruck, Licht und Bewegung in einem Workflow.", "Wan 3.0 entdecken"],
    "pt-BR": ["CRIAÇÃO DE VÍDEO · WAN 3.0", "Cada detalhe em movimento", "De referências de personagens a planos de cinema. Expressão, luz e movimento no mesmo fluxo.", "Explorar Wan 3.0"],
    "it-IT": ["CREAZIONE VIDEO · WAN 3.0", "Ogni dettaglio in movimento", "Dai riferimenti dei personaggi alle inquadrature. Espressione, luce e movimento in un unico flusso.", "Scopri Wan 3.0"],
    "ru-RU": ["ВИДЕОПРОЦЕСС · WAN 3.0", "Каждая деталь в движении", "От референсов персонажа к кадрам фильма. Выражение, свет и движение в одном процессе.", "Открыть Wan 3.0"],
    "ar-SA": ["إنتاج الفيديو · WAN 3.0", "كل تفصيل ينبض بالحركة", "من مراجع الشخصيات إلى لقطات سينمائية. التعبير والضوء والحركة ضمن مسار عمل واحد.", "استكشف Wan 3.0"],
    "hi-IN": ["वीडियो निर्माण · WAN 3.0", "हर बारीकी में गति", "किरदार के संदर्भों से सिनेमाई शॉट तक। भाव, रोशनी और गति एक ही वर्कफ़्लो में।", "Wan 3.0 देखें"],
    "id-ID": ["ALUR VIDEO · WAN 3.0", "Setiap detail bergerak", "Dari referensi karakter ke shot sinematik. Ekspresi, cahaya, dan gerakan dalam satu alur kerja.", "Jelajahi Wan 3.0"],
    "tr-TR": ["VİDEO AKIŞI · WAN 3.0", "Her ayrıntı hareketli", "Karakter referanslarından sinema planlarına. İfade, ışık ve hareket tek bir iş akışında.", "Wan 3.0 keşfet"],
    "vi-VN": ["QUY TRÌNH VIDEO · WAN 3.0", "Từng chi tiết chuyển động", "Từ hình tham chiếu nhân vật đến cảnh điện ảnh. Biểu cảm, ánh sáng và chuyển động trong một quy trình.", "Khám phá Wan 3.0"],
};

export const HOME_WAN_MESSAGES = Object.fromEntries(Object.entries(copy).map(([locale, [eyebrow, artisticTitle, description, cta]]) => [locale, { eyebrow, title: "Wan 3.0 ·", artisticTitle, description, datePrefix: "Wan 3.0", cta }])) as Record<
    AppLocale,
    HomeHeroCampaignMessage
>;
