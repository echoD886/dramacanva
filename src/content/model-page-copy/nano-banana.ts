import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Prices only via tokens filled from the live catalog.
export const nanoBananaOverrides: ModelPageOverrides = {
    "en-US": {
        intro: "Make storyboard frames, character design sheets, and scene stills with Google's Nano Banana model family on DramaCanvas. New accounts get {signupCredits} credits with no credit card required, covering up to {freeCount} images at {minCredits} credits each to test your story ideas. Select your version, compare shots directly on the canvas, and hand approved frames off to video models.",
        controls:
            "Select 1K, 2K, or 4K resolution on your card, with generation costs ranging from {minCredits} credits to {maxCredits} credits per image. The card shows the required credits before you click generate, and Nano Banana Pro costs slightly more than Nano Banana 2 or 2.1 at matching resolutions.",
        sceneText:
            "In short drama workflows, Nano Banana is well suited for generating character design sheets, posters and episode covers, prop close-ups, and scene stills. You can attach an existing visual as a reference image to alter lighting, adjust outfits, or shift backgrounds across storyboard shots. Once you finish an image, you can use it as the first frame for video models like Seedance 2.5, Kling 3.0, or Veo 3.1 on the same canvas.",
        steps: [
            "Open the canvas, paste your script to divide it into storyboard cards, or click to add a generation card.",
            "Click the model selector to choose Nano Banana 2, 2.1, or Nano Banana Pro, then pick 1K, 2K, or 4K resolution.",
            "Type your shot prompt in your own language, attach reference images if supported by that version, and check the credit total shown on the card.",
            "Click generate to see your results appear side by side on the canvas, then send your selected image to a video model or the timeline.",
        ],
        faq: [
            {
                question: "Can I try Nano Banana free on DramaCanvas?",
                answer: "Every new account receives {signupCredits} credits upon registration, without needing a payment card. That welcome balance covers up to {freeCount} images at {minCredits} credits each when using base settings, though larger resolutions and advanced versions use more credits. Arranging script cards and planning your storyboard on the canvas is completely free.",
            },
            {
                question: "How does Nano Banana pricing work on DramaCanvas?",
                answer: "Image generation costs start at {minCredits} credits and reach up to {maxCredits} credits per image depending on the version and output resolution you choose. The generation card shows the exact credit requirement before you run the prompt, so you know the cost upfront. If a generation fails for any reason, the system automatically returns those credits to your balance.",
            },
            {
                question: "What is the difference between Nano Banana 2, 2.1, and Nano Banana Pro?",
                answer: "All three options are Google image generation models that support 1K, 2K, and 4K outputs on the canvas. Nano Banana 2 and 2.1 provide an economical option for fast storyboard sketching and scene staging starting at {minCredits} credits per image. Nano Banana Pro is designed for hero assets like character sheets and posters, and it uses a slightly higher credit amount at matching sizes.",
            },
            {
                question: "How to use Nano Banana on DramaCanvas for short drama production?",
                answer: "Open your project canvas, add a generation card, and select your preferred Nano Banana version from the model picker. Type your prompt, and generate frames that sit side by side on the canvas for easy comparison. Once you approve a frame, you can set it as the starting frame for video models like Seedance 2.5, Kling 3.0, or Veo 3.1.",
            },
            {
                question: "How should I write Nano Banana prompts for character consistency?",
                answer: "Write specific prompts in your preferred language describing clothing, lighting, expression, and environment in detail. For versions that support visual inputs, attach an approved character reference image to maintain clothing and face details across multiple angles. Even with reference images, character consistency across an AI short drama requires a human creator to review each frame.",
            },
            {
                question: "Can I use my own Nano Banana API key with BYOK?",
                answer: "Yes, DramaCanvas offers BYOK so you can connect your personal Google API key directly to the workspace. When you use your own key, Google bills you directly for generation usage, and DramaCanvas deducts zero generation credits. A separate workspace service fee applies to cover canvas editing and project storage.",
            },
            {
                question: "When should I choose Nano Banana Pro over standard versions?",
                answer: "Choose Nano Banana Pro when you need detailed assets such as character sheets, promotional posters, or hero prop close-ups. Pro costs slightly more credits per image than Nano Banana 2 or 2.1, scaling up to {maxCredits} credits per image for higher resolutions. Many creators storyboard scene concepts with Nano Banana 2 and switch to Pro for critical showcase frames.",
            },
            {
                question: "Can AI assistants or MCP control Nano Banana generations on the canvas?",
                answer: "Yes, you can use the built-in Agent chat on the right side of the canvas to create cards and run generations through normal conversation. Additionally, external AI assistants can interact with your workspace through DramaCanvas MCP. This lets you automate prompt staging and card management while keeping your visual assets organized on one board.",
            },
            {
                question: "Can I use images generated with Nano Banana for commercial short dramas?",
                answer: "DramaCanvas is an independent platform and is not the model developer or an official partner of Google. DramaCanvas does not claim ownership of your generated drama stills or edits. For commercial use permissions, check Google's terms and DramaCanvas terms before distributing your short drama.",
            },
            {
                question: "How is this different from using Nano Banana directly in the developer's own app?",
                answer: "DramaCanvas is an independent platform, not the model developer or an official partner. While the developer's standalone app focuses on prompt-to-image generations, DramaCanvas is a full production canvas that connects scriptwriting, storyboard cards, multiple image and video models, and a video timeline in one place so you can assemble an entire short drama.",
            },
            {
                question: "Can I edit an existing image or swap outfits using Nano Banana on DramaCanvas?",
                answer: "Yes. When you select a Nano Banana version that supports reference images, you can attach an existing image and describe changes in your prompt to swap outfits, adjust backgrounds, or alter the time of day.",
            },
        ],
        capabilities: [
            {
                title: "Character Turnaround Sheets",
                body: "Provide a descriptive prompt detailing your character's clothing and visual traits to generate turnaround angles, poses, and wardrobe options in a single image. Creators use these sheets as visual anchors for lead and supporting roles across their short drama.",
                caseId: "character-sheet",
            },
            {
                title: "Expression and Action Variations",
                body: "Give the model your character prompt along with an approved reference image to generate specific emotional expressions and physical actions. This lets you test acting beats and character reactions for key scenes before moving into video production.",
                caseId: "one-character-many-actions",
            },
            {
                title: "Storyboard Shot Visualization",
                body: "Paste script beats into generation cards to create storyboard frames, camera compositions, and prop close-ups. This helps directors plan visual pacing and scene blocking directly beside their script cards.",
            },
            {
                title: "Scene and Season Stills",
                body: "Describe an environment, lighting condition, or weather setting to generate high-resolution scene stills and background plates. You can depict the same location across different times of day or through four seasons to convey the passage of time.",
                caseId: "four-seasons",
            },
            {
                title: "Reference-Based Image Editing",
                body: "Attach an existing image card and describe your desired adjustments to modify costumes, backgrounds, or lighting. This allows you to update a character's outfit or shift a scene from day to night without rebuilding the entire frame.",
            },
            {
                title: "First Frames for Video",
                body: "Generate 1K, 2K, or 4K image stills with Nano Banana and assign them as the first frame for video models like Seedance 2.5, Kling 3.0, or Veo 3.1. This establishes consistent character appearance, composition, and lighting right where your animated clip begins.",
            },
            {
                title: "Posters and episode covers",
                body: "Describe the core conflict, the lead characters and the mood to get a key visual you can use as a poster or episode cover; try a few versions side by side on the canvas.",
            },
        ],
        problems: [
            {
                problem: "My character's appearance changes from shot to shot, which breaks continuity in my episodes.",
                solution: "Reusing an approved character reference image in supported Nano Banana versions helps maintain visual consistency, though every shot still requires a human check.",
            },
            {
                problem: "I waste hours downloading generated images from one tool and uploading them into separate video software.",
                solution: "DramaCanvas keeps your entire production on one canvas, letting you use any Nano Banana image directly as the first frame for video models like Seedance 2.5, Kling 3.0, or Veo 3.1.",
            },
            {
                problem: "I never know how many credits an image will consume until after I've already clicked generate.",
                solution: "Each generation card displays the settings and exact credit cost before you generate, starting from {minCredits} credits for the cheapest image up to {maxCredits} credits for larger sizes.",
            },
            {
                problem: "When an AI generation errors out or glitches, I feel like my paid credits are being thrown away.",
                solution: "If a generation fails on DramaCanvas, the system automatically returns its credits back to your balance.",
            },
            {
                problem: "I'm exhausted from switching between multiple AI subscriptions and having to translate all my prompts into English.",
                solution: "DramaCanvas integrates models like Nano Banana, GPT Image 2, and Midjourney V7 on a single canvas, allowing you to write prompts in your own language and manage everything from one workspace.",
            },
        ],
    },
    "zh-CN": {
        intro: "Nano Banana 是来自 Google 的图像生成与编辑模型。在 DramaCanvas 画布上，你可以直接体验 Nano Banana 2、Nano Banana 2.1 及 Nano Banana Pro，新注册即赠送 {signupCredits} 积分免费试用。生成的短剧角色与分镜剧照，还可直接作为画布上视频模型的首帧继续制作。",
        controls: "支持 1K、2K、4K 分辨率输出，按版本和尺寸不同，单张消耗 {minCredits} 积分至 {maxCredits} 积分，Pro 版本同尺寸消耗略高于 2 与 2.1。生成卡片在出图前会明确显示当前设置所需的具体积分，尺寸越大消耗积分越多。",
        sceneText:
            "在短剧创作中，Nano Banana 适合用来生成角色设定表、多表情变化、道具特写与宣传海报，也支持通过垫图修改原图的光影时间、服装与场景背景。生成的分镜画面可以直接作为同画布上 Kling 3.0、Seedance 2.5 或 Veo 3.1 视频模型的首帧，继续延展动态视频镜头。",
        steps: [
            "新建卡片或导入剧本：登录后打开项目画布，点击添加生成卡片，也可以直接粘贴短剧剧本并自动拆分为分镜卡片。",
            "选择模型版本与尺寸：在生成卡片的模型选择器中挑选 Nano Banana（支持 2、2.1 或 Pro），设定 1K、2K 或 4K 分辨率，卡片会即时显示所需积分。",
            "输入提示词或添加参考图：在文本框内用中文输入画面角色与场景描述，若要固定角色外观或改图可上传参考图作为垫图支撑。",
            "点击生成并对比选用：点击生成按钮后多张结果在画布并排展示，满意的画面可直接保留，或一键设为视频模型的首帧继续制作短剧。",
        ],
        faq: [
            {
                question: "什么是 Nano Banana？在 DramaCanvas 上怎么用它做短剧？",
                answer: "Nano Banana 是 Google 推出的图像生成与编辑模型系列，在 DramaCanvas 上支持 Nano Banana 2、Nano Banana 2.1 和 Nano Banana Pro 三个版本。你在画布上添加生成卡片、选定版本并输入提示词即可出图，还可以把生成的角色或场景图片直接作为视频模型的首帧，继续合成短剧动态视频片段。",
            },
            {
                question: "新手制作短剧，有简单的 Nano Banana 教程吗？",
                answer: "你可以先在画布上粘贴短剧剧本并拆分成一系列分镜卡片，然后为关键镜头创建生成卡片并选择 Nano Banana。输入该镜头的环境与角色提示词（如需保持外观可上传参考图），核对卡片上标明的积分后点击生成。满意的人物与剧照会留在画布上，随后直接拖入时间线或作为首帧转为视频。",
            },
            {
                question: "Nano Banana 可以免费试用吗？",
                answer: "可以。DramaCanvas 为每个新注册账户提供一次性赠送的 {signupCredits} 积分，无需绑定银行卡且永久有效。按照最小尺寸的最低档消耗（每张 {minCredits} 积分）计算，赠送积分约可免费生成 {freeCount} 张图片。如果选择更高分辨率或 Pro 版本，每张消耗的积分会有所增加；而在画布上规划剧本与分镜卡片则完全免费。",
            },
            {
                question: "Nano Banana 在 DramaCanvas 上的价格与计费规则是怎样的？",
                answer: "在 DramaCanvas 上，Nano Banana 按图片生成实际扣取积分，规划剧本与分镜操作不扣费。单张生成费用在 {minCredits} 积分至 {maxCredits} 积分之间，具体取决于所选模型版本与 1K、2K 或 4K 尺寸，Pro 版本同尺寸消耗略高于 2 与 2.1。生成卡片会在出图前显示确切积分数额，若生成失败系统会自动返还对应积分；你也可以在价格页选购会员计划或积分包。",
            },
            {
                question: "Nano Banana Pro 与 Nano Banana 2、2.1 有什么区别？短剧制作该选哪个？",
                answer: "DramaCanvas 同时集成了 Google 的 Nano Banana 2、Nano Banana 2.1 与 Nano Banana Pro 三个版本，均支持 1K、2K 与 4K 画面输出。在相同分辨率下，Nano Banana Pro 每张消耗的积分比 2 与 2.1 略高一些，具体积分会在生成卡片上实时标明。你可以根据具体镜头要求与积分预算灵活选用，生成的多张结果均可并排在画布上比对筛选。",
            },
            {
                question: "制作短剧时，Nano Banana 提示词该怎么写？支持中文吗？",
                answer: "支持直接使用中文编写提示词，平台界面也完全支持简体中文。你可以用母语详细描述角色外观、服饰、镜头景别（如全景剧照、道具特写）以及光影氛围。如果你需要修改已有画面的时间、服装或背景，直接上传参考图并配合文字说明修改要求即可。",
            },
            {
                question: "用 Nano Banana 做短剧连续镜头，如何保持角色一致性？",
                answer: "在短剧制作中，复用已经确认的角色参考图作为垫图输入，能有效帮助维持人物特征的一致。不过 AI 生成仍存在随机性，每个分镜镜头生成后依然需要人工把关审核。DramaCanvas 允许在画布上横向排列多张生成结果进行直观对比，方便你快速筛选出符合要求的角色画面。",
            },
            {
                question: "可以接入自己的 API Key 吗？商业使用有什么限制？",
                answer: "支持通过自带 API 密钥（BYOK）模式连接你自己的模型 API Key，此时由你的 API 提供方直接向你收取生成费用，DramaCanvas 不扣除生成积分，仅收取独立的工作区服务费。商业使用权限请查阅 Google 与 DramaCanvas 的相关官方条款。需要说明的是，DramaCanvas 是独立的创作平台，并非 Google 的官方合作方或模型开发者。",
            },
            {
                question: "除了手动点选卡片，DramaCanvas 还支持哪些生成与操作方式？",
                answer: "画布右侧配备了智能助手对话框，你可以通过自然语言对话让助手协助创建分镜卡片并执行生成任务。此外，平台还支持通过 DramaCanvas MCP 协议连接外部 AI 助手，由外部助手直接驱动画布完成剧本拆解与出图流程。",
            },
            {
                question: "在 DramaCanvas 上使用 Nano Banana，和直接去模型官方应用里使用有什么区别？",
                answer: "DramaCanvas 是一个独立的创作平台，并非模型开发者或官方合作伙伴，不宣称在生成质量或单价上优于官方。平台的核心在于提供完整的短剧制作流：从粘贴剧本拆分分镜、在画布上并排生成与挑选图片，到直接把图片作为多款视频模型的首帧，并接入时间线剪辑，把剧本、图像、视频制作汇集在同一个工作区内。",
            },
            {
                question: "可以用 Nano Banana 修改已有画面或实拍剧照吗？具体支持修改哪些内容？",
                answer: "可以。在选择支持参考图的版本后，你可以垫入现有的角色或场景图片，并输入提示词修改角色的服装造型、替换背景环境或调整时间光效（如白天切换为黄昏），无需推倒整张画面重新生成。",
            },
        ],
        capabilities: [
            {
                title: "角色定妆三视图",
                body: "输入角色外貌、服饰与性格提示词，生成包含多角度视图、表情与服装细节的设计图，用于短剧前期统一主角形象与分镜建档。",
                caseId: "character-sheet",
            },
            {
                title: "同角色多动作测试",
                body: "垫入已定稿的角色参考图并输入动作指令，生成同一主角在同一室内场景中的多种动作与神态变化，方便排演分镜动作与情绪走向。",
                caseId: "one-character-many-actions",
            },
            {
                title: "场景设计与四季变化",
                body: "给出环境设定描述或参考图，生成同一地点在春夏秋冬不同光影下的场景静止帧，用于短剧中交代时间推移与环境氛围。",
                caseId: "four-seasons",
            },
            {
                title: "分镜卡片与道具特写",
                body: "输入剧本分镜动作或核心道具描述，生成关键情节画面或特写镜头，卡片并排陈列在画布上供创作者直接对比选用。",
            },
            {
                title: "海报与单集封面",
                body: "写清剧情的核心冲突、主角和氛围，生成可用作宣传海报或单集封面的主视觉；多出几版并排放在画布上挑选。",
            },
            {
                title: "垫图修改服装与背景",
                body: "上传已有剧照并附带修改提示词，可在保留主体特征的前提下更换角色服装、替换背景环境或切换早晚时间，避免整图重抽。",
            },
            {
                title: "视频生成首帧底图",
                body: "在画布上生成设定好的关键镜头画面，直接作为 Seedance 2.5、Kling 3.0 或 Veo 3.1 等视频模型的起始首帧，继续跑出连续动态片段。",
            },
        ],
        problems: [
            {
                problem: "每次生成的角色长相和衣服总是不一致，剪进短剧里根本接不上戏。",
                solution: "在支持参考图的版本中垫入已确定的角色图能帮助稳定形象，生成结果会并排陈列在画布上方便对比挑选；不过目前每个镜头依然需要创作者人工把关确认。",
            },
            {
                problem: "做完图片还得一张张下载下来，再传到别的视频软件里生成视频，来回搬运太折腾。",
                solution: "DramaCanvas 将图像与视频生成整合在同一画布上，Nano Banana 生成的成图可直接作为 Seedance 2.5、Kling 3.0 或 Veo 3.1 等视频模型的首帧，生成的视频片段可直接拖入时间线剪辑。",
            },
            {
                problem: "做一部短剧要同时用好几家 AI 工具，多处注册账号、买会员切来切去很麻烦。",
                solution: "同一个画布内聚合了 Nano Banana、GPT Image 2、Midjourney V7 以及多款视频模型，统一使用平台积分计费，同时也支持接入你自己的 API 密钥由服务商直接计费。",
            },
            {
                problem: "点击生成前根本不知道要扣多少积分，万一生成失败报错了还白白扣费。",
                solution: "生成卡片在点击生成前会明确展示所选版本与分辨率所需的积分（单张在 {minCredits} 积分至 {maxCredits} 积分之间）；若遇到生成失败，系统会自动退还该次扣除的积分。",
            },
            {
                problem: "用外语写提示词表达不准确，用中文又担心模型理解不到位。",
                solution: "在生成卡片中你可以直接使用中文等母语撰写提示词，画布右侧的对话助手也支持通过日常对话帮你创建卡片并执行生成。",
            },
        ],
    },
    "zh-TW": {
        intro: "Nano Banana 是 Google 的圖像生成與編輯模型，在 DramaCanvas 畫布支援 Nano Banana 2、Nano Banana 2.1 與 Nano Banana Pro。新帳號註冊贈送 {signupCredits} 點數，依最低規格單張 {minCredits} 點數 計算約可生成 {freeCount} 張分鏡。",
        controls: "三款版本均提供 1K、2K 與 4K 輸出，尺寸越大消耗點數越多，單張成本依版本與尺寸介於 {minCredits} 點數 到 {maxCredits} 點數 之間。每張生成卡片在點擊生成前皆會明確標示所需點數，若生成失敗將自動退回點數。",
        sceneText:
            "在 AI 短劇創作中，Nano Banana 適合製作角色設定表、表情變化、道具特寫、分鏡畫面與宣傳海報，並能搭配參考圖修改既有圖像的時間、服裝或背景。在畫布上重複使用確認過的角色參考圖有助於維持外觀特徵，但短劇的每個鏡頭仍需人工檢查確認。滿意的生成畫面可直接作為同畫布上 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的第一格畫面，接續生成動態片段。",
        steps: [
            "註冊或登入後開啟畫布，在畫布新增生成卡片，也可以貼上劇本拆分為分鏡卡片，或使用右側 Agent 對話建立。",
            "在生成卡片的模型選擇器中選取 Nano Banana 2、2.1 或 Pro，並挑選 1K、2K 或 4K 解析度。",
            "在提示詞欄位以自己的語言輸入畫面描述，支援的版本可附上參考圖，卡片會即時顯示設定與所需點數。",
            "點擊卡片上的生成按鈕，多組成果會直接並排顯示在畫布上方便比對，滿意的圖片能直接作為影片模型的第一格接續製作短劇。",
        ],
        faq: [
            {
                question: "Nano Banana 是什麼？DramaCanvas 是 Google 的 Nano Banana 官網嗎？",
                answer: "Nano Banana 是 Google 開發的圖像生成與編輯模型系列，包含 Nano Banana 2、Nano Banana 2.1 與 Nano Banana Pro 等版本。DramaCanvas 是獨立的線上 AI 短劇與影片製作畫布平台，並非模型開發者 Google，亦非其官方合作夥伴。創作者可以直接在 DramaCanvas 畫布上調用這些模型，將劇本分鏡、角色設計與影片生成整合在同一個工作流中。",
            },
            {
                question: "Nano Banana 與 Nano Banana Pro 可以免費試用嗎？生成費用如何計算？",
                answer: "在 DramaCanvas 畫布上編寫劇本與排列分鏡卡片完全免費，生成圖像則會消耗點數。每個新註冊帳號皆可免費領取一次 {signupCredits} 點數，無使用期限且無須綁定信用卡。以單張最低 {minCredits} 點數 計算，註冊贈點約可免費生成 {freeCount} 張圖片；若選擇 Nano Banana Pro 或 2K、4K 等較高解析度規格，每張最高需 {maxCredits} 點數。",
            },
            {
                question: "如何在 DramaCanvas 畫布上使用 Nano Banana 製作短劇分鏡？",
                answer: "登入 DramaCanvas 後開啟畫布，即可新增生成卡片並在模型選擇器中選取 Nano Banana 2、2.1 或 Pro。接著在卡片中輸入提示詞，若所選版本支援參考圖亦可附上角色或場景圖，點擊生成後圖像會直接顯示於畫布上。滿意的畫面可以直接作為 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的第一格畫面，接續產生動態影片片段。",
            },
            {
                question: "Nano Banana 提示詞與指令可以用中文輸入嗎？怎麼寫效果較好？",
                answer: "可以，DramaCanvas 介面支援繁體中文等多種語言，你在提示詞欄位中直接輸入中文描述即可生成。撰寫短劇提示詞時，建議具體描述主體外觀、服裝、光影氣氛、鏡頭角度（如特寫或全景）等需求。若需要修改既有圖片的時間、背景或服裝，只要在支援參考圖的版本中附上原圖並於提示詞說明變更項目即可。",
            },
            {
                question: "Nano Banana 2、Nano Banana 2.1 與 Nano Banana Pro 有什麼不同？該如何選擇？",
                answer: "這三款版本皆支援 1K、2K 與 4K 解析度輸出，卡片尺寸設定越大消耗點數越多。在相同尺寸下，Nano Banana Pro 單張消耗的點數會略高於 Nano Banana 2 與 2.1，各版本與尺寸的確切點數都會在卡片點擊生成前清楚顯示。你可以依據短劇各階段的需求選擇，例如先以 Nano Banana 2 探索分鏡構圖，再依需要切換版本製作主要場景。",
            },
            {
                question: "使用 Nano Banana 需要下載應用程式或 App 嗎？",
                answer: "不需要，DramaCanvas 是完全基於瀏覽器的線上工具，無須下載任何 App 或在本機安裝軟體。只要使用電腦或行動裝置開啟瀏覽器登入，就能在同一張畫布上完成劇本梳理、分鏡生成、圖片比對與影片剪輯。此外，你也可以透過畫布右側的 Agent 對話或 DramaCanvas MCP 讓外部 AI 助手協助建立卡片並執行生成。",
            },
            {
                question: "製作連續短劇時，如何利用 Nano Banana 維持角色外觀一致？",
                answer: "在畫布上固定重複使用確認過的角色參考圖，有助於讓模型掌握角色的外觀與服裝特徵。不過在目前的 AI 生成技術下，短劇的每個鏡頭依然需要創作者逐一進行人工檢查確認。你可以在畫布上並排生成多張表情變化或姿勢試拍，挑選滿意者再接續送入影片模型或時間軸。",
            },
            {
                question: "自備 API 金鑰（BYOK）在 DramaCanvas 上如何計費？",
                answer: "若你在 DramaCanvas 連接自己的 Google API 金鑰（BYOK），模型生成的費用將由你的 API 提供方直接向你收取。在此模式下，DramaCanvas 不會扣除生成點數，但會依工作區收取另外的服務費用。如果你沒有自己的金鑰，直接使用 DramaCanvas 的會員方案或購買點數包即可開始生成。",
            },
            {
                question: "生成的圖片是否可以用於商業用途？生成失敗會扣點數嗎？",
                answer: "關於生成內容的商業用途授權，請查閱 Google 的條款與 DramaCanvas 的服務條款確認最新規範。在平台點數保障方面，如果圖片生成過程中發生錯誤或失敗，系統會自動全額退還該次扣除的點數。這能確保創作者在畫布上進行短劇實驗與分鏡嘗試時，每一點點數都花在成功產出的成果上。",
            },
            {
                question: "這和直接在模型開發者的原生應用中使用 Nano Banana 有什麼不同？",
                answer: "DramaCanvas 是一個獨立的短劇製作畫布平台，並非模型開發者或其官方合作夥伴，平台並未宣稱在生成品質或費用上優於官方原生應用。核心差異在於製作流程：DramaCanvas 將劇本分鏡、Nano Banana 與多款圖像模型、影片模型及時間軸剪輯整合在同一畫布上，方便短劇創作者在單一工作區內完成全流程製作。",
            },
            {
                question: "如何使用 Nano Banana 修改已生成的短劇角色服裝或場景？",
                answer: "在支援參考圖的版本中，可在生成卡片中附上既有圖片作為參考圖，並以提示詞指定要變更的服裝造型、背景場景或時段光影。卡片會在生成前顯示所需點數，生成後即可在畫布上並排比對修改前後的結果。",
            },
        ],
        capabilities: [
            {
                title: "角色設定三視圖",
                body: "輸入主角外觀特徵與服裝提示詞，生成包含正面、側面、不同表情與服裝的設定圖。能在短劇前期定下主演造型標準，作為後續鏡頭生成的對照基準。",
                caseId: "character-sheet",
            },
            {
                title: "同角多動作連貫試鏡",
                body: "以設定好的角色圖為參考，提示同一個角色在室內做出多種肢體動作與神態變化。方便在短劇開拍前確認角色動態與視覺連貫性。",
                caseId: "one-character-many-actions",
            },
            {
                title: "主場景四季光影變換",
                body: "輸入場景描述並搭配季節或早晚提示詞，生成同一地點在四季更迭與不同時段的場景劇照。能具體呈現短劇劇情中時間的流逝與氣氛轉換。",
                caseId: "four-seasons",
            },
            {
                title: "劇本分鏡卡片繪製",
                body: "將劇本拆分成畫布分鏡卡後，輸入鏡頭描述生成 1K 或 2K 畫面，並排檢視劇情節奏。創作者能直接在畫布上挑選合適鏡頭，逐步推進分鏡構思。",
            },
            {
                title: "海報與單集封面",
                body: "寫清楚劇情的核心衝突、主角和氛圍，生成可當作宣傳海報或單集封面的主視覺；多出幾版並排放在畫布上挑選。",
            },
            {
                title: "參考圖局部更換調修",
                body: "在支援參考圖的版本中上傳既有圖片，以提示詞變更角色服裝、背景場景或時段光影。適合短劇製作中微調角色造型或切換日夜場景，省去重畫的時間。",
            },
            {
                title: "生成影片接續首格圖",
                body: "在畫布上生成滿意的 Nano Banana 圖像後，直接設為 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的首格畫面。能直接串接動態生成，並將影片片段送入時間軸完成短劇剪輯。",
            },
        ],
        problems: [
            {
                problem: "每次生成同一個角色長相和服裝都變來變去，短劇鏡頭根本連不起來。",
                solution: "在生成卡片中重複引用通過確認的角色圖作為參考圖，能輔助維持特徵一致性；但每個鏡頭生成後依然需要人工檢查確認。",
            },
            {
                problem: "生好圖還要一張張下載再傳到其他影片軟體，做一部短劇檔案搬來搬去很費時。",
                solution: "DramaCanvas 將圖像與影片整合在同一個畫布上，滿意的圖像可直接作為 Seedance 2.5、Kling 3.0 或 Veo 3.1 的首格畫面生成短片，並直接拉進時間軸剪輯。",
            },
            {
                problem: "點擊生成前不確定會扣多少額度，萬一生成失敗還怕白白浪費點數。",
                solution: "生成卡片在按下生成前，會直接依尺寸與版本顯示扣除點數，單張消耗介於 {minCredits} 點數至 {maxCredits} 點數之間；若生成失敗，系統會將該次點數全額退還。",
            },
            {
                problem: "做短劇要在多個平台註冊不同模型帳號，付費混亂且介面切換繁瑣。",
                solution: "在畫布的模型選取器中可直接選用 Nano Banana、GPT Image 2、Midjourney V7 及多款影片模型，亦支援 BYOK 連接自有 API 金鑰由原廠計費，無需切換平台。",
            },
            {
                problem: "不習慣寫英文提示詞，每次描述短劇畫面都要先用翻譯工具轉譯。",
                solution: "生成卡片支援以繁體中文等自己的母語直接撰寫提示詞，平台介面亦提供繁體中文等多種語言選項，不用先翻譯即可直接操作。",
            },
        ],
    },
    "zh-HK": {
        intro: "Nano Banana 是 Google 旗下的圖像生成與編輯模型系列，在 DramaCanvas 可直接選用 Nano Banana 2、2.1 及 Nano Banana Pro。新帳戶註冊即贈 {signupCredits} 點數，最基本設定下足夠免費生成 {freeCount} 張短劇分鏡圖。創作者可直接輸入中文提示詞生成畫面，並將成果接續為短劇影片模型的首格畫面。",
        controls: "提供 1K、2K 及 4K 輸出規格，生成卡片在點擊生成前會明確顯示所需點數，最基本規格每張需 {minCredits} 點數，最高規格則需 {maxCredits} 點數。尺寸越大消耗點數越多，同尺寸下 Nano Banana Pro 的點數消耗亦略高於 Nano Banana 2 與 2.1。",
        sceneText:
            "在 AI 短劇創作中，Nano Banana 適合製作角色設定圖、多種表情變化、場景劇照、宣傳海報及道具特寫。配合參考圖功能，創作者還能修改現有圖像的服裝、背景與時間光影，繪製整套連貫的分鏡卡片。生成完成的單元圖像更可直接留在畫布上，作為後續影片模型的首格畫面。",
        steps: [
            "登入 DramaCanvas 打開畫布，貼上短劇劇本拆分成多張分鏡卡，或直接在畫布新增一張生成卡片。",
            "在模型選擇器選取 Nano Banana 2、2.1 或 Nano Banana Pro，並選定 1K、2K 或 4K 解析度。",
            "輸入中文或你慣用的語言提示詞，若需要調整外觀可上傳參考圖，卡片底部會顯示設定與所需點數。",
            "點擊生成後，多組圖像結果會並排顯示於畫布供你比對，滿意的畫面可直接送入影片模型作為首幀剪輯短劇。",
        ],
        faq: [
            {
                question: "Nano Banana 是什麼？Google Nano Banana Pro 與 Gemini 有何關係？",
                answer: "Nano Banana 是 Google 推出的圖像生成與圖像編輯模型系列，包含 Nano Banana 2、Nano Banana 2.1 及 Nano Banana Pro 等版本。DramaCanvas 是獨立的 AI 短劇創作畫布平台，並非模型開發者或官方合作夥伴，但已將此系列模型整合至創作流程中。創作者無需額外配置伺服器環境，在畫布即可直接調用 Google 的技術製作短劇圖片與分鏡。",
            },
            {
                question: "Nano Banana Pro 可以免費試用嗎？生成費用與額度如何計算？",
                answer: "DramaCanvas 註冊新帳戶即可獲贈 {signupCredits} 點數，無需綁定信用卡且無使用期限。在最基本規格下，這筆點數足夠免費試用生成 {freeCount} 張圖片，基本尺寸每張需 {minCredits} 點數，最高規格每張則為 {maxCredits} 點數。畫布上的劇本編排完全免費，若生成失敗系統會自動退還點數，用完後可在定價頁面購買點數包或訂閱會員。",
            },
            {
                question: "新手製作 AI 短劇的 Nano Banana 教學流程是什麼？具體怎麼用？",
                answer: "登入平台打開畫布後，你可以新增生成卡片並在模型清單選取 Nano Banana，輸入提示詞即可生成畫面。畫布右側設有 Agent 對話視窗，也能透過對話直接替你建立卡片與執行生成。生成出的角色或場景圖會並排展示於畫布，滿意的圖片可以直接作為 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的首幀，最後將片段排入時間軸剪輯成短劇。",
            },
            {
                question: "Nano Banana 支援中文提示詞與指令嗎？撰寫時有什麼技巧？",
                answer: "你可以直接使用繁體中文或自己的慣用語言撰寫提示詞，平台介面亦完整支援繁體中文。若要修改既有畫面中的服裝、背景或光影，建議選取支援參考圖的版本並附加圖片，模型會依據參考圖像進行調整。撰寫時只需以具體客觀的語句描述角色外觀、鏡頭角度與場景光線，卡片在生成前亦會清楚預覽規格。",
            },
            {
                question: "Nano Banana 2、2.1 與 Nano Banana Pro 該如何選擇？有 Nano Banana 3 嗎？",
                answer: "DramaCanvas 目前提供 Nano Banana 2、Nano Banana 2.1 與 Nano Banana Pro，暫時未有 Nano Banana 3。三個版本均支援 1K、2K 及 4K 輸出，Nano Banana Pro 在相同尺寸下每張消耗的點數略高於 2 和 2.1。可以先用 2 或 2.1 試構圖，再按預算決定是否改用 Pro。",
            },
            {
                question: "Nano Banana 官網有提供 App 下載嗎？如何在電腦或手機上使用？",
                answer: "Nano Banana 本身為雲端運算模型，並無獨立的手機 App 或電腦安裝程式供下載。DramaCanvas 為線上網頁版畫布，創作者只要使用瀏覽器登入官網即可直接操作，無需下載任何軟體。AI 助手亦可透過 DramaCanvas MCP 協議連接畫布，協助自動化操作生成流程。",
            },
            {
                question: "製作 AI 短劇時，如何利用 Nano Banana 保持角色外觀一致？",
                answer: "在畫布上重複使用已確認的角色參考圖有助於維持外貌特徵，但短劇的每個鏡頭仍需要人工檢查與挑選。生成後的圖片會直接並排在畫布上，方便你逐一對比五官、服飾與風格細節。建議先建立包含多角度的角色設計圖與表情變化圖，再將合格的圖像接續到各個分鏡與影片生成步驟中。",
            },
            {
                question: "Nano Banana 生成的圖片可以用於商業用途嗎？如何使用自己的 API 金鑰（BYOK）？",
                answer: "關於商業使用權限，請查閱 Google 的條款與 DramaCanvas 的服務條款。平台支援自備 API 金鑰（BYOK）功能，綁定自己的 Google API 金鑰後，模型供應商會直接向你收取 API 費用，DramaCanvas 則不扣除生成點數，僅收取獨立的工作區服務費。此彈性讓短劇團隊可依據製作預算自由選擇計費模式。",
            },
            {
                question: "在 DramaCanvas 使用 Nano Banana，與直接在開發商的原生應用程式使用有何分別？",
                answer: "DramaCanvas 是一個獨立的短劇創作平台，並非模型開發商，亦非其官方合作夥伴。平台不宣稱在生成畫質或價格上優於開發商的原生應用，核心差別在於短劇製作流程的整合：DramaCanvas 將劇本拆分、分鏡卡片、多款圖像與影片模型（包含 Nano Banana、Midjourney V7、Seedance 2.5 等）以及剪輯時間軸整合在同一個畫布中，方便創作者在同一介面完成短劇製作，無須在不同工具之間頻繁切換導出。",
            },
            {
                question: "如何使用 Nano Banana 配合參考圖修改現有圖片的服裝或背景？",
                answer: "在支援參考圖的版本中，你可以在生成卡片上傳已有的畫面作為參考圖，並以自己的語言撰寫提示詞說明修改需求（例如更換角色服裝、替換場景背景或切換日夜光影）。生成卡片在執行前會顯示所選尺寸（提供 1K、2K、4K）與所需點數，生成後新舊畫面會並排呈現在畫布上，方便直接比對修改細節。",
            },
        ],
        capabilities: [
            {
                title: "角色定妝與三視圖",
                body: "輸入角色外觀特徵與服裝風格提示詞，生成包含多角度旋轉、表情與服飾的角色設定圖，用於短劇開拍前鎖定主配角視覺形象。",
                caseId: "character-sheet",
            },
            {
                title: "角色神態與動作測試",
                body: "附上已定案的角色參考圖並輸入動作描述，生成同一角色在室內的多種連續動作與表情變化，供短劇分鏡挑選合適鏡頭。",
                caseId: "one-character-many-actions",
            },
            {
                title: "場景設計與四季光影",
                body: "輸入場景環境描繪或參考圖，生成同一個地點在不同季節或特定早晚光影下的場景靜態畫面，用於短劇交代時間推移與空間氛圍。",
                caseId: "four-seasons",
            },
            {
                title: "分鏡鏡頭與機位構圖",
                body: "根據分鏡劇本輸入機位構圖提示詞，或上傳現有照片轉換為俯瞰機位，生成特寫、俯視等分鏡靜態畫面以輔助短劇鏡頭佈局。",
                caseId: "top-down-angle",
            },
            {
                title: "參考圖修改與換裝換景",
                body: "上傳已生成的畫面作為參考圖並輸入修改提示詞，替換角色的服裝、變更背景環境或調整早晚時間，在短劇製作中微調鏡頭細節。",
            },
            {
                title: "影片模型首幀生成",
                body: "為關鍵分鏡生成高解析度畫面，直接在同一畫布上作為 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的首幀，接續生成動態影片片段。",
            },
            {
                title: "海報與單集封面",
                body: "寫清楚劇情的核心衝突、主角和氣氛，生成可用作宣傳海報或單集封面的主視覺；多出幾個版本並排放在畫布上比較。",
            },
        ],
        problems: [
            {
                problem: "每次生成的角色外貌都不一樣，短劇主角很難在不同分鏡中保持連貫。",
                solution: "在生成卡片中重複引用已通過審查的角色參考圖有助於維持特徵，但不同鏡頭仍非百分之百完全一致，短劇製作時每個鏡頭仍需創作者人工檢查與挑選。",
            },
            {
                problem: "生成圖片後還要下載再上傳到其他工具做成影片，反覆切換非常繁瑣。",
                solution: "在同一個畫布上，Nano Banana 生成的靜態圖片可以直接作為 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的首幀畫面，生成的動態片段亦能直接拖入時間軸進行剪輯。",
            },
            {
                problem: "為了使用不同的圖像與影片模型，要分別管理多個平台的帳號與付費方案。",
                solution: "DramaCanvas 將 Nano Banana 2、2.1、Pro 與 GPT Image 2、Midjourney V7 及多個影片模型集中在同一個畫布；用戶亦可連接自己的 API 金鑰（BYOK）由供應商直接計費，省去管理多個獨立帳號的麻煩。",
            },
            {
                problem: "點擊生成前不清楚具體要扣多少點數，要是生成失敗還會白白浪費額度。",
                solution: "生成卡片在操作前會清楚標示所選尺寸與所需點數（最低為 {minCredits}點數，最高為 {maxCredits}點數）；若遇到生成失敗，系統會全額退回該次扣除的點數。",
            },
            {
                problem: "我不擅長寫英文提示詞，用中文構思短劇時擔心模型無法理解指令。",
                solution: "DramaCanvas 介面支援繁體中文等多種語言，你可以在生成卡片直接以母語撰寫提示詞，亦可在畫布右側的對話助理直接用中文溝通，由助理協助建立卡片並執行生成。",
            },
        ],
    },
    "ja-JP": {
        intro: "Googleの画像生成AI「Nano Banana（ナノバナナ）」をキャンバス上で利用できます。絵コンテ作成から動画化まで同一画面で連携可能です。新規登録の{signupCredits}クレジットを使い、最安{minCredits}クレジットから無料でお試しいただけます。",
        controls:
            "Nano Banana 2、2.1、Proの全バージョンで1K、2K、4Kの解像度を選択でき、生成カード上に消費クレジットが事前に表示されます。最安設定の{minCredits}クレジットから最大サイズの{maxCredits}クレジットまで、解像度やモデルに応じて消費量が変動します。",
        sceneText:
            "ショートドラマ制作では、キャラクターの表情差分や設定資料、ポスター、小物のクローズアップ制作に適しています。参照画像を用いた衣装や時間帯、背景の変更編集に対応でき、生成した静止画は同一キャンバス上のSeedance 2.5やKling 3.0、Veo 3.1の先頭フレームとして活用可能です。",
        steps: [
            "キャンバスを開いて生成カードを追加するか、右側のエージェントチャットを開きます。必要に応じて脚本を貼り付け、絵コンテカードへ分割して構成を整えます。",
            "モデル選択メニューで「Nano Banana」とバージョン（2、2.1、Pro）を指定します。プロンプト欄に日本語で指示を入力し、必要に応じて参照画像を添付します。",
            "カード上に表示された解像度設定と消費クレジットを確認し、生成を実行します。生成結果がキャンバス上に並んで表示され、仕上がりをその場で比較できます。",
            "採用した画像を同一キャンバス上の動画モデルの先頭フレームに設定して動画を生成します。仕上がった映像クリップをタイムラインへ並べ、ショートドラマを完成させます。",
        ],
        faq: [
            {
                question: "Googleの画像生成AI「Nano Banana（ナノバナナ）」とは何ですか？",
                answer: "Googleが開発した画像生成および画像編集のモデルファミリーです。DramaCanvasではNano Banana 2、Nano Banana 2.1、Nano Banana Proの3バージョンを利用できます。ショートドラマの絵コンテやキャラクター設定資料、背景画像の制作を同一キャンバス上で進められます。",
            },
            {
                question: "Nano Bananaは無料で使えますか？料金やクレジットの仕組みを教えてください。",
                answer: "キャンバス上での脚本執筆や絵コンテカードの整理は無料で行えます。画像生成にはクレジットが必要ですが、新規登録時に有効期限のない{signupCredits}クレジットが付与されます。最安設定の{minCredits}クレジットであれば約{freeCount}枚の生成を無料でお試しいただけます。なお、高解像度や上位モデルでは最大{maxCredits}クレジットまで消費量が変動し、生成に失敗した分のクレジットは自動返還されます。",
            },
            {
                question: "Nano Banana 2、2.1、Nano Banana Proの違いは何ですか？",
                answer: "提供されているすべてのバージョンで1K、2K、4Kの解像度出力を選択できます。Nano Banana Proは同解像度であってもNano Banana 2や2.1に比べて画像ごとの消費クレジットが少し高く設定されています。カード上のモデル選択メニューから、用途や残クレジットに合わせていつでも切り替えられます。",
            },
            {
                question: "DramaCanvasでのNano Bananaの使い方やプロンプト指定のコツはありますか？",
                answer: "キャンバス上に生成カードを追加し、モデル一覧からNano Bananaを選択してプロンプトを入力します。プロンプトは日本語でそのまま記述でき、対応バージョンでは参照画像を添付して時間帯や衣装の変更も指定できます。キャンバス右側のエージェントチャットから会話形式でカード作成や生成を指示することも可能です。",
            },
            {
                question: "Nano Bananaはどこで使えますか？APIキー（BYOK）の接続は可能ですか？",
                answer: "DramaCanvasのWebキャンバス上でそのまま利用できるほか、DramaCanvas MCPを介して外部AIアシスタントから操作することも可能です。また、BYOK（ご自身のAPIキー接続）にも対応しており、APIの提供元から直接課金される代わりにDramaCanvasの生成クレジット消費なし（別途ワークスペースサービス料のみ）で利用できます。なお、DramaCanvasは独立したプラットフォームであり、Googleの公式パートナーではありません。",
            },
            {
                question: "Nano Bananaで生成した画像は商用利用できますか？",
                answer: "商用利用については、Googleの利用規約およびDramaCanvasの利用規約をご確認ください。DramaCanvasは独立した制作プラットフォームとして各モデルの連携環境を提供しています。",
            },
            {
                question: "ショートドラマ制作でキャラクターの見た目を揃えることはできますか？",
                answer: "あらかじめ作成したキャラクターの参照画像をプロンプトと一緒に指定することで、見た目や衣装のブレを抑えやすくなります。ただし、自動ですべてのブレが解消されるわけではないため、カットごとの目視確認は必要です。キャンバス上で複数枚を並べて比較し、状態の良いカットを選んで動画生成へと繋げます。",
            },
            {
                question: "生成クレジットの追加購入やプラン変更はどのように行いますか？",
                answer: "登録時の無料クレジットを使い切ったあとは、料金ページからメンバーシッププランへの加入やクレジットパックの追加購入が可能です。生成前には各カード上で必要な消費クレジットが明示されるため、残高を確認しながら制作できます。万が一処理エラーなどで生成に失敗した場合は、消費されたクレジットが手元に戻ります。",
            },
            {
                question: "開発元のアプリで直接Nano Bananaを使うのと何が違いますか？",
                answer: "DramaCanvasは脚本、絵コンテ、複数の画像・動画モデル、タイムライン編集をひとつの画面に統合した制作キャンバスです。独立したプラットフォームであり、モデル開発元や公式パートナーではありませんが、ドラマ制作に必要な一連の流れを同じ場所で進められます。",
            },
            {
                question: "生成済みの画像をもとに服装や背景だけを変更することはできますか？",
                answer: "対応しているバージョンで元画像を参照画像として添付し、変更したい服装や背景、時間帯のプロンプトを入力することで編集できます。同じ構図を活かしたまま、ドラマの異なるシーンや時間経過に応じたバリエーションを作成できます。",
            },
        ],
        capabilities: [
            {
                title: "キャラ設定画の作成",
                body: "外見や衣装のテキスト指示を入力し、立ち絵や三面図をまとめた設定シートを生成します。短編ドラマの登場人物のビジュアルを初期段階で固めるために役立ちます。",
                caseId: "character-sheet",
            },
            {
                title: "表情や演技の検証",
                body: "キャラクターの特徴と感情やアクションの指示を与え、同一人物の様々な表情や部屋での動きを生成します。各シーンの撮影前にキャラクターの演技パターンを確認できます。",
                caseId: "one-character-many-actions",
            },
            {
                title: "絵コンテの画像化",
                body: "脚本から分割したカードごとにカットの状況を入力し、構図やカメラアングルを反映したスチル画像を生成します。短編ドラマ全体の場面展開や演出プランの確認に使えます。",
            },
            {
                title: "季節や時間帯の美術",
                body: "舞台となる場所のプロンプトに季節や時間帯の指定を加え、同じロケーションで天候や光が変化した画像を生成します。ドラマ内の時間経過や季節の移り変わりを描く背景美術として活用できます。",
                caseId: "four-seasons",
            },
            {
                title: "ポスター・各話のカバー",
                body: "物語の核になる対立、主人公、雰囲気を書くと、ポスターや各話のカバーに使えるキービジュアルを生成できます。数パターンをキャンバスに並べて選べます。",
            },
            {
                title: "参照画像による編集",
                body: "生成済みの画像を参照画像として添付し、衣装や背景、時間帯の変更プロンプトを入力して画像を編集します。同一シーン内での衣装替えや、昼から夜への場面転換スチルの作成に利用できます。",
            },
            {
                title: "動画用の初コマ生成",
                body: "シーンの開始状態を指定して画像を生成し、同一キャンバス上の動画モデルの開始フレームとして設定します。Seedance 2.5やKling 3.0、Veo 3.1で動画クリップを生成する基点として活用できます。",
            },
        ],
        problems: [
            {
                problem: "カットごとに登場人物の顔や服装が変わってしまい、同一人物に見えない。",
                solution: "承認したキャラクターの参照画像を再利用することで一貫性を保ちやすくなりますが、毎ショット目視での確認が必要です。",
            },
            {
                problem: "画像生成ツールから画像を書き出して、別の動画生成ツールにアップロードし直す作業が面倒。",
                solution: "同一キャンバス上で生成したNano Bananaの画像をそのまま動画モデルの初コマに指定でき、生成したクリップはタイムラインに並べて編集できます。",
            },
            {
                problem: "画像や動画の生成ごとに別々のAIツールを行き来して、複数のアカウントを管理するのが煩わしい。",
                solution: "ひとつのキャンバス上でNano Bananaに加え、GPT Image 2、Midjourney V7、Seedance 2.5、Kling 3.0、Veo 3.1を切り替えて利用できます。",
            },
            {
                problem: "生成してみるまで消費クレジットが分からず、生成に失敗したときにクレジットが無駄にならないか不安。",
                solution: "生成前にカード上で設定と消費クレジットが必ず表示され、生成に失敗した場合はクレジットが返還されます。",
            },
            {
                problem: "英語でプロンプトを書くのが難しく、細かいニュアンスや演出の意図がうまく伝わらない。",
                solution: "プロンプトは日本語などの母国語でそのまま入力できます。キャンバス右側のエージェントチャットと日本語で対話しながらカード作成や生成を進めることも可能です。",
            },
        ],
    },
    "ko-KR": {
        intro: "구글의 이미지 생성 모델 나노바나나를 DramaCanvas에서 바로 사용해 보세요. 가입 시 제공되는 {signupCredits} 크레딧으로 가장 작은 규격 기준 최대 {freeCount}장까지 무료로 생성하며 대본부터 영상 제작까지 한 캔버스에서 완성할 수 있습니다.",
        controls: "나노바나나 2, 2.1, 프로 모두 1K, 2K, 4K 출력을 지원하며 해상도가 커질수록 더 많은 크레딧이 소모됩니다. 버전과 크기에 따라 이미지 한 장당 {minCredits} 크레딧에서 {maxCredits} 크레딧이 쓰이며, 정확한 차감량은 생성 카드에 표시됩니다.",
        sceneText:
            "숏폼 드라마 제작 시 인물 설정표, 표정 변화, 배경 스틸컷, 포스터와 소품 클로즈업 이미지를 만들 때 유용합니다. 레퍼런스 이미지를 활용해 기존 컷의 시간대나 의상, 배경을 바꾸는 연속 장면 연출에도 적합합니다. 생성한 이미지는 캔버스 안에서 Kling 3.0이나 Veo 3.1 같은 비디오 모델의 첫 프레임으로 바로 연결할 수 있습니다.",
        steps: [
            "로그인 후 캔버스를 열고 대본을 붙여넣어 스토리보드 카드로 나눕니다. 직접 카드를 배치하거나 우측 에이전트 채팅과 대화하며 씬을 정리할 수도 있습니다.",
            "캔버스에 생성 카드를 추가하고 모델 선택기에서 나노바나나와 원하는 버전(2, 2.1, 프로)을 고릅니다. 작업 목적에 맞춰 1K, 2K, 4K 중 원하는 해상도를 선택합니다.",
            "프롬프트 입력창에 원하는 장면을 한국어로 입력하고, 필요에 따라 인물이나 구도용 레퍼런스 이미지를 첨부합니다. 생성 전 카드에 표시되는 출력 설정과 필요 크레딧을 확인합니다.",
            "생성 버튼을 누르면 완성된 이미지들이 캔버스 위에 나란히 나타나 시각적으로 바로 비교할 수 있습니다. 마음에 드는 컷을 골라 같은 캔버스의 비디오 모델 첫 프레임으로 넘긴 뒤 타임라인에서 숏드라마로 편집합니다.",
        ],
        faq: [
            {
                question: "구글 나노바나나(Nano Banana)는 어떤 AI 모델인가요?",
                answer: "나노바나나는 구글의 이미지 생성 및 이미지 편집 모델군입니다. DramaCanvas에서는 웹 캔버스 안에서 대본 기획부터 나노바나나 이미지 생성, 비디오 제작까지 한 화면에서 진행할 수 있습니다. DramaCanvas는 독립적인 플랫폼이며 구글의 공식 파트너나 개발사는 아닙니다.",
            },
            {
                question: "나노바나나 2, 2.1, 프로(Pro) 버전의 차이는 무엇인가요?",
                answer: "DramaCanvas에서는 나노바나나 2, 나노바나나 2.1, 나노바나나 프로 세 가지 버전을 제공합니다. 세 버전 모두 1K, 2K, 4K 해상도를 지원하며 출력 크기가 커질수록 더 많은 크레딧이 듭니다. 동일 해상도 기준 나노바나나 프로가 2나 2.1 버전에 비해 이미지 한 장당 소모 크레딧이 조금 더 높습니다.",
            },
            {
                question: "나노바나나 AI를 무료로 체험해 볼 수 있나요?",
                answer: "신규 가입 시 별도의 결제 카드 등록 없이 유효기간 없는 {signupCredits} 크레딧이 계정당 한 번 지급됩니다. 이 크레딧으로 가장 저렴한 1K 해상도 설정 시 최대 {freeCount}장까지 무료로 생성해 볼 수 있습니다. 캔버스에서 대본을 작성하고 스토리보드를 배치하는 기획 단계는 크레딧 차감 없이 무료로 이용 가능합니다.",
            },
            {
                question: "나노바나나 이미지 생성 비용과 크레딧 가격 체계는 어떻게 되나요?",
                answer: "버전과 크기에 따라 이미지 한 장당 최소 {minCredits} 크레딧에서 최대 {maxCredits} 크레딧이 차감됩니다. 고해상도를 선택하거나 나노바나나 프로 버전을 사용할 경우 차감량이 늘어나며, 정확한 필요 크레딧은 생성 카드에서 미리 확인할 수 있습니다. 만약 이미지 생성이 실패하면 소모된 크레딧은 계정으로 다시 반환됩니다.",
            },
            {
                question: "나노바나나 프롬프트는 한국어로 작성해도 되나요?",
                answer: "프롬프트 입력창에 한국어로 장면 묘사를 입력해도 정상적으로 이미지가 생성됩니다. 인물의 복장, 표정, 배경 소품, 구도를 구체적으로 서술할수록 원하는 드라마 연출을 얻기 수월합니다. 지원되는 버전을 선택한 경우 레퍼런스 이미지를 함께 첨부하여 기존 이미지의 시간대나 스타일을 반영할 수도 있습니다.",
            },
            {
                question: "숏폼 드라마 제작 시 캐릭터 외형의 일관성을 어떻게 유지하나요?",
                answer: "승인된 인물 레퍼런스 이미지를 생성 카드에 넣어 재사용하면 캐릭터 외형을 유지하는 데 도움이 됩니다. 다만 레퍼런스를 참조하더라도 매 컷의 일관성이 언제나 보장되는 것은 아니므로 제작자의 직접적인 확인이 필요합니다. 캔버스 위에 여러 결과물을 나란히 띄워 두고 가장 적절한 컷을 선별해 사용하는 방식을 권장합니다.",
            },
            {
                question: "나노바나나로 만든 이미지를 영상 클립으로 어떻게 이어가나요?",
                answer: "캔버스에서 생성된 나노바나나 이미지는 동일 캔버스 내 Seedance 2.5, Kling 3.0, Veo 3.1 같은 비디오 모델의 시작 프레임으로 바로 전달할 수 있습니다. 변환된 비디오 클립들을 캔버스 하단 타임라인에 차례로 배치하여 숏드라마 장면으로 편집하면 됩니다. 캔버스 우측의 에이전트 채팅을 이용해 대화 형태로 카드를 만들고 영상 생성을 요청할 수도 있습니다.",
            },
            {
                question: "본인의 API 키(BYOK)를 연결하거나 외부 도구로 캔버스를 다룰 수 있나요?",
                answer: "자체 API 키를 연결하는 BYOK 방식을 지원하며, 이 경우 모델 제공사에서 사용자에게 직접 비용을 청구하고 DramaCanvas 생성 크레딧은 차감되지 않습니다. 다만 이 방식에는 별도의 워크스페이스 서비스 이용료가 부과됩니다. 또한 DramaCanvas MCP를 지원하므로 외부 AI 어시스턴트와 연결해 캔버스 작업을 제어하는 것도 가능합니다.",
            },
            {
                question: "나노바나나로 생성한 이미지를 상업적으로 이용할 수 있나요?",
                answer: "상업적 이용에 대해서는 Google 이용약관과 DramaCanvas 이용약관을 직접 확인해야 합니다. 멤버십 요금제와 추가 크레딧 팩에 관한 상세 안내는 공식 요금제 페이지에서 확인할 수 있습니다. DramaCanvas 인터페이스는 한국어, 영어, 일본어 등 다국어를 지원합니다.",
            },
            {
                question: "개발사의 공식 서비스에서 나노 바나나를 직접 쓰는 것과 드라마캔버스에서 쓰는 것은 무엇이 다른가요?",
                answer: "드라마캔버스는 모델 개발사와 제휴되지 않은 독립 플랫폼으로, 공식 앱 대비 품질이나 가격 우위를 주장하지 않습니다. 다만 대본 작성부터 스토리보드 분할, 나노 바나나를 비롯한 여러 이미지·비디오 모델 생성, 타임라인 편집까지 숏드라마 제작의 전 과정을 하나의 캔버스에서 완결할 수 있는 제작 환경을 제공합니다.",
            },
            {
                question: "기존에 만들어둔 이미지를 참조하여 의상이나 배경, 시간대만 수정할 수 있나요?",
                answer: "네, 참조 이미지 첨부를 지원하는 버전을 선택하고 기존 이미지를 레퍼런스로 올린 뒤 프롬프트로 변경 사항을 지시하면 됩니다. 같은 인물의 의상 교체, 배경 수정, 낮 장면을 밤으로 전환하는 작업이 가능하며, 생성된 이미지는 캔버스에서 나란히 비교하며 검수할 수 있습니다.",
            },
        ],
        capabilities: [
            {
                title: "캐릭터 시트 제작",
                body: "주인공의 외형, 다각도 턴어라운드, 기본 복장을 한 장에 담는 프롬프트를 입력해 외형 설정 이미지를 생성합니다. 숏드라마 제작 전 주연 캐릭터의 시각적 기준을 정립하는 설정표로 활용합니다.",
                caseId: "character-sheet",
            },
            {
                title: "인물 표정 룩테스트",
                body: "캐릭터 외모 묘사와 함께 기쁨, 분노, 슬픔 등 감정 지시를 입력해 표정별 컷을 생성합니다. 주연과 조연 인물의 감정 표현 폭을 미리 확인하는 캐릭터 프로필 북을 구성할 때 적합합니다.",
                caseId: "setting-book",
            },
            {
                title: "콘티 앵글 연출",
                body: "장면 묘사와 함께 탑다운이나 하이앵글 등 카메라 시점을 구체적으로 지정해 스토리보드 컷을 생성합니다. 공간 내 인물 배치와 카메라 동선을 정리하는 연출 콘티로 사용합니다.",
                caseId: "top-down-angle",
            },
            {
                title: "공간 계절 변화",
                body: "특정 공간에 대한 프롬프트에 봄, 여름, 가을, 겨울이나 낮과 밤의 시간대를 지정해 배경 컷을 생성합니다. 숏드라마 극 중 시간의 경과를 시각적으로 전달하는 배경 전환 컷으로 활용합니다.",
                caseId: "four-seasons",
            },
            {
                title: "포스터와 회차 커버",
                body: "핵심 갈등, 주인공, 분위기를 적으면 포스터나 회차 커버로 쓸 대표 이미지를 만들 수 있습니다. 여러 버전을 캔버스에 나란히 놓고 고르세요.",
            },
            {
                title: "레퍼런스 부분 수정",
                body: "기존 이미지를 레퍼런스로 첨부하고 프롬프트로 바꿀 의상, 배경, 시간대를 지시해 수정 이미지를 생성합니다. 동일 인물의 복장을 다른 씬에 맞게 변경하거나 낮 장면을 밤으로 바꿀 때 유용합니다.",
            },
            {
                title: "비디오 첫 프레임",
                body: "나노 바나나로 원하는 씬의 스틸컷을 생성한 뒤 동일한 캔버스 내 비디오 모델의 시작 이미지로 연결합니다. 씨댄스 2.5, 클링 3.0, 비오 3.1 등을 활용해 정지된 장면을 움직이는 숏드라마 영상 클립으로 확장할 때 사용합니다.",
            },
        ],
        problems: [
            {
                problem: "이미지를 새로 생성할 때마다 캐릭터 얼굴과 외형이 달라져서 장면 연결이 어렵습니다.",
                solution: "승인된 캐릭터 레퍼런스 이미지를 첨부해 생성하면 외형 일관성을 유지하는 데 도움이 되며, 캔버스에 나란히 배치된 결과물을 직접 검수하며 가장 자연스러운 컷을 선택할 수 있습니다.",
            },
            {
                problem: "이미지를 생성한 뒤 비디오 AI 툴로 다시 다운로드하고 업로드하는 과정이 번거롭습니다.",
                solution: "드라마캔버스에서는 나노 바나나로 만든 이미지를 같은 캔버스에서 바로 씨댄스 2.5, 클링 3.0, 비오 3.1 등 비디오 모델의 첫 프레임으로 연결해 영상 클립을 생성할 수 있습니다.",
            },
            {
                problem: "생성 버튼을 누르기 전에는 크레딧이 얼마나 들지 알 수 없고, 생성이 실패하면 크레딧만 낭비될까 봐 걱정됩니다.",
                solution: "생성 카드에서 설정에 따라 {minCredits} 크레딧부터 {maxCredits} 크레딧까지 필요한 수량이 미리 표시되며, 생성이 실패하면 차감된 크레딧은 자동으로 반환됩니다.",
            },
            {
                problem: "이미지와 비디오 모델마다 사이트와 계정을 따로 관리하며 결제해야 해서 번거롭습니다.",
                solution: "단일 캔버스에서 나노 바나나 2, 2.1, 프로뿐만 아니라 GPT Image 2, 미드저니 V7 및 여러 비디오 모델을 모델 선택기에서 바로 전환하며 사용할 수 있습니다.",
            },
            {
                problem: "영어로 프롬프트를 번역해서 작성하다 보니 연출 의도와 세부 뉘앙스가 왜곡됩니다.",
                solution: "드라마캔버스에서는 별도의 번역 없이 한국어를 포함한 모국어로 프롬프트를 직접 입력해 나노 바나나 이미지를 생성할 수 있습니다.",
            },
        ],
    },
    "es-ES": {
        intro: "Nano Banana es la familia de modelos de Google para generar y editar imágenes en DramaCanvas. Al registrarte recibes {signupCredits} créditos para generar hasta {freeCount} imágenes en la resolución básica, desde {minCredits} créditos por imagen. Elige entre Nano Banana 2, Nano Banana 2.1 o Nano Banana Pro y crea los planos de tu cortometraje en un solo lienzo.",
        controls:
            "Cada generación parte desde {minCredits} créditos en 1K hasta {maxCredits} créditos en resoluciones mayores de 2K y 4K. La tarjeta muestra el costo exacto antes de generar, considerando que Nano Banana Pro cuesta un poco más por imagen que Nano Banana 2 y 2.1 en el mismo tamaño.",
        sceneText:
            "En un drama corto, este modelo sirve para preparar hojas de diseño de personajes, variaciones de expresiones, primeros planos de utilería y fotogramas para el guion gráfico. También permite editar una imagen existente usando una referencia para modificar el vestuario, el fondo o el momento del día. Las tomas aprobadas pueden servir como primer fotograma de un modelo de video dentro del mismo lienzo.",
        steps: [
            "Abre el lienzo de DramaCanvas y añade una tarjeta de generación, o pega tu guion para dividirlo en tarjetas de guion gráfico.",
            "En el selector de modelos, elige Nano Banana con la versión que prefieras (Nano Banana 2, 2.1 o Nano Banana Pro) y define la resolución en 1K, 2K o 4K.",
            "Escribe tu prompt en tu propio idioma y adjunta imágenes de referencia cuando la versión elegida lo admita; la tarjeta te mostrará los créditos antes de generar.",
            "Haz clic en generar para ver los resultados colocados uno al lado del otro sobre el lienzo, listos para comparar, enviar a la línea de tiempo o usar como primer fotograma de video.",
        ],
        faq: [
            {
                question: "¿Qué es Nano Banana y cómo funciona en DramaCanvas?",
                answer: "Nano Banana es la familia de modelos de inteligencia artificial creada por Google para la generación y edición de imágenes. En DramaCanvas puedes emplearla directamente en un lienzo visual para diseñar personajes, fondos y fotogramas a partir de texto o imágenes de referencia. Además, el chat del agente situado a la derecha del lienzo puede crear tarjetas y ejecutar generaciones mediante una conversación.",
            },
            {
                question: "¿Se puede probar Nano Banana gratis?",
                answer: "Sí, cada cuenta nueva recibe {signupCredits} créditos de bienvenida sin requerir tarjeta bancaria ni fecha de vencimiento. Con este saldo puedes generar hasta {freeCount} imágenes en la configuración más económica de {minCredits} créditos por imagen. Organizar tarjetas y redactar el guion en el lienzo no tiene costo, ya que solo la generación descuenta créditos.",
            },
            {
                question: "¿Qué versiones de Nano Banana existen y está disponible Nano Banana 3?",
                answer: "Las versiones disponibles en DramaCanvas son Nano Banana 2, Nano Banana 2.1 y Nano Banana Pro, y Nano Banana 3 todavía no está disponible en DramaCanvas. Las tres opciones ofrecen salidas en resoluciones de 1K, 2K y 4K. Un tamaño mayor requiere más créditos, y Nano Banana Pro cuesta un poco más por imagen que Nano Banana 2 y 2.1 en la misma resolución.",
            },
            {
                question: "¿Cómo escribir prompts efectivos para Nano Banana en un drama corto?",
                answer: "Escribe tus prompts en tu propio idioma con descripciones claras del personaje, la acción, el encuadre y la iluminación. Reutilizar una imagen de referencia aprobada del personaje ayuda a mantener la coherencia visual en las versiones que lo permiten. Ten en cuenta que cada plano generado necesita una revisión humana para comprobar que funcione en la escena.",
            },
            {
                question: "¿Cómo usar una imagen de Nano Banana para generar video?",
                answer: "Cualquier imagen generada con Nano Banana puede colocarse como el primer fotograma de modelos de video en el mismo lienzo, tales como Kling 3.0, Veo 3.1 o Seedance 2.5. Esto permite que el movimiento del clip comience exactamente desde el encuadre y los personajes que aprobaste previamente. Posteriormente, los clips de video generados se pueden trasladar a la línea de tiempo para estructurar tu cortometraje.",
            },
            {
                question: "¿Es posible conectar mi propia clave de API (BYOK) para Nano Banana?",
                answer: "Sí, puedes conectar tu propia clave de API (modalidad conocida como BYOK), por ejemplo desde Google AI Studio. En ese caso, tu proveedor de API te factura directamente el consumo del modelo y DramaCanvas no descuenta créditos de generación, aplicando únicamente una tarifa de servicio por el espacio de trabajo. También es posible controlar el lienzo mediante asistentes de inteligencia artificial a través de DramaCanvas MCP.",
            },
            {
                question: "¿Cuántos créditos cuesta cada imagen y qué ocurre si una generación falla?",
                answer: "El valor por imagen va desde {minCredits} créditos en la resolución mínima hasta {maxCredits} créditos en las opciones de mayor tamaño o con la versión Pro. La tarjeta de generación te indica la cantidad exacta de créditos que se utilizarán antes de confirmar la creación. Si una generación llega a fallar, el sistema te reintegra los créditos de inmediato.",
            },
            {
                question: "¿Se pueden utilizar las imágenes de Nano Banana en proyectos comerciales?",
                answer: "Para cualquier uso comercial, debes revisar los términos de Google y los términos de DramaCanvas. Ten presente que DramaCanvas es una plataforma independiente y no es el desarrollador del modelo ni un socio oficial de Google. Si requieres más créditos para tus producciones, puedes consultar los paquetes de créditos y planes de membresía en la página de precios.",
            },
            {
                question: "¿En qué se diferencia usar Nano Banana en DramaCanvas de utilizarlo directamente en la aplicación de su desarrollador?",
                answer: "DramaCanvas es una plataforma independiente y no un socio oficial ni el desarrollador del modelo. Su diferencia principal es que integra todo el flujo de producción en un solo lienzo: guion, guion gráfico en tarjetas, varios modelos de imagen y video, y una línea de tiempo para montar el drama corto en un único entorno de trabajo.",
            },
            {
                question: "¿Cómo puedo editar una toma existente con Nano Banana sin empezar desde cero?",
                answer: "Cuando la versión seleccionada admite imágenes de referencia, puede adjuntar su imagen a la tarjeta de generación e indicar por texto los cambios de vestuario, fondo o iluminación del día que desea aplicar.",
            },
        ],
        capabilities: [
            {
                title: "Hojas de diseño de personajes",
                body: "Introduce la descripción de tu personaje para obtener una hoja con vistas en diferentes ángulos, poses y opciones de vestuario. Sirve como referencia visual fija para los actores virtuales de tu drama corto.",
                caseId: "character-sheet",
            },
            {
                title: "Pruebas de expresiones dramáticas",
                body: "Describe los gestos y emociones del protagonista para generar primeros planos con distintas reacciones faciales. Permite comprobar la intensidad gestual en los momentos de conflicto del episodio.",
            },
            {
                title: "Cuadros para guion gráfico",
                body: "Pega los fragmentos de tu guion en tarjetas del lienzo para generar imágenes fijas de cada plano planificado. Facilita definir el ritmo narrativo y la composición de la escena antes de pasar al video.",
            },
            {
                title: "Fondos de locaciones y temporadas",
                body: "Describe el entorno de la escena especificando la hora del día o la estación del año para obtener fondos coherentes. Ayuda a ilustrar el paso del tiempo y situar los distintos capítulos del drama corto.",
                caseId: "four-seasons",
            },
            {
                title: "Pósteres y portadas de episodio",
                body: "Describe el conflicto central, los protagonistas y el tono para obtener una imagen principal que sirva como póster o portada de episodio; genera varias versiones y compáralas en el lienzo.",
            },
            {
                title: "Edición con imagen de referencia",
                body: "Adjunta un fotograma existente y describe los ajustes específicos que necesitas para cambiar el vestuario, el fondo o el momento del día. Facilita corregir la escena manteniendo los elementos que ya funcionaban.",
            },
            {
                title: "Primeros fotogramas para video",
                body: "Genera una imagen fija con Nano Banana y úsala como punto de inicio en modelos de video como Kling 3.0, Veo 3.1 o Seedance 2.5. Conecta las tomas aprobadas del lienzo con la línea de tiempo para montar tu corto.",
            },
        ],
        problems: [
            {
                problem: "El rostro y la apariencia física de mi personaje cambian constantemente entre una imagen y otra.",
                solution: "Reutilizar una imagen de referencia ya aprobada del protagonista ayuda a mantener mayor coherencia en los rasgos, aunque cada toma requiere revisión humana.",
            },
            {
                problem: "Pierdo mucho tiempo descargando imágenes de una aplicación y gestionando varias cuentas para pasarlas a herramientas de video.",
                solution: "DramaCanvas integra modelos de imagen y de video en un mismo lienzo, permitiendo usar una imagen de Nano Banana como primer fotograma y editar los clips en la línea de tiempo.",
            },
            {
                problem: "Nunca sé con certeza cuántos créditos costará una imagen antes de pulsar el botón de generar.",
                solution: "Cada tarjeta de generación muestra los ajustes y la cantidad exacta requerida antes de comenzar, desde {minCredits} créditos en resoluciones base hasta {maxCredits} créditos en opciones como 4K o Nano Banana Pro.",
            },
            {
                problem: "Me da miedo gastar mi saldo en generaciones que puedan fallar por errores técnicos del sistema.",
                solution: "Si una generación falla en el lienzo, la plataforma devuelve automáticamente los créditos consumidos a su saldo.",
            },
            {
                problem: "Me cuesta describir mis escenas con precisión porque muchos servicios exigen redactar las indicaciones en inglés.",
                solution: "En DramaCanvas puede escribir sus indicaciones directamente en español en la tarjeta de generación, ya que el sistema admite redactar en su propio idioma.",
            },
        ],
    },
    "pt-BR": {
        intro: "O Nano Banana reúne os modelos de inteligência artificial do Google para geração e edição visual no DramaCanvas. Crie fichas de personagens, cenários e planos de storyboard usando Nano Banana 2, 2.1 ou Nano Banana Pro em resoluções de 1K até 4K. Cadastre-se para receber {signupCredits} créditos sem cartão e comece seus testes a partir de {minCredits} créditos por imagem.",
        controls:
            "Cada imagem consome entre {minCredits} créditos e {maxCredits} créditos, variando entre as versões Nano Banana 2, 2.1 e Nano Banana Pro. Gerar em 2K ou 4K exige mais créditos, e o custo exato é exibido no card de geração antes do clique.",
        sceneText:
            "Em minisséries e dramas curtos, o Nano Banana é ideal para desenhar fichas de personagens, explorar variações de expressões, produzir cartazes e detalhar objetos de cena. Você também pode criar quadros de storyboard e stills cinematográficos para ancorar a iluminação e os enquadramentos da narrativa. Com uma imagem de referência aprovada, o modelo facilita ajustes de figurino, plano de fundo ou horário do dia na mesma cena.",
        steps: [
            "Abra o canvas do projeto e adicione um card de geração, ou cole seu roteiro para dividi-lo em cartões de storyboard.",
            "No seletor de modelos do card, escolha Nano Banana 2, 2.1 ou Pro e defina a resolução de saída em 1K, 2K ou 4K.",
            "Digite sua descrição de cena em português e anexe imagens de referência do personagem; o card exibirá os ajustes e os créditos antes do envio.",
            "Clique no botão de gerar para comparar as imagens geradas lado a lado e use as aprovadas como primeiro quadro em modelos de vídeo.",
        ],
        faq: [
            {
                question: "O que é o Nano Banana e como ele funciona no DramaCanvas?",
                answer: "O Nano Banana é a família de modelos de inteligência artificial do Google voltada para geração e edição de imagens. No DramaCanvas, ele funciona integrado a um canvas infinito onde você organiza roteiros, gera imagens conceituais e compara resultados lado a lado. Você pode usar os modelos Nano Banana 2, Nano Banana 2.1 e Nano Banana Pro sem sair da sua área de trabalho.",
            },
            {
                question: "É possível testar o Nano Banana grátis?",
                answer: "Sim. Ao criar uma conta nova no DramaCanvas, você recebe {signupCredits} créditos sem precisar cadastrar cartão de crédito e sem data de validade. Esse bônus cobre até {freeCount} imagens geradas na menor resolução e no modelo mais básico. Versões como o Nano Banana Pro ou saídas em 2K e 4K demandam mais créditos por imagem.",
            },
            {
                question: "Quais versões do Nano Banana estão disponíveis e quanto custa cada uma?",
                answer: "O DramaCanvas disponibiliza o Nano Banana 2, o Nano Banana 2.1 e o Nano Banana Pro em resoluções de 1K, 2K e 4K. O custo por imagem varia de {minCredits} créditos a {maxCredits} créditos, sendo que o Nano Banana Pro custa um pouco mais do que as versões 2 e 2.1. O total exato de créditos necessários é sempre indicado no card de geração antes do disparo, e gerações com falha têm seus créditos estornados.",
            },
            {
                question: "Como escrever prompts para o Nano Banana no DramaCanvas?",
                answer: "Você pode digitar seus prompts diretamente em português descrevendo iluminação, ângulos de câmera, vestimentas e ambientação da cena. Para manter a consistência de personagens entre cenas, anexe uma imagem de referência aprovada no card de geração. Vale lembrar que a referência ajuda bastante no visual, mas cada plano ainda precisa passar por uma conferência humana.",
            },
            {
                question: "Como usar as imagens do Nano Banana para criar vídeos de dramas curtos?",
                answer: "No mesmo canvas, a imagem aprovada no Nano Banana pode ser conectada como o primeiro quadro de modelos de vídeo como Seedance 2.5, Kling 3.0 ou Veo 3.1. Isso mantém a continuidade do cenário e dos atores ao transformar planos estáticos em tomadas animadas. Em seguida, basta arrastar os clipes gerados para a linha do tempo e montar o seu drama curto.",
            },
            {
                question: "Como o DramaCanvas se compara ao uso direto da API ou de outros modelos de imagem?",
                answer: "O DramaCanvas é uma plataforma independente e reúne modelos como Nano Banana, GPT Image 2 e Midjourney V7 em um único fluxo de produção. O planejamento no canvas com cartões de storyboard é gratuito, consumindo créditos apenas nas gerações. Você também pode conectar sua própria chave de API (BYOK) para pagar o provedor diretamente, pagando ao DramaCanvas apenas a taxa de serviço do espaço de trabalho.",
            },
            {
                question: "Posso controlar a criação de imagens do Nano Banana usando agentes ou assistentes?",
                answer: "Sim, você pode interagir com o chat do Agent na lateral direita do canvas para solicitar a criação de cards e disparar gerações por conversa. Além disso, assistentes de inteligência artificial externos conseguem comandar seu fluxo de trabalho por meio da integração DramaCanvas MCP. Todas as ações permanecem visíveis nos cards do seu projeto.",
            },
            {
                question: "Posso utilizar comercialmente as imagens criadas com o Nano Banana?",
                answer: "Para saber se pode comercializar as produções criadas com esse modelo, consulte os termos do Google e os termos do DramaCanvas. A plataforma não fornece aconselhamento jurídico e recomenda que cada criador valide as diretrizes de propriedade intelectual dos provedores envolvidos antes da veiculação comercial.",
            },
            {
                question: "Como o DramaCanvas é diferente de usar o Nano Banana diretamente no aplicativo da desenvolvedora?",
                answer: "O DramaCanvas é uma plataforma independente, sem vínculo oficial com a desenvolvedora do modelo. A proposta é integrar a produção de dramas curtos em um só lugar: roteiro, divisão em cartões de storyboard, testes comparativos entre modelos de imagem e vídeo lado a lado e montagem na linha do tempo, sem promessas de qualidade superior ou custo menor.",
            },
            {
                question: "Como funciona a edição de uma imagem existente com o Nano Banana?",
                answer: "Quando a versão selecionada suporta imagens de referência, você anexa o arquivo ao cartão de geração e escreve as mudanças desejadas no comando. Isso possibilita alterar o figurino do personagem, trocar o cenário ou mudar o horário do dia aproveitando a composição visual original.",
            },
        ],
        capabilities: [
            {
                title: "Ficha de design de personagem",
                body: "Você insere a descrição visual no cartão de geração e obtém giros de ângulo, poses e figurinos em uma única imagem. Serve para definir e consultar a identidade visual do protagonista antes de produzir as cenas.",
                caseId: "character-sheet",
            },
            {
                title: "Testes de expressão e atuação",
                body: "Ao anexar a imagem do personagem aprovado como referência, você gera diferentes reações emocionais e poses no mesmo ambiente. É usado para compor planos de reação e diálogos dramáticos mantendo a base do elenco.",
                caseId: "one-character-many-actions",
            },
            {
                title: "Quadros de decupagem visual",
                body: "Divida o roteiro em cartões de storyboard e descreva a ação para gerar os enquadramentos de cada cena. Ajuda a pré-visualizar a composição e o ritmo visual do episódio antes da fase de animação.",
            },
            {
                title: "Cenários com passagem de tempo",
                body: "Defina o local da cena e gere a mesma locação em horários, climas ou estações distintas a partir de referências. Permite marcar passagens de tempo e mudanças de atmosfera mantendo a mesma base arquitetônica.",
                caseId: "four-seasons",
            },
            {
                title: "Pôsteres e capas de episódio",
                body: "Descreva o conflito central, os protagonistas e o clima para gerar uma imagem principal que sirva de pôster ou capa de episódio; gere algumas versões e compare lado a lado no canvas.",
            },
            {
                title: "Edição de cena por referência",
                body: "Anexe uma imagem existente no cartão e descreva ajustes pontuais de figurino, cenário de fundo ou iluminação. Permite corrigir detalhes de continuidade visual sem ter que recriar o plano inteiro.",
            },
            {
                title: "Primeiro quadro para vídeo",
                body: "Envie uma imagem gerada no Nano Banana diretamente como primeiro quadro para modelos de vídeo como Seedance 2.5, Kling 3.0 ou Veo 3.1 no mesmo canvas. Permite passar direto da imagem estática para os clipes que vão para a linha do tempo.",
            },
        ],
        problems: [
            {
                problem: "O rosto e as roupas do meu personagem ficam diferentes a cada nova imagem que eu gero.",
                solution: "Reutilizar uma imagem de referência aprovada ajuda a orientar o modelo, embora cada plano ainda precise de revisão humana para checar a consistência.",
            },
            {
                problem: "Perco muito tempo salvando imagens em uma ferramenta e subindo manualmente em outra para criar vídeos.",
                solution: "No DramaCanvas, as imagens geradas com o Nano Banana podem ser usadas diretamente como o primeiro quadro de modelos de vídeo no mesmo canvas, e os clipes resultantes seguem direto para a linha do tempo.",
            },
            {
                problem: "Fico sem saber quantos créditos vou gastar antes do clique e perco saldo quando uma imagem falha.",
                solution:
                    "O cartão de geração mostra as configurações e o consumo de créditos antes de gerar, variando de {minCredits} créditos a {maxCredits} créditos conforme a resolução (1K, 2K ou 4K) e a versão, e qualquer geração com falha devolve os créditos automaticamente.",
            },
            {
                problem: "Tenho que manter e pagar várias assinaturas diferentes para experimentar modelos de imagem e vídeo.",
                solution:
                    "O mesmo canvas integra modelos de imagem como Nano Banana, GPT Image 2 e Midjourney V7, além de modelos de vídeo como Seedance 2.5, Kling 3.0 e Veo 3.1. Quem preferir faturamento direto também pode conectar sua própria chave de API.",
            },
            {
                problem: "Tenho dificuldade para escrever comandos em outros idiomas sem perder o sentido dramático da cena.",
                solution: "A interface conta com suporte a português e permite escrever os comandos no seu próprio idioma diretamente no cartão de geração, ou pedir a criação de cartões e gerações via conversa com o agente no chat lateral.",
            },
        ],
    },
};

export default nanoBananaOverrides;
