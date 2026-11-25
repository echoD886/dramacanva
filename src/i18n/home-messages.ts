import { PUBLIC_MARKET_COPY } from "../lib/public-market-copy";
import { HOME_WAN_MESSAGES } from "./home-wan-messages";
import type { AppLocale } from "./app-locale";

export type HomeHeroCampaignKey = "siteLaunch" | "ranking" | "creatorChallenge" | "byokStudio" | "wan";

export interface HomeHeroCampaignMessage {
    eyebrow: string;
    title: string;
    artisticTitle: string;
    description: string;
    datePrefix: string;
    cta: string;
}

interface HomeHeroMessages {
    regionLabel: string;
    previousLabel: string;
    nextLabel: string;
    pickerLabel: string;
    showSlideLabel: (index: number) => string;
    slides: readonly string[];
    campaigns: Record<HomeHeroCampaignKey, HomeHeroCampaignMessage>;
}

export const HOME_HERO_MESSAGES: Record<AppLocale, HomeHeroMessages> = {
    "zh-CN": {
        regionLabel: "首页推荐", previousLabel: "上一张推荐", nextLabel: "下一张推荐", pickerLabel: "选择推荐内容",
        showSlideLabel: (index) => `显示第 ${index} 张推荐`,
        slides: ["创作主场 (自带模型)", "新站上线活动", "每周热门作品榜单", HOME_WAN_MESSAGES["zh-CN"].cta, "创作者挑战"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["zh-CN"],
            byokStudio: { eyebrow: "AI 分镜 · 视频画布 · 支持自带模型", title: "创作主场，", artisticTitle: "带模型开拍", description: "Nano Banana 生成角色原画与分镜，Seedance 2.5 负责首尾帧、镜头运动与视频。", datePrefix: "全新权益", cta: "了解创作主场" },
            siteLaunch: { eyebrow: "新站上线 · 一张画布", title: "脑海有戏，", artisticTitle: "落笔开拍", description: "从第一笔，到最后一帧，都在同一张画布发生。", datePrefix: "新站体验", cta: "进入片场" },
            ranking: { eyebrow: "每周精选 · 实时排行", title: "本周好戏，", artisticTitle: "值得被看见", description: "站内真实作品，按本周喜欢度更新。", datePrefix: "本周更新", cta: "查看榜单" },
            creatorChallenge: { eyebrow: "创作者挑战 · 3–5 个镜头", title: "三五镜头，", artisticTitle: "让故事开口", description: "用 3–5 个镜头，把脑海里的那一幕讲到结尾。", datePrefix: "作品征集", cta: "接下挑战" },
        },
    },
    "zh-HK": {
        regionLabel: "首頁推薦", previousLabel: "上一張推薦", nextLabel: "下一張推薦", pickerLabel: "選擇推薦內容",
        showSlideLabel: (index) => `顯示第 ${index} 張推薦`,
        slides: ["創作主場 (自帶模型)", "新站上線活動", "每週熱門作品榜單", HOME_WAN_MESSAGES["zh-HK"].cta, "創作者挑戰"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["zh-HK"],
            byokStudio: PUBLIC_MARKET_COPY["zh-HK"].hero,
            siteLaunch: { eyebrow: "新站上線 · 一張畫布", title: "腦海有戲，", artisticTitle: "落筆開拍", description: "從第一筆，到最後一幀，都在同一張畫布發生。", datePrefix: "新站體驗", cta: "進入片場" },
            ranking: { eyebrow: "每週精選 · 即時排行", title: "本週好戲，", artisticTitle: "值得被看見", description: "站內真實作品，按本週喜歡度更新。", datePrefix: "本週更新", cta: "查看榜單" },
            creatorChallenge: { eyebrow: "創作者挑戰 · 3–5 個鏡頭", title: "三五鏡頭，", artisticTitle: "讓故事開口", description: "用 3–5 個鏡頭，把腦海裏的那一幕講到結尾。", datePrefix: "作品徵集", cta: "接下挑戰" },
        },
    },
    "zh-TW": {
        regionLabel: "首頁推薦", previousLabel: "上一張推薦", nextLabel: "下一張推薦", pickerLabel: "選擇推薦內容",
        showSlideLabel: (index) => `顯示第 ${index} 張推薦`,
        slides: ["創作主場 (自帶模型)", "新站上線活動", "每週熱門作品榜單", HOME_WAN_MESSAGES["zh-TW"].cta, "創作者挑戰"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["zh-TW"],
            byokStudio: PUBLIC_MARKET_COPY["zh-TW"].hero,
            siteLaunch: { eyebrow: "新站上線 · 一張畫布", title: "腦海有戲，", artisticTitle: "落筆開拍", description: "從第一筆，到最後一影格，都在同一張畫布發生。", datePrefix: "新站體驗", cta: "進入片場" },
            ranking: { eyebrow: "每週精選 · 即時排行", title: "本週好戲，", artisticTitle: "值得被看見", description: "站內真實作品，按本週喜歡度更新。", datePrefix: "本週更新", cta: "查看榜單" },
            creatorChallenge: { eyebrow: "創作者挑戰 · 3–5 個鏡頭", title: "三五鏡頭，", artisticTitle: "讓故事開口", description: "用 3–5 個鏡頭，把腦海裡的那一幕講到結尾。", datePrefix: "作品徵集", cta: "接下挑戰" },
        },
    },
    "en-US": {
        regionLabel: "Homepage highlights", previousLabel: "Previous highlight", nextLabel: "Next highlight", pickerLabel: "Choose a highlight",
        showSlideLabel: (index) => `Show highlight ${index}`,
        slides: ["BYOK Studio Pass", "DramaCanvas new-site launch", "DramaCanvas weekly highlights", HOME_WAN_MESSAGES["en-US"].cta, "DramaCanvas creator challenge"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["en-US"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "BYOK Studio Pass.", artisticTitle: "Your models. One canvas.", description: "Nano Banana for consistent characters and storyboards. Seedance 2.5 for first/last frames, camera motion and video.", datePrefix: "New Plan", cta: "Explore Studio Pass" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Picture the scene,", artisticTitle: "then set it in motion", description: "From the first mark to the final frame, everything happens on one canvas.", datePrefix: "Launch season", cta: "Enter the studio" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Great work this week,", artisticTitle: "made to be seen", description: "Real community films, ranked by this week’s appreciation.", datePrefix: "Updated weekly", cta: "View ranking" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "Three to five shots,", artisticTitle: "let the story speak", description: "Tell one complete moment in 3–5 shots, from opening beat to final frame.", datePrefix: "Open call", cta: "Take the challenge" },
        },
    },
    "ja-JP": {
        regionLabel: "ホームのおすすめ", previousLabel: "前のおすすめ", nextLabel: "次のおすすめ", pickerLabel: "おすすめを選択",
        showSlideLabel: (index) => `${index}枚目のおすすめを表示`,
        slides: ["BYOKスタジオパス", "DramaCanvasの新サイト公開", "DramaCanvasの週間注目作品", HOME_WAN_MESSAGES["ja-JP"].cta, "DramaCanvasクリエイターチャレンジ"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["ja-JP"],
            byokStudio: PUBLIC_MARKET_COPY["ja-JP"].hero,
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "頭の中のシーンを、", artisticTitle: "描いて動かす", description: "最初の一筆から最後のフレームまで、ひとつのキャンバスで。", datePrefix: "新サイト体験期間", cta: "制作をはじめる" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "今週の傑作を、", artisticTitle: "もっと多くの人へ", description: "サイト内の作品を、今週の「好き」でランキング。", datePrefix: "毎週更新", cta: "ランキングを見る" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "3〜5カットで、", artisticTitle: "物語を語ろう", description: "心に浮かんだ一場面を、始まりから結末まで描こう。", datePrefix: "作品募集", cta: "挑戦する" },
        },
    },
    "ko-KR": {
        regionLabel: "홈 추천", previousLabel: "이전 추천", nextLabel: "다음 추천", pickerLabel: "추천 선택",
        showSlideLabel: (index) => `${index}번째 추천 보기`,
        slides: ["BYOK 스튜디오 패스", "DramaCanvas 새 사이트 오픈", "DramaCanvas 주간 추천작", HOME_WAN_MESSAGES["ko-KR"].cta, "DramaCanvas 크리에이터 챌린지"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["ko-KR"],
            byokStudio: PUBLIC_MARKET_COPY["ko-KR"].hero,
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "머릿속 장면을,", artisticTitle: "화면 위에 움직이다", description: "첫 선부터 마지막 프레임까지 하나의 캔버스에서 완성하세요.", datePrefix: "새 사이트 체험 기간", cta: "스튜디오 입장" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "이번 주 좋은 작품,", artisticTitle: "더 많은 시선으로", description: "사이트의 실제 작품을 이번 주의 좋아요로 순위화합니다.", datePrefix: "매주 업데이트", cta: "랭킹 보기" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "세다섯 숏으로,", artisticTitle: "이야기를 말하다", description: "떠오른 한 장면을 시작부터 끝까지 3–5개의 숏으로 완성하세요.", datePrefix: "작품 모집", cta: "도전하기" },
        },
    },
    "es-ES": {
        regionLabel: "Destacados de inicio", previousLabel: "Destacado anterior", nextLabel: "Siguiente destacado", pickerLabel: "Elegir destacado",
        showSlideLabel: (index) => `Mostrar destacado ${index}`,
        slides: ["Pase de Estudio BYOK", "Nueva web de DramaCanvas", "Selección semanal de DramaCanvas", HOME_WAN_MESSAGES["es-ES"].cta, "Reto de creadores DramaCanvas"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["es-ES"],
            byokStudio: PUBLIC_MARKET_COPY["es-ES"].hero,
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Imagina la escena,", artisticTitle: "ponla en movimiento", description: "Del primer trazo al último fotograma, todo sucede en un mismo lienzo.", datePrefix: "Temporada de lanzamiento", cta: "Entrar al estudio" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Lo mejor de la semana,", artisticTitle: "hecho para ser visto", description: "Obras reales de la comunidad, ordenadas por el apoyo de esta semana.", datePrefix: "Actualización semanal", cta: "Ver ranking" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "De tres a cinco planos,", artisticTitle: "deja hablar a la historia", description: "Cuenta un momento completo en 3–5 planos, del inicio al último fotograma.", datePrefix: "Convocatoria", cta: "Aceptar el reto" },
        },
    },
    "fr-FR": {
        regionLabel: "À la une", previousLabel: "Élément précédent", nextLabel: "Élément suivant", pickerLabel: "Choisir un élément",
        showSlideLabel: (index) => `Afficher l’élément ${index}`,
        slides: ["Pass Studio BYOK", "Nouveau site DramaCanvas", "Sélection DramaCanvas de la semaine", HOME_WAN_MESSAGES["fr-FR"].cta, "Défi créateurs DramaCanvas"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["fr-FR"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "Pass Studio BYOK,", artisticTitle: "venez avec vos modèles", description: "Nano Banana pour des personnages cohérents et des storyboards. Seedance 2.5 pour les premières/dernières images, les mouvements de caméra et la vidéo.", datePrefix: "Nouveau Plan", cta: "Découvrir le Studio" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Imaginez la scène,", artisticTitle: "mettez-la en mouvement", description: "Du premier trait à la dernière image, tout se crée sur un même canvas.", datePrefix: "Saison de lancement", cta: "Entrer en studio" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Les films de la semaine,", artisticTitle: "faits pour être vus", description: "De vraies créations de la communauté, classées par les coups de cœur de la semaine.", datePrefix: "Mise à jour hebdomadaire", cta: "Voir le classement" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "Trois à cinq plans,", artisticTitle: "laissez parler l’histoire", description: "Racontez un moment complet en 3 à 5 plans, jusqu’à la dernière image.", datePrefix: "Appel à créations", cta: "Relever le défi" },
        },
    },
    "de-DE": {
        regionLabel: "Highlights", previousLabel: "Vorheriges Highlight", nextLabel: "Nächstes Highlight", pickerLabel: "Highlight auswählen",
        showSlideLabel: (index) => `Highlight ${index} anzeigen`,
        slides: ["BYOK Studio Pass", "Neue DramaCanvas-Website", "DramaCanvas-Wochenauswahl", HOME_WAN_MESSAGES["de-DE"].cta, "DramaCanvas Creator-Challenge"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["de-DE"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "BYOK Studio Pass,", artisticTitle: "eigene Modelle mitbringen", description: "Nano Banana für konsistente Figuren und Storyboards. Seedance 2.5 für Start-/Endbilder, Kamerabewegung und Video.", datePrefix: "Neuer Plan", cta: "Studio Pass ansehen" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Sieh die Szene,", artisticTitle: "bring sie in Bewegung", description: "Vom ersten Strich bis zum letzten Frame entsteht alles auf einer Leinwand.", datePrefix: "Launch-Saison", cta: "Ins Studio" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Die besten Filme der Woche,", artisticTitle: "gemacht fürs Publikum", description: "Echte Community-Werke, sortiert nach der Resonanz dieser Woche.", datePrefix: "Wöchentlich neu", cta: "Rangliste ansehen" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "Drei bis fünf Einstellungen,", artisticTitle: "lass die Geschichte sprechen", description: "Erzähle einen vollständigen Moment in 3–5 Einstellungen bis zum letzten Frame.", datePrefix: "Open Call", cta: "Challenge annehmen" },
        },
    },
    "pt-BR": {
        regionLabel: "Destaques da página inicial", previousLabel: "Destaque anterior", nextLabel: "Próximo destaque", pickerLabel: "Escolher destaque",
        showSlideLabel: (index) => `Mostrar destaque ${index}`,
        slides: ["Passe Studio BYOK", "Novo site DramaCanvas", "Destaques semanais DramaCanvas", HOME_WAN_MESSAGES["pt-BR"].cta, "Desafio de criadores DramaCanvas"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["pt-BR"],
            byokStudio: PUBLIC_MARKET_COPY["pt-BR"].hero,
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Imagine a cena,", artisticTitle: "coloque-a em movimento", description: "Do primeiro traço ao último quadro, tudo acontece em um só canvas.", datePrefix: "Temporada de lançamento", cta: "Entrar no estúdio" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Os grandes filmes da semana,", artisticTitle: "feitos para serem vistos", description: "Obras reais da comunidade, classificadas pela preferência desta semana.", datePrefix: "Atualização semanal", cta: "Ver ranking" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "De três a cinco planos,", artisticTitle: "deixe a história falar", description: "Conte um momento completo em 3–5 planos, até o último quadro.", datePrefix: "Inscrições", cta: "Aceitar o desafio" },
        },
    },
    "it-IT": {
        regionLabel: "In evidenza", previousLabel: "Elemento precedente", nextLabel: "Elemento successivo", pickerLabel: "Scegli un elemento",
        showSlideLabel: (index) => `Mostra elemento ${index}`,
        slides: ["Pass Studio BYOK", "Nuovo sito DramaCanvas", "Selezione settimanale DramaCanvas", HOME_WAN_MESSAGES["it-IT"].cta, "Creator Challenge DramaCanvas"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["it-IT"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "Pass Studio BYOK,", artisticTitle: "porta i tuoi modelli e gira", description: "Nano Banana per personaggi coerenti e storyboard. Seedance 2.5 per primo/ultimo fotogramma, movimenti di camera e video.", datePrefix: "Nuovo Piano", cta: "Scopri Studio Pass" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Immagina la scena,", artisticTitle: "mettila in movimento", description: "Dal primo segno all’ultimo fotogramma, tutto accade su un unico canvas.", datePrefix: "Stagione di lancio", cta: "Entra in studio" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "I film migliori della settimana,", artisticTitle: "fatti per essere visti", description: "Opere reali della community, ordinate per l’apprezzamento della settimana.", datePrefix: "Aggiornato ogni settimana", cta: "Vedi classifica" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "Da tre a cinque inquadrature,", artisticTitle: "lascia parlare la storia", description: "Racconta un momento completo in 3–5 inquadrature, fino all’ultimo fotogramma.", datePrefix: "Candidature", cta: "Accetta la sfida" },
        },
    },
    "ru-RU": {
        regionLabel: "Главное", previousLabel: "Предыдущий баннер", nextLabel: "Следующий баннер", pickerLabel: "Выбрать баннер",
        showSlideLabel: (index) => `Показать баннер ${index}`,
        slides: ["BYOK Studio Pass", "Новый сайт DramaCanvas", "Подборка недели DramaCanvas", HOME_WAN_MESSAGES["ru-RU"].cta, "Конкурс авторов DramaCanvas"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["ru-RU"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "BYOK Studio Pass,", artisticTitle: "со своими моделями", description: "Nano Banana — для согласованных персонажей и раскадровок. Seedance 2.5 — для первого/последнего кадра, движения камеры и видео.", datePrefix: "Новый план", cta: "Подробнее о студии" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Представьте сцену —", artisticTitle: "оживите её", description: "От первого штриха до финального кадра всё происходит на одном холсте.", datePrefix: "Сезон запуска", cta: "Войти в студию" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Лучшие фильмы недели,", artisticTitle: "которые стоит увидеть", description: "Настоящие работы сообщества в рейтинге симпатий этой недели.", datePrefix: "Обновляется еженедельно", cta: "Смотреть рейтинг" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "Три–пять кадров —", artisticTitle: "пусть история заговорит", description: "Расскажите цельный момент в 3–5 кадрах — от начала до финала.", datePrefix: "Приём работ", cta: "Принять вызов" },
        },
    },
    "ar-SA": {
        regionLabel: "أبرز محتويات الصفحة", previousLabel: "العرض السابق", nextLabel: "العرض التالي", pickerLabel: "اختر عرضًا",
        showSlideLabel: (index) => `عرض المحتوى رقم ${index}`,
        slides: ["استوديو BYOK", "إطلاق موقع DramaCanvas الجديد", "مختارات DramaCanvas الأسبوعية", HOME_WAN_MESSAGES["ar-SA"].cta, "تحدّي مبدعي DramaCanvas"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["ar-SA"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "استوديو BYOK،", artisticTitle: "أحضر نماذجك وابدأ التصوير", description: "Nano Banana لشخصيات متسقة ولوحات القصة. Seedance 2.5 للإطار الأول والأخير وحركة الكاميرا والفيديو.", datePrefix: "خطة جديدة", cta: "استكشف استوديو BYOK" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "تخيّل المشهد،", artisticTitle: "ثم حرّكه", description: "من أول خط إلى آخر لقطة، يحدث كل شيء على لوحة واحدة.", datePrefix: "موسم الإطلاق", cta: "ادخل الاستوديو" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "أفلام هذا الأسبوع،", artisticTitle: "تستحق أن تُرى", description: "أعمال حقيقية من المجتمع مرتبة بحسب إعجاب هذا الأسبوع.", datePrefix: "تحديث أسبوعي", cta: "عرض الترتيب" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "من ثلاث إلى خمس لقطات،", artisticTitle: "دع القصة تتكلم", description: "اروِ لحظة كاملة في 3–5 لقطات من البداية حتى النهاية.", datePrefix: "استقبال الأعمال", cta: "اقبل التحدي" },
        },
    },
    "hi-IN": {
        regionLabel: "होम हाइलाइट्स", previousLabel: "पिछला हाइलाइट", nextLabel: "अगला हाइलाइट", pickerLabel: "हाइलाइट चुनें",
        showSlideLabel: (index) => `हाइलाइट ${index} दिखाएँ`,
        slides: ["BYOK स्टूडियो पास", "DramaCanvas नई साइट", "DramaCanvas साप्ताहिक चयन", HOME_WAN_MESSAGES["hi-IN"].cta, "DramaCanvas क्रिएटर चैलेंज"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["hi-IN"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "BYOK स्टूडियो पास,", artisticTitle: "मॉडल लाएँ और शूट करें", description: "सुसंगत किरदारों और स्टोरीबोर्ड के लिए Nano Banana। पहले/आख़िरी फ़्रेम, कैमरा मूवमेंट और वीडियो के लिए Seedance 2.5।", datePrefix: "नया प्लान", cta: "स्टूडियो पास देखें" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "दृश्य सोचिए,", artisticTitle: "उसे गति दीजिए", description: "पहली रेखा से आख़िरी फ़्रेम तक, सब कुछ एक ही कैनवास पर।", datePrefix: "लॉन्च सीज़न", cta: "स्टूडियो में जाएँ" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "इस हफ़्ते की बेहतरीन फ़िल्में,", artisticTitle: "देखे जाने के लिए", description: "समुदाय की असली रचनाएँ, इस हफ़्ते की पसंद के अनुसार क्रमबद्ध।", datePrefix: "हर हफ़्ते अपडेट", cta: "रैंकिंग देखें" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "तीन से पाँच शॉट,", artisticTitle: "कहानी को बोलने दें", description: "3–5 शॉट में एक पूरा पल शुरू से आख़िरी फ़्रेम तक कहें।", datePrefix: "प्रविष्टियाँ खुली हैं", cta: "चुनौती लें" },
        },
    },
    "id-ID": {
        regionLabel: "Sorotan beranda", previousLabel: "Sorotan sebelumnya", nextLabel: "Sorotan berikutnya", pickerLabel: "Pilih sorotan",
        showSlideLabel: (index) => `Tampilkan sorotan ${index}`,
        slides: ["Studio Pass BYOK", "Situs baru DramaCanvas", "Pilihan mingguan DramaCanvas", HOME_WAN_MESSAGES["id-ID"].cta, "Tantangan kreator DramaCanvas"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["id-ID"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "Studio Pass BYOK,", artisticTitle: "bawa model & mulai syuting", description: "Nano Banana untuk karakter yang konsisten dan storyboard. Seedance 2.5 untuk frame awal/akhir, gerakan kamera, dan video.", datePrefix: "Paket Baru", cta: "Lihat Studio Pass" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Bayangkan adegannya,", artisticTitle: "gerakkan di layar", description: "Dari goresan pertama hingga bingkai terakhir, semuanya terjadi di satu kanvas.", datePrefix: "Musim peluncuran", cta: "Masuk studio" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Film terbaik pekan ini,", artisticTitle: "layak untuk dilihat", description: "Karya nyata komunitas, diperingkat berdasarkan apresiasi minggu ini.", datePrefix: "Diperbarui mingguan", cta: "Lihat peringkat" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "Tiga sampai lima shot,", artisticTitle: "biarkan cerita bicara", description: "Ceritakan satu momen utuh dalam 3–5 shot hingga bingkai terakhir.", datePrefix: "Pendaftaran karya", cta: "Ambil tantangan" },
        },
    },
    "tr-TR": {
        regionLabel: "Ana sayfa öne çıkanları", previousLabel: "Önceki içerik", nextLabel: "Sonraki içerik", pickerLabel: "İçerik seç",
        showSlideLabel: (index) => `${index}. içeriği göster`,
        slides: ["BYOK Stüdyo Kartı", "Yeni DramaCanvas sitesi", "DramaCanvas haftalık seçkisi", HOME_WAN_MESSAGES["tr-TR"].cta, "DramaCanvas içerik üretici yarışması"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["tr-TR"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "BYOK Stüdyo Kartı,", artisticTitle: "modelini getir çekime başla", description: "Tutarlı karakterler ve storyboard için Nano Banana. İlk/son kare, kamera hareketi ve video için Seedance 2.5.", datePrefix: "Yeni Plan", cta: "Stüdyo Kartını İncele" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Sahneyi hayal et,", artisticTitle: "onu harekete geçir", description: "İlk çizgiden son kareye kadar her şey tek bir tuvalde gerçekleşir.", datePrefix: "Lansman dönemi", cta: "Stüdyoya gir" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Haftanın iyi filmleri,", artisticTitle: "görülmek için burada", description: "Topluluğun gerçek işleri, bu haftanın beğenisine göre sıralanır.", datePrefix: "Haftalık güncelleme", cta: "Sıralamayı gör" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "Üç ila beş plan,", artisticTitle: "hikâye konuşsun", description: "Tek bir anı 3–5 planda baştan son kareye kadar anlat.", datePrefix: "Başvuru dönemi", cta: "Meydan okumayı kabul et" },
        },
    },
    "vi-VN": {
        regionLabel: "Nội dung nổi bật", previousLabel: "Nội dung trước", nextLabel: "Nội dung tiếp theo", pickerLabel: "Chọn nội dung",
        showSlideLabel: (index) => `Hiển thị nội dung ${index}`,
        slides: ["BYOK Studio Pass", "Website DramaCanvas mới", "Tuyển chọn tuần của DramaCanvas", HOME_WAN_MESSAGES["vi-VN"].cta, "Thử thách nhà sáng tạo DramaCanvas"],
        campaigns: {
            wan: HOME_WAN_MESSAGES["vi-VN"],
            byokStudio: { eyebrow: "AI STORYBOARD · VIDEO CANVAS · BYOK", title: "BYOK Studio Pass,", artisticTitle: "mang model của bạn vào quay", description: "Nano Banana cho nhân vật nhất quán và storyboard. Seedance 2.5 cho khung đầu/cuối, chuyển động máy quay và video.", datePrefix: "Gói mới", cta: "Khám phá Studio Pass" },
            siteLaunch: { eyebrow: "NEW SITE · ONE CANVAS", title: "Hình dung cảnh quay,", artisticTitle: "đưa nó vào chuyển động", description: "Từ nét đầu tiên đến khung hình cuối, mọi thứ diễn ra trên cùng một canvas.", datePrefix: "Mùa ra mắt", cta: "Vào trường quay" },
            ranking: { eyebrow: "WEEKLY CHOICE · LIVE RANKING", title: "Phim hay trong tuần,", artisticTitle: "xứng đáng được nhìn thấy", description: "Tác phẩm thật từ cộng đồng, xếp hạng theo lượt yêu thích trong tuần.", datePrefix: "Cập nhật hằng tuần", cta: "Xem bảng xếp hạng" },
            creatorChallenge: { eyebrow: "CREATOR CHALLENGE · 03–05 SHOTS", title: "Ba đến năm cảnh,", artisticTitle: "để câu chuyện cất lời", description: "Kể trọn một khoảnh khắc trong 3–5 cảnh, từ mở đầu đến khung hình cuối.", datePrefix: "Nhận tác phẩm", cta: "Nhận thử thách" },
        },
    },
};
