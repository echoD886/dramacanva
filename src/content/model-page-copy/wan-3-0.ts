import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Facts and prices from the live catalog and verified product limits.
export const wan30Overrides: ModelPageOverrides = {
    "en-US": {
        intro: "Wan 3.0 is Alibaba's video generation model on DramaCanvas for AI short dramas and film scenes. Generate text-to-video or animate a storyboard image as your first frame, starting with {signupCredits} credits to test about {freeCount} s at 480p. Compare results side by side on the canvas, keep the good takes, and move clips directly to the timeline.",
        controls:
            "Wan 3.0 outputs at 480p, 720p, or 1080p and is billed per second of video, starting from {minCredits} credits up to {maxCredits} credits per second at the lowest resolution. Select your clip length and settings on the card to check the exact credits before you generate.",
        sceneText:
            "In an AI short drama, Wan 3.0 works well for action and movement shots as well as atmospheric scene-setting shots. You can take an approved storyboard image from models like Midjourney V7, Nano Banana, or GPT Image 2 and use it as the first frame to keep your character and environment grounded. While reference images help maintain continuity, review each generated shot on the canvas before moving it to your timeline.",
        steps: [
            "Open your canvas and add a generation card, then pick Wan 3.0 in the model selector. The card displays its available settings and supported inputs.",
            "Type your prompt in your own language, or attach an image to act as the first frame. The card shows whether reference images, video, or audio can be attached for your shot.",
            "Select 480p, 720p, or 1080p along with your clip length to check the exact credits displayed on the card. Click generate, or tell the Agent chat on the right side of the canvas to trigger the generation.",
            "View your generated takes appearing side by side on the canvas for side-by-side comparison. Keep the good clips and add them straight to the timeline to edit your short drama.",
        ],
        faq: [
            {
                question: "What is Wan 3.0?",
                answer: "Wan 3.0 is Alibaba's video generation model available directly on DramaCanvas for short drama and film production. It can generate video from text prompts or animate an existing image as the first frame. DramaCanvas provides Wan 3.0 alongside other video models like Kling 3.0, Veo 3.1, and Seedance 2.5 on a single collaborative canvas.",
            },
            {
                question: "Can I try Wan 3.0 for free on DramaCanvas?",
                answer: "Yes, every new account receives {signupCredits} credits with no credit card required and no expiration date. That welcome balance lets you test Wan 3.0 for about {freeCount} s at the lowest 480p resolution. In addition, organizing storyboard cards, writing scripts, and arranging shots on the canvas is completely free.",
            },
            {
                question: "How does Wan 3.0 pricing work?",
                answer: "Wan 3.0 is billed per second of generated video based on your selected resolution and clip duration. At the lowest resolution, generation costs between {minCredits} credits and {maxCredits} credits per second, with higher resolutions costing more per second. The generation card shows the exact credits required before you start, and if a generation fails, those credits are returned to your account balance.",
            },
            {
                question: "How do I use Wan 3.0 for an AI short drama?",
                answer: "Add a generation card to your canvas, choose Wan 3.0, and enter your scene prompt or provide a first frame image from models like Midjourney V7 or GPT Image 2. Select your resolution from 480p, 720p, or 1080p, and pick your clip length on the card. Once generated, inspect your takes side by side on the canvas and drag the approved shots to the timeline to cut your drama.",
            },
            {
                question: "How should I write Wan 3.0 prompts on DramaCanvas?",
                answer: "You can write prompts in your own language describing the action, character movement, camera angle, and scene atmosphere. Wan 3.0 handles action and scene-setting shots well, and you can attach reference images to guide the visual style. You can also chat with the Agent on the right side of the canvas to help draft prompts, create cards, and run generations.",
            },
            {
                question: "Can I connect my own Wan 3.0 API key?",
                answer: "Yes, DramaCanvas supports BYOK so you can connect your own API key. When using your own key, the API provider that issued the key bills you directly, and DramaCanvas deducts no generation credits for your renders. A separate workspace service fee applies to BYOK usage, and AI assistants can also drive the canvas through DramaCanvas MCP.",
            },
            {
                question: "How do I maintain character consistency across shots with Wan 3.0?",
                answer: "To keep characters recognizable across a sequence, attach an approved character reference image to your card or use it as your first frame. Reusing consistent visual references helps align appearance and wardrobe across different scenes. However, AI generation is not automatic perfection, so every shot still requires a human check on the canvas before moving to the edit.",
            },
            {
                question: "Can I use Wan 3.0 generations commercially?",
                answer: "Commercial usage depends on the licensing terms of both platforms. You should review Alibaba's terms and DramaCanvas terms before using generated video clips in commercial projects. DramaCanvas is an independent platform and is not the model developer or an official partner of Alibaba.",
            },
        ],
    },
    "zh-CN": {
        intro: "通义万相 Wan 3.0 是阿里巴巴推出的视频生成模型，现已接入 DramaCanvas 短剧创作画布。你可以直接输入文字提示词生成视频，或上传图片作为首帧制作短剧动作镜头与场景空镜。新账号注册即可获得 {signupCredits} 积分，在最低分辨率下可免费体验约 {freeCount} 秒视频生成。",
        controls: "支持导出 480p、720p 与 1080p 规格并自选片段时长，按视频秒数计费，最低档位每秒需 {minCredits} 积分，最高档位每秒需 {maxCredits} 积分。分辨率越高单秒消耗越多，生成卡片会在提交前明确显示扣除的确切积分。",
        sceneText:
            "在 AI 短剧制作中，通义万相 Wan 3.0 适合用来生成角色动作镜头、动态走位以及环境空镜。你可以将分镜卡片中确认的角色或场景图片设为首帧，驱动静止画面动起来，让故事转场和情绪递进更加自然连贯。同一画布上生成的多组镜头卡片能够横向并排对比，方便快速挑选出可用的正片片段。",
        steps: [
            "登录并打开画布，点击添加生成卡片，在模型选择器中选中 Wan 3.0。",
            "在提示词输入框用自己的母语输入画面描述，若需要以图生视频，可上传参考图作为画面的首帧。",
            "在卡片上选择 480p 分辨率与片段时长，先以较低成本测试效果，卡片会在点击生成前展示本次确切扣除的积分。",
            "点击生成后视频会显示在画布上，多个结果可并排对比，满意片段能直接加入时间轴剪辑成短剧，或切至 1080p 重新生成高分辨率版本。",
        ],
        faq: [
            {
                question: "通义万相 Wan 3.0 怎么用？新手制作短剧有具体教程吗？",
                answer: "在 DramaCanvas 画布上，你可以先粘贴剧本并拆解为分镜卡片，然后添加生成卡片并选择 Wan 3.0。输入你的画面描述提示词，或者将上一张分镜图片作为视频首帧上传，即可启动生成。如果不习惯手动配置，也可以在画布右侧打开智能助手对话，通过自然语言交流自动建立卡片并下发生成任务。",
            },
            {
                question: "Wan 3.0 可以免费使用吗？新账号有多少免费体验额度？",
                answer: "在 DramaCanvas 画布上规划剧情、排布分镜卡片完全免费。每个新注册账号都会获得一次性赠送的 {signupCredits} 积分，无需绑定银行卡且永久有效。在 480p 最低分辨率设置下，这笔初始积分大约可以覆盖 {freeCount} 秒的视频生成测试，体验满意后可在定价页面选购会员计划或积分包继续创作。",
            },
            {
                question: "Wan 3.0 在 DramaCanvas 上的价格与计费规则是怎样的？",
                answer: "Wan 3.0 是按视频实际时长按秒扣除积分，分辨率越高单秒费用越高。在最低分辨率下，每秒视频扣除 {minCredits} 积分，最高档位则为每秒 {maxCredits} 积分。片段时长可以在卡片上自行选择，每次生成前卡片都会明确展示扣除的确切积分，不会产生隐性扣费。",
            },
            {
                question: "为 Wan 3.0 编写视频生成提示词有什么建议？",
                answer: "你可以直接使用母语编写提示词，清晰描述主体动作、机位视角、光影氛围以及环境细节。制作连续短剧时，建议搭配静态参考图作为视频首帧，并在提示词中重点描写人物的具体运动轨迹与镜头推拉变化。生成卡片支持将多个生成结果并排在画布上展示，便于你对比不同提示词描述下的画面动态。",
            },
            {
                question: "Wan 3.0 支持哪些输入素材？如何实现以图生视频？",
                answer: "Wan 3.0 支持纯文本提示词直接生成视频，也可以上传静态图片作为视频画面的第一帧。在部分设置下，卡片还会支持接入参考视频或参考音频，具体可上传的素材类型会在当前卡片界面上实时列出。在同一个画布中，你可以先用图像模型生成符合预期的角色定妆照，再直接将其作为 Wan 3.0 的首帧进行动态化。",
            },
            {
                question: "在连续短剧镜头中，如何利用 Wan 3.0 保持角色一致性？",
                answer: "在创作系列镜头时，复用经过确认的角色参考图作为首帧有助于保持人物外貌一致。不过 AI 视频在运动过程中仍可能产生局部偏差，每个镜头生成后依然需要人工检查把关。如果发现动作变形，可以在画布上重新微调提示词再次生成，并将满意的片段加入下方时间轴完成拼接。",
            },
            {
                question: "可以在 DramaCanvas 上绑定自己的 API 密钥（BYOK）使用 Wan 3.0 吗？",
                answer: "支持。通过自带 API 密钥（BYOK）模式，提供 API 密钥的服务商会直接向你计费，DramaCanvas 不会扣除任何生成积分，仅按规定收取单独的工作区服务费。此外，外部 AI 助手也可以通过 DramaCanvas MCP 工具协议连接并调度画布上的各项生成任务。",
            },
            {
                question: "生成失败会退回积分吗？生成的视频版权与商用政策如何规定？",
                answer: "如果由于系统原因导致视频生成失败，系统会自动将扣除的积分全额退回账户。关于生成内容的商业使用权益，请查阅阿里巴巴的使用条款以及 DramaCanvas 的服务条款。DramaCanvas 是独立运营的创作平台，并非模型开发商或其官方合作伙伴。",
            },
        ],
    },
    "zh-TW": {
        intro: "通義萬相 Wan 3.0 是阿里巴巴推出的影片生成模型，在 DramaCanvas 畫布上能直接將分鏡圖片轉為動態畫面。新帳號註冊即可獲得 {signupCredits} 點數，在最低畫質下約可試生成 {freeCount} 秒影片。生成結果會直接並列在畫布上，方便隨時比對挑選並加入時間軸剪輯短劇。",
        controls: "模型支援 480p、720p 與 1080p 解析度，長度可在卡片上自由選取並按秒計費。最低畫質每秒需 {minCredits} 點數，最高畫質每秒需 {maxCredits} 點數，卡片在生成前皆會明確顯示確切點數。",
        sceneText:
            "在 AI 短劇製作中，Wan 3.0 特別適合用來處理動作與動態鏡頭，以及鋪陳場景氛圍的空鏡頭。你可以將畫布上的分鏡圖指定為首格畫面生成動態片段，保持畫面起點連貫。多次生成的鏡頭會並排在畫布上方便比對挑選，確認滿意的片段就能直接排入時間軸剪輯成片。",
        steps: [
            "註冊或登入後開啟畫布，可貼上腳本拆分成多張分鏡卡，或直接點擊新增生成卡片。",
            "在生成卡片的模型選擇器中選取 Wan 3.0，用自己的語言輸入提示詞，並可依需求上傳參考圖。",
            "在卡片上設定解析度與影片長度，確認卡片顯示的確切點數後，點擊生成按鈕。",
            "生成完成後多個鏡頭會並列在畫布上方便對比，保留滿意的片段並加入時間軸進行剪輯。",
        ],
        faq: [
            {
                question: "什麼是 Wan 3.0？在短劇創作中有什麼特色？",
                answer: "Wan 3.0 是阿里巴巴推出的通義萬相系列影片生成模型，支援文字生影片與圖生影片功能。在 DramaCanvas 畫布上，它特別適合生成動態動作鏡頭與場景空鏡頭。創作者能將現有的分鏡圖像設為首格畫面帶動畫面動態，並在同一畫布上完成從分鏡到動態鏡頭的製作流程。",
            },
            {
                question: "Wan 3.0 可以免費試用嗎？新帳號有多少額度？",
                answer: "新帳號註冊即可獲得 {signupCredits} 點數，不需要綁定信用卡也沒有使用期限。這筆點數在最低 480p 畫質下約可試用生成 {freeCount} 秒的影片，適合先進行快速測試。如果想生成更高解析度或更長篇幅的短劇鏡頭，可以至定價頁面選購會員方案或點數包。",
            },
            {
                question: "Wan 3.0 的費用怎麼計算？解析度會影響計費嗎？",
                answer: "Wan 3.0 採影片秒數計費，解析度越高每秒消耗點數越多。在最低畫質下每秒為 {minCredits} 點數，最高畫質每秒則為 {maxCredits} 點數。每次生成前卡片都會明確標示本次設定所需的確切點數，若生成失敗系統會自動退還該次扣除的點數。",
            },
            {
                question: "DramaCanvas 上的 Wan 3.0 教學步驟是什麼？如何快速上手？",
                answer: "進入畫布後新增生成卡片，在模型選擇器選定 Wan 3.0。接著輸入提示詞或上傳參考圖，設定好解析度後即可點擊生成。如果不想手動建卡，也可以直接使用畫布右側的 Agent 對話框，透過文字對話自動建立卡片與執行生成。",
            },
            {
                question: "Wan 3.0 提示詞該怎麼寫？可以使用中文輸入嗎？",
                answer: "你可以直接使用自己的母語（包含繁體中文）撰寫提示詞，不需刻意翻譯。建議提示詞明確描述主體角色、動作細節、攝影機運鏡與場景氛圍。若搭配圖片作為首格畫面，提示詞只需專注描寫該畫面接下來要發生的動態與變化即可。",
            },
            {
                question: "在 DramaCanvas 上 Wan 3.0 有哪些版本可以選擇？",
                answer: "目前 DramaCanvas 平台提供的是官方 Wan 3.0 版本。輸出的解析度提供 480p、720p 與 1080p 可選，影片長度可直接在卡片上調整。建議先以 480p 進行初步效果測試，挑選出滿意鏡頭後再切換至更高解析度重新生成。",
            },
            {
                question: "製作連續短劇時，如何維持 Wan 3.0 的角色一致性？",
                answer: "在不同鏡頭中重複使用已確認的角色參考圖，能有效幫助維持角色的外觀穩定。不過在 AI 生成流程中，每個鏡頭生成後依然需要人工檢查與確認。你也可以在同一個畫布上結合 Midjourney V7、Nano Banana 或 GPT Image 2 生成的角色圖作為首格畫面進行影片延伸。",
            },
            {
                question: "可以自備 API 金鑰（BYOK）使用 Wan 3.0 嗎？費用如何計算？",
                answer: "可以，DramaCanvas 支援串接自備 API 金鑰（BYOK）。使用自己的金鑰時，生成費用會由發行該金鑰的 API 提供商直接向你計費，DramaCanvas 不會扣除生成點數，僅收取獨立的畫布工作區服務費。",
            },
            {
                question: "生成出的影片可以商用嗎？平台有支援自動化工作流嗎？",
                answer: "商業使用規範請查閱 Alibaba 的條款與 DramaCanvas 的服務條款。在工作流方面，AI 助理能透過 DramaCanvas MCP 直接操控畫布建構短劇。此外，在畫布上整理腳本與排列分鏡卡皆為免費功能，只有實際生成時才會消耗點數。",
            },
        ],
    },
    "zh-HK": {
        intro: "DramaCanvas 支援阿里巴巴旗下的通義萬相 Wan 3.0 影片生成模型，讓你直接在單一畫布上將文字提示詞或首格圖片轉化為短劇鏡頭。新註冊帳戶均可獲贈 {signupCredits} 點數，能以最低規格生成約 {freeCount} 秒影片進行測試。生成結果會並排呈現在畫布上，方便挑選並放入時間軸完成短劇。",
        controls: "Wan 3.0 提供 480p、720p 與 1080p 解像度選項並可自選片段長度，費用按影片秒數計算（最低每秒需 {minCredits} 點數至 {maxCredits} 點數）。生成卡片在點擊生成前會明確顯示該次所需扣除的確切點數，解像度越高每秒點數越高。",
        sceneText: "在製作 AI 短劇時，Wan 3.0 適合用來生成動作與動態鏡頭，以及建立故事氛圍的場景過渡鏡頭。你亦可以將畫布上已完成的分鏡圖片或角色首格圖像作為起點，直接讓靜態畫面動起來。多個鏡頭成果會並排顯示於畫布上，方便創作者快速對比挑選。",
        steps: [
            "登入 DramaCanvas 並開啟畫布，點擊新增生成卡片，或直接在分鏡表中貼上劇本拆分鏡頭。",
            "在模型選擇器中選取 Wan 3.0，並根據需要選擇 480p、720p 或 1080p 解像度與片段長度。",
            "以常用語言輸入提示詞，亦可上傳首格圖片或參考圖，卡片會即時顯示所需的確切點數。",
            "點擊生成按鈕，影片片段會並排顯示於畫布上以供挑選，滿意的鏡頭可直接加入時間軸進行剪輯。",
        ],
        faq: [
            {
                question: "什麼是通義萬相 Wan 3.0？",
                answer: "Wan 3.0（通義萬相）是由阿里巴巴開發的影片生成模型，在 DramaCanvas 上提供 Wan 3.0 版本。你可以透過文字提示詞生成影片，或者以上傳的圖片作為首格畫面生成動態鏡頭。生成的片段會直接呈現在同一畫布上，方便創作者即時比對與整理分鏡。",
            },
            {
                question: "如何免費試用 Wan 3.0？",
                answer: "新註冊帳戶均會獲得一次性的 {signupCredits} 點數，無需綁定信用卡且沒有過期限制。這筆點數足以在最低解像度（480p）下生成約 {freeCount} 秒影片供你體驗效果。在畫布上編寫劇本與安排分鏡卡片是完全免費的，只有實際執行生成時才會扣除點數。",
            },
            {
                question: "DramaCanvas 上的 Wan 3.0 收費模式是怎樣的？",
                answer: "Wan 3.0 依照影片生成秒數收費，最低解像度下每秒費用介乎 {minCredits} 點數至 {maxCredits} 點數，較高解像度每秒所需點數相應增加。生成卡片在按下生成前會明確標示所需扣除的確切點數，若生成失敗系統會自動退還點數。如需更多點數，可以在定價頁面選購會員計劃或額外點數包。",
            },
            {
                question: "初學者製作短劇有甚麼 Wan 3.0 教學與上手流程？",
                answer: "你可以在畫布上先貼上短劇劇本並拆分為分鏡卡片，接著新增生成卡片並選取 Wan 3.0。輸入提示詞並選定解像度後即可生成，多次生成的鏡頭會並列呈現供你比對取捨。此外，亦可使用畫布右側的 Agent 對話框，透過對話直接建立卡片並執行生成。",
            },
            {
                question: "使用 Wan 3.0 時應該選擇哪種規格與解像度？",
                answer: "DramaCanvas 目前提供 Wan 3.0 單一版本，輸出解像度包括 480p、720p 及 1080p，片段長度亦可在卡片中直接設定。建議初期測試時先選用 480p 驗證畫面動作與提示詞效果，確認滿意後再以較高解像度重新生成最終鏡頭。解像度越高每秒消耗點數越多，卡片會在生成前列出確切點數。",
            },
            {
                question: "如何撰寫 Wan 3.0 提示詞並保持短劇角色一致？",
                answer: "你可以直接使用常用語言撰寫提示詞，清楚描述鏡頭動作或場景氛圍。若需要角色連貫，可以在支援參考輸入的設定下附上已確認的角色參考圖，或以圖片作為影片首格。重複使用參考圖有助維持外觀穩定，但短劇製作中每個鏡頭仍需經過人工檢查。",
            },
            {
                question: "我可以自備 API 金鑰（BYOK）使用 Wan 3.0 嗎？",
                answer: "可以，DramaCanvas 支援 BYOK（自備 API 金鑰）模式。在此模式下，由發出金鑰的 API 提供商直接向你收取模型費用，DramaCanvas 不會扣除生成點數，僅收取獨立的工作區服務費。這適合本身已有配合之 API 提供商帳戶的創作者使用。",
            },
            {
                question: "畫布上可以將 Wan 3.0 與其他 AI 模型混合使用嗎？",
                answer: "可以，你可以在同一畫布上先用 Nano Banana、GPT Image 2 或 Midjourney V7 生成圖片，並將其設為 Wan 3.0 的首格畫面來生成影片。同一個專案中亦能混用 Seedance 2.5、Kling 3.0、Veo 3.1 或 MiniMax H3 等影片模型，所有成品均可匯入時間軸統一剪輯。此外，你還可以透過 DramaCanvas MCP 讓外部 AI 助手驅動畫布作業。",
            },
            {
                question: "生成的 Wan 3.0 影片可以作商業用途嗎？",
                answer: "商業使用授權請查閱 Alibaba 的條款及 DramaCanvas 的條款，以確保符合相關規範。DramaCanvas 為獨立平台，並非模型開發者亦非其官方合作夥伴。在開始商用短劇專案前，建議先行審閱雙方服務協議以了解最新權限細節。",
            },
        ],
    },
    "ja-JP": {
        intro: "Wan 3.0はAlibabaの動画生成モデルです。DramaCanvasなら絵コンテからの使い方も簡単で、登録時の{signupCredits}クレジットにより最安設定で約{freeCount}秒の無料テストが可能です。料金は秒単位で、生成前に正確な必要クレジットが表示されます。",
        controls: "解像度は480p・720p・1080pから選べ、長さの指定に応じて秒あたり{minCredits}クレジットから{maxCredits}クレジットで計算されます。高解像度ほど秒あたりの消費が増えますが、生成前にカード上で正確なクレジットを確認できます。",
        sceneText:
            "ショートドラマ制作では、動きの激しいアクションシーンや場面の雰囲気を伝える情景描写のカットに適しています。絵コンテで作成した画像を動画生成カードの始点画像に設定し、構図を保ったまま動きをつける用途にも役立ちます。まずは480pでカメラワークや動きをテストし、本番クリップを決めてから高解像度で再生成するのが実用的です。",
        steps: [
            "キャンバスを開き、生成カードを追加してモデル選択で「Wan 3.0」と解像度（480p・720p・1080p）を指定します。脚本がある場合はキャンバス上で絵コンテカードに分割しておくこともできます。",
            "生成カードにプロンプトを日本語で入力し、始点にする画像や参照画像があればカードに設定します。キャンバス右側のAgentチャットから会話形式でカードを作成し、プロンプトを入力することも可能です。",
            "カードに表示される動画の長さと正確な消費クレジットを確認し、生成ボタンを押します。生成が完了すると、キャンバス上に動画が表示されます。",
            "並んだ生成結果を比較して良いテイクを選び、下部のタイムラインに並べてショートドラマとして編集します。",
        ],
        faq: [
            {
                question: "Wan 3.0とはどのような動画生成AIですか？",
                answer: "Wan 3.0（通义万相）はAlibabaが開発した動画生成AIモデルです。テキストからの動画生成に加え、静止画を始点にした動画化にも対応しています。DramaCanvas上では、絵コンテの画像を最初のフレームとして動かしたり、アクションシーンや情景描写を生成する用途で利用できます。",
            },
            {
                question: "DramaCanvasでのWan 3.0の使い方はどうすればよいですか？",
                answer: "キャンバスに生成カードを追加し、モデル一覧から「Wan 3.0」を選んでプロンプトを入力します。必要に応じて始点画像や参照画像を設定し、解像度と動画の長さを指定して生成ボタンを押すだけです。キャンバス右側のAgentチャットに指示を出して、カードの配置から生成までを会話で進めることもできます。",
            },
            {
                question: "Wan 3.0を無料で試すことはできますか？",
                answer: "新規登録時に{signupCredits}クレジットが付与されるため、クレジットカード登録なしですぐにお試しいただけます。このクレジットを使えば、最安設定の480pで約{freeCount}秒の動画生成をテストできます。キャンバス上での脚本作成や絵コンテの配置自体は無料で行えます。",
            },
            {
                question: "Wan 3.0の利用料金やクレジット消費の仕組みはどうなっていますか？",
                answer: "Wan 3.0の料金は動画の秒数に応じた従量制で、最低解像度では秒あたり{minCredits}クレジットから、最も高い設定では秒あたり{maxCredits}クレジットとなります。解像度を480pから720pや1080pに上げると、秒あたりの消費クレジットが増加します。生成を実行する前にカード上に正確な必要クレジットが表示され、万が一生成に失敗した場合はクレジットが返還されます。",
            },
            {
                question: "DramaCanvasではWan 3.0のどのバージョンを選べますか？",
                answer: "DramaCanvasで提供しているバージョンは「Wan 3.0」の1種類です。カード上で解像度を480p、720p、1080pから選択し、動画の長さを指定して生成します。まずは480pで動きやカメラワークを確認し、納得のいくテイクを高解像度で再生成するとクレジットを効率的に使えます。",
            },
            {
                question: "プロンプトは何語で書けばよいですか？画像も使えますか？",
                answer: "プロンプトは日本語を含むご自身の言語でそのまま入力できます。テキストのみからの生成だけでなく、画像を始点フレームとして指定して動きをつけることも可能です。また、選択した設定に応じて参照画像や動画、音声素材を添付でき、カード上で受け入れ可能な素材の種類を確認できます。",
            },
            {
                question: "ショートドラマ制作でキャラクターの見た目を揃えることはできますか？",
                answer: "承認済みのキャラクター参照画像をカードに添付して生成することで、見た目の統一感を保ちやすくなります。ただし、AI動画の特性上、ショットごとに必ず目視での確認と選別が必要です。同じキャンバス上の画像生成モデルで作成したキャラクター画像を、Wan 3.0の始点画像として組み合わせる手法も有効です。",
            },
            {
                question: "独自APIキー（BYOK）を持ち込んで利用することはできますか？",
                answer: "ご自身のAPIキーを接続して利用するBYOKに対応しています。その場合、APIキーを発行したプロバイダーから直接請求が行われ、DramaCanvasの生成クレジットは消費されません。なお、キャンバス環境の維持のため別途ワークスペース利用料が適用されます。",
            },
            {
                question: "生成した動画の商用利用は可能ですか？",
                answer: "商用利用については、Alibabaの利用規約およびDramaCanvasの利用規約をご確認ください。DramaCanvasは独立したプラットフォームであり、モデル開発元の公式パートナーではありません。公開や配信を行う前には、両サービスの最新の規約に沿っているか必ずご確認ください。",
            },
        ],
    },
    "ko-KR": {
        intro: "DramaCanvas에서 Alibaba의 영상 생성 모델 Wan 3.0으로 숏드라마를 제작해 보세요. 가입 시 제공되는 {signupCredits} 크레딧으로 Wan 3.0 무료 테스트를 진행할 수 있습니다. 480p 최저 설정 기준 약 {freeCount}초 분량을 직접 생성해 볼 수 있습니다.",
        controls: "Wan 3.0은 480p, 720p, 1080p 해상도와 영상 길이를 카드에서 지정할 수 있으며, 해상도에 따라 초당 {minCredits} 크레딧부터 {maxCredits} 크레딧까지 차등 부과됩니다. 생성 전 카드에 필요한 정확한 크레딧이 표시됩니다.",
        sceneText:
            "숏드라마에서 빠른 움직임이 들어간 액션 장면이나 극의 분위기를 연출하는 배경 샷을 제작할 때 활용하기 좋습니다. 캔버스에서 작업한 스토리보드 이미지를 첫 프레임으로 불러와 연속성 있는 영상으로 발전시킬 수 있습니다. 생성된 클립들은 한 캔버스에서 나란히 비교한 뒤 타임라인으로 옮겨 바로 편집할 수 있습니다.",
        steps: [
            "캔버스에서 대본을 붙여넣어 스토리보드 카드로 나누거나, 우측 에이전트 채팅을 사용해 새 생성 카드를 추가합니다.",
            "생성 카드의 모델 선택기에서 Wan 3.0을 고르고 원하는 해상도와 영상 길이를 지정합니다.",
            "프롬프트 입력란에 한국어로 장면을 작성하고, 필요한 경우 첫 프레임이나 참조 이미지를 카드에 첨부합니다.",
            "카드에서 정확한 소모 크레딧을 확인한 후 생성 버튼을 클릭하면 결과물이 나란히 표시되며 마음에 드는 클립을 타임라인에 배치합니다.",
        ],
        faq: [
            {
                question: "Wan 3.0은 어떤 AI 모델인가요?",
                answer: "Wan 3.0은 Alibaba가 개발한 비디오 생성 모델(통义万相 / Wan)입니다. DramaCanvas에서는 단일 버전인 Wan 3.0을 지원하며 텍스트 프롬프트뿐만 아니라 이미지를 첫 프레임으로 활용해 영상을 만들 수 있습니다. 숏드라마 제작에 필요한 배경 연출과 액션 장면 생성에 유용하게 쓰입니다.",
            },
            {
                question: "DramaCanvas에서 Wan 3.0 사용법은 어떻게 되나요?",
                answer: "캔버스에 생성 카드를 만든 뒤 모델 선택기에서 Wan 3.0을 선택합니다. 프롬프트를 입력하고 해상도와 길이를 설정하면 카드에 차감될 크레딧이 정확하게 표시됩니다. 생성 버튼을 누르면 영상 결과물이 캔버스에 나란히 나타나며, 마음에 드는 클립을 골라 타임라인에 올려 편집할 수 있습니다.",
            },
            {
                question: "Wan 3.0 무료 체험이 가능한가요?",
                answer: "회원가입 시 결제 카드 등록 없이 만료되지 않는 {signupCredits} 크레딧이 1회 지급됩니다. 이 크레딧을 사용하면 480p 최저 설정 기준 약 {freeCount}초 분량의 영상을 무료로 테스트 생성해 볼 수 있습니다. 캔버스에서 대본을 정리하고 스토리보드를 짜는 기획 단계는 크레딧 소모 없이 무료입니다.",
            },
            {
                question: "Wan 3.0 가격과 크레딧 차감 방식은 어떻게 되나요?",
                answer: "Wan 3.0은 생성하는 영상 길이에 따라 초당 과금되며, 최저 해상도 기준 초당 {minCredits} 크레딧에서 최고 등급 기준 초당 {maxCredits} 크레딧이 차감됩니다. 480p, 720p, 1080p 중 높은 해상도를 고를수록 초당 소모 크레딧이 늘어납니다. 생성 전 카드에서 필요한 크레딧을 정확하게 확인한 뒤 진행할 수 있습니다.",
            },
            {
                question: "프롬프트는 한국어로 작성해도 되나요?",
                answer: "네, 한국어로 프롬프트를 작성해도 Wan 3.0 영상을 원활하게 생성할 수 있습니다. 숏드라마 장면에 필요한 카메라 구도나 인물의 행동을 구체적으로 적어주면 원하는 연출을 구현하기 수월합니다. 프롬프트 작성이 어렵다면 캔버스 우측의 에이전트 채팅에 대화 형식으로 생성을 요청할 수도 있습니다.",
            },
            {
                question: "첫 프레임 이미지나 참조 이미지를 사용해 인물 일관성을 유지할 수 있나요?",
                answer: "승인된 캐릭터 참조 이미지를 활용하거나 캔버스에서 생성한 이미지를 첫 프레임으로 지정하면 인물 외형을 유지하는 데 도움이 됩니다. 다만 매 샷마다 일관성을 확인하는 제작자의 검토 과정이 필요합니다. 동일한 캔버스 내에서 Midjourney V7이나 GPT Image 2로 만든 이미지를 Wan 3.0의 첫 프레임으로 바로 연결할 수 있습니다.",
            },
            {
                question: "BYOK(자체 API 키 연결) 방식을 사용하면 과금 처리는 어떻게 되나요?",
                answer: "자신의 API 키를 연결해 사용하는 BYOK 환경에서는 해당 키를 발급한 API 제공업체에서 직접 비용을 청구합니다. 이때 DramaCanvas에서는 영상 생성 크레딧을 차감하지 않으며 별도의 워크스페이스 서비스 이용료만 적용됩니다. 외부 AI 어시스턴트를 활용할 경우 DramaCanvas MCP를 통해 캔버스를 제어하는 것도 가능합니다.",
            },
            {
                question: "생성에 실패했을 때 크레딧은 환불되나요? 상업적 이용은 가능한가요?",
                answer: "생성 도중 오류가 발생해 실패한 경우에는 사용된 크레딧이 자동으로 반환됩니다. 완성된 영상의 상업적 이용 관련 세부 사항은 Alibaba의 이용약관 및 DramaCanvas 이용약관을 확인해야 합니다. 추가 크레딧이 필요한 경우 요금제 페이지에서 멤버십 플랜과 크레딧 팩을 확인할 수 있습니다.",
            },
        ],
    },
    "es-ES": {
        intro: "Wan 3.0 es el modelo de video de Alibaba disponible en DramaCanvas para crear escenas y planos con movimiento a partir de texto o imágenes. Puedes probar la herramienta con los {signupCredits} créditos de bienvenida al registrarte, directamente en tu navegador. Al organizar tu guion y tus planos en el lienzo, generas clips y los integras en la línea de tiempo de tu drama corto.",
        controls:
            "El costo va desde {minCredits} créditos hasta {maxCredits} créditos por segundo de video según elijas 480p, 720p o 1080p, y la duración del clip se selecciona en la tarjeta. Antes de hacer clic en generar, la tarjeta indica los créditos exactos que requiere la toma.",
        sceneText:
            "En un drama corto, Wan 3.0 resulta muy útil para tomas de acción física, movimientos de cámara y planos de ambientación que sitúan la historia. Permite animar una ilustración del guion gráfico usándola como primer fotograma, conservando la composición que planificaste para la escena. Además, puedes colocar varias opciones juntas en el lienzo para comparar resultados antes de enviar el corte final a la línea de tiempo.",
        steps: [
            "Abre el lienzo y añade una tarjeta de generación, o pídele al asistente en el chat derecho que la cree a partir de tu conversación.",
            "Elige Wan 3.0 en el selector de modelos, define la duración del clip y marca la resolución deseada entre 480p, 720p o 1080p.",
            "Escribe tu prompt en tu propio idioma y adjunta una imagen como primer fotograma o referencia si buscas orientar la toma.",
            "Comprueba los créditos exactos que muestra la tarjeta, pulsa generar y compara los videos en el lienzo para pasar los mejores a la línea de tiempo.",
        ],
        faq: [
            {
                question: "¿Se puede probar Wan 3.0 gratis en DramaCanvas?",
                answer: "Al registrarte recibes {signupCredits} créditos de bienvenida sin necesidad de ingresar tarjeta bancaria ni preocuparte por fechas de caducidad. Ese saldo cubre {freeCount} segundos de video en la resolución de 480p para realizar una prueba inicial de la herramienta. Si deseas generar tomas en 720p o 1080p, o producir más clips, puedes adquirir paquetes de créditos o una membresía en la página de precios.",
            },
            {
                question: "¿Cuál es el precio de Wan 3.0 y cómo se cobran las tomas?",
                answer: "La generación se factura por segundo de video, desde {minCredits} créditos por segundo en la calidad básica hasta {maxCredits} créditos por segundo en la resolución más alta. La tarjeta muestra los créditos exactos antes de generar para que siempre conozcas el consumo previo de cada toma. La planificación de escenas y la división del guion en el lienzo son gratuitas, y si una generación falla, el sistema devuelve los créditos automáticamente.",
            },
            {
                question: "¿Cómo usar Wan 3.0 para producir un drama corto en el lienzo?",
                answer: "Inicia sesión en DramaCanvas, abre tu lienzo y añade una tarjeta de generación con Wan 3.0 seleccionado. Escribe las instrucciones de la escena en tu propio idioma, configura la resolución y genera el clip directamente. Puedes comparar las variantes generadas una junto a otra en el lienzo y arrastrar las tomas definitivas a la línea de tiempo para montar tu historia.",
            },
            {
                question: "¿Cómo redactar prompts para Wan 3.0 al crear escenas?",
                answer: "Describe al personaje, la acción concreta que realiza, el ambiente del entorno y el movimiento de cámara que requiere el plano. Puedes escribir las indicaciones directamente en tu idioma materno sin necesidad de traducirlas. Para obtener tomas más precisas, utiliza una imagen previa como primer fotograma o adjunta imágenes de referencia si la configuración lo admite.",
            },
            {
                question: "¿Wan 3.0 garantiza la coherencia de los personajes en todo el drama?",
                answer: "Reutilizar una imagen de referencia del personaje ayuda a mantener sus rasgos estables entre distintas tomas, pero cada escena requiere revisión humana obligatoria. No existen resultados garantizados de forma automática en cada intento, por lo que conviene generar alternativas en el lienzo. DramaCanvas te facilita comparar varias versiones en paralelo para conservar únicamente los clips que encajen con tu personaje.",
            },
            {
                question: "¿Qué tipos de archivos de entrada admite Wan 3.0 en DramaCanvas?",
                answer: "Puedes generar video a partir de texto descriptivo o utilizar una imagen previa como primer fotograma del clip. La propia tarjeta de generación especifica si la modalidad seleccionada acepta además video o audio de referencia. Esta integración te permite tomar fotogramas creados en el mismo lienzo con modelos como Midjourney V7 o Nano Banana y convertirlos en video con Wan 3.0.",
            },
            {
                question: "¿Puedo utilizar mi propia clave de API (BYOK) con Wan 3.0?",
                answer: "Sí, puedes conectar tu propia clave mediante la opción BYOK (usar tu propia clave de API) en tu espacio de trabajo. Bajo esta modalidad, el proveedor de la API que emitió tu clave te factura directamente y DramaCanvas no descuenta créditos de generación. Ten presente que en esta configuración aplica una tarifa de servicio independiente por el uso del espacio de trabajo.",
            },
            {
                question: "¿Se pueden usar comercialmente los videos creados con Wan 3.0?",
                answer: "DramaCanvas es una plataforma independiente y no es socia oficial ni la empresa desarrolladora del modelo. Para proyectos con fines comerciales, debes revisar los términos de Alibaba y los términos de DramaCanvas. Una vez generados tus clips, tienes la libertad de exportarlos e integrarlos en la línea de tiempo de tus producciones de acuerdo con esas condiciones.",
            },
        ],
    },
    "pt-BR": {
        intro: "O Wan 3.0 é o modelo de geração de vídeo da Alibaba disponível no DramaCanvas para criar cenas de minisséries e dramas curtos. Você pode transformar texto em vídeo ou animar uma imagem inicial diretamente no mesmo canvas visual. Ao criar sua conta, você recebe {signupCredits} créditos para testar cerca de {freeCount} s na configuração mais básica, sem precisar de cartão.",
        controls:
            "A cobrança é calculada por segundo de vídeo gerado, variando de {minCredits} créditos a {maxCredits} créditos na menor resolução. Resoluções superiores custam mais créditos por segundo, e o valor exato sempre aparece no cartão antes de você confirmar a geração.",
        sceneText:
            "Em produções de drama curto, o Wan 3.0 é indicado para tomadas de ambientação e cenas com ação e movimentação de personagens. Você também pode gerar uma imagem no canvas com outros modelos e usá-la como primeiro quadro para guiar o início da cena. Depois de gerar, basta enviar os clipes aprovados direto para a linha do tempo.",
        steps: [
            "Abra o canvas do seu projeto e crie um cartão de geração, ou divida o texto do seu roteiro em cartões de storyboard.",
            "No seletor de modelos, escolha o Wan 3.0, escreva seu comando em português e anexe uma imagem de referência se desejar.",
            "Ajuste a resolução entre 480p, 720p ou 1080p, defina o tempo do clipe e confira o total exato de créditos antes de clicar em gerar.",
            "Visualize os resultados lado a lado no canvas para comparar as tomadas e envie os vídeos aprovados para a linha do tempo.",
        ],
        faq: [
            {
                question: "O que é o Wan 3.0 e como ele funciona no DramaCanvas?",
                answer: "O Wan 3.0 é o modelo de geração de vídeo da Alibaba integrado ao DramaCanvas para a produção de minisséries e dramas curtos. Ele permite criar tomadas a partir de descrições em texto ou transformar uma imagem estática no primeiro quadro do vídeo. Os clipes gerados aparecem lado a lado no canvas para facilitar a comparação antes da edição na linha do tempo.",
            },
            {
                question: "Dá para usar o Wan 3.0 grátis no DramaCanvas?",
                answer: "Sim, todo novo cadastro recebe {signupCredits} créditos sem necessidade de cartão de crédito para experimentar a plataforma. Essa quantidade cobre um teste curto de cerca de {freeCount} s na resolução mais econômica de 480p. Para continuar produzindo ou gerar em 720p e 1080p, você pode adquirir pacotes de créditos ou planos de assinatura na página de preços.",
            },
            {
                question: "Wan 3.0 preço: quanto custa para gerar vídeos na plataforma?",
                answer: "O custo do Wan 3.0 é cobrado por segundo de vídeo gerado, variando entre {minCredits} créditos e {maxCredits} créditos por segundo na resolução básica. Resoluções maiores como 720p e 1080p consomem mais créditos por segundo. O valor exato em créditos é mostrado no cartão antes de você iniciar a geração, e execuções que falham têm seus créditos devolvidos.",
            },
            {
                question: "Wan 3.0: como usar o modelo no canvas passo a passo?",
                answer: "Primeiro, faça login, abra seu projeto no canvas e adicione um cartão de geração ou divida seu roteiro em cartões de storyboard. Depois, selecione o Wan 3.0 no seletor de modelos, digite seu comando descritivo e anexe uma imagem inicial se desejar. Por fim, selecione a resolução, verifique a quantidade exata de créditos no cartão e clique no botão de gerar.",
            },
            {
                question: "Wan 3.0 prompts: como escrever comandos para orientar as cenas?",
                answer: "Você pode escrever seus comandos em português, detalhando o movimento dos personagens, o enquadramento de câmera e o clima do cenário. Usar uma imagem como primeiro quadro ajuda o modelo a manter o estilo visual desejado durante a movimentação. Se preferir, converse com o assistente na lateral direita do canvas para transformar ideias soltas em prompts estruturados.",
            },
            {
                question: "Como manter a consistência de personagens entre as tomadas no Wan 3.0?",
                answer: "Utilizar uma imagem de referência aprovada do personagem como primeiro quadro melhora bastante a continuidade visual entre as cenas. Mesmo assim, toda geração requer conferência humana para checar detalhes de rosto, figurino e expressão. O canvas permite gerar opções vizinhas para que você selecione apenas os melhores resultados.",
            },
            {
                question: "Posso usar minha própria chave de API (BYOK) com o Wan 3.0?",
                answer: "Sim, o DramaCanvas oferece suporte para conectar sua própria chave de API através do modelo BYOK. Nessa configuração, o provedor da API que emitiu sua chave cobra você diretamente e a plataforma não debita créditos de geração, havendo apenas uma taxa de serviço pelo espaço de trabalho. A criação de roteiros e a organização do storyboard no canvas permanecem gratuitas.",
            },
            {
                question: "Posso usar comercialmente os vídeos gerados com o Wan 3.0?",
                answer: "Para uso comercial das cenas geradas, consulte os termos da Alibaba e os termos do DramaCanvas antes do lançamento da sua obra. O DramaCanvas atua como uma plataforma independente, não sendo a criadora do modelo nem parceira oficial da Alibaba. A montagem final da minissérie e as decisões editoriais ficam sob seu controle na linha do tempo.",
            },
        ],
    },
};

export default wan30Overrides;
