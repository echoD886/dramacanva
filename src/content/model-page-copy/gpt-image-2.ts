import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Prices only via tokens filled from the live catalog.
export const gptImage2Overrides: ModelPageOverrides = {
    "en-US": {
        intro: "GPT Image 2 brings OpenAI's image generation and editing models—including GPT Image 2, GPT Image 2.5, and GPT Image 2.6—directly onto your DramaCanvas storyboard. Generate scene stills, props, and character sheets, then use them as starting frames for video models on the same canvas. Sign up to receive {signupCredits} credits and create up to {freeCount} images at the cheapest setting without a credit card.",
        controls:
            "Choose between 1K, 2K, and 4K output; GPT Image 2 costs the same at every size, while GPT Image 2.5 and 2.6 scale with resolution. The card displays your exact rate before you generate, starting from {minCredits} credits up to {maxCredits} credits per image.",
        sceneText:
            "GPT Image 2 produces vertical 9:16 drama covers with readable title text, character design and expression sheets, and scene stills. It handles in-scene props like letters and phone screens, and lets you modify outfits or backgrounds by attaching reference images. Every approved still can serve as the first frame for connected video models on your canvas.",
        steps: [
            "Open the canvas, paste your drama script, and split it into storyboard cards, or use the Agent chat on the right to build them.",
            "Add an image generation card and select GPT Image 2, GPT Image 2.5, or GPT Image 2.6 in the model selector.",
            "Write your scene prompt in your language, choose a resolution, and attach reference images if your selected version supports them.",
            "Review the credit cost shown on the card, click generate to see variations side by side, and send approved frames to a video model.",
        ],
        faq: [
            {
                question: "What is GPT Image 2, and what versions are available on DramaCanvas?",
                answer: "GPT Image 2 is OpenAI's image generation and image editing model family. On DramaCanvas, you can choose between GPT Image 2, GPT Image 2.5, and GPT Image 2.6 on a single canvas. All three versions support 1K, 2K, and 4K outputs for storyboard frames, character sheets, and scene stills.",
            },
            {
                question: "Can I try GPT Image 2 free?",
                answer: "Yes, every new account receives {signupCredits} credits with no card required and no expiry date. You can use these credits to create up to {freeCount} images at the cheapest setting to test the workflow. Writing scripts and organizing storyboard cards on the canvas remain free without spending credits.",
            },
            {
                question: "How does GPT Image 2 pricing work?",
                answer: "DramaCanvas uses credits for generations, and the exact amount appears on the card before you generate. Generating with GPT Image 2 costs {minCredits} credits per image across all sizes, while GPT Image 2.5 and 2.6 cost more for larger resolutions, up to {maxCredits} credits for the largest tier. If a generation fails, the spent credits are returned to your balance.",
            },
            {
                question: "How to use GPT Image 2 for an AI short drama?",
                answer: "Paste your script onto the canvas to break it into storyboard cards, or direct the Agent chat to create them for you. Add a generation card, choose your GPT Image 2 version, enter your prompt, and generate your frames side by side. Keep the frames you like, then use them as the first frame for video models like Seedance 2.5, Kling 3.0, or Veo 3.1.",
            },
            {
                question: "How should I write GPT Image 2 prompts for character sheets and props?",
                answer: "Write your prompt in your own language, specifying the character appearance, camera angle, lighting, and wardrobe details. Mention if you need an expression sheet, a vertical 9:16 cover with title text, or a specific prop such as a phone screen or letter. When using a version that accepts references, attach an approved image to help guide the result.",
            },
            {
                question: "Can I use my own GPT Image 2 API key on DramaCanvas?",
                answer: "Yes, DramaCanvas supports BYOK so you can connect your own OpenAI API key. When BYOK is enabled, your API provider bills you directly and DramaCanvas deducts no generation credits from your balance. A separate workspace service fee applies when running your own key.",
            },
            {
                question: "How do I maintain character consistency across shots?",
                answer: "Reusing an approved character reference image on cards that support references helps maintain visual traits across different scenes. However, AI generation variations still require a human check on every shot. You can generate multiple variations side by side on the canvas to compare and select your preferred result.",
            },
            {
                question: "Can I use GPT Image 2 images for commercial short dramas?",
                answer: "You should check OpenAI's terms and DramaCanvas terms before using generated images in commercial projects. Commercial permissions depend on the policies of the model developer and the platform. DramaCanvas is an independent platform, not the model developer and not an official partner of OpenAI.",
            },
            {
                question: "How is this different from using GPT Image 2 directly in the developer's own app?",
                answer: "DramaCanvas is an independent production platform, not the model developer and not an official partner. Rather than generating isolated images in a chat box, DramaCanvas combines script breakdown, storyboard cards, multiple image and video models, and a video editing timeline on a single workspace.",
            },
            {
                question: "Can I edit an existing image to change outfits or backgrounds?",
                answer: "Yes. When using a GPT Image 2 version that supports reference images, you can attach an existing image to the card and write a prompt to modify clothing, swap the background, or alter the time of day.",
            },
        ],
        capabilities: [
            {
                title: "Character Turnaround Sheets",
                body: "Provide a character prompt detailing costume and physical features to generate a multi-angle turnaround sheet. This gives your production team a fixed visual reference for your protagonist across upcoming scenes.",
                caseId: "cyberpunk-character-sheet",
            },
            {
                title: "Expression and Look Tests",
                body: "Submit an approved character face or description to generate variations in emotion, lighting, and hairstyle. Use these tests to ensure emotional close-ups match dramatic script beats.",
                caseId: "twelve-hairstyles",
            },
            {
                title: "Storyboard Frame Staging",
                body: "Convert script beats into sequential storyboard frames by prompting specific camera angles and character staging. Laying frames out side by side on the canvas helps you review scene pacing before production.",
                caseId: "thriller-storyboard",
            },
            {
                title: "Scene and Location Stills",
                body: "Describe fictional environments with custom lighting, weather conditions, or seasons to produce environmental stills. These location stills establish the atmospheric mood of your scenes before staging characters.",
            },
            {
                title: "Vertical Posters and Covers",
                body: "Input dramatic scene concepts to produce vertical 9:16 cover art complete with readable title text. These vertical visuals serve as episode covers and promotional artwork for mobile video feeds.",
                caseId: "dark-archive-poster",
            },
            {
                title: "Outfit and Setting Adjustments",
                body: "Attach an approved scene image to a compatible card and prompt for specific changes to wardrobe, surroundings, or time of day. This allows you to adapt established visual assets across changing story beats without starting from scratch.",
            },
            {
                title: "Video First Frame Generation",
                body: "Prompt a key dramatic beat or action pose and assign the resulting still directly as the starting frame for video models like Seedance 2.5, Kling 3.0, or Veo 3.1. This anchors your AI video clips to an approved composition right on the canvas.",
            },
        ],
        problems: [
            {
                problem: "My main character looks like a different actor in every scene.",
                solution: "Attach an approved character reference image to your card when using a compatible version to guide new generations. While references help maintain visual continuity, every shot still requires a human check.",
            },
            {
                problem: "I waste time downloading images and re-uploading them into separate video generation tools.",
                solution:
                    "DramaCanvas integrates image and video models on one canvas, letting you pass any approved GPT Image 2 image directly into Seedance 2.5, Kling 3.0, or Veo 3.1 as the first frame. Your generated video clips then drop right onto the timeline to assemble your short drama.",
            },
            {
                problem: "I cannot tell how many credits an image will use before generating.",
                solution:
                    "Every card shows the exact credit cost and output resolution before you hit generate. On GPT Image 2 the cost is uniform across 1K, 2K, and 4K, while GPT Image 2.5 and 2.6 scale with resolution, ranging from {minCredits} credits to {maxCredits} credits.",
            },
            {
                problem: "Juggling multiple subscriptions and browser tabs across different AI tools is exhausting.",
                solution:
                    "DramaCanvas hosts GPT Image 2 alongside models like Midjourney V7, Nano Banana, Kling 3.0, and Veo 3.1 on a single canvas. You can use platform credits or connect your own API key through BYOK so the model provider bills you directly without DramaCanvas deducting generation credits.",
            },
            {
                problem: "System errors and failed generations waste my paid credits.",
                solution: "If a generation fails, DramaCanvas automatically returns its credits to your balance. Furthermore, writing scripts and arranging storyboard cards on the canvas is completely free.",
            },
        ],
    },
    "zh-CN": {
        intro: "DramaCanvas 支持 OpenAI 的 GPT Image 2 系列模型，你可以在同一画布上从剧本分镜直接生成角色与场景。注册即送 {signupCredits} 积分，按最低档单张 {minCredits} 积分计算可免费生成约 {freeCount} 张图片，高阶版本与更大尺寸消耗更多积分。成图可直接作为视频模型首帧，继续制作短剧镜头。",
        controls: "提供 GPT Image 2、GPT Image 2.5 与 GPT Image 2.6 三个版本，均支持 1K、2K 和 4K 分辨率。GPT Image 2 各尺寸消耗相同，2.5 与 2.6 尺寸越大消耗积分越多，单张在 {minCredits} 积分至 {maxCredits} 积分之间，生成卡片会在提交前显示确切积分。",
        sceneText:
            "在短剧制作中，该系列适合生成角色设定图、表情表、场景剧照以及带清晰文字的竖版 9:16 海报封面。你可以用它制作信件、手机屏幕或招牌等带字道具，也能为品牌短剧输出商用产品镜头。上传参考图后还能为指定角色更换服装或替换背景，方便快速丰富分镜素材。",
        steps: [
            "在画布上点击添加生成卡片，或直接把剧本拆分为分镜卡片，然后在模型选择器中选定 GPT Image 2、GPT Image 2.5 或 GPT Image 2.6。",
            "在卡片输入框内用自己的语言输入画面提示词；若所选版本支持，可点击上传参考图进行垫图改图。",
            "选择 1K、2K 或 4K 分辨率，卡片会显示当前设置和所需积分，确认无误后点击生成按钮。",
            "生成结果会并排展示在画布上供你挑选对比，满意的图片可直接设为视频模型首帧并送入时间线剪辑。",
        ],
        faq: [
            {
                question: "GPT Image 2、GPT Image 2.5 与 GPT Image 2.6 有什么区别？该怎么选？",
                answer: "三个版本均出自 OpenAI，都支持 1K、2K 和 4K 输出。基础版 GPT Image 2 各尺寸消耗相同积分，适合固定成本的日常分镜；GPT Image 2.5 与 GPT Image 2.6 随着分辨率提升会消耗更多积分。生成卡片会在提交前实时显示当前版本的积分扣除数，你可以根据具体镜头需求来挑选对应版本。",
            },
            {
                question: "新用户可以免费试用 GPT Image 2 吗？",
                answer: "可以。每个新注册账号都会获得 {signupCredits} 积分，无需绑定信用卡，积分无过期时间。按照最低档单张 {minCredits} 积分计算，赠送积分足够免费生成约 {freeCount} 张图片，更高版本或高分辨率会扣除更多积分。若遇到生成失败，系统会自动退还扣除的积分。",
            },
            {
                question: "GPT Image 2 价格怎么计算？生成一张图片消耗多少积分？",
                answer: "在画布上编写剧本与排列分镜卡片是免费的，只有点击生成图片时才会消耗积分。GPT Image 2 生成单张最低为 {minCredits} 积分，最高档为 {maxCredits} 积分，卡片会在提交前显示确切积分。其中 GPT Image 2 各尺寸消耗相同，而 GPT Image 2.5 与 GPT Image 2.6 随着分辨率从 1K 升至 4K 会消耗更多积分。",
            },
            {
                question: "新手怎么用 GPT Image 2 制作短剧分镜？有快速上手教程吗？",
                answer: "登录后打开画布，你可以直接粘贴短剧剧本并拆分为分镜卡片，也可以手动新建生成卡片。在模型选择器中选好版本并输入提示词，若版本支持还可上传参考图进行垫图改图。点击生成后多张画面会并排展示在画布上供你挑选，满意的成图可直接作为视频模型首帧推入时间线剪辑。",
            },
            {
                question: "GPT Image 2 提示词该怎么写？支持中文输入吗？",
                answer: "卡片支持直接输入中文提示词，无需翻译成英文。写短剧提示词时，建议清晰描述人物外貌、服装动作、景别构图、光影氛围以及特定道具细节。如果画面中需要信件、手机屏幕或招牌等文字元素，也可以直接写明需要呈现的文字内容。",
            },
            {
                question: "可以使用自己的 API 密钥（BYOK）生成图片吗？",
                answer: "支持。你可以在平台接入自己的 API 密钥（自带 API Key，即 BYOK），此时由你的 API 提供方直接向你计费，DramaCanvas 不会扣除图像生成积分。使用自有密钥时，平台仅收取独立的工作区服务费。",
            },
            {
                question: "如何保证短剧人物长相一致？生成的图片可以商用吗？",
                answer: "在支持垫图的版本中，持续复用经过确认的角色参考图有助于保持形象一致，但每个生成的镜头仍需要人工挑选检查。商用方面，请遵循 OpenAI 的使用条款以及 DramaCanvas 的服务协议。DramaCanvas 是独立的创作平台，并非 OpenAI 的官方合作伙伴或模型开发者。",
            },
            {
                question: "生成的 GPT Image 2 图片如何转为视频片段？",
                answer: "在同一个画布上，你可以将满意的 GPT Image 2 图片直接作为视频模型的首帧，配合 Seedance 2.5、Kling 3.0 或 Veo 3.1 生成动态视频。生成的视频镜头可以直接拖入底部时间线拼接成短剧。画布右侧还配有 Agent 对话助手，同时支持 DramaCanvas MCP，允许通过对话驱动卡片完成分镜制作。",
            },
            {
                question: "在 DramaCanvas 上使用 GPT Image 2，与直接在模型开发者的官方应用中使用有什么区别？",
                answer: "DramaCanvas 是一个独立的创作平台，并非模型开发者，也不是其官方合作伙伴。不同于单次对话窗口生图，DramaCanvas 将剧本拆分、分镜卡片排布、多张生成结果横向比对、视频模型首帧串联以及时间线剪辑整合在同一画布中，便于短剧创作者完成连续镜头制作。",
            },
            {
                question: "可以用 GPT Image 2 对已有画面进行垫图修改或换装换景吗？",
                answer: "可以。在所选版本支持参考图时，你可以在生成卡片上附带参考图片并输入提示词，对画面中的服装款式、背景环境或具体元素进行调整修改，生成结果会并排展示在画布上方便对比挑选。",
            },
        ],
        capabilities: [
            {
                title: "角色设定与三视图",
                body: "输入角色外貌、服饰与道具提示词，生成包含多角度视图与细节的角色设定图，便于短剧前期定妆与角色建档。",
                caseId: "cyberpunk-character-sheet",
            },
            {
                title: "发型与表情试镜",
                body: "在提示词中调整人物发型与微表情变化，生成同一面孔在不同状态下的对照图，用于正式拍摄前的造型测试。",
                caseId: "twelve-hairstyles",
            },
            {
                title: "短剧分镜画面绘制",
                body: "根据分镜台本输入机位景别与角色动作提示词，生成连续的单格或整页分镜画面，直观呈现剧集剧情节奏。",
                caseId: "thriller-storyboard",
            },
            {
                title: "场景空间与时段设定",
                body: "输入环境地点、季节天气与特定时段的光影描述，生成空镜头与场景概念图，为剧集统一不同场次的空间基调。",
            },
            {
                title: "竖屏短剧封面海报",
                body: "输入剧名标题与核心悬念意象提示词，直接生成带有清晰可读文字的 9:16 竖屏海报，用于短剧平台封面与宣发物料。",
                caseId: "dark-archive-poster",
            },
            {
                title: "垫图换装与场景替换",
                body: "在卡片中附带已有画面作为参考图，通过修改提示词调整角色服装款式或背景环境，快速衍生同一角色的不同场次剧照。",
            },
            {
                title: "视频模型首帧底图",
                body: "根据分镜起幅动作生成静态画面，直接作为画布上视频模型的首帧输入，为生成动态镜头提供画面基础。",
            },
        ],
        problems: [
            {
                problem: "不同分镜里的角色长相经常变来变去，很难连贯成一部完整的短剧。",
                solution: "复用确认好的角色参考图有助于保持面部与服饰特征，不过每个镜头仍需人工确认把关。",
            },
            {
                problem: "在不同的图像工具和视频工具之间来回倒腾，每次传图和管理多个账号都很繁琐。",
                solution: "在同一个画布上即可调用多种图像与视频模型，选出的图片能直接作为视频模型的首帧，生成的视频片段直接进入时间线剪辑。",
            },
            {
                problem: "生成之前不知道具体要花多少，总担心扣除超额积分。",
                solution: "卡片在生成前会明确显示当前设置与所需积分；GPT Image 2 各尺寸积分相同，2.5 与 2.6 尺寸越大积分越高，单张最低 {minCredits}积分，最高 {maxCredits}积分。",
            },
            {
                problem: "偶尔遇到生成报错或者网络失败，白白浪费了生成额度。",
                solution: "生成失败会自动退还对应积分；同时在画布上写剧本、排布分镜卡片等前期规划环节完全免费。",
            },
            {
                problem: "平时习惯用中文构思，不擅长写复杂的英文提示词。",
                solution: "在卡片中直接使用母语编写提示词即可生成，也可以使用画布右侧的对话助手通过交谈创建卡片并执行生成。",
            },
        ],
    },
    "zh-TW": {
        intro: "GPT Image 2 是 OpenAI 的圖像生成與編輯模型，在 DramaCanvas 畫布上可直接將短劇分鏡轉為角色設定圖與直式海報。新用戶註冊即贈 {signupCredits} 點數，於最低規格約可免費生成 {freeCount} 張作品，單張最低只需 {minCredits} 點數。",
        controls: "提供 1K、2K 與 4K 解析度，GPT Image 2 在各尺寸消耗點數相同，而 GPT Image 2.5 與 GPT Image 2.6 尺寸越大點數越高。生成卡片會在送出前顯示所需點數，單張最低為 {minCredits} 點數，最高規格為 {maxCredits} 點數。",
        sceneText:
            "這套模型適合製作短劇的角色設定圖與表情表、場景劇照、帶有清晰文字的 9:16 直式海報，以及信件或手機螢幕等道具特寫。你能利用參考圖替角色更換服裝或背景，也能為品牌短劇生成商品展示畫面。在同一張畫布上產出的滿意圖片，還能直接作為 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的第一格接續生成動態。",
        steps: [
            "註冊並登入 DramaCanvas 後開啟新畫布，可貼上劇本拆分成多張分鏡卡片，或點擊畫布直接新增一張生成卡片。",
            "在卡片上的模型選擇器中選取 GPT Image 2、GPT Image 2.5 或 GPT Image 2.6，並依需求勾選 1K、2K 或 4K 解析度。",
            "在提示詞框輸入中文描述，若選用的版本支援參考圖可上傳參考圖片，卡片會在生成前顯示本次所需點數。",
            "點擊生成按鈕，完成的圖片會並列顯示於畫布供你比較挑選，滿意的畫面能直接設定為影片模型的第一格或加入時間軸。",
        ],
        faq: [
            {
                question: "什麼是 GPT Image 2？它有哪些版本？",
                answer: "GPT Image 2 是由 OpenAI 開發的圖像生成與圖像編輯模型家族。在 DramaCanvas 畫布上，目前提供 GPT Image 2、GPT Image 2.5 以及 GPT Image 2.6 三種版本，均支援 1K、2K 與 4K 輸出規格。DramaCanvas 為獨立創作平台，並非 OpenAI 的官方合作夥伴。",
            },
            {
                question: "GPT Image 2 可以免費試用嗎？",
                answer: "新用戶完成註冊即可獲得 {signupCredits} 點數，無須綁定信用卡且沒有使用期限。在最低生成規格下，這些額度約可免費生成 {freeCount} 張圖片。在畫布上編寫劇本與排列分鏡卡片完全免費，只有執行圖像或影片生成時才會扣除點數。",
            },
            {
                question: "在 DramaCanvas 上使用 GPT Image 2 費用如何計算？",
                answer: "生成單張圖片最便宜需消耗 {minCredits} 點數，最高規格則需 {maxCredits} 點數。GPT Image 2 在所有解析度下消耗的點數均相同，而 GPT Image 2.5 與 GPT Image 2.6 則會隨 1K、2K、4K 尺寸提高而增加點數。每張生成卡片在按下生成前都會明確標示本次所需點數，若生成失敗系統會自動退還點數。",
            },
            {
                question: "GPT Image 2 怎麼用？新手製作 AI 短劇的流程是什麼？",
                answer: "進入畫布後，你可以先貼上短劇劇本並拆分為分鏡卡片，接著新增生成卡片並選定 GPT Image 2 版本與尺寸。在提示詞欄位描述畫面並點擊生成，多組圖片會並排呈現方便對比挑選。你也可以透過畫布右側的 Agent 對話助理，以交談方式直接建立卡片並執行生成。",
            },
            {
                question: "GPT Image 2 教學：三個版本該如何選擇？",
                answer: "基礎版 GPT Image 2 無論選擇 1K、2K 或 4K 解析度消耗點數都相同，適合用於大量分鏡草圖或預算固定的專案。GPT Image 2.5 與 GPT Image 2.6 則提供不同的解析度階梯，較大尺寸會消耗較多點數，適合需要 2K 或 4K 大圖的短劇劇照與直式海報。若選用的版本支援參考圖，還能直接在卡片上附帶參考圖進行改裝或換景編輯。",
            },
            {
                question: "GPT Image 2 提示詞該怎麼寫？支援繁體中文嗎？",
                answer: "DramaCanvas 介面與提示詞輸入完全支援繁體中文，你可以直接用平時習慣的中文描述短劇角色的動作、外表、場景光影或道具細節。若是製作含有文字的招牌、信件道具或直式海報，可直接在提示詞中指定文字內容。若搭配支援參考圖的版本，同時附上角色設定圖能讓提示詞的描述更精準對齊需求。",
            },
            {
                question: "製作連續短劇時，如何維持角色外觀的一致性？",
                answer: "建議先生成一張滿意的角色設定圖或表情表，後續分鏡生成時將該圖作為參考圖附在卡片上。重複使用確認過的角色參考圖有助於維持外觀一致，但每個鏡頭仍需人工檢查確認。確認無誤的靜態畫面，可直接作為畫布上 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的第一格生成動態短片。",
            },
            {
                question: "我可以綁定自己的 API 金鑰（BYOK）或用於商業短劇嗎？",
                answer: "平台支援 BYOK（自備 API 金鑰）模式，綁定自己的金鑰後將由你的 API 提供方直接向你計費，DramaCanvas 不會扣除生成點數，僅收取獨立的工作區服務費。生成圖片若需進行商業用途，請參閱 OpenAI 與 DramaCanvas 的服務條款。此外，你也可以透過 DramaCanvas MCP 讓外部 AI 助理操控畫布進行創作。",
            },
            {
                question: "在 DramaCanvas 使用 GPT Image 2，跟直接在開發者的官方應用程式使用有什麼不同？",
                answer: "DramaCanvas 是一個獨立的短劇製作平台，並非模型開發者，亦非其官方合作夥伴。兩者的主要差異在於製作流程的整合：在 DramaCanvas 上，您可以直接將劇本拆分成具體分鏡，在同一個畫布中並列生成卡片、切換多種圖像與影片模型，並將生成的畫面直接設為影片首格畫面送入時間軸剪輯，專注於完整短劇的製作工作流。",
            },
            {
                question: "我可以使用 GPT Image 2 修改既有的短劇畫面或替角色換裝嗎？",
                answer: "可以。在支援參考圖的版本中，您可以在生成卡片上附加已有的圖片，並輸入更換服裝、調整時間或替換背景的提示詞進行編輯與融合；生成前卡片會明確列出該設定所需的點數，讓您確認後再送出生成。",
            },
        ],
        capabilities: [
            {
                title: "角色設定與三視圖",
                body: "輸入主角外貌特徵與服裝風格提示詞，產出多角度視圖與配件細節設定圖，方便在短劇前製期定調角色視覺基準。",
                caseId: "cyberpunk-character-sheet",
            },
            {
                title: "髮型與表情測試",
                body: "附上已定稿的角色臉部參考圖並搭配表情或造型提示詞，產出同一張臉的造型變化與表情測試圖，用於確認短劇角色在不同場景下的辨識度。",
                caseId: "twelve-hairstyles",
            },
            {
                title: "短劇連續分鏡格",
                body: "將劇本拆解後的段落情節填入提示詞，生成具備鏡頭角度與角色動作的單頁連續分鏡畫面，直接在畫布上排定短劇節奏與鏡頭調度。",
                caseId: "thriller-storyboard",
            },
            {
                title: "場景氣氛與時令空鏡",
                body: "輸入環境描述並指定清晨、黃昏或特定季節氣候，生成光影一致的場景靜態畫面，作為短劇各場次過渡空鏡或美術對光參考。",
            },
            {
                title: "直式宣傳海報封面",
                body: "輸入 9:16 直式構圖與劇名文字提示詞，產出排版完整且帶有清晰可讀標題文字的概念海報，可直接作為短劇上架封面與社群宣傳素材。",
                caseId: "dark-archive-poster",
            },
            {
                title: "參考圖換裝與換景",
                body: "在支援參考圖的版本中附加已定稿的角色圖片，輸入更換不同服裝或轉移到深夜街道的提示詞，在保留主角特徵下完成短劇不同場次的造型與背景轉換。",
            },
            {
                title: "影片模型首格畫面",
                body: "將生成滿意的關鍵畫面直接設為同畫布上 Seedance 2.5、Kling 3.0 或 Veo 3.1 的首格畫面，接著生成動態片段並送至時間軸剪輯成短劇。",
            },
        ],
        problems: [
            {
                problem: "每次生出來的角色長相和服裝都不太一樣，剪輯成短劇時很難連戲。",
                solution: "在支援參考圖的版本中重複附上已核准的角色參考圖有助於維持特徵，但生成後的每個鏡頭依然需要創作者逐一檢視把關。",
            },
            {
                problem: "做一部短劇得在多個平台管理不同 AI 帳號，生完圖還要手動下載再搬移到影片工具，流程非常破碎。",
                solution: "DramaCanvas 在單一畫布上整合了 GPT Image 2 與多種圖像及影片模型，生成的圖片可直接作為影片首格畫面並送進時間軸剪輯，亦支援自備金鑰（BYOK）由模型供應商直接計費。",
            },
            {
                problem: "按下生成鍵前根本不知道這次會扣多少點數，很怕額度不知不覺被花光。",
                solution: "生成卡片在點擊生成前會清楚標示當前尺寸設定與所需點數，單張生成最少消耗 {minCredits} 點數，最高為 {maxCredits} 點數，讓您確認預算後再送出。",
            },
            {
                problem: "遇到系統錯誤或生成失敗時，扣掉的額度常常就這樣白白浪費掉。",
                solution: "在 DramaCanvas 上生成若失敗，系統會將該次消耗的點數全數退還，且在畫布上編寫劇本與安排分鏡卡片完全免費。",
            },
            {
                problem: "不擅長寫英文提示詞，很擔心用中文描述會讓模型無法理解細節。",
                solution: "在卡片上直接使用繁體中文等母語撰寫提示詞即可生成，畫布右側的對話助理也能透過母語對話協助建立卡片並執行生成。",
            },
        ],
    },
    "zh-HK": {
        intro: "DramaCanvas 將 GPT Image 2 整合至同一畫布，方便創作者完成微短劇的分鏡設計與劇照生成。新註冊帳戶即可獲贈 {signupCredits} 點數，在最低解像度下可免費試用生成約 {freeCount} 張圖片。你可以直接在畫布上構思分鏡，並隨時比較多個版本的生成效果。",
        controls: "所有版本均提供 1K、2K 及 4K 解像度，其中 GPT Image 2 各尺寸點數相同，而 2.5 與 2.6 版本則尺寸越大消耗越多點數。生成卡會在點擊生成前顯示所需點數，單張消耗介乎 {minCredits} 點數 至 {maxCredits} 點數。",
        sceneText:
            "在微短劇製作中，GPT Image 2 適合用來繪製角色設定圖、表情表、場景劇照與分鏡畫面，亦能生成文字清晰的 9:16 直向海報與信件等道具。搭配參考圖時，你可以為角色更換服裝與背景，或製作品牌短劇專用的商品畫面。挑選出的理想畫面更可直接作為同畫布上影片模型的首格畫面，銜接後續動態鏡頭。",
        steps: [
            "登入 DramaCanvas 並開啟專案畫布。你可以直接貼上短劇劇本，並將情節拆分整理成多張分鏡卡。",
            "在畫布上新增一張生成卡，於模型選擇器中挑選 GPT Image 2、GPT Image 2.5 或 GPT Image 2.6，並設定 1K、2K 或 4K 輸出解像度。",
            "以常用語言輸入提示詞，若所選版本支援亦可附上參考圖。卡片會預先顯示設定與所需點數，確認後點擊生成按鈕。",
            "生成結果會並列出現在畫布上供你對比挑選。保留滿意的圖片，即可直接將其設為影片模型的首格畫面，並把片段加入時間軸剪輯短劇。",
        ],
        faq: [
            {
                question: "什麼是 GPT Image 2？DramaCanvas 目前支援哪些版本？",
                answer: "GPT Image 2 是 OpenAI 推出的圖像生成與編輯模型系列。DramaCanvas 目前提供 GPT Image 2、GPT Image 2.5 與 GPT Image 2.6 三個版本，並支援繁體中文等多種介面語言。三個版本皆支援 1K、2K 及 4K 輸出規格，用戶可依分鏡需求隨時切換。",
            },
            {
                question: "GPT Image 2 可以免費試用嗎？額度如何計算？",
                answer: "新註冊帳戶均可獲得一次性的 {signupCredits} 點數 免費試用額度，無需綁定信用卡且無有效期限。在最低解像度設定下，這些點數約可免費生成 {freeCount} 張圖片。在畫布上編寫劇本與整理分鏡卡完全免費，只有執行生成時才會扣除點數。",
            },
            {
                question: "在 DramaCanvas 上生成 GPT Image 2 費用如何計算？",
                answer: "每次生成的消耗取決於所選版本與解像度，最便宜的設定單張僅需 {minCredits} 點數，最高規格則需 {maxCredits} 點數。GPT Image 2 在所有尺寸下消耗相同點數，而 2.5 與 2.6 版本尺寸越大消耗越多。若生成失敗系統會自動退還點數，如需更多額度可至定價頁面購買點數包或訂閱會員計劃。",
            },
            {
                question: "在微短劇創作中，GPT Image 2 怎麼用？",
                answer: "你可以在畫布上新增生成卡，輸入提示詞並選取 GPT Image 2 版本來產生角色設定圖、分鏡畫面或道具。右側的 Agent 對話框亦支援以文字對話直接建立卡片並觸發生成。生成完成後，多張圖片會並列於畫布上，方便你比對挑選並銜接後續短劇製作。",
            },
            {
                question: "有推薦的 GPT Image 2 教學流程將劇照轉成動態短片嗎？",
                answer: "標準工作流程是先在畫布上利用劇本拆分出分鏡卡，再以 GPT Image 2 生成理想的場景或角色劇照。接著你可以直接將該圖片設為 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的首格畫面，生成動態鏡頭。最後將產出的影片片段排入時間軸，即可在同一畫布內完成短劇剪輯。",
            },
            {
                question: "撰寫 GPT Image 2 提示詞有什麼技巧？如何維持角色一致？",
                answer: "你可以在生成卡中直接以中文或母語描述畫面細節，包括主體、構圖、光影與場景氛圍。若選取的版本支援參考圖，附上已確認的角色設定圖有助於保持外貌特徵，但每個鏡頭仍須經由人工檢查確認。如果需要調整服裝或背景，也能透過附加參考圖進行針對性修改。",
            },
            {
                question: "可以使用自己的 API 金鑰嗎？是否支援外部 AI 工具連接？",
                answer: "平台支援自備 API Key（BYOK），連接後模型費用由你的 API 提供方直接向你收取，DramaCanvas 不會扣除生成點數，僅收取工作區服務費。此外，外部 AI 助手亦能透過 DramaCanvas MCP 協議直接操作畫布進行自動化創作。這讓團隊能靈活整合現有的開發工作流程。",
            },
            {
                question: "生成的圖片可以用於商業微短劇嗎？DramaCanvas 與 OpenAI 是什麼關係？",
                answer: "關於商業用途的權限，請查閱 OpenAI 的使用條款與 DramaCanvas 的服務條款。此外，DramaCanvas 是一個獨立的創作平台，並非 OpenAI 的官方合作夥伴或模型開發商。畫布上同時整合了 Midjourney V7 與 Nano Banana 等多種圖像模型，方便創作者依專案自由選用。",
            },
            {
                question: "在 DramaCanvas 使用 GPT Image 2 與直接在開發者自家的應用程式使用有何不同？",
                answer: "DramaCanvas 是一個獨立的短劇製作平台，並非模型開發者或其官方合作夥伴。這裡提供整合劇本切分、故事板卡片、多種圖像與視頻模型以及時間線的單一畫布工作流，讓圖像可直接作為視頻首幀；平台不宣稱比開發者自家工具具備更佳畫質或更低價格。",
            },
            {
                question: "我可以用 GPT Image 2 修改既有的圖像或為角色更換造型嗎？",
                answer: "可以。當選擇支援參考圖的版本時，您可以在生成卡片附加參考圖像，並撰寫提示詞指示更換服裝、變更背景或調整時段；生成後的各個版本會並排顯示於畫布上，方便比對挑選。",
            },
        ],
        capabilities: [
            {
                title: "角色設定與三視圖",
                body: "輸入主角外觀特徵與服裝提示詞，生成包含多角度與道具細節的角色設定圖，在短劇開拍前建立統一的外型基準。",
                caseId: "cyberpunk-character-sheet",
            },
            {
                title: "造型與髮型測試",
                body: "附上主角基準圖並輸入不同髮型或表情描述，生成同一個臉孔的多款造型圖，用於確認短劇角色的視覺風格。",
                caseId: "twelve-hairstyles",
            },
            {
                title: "動態分鏡畫面設計",
                body: "按照劇本切分的分鏡輸入動作與構圖提示詞，生成連續的場景劇照，協助安排短劇的鏡頭調度與節奏。",
                caseId: "thriller-storyboard",
            },
            {
                title: "場景氛圍與時段變換",
                body: "輸入環境描述並指定特定時段或季節（如黃昏或暴風雪），產出對應氣氛的場景劇照，建立短劇的故事背景世界觀。",
            },
            {
                title: "豎屏短劇宣傳海報",
                body: "輸入劇名排版要求與主視覺描述，生成帶有清晰可讀標題文字的 9:16 豎屏海報，直接用作短劇宣傳封面。",
                caseId: "dark-archive-poster",
            },
            {
                title: "參考圖換裝與換景",
                body: "在卡片附上已確認的角色圖並輸入修改指示，替換人物服裝、背景或光影時段，製作同一個角色在不同劇情的劇照。",
            },
            {
                title: "短劇視頻首幀銜接",
                body: "挑選滿意的生成圖像，在同一個畫布直接設為視頻模型（如 Seedance 2.5、Kling 3.0 或 Veo 3.1）的首幀，延伸生成動態短劇鏡頭。",
            },
        ],
        problems: [
            {
                problem: "每個鏡頭生成的角色長相都不一樣，短劇很難連戲。",
                solution: "在支援參考圖的版本中重複使用已確認的角色參考圖有助於維持外觀特徵，但每個鏡頭生成後仍需人工檢查確認。",
            },
            {
                problem: "在不同工具之間來回下載和上傳圖片做視頻，製作流程非常繁瑣。",
                solution: "在同一個畫布上，挑選好的 GPT Image 2 圖像可直接設為視頻模型（如 Seedance 2.5、Kling 3.0 或 Veo 3.1）的首幀生成片段，並直接排入時間線剪輯。",
            },
            {
                problem: "生成前不知道實際要扣多少額度，如果遇到生成失敗還會白白浪費點數。",
                solution: "卡片在點擊生成前會明確顯示設定與所需點數，單張最平需 {minCredits}點數，最貴需 {maxCredits}點數；若生成失敗，系統會將點數退回。",
            },
            {
                problem: "為了製作一部短劇要切換和管理多個不同平台的 AI 帳號，既混亂又難管理。",
                solution: "DramaCanvas 將 GPT Image 2、Midjourney V7、Nano Banana 及多款視頻模型整合在同一個畫布，亦支援連接自己的 API Key（BYOK），由供應商直接計費。",
            },
            {
                problem: "不習慣將分鏡想法翻譯成英文提示詞，擔心表達不準確影響畫面。",
                solution: "您可以在卡片上直接用自己的語言（如繁體中文）撰寫提示詞，平台介面亦原生支援繁體中文，方便直接依據劇本內容進行描述。",
            },
        ],
    },
    "ja-JP": {
        intro: "GPT Image 2とは、OpenAIによる画像生成・編集モデルシリーズです。DramaCanvasのキャンバス上で脚本から画像生成、動画化の始点まで一連で制作できます。初回登録の{signupCredits}クレジットで、最安設定なら最大{freeCount}枚を無料でお試しいただけます。",
        controls:
            "解像度は1K・2K・4Kに対応しており、GPT Image 2は全サイズ同額、2.5と2.6はサイズに応じて消費が増えます。生成カードに事前に必要クレジットが表示され、最安設定で1枚あたり{minCredits}クレジット、最大サイズや上位版では最大{maxCredits}クレジットを消費します。",
        sceneText:
            "ショートドラマ制作では、キャラクターの設定資料や表情の描き分け、文字が読める9:16の縦型ポスターや劇中小道具（手紙やスマホ画面）の生成に適しています。参照画像を用いた衣装や背景の変更、ブランドドラマ向けの商品カット生成にも活用でき、生成画像はキャンバス上のSeedance 2.5やKling 3.0などの動画モデルへ直接始点画像として渡せます。",
        steps: [
            "ログイン後にキャンバスを開き、生成カードを追加してモデル選択でGPT Image 2・2.5・2.6のいずれかを選びます。",
            "プロンプト入力欄に日本語などで描写したいシーンを入力し、参照画像に対応したバージョンでは参考画像を添付します。",
            "カード上で1K・2K・4Kなどの解像度を設定し、生成ボタンを押す前に表示される必要クレジット数を確認して生成を実行します。",
            "キャンバス上に並んだ生成結果から採用するものを選び、そのまま同画面の動画モデルの始点画像に設定してタイムライン編集へ進めます。",
        ],
        faq: [
            {
                question: "GPT Image 2とはどのようなモデルですか？",
                answer: "GPT Image 2は、OpenAIが開発した画像生成および画像編集モデルのシリーズです。DramaCanvasではGPT Image 2、GPT Image 2.5、GPT Image 2.6の各バージョンに対応しており、テキストからの新規生成に加えて参照画像を用いた編集や合成が行えます。劇中の小道具や文字入りの縦型ポスター、絵コンテ用のカット作成などに活用されています。",
            },
            {
                question: "DramaCanvasでのGPT Image 2の使い方はどうすればよいですか？",
                answer: "キャンバスを開き、生成カードを追加してモデル選択でGPT Image 2のバージョンを指定します。プロンプト欄に作りたい場面を入力し、必要に応じて参照画像を添付して生成ボタンを押すと、キャンバス上に画像が出力されます。画面右側のAgentチャットを使って、会話形式でカード作成や画像生成を行うことも可能です。",
            },
            {
                question: "GPT Image 2の利用料金や消費クレジットはいくらですか？",
                answer: "DramaCanvasでの画像生成にはクレジットを使用し、最安設定の画像は1枚あたり{minCredits}クレジット、解像度や上位バージョンに応じて最大{maxCredits}クレジットを消費します。GPT Image 2は全解像度で同額ですが、GPT Image 2.5および2.6は解像度が上がると消費クレジットが増える仕組みです。生成失敗時には消費されたクレジットが自動で返却されます。",
            },
            {
                question: "GPT Image 2を無料で試す方法はありますか？",
                answer: "新規アカウント登録時に{signupCredits}クレジットが付与され、クレジットカードの登録なしで期限なく利用できます。最安設定の画像生成であれば最大{freeCount}枚まで追加料金なしでお試しいただけます。キャンバス上での脚本執筆や絵コンテカードの配置といった企画作業自体は無料で行えます。",
            },
            {
                question: "自分のAPIキー（BYOK）を使ってGPT Image 2を利用できますか？",
                answer: "はい、自身のOpenAIのAPIキーを接続して利用するBYOKに対応しています。BYOK利用時はAPIの提供元から直接利用料が請求され、DramaCanvas側での生成クレジットは消費されません（別途ワークスペースのサービス手数料が適用されます）。また、DramaCanvas MCPを経由して外部のAIアシスタントからキャンバスを操作することも可能です。",
            },
            {
                question: "GPT Image 2のプロンプト作成のコツや対応言語は？",
                answer: "DramaCanvasのプロンプト入力欄は日本語を含む多言語入力に対応しているため、普段使っている自然な言葉で指示を記述できます。人物の衣装や背景を変更したい場合は、対応バージョンを選んだ上で参照画像を添付し、変更したい箇所を具体的に指示すると狙った画像を得やすくなります。劇中の手紙や看板などの文字要素を入れたい場合も、プロンプト内で表示したい文言を明記することで反映できます。",
            },
            {
                question: "GPT Image 2でショートドラマを作る際の制限やキャラクターの一貫性はどうですか？",
                answer: "承認済みのキャラクター参照画像カードを再利用することで人物の再現性を高められますが、すべてのカットで一貫性が保たれるわけではないため、生成ごとに人間の目による確認が必要です。また、生成される解像度は1K、2K、4Kから選択する仕様となっています。納得のいくカットができるまでキャンバス上で比較しながら選定し、次の動画モデルへ繋げる進め方が実用的です。",
            },
            {
                question: "生成した画像は商用利用できますか？また他のモデルとも併用できますか？",
                answer: "商用利用の可否や条件については、OpenAIの利用規約およびDramaCanvasの利用規約をご確認ください。なお、DramaCanvasは独立したプラットフォームであり、OpenAIの公式パートナーや開発元ではありません。キャンバス上ではMidjourney V7やNano Bananaで作成した画像、あるいはSeedance 2.5、Kling 3.0、Veo 3.1といった動画モデルと自由に組み合わせて制作できます。",
            },
            {
                question: "開発元の公式アプリで直接GPT Image 2を使う場合と何が違いますか？",
                answer: "DramaCanvasは開発元から独立したプラットフォームであり、公式パートナーではありません。開発元の単体アプリとの違いは、脚本の流し込みから絵コンテの分割、複数の画像・動画モデルの生成、そしてタイムラインでの編集までをひとつのキャンバス上で一貫して進められる点にあります。画質や生成速度、価格の優位性を謳うものではなく、短編ドラマ制作の工程を統合した環境を提供します。",
            },
            {
                question: "既存の画像をもとに、衣装や背景の一部だけを変更することはできますか？",
                answer: "はい、対応するバージョンを選択して参照画像をカードに添付し、プロンプトで指示することで衣装や背景、時間帯などを変更・編集できます。ただし、キャラクターの一貫性を保つためには承認済みの参照画像を活用しつつも、各カットで人間の目による確認が必要です。",
            },
        ],
        capabilities: [
            {
                title: "人物設定画の作成",
                body: "プロンプトで容姿や衣装、小道具の特徴を指定し、三面図や詳細な設定シートを生成します。短編ドラマの登場人物のビジュアルを固定する設計図として役立ちます。",
                caseId: "cyberpunk-character-sheet",
            },
            {
                title: "髪型や表情のテスト",
                body: "確定した顔の参照画像をカードに添付して指示文を送り、同一人物の様々な表情や髪型の差分を並べて生成します。シーンごとの喜怒哀楽の演じ分けや外見の整合性を事前に確認できます。",
                caseId: "twelve-hairstyles",
            },
            {
                title: "絵コンテ枠の生成",
                body: "脚本のシチュエーションや構図をプロンプトで渡し、連続したシーンのカット画像を書き出します。緊迫したサバイバル劇などの演出プランを撮影前に可視化できます。",
                caseId: "thriller-storyboard",
            },
            {
                title: "背景美術と時間変化",
                body: "ロケーションの特徴とともに朝昼晩の時間帯や季節を指定し、劇中の舞台となる背景スチルを生成します。同一の場所で時間経過や天候の変化を描く美術設定として配置できます。",
            },
            {
                title: "縦型ポスターの作成",
                body: "縦型9:16の比率を指定し、劇中の世界観とともに読み取り可能なタイトル文字を含んだ画像を生成します。短編ドラマの配信カバーや告知用キービジュアルとして活用できます。",
                caseId: "dark-archive-poster",
            },
            {
                title: "衣装や背景の差し替え",
                body: "作成済みの画像を参照としてカードに添付し、プロンプトで衣装やロケーション、時間帯の変更を指定して画像を編集します。同じ登場人物の衣装違いや別シーンへの流用をスムーズに行えます。",
            },
            {
                title: "動画の第1フレーム",
                body: "生成した静止画をそのまま同一キャンバス上の動画モデルの先頭フレームに指定し、映像クリップを生成します。Seedance 2.5やKling 3.0、Veo 3.1に渡して、タイムライン編集へと繋げられます。",
            },
        ],
        problems: [
            {
                problem: "画像ごとにキャラクターの顔や服装が変わってしまい、同一人物に見えません。",
                solution: "承認済みのキャラクター参照画像をカードに添付して生成することで見た目のブレを抑えられます。ただし完全に一致するわけではないため、すべてのショットで人間の目による確認が必要です。",
            },
            {
                problem: "画像生成と動画生成で別のツールを行き来し、ダウンロードやアップロードに手間がかかります。",
                solution: "同一のキャンバス上でGPT Image 2の画像を動画モデルの第1フレームに指定し、そのままタイムラインへ並べて編集できます。Seedance 2.5やKling 3.0、Veo 3.1への受け渡しが一つの画面で完結します。",
            },
            {
                problem: "生成ボタンを押すまで何クレジット消費するかわからず、失敗したときにクレジットが無駄になるのも不安です。",
                solution: "生成カード上に設定内容と消費クレジットが事前に明示され、最安で{minCredits}クレジット、最大で{maxCredits}クレジットと確認してから実行できます。また、生成に失敗した場合はクレジットが返還されます。",
            },
            {
                problem: "複数のAIモデルを試すために、サービスごとに個別のアカウントを契約して管理するのが面倒です。",
                solution:
                    "DramaCanvasならひとつの画面でGPT Image 2だけでなくMidjourney V7や複数の動画モデルをまとめて利用できます。自身のAPIキーを接続して利用することも可能で、その場合はDramaCanvas側で生成クレジットを消費せず提供元から直接請求されます（別途ワークスペース利用料がかかります）。",
            },
            {
                problem: "英語でプロンプトを書かないと意図通りの画像が出ないのではないかと不安です。",
                solution: "DramaCanvasでは日本語など使い慣れた言語のままプロンプトを入力して生成できます。また、キャンバス右側のチャットに要望を伝えることで、カードの作成や生成を任せることも可能です。",
            },
        ],
    },
    "ko-KR": {
        intro: "DramaCanvas에서 OpenAI의 GPT Image 2(gpt-image 2)로 숏드라마 스토리보드와 씬 스틸을 제작해 보세요. 가입 즉시 지급되는 {signupCredits} 크레딧으로 기본 설정 기준 최대 {freeCount}장까지 무료 체험이 가능합니다.",
        controls:
            "GPT Image 2는 1K, 2K, 4K 해상도 모두 비용이 같지만, GPT Image 2.5와 GPT Image 2.6은 고해상도일수록 더 많은 크레딧이 소모됩니다. 생성 카드에서 실행 전 필요 크레딧을 미리 확인할 수 있으며, 규격에 따라 최소 {minCredits} 크레딧부터 최대 {maxCredits} 크레딧까지 차감됩니다.",
        sceneText:
            "인물 설정표와 표정 시트, 씬 스틸, 읽기 쉬운 타이틀 텍스트가 들어간 9:16 세로형 포스터와 표지 제작에 적합합니다. 레퍼런스 이미지를 참조해 의상이나 배경을 바꾸거나 편지·스마트폰 화면·간판 같은 소품 컷, 브랜드 숏드라마용 상품 컷을 만들 때 유용합니다. 작업한 이미지는 같은 캔버스에서 영상 모델의 첫 프레임으로 넘겨 숏드라마 클립으로 이어갈 수 있습니다.",
        steps: [
            "대본을 붙여넣어 스토리보드 카드로 나누거나, 캔버스 빈 곳을 클릭해 새 이미지 생성 카드를 추가합니다.",
            "생성 카드의 모델 선택 메뉴에서 GPT Image 2 계열(GPT Image 2, 2.5, 2.6)과 해상도를 고른 뒤 프롬프트를 한국어로 입력합니다.",
            "선택한 버전 지원 여부에 따라 레퍼런스 이미지를 첨부하고 카드에 표시된 필요 크레딧을 확인한 후 생성 버튼을 누릅니다.",
            "캔버스에 나란히 나타난 결과물 중 마음에 드는 컷을 선택해 비디오 모델 카드의 첫 프레임으로 연결합니다.",
        ],
        faq: [
            {
                question: "GPT Image 2 모델은 어떤 버전이 있고 각각 어떻게 다른가요?",
                answer: "DramaCanvas에서는 OpenAI의 GPT Image 2, GPT Image 2.5, GPT Image 2.6 세 가지 버전을 제공합니다. 세 버전 모두 1K, 2K, 4K 해상도를 지원하며, 텍스트 프롬프트 생성과 레퍼런스 이미지를 활용한 편집이 가능합니다. GPT Image 2는 모든 해상도에서 비용이 동일하지만, GPT Image 2.5와 2.6은 해상도가 커질수록 더 많은 크레딧이 소모됩니다.",
            },
            {
                question: "gpt-image 2 생성을 무료로 체험할 수 있나요? 비용은 어떻게 되나요?",
                answer: "신규 가입 시 카드 등록 없이 유효기간이 없는 {signupCredits} 크레딧이 1회 제공됩니다. 가장 저렴한 최저 사양 기준 1장당 {minCredits} 크레딧이 소모되어 최대 {freeCount}장까지 무료 체험이 가능하며, 고사양 버전과 고해상도는 1장당 최대 {maxCredits} 크레딧이 차감됩니다. 대본 정리와 캔버스 기획 작업은 무료이며, 추가 생성에 필요한 멤버십 플랜과 크레딧 팩은 요금제 페이지에서 구매하실 수 있습니다.",
            },
            {
                question: "gpt-image-2 prompt는 숏드라마 제작 시 어떻게 작성해야 하나요?",
                answer: "인물의 표정, 구도, 의상, 조명, 씬 배경을 구체적으로 묘사하여 원하는 언어로 자유롭게 작성하시면 됩니다. 해당 버전에 레퍼런스 이미지를 첨부하면 인물이나 스타일의 방향을 맞추는 데 도움이 됩니다. 캔버스 우측의 에이전트 채팅을 이용하면 대화를 통해 프롬프트를 다듬고 카드를 자동으로 생성할 수도 있습니다.",
            },
            {
                question: "gpt image 2 api나 자체 gpt-image-2 api 키(BYOK)를 연동할 수 있나요?",
                answer: "네, 본인이 보유한 자체 API 키를 연결(BYOK)하여 작업할 수 있습니다. 자체 키를 연결하면 모델 비용은 해당 API 제공사가 사용자에게 직접 청구하며, DramaCanvas 생성 크레딧은 차감되지 않고 별도의 워크스페이스 서비스 이용료만 적용됩니다. 외부 AI 어시스턴트를 활용하는 창작자라면 DramaCanvas MCP를 통해 캔버스를 제어할 수도 있습니다.",
            },
            {
                question: "gpt image 2 디시 등 커뮤니티에서 거론되는 캐릭터 일관성은 어떻게 유지하나요?",
                answer: "승인된 캐릭터 레퍼런스 이미지를 지원 버전에 첨부해 재사용하면 특징을 유지하는 데 도움이 됩니다. 다만 모든 컷마다 작업자가 직접 확인하고 선별하는 과정이 필요합니다. 캔버스에 결과물이 나란히 생성되므로 여러 컷을 한눈에 비교하며 가장 적합한 이미지를 고를 수 있습니다.",
            },
            {
                question: "생성한 이미지를 숏드라마 영상으로 어떻게 변환하나요?",
                answer: "캔버스에서 선택한 이미지를 동일한 캔버스에 있는 Seedance 2.5, Kling 3.0, Veo 3.1 등 비디오 모델 카드의 첫 프레임으로 바로 지정할 수 있습니다. 비디오 모델이 생성한 영상 클립은 하단 타임라인으로 넘겨 숏드라마 영상으로 편집하면 됩니다. 이미지부터 영상 클립까지 하나의 캔버스에서 모두 처리할 수 있습니다.",
            },
            {
                question: "이미지 생성이 실패하면 소모된 크레딧은 어떻게 처리되나요?",
                answer: "생성이 실패할 경우 차감되었던 크레딧은 계정으로 즉시 반환됩니다. 또한 생성 카드를 실행하기 전에 해당 설정에서 소모될 크레딧이 카드에 미리 표시됩니다. 실패 시 크레딧이 유실되지 않으므로 부담 없이 테스트해 보실 수 있습니다.",
            },
            {
                question: "상업적 숏드라마 제작에 활용해도 되나요?",
                answer: "상업적 이용에 대해서는 OpenAI 이용약관과 DramaCanvas 이용약관을 함께 확인하시기 바랍니다. DramaCanvas는 모델 개발사가 아니며 공식 파트너사가 아닌 독립된 창작 플랫폼입니다. 작업 환경은 한국어를 포함해 영어, 일본어, 중국어 등 다양한 인터페이스 언어를 지원합니다.",
            },
            {
                question: "개발사의 자체 앱에서 GPT Image 2를 직접 쓰는 것과 무엇이 다른가요?",
                answer: "DramaCanvas는 모델 개발사가 아니며 공식 파트너도 아닌 독립 플랫폼입니다. 개발사 자체 앱과의 차이는 단일 이미지 생성을 넘어 대본 분할, 스토리보드 카드 배치, 여러 이미지 및 비디오 모델(Midjourney, Kling 등) 생성, 타임라인 편집까지 숏드라마 제작의 전 과정을 하나의 캔버스에서 연결해 작업할 수 있다는 점입니다.",
            },
            {
                question: "기존에 만든 이미지의 옷이나 배경만 참조해서 수정할 수 있나요?",
                answer: "선택한 GPT Image 2 버전이 참조 이미지를 지원할 때 생성 카드에 참조 이미지를 첨부하고 변경할 의상이나 배경을 프롬프트로 지정해 수정할 수 있습니다. 다만 모델 버전에 따라 참조 이미지 지원 여부가 다를 수 있으므로 카드 설정에서 확인해야 하며, 결과물은 매 샷 직접 검토해야 합니다.",
            },
        ],
        capabilities: [
            {
                title: "인물 디자인 시트",
                body: "원하는 인물 묘사와 세부 소품을 프롬프트로 전달하여 다각도 턴어라운드 이미지를 얻습니다. 숏드라마 촬영 전 주인공의 외형 기준을 세우고 소품 설정을 정리할 때 활용합니다.",
                caseId: "cyberpunk-character-sheet",
            },
            {
                title: "표정과 헤어 점검",
                body: "동일한 얼굴 기준 프롬프트나 참조 이미지를 전달하여 12가지 헤어스타일이나 다양한 표정 변화를 생성합니다. 숏드라마 배역에 어울리는 인물 스타일을 사전에 비교하고 점검하는 데 쓰입니다.",
                caseId: "twelve-hairstyles",
            },
            {
                title: "스토리보드 컷 구성",
                body: "각 장면의 상황과 구도 지시문을 텍스트로 전달하여 스릴러 등 주요 씬의 보드 이미지를 만듭니다. 숏드라마 본 제작에 들어가기 전 컷의 시각적 흐름과 긴장감을 확인하는 데 활용합니다.",
                caseId: "thriller-storyboard",
            },
            {
                title: "시간대·계절 배경",
                body: "계절과 특정 시간대의 공간 설정을 프롬프트로 입력하여 겨울 야외나 황혼 무렵의 로케이션 스틸 이미지를 얻습니다. 숏드라마 씬의 계절감과 시간적 배경 분위기를 구축할 때 활용합니다.",
            },
            {
                title: "세로형 표지 포스터",
                body: "작품 분위기 묘사와 읽을 수 있는 제목 글자를 함께 전달하여 9:16 비율의 세로형 이미지를 생성합니다. 모바일 숏드라마 플랫폼에 등록할 공식 메인 포스터와 회차별 표지로 활용합니다.",
                caseId: "dark-archive-poster",
            },
            {
                title: "참조 이미지 편집",
                body: "선택한 버전의 카드에 기존 이미지를 참조로 첨부하고 변경할 의상이나 배경, 시간대 지시문을 작성합니다. 숏드라마 스토리 전개에 따른 인물의 옷차림 변경이나 낮과 밤의 씬 전환에 활용합니다.",
            },
            {
                title: "영상용 첫 프레임",
                body: "원하는 씬 구도를 프롬프트로 입력해 1K·2K·4K 해상도의 고화질 정지 이미지를 생성합니다. 동일한 캔버스 안에서 Seedance 2.5, Kling 3.0, Veo 3.1 등 비디오 모델의 시작 프레임으로 연결해 숏드라마 컷을 제작합니다.",
            },
        ],
        problems: [
            {
                problem: "컷을 넘길 때마다 주인공의 얼굴이나 옷차림이 달라져서 영상의 몰입감이 떨어집니다.",
                solution: "승인된 캐릭터 참조 이미지를 첨부해 재사용하면 일관성을 지키는 데 도움이 됩니다. 다만 AI 특성상 모든 샷은 제작자가 직접 눈으로 확인하는 과정이 필요합니다.",
            },
            {
                problem: "이미지를 생성한 뒤 매번 파일을 내려받아 다른 영상 생성 사이트로 다시 올리는 과정이 번거롭습니다.",
                solution: "하나의 캔버스 안에서 GPT Image 2로 만든 이미지를 비디오 모델의 첫 프레임으로 바로 지정할 수 있습니다. 생성된 영상 클립은 같은 화면의 타임라인으로 바로 옮겨 숏드라마로 편집하면 됩니다.",
            },
            {
                problem: "생성 버튼을 누르기 전까지 크레딧이 얼마나 들지 알 수 없고, 생성이 실패했을 때 크레딧만 날릴까 봐 두렵습니다.",
                solution:
                    "생성 카드를 실행하기 전에 현재 설정에 필요한 크레딧 수치가 미리 안내되며, 생성이 실패하면 차감되었던 크레딧은 다시 반환됩니다. GPT Image 2 모델 기준으로 가장 저렴한 이미지는 {minCredits} 크레딧, 가장 높은 설정은 {maxCredits} 크레딧이 듭니다.",
            },
            {
                problem: "스토리보드, 이미지, 비디오 툴을 각각 결제하고 여러 사이트를 번갈아 로그인하며 작업하기 피곤합니다.",
                solution:
                    "대본 분할부터 GPT Image 2, Midjourney, Kling 등 다양한 이미지와 비디오 모델 생성을 하나의 캔버스에서 처리합니다. 또한 개인 API 키를 연결하면 모델 제공업체에 직접 결제되며 DramaCanvas의 생성 크레딧 차감 없이 이용할 수 있습니다(별도의 워크스페이스 서비스 이용료 적용).",
            },
            {
                problem: "영어로 프롬프트를 번역해서 넣느라 시간도 오래 걸리고 원하는 숏드라마 연출 의도가 왜곡됩니다.",
                solution: "DramaCanvas에서는 한국어로 직접 프롬프트를 작성하여 이미지를 생성할 수 있습니다. 또한 화면 오른쪽의 에이전트 대화창을 통해 대화하듯 카드를 생성하고 작업을 실행할 수도 있습니다.",
            },
        ],
    },
    "es-ES": {
        intro: "GPT Image 2 es la familia de modelos de OpenAI para generar y editar imágenes dentro de DramaCanvas, desde el guion hasta el guion gráfico. Puedes trabajar con GPT Image 2, GPT Image 2.5 y GPT Image 2.6 en resoluciones de 1K, 2K y 4K para crear personajes, escenas y carteles verticales. Al registrarte recibes {signupCredits} créditos de regalo para probar hasta {freeCount} imágenes desde {minCredits} créditos cada una.",
        controls:
            "Las versiones GPT Image 2, GPT Image 2.5 y GPT Image 2.6 permiten generar en 1K, 2K y 4K, con el costo visible en la tarjeta antes de confirmar. En GPT Image 2 el valor en créditos no cambia con el tamaño, mientras que en 2.5 y 2.6 las resoluciones mayores descuentan más saldo, variando entre {minCredits} créditos y {maxCredits} créditos por imagen.",
        sceneText:
            "En dramas cortos, este modelo sirve para armar hojas de diseño y expresiones de personajes, cuadros de guion gráfico y portadas verticales 9:16 con texto legible. También permite cambiar vestuarios o fondos mediante imágenes de referencia, diseñar accesorios de utilería como cartas o pantallas de celular, y obtener tomas de producto para historias comerciales. Cada toma resultante se puede colocar directamente como fotograma inicial en modelos de video como Seedance 2.5, Kling 3.0 o Veo 3.1 en el mismo lienzo.",
        steps: [
            "Inicia sesión, abre un lienzo y añade una tarjeta de generación, o pega tu guion para dividirlo en tarjetas de guion gráfico.",
            "En el selector de modelo elige GPT Image 2, GPT Image 2.5 o GPT Image 2.6 y define la resolución entre 1K, 2K y 4K.",
            "Escribe tu indicación en tu propio idioma, adjunta imágenes de referencia si la versión lo admite y revisa los créditos requeridos que indica la tarjeta antes de pulsar generar.",
            "Las tomas resultantes aparecen contiguas en el lienzo para comparar opciones; conserva las aprobadas para usarlas como fotograma inicial en modelos de video o llévalas a la línea de tiempo.",
        ],
        faq: [
            {
                question: "¿Qué diferencias prácticas existen entre GPT Image 2, GPT Image 2.5 y GPT Image 2.6?",
                answer: "Las tres versiones de OpenAI permiten generar desde texto o editar con referencias en resoluciones de 1K, 2K y 4K. La diferencia principal en DramaCanvas radica en la estructura de créditos: GPT Image 2 cuesta lo mismo en todas las resoluciones, mientras que en GPT Image 2.5 y GPT Image 2.6 los tamaños superiores requieren más saldo. Puedes alternar entre estas versiones en el selector de la tarjeta de acuerdo con las necesidades de cada toma de tu historia.",
            },
            {
                question: "¿Cómo usar GPT Image 2 para producir un drama corto en DramaCanvas?",
                answer: "Empieza creando un lienzo nuevo y añade una tarjeta de generación desde la interfaz o pide al chat del agente a la derecha que la prepare por ti. Elige la versión del modelo, escribe tu indicación en español y adjunta imágenes de referencia si necesitas mantener elementos visuales del personaje o de la escena. Tras generar, compara los resultados en paralelo sobre el lienzo y envía la toma seleccionada como fotograma inicial a modelos de video como Kling 3.0 o Veo 3.1.",
            },
            {
                question: "¿Es posible probar GPT Image 2 gratis en DramaCanvas?",
                answer: "Cada cuenta nueva recibe {signupCredits} créditos de bienvenida sin necesidad de ingresar tarjeta bancaria y sin fecha de caducidad. Con este saldo puedes generar hasta {freeCount} imágenes en la configuración inicial, ya que cada toma mínima descuenta {minCredits} créditos. Además, organizar ideas, escribir guiones y estructurar tarjetas en el lienzo es completamente gratuito.",
            },
            {
                question: "¿Cuál es el precio de GPT Image 2 y cómo se cobran las resoluciones?",
                answer: "La plataforma descuenta créditos del saldo de tu cuenta según el modelo y el formato elegido, en lugar de cobrar dinero por cada imagen. En GPT Image 2 el consumo se mantiene igual en cualquier tamaño, mientras que en GPT Image 2.5 y GPT Image 2.6 las resoluciones de 2K y 4K descuentan más saldo. El gasto por imagen oscila entre {minCredits} créditos en la opción base y {maxCredits} créditos en la configuración más alta, reflejándose en la tarjeta antes de confirmar.",
            },
            {
                question: "¿Cómo estructurar para GPT Image 2 prompts en español para tus escenas?",
                answer: "Puedes redactar tus indicaciones en español describiendo con claridad la iluminación, el encuadre de cámara, el vestuario y la ambientación de la escena. Especifica con detalle las expresiones de los personajes y cualquier texto legible que deba figurar en carteles, pantallas o documentos. Si la versión elegida lo permite, adjunta una imagen de referencia en la tarjeta para guiar el aspecto visual sin recargar el texto.",
            },
            {
                question: "¿Cómo funciona la opción BYOK con tu propia clave de API?",
                answer: "DramaCanvas ofrece la modalidad BYOK para que conectes tu propia clave de API de OpenAI directamente al espacio de trabajo. En esta modalidad, tu proveedor de API factura tu consumo de generación y DramaCanvas no deduce créditos por imagen, aplicando únicamente una tarifa de servicio por el espacio de trabajo. También puedes conectar asistentes externos para controlar el lienzo mediante DramaCanvas MCP.",
            },
            {
                question: "¿Cómo se maneja la consistencia de personajes entre diferentes planos?",
                answer: "Reutilizar una imagen de referencia del personaje aprobado ayuda a orientar el rostro, el peinado y el vestuario en las tomas siguientes. Sin embargo, ningún modelo produce resultados idénticos de manera automática, por lo que cada plano requiere revisión humana antes de continuar. En el lienzo puedes generar varias opciones en paralelo y conservar únicamente las tomas que mantengan la continuidad visual.",
            },
            {
                question: "¿Qué sucede si una generación falla y qué normas aplican al uso comercial?",
                answer: "Si una generación experimenta un fallo, el sistema devuelve íntegramente los créditos descontados a tu saldo. Para creaciones destinadas a distribución comercial, debes consultar los términos de OpenAI y los términos de DramaCanvas. Ten presente que DramaCanvas es una plataforma independiente y no es socia oficial de la empresa desarrolladora del modelo.",
            },
            {
                question: "¿En qué se diferencia usar GPT Image 2 en DramaCanvas frente a la aplicación del propio desarrollador?",
                answer: "DramaCanvas es una plataforma independiente y no es socia oficial ni la creadora del modelo. Su diferencia principal radica en el entorno de trabajo: en lugar de un chat genérico, ofrece un lienzo de producción donde puedes desglosar tu guion en tarjetas, comparar tomas lado a lado, usar la imagen como fotograma inicial en modelos de video como Seedance 2.5, Kling 3.0 o Veo 3.1, y organizar todo en una línea de tiempo.",
            },
            {
                question: "¿Cómo puedo editar una imagen existente usando una referencia en DramaCanvas?",
                answer: "En las versiones de GPT Image 2 que admiten imágenes de referencia, adjuntas la imagen aprobada a la tarjeta de generación e indicas los cambios necesarios en el texto, como variaciones de ropa o iluminación. El resultado se coloca junto a la toma original en el lienzo para que verifiques si encaja con tu escena.",
            },
        ],
        capabilities: [
            {
                title: "Hojas de diseño de personaje",
                body: "Describe los rasgos físicos y accesorios en una tarjeta de generación para obtener vistas de tu protagonista desde varios ángulos. Te ayuda a fijar la apariencia base del elenco antes de producir las escenas del drama corto.",
                caseId: "character-board",
            },
            {
                title: "Pruebas de expresión y apariencia",
                body: "Adjunta una imagen aprobada del personaje y solicita variaciones de gestos o peinados en la descripción de texto. Te permite evaluar cómo reacciona el protagonista en momentos de tensión dramática sin alterar su identidad facial.",
                caseId: "twelve-hairstyles",
            },
            {
                title: "Cuadros para guion gráfico",
                body: "Introduce el texto de cada escena en una tarjeta para ilustrar planos generales o encuadres cerrados de tu historia. Sirve para planificar visualmente el ritmo de cada secuencia antes de pasar a la generación de video.",
                caseId: "thriller-storyboard",
            },
            {
                title: "Escenarios y ambientación de escena",
                body: "Escribe los elementos de la locación y especifica el clima o la hora del día para generar fondos cinematográficos. Facilita conservar la continuidad ambiental de un mismo espacio en tomas diurnas o nocturnas del drama corto.",
            },
            {
                title: "Pósteres verticales con título legible",
                body: "Aporta las instrucciones visuales de tu historia junto con el título para generar portadas en formato vertical 9:16 con tipografía legible. Te entrega una portada lista para publicar que identifica tu drama corto en plataformas móviles.",
                caseId: "dark-archive-poster",
            },
            {
                title: "Edición de vestuario y fondo",
                body: "Carga la imagen aprobada en una versión compatible y detalla las modificaciones de vestimenta, iluminación o entorno en el texto descriptivo. Te permite trasladar al mismo personaje a nuevas situaciones narrativas sin tener que diseñarlo otra vez.",
            },
            {
                title: "Fotogramas iniciales para video",
                body: "Selecciona una imagen lograda con GPT Image 2 y establécela directamente como fotograma inicial de modelos como Kling 3.0, Seedance 2.5 o Veo 3.1 en el lienzo. Asegura un punto de partida visual definido para generar movimiento y enviar las tomas a la línea de tiempo.",
            },
        ],
        problems: [
            {
                problem: "Mi personaje cambia de apariencia física en cada imagen y se pierde la continuidad de la historia.",
                solution: "Reutilizar una imagen de referencia del personaje aprobado ayuda a conservar sus rasgos en versiones compatibles de GPT Image 2, aunque cada plano generado siempre requerirá una comprobación humana.",
            },
            {
                problem: "Pierdo mucho tiempo descargando archivos y cambiando de aplicación para convertir mis imágenes en clips de video.",
                solution: "En el lienzo de DramaCanvas puedes enlazar directamente las imágenes de GPT Image 2 como fotograma inicial de modelos de video como Seedance 2.5, Kling 3.0 o Veo 3.1, reuniendo la producción en una sola interfaz.",
            },
            {
                problem: "Nunca tengo claro cuántos créditos va a costar una toma antes de pulsar el botón de generar.",
                solution: "Cada tarjeta muestra los ajustes y los créditos exactos antes de generar; la imagen más económica requiere {minCredits} créditos y la más costosa {maxCredits} créditos según el tamaño y la versión seleccionada.",
            },
            {
                problem: "Me preocupa perder créditos si una generación se interrumpe por algún problema técnico del sistema.",
                solution: "Si una generación no se completa con éxito en la plataforma, los créditos consumidos se devuelven automáticamente a tu saldo.",
            },
            {
                problem: "Siento que debo redactar las descripciones en inglés para que el modelo entienda las tomas que imagino.",
                solution: "Puedes escribir tus indicaciones directamente en español en la tarjeta de generación, y toda la interfaz de DramaCanvas también ofrece soporte nativo en español.",
            },
        ],
    },
    "pt-BR": {
        intro: "O GPT Image 2 reúne os modelos de imagem da OpenAI dentro do DramaCanvas para transformar seu roteiro em cenas visuais na mesma tela. Você pode gerar quadros do zero ou editar planos com referências, testando até {freeCount} imagens com os {signupCredits} créditos recebidos no cadastro. As imagens aprovadas podem servir diretamente como primeiro quadro para modelos de vídeo no seu drama curto.",
        controls:
            "As versões GPT Image 2, GPT Image 2.5 e GPT Image 2.6 geram em 1K, 2K e 4K, sendo que o GPT Image 2 mantém o mesmo custo em qualquer resolução, enquanto o 2.5 e o 2.6 cobram mais por tamanhos maiores. Cada imagem custa entre {minCredits} créditos e {maxCredits} créditos, conforme a versão e o tamanho, com o valor exato visível no cartão antes de gerar.",
        sceneText:
            "No fluxo de um drama curto, esta família de modelos atende desde fichas de personagens e folhas de expressão até quadros de storyboard e fotos de cena. O modelo também gera pôsteres verticais em 9:16 com títulos legíveis, além de documentos e objetos como cartas, placas e telas de celular. Com imagens de referência no cartão, é possível realizar trocas de roupa, ajustes de cenário e fotos de produtos para dramas de marcas.",
        steps: [
            "Faça login na plataforma, abra a tela do projeto e cole seu roteiro para criar os cartões de storyboard.",
            "Adicione um cartão de geração e escolha entre GPT Image 2, GPT Image 2.5 ou GPT Image 2.6 no seletor de modelos.",
            "Digite a cena no campo de prompt e anexe imagens de referência se a versão suportar. O cartão exibe a resolução e os créditos necessários antes de confirmar.",
            "Clique em gerar para visualizar os resultados lado a lado na tela. Use a imagem aprovada como primeiro quadro de um modelo de vídeo e envie os clipes para a linha do tempo.",
        ],
        faq: [
            {
                question: "O que é o chat gpt image 2 e quem desenvolve essa tecnologia?",
                answer: "O GPT Image 2 é a família de modelos de geração e edição de imagens desenvolvida pela OpenAI. No DramaCanvas, você tem acesso às versões GPT Image 2, GPT Image 2.5 e GPT Image 2.6 para ilustrar roteiros e gerar quadros na mesma tela. O DramaCanvas é uma plataforma independente, sem vínculo de parceria oficial ou sociedade com a OpenAI.",
            },
            {
                question: "Como testar o gpt image 2 free no DramaCanvas?",
                answer: "Ao criar sua conta, você recebe {signupCredits} créditos gratuitos de uso único, sem precisar cadastrar cartão e sem data de expiração. Esse saldo cobre até {freeCount} imagens na configuração mais barata da ferramenta. Caso você opte por versões mais avançadas ou resoluções maiores, o consumo de créditos por imagem aumenta.",
            },
            {
                question: "Posso usar minha própria gpt image 2 api com o recurso BYOK?",
                answer: "Sim, você pode conectar sua própria chave de API por meio do recurso BYOK (sua própria chave de API). Nessa modalidade, a OpenAI fatura os custos de geração diretamente com você, e o DramaCanvas não debita créditos de geração das imagens. Aplica-se apenas uma taxa de serviço separada pelo uso do espaço de trabalho no canvas.",
            },
            {
                question: "Como escrever um gpt image 2 prompt eficiente para cenas de drama curto?",
                answer: "Você pode redigir seu prompt em português ou no idioma de sua preferência, detalhando a ação, a ambientação, os objetos de cena e o figurino. Se a versão escolhida permitir, anexe imagens de referência no próprio cartão para orientar o visual do plano. Você também pode acionar o chat do agente à direita da tela para escrever prompts e gerar imagens por conversa.",
            },
            {
                question: "Quais tipos de gpt image 2 prompts funcionam melhor na produção de minidramas?",
                answer: "O modelo atende com precisão a descrições de fichas de personagens, folhas de expressões e quadros detalhados de storyboard. Ele também gera objetos de cena como cartas, documentos, telas de celular e placas com textos legíveis. Para dramas curtos de marcas, você pode usar referências visuais para produzir fotos de produtos, trocas de figurino e alterações de cenário.",
            },
            {
                question: "Qual a diferença de custo entre gpt 2 image, GPT Image 2.5 e GPT Image 2.6?",
                answer: "As três versões oferecem formatos de saída em 1K, 2K e 4K. No GPT Image 2, a quantidade de créditos é a mesma para qualquer resolução, enquanto no GPT Image 2.5 e no GPT Image 2.6 os tamanhos maiores custam mais créditos. O valor mais baixo começa em {minCredits} créditos por imagem e a faixa mais alta atinge {maxCredits} créditos, sendo o custo exato mostrado no cartão antes de você gerar.",
            },
            {
                question: "Como utilizar a imagem gerada no fluxo de image 2 gpt para criar vídeos?",
                answer: "Após clicar em gerar, os resultados aparecem lado a lado na tela para facilitar sua comparação e escolha. A imagem que você aprovar pode ser conectada como o primeiro quadro de modelos de vídeo na mesma tela, como Seedance 2.5, Kling 3.0 e Veo 3.1. Em seguida, os clipes de vídeo gerados são enviados para a linha do tempo para a edição final do seu drama curto.",
            },
            {
                question: "Como funciona a consistência de personagens e o uso comercial no free gpt image 2?",
                answer: "Reutilizar uma imagem de referência aprovada ajuda na continuidade dos personagens, mas cada plano ainda precisa de revisão humana para ajustes finos. Toda a etapa de planejamento de roteiro e organização dos cartões na tela é gratuita, e qualquer geração com falha tem os créditos devolvidos. Para a utilização comercial das imagens geradas, consulte os termos da OpenAI e os termos do DramaCanvas.",
            },
            {
                question: "Como funcionam os pacotes de créditos e quais outros modelos existem na tela?",
                answer: "Quando os créditos terminarem, você pode adquirir novos pacotes de créditos ou contratar planos de assinatura na página de preços. A tela também suporta modelos de imagem como Nano Banana e Midjourney V7, além de permitir integração com assistentes de inteligência artificial através do DramaCanvas MCP. Toda a interface pode ser configurada em português, espanhol, inglês, japonês, coreano ou chinês.",
            },
            {
                question: "Qual é a diferença entre usar o GPT Image 2 no DramaCanvas e usar diretamente no aplicativo do próprio desenvolvedor?",
                answer: "O DramaCanvas é uma tela de produção independente voltada para novelas curtas, integrando roteiro, cartões de decupagem, vários modelos de imagem e vídeo e linha do tempo em um único lugar. Em vez de produzir imagens isoladas, você compara resultados lado a lado, aproveita as imagens geradas como primeiro quadro em modelos de vídeo como Seedance 2.5, Kling 3.0 ou Veo 3.1 e organiza a edição final na mesma tela. Como plataforma independente, o DramaCanvas não é o desenvolvedor do modelo nem parceiro oficial, sem prometer qualidade superior ou custo menor que a aplicação direta do criador.",
            },
            {
                question: "Como funciona a edição de uma imagem existente com imagens de referência no GPT Image 2?",
                answer: "Nas versões do GPT Image 2 que oferecem suporte a referências, você anexa a imagem original ao cartão de geração e escreve o comando descrevendo as modificações pretendidas. O modelo combina a referência com as instruções para alterar itens como figurino, elementos de fundo ou horários do dia, mantendo os traços fundamentais da cena para a continuidade do episódio.",
            },
        ],
        capabilities: [
            {
                title: "Criação visual de personagens",
                body: "Você envia a descrição textual do protagonista com traços físicos e roupas para gerar pranchas de visual em múltiplos ângulos com adereços detalhados. Esse material serve de referência fixa para manter a identidade visual do elenco durante a produção dos episódios.",
                caseId: "cyberpunk-character-sheet",
            },
            {
                title: "Testes de expressões e visual",
                body: "Você anexa a imagem do ator virtual e descreve reações emocionais ou novos cortes de cabelo para obter uma grade de variações do mesmo rosto. Isso ajuda a testar a consistência do personagem antes de rodar primeiros planos dramáticos com falas fortes.",
                caseId: "twelve-hairstyles",
            },
            {
                title: "Quadros para roteiro visual",
                body: "Você insere os trechos da ação do roteiro para gerar quadros sequenciais com composição de câmera e iluminação de cena. O material permite visualizar a montagem e a tensão da narrativa em uma cena de suspense de sobrevivência.",
                caseId: "thriller-storyboard",
            },
            {
                title: "Pôsteres e capas verticais",
                body: "Você informa o nome da produção e a atmosfera da história para gerar cartazes no formato vertical 9:16 com textos de título legíveis integrados à arte. Essa arte serve como capa principal para atrair o público nas plataformas de novelas curtas para celular.",
                caseId: "dark-archive-poster",
            },
            {
                title: "Cenários com variações temporais",
                body: "Você descreve as locações da história especificando estações do ano ou períodos do dia, como um inverno rigoroso ou o entardecer. O resultado entrega imagens de ambiente prontas para situar o espectador e definir a atmosfera emocional de cada cena da minissérie.",
            },
            {
                title: "Alteração de figurino e cenário",
                body: "Você anexa uma imagem já criada e detalha no comando as mudanças de roupas, fundo ou horário que precisa ajustar. Essa edição mantém a base do plano original, permitindo adaptar o mesmo ambiente para uma nova cena da história sem recriar a imagem do zero.",
            },
            {
                title: "Quadros iniciais para vídeo",
                body: "Você seleciona uma imagem finalizada no canvas e a envia como o primeiro quadro para modelos de vídeo como Seedance 2.5, Kling 3.0 ou Veo 3.1. Essa etapa estabelece o enquadramento de partida antes de animar o clipe e transferi-lo para a linha do tempo da minissérie.",
            },
        ],
        problems: [
            {
                problem: "Meu personagem parece uma pessoa completamente diferente a cada nova imagem que tento gerar para as cenas.",
                solution: "No DramaCanvas, você pode anexar uma imagem de referência aprovada no cartão de geração para orientar o GPT Image 2, o que ajuda na consistência, embora cada plano ainda necessite de revisão humana.",
            },
            {
                problem: "Preciso manter contas abertas em vários sites e ficar baixando e subindo arquivos só para transformar imagens em clipes de vídeo.",
                solution:
                    "O DramaCanvas reúne modelos de imagem como GPT Image 2 e Midjourney V7 e modelos de vídeo como Seedance 2.5, Kling 3.0 e Veo 3.1 no mesmo ambiente. Você pode usar uma imagem gerada diretamente como primeiro quadro do vídeo no próprio canvas e organizar os clipes na linha do tempo.",
            },
            {
                problem: "Fico com receio de gerar imagens sem saber com antecedência quantos créditos serão descontados do meu saldo.",
                solution:
                    "O cartão de geração mostra os parâmetros escolhidos e o custo exato em créditos antes de você clicar para gerar. No GPT Image 2 o consumo é idêntico em 1K, 2K e 4K, enquanto no 2.5 e 2.6 tamanhos maiores consomem mais créditos, variando de {minCredits} créditos na imagem mais econômica até {maxCredits} créditos na mais cara.",
            },
            {
                problem: "Tenho medo de desperdiçar meus créditos caso aconteça algum erro de sistema durante o processamento da imagem.",
                solution:
                    "Quando uma geração falha no DramaCanvas, os créditos correspondentes são devolvidos de forma automática para a sua conta. Além disso, estruturar o roteiro e organizar os cartões no canvas é gratuito, consumindo créditos apenas quando você executa a geração.",
            },
            {
                problem: "Não tenho paciência para ficar traduzindo minhas ideias para o inglês toda vez que preciso criar uma nova cena.",
                solution:
                    "Você pode redigir seus comandos diretamente em português no cartão de geração, já que a plataforma aceita seu próprio idioma e oferece a interface em português. Se preferir, a conversa com o assistente na lateral direita da tela também pode criar cartões e iniciar gerações a partir do bate-papo.",
            },
        ],
    },
};

export default gptImage2Overrides;
