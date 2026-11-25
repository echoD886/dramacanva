import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Facts and prices from the live catalog and verified product limits.
export const seedance25Overrides: ModelPageOverrides = {
    "en-US": {
        intro: "Seedance 2.5 brings ByteDance's Seedance AI video generation model to your DramaCanvas workspace for short drama production. Turn storyboard stills or text prompts into moving takes at 480p, 720p, or 1080p. New accounts get {signupCredits} credits to run a first small test of {freeCount} second(s) at 480p without entering a credit card.",
        controls:
            "Generation is billed per second of video, ranging from {minCredits} credits to {maxCredits} credits per second at the lowest resolution, with 1080p costing several times 480p. The card shows the exact credits before you generate, so test your motion at 480p first before rendering higher resolutions.",
        sceneText:
            "Seedance 2.5 works well for dialogue scenes, character reactions, and establishing shots in an episodic drama. Use it to turn approved character stills from Nano Banana or GPT Image 2 into moving shots, or create scene transitions using a first and last frame pair. Generating takes side by side on the canvas lets you compare motion before placing clips on the timeline.",
        steps: [
            "Add a generation card to your canvas and choose Seedance 2.5 in the model selector. You can also ask the Agent chat on the right to place the card for you.",
            "Type your shot prompt in your own language, and choose your resolution and clip length. Attach an image as your first frame, or add a first and last frame pair if your scene requires a transition.",
            "Check the card to review your selected settings and the exact credits needed for the clip. Click generate to start the video task.",
            "View your generated clips side by side on the canvas to compare takes. Keep your preferred takes and send them directly to the timeline to assemble your short drama.",
        ],
        faq: [
            {
                question: "What is Seedance 2.5, and how does the Seedance AI video model work on DramaCanvas?",
                answer: "Seedance 2.5 is a video generation model developed by ByteDance, belonging to the same model family used in ByteDance's Dreamina app. DramaCanvas provides access to Seedance 2.5 on an independent canvas workspace alongside other leading video and image models. DramaCanvas is an independent platform and is not an official partner of ByteDance.",
            },
            {
                question: "Can I try Seedance 2.5 free on DramaCanvas?",
                answer: "Yes, every new account receives {signupCredits} credits upon registration without needing a credit card. Because video generation is billed per second, these credits cover a short initial test of {freeCount} second(s) at 480p rather than a full scene. Storyboard planning and script drafting on the canvas are completely free, while additional video rendering requires credit packs or a membership plan.",
            },
            {
                question: "How to use Seedance 2.5 for short drama scenes?",
                answer: "Open your canvas and split your script into storyboard cards or create a new shot card directly. Select Seedance 2.5 in the model selector, pick your resolution, and type your prompt or attach a starting image. You can also instruct the Agent chat on the right side of the canvas to build cards and trigger generations for you.",
            },
            {
                question: "How does Seedance image to video work on the canvas?",
                answer: "You can load a still image, such as a character portrait created with Nano Banana or GPT Image 2, directly into the first frame slot of your Seedance card. The model also accepts a first and last frame pair when you need to bridge two specific storyboard moments. The generation card shows which reference image inputs your chosen setting accepts.",
            },
            {
                question: "What is the Seedance pricing structure on DramaCanvas?",
                answer: "Seedance 2.5 is billed per second of generated video, starting at {minCredits} credits per second and reaching {maxCredits} credits per second at the lowest resolution depending on the tier. Rendering at 1080p costs several times 480p, and longer clips cost proportionally more. Your card displays the exact credits before you confirm generation, and any failed generation automatically returns its credits to your account.",
            },
            {
                question: "Can I connect a Seedance API key with BYOK on DramaCanvas?",
                answer: "Yes, DramaCanvas supports BYOK so you can connect your own API key directly to your workspace. When using BYOK, the API provider that issued your key bills you directly, and DramaCanvas deducts no generation credits for those renders. A separate workspace service fee applies, and external AI assistants can also drive the canvas through DramaCanvas MCP.",
            },
            {
                question: "How should I write Seedance prompts for short drama shots?",
                answer: "Write descriptive prompts detailing character actions, camera framing, and lighting in your preferred language. Attaching an approved character reference image to your card helps maintain visual consistency across shots, though each take still needs a human check. As a practical tip, test your motion at 480p first before regenerating the chosen take at 720p or 1080p.",
            },
            {
                question: "Can I use video clips generated with Seedance 2.5 commercially?",
                answer: "Commercial usage depends on both the model developer's rules and platform policies. Please check ByteDance's terms and DramaCanvas terms before using generated video in commercial productions. All completed clips remain stored in your project timeline so you can export your finished short drama.",
            },
        ],
    },
    "zh-CN": {
        intro: "Seedance 2.5 是字节跳动旗下的视频生成模型，与即梦（Dreamina）属于同一模型家族。你可以在画布上通过提示词或首尾帧生成短剧镜头。新注册赠送 {signupCredits} 积分，在 480p 规格下可测试 {freeCount} 秒视频，方便快速验证分镜效果。",
        controls: "视频按生成秒数计费，提供 480p、720p 与 1080p 分辨率，卡片会在点击生成前标明具体设置与扣除积分。最低规格每秒消耗 {minCredits} 积分，高规格每秒消耗 {maxCredits} 积分，建议先以 480p 验证动作后再用高分辨率生成。",
        sceneText:
            "在短剧制作中，Seedance 2.5 适合制作对话镜头、角色情绪反应特写以及场景环境空镜。你可以把 Nano Banana 或 GPT Image 2 生成的角色定妆照作为首帧让画面动起来，也能设置首尾帧来承接两个分镜画面的过渡。选出的满意片段能直接送入底部时间线拼接成剧，也可以和画布上的 Kling 3.0 或 Wan 3.0 镜头并排横向对比。",
        steps: [
            "登录 DramaCanvas 打开画布，点击添加生成卡片，或直接在分镜卡片后新建节点；右侧 Agent 对话窗口也支持通过聊天直接生成卡片。",
            "在卡片的模型选择器中选定 Seedance 2.5，根据需要输入中文提示词，或上传角色参考图与首尾帧图片作为运动起点。",
            "在卡片面板设置 480p、720p 或 1080p 分辨率并选择视频时长，确认卡片上标出的所需积分后，点击生成按钮开始渲染。",
            "生成的多条视频会并排呈现在画布上供你预览挑选，满意的镜头可以直接拖入底部时间线，用于组装整部短剧。",
        ],
        faq: [
            {
                question: "Seedance 2.5 是什么模型？和字节跳动的即梦（Dreamina）有什么关系？",
                answer: "Seedance 2.5 是字节跳动（ByteDance）旗下的视频生成模型，与即梦（Dreamina）应用采用同一模型家族。DramaCanvas 是独立的 AI 短剧创作画布平台，并非字节跳动官方或合作方，而是将该模型接入画布工作流中供创作者使用。你可以在同一画布上完成从剧本分镜、静态参考图到 Seedance 2.5 视频生成的全流程创作。",
            },
            {
                question: "新手怎么用 DramaCanvas 制作 Seedance 2.5 视频？有操作教程吗？",
                answer: "在 DramaCanvas 中使用 Seedance 2.5 非常直观：打开画布后添加一张生成卡片，在模型选择器中选定 Seedance 2.5 即可。你可以直接输入文字描述，或者将上一张分镜图片作为首帧拖入卡片，也可以让右侧的 Agent 助手通过对话帮你排布分镜和卡片。卡片确认分辨率和时长后点击生成，生成出的多个片段会并列排在画布上供你挑选，挑好的镜头直接拖到时间线剪辑。",
            },
            {
                question: "Seedance 2.5 可以免费试用吗？新用户赠送多少积分？",
                answer: "在 DramaCanvas 上编写剧本、排布分镜卡片是完全免费的，视频生成则需要消耗积分。每个新账号注册后都会一次性获得 {signupCredits} 积分，无需绑定信用卡且没有过期时间。因为视频按秒计费，这批赠送积分在 480p 最低规格下可测试 {freeCount} 秒画面，主要用于体验模型生成流程，无法覆盖完整短剧片段；若需要生成 720p、1080p 或较长镜头，可以在定价页面选购积分包或会员计划。",
            },
            {
                question: "Seedance 2.5 的生成价格与积分规则是怎样的？",
                answer: "Seedance 2.5 严格按生成的视频秒数计费，卡片在点击生成前会明确标出本次所需的具体积分。在 480p 最低分辨率下每秒消耗 {minCredits} 积分，而在 1080p 高清分辨率下每秒最高需消耗 {maxCredits} 积分，高规格消耗是低规格的数倍。为了节省制作成本，实操中建议先用 480p 规格跑通分镜动作，确认满意后再切换到 720p 或 1080p 重新渲染高清成片。如果生成过程中遇到任务失败，系统会自动退还扣除的积分。",
            },
            {
                question: "Seedance 2.5 首尾帧怎么用？如何实现镜头之间的过渡？",
                answer: "在生成卡片中选择支持参考输入的设置后，你可以分别上传起始图片与结束图片作为首帧与尾帧。Seedance 2.5 会根据你的画面内容与提示词引导，计算两张图片之间的动作路径并生成过渡视频。这种方式非常适合用于短剧中的机位变焦、角色转身或场景视角转换，卡片面板会清晰展示当前模式所支持的参考输入类型。",
            },
            {
                question: "编写 Seedance 2.5 提示词有什么技巧？必须写英文吗？",
                answer: "你完全可以直接使用中文编写提示词，模型支持多语言自然语言理解，无需刻意翻译成英文。在短剧创作中，建议采用“主体角色状态 + 具体动作与微表情 + 镜头机位运动 + 环境光影”的结构，避免堆砌空泛的形容词。如果你已经上传了首帧角色图，提示词应重点描述画面的动态变化过程，例如视线移动、开口说话或肢体走位，而不是重复描述衣服外观。",
            },
            {
                question: "能用自己的 API Key（BYOK）使用 Seedance 2.5 吗？费用怎么结算？",
                answer: "平台支持创作者自带 API Key（BYOK）接入。绑定后，模型生成费用由为您发放密钥的 API 服务商直接扣费结算，DramaCanvas 不会扣除任何模型生成积分。在此模式下，DramaCanvas 仅收取独立的工作区服务费，适合有自备接口调用额度的工作室或专业短剧创作者。",
            },
            {
                question: "连续分镜中如何保持角色一致性？生成的短剧视频可以商用吗？",
                answer: "在多个分镜中复用已确认的角色参考图（例如使用 Nano Banana 或 GPT Image 2 生成的角色正面定妆照）有助于保持面部连贯，但并非绝对无偏差，每个生成镜头依然需要创作者人工把控挑选。在同一画布上比对多批生成结果，能快速筛出最贴合角色特征的片段并加入时间线。关于成片商用授权，请仔细查看字节跳动（ByteDance）的服务条款与 DramaCanvas 的服务条款。",
            },
        ],
    },
    "zh-TW": {
        intro: "Seedance 2.5 是字節跳動旗下與即夢同系列的影片生成模型，現在可在 DramaCanvas 畫布上直接調用。從劇本分鏡、首尾幀圖像到動態片段，都能在同一個工作區完成與串接。新用戶註冊即可獲得 {signupCredits} 點數，能以 480p 畫質進行 {freeCount} 秒的初步生成測試。",
        controls: "生成費用依影片秒數計費，最低畫質每秒需 {minCredits} 點數，最高畫質每秒需 {maxCredits} 點數（1080p 費用為 480p 的數倍）。生成前卡片會明確顯示當前設定所需的確切點數，生成失敗則會自動退還點數。",
        sceneText:
            "在 AI 短劇製作中，Seedance 2.5 適合用來生成對話鏡頭、角色反應特寫，或將 Nano Banana 與 GPT Image 2 生成的角色定格圖延伸為首幀動態畫面，亦可藉由首尾幀製作場景過渡與空鏡頭。實務創作時，建議先以 480p 進行初步取鏡測試，挑出滿意的分鏡片段後，再調高至 720p 或 1080p 重新生成最終成片。",
        steps: [
            "註冊或登入後開啟畫布，可貼上劇本拆解為分鏡卡片，或直接在畫布新增一張生成卡片。",
            "在模型選擇器中切換至 Seedance 2.5，依需求選擇解析度與影片長度，並輸入中文提示詞或上傳首幀參考圖。",
            "卡片在生成前會清楚標示設定與所需點數，確認後點擊生成，成果會並排顯示在畫布上供你對比挑選。",
            "保留滿意的鏡頭片段，將影片直接拖曳至時間軸剪輯短劇，或將優質畫面作為下一段影片的首幀繼續延伸。",
        ],
        faq: [
            {
                question: "Seedance 是什麼？它與字節跳動旗下的即夢有何關聯？",
                answer: "Seedance 是字節跳動（ByteDance）開發的 AI 影片生成模型，與其官方推出的即夢（Dreamina）屬於同一技術體系。在 DramaCanvas 畫布上，創作者可以直接調用 Seedance 2.5 與 2.0 模型進行文生影片或圖生影片。DramaCanvas 為獨立第三方創作平台，並非字節跳動官方夥伴或即夢軟體本身。",
            },
            {
                question: "尋找 Seedance 官網或 App 時，如何直接在 DramaCanvas 上使用？",
                answer: "Seedance 本身為字節跳動的底層影音模型，許多創作者在尋找 Seedance 官網或 App 時，會選擇整合了多款模型的線上畫布平台。你只需在瀏覽器開啟 DramaCanvas 即可操作，免安裝任何獨立 App。畫布支援繁體中文等多國語言介面，右側也提供 Agent 對話框，能透過自然語言直接協助你建立卡片與生成影片。",
            },
            {
                question: "Seedance 2.5 可以免費試用嗎？計費方式與點數如何計算？",
                answer: "新帳號註冊後即可獲得 {signupCredits} 點數，無須綁定信用卡且無使用期限。由於影片依秒數收費，最低畫質每秒消耗 {minCredits} 點數，最高畫質每秒則需 {maxCredits} 點數，免費贈送的點數足夠你在 480p 下完成 {freeCount} 秒的初步短鏡頭測試。若需要更長秒數或 1080p 高畫質成片，可以在價格頁面選購會員訂閱或點數包；生成失敗時系統會自動全額退還點數。",
            },
            {
                question: "在 DramaCanvas 上製作短劇時，該選擇 Seedance 2.5 還是其他影片模型？",
                answer: "同一個畫布工作區中同時提供 Seedance 2.5、Seedance 2.0，以及 Kling 3.0、Veo 3.1、MiniMax H3 與 Wan 3.0 等多種模型。Seedance 2.5 特別適合用來處理角色對白特寫、鏡頭反應以及首尾幀的平滑過渡。你可以先在生成卡片中以 480p 低成本測試不同模型的效果，比較並排成果後，再決定最終剪入時間軸的片段。",
            },
            {
                question: "使用 Seedance 2.5 生成影片時，輸入中文提示詞的效果如何？需要搭配參考圖嗎？",
                answer: "你可以直接使用繁體中文撰寫提示詞，清楚描述角色動作、鏡位視角與場景光影即可。除了純文字生成影片，你也可以上傳首幀圖片引導動作走向，甚至設定首尾兩張參考圖來控制鏡頭轉換。卡片介面會依據你選擇的設定，清楚標示該模式所支援的參考圖輸入欄位。",
            },
            {
                question: "什麼是 BYOK？可以透過外部 AI 助理或自備金鑰驅動 Seedance 2.5 嗎？",
                answer: "DramaCanvas 支援 BYOK（自備 API 金鑰）模式，綁定後將由發行該金鑰的 API 提供商直接向你收取模型使用費，DramaCanvas 不會扣除生成點數，僅收取獨立的工作區服務費。此外，平台也提供 DramaCanvas MCP 介面，讓支援 MCP 的外部 AI 助理能直接操控畫布、自動建立卡片與執行影片生成。在畫布上進行劇本撰寫與分鏡排版等前置規劃均為完全免費。",
            },
            {
                question: "使用 Seedance 2.5 生成的短劇片段可以進行商業用途嗎？",
                answer: "產出內容能否用於商業授權，請查閱字節跳動（ByteDance）的條款與 DramaCanvas 的服務條款。不同使用情境與帳號權限可能存在相應規定，建議在公開發布或商業化營利前詳閱官方授權規範。如遇生成失敗或未成功產出影片的情況，系統均會退回該次操作所消耗的點數。",
            },
        ],
    },
    "zh-HK": {
        intro: "Seedance 2.5 是字節跳動旗下的影片生成模型，與即夢採用同系模型技術。在 DramaCanvas 畫布上，創作者可直接輸入中文提示詞生成短劇鏡頭，亦能將角色劇照設為首幀轉化為動態影片。新帳戶註冊即送 {signupCredits} 點數，無需綁卡即可在畫布上進行首次生成測試。",
        controls:
            "模型依影片秒數計費，最低規格每秒為 {minCredits} 點數，最高畫質規格每秒為 {maxCredits} 點數（1080p 成本為 480p 的數倍），生成前卡片會明確標示確切點數。建議先以 480p 測試鏡頭動態與構圖，確認效果合適後再切換至 720p 或 1080p 重新生成成品。",
        sceneText:
            "Seedance 2.5 在短劇製作中最適合處理人物對話與反應鏡頭，能將 Nano Banana 或 GPT Image 2 生成的角色劇照設為首幀，轉化為帶有肢體動作的動態鏡頭。它亦適合用於建立故事環境的空鏡，或透過首尾幀配對生成兩個分鏡畫面之間的轉場過渡。在 DramaCanvas 畫布上，篩選保留的影片片段能直接排入時間軸剪輯成短劇，方便隨時檢視與替換鏡頭。",
        steps: [
            "登入 DramaCanvas 打開畫布，可貼上劇本文字拆解為分鏡卡，或直接在畫布新增生成卡片（亦可透過右側 Agent 對話視窗輸入指令建立）。",
            "在卡片的模型選擇器選取 Seedance 2.5，依需求上傳角色參考圖，或將畫布上既有的角色劇照設為影片首幀。",
            "用中文輸入鏡頭動作提示詞並設定影片解析度與秒數，生成卡片在點擊生成前會明確顯示扣除的點數。",
            "按下生成按鈕後，影片結果會直接並排呈現在畫布上供你逐格對比，選出滿意的片段直接拖入時間軸剪輯短劇。",
        ],
        faq: [
            {
                question: "Seedance 是什麼？它與字節跳動和即夢有什麼關係？",
                answer: "Seedance 2.5 是字節跳動研發的 AI 影片生成模型，與字節跳動旗下的即夢應用程式採用同系模型技術。DramaCanvas 是獨立的線上創作平台，並非字節跳動官方網站，亦非其官方合作夥伴。創作者可在 DramaCanvas 畫布上直接調用 Seedance 2.5，將劇本分鏡、圖片生成與時間軸剪輯整合在同一介面完成短劇製作。",
            },
            {
                question: "DramaCanvas 是 Seedance 官網嗎？有獨立的 Seedance 2.0 app 可以下載嗎？",
                answer: "DramaCanvas 並非 Seedance 官網，亦非字節跳動的官方附屬平台。DramaCanvas 是以瀏覽器為基礎的線上短劇創作畫布，無需下載安裝任何獨立的應用程式或軟體。無論使用電腦還是行動裝置，只需開啟網頁登入，就能在同一張畫布上調用 Seedance 2.5、Seedance 2.0 以及其他影像模型。",
            },
            {
                question: "Seedance 2.5 可以免費試用嗎？新用戶贈送的額度能生成多久的影片？",
                answer: "新註冊帳戶均可獲得一次性贈送的 {signupCredits} 點數，無需綁定信用卡，亦無使用期限。由於影片模型按秒計費，這筆註冊點數在 480p 最低規格下足以完成 {freeCount} 秒影片的初次測試，無法支援完整長片段。若需要生成更長的短劇鏡頭或選擇更高畫質，可至定價頁面選購點數包或訂閱方案，若生成失敗系統會全數退回點數。",
            },
            {
                question: "提示詞支援 Seedance 中文輸入嗎？需要先翻譯成英文嗎？",
                answer: "在 DramaCanvas 上可以直接使用繁體中文、簡體中文或你的母語撰寫提示詞，無需刻意翻譯為英文。平台介面本身亦支援繁體中文、簡體中文、英文、日文、韓文、西班牙文與葡萄牙文。若需要潤飾鏡頭描述或分鏡動作，也可以在畫布右側的 Agent 對話視窗以中文交談，請助手協助生成對應卡片。",
            },
            {
                question: "在 DramaCanvas 上使用 Seedance 2.5 是如何計費的？",
                answer: "在畫布上編寫劇本與排列分鏡卡片完全免費，只有點擊生成卡片時才會扣除點數。Seedance 2.5 依生成影片的秒數計費，費用區間介於最低規格每秒 {minCredits} 點數至最高畫質每秒 {maxCredits} 點數之間，1080p 的每秒點數為 480p 的數倍。每張生成卡片在按下生成鍵前都會清楚列出確切扣除的點數，不會產生未說明的額外收費。",
            },
            {
                question: "可以自備 API 金鑰（BYOK）使用 Seedance 2.5 嗎？這會如何計費？",
                answer: "DramaCanvas 支援自備 API 金鑰（BYOK）模式，用戶可直接連接自己的 API 金鑰驅動生成。在此模式下，由發行該金鑰的 API 提供商直接向你收取模型使用費，DramaCanvas 不會扣除任何生成點數（僅收取獨立的工作區服務費）。若團隊需要串接自動化流程，亦可透過 DramaCanvas MCP 讓各類 AI 助手直接操作畫布。",
            },
            {
                question: "在短劇創作流程中，Seedance 2.5 與 Kling 3.0 或 Veo 3.1 該如何搭配？",
                answer: "DramaCanvas 支援在同一張畫布上自由混用不同模型，包括 Seedance 2.0、Seedance 2.5、Kling 3.0、Veo 3.1、MiniMax H3 與 Wan 3.0。實務上建議先以 480p 低點數規格測試各鏡頭的構圖與動作節奏，確認滿意後再切換至 720p 或 1080p 生成正式成片。篩選保留的各模型片段能直接拖入時間軸進行拼接剪輯，免去反覆匯出匯入不同平台的困擾。",
            },
            {
                question: "生成的短劇影片可以用於商業發布與營利嗎？",
                answer: "商業使用的具體權利取決於授權條款，請詳細查閱字節跳動的條款與 DramaCanvas 的服務條款。在商業短劇上線或推廣前，請確認提示詞內容、角色參考圖以及生成影片均符合相應的法律與合約規範。DramaCanvas 為獨立的創作畫布工具，所有分鏡規畫與產出的影像資產均保留在你的專案畫布內方便集中管理。",
            },
        ],
    },
    "ja-JP": {
        intro: "Seedance 2.5は、ByteDanceの動画生成モデルファミリーに属し、AIショートドラマ制作の映像作りに適しています。DramaCanvasなら脚本や絵コンテ、静止画からの動画化を1つのキャンバスで進められ、登録時の{signupCredits}クレジットですぐに試せます。",
        controls:
            "解像度（480p・720p・1080p）と動画の長さに応じて1秒あたり{minCredits}クレジットから{maxCredits}クレジットが消費され、生成前にカード上で正確なクレジットを確認できます。1080pは480pの数倍のクレジットを消費するため、まずは480pでテスト生成し、採用するテイクが決まってから高解像度で再生成するのがおすすめです。",
        sceneText:
            "絵コンテカードの構想をもとに、セリフに合わせた人物の会話シーンやリアクションカット、物語の状況を伝える情景カットの生成に適しています。同じキャンバス上のNano BananaやGPT Image 2で作成した静止画を開始フレームに指定して動きを付けたり、開始と終了の2枚の画像を指定して場面転換を作ったりできます。生成した動画クリップはそのままタイムラインに並べて編集でき、Seedance 2.0やKling 3.0など他の動画モデルと見比べながら最適なカットを選べます。",
        steps: [
            "キャンバス上に生成カードを追加し、モデル選択メニューでSeedance 2.5と希望の設定を指定します。",
            "プロンプト入力欄に動きや演出を日本語で入力し、必要に応じて開始フレーム画像や参照画像を設定します。",
            "解像度（480p・720p・1080p）と動画の長さを選択し、カード上に表示される必要クレジットを確認して生成ボタンを押します。",
            "キャンバス上に生成された動画が並んで表示されるので、仕上がりを確認してタイムラインに追加しショートドラマを編集します。",
        ],
        faq: [
            {
                question: "Seedance 2.5とはどのようなAIモデルですか？どこの国で開発されていますか？",
                answer: "Seedance 2.5は、中国のByteDanceが開発した動画生成AIモデルで、同社の「Dreamina（即梦）」と同じモデルファミリーに属します。DramaCanvasでは、テキストからの動画生成だけでなく、静止画を開始フレームにした動画化や、開始と終了の2フレーム間をつなぐトランジション生成に対応しています。なお、DramaCanvasは独立した制作プラットフォームであり、ByteDanceの公式パートナーや開発元ではありません。",
            },
            {
                question: "Seedance 2.5は無料で試せますか？",
                answer: "DramaCanvasにアカウント登録すると、クレジットカード登録不要で有効期限のない{signupCredits}クレジットが一度だけ付与されます。Seedance 2.5の動画生成は秒単位で課金されるため、この登録クレジットは最低解像度（480p）で{freeCount}秒のテスト生成を行うためのものです。フル尺の映像や高解像度での生成には追加のクレジットが必要になります。",
            },
            {
                question: "Seedance 2.5の利用料金とクレジットの消費基準を教えてください。",
                answer: "Seedance 2.5の生成コストは動画の長さ（秒数）と解像度によって決まり、最低設定では1秒あたり{minCredits}クレジット、上位設定では1秒あたり{maxCredits}クレジットを消費します。1080pでの生成は480pの数倍のクレジットがかかりますが、生成を実行する前にカード上で消費クレジットを確認できます。万が一生成に失敗した場合は、消費されたクレジットが自動的に返却されます。",
            },
            {
                question: "DramaCanvasでSeedance 2.5を使う手順とプロンプトのコツは？",
                answer: "キャンバス上で生成カードを追加し、プロンプト入力欄に演出内容を日本語などの母国語で入力して生成します。AIショートドラマ制作では、Nano BananaやGPT Image 2で作成した人物画像を先頭フレームに設定して動かすと、構図やキャラクターの見た目を保ちやすくなります。まずは480pでテスト生成を行い、意図通りの動きが確認できたテイクのみを720pや1080pで再生成するのが効率的です。",
            },
            {
                question: "自分のAPIキー（BYOK）を使ってSeedance 2.5を動かせますか？",
                answer: "はい、DramaCanvasではご自身のAPIキーを接続して利用するBYOKに対応しています。BYOKを利用する場合、APIキーを発行したAPIプロバイダーから直接請求が行われ、DramaCanvas側では生成クレジットが消費されません。なお、キャンバス機能の利用に伴うワークスペースのサービス料は別途発生します。",
            },
            {
                question: "Seedance 2.5やSeedance 2.0はローカルPC環境やComfyUIで動作しますか？",
                answer: "Seedanceシリーズはクラウド提供のAIモデルであり、個人のPC環境へのモデル導入やComfyUIでのローカル動作を前提とした提供形態ではありません。DramaCanvasを利用すれば、PCのブラウザからログインするだけで、環境構築や高負荷なマシンを用意することなくキャンバス上で直接生成できます。同じキャンバス内ではSeedance 2.0やWan 3.0、MiniMax H3などの他の動画モデルも切り替えて利用可能です。",
            },
            {
                question: "ショートドラマ制作でキャラクターの見た目を揃えることはできますか？",
                answer: "承認済みのキャラクター画像を参照画像として設定することで、シーン間での人物のブレを抑える助けになります。ただし、現行の動画生成技術ではすべてのカットで人の目による仕上がりの確認が必要です。キャンバス右側のAgentチャットを使って対話形式でカード作成や生成を進めることもできます。",
            },
            {
                question: "Seedance 2.5で生成した動画は商用利用できますか？",
                answer: "Seedance 2.5で生成した映像の商用利用に関しては、ByteDanceの利用規約およびDramaCanvasの利用規約をご確認ください。DramaCanvasは独立したプラットフォームであるため、商用プロジェクトに導入する際は各サービスの最新規約を事前に確認した上でご利用いただくことをおすすめします。",
            },
        ],
    },
    "ko-KR": {
        intro: "바이트댄스의 영상 생성 모델 시댄스 2.5(Seedance 2.5)를 DramaCanvas에서 사용해 보세요. 스토리보드에서 이미지로 숏드라마 컷을 바로 생성합니다. 가입 시 지급되는 {signupCredits} 크레딧으로 480p 기준 {freeCount}초간 테스트해 볼 수 있습니다.",
        controls:
            "영상 길이는 카드에서 직접 선택하며, 생성 전 카드에 필요한 크레딧이 정확히 표시됩니다. 비용은 480p 기준 초당 {minCredits} 크레딧부터 고화질 시 초당 {maxCredits} 크레딧까지 차이가 나므로, 480p로 먼저 확인한 뒤 720p나 1080p로 다시 생성하는 것이 좋습니다.",
        sceneText:
            "숏폼 드라마의 대화 씬이나 리액션 컷을 만들 때 유용하며, Nano Banana나 GPT Image 2로 만든 인물 스틸컷을 자연스러운 움직임의 영상으로 전환할 수 있습니다. 캔버스 위에서 첫 프레임과 마지막 프레임을 지정해 두 장면 사이의 전환 컷을 연출하거나 배경 쇼트를 구성하기에도 적합합니다. 완성된 클립은 같은 화면의 타임라인으로 바로 보내 편집을 이어갈 수 있습니다.",
        steps: [
            "DramaCanvas에 로그인한 뒤 새 캔버스를 열고 생성 카드를 추가합니다. 대본이 있다면 먼저 붙여넣어 스토리보드 카드로 나눌 수도 있습니다.",
            "모델 선택기에서 Seedance 2.5를 고르고 원하는 해상도와 클립 길이를 정합니다. 카드가 지원하는 옵션에 맞춰 참조 이미지나 시작 프레임을 넣을 수 있습니다.",
            "한국어로 연출하고 싶은 장면 프롬프트를 입력합니다. 생성 버튼을 누르기 전 카드에 필요한 크레딧이 정확하게 표시됩니다.",
            "생성된 영상 클립들이 캔버스 위에 나란히 나타나 결과를 한눈에 비교할 수 있습니다. 마음에 드는 컷을 골라 하단 타임라인에 배치하며 숏드라마를 완성합니다.",
        ],
        faq: [
            {
                question: "시댄스 2.5(Seedance 2.5)는 어떤 AI 모델인가요?",
                answer: "시댄스 2.5는 바이트댄스(ByteDance)의 영상 생성 모델 패밀리에 속하며, 즉몽(Dreamina) 등과 동일한 모델 계열입니다. DramaCanvas는 바이트댄스의 공식 파트너나 개발사는 아니지만, 캔버스 환경에서 시댄스 2.5 모델을 직접 선택해 숏폼 드라마 제작에 활용할 수 있도록 지원합니다. 텍스트 프롬프트뿐만 아니라 단일 이미지나 첫 프레임과 마지막 프레임 쌍을 활용한 영상 생성이 가능합니다.",
            },
            {
                question: "시댄스 2.5를 무료로 써볼 수 있는 방법이 있나요?",
                answer: "DramaCanvas에 가입하면 별도 카드 등록 없이 {signupCredits} 크레딧이 한 번 제공됩니다. 이 크레딧으로 480p 최저 화질 기준 {freeCount}초 분량의 간단한 테스트 생성을 진행할 수 있습니다. 무료 크레딧은 첫 동작 확인을 위한 분량이며, 고화질이나 긴 클립을 생성하려면 요금제 페이지에서 멤버십이나 크레딧 팩을 이용해야 합니다.",
            },
            {
                question: "시댄스 2.5의 생성 가격과 크레딧 차감 기준은 어떻게 되나요?",
                answer: "시댄스 2.5는 생성하는 비디오의 초 단위로 크레딧이 차감됩니다. 480p 해상도에서는 초당 {minCredits} 크레딧부터 시작하며, 1080p 고화질 설정 시 초당 최대 {maxCredits} 크레딧이 소진됩니다. 생성 버튼을 누르기 전에 해당 카드에서 필요한 정확한 크레딧을 확인할 수 있으며, 생성이 실패하면 사용된 크레딧은 다시 반환됩니다.",
            },
            {
                question: "시댄스 2.0과 시댄스 2.5 중 어떤 버전을 골라야 하나요?",
                answer: "DramaCanvas 모델 선택기에서는 시댄스 2.0과 시댄스 2.5를 모두 제공하고 있어 프로젝트 목적에 맞춰 선택할 수 있습니다. 기존에 시댄스 2.0의 질감이나 톤에 맞춰 작업하던 프로젝트라면 이전 버전을 유지하고, 새로운 컷을 구성할 때는 2.5 버전을 테스트해 보는 것이 좋습니다. 캔버스 위에 카드를 나란히 두고 동일한 프롬프트로 두 버전을 생성해 결과를 직접 비교할 수도 있습니다.",
            },
            {
                question: "숏폼 드라마 제작 시 시댄스 2.5 사용법은 어떻게 되나요?",
                answer: "캔버스에 대본을 붙여넣고 스토리보드 카드로 나눈 뒤, 영상 생성 카드를 추가해 시댄스 2.5를 선택합니다. Nano Banana나 GPT Image 2로 만든 인물 이미지를 첫 프레임으로 연결하고 한국어 프롬프트를 입력하면 움직이는 씬이 만들어집니다. 생성된 클립 중 마음에 드는 컷을 하단 타임라인으로 끌어다 놓아 이어 붙이면 숏드라마 편집이 진행됩니다.",
            },
            {
                question: "외부 API 키를 직접 연결하는 BYOK 기능도 지원하나요?",
                answer: "네, DramaCanvas에서는 자체 API 키를 연결하는 BYOK 방식을 지원합니다. 사용자가 발급받은 키를 등록하면 해당 키를 발급한 외부 API 제공업체에서 직접 요금을 청구하며, DramaCanvas의 생성 크레딧은 차감되지 않습니다. 다만 이 경우 별도의 워크스페이스 서비스 이용료가 적용됩니다.",
            },
            {
                question: "인물 얼굴이나 캐릭터 일관성을 유지하려면 어떻게 해야 하나요?",
                answer: "동일한 캐릭터 레퍼런스 이미지를 프롬프트 카드에 첨부하거나, 확정된 캐릭터 이미지를 첫 프레임으로 활용하는 방법이 기본입니다. 레퍼런스를 지정하면 전체적인 캐릭터 외형을 유지하는 데 도움이 되지만, 매 컷마다 사람이 직접 확인하고 선별해야 합니다. 만족스러운 테이크만 타임라인에 남기고 아쉬운 결과는 캔버스에서 다시 생성하며 조율하는 방식을 추천합니다.",
            },
            {
                question: "시댄스로 생성한 영상의 상업적 이용이나 저작권은 어떻게 되나요?",
                answer: "생성된 콘텐츠를 상업적으로 활용할 수 있는지 여부는 바이트댄스(ByteDance) 이용약관과 DramaCanvas 이용약관을 함께 확인해야 합니다. 상업적 프로젝트를 진행하기 전 각 서비스의 최신 규정과 권리 범위를 반드시 검토하시기 바랍니다. DramaCanvas는 독립적인 플랫폼으로 모델 제공사의 정책 변경에 따라 세부 약관이 달라질 수 있습니다.",
            },
        ],
    },
    "es-ES": {
        intro: "Seedance 2.5 es el modelo de video de ByteDance integrado en DramaCanvas para crear planos de dramas cortos con texto o imágenes. Puedes planificar tu historia en el lienzo y probar Seedance IA con {signupCredits} créditos de registro, equivalentes a {freeCount} segundos a 480p. Cada tarjeta muestra el consumo antes de generar y coloca los resultados en paralelo para comparar tomas.",
        controls:
            "El costo va de {minCredits} créditos a {maxCredits} créditos por segundo en el nivel base a 480p, y las resoluciones de 720p o 1080p aumentan el costo por segundo. La tarjeta muestra los créditos exactos antes de generar según la resolución y duración seleccionadas.",
        sceneText:
            "En dramas cortos, este modelo resulta práctico para animar planos de diálogo y planos de reacción a partir de imágenes previas creadas con Nano Banana o GPT Image 2. También permite generar planos generales de contexto o resolver transiciones entre dos escenas utilizando un fotograma inicial y otro final en la misma tarjeta. Conviene probar la acción primero a 480p y rehacer la toma definitiva en 720p o 1080p cuando el movimiento sea el adecuado.",
        steps: [
            "Inicia sesión, abre tu lienzo y añade una tarjeta de generación, o pega tu guion para dividirlo en tarjetas de guion gráfico.",
            "Abre el selector de modelos en la tarjeta, elige Seedance 2.5 y define la resolución de salida entre 480p, 720p o 1080p junto con la duración del clip.",
            "Escribe la descripción de la toma en tu propio idioma y añade una imagen como primer fotograma si quieres partir de un plano existente; la tarjeta mostrará los créditos exactos requeridos.",
            "Haz clic en generar para ver los resultados uno al lado del otro en el lienzo, conservar las mejores tomas y arrastrar los clips a la línea de tiempo para montar tu drama corto.",
        ],
        faq: [
            {
                question: "¿Qué es Seedance IA y cómo funciona dentro de DramaCanvas?",
                answer: "Seedance 2.5 es un modelo de generación de video perteneciente a la misma familia de modelos que ByteDance utiliza en su aplicación Dreamina (即梦). En DramaCanvas puedes emplearlo mediante generación de texto a video o a partir de una imagen de referencia como primer fotograma, e incluso combinando fotograma inicial y final. DramaCanvas es una plataforma independiente y no es socia oficial ni desarrolladora del modelo.",
            },
            {
                question: "¿Puedo probar Seedance 2.0 free o Seedance 2.5 sin pagar?",
                answer: "Al registrarte recibes {signupCredits} créditos de bienvenida sin necesidad de tarjeta bancaria ni fecha de vencimiento. Debido a que el video se factura por segundo, estos créditos iniciales cubren una prueba corta de {freeCount} segundos a 480p, diseñada para verificar el movimiento básico y no un clip completo. Para generar tomas de mayor duración o en resoluciones superiores como 720p o 1080p, puedes adquirir paquetes de créditos o planes de suscripción en la página de precios.",
            },
            {
                question: "¿Cuánto cuesta generar un video con Seedance 2.5 en DramaCanvas?",
                answer: "El modelo se factura por segundo de video generado, comenzando desde {minCredits} créditos por segundo a 480p en su opción más económica y hasta {maxCredits} créditos por segundo en el nivel base. Las resoluciones más altas incrementan el costo, de modo que 1080p cuesta varias veces lo que cuesta 480p. Cada tarjeta de generación muestra los créditos exactos requeridos antes de iniciar el proceso, y si una generación falla, el sistema te devuelve los créditos consumidos.",
            },
            {
                question: "¿Qué versión de Seedance conviene elegir para un drama corto?",
                answer: "Seedance 2.5 es la versión disponible en el selector de modelos de DramaCanvas, aunque también puedes alternar con Seedance 2.0 u otros modelos de video como Kling 3.0, Veo 3.1, MiniMax H3 o Wan 3.0 dentro del mismo lienzo. Un método práctico consiste en hacer pruebas preliminares a 480p para revisar el encuadre y el movimiento antes de lanzar la versión definitiva a 720p o 1080p. Esto te permite optimizar tus créditos mientras construyes la secuencia de tu historia.",
            },
            {
                question: "¿Cómo redactar prompts para Seedance y mantener la consistencia de personajes?",
                answer: "Puedes escribir tus instrucciones en tu propio idioma, describiendo con claridad el movimiento de cámara, la acción del personaje y el ambiente de la escena. Para mantener la coherencia visual, es recomendable generar primero una imagen fija con modelos como Nano Banana o GPT Image 2 y colocarla como primer fotograma en la tarjeta de Seedance 2.5. Aunque reutilizar una imagen de referencia aprobada ayuda a conservar el aspecto del personaje, cada toma requiere una revisión humana individual.",
            },
            {
                question: "¿Puedo usar mi propia clave API con Seedance en DramaCanvas?",
                answer: "Sí, DramaCanvas ofrece la opción de conectar tu propia clave API (BYOK). En esta modalidad, el proveedor de API que emitió tu clave te factura directamente y DramaCanvas no deduce créditos de generación por esas tomas. Ten en cuenta que se aplica una tarifa de servicio de espacio de trabajo independiente.",
            },
            {
                question: "¿Puedo usar los videos generados con Seedance para fines comerciales?",
                answer: "El uso comercial de los clips generados depende de las políticas vigentes de la plataforma y del desarrollador. Para determinar los derechos y obligaciones de tu producción, revisa los términos de ByteDance y los términos de DramaCanvas antes de distribuir tu drama corto.",
            },
            {
                question: "¿Es posible controlar el lienzo mediante asistentes de IA o chat?",
                answer: "El lienzo incluye un chat con agente en el panel derecho que te permite crear tarjetas y ejecutar generaciones mediante una conversación directa. Asimismo, DramaCanvas admite la integración con MCP para que asistentes de IA externos puedan coordinar tareas y operar directamente sobre tu espacio de trabajo.",
            },
        ],
    },
    "pt-BR": {
        intro: "O Seedance 2.5 é o modelo de geração de vídeo da ByteDance, da mesma família usada no Dreamina, integrado ao DramaCanvas para criação de minisséries e filmes com IA. Crie cenas a partir de texto ou use imagens como primeiro quadro para movimentar o seu roteiro no mesmo espaço. Você recebe {signupCredits} créditos ao criar sua conta para realizar seu primeiro teste sem custos.",
        controls:
            "A cobrança é feita por segundo de vídeo, variando de {minCredits} créditos a {maxCredits} créditos conforme a resolução escolhida em 480p, 720p ou 1080p. Os créditos exatos aparecem no cartão antes de gerar, e vale testar a cena em 480p antes de renderizar em alta resolução.",
        sceneText:
            "Em produções de vídeos curtos, o Seedance 2.5 é ideal para transformar retratos estáticos de personagens criados no Nano Banana ou GPT Image 2 em tomadas de diálogo e planos de reação. O modelo também atende bem planos de ambientação para situar a história e transições suaves definindo um primeiro e último quadro no cartão.",
        steps: [
            "Abra o canvas e adicione um cartão de geração, escolhendo o Seedance 2.5 no seletor de modelos.",
            "Escreva o prompt da cena em português e, caso queira manter a continuidade, anexe imagens de referência ou defina uma imagem como primeiro quadro.",
            "Defina a resolução em 480p, 720p ou 1080p, escolha a duração do clipe no cartão e verifique os créditos exatos necessários antes de gerar.",
            "Compare os vídeos gerados lado a lado no canvas, mantenha as melhores tomadas e arraste os clipes aprovados direto para a linha do tempo.",
        ],
        faq: [
            {
                question: "O que é o Seedance 2.5 da ByteDance e qual a relação com o DramaCanvas?",
                answer: "O Seedance 2.5 é o modelo de geração de vídeo da ByteDance, pertencente à mesma família utilizada no aplicativo Dreamina. O DramaCanvas é uma plataforma independente que disponibiliza esse modelo em seu ambiente de produção, sem vínculo oficial ou parceria com a desenvolvedora. No mesmo canvas, você pode combinar o Seedance com outros modelos de vídeo como Kling 3.0 e Wan 3.0.",
            },
            {
                question: "Posso testar o Seedance 2.5 grátis no DramaCanvas?",
                answer: "Sim, novos usuários recebem {signupCredits} créditos ao se cadastrar, sem necessidade de cartão de crédito. Como o vídeo é cobrado por segundo, esse saldo inicial cobre apenas um teste curto de {freeCount} segundos a 480p para conhecer a geração. Para criar clipes mais longos ou em resoluções como 720p e 1080p, você pode adquirir pacotes de créditos ou assinaturas na página de preços.",
            },
            {
                question: "Quanto custa gerar vídeos com o Seedance 2.5?",
                answer: "O custo varia entre {minCredits} créditos e {maxCredits} créditos por segundo de vídeo na menor resolução, aumentando conforme você seleciona formatos mais altos como 720p ou 1080p. A resolução em 1080p consome várias vezes o valor de 480p, e clipes de maior duração custam proporcionalmente mais. O cartão exibe os créditos exatos antes de iniciar o processo, e qualquer geração com falha devolve os créditos automaticamente.",
            },
            {
                question: "Como usar o Seedance 2.5 para criar cenas de minisséries?",
                answer: "Você pode criar um cartão no canvas, redigir o prompt em seu idioma e gerar a cena do zero, ou usar uma imagem existente como ponto de partida no primeiro quadro. O modelo também suporta indicar um primeiro e um último quadro para guiar transições visuais entre dois planos. Se preferir automatizar comandos, o chat com assistente no lado direito do canvas pode criar cartões e disparar gerações diretamente da conversa.",
            },
            {
                question: "Como manter a consistência dos personagens em diferentes cenas?",
                answer: "O método recomendado é gerar imagens de referência dos personagens em modelos como Nano Banana ou GPT Image 2 e utilizá-las no primeiro quadro dos cartões do Seedance 2.5. Reutilizar referências aprovadas ajuda a preservar traços e roupas, mas cada tomada gerada ainda exige uma revisão humana no canvas para garantir a continuidade. Você pode posicionar os resultados lado a lado para escolher a melhor variação.",
            },
            {
                question: "Posso usar minha própria chave de API (BYOK) com o Seedance?",
                answer: "Sim, o DramaCanvas aceita a integração da sua própria chave de API no modelo BYOK. Quando essa opção está ativa, o provedor de API que emitiu sua chave fatura o consumo diretamente com você, e o DramaCanvas não deduz créditos de geração, aplicando apenas a taxa de serviço do espaço de trabalho. Você também pode integrar assistentes inteligentes ao fluxo por meio do DramaCanvas MCP.",
            },
            {
                question: "Posso usar os vídeos gerados com o Seedance 2.5 em projetos comerciais?",
                answer: "Para uso comercial dos vídeos, recomendamos consultar os termos de uso da ByteDance e os termos do DramaCanvas antes da veiculação. Como o DramaCanvas é uma plataforma independente, as permissões de exploração comercial acompanham as diretrizes estabelecidas pelos desenvolvedores do modelo. Todo o controle criativo da edição final na linha do tempo permanece com você.",
            },
        ],
    },
};

export default seedance25Overrides;
