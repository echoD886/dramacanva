import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Facts and prices from the live catalog and verified product limits.
export const seedance20Overrides: ModelPageOverrides = {
    "en-US": {
        intro: "Seedance 2.0 is ByteDance's video generation model for creating AI short dramas directly on your canvas. Choose between Seedance 2.0, Seedance 2.0 Fast, and Seedance 2.0 Mini to generate dialogue shots, character actions, and scene transitions in 480p, 720p, or 1080p. New accounts start with {signupCredits} credits, covering about {freeCount} s of video at {minCredits} credits per second to test your first shot free.",
        controls:
            "Pricing runs from {minCredits} credits to {maxCredits} credits per second of video depending on your chosen version and resolution. Seedance 2.0 offers 480p, 720p, and 1080p, while Fast and Mini offer 480p and 720p, with exact credits displayed on the card before you generate.",
        sceneText:
            "Use Seedance 2.0 to turn storyboard stills into moving dialogue shots, character reactions, and action sequences across your scene cards. It works well for building scene transitions with first and last frame pairs or generating full establishing shots from text prompts. You can test your initial takes at 480p, then regenerate your chosen take at 720p or 1080p for the timeline.",
        steps: [
            "Open the canvas and add a generation card, or paste your script to split it into storyboard cards. You will see your scene cards laid out side by side on the workspace.",
            "Click the model selector on the card, pick Seedance 2.0, Seedance 2.0 Fast, or Seedance 2.0 Mini, and select your resolution and clip length. The card displays the exact credits required before you run the shot.",
            "Type your prompt describing the action or camera movement, and attach reference images or a starting frame if your chosen setting accepts them. You can also ask the Agent chat on the right side of the canvas to set up the card for you.",
            "Click generate to produce the clip directly on the canvas alongside your other takes. Review the video clips side by side, keep the good ones, and drag them onto the timeline to assemble your short drama.",
        ],
        faq: [
            {
                question: "What is Seedance 2.0 and how does it work on DramaCanvas?",
                answer: "Seedance 2.0 is ByteDance's video generation model family, available on DramaCanvas across three versions: Seedance 2.0, Seedance 2.0 Fast, and Seedance 2.0 Mini. You can generate video clips directly on an infinite canvas from text prompts or by providing an image as the first frame. DramaCanvas is an independent platform that lets you plan storyboard cards, generate video clips, and arrange them on a timeline.",
            },
            {
                question: "Can I try Seedance 2.0 for free?",
                answer: "Yes, every new account receives {signupCredits} credits with no credit card required and no expiration date. This covers about {freeCount} s of video at the cheapest setting of {minCredits} credits per second, which is enough to test a 480p preview shot. Storyboard planning, script splitting, and canvas organization are completely free to use.",
            },
            {
                question: "How does Seedance 2.0 pricing and credit billing work?",
                answer: "Seedance 2.0 is billed per second of generated video, starting at {minCredits} credits per second for the lowest tier and resolution up to {maxCredits} credits per second for the highest tier. Higher resolutions cost more per second, and Seedance 2.0 offers 480p, 720p, and 1080p, while Fast and Mini offer 480p and 720p. The card shows the exact credits before you hit generate, and if a generation fails, the credits return to your balance automatically.",
            },
            {
                question: "How do I use Seedance 2.0 in a short drama workflow?",
                answer: "Start by writing or pasting your script on the canvas and splitting it into storyboard cards. Add a generation card, choose your Seedance 2.0 version, and write your prompt or upload an approved character still as the first frame. Run your initial shot at 480p to check the action, regenerate your chosen take at 720p or 1080p, and send the finished clip to the timeline.",
            },
            {
                question: "How should I write Seedance 2.0 prompts for AI video?",
                answer: "Write descriptive prompts in your preferred language focusing on character motion, camera perspective, and lighting. If you want tighter framing or continuity, attach a character reference image or pair a first and last frame on the card. Seedance 2.0 follows natural scene descriptions, and you can also ask the canvas Agent chat to help draft prompts and configure cards.",
            },
            {
                question: "Can I use my own API key or connect an external API with Seedance 2.0?",
                answer: "Yes, DramaCanvas supports BYOK so you can connect your own API key. When using your own API key, the API provider that issued your key bills you directly, and DramaCanvas deducts no generation credits, though a separate workspace service fee applies. External AI assistants can also drive the canvas through DramaCanvas MCP.",
            },
            {
                question: "Can I use videos made with Seedance 2.0 commercially?",
                answer: "Commercial usage depends on the licensing terms of the underlying model and the platform. For commercial projects, check ByteDance's terms and DramaCanvas terms before publishing. DramaCanvas operates as an independent creation platform and does not provide legal advice.",
            },
            {
                question: "How do I maintain character consistency across multiple Seedance 2.0 shots?",
                answer: "You can reuse an approved character reference image across your storyboard cards or use an existing still as the first frame of your next shot. You can also generate character portraits using image models like Nano Banana, GPT Image 2, or Midjourney V7 on the same canvas before generating video. While reference images improve consistency, every shot still requires a human check to ensure details match.",
            },
        ],
    },
    "zh-CN": {
        intro: "Seedance 2.0 是字节跳动旗下的视频生成模型，在 DramaCanvas 画布上可直接把剧本与分镜卡片转为动态镜头。新用户注册即可获得 {signupCredits} 积分，能在最低画质下试用约 {freeCount} 秒视频生成。支持文生视频、首尾帧过渡与参考图垫图，方便短剧创作者直观对比与调整镜头。",
        controls: "Seedance 2.0 提供 480p、720p 与 1080p 分辨率，Fast 与 Mini 提供 480p 与 720p，视频时长可在卡片内选择并按秒计费。最低分辨率下每秒消耗 {minCredits} 积分，最高档位每秒消耗 {maxCredits} 积分，生成前卡片会直接显示具体扣除积分。",
        sceneText:
            "在短剧创作中，Seedance 2.0 适合把分镜静态图转为角色的对白、情绪反应与走位动作镜头，也能用于生成场景空镜头。借助首尾帧配对可以制作运镜转场，配合角色参考图垫图则有助于维持人物特征。生成的各个片段可以直接放入时间轴拼接剪辑，但每个镜头仍需人工审核把关。",
        steps: [
            "在 DramaCanvas 打开画布，可直接粘贴文本剧本切分为多张分镜卡片，或点击添加卡片按钮新建生成卡片。",
            "在卡片的模型选择器中选定 Seedance 2.0 与具体版本，用常用语言输入动作提示词，并按需上传角色参考图或首尾帧。",
            "在卡片面板中切换分辨率与时长设置，确认卡片上标明的具体积分后，点击生成按钮开始渲染视频。",
            "生成的视频会直接呈现在画布卡片旁方便对比挑选，满意的片段可拖入时间轴剪辑成剧，也能将画面作为后续视频的首帧。",
        ],
        faq: [
            {
                question: "Seedance 2.0 是什么模型？与即梦有何区别？",
                answer: "Seedance 2.0 是字节跳动旗下的视频生成模型，与即梦（Dreamina）源自同一技术家族，但 DramaCanvas 是独立创作平台，并非字节跳动官方或其官方合作伙伴。在 DramaCanvas 画布上，剧本、分镜排版、参考图管理和视频生成都在同一工作区完成，无需在不同工具间来回切换。平台界面支持简体中文、繁体中文、英语、韩语、日语等多国语言。",
            },
            {
                question: "Seedance 2.0 怎么用？新手制作短剧有简易教程吗？",
                answer: "在 DramaCanvas 上使用 Seedance 2.0 非常简单：新建画布后，你可以把剧本粘贴进去切分成多张分镜卡片，然后添加生成卡片并选中 Seedance 2.0。输入描述镜头运动与角色动作的提示词，按需上传首帧图片或参考素材，看清卡片上的扣除积分后点击生成即可。画布右侧还设有 Agent 对话助手，你可以直接通过交谈让它帮你新建卡片并跑通生成流程。",
            },
            {
                question: "Seedance 2.0 可以免费试用吗？",
                answer: "新用户注册即可获得 {signupCredits} 积分，无需绑定信用卡，且赠送积分永久有效。这些积分可以在最低画质设置下试用生成约 {freeCount} 秒视频，供你熟悉生成效果与画面动态。画布上的剧本撰写与分镜排版完全免费，后续如果需要生成更多镜头，可前往价格页面选购积分包或会员计划。",
            },
            {
                question: "Seedance 2.0 价格如何计算？每秒扣除多少积分？",
                answer: "Seedance 2.0 按照视频生成秒数扣费，分辨率越高每秒扣除的积分越多，各版本定价也有所不同。最低分辨率档位每秒消耗 {minCredits} 积分，而最高档位每秒消耗 {maxCredits} 积分。点击生成之前，卡片会直接显示本次任务的具体扣除积分，如果任务生成失败，系统会自动退还扣除的积分。",
            },
            {
                question: "Seedance 2.0 提示词怎么写？必须写英文吗？",
                answer: "你可以直接使用简体中文输入提示词，无需翻译成英文。书写时建议明确交代景别（如中景、特写）、主体动作、情绪反应以及摄影机运镜方式，尽量避免主观空泛的修饰词。如果制作短剧对白镜头，建议在画布上配合第一帧角色图或参考图进行垫图生成，能更准确地控制人物初始站位与画面构图。",
            },
            {
                question: "Seedance 2.0、Fast 和 Mini 版本该如何选择？",
                answer: "标准版 Seedance 2.0 支持 480p、720p 和 1080p 输出，适合用于成片镜头渲染。Seedance 2.0 Fast 与 Mini 版本支持 480p 和 720p，单秒消耗积分较少，适合前期在 480p 下验证镜头动态与走位。建议先在 480p 下跑出满意的动态轨迹，再挑选满意版本提升分辨率重新生成。",
            },
            {
                question: "制作连续短剧时，如何保证角色形象与风格一致？",
                answer: "在支持垫图的版本中，上传固定的人物设定图作为参考图，可以帮助模型稳定角色的发型、服装与长相特征。但生成式模型目前无法做到百分之百的绝对一致，生成的每一个镜头依然需要创作者人工筛选把关。你也可以在同一画布上先用 Nano Banana、Midjourney V7 或 GPT Image 2 生成高质量的角色首帧，再接入 Seedance 2.0 生成连续动作。",
            },
            {
                question: "支持自带 API Key（BYOK）接入吗？如何收费？",
                answer: "支持接入自己的 API Key（BYOK）。接入后由发放该密钥的接口服务商直接向你计费，DramaCanvas 不会扣除模型生成积分，仅收取独立的画布空间服务费。创作者还可以通过 DramaCanvas MCP 工具，让外部 AI 助手协助驱动画布工作流。",
            },
            {
                question: "生成的内容可以商用吗？生成的短剧版权归谁？",
                answer: "商用使用前请务必确认字节跳动条款和 DramaCanvas 条款。DramaCanvas 是独立平台，不提供法律咨询或商用担保，创作者需自行确认所用素材与生成内容符合各方合规要求。画布内的剧本构思与分镜排版功能完全免费，满意生成的视频片段可自由导出至剪辑软件成片。",
            },
        ],
    },
    "zh-TW": {
        intro: "Seedance 2.0 是字節跳動旗下的影片生成模型，與即夢為同系列技術，現已整合於 DramaCanvas 短劇畫布。創作者可直接透過文字生成影片，或以角色靜態圖作為首影格產生分鏡畫面，最低每秒 {minCredits} 點數。註冊新帳號即贈 {signupCredits} 點數，不需綁卡即可在畫布上直接測試。",
        controls: "各版本依秒數計費，Seedance 2.0 支援 480p、720p 與 1080p，Fast 與 Mini 則提供 480p 與 720p，最低每秒 {minCredits} 點數至最高每秒 {maxCredits} 點數。生成卡片會在送出前顯示確切扣除點數，片段長度與參考輸入亦可在卡片上自行選定。",
        sceneText: "在 AI 短劇製作中，Seedance 2.0 適合用來將分鏡劇照轉為對話與反應鏡頭，也能設定首尾影格來完成角色走位或場景轉場。不管是生成環境空鏡頭還是角色的動態肢體動作，都能直接在畫布上銜接前置分鏡，並將成果直接送入時間軸剪輯。",
        steps: [
            "登入 DramaCanvas 開啟畫布，您可以貼上劇本拆分成多張分鏡卡，或直接在畫布上點擊新增生成卡片。",
            "在卡片上的模型選擇器選取 Seedance 2.0、Fast 或 Mini，接著輸入提示詞，並可依版本上傳角色圖或首影格作為參考。",
            "依需求選定解析度與片段長度，卡片會顯示所需的確切點數，確認後點擊生成按鈕。",
            "生成結果會並排呈現在畫布上方便比對挑選，合適的影片鏡頭能直接加入時間軸進行短劇剪輯。",
        ],
        faq: [
            {
                question: "Seedance 2.0 是什麼？與字節跳動及即夢有什麼關係？",
                answer: "Seedance 2.0 是字節跳動（ByteDance）開發的 AI 影片生成模型，與即夢（Dreamina）採用相同的底層模型家族。DramaCanvas 為獨立第三方創作平台，並非字節跳動官方網站或附屬應用程式。我們將 Seedance 2.0 整合進短劇畫布中，方便創作者在同一介面上完成分鏡排版與連續鏡頭生成。",
            },
            {
                question: "可以在 DramaCanvas 上免費試用 Seedance 2.0 嗎？費用如何計算？",
                answer: "新用戶註冊即可領取 {signupCredits} 點數，不需綁定信用卡，無使用期限。在 480p 最低畫質設定下（每秒 {minCredits} 點數），贈送的點數約可生成 {freeCount} 秒影片進行初步效果測試；若切換至較高解析度或不同版本，每秒消耗點數會提高。卡片在生成前均會標註確切點數，若生成失敗則會自動退還點數。",
            },
            {
                question: "Seedance 2.0 有獨立的 App 嗎？在 DramaCanvas 上如何操作？",
                answer: "DramaCanvas 提供網頁版專案畫布，免下載安裝 App，在瀏覽器登入即可使用。畫布右側設有 Agent 對話助手，您可以直接透過對話請 AI 協助建立分鏡卡或觸發影片生成。整套流程涵蓋從貼上劇本、圖片首影格生成，到把短劇片段拖入時間軸剪輯，都在同一個畫布工作區完成。",
            },
            {
                question: "使用 Seedance 2.0 生成短劇時，提示詞可以用中文輸入嗎？",
                answer: "可以，DramaCanvas 的操作介面支援繁體中文等多國語言，生成卡片也支援直接使用繁體中文撰寫提示詞。描述時建議著重於主體動作、鏡頭運鏡（例如推鏡或特寫）與場景光影細節。若選用支援參考圖的版本，搭配角色設定圖作為首影格，能讓分鏡動作更符合劇本要求。",
            },
            {
                question: "DramaCanvas 上的 Seedance 2.0、Fast 與 Mini 版本有何差異？該如何選擇？",
                answer: "Seedance 2.0 提供 480p、720p 與 1080p 解析度，適合產出短劇主鏡頭或高解析畫面；Fast 與 Mini 版本則提供 480p 與 720p，各版本的每秒收費費率不同。實務上建議先使用 480p 進行動態測試與分鏡確認，挑出滿意的構圖與動作後，再以高解析度重新生成最終鏡頭。最高規格設定每秒費用為 {maxCredits} 點數，送出前卡片均會顯示確切點數。",
            },
            {
                question: "什麼是自備金鑰（BYOK）？在 DramaCanvas 上使用自己的 API 金鑰如何計費？",
                answer: "DramaCanvas 支援自備金鑰（BYOK），您可以串接自己申請的 API 金鑰來驅動 Seedance 2.0。在此模式下，由發行該金鑰的 API 提供商直接向您收取生成費用，DramaCanvas 不會扣除任何生成點數，僅酌收平台工作區服務費。此設定非常適合已有 API 額度且需產出大量短劇鏡頭的團隊。",
            },
            {
                question: "Seedance 2.0 生成的短劇影片可以商用嗎？畫布上還能搭配其他模型嗎？",
                answer: "關於商業使用授權，請務必查閱字節跳動的服務條款以及 DramaCanvas 平台使用規範。在同一個畫布專案中，您還可以混搭 Midjourney V7 或 Nano Banana 生成靜態角色首影格，再交由 Seedance 2.0、Kling 3.0 或 Wan 3.0 等模型生成連續動態影片。您也能透過 DramaCanvas MCP 讓外部 AI 助手直接調度畫布工具進行自動化創作。",
            },
        ],
    },
    "zh-HK": {
        intro: "DramaCanvas 讓創作者在同一畫布上運用 ByteDance 旗下的 Seedance 2.0 生成短劇影片，支援文字生影片與首尾格圖像引導。新註冊帳戶即可獲贈 {signupCredits} 點數免費試用，在最低規格下可生成約 {freeCount} 秒影片，立即體驗 AI 短劇創作流程。",
        controls: "生成卡可自選影片長度，Seedance 2.0 提供 480p、720p 及 1080p，Fast 與 Mini 則提供 480p 及 720p。費用按秒數收費，最低規格每秒為 {minCredits} 點數，最高版本每秒為 {maxCredits} 點數，生成前卡片會明確顯示確切點數。",
        sceneText: "在製作 AI 短劇時，Seedance 2.0 適合用來將人物靜態圖轉化為動態畫面，呈現對話反應鏡頭與角色動作場面。創作者亦可利用首尾格功能生成轉場與場景空鏡，並透過固定的角色參考圖維持外貌特徵，但每個鏡頭生成後仍需人工審核確認。",
        steps: [
            "註冊或登入後開啟畫布，直接貼上短劇劇本並拆分為分鏡卡，或使用右側的 Agent 對話框以文字指令建立卡片。",
            "在畫布新增生成卡，於模型選單選取 Seedance 2.0、Fast 或 Mini，並按畫面需要設定解像度與長度。",
            "以常用語言輸入動作提示詞，並依版本支援上傳首格圖像或參考圖，卡片會即時顯示設定與所需扣除的確切點數。",
            "點擊生成後，多個片段會在畫布並列呈現以便比對效果，挑選滿意的鏡頭加入時間軸剪輯短劇。",
        ],
        faq: [
            {
                question: "什麼是 Seedance 2.0？它與即夢（Dreamina）有什麼關係？",
                answer: "Seedance 2.0 是 ByteDance 開發的影片生成模型，與 ByteDance 旗下的即夢（Dreamina）應用程式屬於同一模型家族。DramaCanvas 是一個獨立運作的 AI 短劇創作畫布，並非 ByteDance 官方產品或附屬合作夥伴。平台整合了 Seedance 2.0、Fast 及 Mini 三個版本，方便創作者在同一工作區內完成由劇本到影片生成的整個流程。",
            },
            {
                question: "Seedance 2.0 在 DramaCanvas 上可以免費試用嗎？",
                answer: "新用戶註冊即可獲贈一次性的 {signupCredits} 點數，無需綁定信用卡，亦無使用期限。這筆註冊點數在最低解像度規格下，約可生成 {freeCount} 秒影片作為初步測試。在畫布上編寫劇本與排列分鏡完全免費，只有在生成卡執行生成時才會扣除點數。",
            },
            {
                question: "Seedance 2.0 的收費方式與點數如何扣除？",
                answer: "Seedance 2.0 按生成影片的秒數收費，解像度越高每秒收費相應增加，各版本之間亦有不同定價。在最低解像度下，每秒收費介乎 {minCredits} 點數至 {maxCredits} 點數，卡片在點擊生成前會明確顯示扣除的確切點數。若生成失敗，系統會全數退回點數；若需要更多額度，可於定價頁面選購會員方案或點數包。",
            },
            {
                question: "初學者有哪些實用的 Seedance 2.0 教學與工作流程建議？",
                answer: "製作短劇時，建議先在畫布上使用圖像模型生成角色靜態圖，再以該圖作為 Seedance 2.0 的首格進行引導。測試提示詞時，先選擇 480p 解像度生成初稿，確認動作符合劇本要求後，再以較高解像度重新生成正式鏡頭。你亦可善用畫布右側的 Agent 對話功能，透過日常對話自動建立卡片與分鏡。",
            },
            {
                question: "Seedance 2.0、Fast 與 Mini 版本之間有何差別？該如何選擇？",
                answer: "標準版 Seedance 2.0 支援 480p、720p 及 1080p 解像度，適合輸出短劇中的關鍵特寫與高清鏡頭。Fast 與 Mini 版本則提供 480p 及 720p，點數成本較低，適合用於初期快速分鏡與動態測試。各版本支援的參考輸入略有不同，部分版本支援參考影片或音訊，生成卡會根據所選版本直接顯示可用的輸入欄位。",
            },
            {
                question: "可以在 DramaCanvas 上自備 API 金鑰（BYOK）使用 Seedance 2.0 嗎？",
                answer: "可以，平台支援創作者連結自備 API 金鑰（BYOK）。使用自備金鑰時，DramaCanvas 不會扣除生成點數，費用由向你發行該金鑰的 API 供應商直接向你收取。請留意，在此模式下平台仍會另外收取獨立的工作區服務費。",
            },
            {
                question: "製作短劇連續鏡頭時，如何利用 Seedance 2.0 保持角色外貌一致？",
                answer: "在生成卡上持續上傳已核准的角色參考圖，或以同一角色靜態圖作為影片首格，能有效協助模型維持人物特徵。不過現階段任何影片生成模型皆無法承諾百分之百一致，每個鏡頭生成後仍必須由人工檢查與挑選。在畫布上比對多個鏡頭，挑選合適的片段再放入時間軸，是目前最穩妥的製作流程。",
            },
            {
                question: "使用 Seedance 2.0 生成的短劇片段可以用於商業發布嗎？",
                answer: "商業使用權利須遵守底層模型的授權規定以及平台的服務協議，具體細節請查閱 ByteDance 的條款及 DramaCanvas 條款。若是承接商業短劇委託或在串流平台獲利，建議在製作前先確認相關條款的最新說明。",
            },
        ],
    },
    "ja-JP": {
        intro: "Seedance 2.0はByteDanceの動画生成AIモデルで、DramaCanvasなら絵コンテから直接映像化できます。アカウント登録時の{signupCredits}クレジットにより、最安設定で約{freeCount}秒の動画生成を無料で試せます。",
        controls:
            "料金は動画1秒あたりの課金で、最安設定の1秒あたり{minCredits}クレジットから解像度やバージョンに応じて1秒あたり{maxCredits}クレジットとなり、生成前にカード上で消費クレジット数が表示されます。まずは480pでテスト生成し、採用したカットのみ高解像度で再生成するとクレジットを効率的に使えます。",
        sceneText:
            "AIショートドラマ制作において、絵コンテの静止画から登場人物を動かす対話やリアクションのカット、動きを伴うアクションシーンの映像化に適しています。状況設定カットの作成や、開始フレームと終了フレームを指定した場面転換の生成にも活用できます。キャンバス上で作成した画像をそのまま動画の最初のフレームに指定できるため、カットごとの視覚的なつながりを維持しながら制作を進められます。",
        steps: [
            "ログインしてキャンバスを開き、生成カードを追加してモデル選択欄でSeedance 2.0、Fast、またはMiniを選択します。",
            "プロンプトを入力し、必要に応じて最初のフレーム画像や対応バージョンに応じた参照ファイルをカードに指定します。",
            "カード上で解像度と動画の長さを選び、表示された消費クレジット数を確認して生成を実行します。",
            "キャンバス上に並んで表示された映像を比較して採用カットを選び、タイムラインに並べてショートドラマを編集します。",
        ],
        faq: [
            {
                question: "Seedanceとはどのような動画生成AIですか？どこの企業が開発していますか？",
                answer: "Seedance 2.0はByteDanceが開発した動画生成AIモデルです。ByteDanceのDreamina（即夢）アプリと同じモデル系統に属しています。DramaCanvasは独立した制作プラットフォームであり、公式パートナーではありませんが、キャンバス上でSeedance 2.0、Seedance 2.0 Fast、Seedance 2.0 Miniを直接利用できます。",
            },
            {
                question: "Seedance 2.0は無料で試せますか？料金の仕組みはどうなっていますか？",
                answer: "アカウント登録時に付与される{signupCredits}クレジットを使い、最安設定で約{freeCount}秒のテスト生成を無料でお試しいただけます。料金は動画1秒あたりの課金で、最安設定の1秒あたり{minCredits}クレジットから解像度やバージョンに応じて1秒あたり{maxCredits}クレジットまで設定されています。生成前にカード上で必要なクレジット数が表示され、失敗した生成のクレジットは返還されます。",
            },
            {
                question: "DramaCanvasでのSeedance 2.0の使い方を教えてください。",
                answer: "キャンバスを開いて生成カードを追加し、モデル選択でSeedance 2.0を指定してプロンプトを入力します。テキストからの生成に加えて、画像を最初のフレームに指定したり、対応バージョンで参照ファイルを添付したりして生成できます。結果はキャンバス上に並んで表示されるため、仕上がりを比較しながら採用カットをタイムラインに配置して編集できます。",
            },
            {
                question: "Seedance 2.0、Fast、Miniの各バージョンの違いは何ですか？",
                answer: "DramaCanvasでは「Seedance 2.0」「Seedance 2.0 Fast」「Seedance 2.0 Mini」を選択できます。Seedance 2.0は480p、720p、1080pの解像度に対応し、FastとMiniは480pと720pに対応しています。バージョンによって利用できる参照入力の種類や1秒あたりの料金が異なるため、カード上の表示を確認して用途に合わせて使い分けてください。",
            },
            {
                question: "Seedance 2.5や過去バージョン（1.0、1.5 Pro）は使えますか？",
                answer: "DramaCanvasではSeedance 2.0シリーズだけでなく、同じキャンバス上でSeedance 2.5も選択して利用できます。なお、旧バージョンであるSeedance 1.0や1.5 Proはプラットフォーム上では提供されていません。各モデルの利用可能な設定やクレジット料金は、生成カードおよび料金ページで確認できます。",
            },
            {
                question: "自分のAPIキーを使う連携（BYOK）や外部ツールからの操作はできますか？",
                answer: "はい、ご自身のAPIキーを接続するBYOKに対応しています。BYOK利用時はAPIキーを発行したAPIプロバイダーから直接請求が行われ、DramaCanvasの生成クレジットは消費されません（別途ワークスペースのサービス料がかかります）。また、DramaCanvas MCPを経由してAIアシスタントからキャンバスを操作することも可能です。",
            },
            {
                question: "Seedance 2.0をローカルPC環境やComfyUIで動かすことはできますか？",
                answer: "DramaCanvasはブラウザ上で完結するクラウドサービスのため、ローカル環境の構築やComfyUIのセットアップ、モデルのダウンロードは不要です。高スペックなGPU環境を用意しなくても、Web上で絵コンテ作りから動画生成、タイムライン編集まで行えます。さらに、画面右側のAgentチャットを使って対話形式で生成カードを作成し、生成を実行することもできます。",
            },
            {
                question: "ショートドラマ制作でキャラクターの見た目を揃えることはできますか？",
                answer: "承認済みのキャラクター参照画像をカードに添付することで、カット間でのキャラクターのブレを抑えやすくなります。ただし、どのような設定であっても各カットの仕上がりには目視での確認が必要です。キャンバス上ではNano BananaやMidjourney V7などで生成した静止画をそのまま動画の最初のフレームとして活用できるため、効率的にトーンを統一できます。",
            },
            {
                question: "Seedance 2.0で生成した動画は商用利用できますか？",
                answer: "商用利用の可否や詳細な条件については、ByteDanceの利用規約およびDramaCanvasの利用規約をご確認ください。DramaCanvasは独立したプラットフォームであり、個別の法的な保証や判断は提供していません。制作するコンテンツの公開範囲や用途に合わせて、最新の利用条件を確認した上でご利用ください。",
            },
        ],
    },
    "ko-KR": {
        intro: "시댄스 2.0(Seedance 2.0)은 스토리보드 이미지를 영상 컷으로 구현하는 바이트댄스의 비디오 생성 모델입니다. 신규 가입 시 제공되는 {signupCredits} 크레딧으로 최저 설정 기준 약 {freeCount}초 동안 무료 테스트가 가능합니다.",
        controls:
            "영상 초당 최저 {minCredits} 크레딧부터 최고 {maxCredits} 크레딧까지 버전과 해상도에 따라 차등 차감되며, 클립 길이와 설정에 따른 정확한 크레딧은 생성 전 카드에 표시됩니다. 기본 2.0은 480p·720p·1080p를, Fast와 Mini 버전은 480p·720p를 지원합니다.",
        sceneText:
            "숏폼 드라마 제작 시 스토리보드 속 캐릭터 스틸컷을 대화 및 리액션 장면으로 전환하거나 인물의 움직임과 액션 컷을 만들 때 적합합니다. 첫 프레임과 끝 프레임 쌍을 지정해 장면 전환(트랜지션)을 구현하거나 극의 배경을 보여주는 설정 샷(establishing shot)을 제작하는 데 유용합니다.",
        steps: [
            "캔버스에 접속해 대본을 입력하고 스토리보드 카드로 나눈 뒤, 화면에서 생성 카드를 추가합니다.",
            "생성 카드의 모델 선택창에서 Seedance 2.0(또는 Fast, Mini) 버전을 선택하고 원하는 해상도와 클립 길이를 설정합니다.",
            "프롬프트를 한국어로 입력하고 지원 버전에 따라 레퍼런스 이미지를 첨부하면 카드 하단에 필요한 크레딧이 표시됩니다.",
            "생성 버튼을 누르면 결과 영상이 캔버스에 나란히 배치되며, 마음에 드는 컷을 타임라인으로 끌어와 숏폼 드라마로 편집합니다.",
        ],
        faq: [
            {
                question: "시댄스 2.0(Seedance 2.0)은 어떤 AI 모델이며 공식 홈페이지가 따로 있나요?",
                answer: "시댄스 2.0(Seedance 2.0)은 바이트댄스(ByteDance)의 비디오 생성 AI 모델로, 글로벌 앱 Dreamina(즉몽) 등과 동일한 모델 계열에 속합니다. DramaCanvas는 독립적인 숏폼 제작 플랫폼이며 바이트댄스의 공식 파트너나 개발사는 아니지만, 캔버스 내에서 시댄스 모델을 바로 불러와 작업할 수 있습니다. 별도의 해외 계정 없이 웹 브라우저에서 대본 및 스토리보드와 연계해 간편하게 활용할 수 있습니다.",
            },
            {
                question: "시댄스 2.0 무료(Seedance 2.0 free) 체험이 가능한가요?",
                answer: "신규 가입 시 제공되는 {signupCredits} 크레딧을 통해 최저 화질 설정 기준 약 {freeCount}초 동안 무료로 테스트 생성을 진행할 수 있습니다. 캔버스에서 대본을 작성하고 스토리보드를 배치하는 작업은 무료이며, 실제 비디오를 생성할 때만 크레딧이 소모됩니다. 처음에는 480p 해상도로 테스트 컷을 먼저 뽑아본 뒤, 결과가 만족스러울 때 고해상도로 다시 생성하는 방식을 권장합니다.",
            },
            {
                question: "시댄스 2.0 가격과 크레딧 차감 기준은 어떻게 되나요?",
                answer: "시댄스 모델은 생성하는 비디오의 초 단위 길이에 따라 요금이 청구되며, 최저 해상도 기준 초당 {minCredits} 크레딧부터 최고 {maxCredits} 크레딧까지 버전에 따라 차등 적용됩니다. 해상도가 높을수록 초당 소모 크레딧이 늘어나며, 카드에서 설정을 마치는 즉시 차감될 정확한 크레딧이 표시됩니다. 생성이 실패할 경우 사용된 크레딧은 계정으로 즉시 환급됩니다.",
            },
            {
                question: "Seedance 2.0, Fast, Mini 버전 중 어떤 것을 선택해야 하나요?",
                answer: "제작하려는 장면의 목적과 작업 상황에 맞춰 버전을 선택할 수 있습니다. Seedance 2.0은 480p, 720p, 1080p 해상도를 모두 지원하여 최종 컷이나 고화질 장면 제작에 적합합니다. Fast와 Mini 버전은 480p와 720p 해상도를 제공하며 버전별 가격 책정이 다르므로 초안 확인이나 빠른 콘티 검토에 알맞습니다.",
            },
            {
                question: "시댄스 2.0 사용법과 입력 방식(프롬프트, 이미지)은 어떻게 되나요?",
                answer: "텍스트 프롬프트를 한국어로 직접 입력해 비디오를 생성하거나, 기존 이미지를 첫 프레임 또는 첫 프레임과 마지막 프레임 쌍으로 지정해 시작할 수 있습니다. 지원하는 버전에 따라 레퍼런스 이미지나 비디오, 오디오를 첨부할 수 있으며, 현재 설정에서 지원되는 입력 항목은 카드에 직접 표시됩니다. 캔버스 우측의 에이전트 채팅을 통해서도 대화 형식으로 카드를 생성하고 프롬프트를 실행할 수 있습니다.",
            },
            {
                question: "숏폼 드라마 제작 시 인물의 캐릭터 일관성을 어떻게 유지하나요?",
                answer: "승인된 캐릭터 레퍼런스 이미지를 재사용하거나 동일한 캔버스에서 생성한 이미지를 첫 프레임으로 활용하면 일관성 유지에 도움이 됩니다. 다만 AI 모델 특성상 모든 컷은 여전히 사람의 확인이 필요합니다. 캔버스 위에 여러 생성 결과를 나란히 두고 비교한 뒤 알맞은 컷을 선택해 타임라인으로 넘기는 방식을 추천합니다.",
            },
            {
                question: "개인 API 키(BYOK)를 연결해 사용할 수 있나요?",
                answer: "자체 API 키 연결(BYOK) 기능을 통해 이용자가 보유한 키를 연동하여 생성할 수 있습니다. 이 경우 키를 발급한 API 제공업체에서 직접 비용을 청구하며, DramaCanvas에서는 생성 크레딧을 차감하지 않고 별도의 워크스페이스 서비스 이용료만 부과됩니다. 또한 DramaCanvas MCP를 지원하므로 외부 AI 어시스턴트를 통해 캔버스 작업을 제어할 수도 있습니다.",
            },
            {
                question: "시댄스 2.0으로 제작한 숏폼 드라마 영상을 상업적으로 이용할 수 있나요?",
                answer: "상업적 이용 가능 여부는 ByteDance의 이용약관과 DramaCanvas의 서비스 이용약관을 함께 확인해야 합니다. 상업 프로젝트에 영상을 활용하기 전 양측 약관의 라이선스 규정을 검토하시기 바랍니다. 멤버십 플랜과 크레딧 팩에 관한 상세 안내는 가격 페이지에서 확인할 수 있습니다.",
            },
        ],
    },
    "es-ES": {
        intro: "Crea planos para tus historias con Seedance 2.0, el modelo de video de Seedance IA disponible en DramaCanvas. Si buscas probar Seedance 2.0 free, tu cuenta nueva incluye {signupCredits} créditos de bienvenida para generar aproximadamente {freeCount} s de video en la opción más económica y comparar tomas en el lienzo.",
        controls:
            "La tarjeta muestra los créditos exactos antes de generar y factura por segundo de video, desde {minCredits} créditos por segundo en la resolución más baja hasta {maxCredits} créditos por segundo en los ajustes más altos. Seedance 2.0 permite generar en 480p, 720p y 1080p, mientras que las versiones Fast y Mini admiten 480p y 720p.",
        sceneText:
            "En una producción de drama corto, Seedance 2.0 sirve para transformar fotogramas de personajes en planos de diálogo y tomas de reacción con movimiento continuo. También permite generar planos de establecimiento, escenas de acción o resolver transiciones conectando un fotograma inicial con uno final. Al ver las tomas lado a lado en el lienzo, puedes seleccionar la versión adecuada y enviarla a la línea de tiempo del montaje.",
        steps: [
            "Abre el lienzo y añade una tarjeta de generación, o pega tu guion para dividirlo directamente en tarjetas de guion gráfico.",
            "En el selector de modelos, elige Seedance 2.0 (o sus variantes Fast y Mini) y define la resolución deseada junto con la duración del clip.",
            "Escribe tu indicación en tu propio idioma y adjunta una imagen de referencia si necesitas fijar el primer fotograma; la tarjeta mostrará los créditos exactos antes de pulsar Generar.",
            "Revisa los resultados generados en paralelo sobre el lienzo, conserva las tomas aprobadas y arrástralas a la línea de tiempo para editar tu drama corto.",
        ],
        faq: [
            {
                question: "¿Qué es Seedance 2.0 y cómo funciona en DramaCanvas?",
                answer: "Seedance 2.0 es la familia de modelos de generación de video desarrollada por ByteDance, empleada también en su aplicación Dreamina (即梦). En DramaCanvas dispones de este modelo de forma independiente para generar tomas de video directamente sobre un lienzo de producción visual. Puedes crear clips a partir de texto o utilizar una imagen de referencia como primer fotograma para dar continuidad a tus escenas.",
            },
            {
                question: "¿Es posible probar Seedance 2.0 free en la plataforma?",
                answer: "Sí, cada cuenta nueva recibe {signupCredits} créditos de bienvenida sin necesidad de ingresar tarjeta bancaria ni fecha de vencimiento. Estos créditos iniciales permiten realizar una prueba corta de aproximadamente {freeCount} s de video con la versión más económica y a resolución 480p. Para producciones más extensas o resoluciones superiores, puedes adquirir paquetes de créditos o planes de membresía en la página de precios.",
            },
            {
                question: "¿Cómo se utiliza Seedance IA para producir un drama corto?",
                answer: "El flujo de trabajo comienza en el lienzo, donde puedes pegar tu guion y desglosarlo en tarjetas de guion gráfico. Luego agregas una tarjeta de generación, seleccionas Seedance 2.0 y redactas la indicación de la escena adjuntando la imagen del personaje si quieres mantener su apariencia. Las tomas generadas aparecen juntas en el lienzo para comparar opciones, y los mejores clips se envían a la línea de tiempo para estructurar el episodio.",
            },
            {
                question: "¿Cuánto cuesta generar video con Seedance 2.0 y cómo se cobran los créditos?",
                answer: "La generación se factura por segundo de video según la versión y la resolución seleccionadas, desde {minCredits} créditos por segundo en la tarifa base hasta {maxCredits} créditos por segundo en la opción más alta. La tarjeta de generación siempre muestra la configuración y la cantidad exacta de créditos antes de que confirmes la creación del clip. Además, planificar y organizar el guion gráfico en el lienzo es completamente gratuito, y si una generación llega a fallar, el sistema te reembolsa los créditos consumidos.",
            },
            {
                question: "¿Qué diferencias existen entre Seedance 2.0, Fast y Mini y cuál conviene elegir?",
                answer: "Seedance 2.0 admite resoluciones de 480p, 720p y 1080p, mientras que Seedance 2.0 Fast y Seedance 2.0 Mini ofrecen salidas en 480p y 720p. Cada versión tiene un costo en créditos diferenciado por segundo. Para trabajar con rapidez en la fase de montaje de escenas suele ser conveniente probar la toma inicial en 480p, y luego volver a generar la toma seleccionada a mayor resolución.",
            },
            {
                question: "¿Cómo se escriben las indicaciones y qué entradas de referencia acepta el modelo?",
                answer: "Puedes escribir la indicación en tu propio idioma describiendo las acciones, el entorno y los movimientos de cámara deseados. Dependiendo de la versión configurada, la tarjeta indica si admite imágenes de referencia, pares de fotograma inicial y final, o referencias de video y audio. Vincular una imagen de personaje aprobada ayuda a conservar rasgos visuales, aunque cada toma siempre requiere una revisión humana para comprobar la continuidad.",
            },
            {
                question: "¿Puedo usar mi propia clave de API (BYOK) o conectar asistentes mediante MCP?",
                answer: "Sí, mediante la modalidad BYOK (conectar tu propia clave de API), el proveedor de la API que emitió tu clave te cobra directamente su consumo y DramaCanvas no descuenta créditos de generación, aplicando únicamente una tarifa de servicio de espacio de trabajo. También puedes automatizar acciones o gestionar el lienzo desde asistentes de inteligencia artificial mediante el protocolo MCP de DramaCanvas. Además, dispones del chat con el Agente integrado a la derecha del lienzo para crear tarjetas y lanzar generaciones durante la conversación.",
            },
            {
                question: "¿Se pueden utilizar los videos comercialmente y qué otros modelos ofrece el lienzo?",
                answer: "Para cualquier uso comercial de tus creaciones, debes consultar los términos de ByteDance y los términos de DramaCanvas. En el mismo lienzo puedes combinar Seedance con otros modelos de video como Seedance 2.5, Kling 3.0, Veo 3.1, MiniMax H3 o Wan 3.0. Asimismo, es posible generar fotogramas iniciales con herramientas de imagen como Midjourney V7, Nano Banana o GPT Image 2 sin salir del proyecto.",
            },
        ],
    },
    "pt-BR": {
        intro: "O Seedance 2.0 é o modelo de geração de vídeo da ByteDance integrado diretamente ao DramaCanvas para criar cenas de minisséries e filmes com IA. Você pode estruturar o roteiro no storyboard, gerar clipes a partir de texto ou imagem inicial e organizar tudo na mesma tela. Novos usuários recebem {signupCredits} créditos de cadastro para testar as primeiras tomadas sem cartão.",
        controls:
            "A cobrança é feita por segundo de vídeo, variando de {minCredits} créditos a {maxCredits} créditos na resolução básica conforme a versão escolhida entre Seedance 2.0, Fast e Mini. O cartão exibe a duração selecionada e a quantidade exata de créditos antes de você clicar em gerar.",
        sceneText:
            "No fluxo de um drama curto, o Seedance 2.0 se destaca ao transformar imagens estáticas de personagens em planos de reação e diálogos com movimento suave. O modelo também atende muito bem a planos de ambientação e cenas de ação a partir de quadros do storyboard. Quando você precisa conduzir o ritmo visual entre duas cenas, usar o par de primeiro e último quadro ajuda a guiar a transição.",
        steps: [
            "Crie ou abra um projeto no DramaCanvas e cole seu roteiro para dividir a história em quadros visuais de storyboard.",
            "Adicione um cartão de geração no espaço de trabalho e selecione Seedance 2.0, Fast ou Mini no seletor de modelos.",
            "Escreva as instruções da cena em português, anexe uma imagem para o primeiro quadro se desejar e confira os créditos exatos exibidos no cartão.",
            "Clique em gerar para ver os vídeos aparecerem lado a lado na tela, avalie as tomadas e envie o clipe aprovado para a linha do tempo.",
        ],
        faq: [
            {
                question: "É possível testar o Seedance 2.0 grátis no DramaCanvas?",
                answer: "Sim. Ao criar sua conta, você recebe {signupCredits} créditos sem precisar cadastrar cartão, o que cobre cerca de {freeCount} segundos de vídeo na configuração mais econômica em 480p. Recomendamos testar sua primeira tomada nessa resolução básica antes de gerar em 720p ou 1080p. Além disso, o planejamento de roteiro e a organização dos cartões na tela são gratuitos, e qualquer geração com falha devolve os créditos automaticamente.",
            },
            {
                question: "Qual é o preço do Seedance 2.0 e como funciona a cobrança?",
                answer: "A cobrança é calculada por segundo de vídeo gerado e varia de acordo com a versão e a resolução selecionadas no cartão. Na resolução mais baixa, o custo começa em {minCredits} créditos por segundo e chega até {maxCredits} créditos por segundo no nível mais alto da linha. O cartão exibe sempre a quantidade exata de créditos necessários antes de iniciar o processamento, sem cobranças ocultas. Você pode adquirir pacotes de créditos avulsos ou assinar planos de membros na página de preços.",
            },
            {
                question: "O DramaCanvas é o site oficial do Seedance 2.0 da ByteDance ou do Dreamina?",
                answer: "Não. O DramaCanvas é uma plataforma independente de produção audiovisual e não possui vínculo oficial de parceria com a ByteDance. O Seedance 2.0 pertence à mesma família de modelos de vídeo presente no aplicativo Dreamina da ByteDance, mas aqui ele opera integrado a um fluxo completo com roteiro, storyboard e linha do tempo. Isso permite comparar os resultados do Seedance diretamente com outros modelos no mesmo espaço de trabalho.",
            },
            {
                question: "Como usar o Seedance 2.0 para criar vídeos e cenas de dramas curtos?",
                answer: "Você pode começar a partir de uma descrição em texto ou enviar uma imagem gerada anteriormente como primeiro quadro da cena. Se precisar direcionar o movimento entre dois momentos do plano, o modelo também aceita um par de primeiro e último quadro, além de imagens de referência indicadas no próprio cartão. Você também pode acionar o chat do assistente no lado direito da tela para redigir comandos e criar cartões automaticamente por conversa.",
            },
            {
                question: "Posso conectar minha própria chave de API (BYOK) para rodar o Seedance?",
                answer: "Sim, você pode habilitar o modo BYOK (sua própria chave de API) nas configurações do seu espaço de trabalho. Nessa modalidade, o provedor que emitiu a sua chave faz a cobrança diretamente e o DramaCanvas não desconta créditos de geração, aplicando apenas uma taxa de serviço da área de trabalho. Além disso, assistentes externos de inteligência artificial podem interagir com a tela e controlar o fluxo por meio do protocolo DramaCanvas MCP.",
            },
            {
                question: "Quais versões do Seedance estão disponíveis e qual a diferença entre elas?",
                answer: "No DramaCanvas você encontra as versões Seedance 2.0, Seedance 2.0 Fast e Seedance 2.0 Mini, além do Seedance 2.5 na mesma interface. A versão Seedance 2.0 permite renderizar em 480p, 720p e 1080p, enquanto o Fast e o Mini trabalham com resoluções de 480p e 720p. Cada opção possui uma tarifação específica por segundo exibida no cartão, permitindo escolher o equilíbrio adequado entre resolução e custo para cada cena.",
            },
            {
                question: "Como manter a consistência dos personagens e quais são as regras de uso comercial?",
                answer: "Reutilizar uma imagem de referência aprovada do personagem como primeiro quadro ajuda na continuidade visual, mas cada tomada ainda requer verificação humana para conferir os detalhes. Você pode gerar essa imagem base no próprio canvas usando modelos como Midjourney V7, Nano Banana ou GPT Image 2 antes de animar com o Seedance. Para aplicações e veiculação comercial dos vídeos gerados, consulte os termos da ByteDance e os termos do DramaCanvas.",
            },
        ],
    },
};

export default seedance20Overrides;
