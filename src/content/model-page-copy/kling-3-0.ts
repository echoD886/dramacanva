import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Facts and prices from the live catalog and verified product limits.
export const kling30Overrides: ModelPageOverrides = {
    "en-US": {
        intro: "Kling 3.0 on DramaCanvas turns text prompts and storyboard stills into movement shots and scene transitions for your short drama. New accounts get {signupCredits} credits to try Kling 3.0 free for about {freeCount} s at the cheapest setting without adding a card. Test your ideas at 720p, then assemble your generated clips directly on the canvas timeline.",
        controls:
            "Kling 3.0 outputs 720p or 1080p video from 3–15 seconds, or 3–30 seconds when using motion control with a reference video. Billed per second from {minCredits} credits to {maxCredits} credits depending on version and resolution, the card shows the exact credits before you generate.",
        sceneText:
            "Kling 3.0 is well suited for action and movement shots, character entrances and exits, and turning character stills into moving takes. Standard Kling 3.0 accepts two images as start and end frames to guide transitions between storyboard cards, while Kling 3.0 Turbo takes one start image. For guided movement, motion control lets you direct 3–30 second sequences following the motion of a reference video.",
        steps: [
            "Open the canvas and add a generation card, then pick Kling 3.0 or Kling 3.0 Turbo in the model selector.",
            "Write your action prompt in your own language, and attach reference images if your selected version supports them.",
            "Select 720p or 1080p and your clip duration, then check the card for the exact credits before clicking generate.",
            "Compare results side by side on the canvas, keep the good ones, and drag clips onto the timeline to edit your short drama.",
        ],
        faq: [
            {
                question: "What features are supported in Kling 3.0?",
                answer: "Kling 3.0 accepts 2 images as start/end frames, with 3–15 sec generation or 3–30 sec motion control. Turbo accepts only 1 start image and generates 3–15 sec.",
            },
            {
                question: "How does motion control work in Kling 3.0?",
                answer: "Kling 3.0 motion control supports 3–30 sec output; ordinary generation supports 3–15 sec. Confirm the selected settings and credit cost on the canvas before generating.",
            },
            {
                question: "Can I try Kling 3.0 free on DramaCanvas?",
                answer: "Yes, every new account receives {signupCredits} credits with no credit card required and no expiration date. That signup balance covers a short test of about {freeCount} s at the cheapest 720p setting. Higher resolutions like 1080p and longer clip durations cost more per second. You can buy credit packs or membership plans on the pricing page whenever you need more.",
            },
            {
                question: "How does Kling 3.0 pricing work on DramaCanvas?",
                answer: "Kling 3.0 pricing is billed per second of video based on the resolution and version you select. Rates range from {minCredits} credits to {maxCredits} credits per second at 720p, with 1080p costing more per second than 720p and Turbo priced differently from standard. The generation card shows the exact credits before you generate, and any failed generation returns its credits to your account.",
            },
            {
                question: "How to use Kling 3.0 to make an AI short drama?",
                answer: "You can paste your script onto the canvas to split it into storyboard cards, or add an individual generation card directly. Pick Kling 3.0 or Kling 3.0 Turbo, write your prompt in your own language, and attach reference images if your chosen version supports them. You can also use the Agent chat on the right side of the canvas to create cards and run generations conversationally.",
            },
            {
                question: "How do I write effective Kling 3.0 prompts?",
                answer: "Describe specific subject movement, camera framing, and lighting in your own language without unnecessary filler. Pairing your prompt with an approved character reference still or start and end frames helps guide transitions between storyboard cards. While reusing an approved character reference image helps maintain consistency, every shot still needs a human check.",
            },
            {
                question: "Can I connect my own Kling 3.0 API key with BYOK?",
                answer: "Yes, DramaCanvas allows you to bring your own API key to your workspace. When you use BYOK, the API provider that issued the user's key bills them directly, and DramaCanvas deducts no generation credits for those runs. A separate workspace service fee applies when using your own key.",
            },
            {
                question: "How do I keep character consistency across shots?",
                answer: "You can generate character stills with image models like Midjourney V7, Nano Banana, or GPT Image 2 on the same canvas, then use an approved image as the first frame for Kling 3.0. Reusing an approved character reference image helps keep visual details aligned, but every shot still needs a human check. Keep the good ones and drag your clips onto the timeline to build the scene sequence.",
            },
            {
                question: "Can I use Kling 3.0 video for commercial projects?",
                answer: "DramaCanvas is an independent platform, not the model developer and not an official partner of Kuaishou. For commercial rights and licensing terms, check Kuaishou's terms and DramaCanvas terms. Review both agreements before publishing or distributing your short drama commercially.",
            },
        ],
    },
    "zh-CN": {
        intro: "可灵 3.0（Kling 3.0）是快手推出的视频生成模型，在 DramaCanvas 单一画布上即可直接调用，用于制作短剧中的角色动作、人物出入场与镜头过渡。注册即可获得 {signupCredits} 积分，在最低配置下大约可体验 {freeCount} 秒视频，生成前卡片会明确显示所需积分。",
        controls: "Kling 3.0 与 Kling 3.0 Turbo 支持 720p 和 1080p 分辨率输出，视频按秒计费，最低档每秒需 {minCredits} 积分，最高档每秒为 {maxCredits} 积分。生成卡片在操作前会根据所选版本、画质与时长显示具体的积分数值。",
        sceneText:
            "在 AI 短剧创作中，可灵 3.0 适合生成具有连贯动作的动态镜头、角色进出场表现，以及将分镜静态人物图转换为动态视频。标准版支持传入首尾两张图片作为起止关键帧来把控镜头衔接过渡，也支持 3–30 秒跟随参考视频动作轨迹的动作控制；Turbo 版本则支持单张首帧图片生成 3–15 秒的镜头。",
        steps: [
            "登录 DramaCanvas 并打开画布，在工作区粘贴短剧剧本拆分为分镜卡片，或点击添加一张视频生成卡片。",
            "在卡片的模型选择器中选定 Kling 3.0 或 Kling 3.0 Turbo，并按版本需要上传首尾两张图片或单张首帧参考图。",
            "在输入框填写动作描述与镜头提示词，选定分辨率与时长，卡片上会在生成前直接显示本次所需的积分。",
            "点击生成按钮，多个片段会平铺在画布上方便对比挑选，满意的视频可直接拖入底部时间轴进行短剧剪辑。",
        ],
        faq: [
            {
                question: "Kling 3.0 具备哪些独特的功能？",
                answer: "Kling 3.0 支持 2 张图做首尾帧，常规生成 3–15 秒，运动控制 3–30 秒；Turbo 只支持 1 张首帧图，时长 3–15 秒。",
            },
            {
                question: "什么是可灵 3.0 的运动控制功能？",
                answer: "Kling 3.0 的运动控制模式支持 3–30 秒输出；常规生成时长为 3–15 秒。生成前可在画布确认所选规格与扣费。",
            },
            {
                question: "在 DramaCanvas 上怎么用 Kling 3.0 制作短剧镜头？",
                answer: "打开画布后添加生成卡片，在模型选择器中选择 Kling 3.0 或 Kling 3.0 Turbo。标准版支持输入提示词并添加首尾两张参考图片来控制起止过渡，Turbo 版本支持添加单张首帧图片。确认卡片上标明的设置与积分后点击生成，生成后的视频片段可以直接并排对比，并拖入时间轴完成剪辑。",
            },
            {
                question: "Kling 3.0 可以免费试用吗？",
                answer: "新用户注册 DramaCanvas 可获得 {signupCredits} 积分，无需绑定信用卡且积分没有有效期限。在最低分辨率与基础设置下，这些积分大约可体验生成 {freeCount} 秒视频。画布上的剧本编写与分镜卡片规划完全免费，如果某次视频生成失败，系统会自动退还扣除的积分。",
            },
            {
                question: "Kling 3.0 的生成价格和积分扣费规则是怎样的？",
                answer: "该模型在 DramaCanvas 上按视频生成秒数计费，最低档位每秒需 {minCredits} 积分，最高档位每秒为 {maxCredits} 积分。1080p 的每秒积分消耗高于 720p，Turbo 版本的价格档位也与标准版不同。每次点击生成前，卡片都会直接显示本次任务所需扣除的确切积分。",
            },
            {
                question: "制作 AI 短剧时，Kling 3.0 提示词怎么写更有效？",
                answer: "你可以直接在生成卡片中用中文撰写提示词，建议重点描述人物主体、具体的动作行为、出入场方向与镜头运镜方式。如果是镜头过渡，可以配合 Kling 3.0 的首尾帧功能，用提示词具体交代两个画面之间的位移与变化过程。如果你需要灵感，也可以在画布右侧的 Agent 对话框中用自然语言描述需求，让助手协助生成卡片与提示词。",
            },
            {
                question: "用可灵 3.0 生成短剧视频，如何保持人物长相一致？",
                answer: "你可以在画布上先使用 Nano Banana、GPT Image 2 或 Midjourney V7 等图像模型生成角色定妆照，再将该图作为 Kling 3.0 的首帧参考图。复用已确认的人物参考图有助于维持特征，但每个镜头仍需人工检查确认。多批次生成的结果会并列显示在画布上，方便你直观对比并挑出角色表现最稳定的一版。",
            },
            {
                question: "是否支持接入自己的 API Key（BYOK）使用 Kling 3.0？",
                answer: "支持。用户可以在设置中接入自己的 API Key（BYOK），此时生成费用由为你发放 Key 的 API 提供方直接计费，DramaCanvas 不扣除生成积分，仅收取独立的工作区服务费。如果你不想自己配置接口，也可以在平台购买会员计划或积分包，直接按需消耗积分进行创作。",
            },
            {
                question: "DramaCanvas 是快手官方的平台吗？生成的视频可以商用吗？",
                answer: "DramaCanvas 是一个独立的 AI 短剧与影片创作平台，并非快手（Kuaishou）官方，也不是其官方合作伙伴。关于生成视频的商用权限与合规要求，请查阅快手（Kuaishou）的使用条款与 DramaCanvas 的服务条款。除可灵系列外，画布上还集成了 Seedance 2.5、Seedance 2.0、Veo 3.1、MiniMax H3、Wan 3.0 等多种视频模型，并支持通过 DramaCanvas MCP 让外部 AI 助手驱动画布创作。",
            },
        ],
    },
    "zh-TW": {
        intro: "DramaCanvas 將快手開發的 Kling AI（可靈 3.0）整合至視覺化短劇畫布。台灣創作者可直接輸入繁體中文提示詞，透過文字或首尾影格生成角色動態與轉場鏡頭。新註冊即獲贈 {signupCredits} 點數，能立即在畫布上體驗影片生成。",
        controls:
            "支援 720p 與 1080p 解析度，最低規格每秒需 {minCredits} 點數，最高規格每秒需 {maxCredits} 點數，卡片在生成前會顯示確切點數。新帳號贈送的 {signupCredits} 點數在最低規格下可測試 {freeCount} 秒影片，建議先以 720p 生成預覽，滿意後再切換為 1080p 重新產出。",
        sceneText:
            "Kling 3.0 適合製作短劇中的角色動作與走位鏡頭，例如人物進出場或大幅度的肢體表演。利用首尾影格功能，創作者能將兩張分鏡圖串接成連貫的過渡畫面，或將單張角色靜態圖轉換為動態畫面。搭配動作控制模式（motion control），更可依照參考影片的動作軌跡生成 3–30 秒的角色動態。",
        steps: [
            "註冊或登入 DramaCanvas 後開啟畫布，可在畫布貼上短劇劇本並拆解成分鏡卡片，亦可使用右側 Agent 對話協助建立結構。",
            "在畫布中新增生成卡片，於模型選單選取 Kling 3.0 或 Kling 3.0 Turbo，並在卡片中輸入繁體中文提示詞，亦可上傳角色參考圖或首尾影格。",
            "設定 720p 或 1080p 解析度與生成秒數，卡片在點擊生成前會標明所需扣除的確切點數。",
            "點擊生成後，產出的影片片段會並排顯示於畫布上以利比對，滿意的鏡頭可直接拖入時間軸進行短劇剪輯，或作為下一段畫面的首格。",
        ],
        faq: [
            {
                question: "Kling 3.0（可靈 3.0）具備哪些特色功能？",
                answer: "Kling 3.0 支援 2 張圖做首尾影格，一般生成 3–15 秒，運動控制 3–30 秒；Turbo 只支援 1 張首影格圖，時長 3–15 秒。",
            },
            {
                question: "什麼是可靈 3.0 的運動控制功能？",
                answer: "Kling 3.0 的運動控制模式支援 3–30 秒輸出；一般生成時長為 3–15 秒。生成前可在畫布確認所選規格與扣款。",
            },
            {
                question: "在台灣使用 Kling AI（可靈 3.0）需要註冊國際版帳號嗎？",
                answer: "不需要。台灣用戶直接在 DramaCanvas 畫布即可使用快手開發的 Kling 3.0 與 Kling 3.0 Turbo，介面支援繁體中文，提示詞也能直接輸入繁體中文。畫布規劃與劇本整理完全免費，無需繁瑣的跨區帳號設定。",
            },
            {
                question: "Kling AI 免費額度有多少？在 DramaCanvas 上的 Kling AI 費用如何計算？",
                answer: "新帳號註冊即可獲得 {signupCredits} 點數，無需綁卡也沒有使用期限，在 720p 最低規格下可體驗 {freeCount} 秒影片生成。DramaCanvas 的 Kling 模型依影片秒數計費，最低規格每秒收取 {minCredits} 點數，最高規格每秒收取 {maxCredits} 點數。卡片在生成前會清楚標示確切點數，若生成失敗點數會自動退回。",
            },
            {
                question: "新手製作短劇時，Kling AI 教學上有哪些推薦的提示詞與鏡頭操作技巧？",
                answer: "建議以繁體中文清楚描述主體、具體肢體動作與攝影機運鏡（如推鏡或跟隨），避免空泛的修飾詞。若追求鏡頭前後連貫，可使用 Kling 3.0 的首尾影格功能，分別上傳起始圖與結束圖，由模型生成兩張分鏡之間的過渡。首次測試鏡頭時建議先設定 720p 節省點數，確認動態符合要求後，再以 1080p 重新生成最終片段。",
            },
            {
                question: "在 DramaCanvas 製作連續短劇時，如何維持 Kling 3.0 生成角色的外觀一致性？",
                answer: "在畫布的生成卡片中重複引用已經核准的角色參考圖，有助於維持面貌與服裝的穩定度。但現階段每顆生成的鏡頭仍必須由人工親自檢查與把關，無法保證絕對一致。滿意的鏡頭可以直接作為時間軸上下一鏡的首格畫面，或使用同畫布上的圖片模型先產生標準定裝照。",
            },
            {
                question: "如果已有 API 金鑰，可以在 DramaCanvas 使用自備金鑰（BYOK）跑 Kling 3.0 嗎？",
                answer: "可以。用戶可以在 DramaCanvas 串接自備金鑰（BYOK，即串接您自己的 API 金鑰），此時生成費用由發行該金鑰的 API 提供商直接向您計費，DramaCanvas 不會扣除生成點數，僅收取獨立的畫布空間服務費。此外，團隊亦可透過 DramaCanvas MCP 讓外部 AI 助手驅動畫布與模型生成。",
            },
            {
                question: "在 DramaCanvas 上產出的 Kling 3.0 影片可以商業使用嗎？DramaCanvas 與快手是官方合作夥伴嗎？",
                answer: "DramaCanvas 為獨立創作平台，並非模型開發商快手，亦非其官方合作夥伴。生成的短劇影片是否能進行商業使用，請查閱快手與 DramaCanvas 的服務條款。畫布上的劇本編寫與分鏡排版均為免費，用戶可自由匯出完成的短劇內容。",
            },
        ],
    },
    "zh-HK": {
        intro: "在 DramaCanvas 上使用快手 Kling 3.0（可靈 3.0）與 Kling 3.0 Turbo，可直接將分鏡轉化為動作與運鏡畫面。卡片支援文字生成與首尾幀控制，生成前清楚顯示所需點數。新註冊即送 {signupCredits} 點數且免綁信用卡，在同一畫布上即可展開 AI 短劇創作。",
        controls: "模型提供 720p 與 1080p 解析度，依影片秒數計費，最低每秒需 {minCredits} 點數，最高規格每秒需 {maxCredits} 點數。Kling 3.0 一般生成與 Kling 3.0 Turbo 支援 3–15 秒，Kling 3.0 動態控制則支援 3–30 秒，生成卡片會在送出前顯示確切扣除點數。",
        sceneText:
            "在短劇製作中，Kling 3.0 特別適合處理角色進出場、肢體動作及運鏡銜接等動態鏡頭。你可以將角色靜態圖作為起始幀轉為動態畫面，或利用 Kling 3.0 的首尾幀功能串聯兩個分鏡，使相鄰鏡頭的過渡更符合劇情走勢。若需要特定肢體運動，亦可透過動態控制參考影片精確引導角色動作。",
        steps: [
            "登入後開啟畫布，點擊新增生成卡片，或將劇本貼上並拆分成多張分鏡卡片。",
            "在卡片的模型選取器中挑選 Kling 3.0 或 Kling 3.0 Turbo，並依需求設定 720p 或 1080p 解析度。",
            "以你習慣的語言輸入提示詞，若使用 Kling 3.0 可上傳首尾兩張參考圖，卡片會即時顯示所需點數。",
            "點擊生成，完成的影片片段會並排顯示於畫布供你比對，滿意的片段即可直接拖入時間軸剪輯短劇。",
        ],
        faq: [
            {
                question: "可靈 Kling 3.0 具備哪些特色功能？",
                answer: "Kling 3.0 支援 2 張圖做首尾幀，一般生成 3–15 秒，運動控制 3–30 秒；Turbo 只支援 1 張首幀圖，時長 3–15 秒。",
            },
            {
                question: "甚麼是可靈 3.0 的運動控制功能？",
                answer: "Kling 3.0 的運動控制模式支援 3–30 秒輸出；一般生成時長為 3–15 秒。生成前可在畫布確認所選規格與扣費。",
            },
            {
                question: "Kling 3.0 可以免費試用嗎？新用戶有哪些額度？",
                answer: "新帳號註冊後即可獲得 {signupCredits} 點數，不需綁定信用卡且無使用期限。以 720p 最低設定計算，這筆額度約可免費試生成 {freeCount} 秒影片。若切換至 1080p 或不同版本，每秒所需點數會增加，建議先以 720p 測試鏡頭效果，滿意後再生成高解析度版本。",
            },
            {
                question: "Kling 3.0 收費方式如何計算？",
                answer: "在 DramaCanvas 上使用 Kling 3.0 是按影片秒數計費，最低每秒需 {minCredits} 點數，最高規格每秒需 {maxCredits} 點數。1080p 的每秒費用高於 720p，而 Kling 3.0 Turbo 與標準版定價亦有所不同。卡片在點擊生成前會明確顯示所需點數，若生成失敗系統會自動退還該次點數；需要更多點數可至定價頁面選購方案或點數包。",
            },
            {
                question: "新手製作短劇的 Kling 3.0 教學與基本流程是什麼？",
                answer: "登入畫布後，你可以先貼上劇本並拆分為分鏡卡片，接著加入生成卡片並選取 Kling 3.0 或 Turbo 版本。以常用語言填寫提示詞，並可上傳參考圖作為起始或結束幀。卡片生成後，成果會直接在畫布並排呈現，方便你比對挑選並將優質片段拖入時間軸完成剪輯；亦可使用右側的 Agent 對話框由 AI 協助建立卡片並執行生成。",
            },
            {
                question: "製作 AI 短劇時，如何維持 Kling 3.0 生成角色的外貌一致？",
                answer: "在不同卡片中重複引用經確認的角色參考圖有助於穩定外觀，但在連續鏡頭中，每個生成鏡頭仍需要人工檢查確認。你也可以先使用畫布上的影像模型生成理想的角色定格，再將其作為 Kling 3.0 的起始幀轉換為動態鏡頭。若結果不理想，可保留良好畫面並在同畫布上微調提示詞重新生成。",
            },
            {
                question: "如果我有自己的 API 金鑰，可以在 DramaCanvas 上使用嗎？",
                answer: "可以，平台支援自備金鑰（BYOK，即使用自己的 API 金鑰）。連接金鑰後，將由發行該金鑰的 API 提供商直接向你收費，DramaCanvas 不會扣除生成點數，僅收取獨立的畫布工作區服務費。畫布上的劇本編寫與分鏡排版功能始終免費，適合已有大量生成需求的工作室。",
            },
            {
                question: "使用 Kling 3.0 生成的短劇片段可以用於商業發布嗎？",
                answer: "商業用途授權請查閱快手與 DramaCanvas 的服務條款。DramaCanvas 為獨立創作平台，並非模型開發商亦非官方合作夥伴。我們提供整合劇本、分鏡、圖像與影片剪輯的畫布環境，協助創作者流暢調度各類生成工具。",
            },
            {
                question: "Kling 3.0 支援哪些參考素材輸入？可以輸入語音或任意參考影片嗎？",
                answer: "Kling 3.0 除了動態控制功能可上傳一段參考影片以引導動作外，不支援其他參考影片或音訊輸入。模型支援文字生成影片，標準版可使用兩張圖片作為首尾幀，Turbo 版則支援一張起始圖。若希望透過外部 AI 助手自動化操作畫布，亦可串接 DramaCanvas MCP 進行調用。",
            },
        ],
    },
    "ja-JP": {
        intro: "Kling 3.0は、Kuaishouが開発したAI動画生成モデルです。DramaCanvasでは絵コンテから直接呼び出し、人物のアクションや場面転換のカットを手軽に生成できます。登録時の{signupCredits}クレジットを使えば、ブラウザ上ですぐにお試しいただけます。",
        controls: "解像度は720pと1080pに対応し、最低解像度では1秒あたり{minCredits}クレジットから{maxCredits}クレジットで生成できます。動画の長さやバージョン、解像度に応じて消費クレジットは変動し、生成カード上に正確な数値が事前に表示されます。",
        sceneText:
            "ショートドラマ制作では、人物のアクションや入退場、キャラクター静止画を動かすカットの生成に適しています。Kling 3.0なら開始フレームと終了フレームの2枚の画像を指定し、絵コンテ間の自然な場面転換をそのまま動画化できます。まずは720pでテスト生成し、採用したテイクを1080pで本番出力する流れが効果的です。",
        steps: [
            "キャンバスを開いて脚本を入力し、絵コンテカードに分割するか、右側のエージェントチャットから生成カードを追加します。",
            "モデル選択でKling 3.0またはKling 3.0 Turboを選び、プロンプトを入力して必要な参照画像を設定します。",
            "解像度と秒数を指定すると生成カード上に必要なクレジットが表示されるので、確認して生成ボタンを押します。",
            "生成結果がキャンバス上に並んで表示されたら良いテイクを選び、タイムラインに配置してショートドラマを編集します。",
        ],
        faq: [
            {
                question: "Kling 3.0（可霊）にはどのような独自機能がありますか？",
                answer: "Kling 3.0は開始・終了画像2枚に対応。通常生成は3–15秒、モーション制御は3–30秒です。Turboは開始画像1枚のみ対応し、3–15秒の動画を生成します。",
            },
            {
                question: "Kling 3.0のモーションコントロール機能とは何ですか？",
                answer: "Kling 3.0のモーション制御は3–30秒、通常生成は3–15秒に対応します。生成前にキャンバスで設定と消費クレジットを確認できます。",
            },
            {
                question: "Kling AIとはどこの国のサービスですか？開発元や読み方も知りたいです。",
                answer: "Kling（読み方：クリング、可灵）は、中国のKuaishou（快手）が開発した動画生成AIモデルです。DramaCanvasは独立した制作プラットフォームであり、キャンバス上でKling 3.0およびKling 3.0 Turboを活用したショートドラマ制作が可能です。",
            },
            {
                question: "Kling AIの料金体系や無料クレジットの仕組みはどうなっていますか？",
                answer: "DramaCanvasでは脚本執筆や絵コンテの配置は無料で行え、動画生成カードでのみクレジットを消費します。最低解像度の場合は1秒あたり{minCredits}クレジットから{maxCredits}クレジットで生成でき、新規登録時に付与される{signupCredits}クレジットを使えば、最安設定で約{freeCount}クレジット秒のテスト生成が可能です。解像度やバージョンによって必要な消費量は変わるため、継続的な制作には料金ページの有料プランや追加パックをご検討ください。",
            },
            {
                question: "Kling AIの使い方や動画生成の手順を教えてください。",
                answer: "キャンバス上で生成カードを追加し、モデル選択でKling 3.0またはKling 3.0 Turboを指定してプロンプトを入力します。必要に応じて開始画像や終了画像を設定し、カードに表示されるクレジットを確認したうえで生成を実行します。完成した動画はキャンバス上に並んで出力されるため、仕上がりを比較しながらそのままタイムラインへ配置できます。",
            },
            {
                question: "Kling AIは日本語でのプロンプト入力や操作に対応していますか？",
                answer: "はい、プロンプトはお手元の日本語でそのまま入力して動画を生成できます。DramaCanvasのインターフェースも日本語に対応しているため、迷わず直感的に操作を進められます。右側のエージェントチャットでも日本語で相談しながら、カードの追加や生成指示を行うことが可能です。",
            },
            {
                question: "Kling AIの危険性や安全性、商用利用について教えてください。",
                answer: "DramaCanvasはKuaishouの公式パートナーではなく独立したサービスですが、正規のAPI連携を通じて安全に動画生成を提供しています。生成が途中で失敗した場合はクレジットが自動で返却される仕様となっています。なお、商用利用の可否や適用条件については、Kuaishouの利用規約およびDramaCanvasの利用規約をご確認ください。",
            },
            {
                question: "自分のAPIキーを持ち込むBYOK接続とはどのような仕組みですか？",
                answer: "BYOK（ご自身のAPIキー接続）をご利用の場合、キーを発行したAPIプロバイダーから直接利用料が請求され、DramaCanvas側の生成クレジットは消費されません。DramaCanvas側では別途ワークスペースのサービス料のみが適用されます。すでにAPIキーをお持ちの方や、外部開発環境と合わせて利用したい場合に適しています。",
            },
        ],
    },
    "ko-KR": {
        intro: "DramaCanvas에서 Kuaishou의 클링 3.0(Kling 3.0)과 클링 3.0 Turbo로 숏폼 드라마 영상을 제작해보세요. 가입 시 지급되는 {signupCredits} 크레딧으로 최저 설정 기준 약 {freeCount}초 분량을 무료로 테스트할 수 있습니다. 각본 작성부터 콘티 구성, 비디오 생성까지 한 캔버스에서 모두 진행됩니다.",
        controls: "영상 길이에 따라 초당 과금되며, 최저 해상도 기준 초당 {minCredits} 크레딧부터 최고 {maxCredits} 크레딧이 차감됩니다. 1080p는 720p보다 초당 크레딧이 더 들며, 생성 카드에서 필요한 크레딧을 사전에 정확히 확인할 수 있습니다.",
        sceneText:
            "숏폼 드라마에서 인물의 등장과 퇴장, 역동적인 액션 및 움직임이 큰 장면을 연출할 때 유용합니다. 인물 정지 이미지를 생동감 있는 영상 샷으로 전환하거나, 시작 프레임과 종료 프레임 이미지를 연결해 두 콘티 장면 사이의 자연스러운 전환 샷을 만들기 좋습니다.",
        steps: [
            "캔버스를 열고 각본을 붙여넣어 스토리보드 카드로 나누거나, 빈 캔버스에서 바로 기획을 시작합니다.",
            "생성 카드를 추가한 후 모델 선택기에서 Kling 3.0 또는 Kling 3.0 Turbo 버전을 선택합니다.",
            "한국어로 프롬프트를 입력하고 필요한 참조 이미지를 첨부하면, 카드에서 해상도 설정과 차감 크레딧을 바로 확인합니다.",
            "생성 버튼을 누르면 결과 영상이 캔버스에 나란히 배치되며, 마음에 드는 클립을 타임라인으로 보내 편집합니다.",
        ],
        faq: [
            {
                question: "Kling 3.0(클링 3.0)은 어떤 차별화된 기능들을 갖추고 있나요?",
                answer: "Kling 3.0은 시작·종료 이미지 2장을 지원하며 일반 생성은 3–15초, 모션 제어는 3–30초예요. Turbo는 시작 이미지 1장만 지원하며 길이는 3–15초예요.",
            },
            {
                question: "클링 3.0의 모션 컨트롤 기능이란 무엇인가요?",
                answer: "Kling 3.0의 모션 제어는 3–30초, 일반 생성은 3–15초를 지원해요. 생성 전에 캔버스에서 선택한 설정과 크레딧 비용을 확인할 수 있어요.",
            },
            {
                question: "클링 3.0(Kling 3.0)은 어떤 AI 비디오 모델인가요?",
                answer: "Kuaishou에서 개발한 비디오 생성 모델로, DramaCanvas에서는 클링 3.0과 클링 3.0 Turbo 버전을 지원합니다. 텍스트 프롬프트로 영상을 만들거나 시작 및 종료 프레임 이미지를 사용해 샷을 생성할 수 있습니다. 720p와 1080p 해상도를 제공하며 일반 생성 기준 3초에서 15초 길이의 영상을 제작할 수 있습니다.",
            },
            {
                question: "클링 ai 무료 체험이 가능한가요?",
                answer: "신규 계정 가입 시 카드 등록 없이 유효기간 없는 {signupCredits} 크레딧이 1회 지급됩니다. 이 크레딧으로 최저 해상도 설정 기준 약 {freeCount}초 분량의 영상을 무료로 테스트할 수 있습니다. 캔버스에서 각본을 작성하고 스토리보드를 배치하는 기획 단계는 크레딧 차감 없이 무료입니다.",
            },
            {
                question: "클링 ai 가격과 크레딧 차감 방식은 어떻게 되나요?",
                answer: "영상 길이에 따라 초당 과금되며 최저 해상도 기준 초당 {minCredits} 크레딧에서 최고 {maxCredits} 크레딧이 차감됩니다. 1080p는 720p보다 초당 크레딧이 더 소진되며 Turbo 버전도 표준 버전과 다른 요율이 적용됩니다. 생성 카드에서 설정을 바꿀 때마다 필요한 크레딧이 사전에 정확히 표시되며 생성이 실패하면 해당 크레딧은 반환됩니다.",
            },
            {
                question: "DramaCanvas에서 클링 ai 사용법과 프롬프트 작성 팁은 무엇인가요?",
                answer: "캔버스에 생성 카드를 추가하고 한국어로 원하는 인물의 동작과 카메라 움직임을 구체적으로 작성하면 됩니다. 비용을 절약하려면 먼저 720p 해상도로 테스트 생성을 해본 뒤 마음에 드는 컷을 골라 1080p로 다시 생성하는 방식을 추천합니다. 우측 에이전트 채팅을 통해 대화로 카드를 만들고 생성을 지시할 수도 있습니다.",
            },
            {
                question: "숏폼 드라마 제작 시 인물 일관성은 어떻게 유지하나요?",
                answer: "캔버스에서 이미지 모델로 캐릭터 이미지를 생성한 뒤 이를 클링의 시작 프레임으로 연결하면 연속성 있는 샷을 만들 수 있습니다. 승인된 인물 참조 이미지를 지속적으로 재사용하면 일관성 유지에 도움이 됩니다. 다만 AI 모델 특성상 매 컷마다 미세한 차이가 발생할 수 있으므로 모든 샷은 직접 검토해야 합니다.",
            },
            {
                question: "자체 API 키(BYOK)를 연결해 사용할 수도 있나요?",
                answer: "자체 API 키(BYOK)를 연결하면 DramaCanvas 생성 크레딧 차감 없이 작업을 진행할 수 있습니다. 이 경우 영상 생성 비용은 API 키를 발급한 제공업체에서 직접 청구하며 DramaCanvas에서는 별도의 워크스페이스 서비스 수수료만 부과됩니다.",
            },
            {
                question: "클링 3.0으로 생성한 영상을 상업적으로 이용할 수 있나요?",
                answer: "DramaCanvas는 독립적인 플랫폼이며 모델 개발사의 공식 파트너가 아닙니다. 생성된 비디오의 상업적 이용 가능 여부는 Kuaishou의 이용 약관과 DramaCanvas 이용 약관을 직접 확인하셔야 합니다.",
            },
        ],
    },
    "es-ES": {
        intro: "Genera clips cinematográficos con Kling AI en DramaCanvas, integrando guion, viñetas y video en un solo lienzo. Elige entre Kling 3.0 y Kling 3.0 Turbo para animar fotogramas clave o dirigir tomas con control de movimiento. Puedes probar Kling AI gratis con los {signupCredits} créditos de bienvenida antes de producir tus escenas en 1080p.",
        controls:
            "El consumo se factura por segundo de video, desde {minCredits} créditos en 720p hasta {maxCredits} créditos según la versión y resolución seleccionadas. La tarjeta de generación muestra los ajustes y los créditos exactos antes de generar.",
        sceneText:
            "En dramas cortos, Kling 3.0 es ideal para tomas de acción, entradas y salidas de personajes y transiciones fluidas a partir de una imagen estática. Con la versión estándar puedes definir fotogramas de inicio y fin para encadenar dos momentos clave del guion gráfico. Si necesitas reproducir un desplazamiento específico de cámara o personaje, su modo de control de movimiento sigue la trayectoria de un video de referencia.",
        steps: [
            "Inicia sesión en DramaCanvas, abre el lienzo y crea una tarjeta de generación o divide tu guion en tarjetas de guion gráfico.",
            "Abre el selector de modelos, elige Kling 3.0 o Kling 3.0 Turbo y define la resolución en 720p o 1080p.",
            "Escribe tu prompt en tu propio idioma y añade imágenes de inicio o fin según la versión elegida, comprobando los créditos exactos en la tarjeta.",
            "Haz clic en generar para comparar las tomas lado a lado en el lienzo, guarda las mejores y envíalas a la línea de tiempo para montar tu drama corto.",
        ],
        faq: [
            {
                question: "¿Qué funciones y versiones ofrece Kling 3.0 en DramaCanvas?",
                answer: "Kling 3.0 acepta 2 imágenes como fotogramas inicial/final, con generación de 3–15 s o control de movimiento de 3–30 s. Turbo acepta solo 1 imagen inicial y genera vídeos de 3–15 s.",
            },
            {
                question: "¿En qué consiste el control de movimiento de Kling AI?",
                answer: "El control de movimiento de Kling 3.0 admite salidas de 3–30 s; la generación normal admite 3–15 s. Consulta los ajustes y el coste en créditos en el lienzo antes de generar.",
            },
            {
                question: "¿Cómo puedo probar Kling AI gratis en español?",
                answer: "Al registrarte en DramaCanvas recibes {signupCredits} créditos de bienvenida sin ingresar tarjeta bancaria ni fecha de caducidad. Este saldo inicial cubre una prueba corta de unos {freeCount} s en el ajuste más económico de 720p, a {minCredits} créditos por segundo. Lo más recomendable es evaluar la toma en 720p y luego regenerar la versión elegida en 1080p.",
            },
            {
                question: "¿Qué tipo de escenas conviene generar con Kling AI video en un drama corto?",
                answer: "Kling 3.0 destaca en tomas dinámicas de acción, desplazamientos, entradas y salidas de escena, así como en transformar imágenes fijas de personajes en video. En la versión Kling 3.0 estándar puedes cargar dos imágenes como fotogramas de inicio y fin para controlar la transición exacta entre planos del guion gráfico. Los resultados aparecen juntos en el lienzo para compararlos y enviarlos directamente a la línea de tiempo.",
            },
            {
                question: "¿Cuánto cuesta generar videos con Kling 3.0 y qué ocurre si una toma falla?",
                answer: "El consumo se calcula por segundo de video, comenzando en {minCredits} créditos en 720p y llegando hasta {maxCredits} créditos por segundo en resoluciones más altas o según la variante utilizada. Antes de generar, la tarjeta muestra los créditos exactos que requiere la toma. Si una generación no se completa con éxito, el sistema devuelve los créditos automáticamente.",
            },
            {
                question: "¿Existe una app de Kling AI o se puede utilizar mediante un asistente?",
                answer: "DramaCanvas funciona directamente en el navegador como un lienzo unificado para guiones, guion gráfico y video. En el lateral derecho dispones de un chat con un asistente virtual (Agent) capaz de crear tarjetas y ejecutar generaciones a partir de una conversación. Además, puedes conectar asistentes externos para controlar el lienzo a través de DramaCanvas MCP.",
            },
            {
                question: "¿Cómo se asegura la consistencia de los personajes a lo largo del cortometraje?",
                answer: "Reutilizar una imagen aprobada del personaje como fotograma inicial ayuda a mantener su aspecto entre tomas, aunque cada clip requiere supervisión humana. Dentro del mismo lienzo puedes generar estas imágenes previas con modelos como Midjourney V7, Nano Banana o GPT Image 2. Una vez que apruebas un fotograma, puedes usarlo como fotograma inicial en Kling 3.0 para darle movimiento.",
            },
            {
                question: "¿Puedo usar mi propia clave con BYOK y comercializar mis videos?",
                answer: "Con la modalidad BYOK (usar tu propia clave de API), el proveedor de la API que emitió tu clave te factura directamente y DramaCanvas no descuenta créditos de generación, aplicando solo una tarifa por el servicio del espacio de trabajo. DramaCanvas es una plataforma independiente y no es el desarrollador del modelo ni un socio oficial de Kuaishou. Para cualquier uso comercial de tus piezas, te recomendamos revisar los términos de Kuaishou y los términos de DramaCanvas.",
            },
        ],
    },
    "pt-BR": {
        intro: "Produza cenas para curtas e minidramas com o Kling 3.0 diretamente no DramaCanvas. O modelo gera vídeos a partir de texto ou imagens de referência, com suporte a controle de movimento e quadros inicial e final. Cadastre-se para testar com {signupCredits} créditos gratuitos, com custos a partir de {minCredits} créditos por segundo.",
        controls:
            "O consumo em 720p varia de {minCredits} créditos a {maxCredits} créditos por segundo conforme a versão, sendo a resolução 1080p cobrada com valor maior por segundo. O card de geração sempre exibe a quantidade exata de créditos antes do envio.",
        sceneText:
            "O Kling 3.0 é indicado para tomadas de ação e movimentação de personagens em minidramas, como entradas e saídas de cena. Você pode animar uma imagem estática do personagem ou usar imagens de início e fim para guiar transições visuais entre dois quadros do storyboard. A versão com controle de movimento também permite replicar o deslocamento de um vídeo de referência.",
        steps: [
            "Abra o canvas e clique para adicionar um card de geração, ou cole seu roteiro para dividi-lo em cards de storyboard.",
            "Acesse o seletor de modelos no card, escolha Kling 3.0 ou Kling 3.0 Turbo e defina a resolução entre 720p e 1080p.",
            "Digite a descrição da cena em português e anexe as imagens de início ou fim suportadas pela versão escolhida.",
            "Confira os créditos no card, clique em gerar e visualize os vídeos gerados lado a lado no canvas antes de arrastá-los para a linha do tempo.",
        ],
        faq: [
            {
                question: "Quais recursos e funções o Kling 3.0 oferece no DramaCanvas?",
                answer: "Kling 3.0 aceita 2 imagens como quadros inicial/final, com geração de 3–15 s ou controle de movimento de 3–30 s. Turbo aceita apenas 1 imagem inicial e gera vídeos de 3–15 s.",
            },
            {
                question: "Como funciona o recurso de controle de movimento do Kling 3.0?",
                answer: "O controle de movimento do Kling 3.0 aceita saídas de 3–30 s; a geração normal aceita 3–15 s. Confira os ajustes e o custo em créditos no canvas antes de gerar.",
            },
            {
                question: "Como testar o Kling AI grátis no DramaCanvas?",
                answer: "Você só precisa fazer login ou criar sua conta no DramaCanvas para receber {signupCredits} créditos gratuitos, sem precisar cadastrar cartão de crédito. Esse saldo permite testar cerca de {freeCount} s de vídeo na configuração mais econômica em 720p. Como as versões e a resolução 1080p consomem mais créditos por segundo, recomendamos fazer seu primeiro teste nas opções padrão.",
            },
            {
                question: "Qual é o preço para gerar vídeos com o Kling 3.0?",
                answer: "A cobrança no DramaCanvas é calculada por segundo de vídeo gerado. Na resolução 720p, o valor varia entre {minCredits} créditos e {maxCredits} créditos por segundo, de acordo com a versão selecionada, enquanto o formato 1080p tem custo superior por segundo. O card de geração sempre mostra os créditos exatos antes de você confirmar a criação.",
            },
            {
                question: "Quais versões do Kling AI estão disponíveis e qual devo escolher?",
                answer: "O DramaCanvas oferece as versões Kling 3.0 e Kling 3.0 Turbo. A versão Kling 3.0 permite gerar de 3 a 15 segundos em modo comum, de 3 a 30 segundos com controle de movimento e aceita duas imagens como quadros inicial e final. Já o Kling 3.0 Turbo gera de 3 a 15 segundos, aceita uma imagem inicial e possui uma tabela de créditos diferente.",
            },
            {
                question: "Como usar o Kling AI no modo imagem para vídeo (image to video)?",
                answer: "Você pode carregar uma imagem gerada previamente no canvas para servir como primeiro quadro da sua tomada em vídeo. No Kling 3.0 convencional, também é possível adicionar uma segunda imagem para definir o quadro final, criando uma transição visual entre dois quadros do storyboard. O Kling 3.0 Turbo trabalha com uma única imagem como ponto de partida.",
            },
            {
                question: "Posso escrever prompts em português para o Kling 3.0?",
                answer: "Sim, você pode descrever suas cenas e ações diretamente em português dentro do card de geração no DramaCanvas. O sistema aceita instruções no seu idioma nativo tanto nos cards quanto no chat do Agent lateral, que pode configurar e disparar as gerações para você. Para orientar a tomada, descreva a ação do personagem, o cenário e os movimentos de câmera com clareza.",
            },
            {
                question: "Existe um app do Kling AI para baixar ou tudo roda no navegador?",
                answer: "O DramaCanvas funciona diretamente no navegador em computadores e celulares, sem necessidade de baixar aplicativos, arquivos apk ou instalar extensões. Toda a produção de roteiro, storyboard, imagens e edição na linha do tempo acontece no mesmo canvas online. Assistentes de IA externos também podem interagir com a plataforma através do DramaCanvas MCP.",
            },
            {
                question: "Posso usar minha própria chave de API (BYOK) e comercializar os vídeos?",
                answer: "Sim, você pode conectar sua própria chave de API via BYOK no DramaCanvas. Quando utiliza sua chave, o provedor da API que emitiu sua credencial faz a cobrança diretamente e o DramaCanvas não desconta créditos de geração, aplicando somente a taxa de serviço do espaço de trabalho. Para uso comercial das obras criadas, consulte os termos da Kuaishou e os termos do DramaCanvas.",
            },
        ],
    },
};

export default kling30Overrides;
