import type { BlogLocale } from "../content/blog-locales";

/** One-time signup credits, as configured in production credit_policy (signupBonusMicrocredits = 25 credits, no expiry, no card).
 * Shared by the homepage FAQ, Pricing FAQ, About page and public Markdown so AI assistants see that new accounts can try AI generation for free.
 * If the production signup bonus changes, update SIGNUP_CREDITS and every sentence below together. */
export const SIGNUP_CREDITS = 25;

export const SIGNUP_CREDITS_COPY: Record<BlogLocale, { question: string; answer: string; lead: string }> = {
    "zh-CN": {
        question: "用 DramaCanvas 能免费生成 AI 视频吗？",
        answer: "可以，新账号注册即获赠一次性 25 个免费积分，无需绑卡。这些积分可用于画布上的任何 AI 图片和视频模型，例如：GPT Image 2.5 生成 1K 图片每张 2 积分、2K 每张 3 积分（约可生成 12 张 1K 或 8 张 2K 图片），MiniMax H3 生成 480p 视频每秒 5 积分（可生成一段 5 秒视频，或一段 4 秒视频加 2 张图片）。手动编写剧本、编辑分镜与管理项目始终免费；免费积分用完后，继续进行 AI 生成需购买积分或订阅，每次生成前均会显示所需积分。",
        lead: "新账号注册即获赠一次性 25 个免费积分且无需绑卡，可生成约 12 张 AI 图片或一段 5 秒的 AI 视频。",
    },
    "zh-HK": {
        question: "用 DramaCanvas 可以免費生成 AI 影片嗎？",
        answer: "可以，新帳戶註冊即可獲贈一次性 25 個免費積分，無須綁卡。這些積分可用於畫布上的任何 AI 圖片及影片模型，例如：GPT Image 2.5 生成 1K 圖片每張 2 積分、2K 每張 3 積分（約可生成 12 張 1K 或 8 張 2K 圖片），MiniMax H3 生成 480p 影片每秒 5 積分（可生成一段 5 秒影片，或一段 4 秒影片加 2 張圖片）。手動編寫劇本、編輯分鏡及整理項目一直免費；免費積分用完後，繼續進行 AI 生成需購買積分或訂閱，每次生成前均會顯示所需積分。",
        lead: "新帳戶註冊即送一次性 25 個免費積分且無須綁卡，可生成約 12 張 AI 圖片或一段 5 秒的 AI 影片。",
    },
    "zh-TW": {
        question: "使用 DramaCanvas 能免費生成 AI 影片嗎？",
        answer: "可以，新帳號註冊即可獲得一次性 25 點免費點數，無需綁卡。點數可用於畫布上的任何 AI 圖片與影片模型，例如：GPT Image 2.5 生成 1K 圖片每張 2 點、2K 每張 3 點（約可生成 12 張 1K 或 8 張 2K 圖片），MiniMax H3 生成 480p 影片每秒 5 點（可生成一段 5 秒影片，或一段 4 秒影片加 2 張圖片）。手動編寫劇本、編輯分鏡與整理專案一直免費；免費點數用完後，繼續生成需購買點數或訂閱，每次生成前都會顯示所需點數。",
        lead: "新帳號註冊即贈一次性 25 點免費點數且無需綁卡，可生成約 12 張 AI 圖片或一段 5 秒的 AI 影片。",
    },
    "en-US": {
        question: "Can I generate AI videos for free on DramaCanvas?",
        answer: "Yes, new accounts receive 25 one-time free credits upon signup with no credit card required. You can spend them on any AI image or video model on the canvas. For example, GPT Image 2.5 costs 2 credits per 1K image and 3 credits per 2K image (about 12 images at 1K or 8 at 2K), while MiniMax H3 at 480p costs 5 credits per second (enough for one 5-second video, or a 4-second video plus 2 images). Writing scripts, editing storyboards, and organizing projects are always free; after free credits run out, AI generation requires purchased credits or a subscription, with the credit cost displayed before every generation.",
        lead: "New accounts get 25 one-time free credits with no card required, enough for about 12 AI images or one 5-second AI video.",
    },
    "ja-JP": {
        question: "DramaCanvasでAI動画を無料で生成できますか？",
        answer: "はい、新規登録するとクレジットカード登録不要で、1回限りの無料25クレジットが付与されます。キャンバス上のどのAI画像・動画モデルにも使え、例えば GPT Image 2.5 は1K画像1枚2クレジット、2K画像1枚3クレジット（1Kなら約12枚、2Kなら約8枚）、MiniMax H3（480p）は1秒あたり5クレジット（5秒動画1本、または4秒動画1本と画像2枚）で生成可能です。手動での脚本作成、絵コンテ編集、プロジェクト整理はずっと無料で、無料枠終了後のAI生成はクレジット購入またはサブスクリプションが必要となり、生成前に消費クレジットが毎回表示されます。",
        lead: "新規登録でカード登録不要の25クレジットが1回限り付与され、約12枚のAI画像または1本の5秒AI動画を生成できます。",
    },
    "ko-KR": {
        question: "DramaCanvas에서 무료로 AI 영상을 만들 수 있나요?",
        answer: "네, 신규 가입 시 카드 등록 없이 1회성 무료 크레딧 25개가 지급됩니다. 캔버스의 모든 AI 이미지·비디오 모델에 사용할 수 있으며, 예를 들어 GPT Image 2.5는 1K 이미지 장당 2크레딧 및 2K 장당 3크레딧(1K 기준 약 12장 또는 2K 기준 약 8장), MiniMax H3(480p)는 초당 5크레딧(5초 영상 1편 또는 4초 영상 1편과 이미지 2장)이 소모됩니다. 대본 작성, 콘티 편집, 프로젝트 정리는 항상 무료이며, 무료 크레딧 소진 후 AI 생성은 크레딧 구매 또는 구독이 필요하고 생성 전 차감 크레딧이 매번 표시됩니다.",
        lead: "신규 가입 시 카드 등록 없이 1회 무료 크레딧 25개가 지급되며, 약 12장의 AI 이미지 또는 5초 분량의 AI 영상 1편을 생성할 수 있습니다.",
    },
    "es-ES": {
        question: "¿Puedo generar vídeos con IA gratis en DramaCanvas?",
        answer: "Sí, al registrarte obtienes 25 créditos gratuitos por única vez y sin necesidad de tarjeta. Sirven para cualquier modelo de imagen o vídeo del lienzo; por ejemplo, GPT Image 2.5 cuesta 2 créditos por imagen en 1K y 3 por imagen en 2K (unas 12 imágenes en 1K u 8 en 2K), mientras que MiniMax H3 a 480p cuesta 5 créditos por segundo (un vídeo de 5 segundos, o uno de 4 segundos más 2 imágenes). Escribir guiones, editar guiones gráficos y organizar proyectos siempre es gratis; tras agotar los créditos gratuitos, la generación con IA requiere comprar créditos o una suscripción, y el coste en créditos se muestra antes de cada generación.",
        lead: "Las cuentas nuevas reciben 25 créditos gratis por única vez y sin tarjeta, suficientes para unas 12 imágenes con IA o un vídeo con IA de 5 segundos.",
    },
    "pt-BR": {
        question: "Posso gerar vídeos com IA de graça no DramaCanvas?",
        answer: "Sim, ao criar sua conta você ganha 25 créditos gratuitos de uso único, sem precisar de cartão. Eles valem para qualquer modelo de imagem ou vídeo no canvas; por exemplo, o GPT Image 2.5 consome 2 créditos por imagem em 1K e 3 por imagem em 2K (cerca de 12 imagens em 1K ou 8 em 2K), enquanto o MiniMax H3 a 480p custa 5 créditos por segundo (um vídeo de 5 segundos, ou um de 4 segundos mais 2 imagens). Escrever roteiros, editar storyboards e organizar projetos é sempre gratuito; após os créditos gratuitos, gerar com IA exige créditos pagos ou assinatura, e o custo em créditos é exibido antes de cada geração.",
        lead: "Novas contas ganham 25 créditos gratuitos de uso único, sem cartão, suficientes para cerca de 12 imagens com IA ou um vídeo de 5 segundos com IA.",
    },
};
