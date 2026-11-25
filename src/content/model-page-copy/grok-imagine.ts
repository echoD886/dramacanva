import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Facts and prices from the live catalog and verified product limits.
export const grokImagineOverrides: ModelPageOverrides = {
    "en-US": {
        intro: "Grok Imagine Video 1.5 brings xAI's video generation directly onto your DramaCanvas storyboard. Test quick motion, comedic beats, or storyboard animations alongside other video models on a single workspace. New accounts get {signupCredits} credits to try Grok Imagine free at the lowest resolution without a credit card.",
        controls:
            "Choose 480p, 720p, or 1080p and select your clip length directly on the card. Generation costs from {minCredits} credits to {maxCredits} credits per second of video at the lowest resolution, and the card displays the exact credits before you generate.",
        sceneText:
            "In an AI short drama workflow, Grok Imagine Video 1.5 works well for animating an approved storyboard frame and testing comedic or stylised scene beats. Its output helps you review character motion quickly before committing clips to the timeline. You can pair it with image models like Midjourney V7 or GPT Image 2 on the same canvas to establish first frames.",
        steps: [
            "Open your canvas and click to add a generation card, or paste a script to create storyboard cards.",
            "Open the model selector on the card, pick Grok Imagine Video 1.5, and choose 480p, 720p, or 1080p along with your clip length.",
            "Type your scene prompt in your preferred language, optionally attach a first-frame image, and check the exact credits displayed on the card.",
            "Click generate to render the video, compare results side by side on the canvas, and add approved clips to the timeline.",
        ],
        faq: [
            {
                question: "What is Grok Imagine Video 1.5 on DramaCanvas?",
                answer: "Grok Imagine Video 1.5 is xAI's video generation model available directly inside the DramaCanvas workspace. On DramaCanvas, this page focuses specifically on video generation rather than standalone images. You can use it alongside script tools, storyboard cards, and other video models like Kling 3.0 or Veo 3.1 on a single canvas.",
            },
            {
                question: "Can I try Grok Imagine free?",
                answer: "Yes, new accounts receive {signupCredits} credits with no credit card required and no expiration date. That welcome balance covers a short test of about {freeCount} s of video at the cheapest setting, while higher resolutions cost more per second. Once you use those credits, you can buy credit packs or choose a subscription plan on the pricing page.",
            },
            {
                question: "How does Grok Imagine pricing work on DramaCanvas?",
                answer: "Grok Imagine Video 1.5 is billed per second of video, ranging from {minCredits} credits to {maxCredits} credits per second at the lowest resolution tier. Higher resolutions such as 720p and 1080p cost more credits per second. The generation card shows the exact credits required before you generate, and any failed generation automatically returns its credits.",
            },
            {
                question: "How to use Grok Imagine for short drama production?",
                answer: "Add a generation card to your canvas and select Grok Imagine Video 1.5 from the model selector. Enter your prompt, pick your resolution and clip length, and optionally upload a first frame when the chosen setting accepts image inputs. You can also ask the Agent chat on the right side of the canvas to create cards and run generations for you.",
            },
            {
                question: "How should I write Grok Imagine prompts for video shots?",
                answer: "Focus your prompts on specific character actions, camera motion, and scene pacing rather than vague artistic buzzwords. You can write prompts in your own language, as the DramaCanvas interface supports English, Japanese, Korean, Spanish, Portuguese, and Chinese. Reusing an approved character reference image as the first frame helps consistency, though every shot still needs a human check.",
            },
            {
                question: "Can I connect my own Grok Imagine API key?",
                answer: "Yes, DramaCanvas supports BYOK so you can connect your own API key directly to the canvas. When you use your own key, the API provider that issued the key bills you directly, and DramaCanvas deducts no generation credits. A separate workspace service fee applies when running tasks under your own key.",
            },
            {
                question: "Can external AI assistants drive Grok Imagine via MCP?",
                answer: "Yes, AI assistants can connect to your workspace through DramaCanvas MCP to automate production tasks. An assistant can build storyboard cards, adjust generation parameters, and run Grok Imagine prompts through chat commands. All generated clips appear directly on the canvas for you to review and sequence on the timeline.",
            },
            {
                question: "Can I use Grok Imagine videos for commercial projects?",
                answer: "Commercial use depends on the applicable terms of service, so please check xAI's terms and DramaCanvas terms before publishing commercial work. DramaCanvas is an independent platform and is not the model developer or an official partner of xAI. You can always plan your script and arrange storyboard cards on the canvas for free.",
            },
        ],
    },
    "zh-CN": {
        intro: "在 DramaCanvas 画布上，创作者可以直接使用 xAI 的 Grok Imagine Video 1.5 生成 AI 短剧视频，支持文生视频与首帧图生视频。新账号注册即赠 {signupCredits} 积分，无需绑卡，可在最低档位下体验约 {freeCount} 秒视频生成。满意的镜头片段能直接加入时间线完成剪辑，轻松推进故事呈现。",
        controls: "支持 480p、720p 与 1080p 分辨率并自主选择时长，按视频秒数计费，最低档每秒消耗 {minCredits} 积分，最高档每秒消耗 {maxCredits} 积分。生成前卡片会明确显示所需的确切积分，若生成失败系统会自动返还积分。",
        sceneText:
            "在 AI 短剧创作中，Grok Imagine Video 1.5 非常适合用于动态动作测试、风格化或喜剧节奏镜头，以及将剧本分镜静态图转为动态首帧视频。你可以把分镜画面作为首帧输入，快速验证镜头运动与动作连贯度。生成的候选视频会在画布上横向排列并排对比，挑出合适的内容直接送入时间线剪辑成片。",
        steps: [
            "注册登录 DramaCanvas 打开画布，可在左侧粘贴短剧剧本拆分分镜卡片，或直接新建生成卡片。",
            "在卡片的模型选择器中选定 Grok Imagine Video 1.5，按需挑选 480p、720p 或 1080p 分辨率及视频时长。",
            "在输入框内使用母语输入动作提示词，若需要可添加首帧参考图，卡片底部会显示当前设置所需的确切积分。",
            "点击生成，视频结果会在画布并排呈现供比对挑选，满意的镜头直接拖入内置时间线完成短剧剪辑。",
        ],
        faq: [
            {
                question: "Grok Imagine 可以免费试用吗？",
                answer: "新用户注册 DramaCanvas 即可获赠 {signupCredits} 积分，无需绑定信用卡，也没有有效期限。这笔积分可在最低分辨率档位下免费试用生成约 {freeCount} 秒视频，适合用来体验镜头动态。由于更高分辨率消耗更多积分，如果需要制作完整短剧，可以在价格页面购买积分包或订阅会员计划。",
            },
            {
                question: "Grok Imagine 价格与计费规则是怎样的？",
                answer: "该模型按照生成的视频秒数计费，每秒扣除固定积分，分辨率越高单秒消耗越大。在最低分辨率下每秒仅需 {minCredits} 积分，而在最高档位下每秒消耗 {maxCredits} 积分。点击生成之前，卡片上会清晰标明本次生成所需的确切积分，若生成失败系统会自动返还积分。",
            },
            {
                question: "在短剧创作中 Grok Imagine 怎么用？有新手教程吗？",
                answer: "在画布上新建生成卡片后，于模型选择器中选定 Grok Imagine Video 1.5 即可开始创作。你可以直接输入文字生成视频，也可以上传静态图片作为首帧进行动态化，画面生成后会直接保存在画布上。画布右侧还配备了智能助手对话框，支持通过自然语言对话快速创建卡片或执行生成任务。",
            },
            {
                question: "制作 AI 短剧时，Grok Imagine 提示词该怎么写？",
                answer: "你可以直接使用自己的母语编写提示词，重点描述镜头的主体动作、运镜方向与场景氛围。若想让画面动作更精准，建议配合首帧图像输入，并在提示词中聚焦于角色接下来的动作变化与节奏。对于喜剧夸张或特定风格化镜头，用简洁直接的动词描述动作往往能获得更理想的生成表现。",
            },
            {
                question: "Grok Imagine 在 DramaCanvas 上提供哪些版本，支持保持角色一致性吗？",
                answer: "目前 DramaCanvas 专注于提供 Grok Imagine Video 1.5 纯视频生成服务，支持 480p、720p 和 1080p 输出。在短剧制作中，复用确认好的人物首帧或参考图有助于提升画面连续性，但每个镜头依然需要创作者进行人工把控。如果你需要生成角色首帧图，可以在同块画布上调用 Midjourney V7、Nano Banana 或 GPT Image 2 等图像模型。",
            },
            {
                question: "支持绑定自己的 API Key（BYOK）使用 Grok Imagine 吗？",
                answer: "支持，DramaCanvas 提供了 BYOK 功能，允许用户接入自己拥有的 API Key。绑定之后，由发放该密钥的 API 提供方直接向你计费，DramaCanvas 不会扣除任何生成积分，仅按规定收取单独的工作区服务费。这种方式非常适合已有 API 额度且希望利用多模型画布进行短剧团队协作的用户。",
            },
            {
                question: "Grok Imagine 生成的视频如何与其他模型配合制作成片？",
                answer: "在同一张画布上，你可以自由组合多种视频模型，例如将 Grok Imagine 与 Kling 3.0、Seedance 2.5、Wan 3.0 或 MiniMax H3 搭配使用。生成满意的视频镜头后，直接拖拽进入下方时间线就能排列剪辑成完整的短剧。此外，外部 AI 助手也可以通过 DramaCanvas MCP 协议接入并直接驱动画布上的卡片操作。",
            },
            {
                question: "使用 Grok Imagine 生成的短剧视频可以商用吗？平台与 xAI 是什么关系？",
                answer: "关于生成内容的商业使用许可，请仔细查阅 xAI 的服务条款以及 DramaCanvas 平台条款。DramaCanvas 是一个独立的在线创作画布工具，并非 xAI 官方合作伙伴或模型开发商。我们在统一的工作区内为创作者聚合了多款先进的音画模型，方便短剧作者从剧本到成片高效推进。",
            },
        ],
    },
    "zh-TW": {
        intro: "Grok Imagine Video 1.5 是 xAI 推出的影片生成模型，已整合至 DramaCanvas 創作畫布。創作者可以直接將文字劇本或分鏡圖轉為動態畫面，並在畫布上並排比對多組成果。新用戶註冊即送 {signupCredits} 點數，在最低畫質下約可生成 {freeCount} 秒影片。",
        controls: "支援 480p、720p 與 1080p 解析度，費用依影片秒數計算，每秒介於 {minCredits} 點數 至 {maxCredits} 點數 之間。片段長度與畫質可在卡片上自由切換，系統在生成前會明確顯示該次所需的確切點數。",
        sceneText: "在 AI 短劇創作流程中，Grok Imagine Video 1.5 非常適合用於快速動作測試，以及節奏鮮明的風格化或喜劇橋段。創作者也能直接將畫布上已確認的分鏡圖設為首格畫面，讓靜態構圖順暢轉化為具備動態張力的短劇鏡頭。",
        steps: [
            "註冊或登入後開啟專案畫布，可先貼上短劇劇本並自動切分成多張分鏡卡，或直接點選工具列新增一張生成卡。",
            "在生成卡的模型選擇器中點選 Grok Imagine Video 1.5，並依鏡頭需求挑選 480p、720p 或 1080p 解析度與影片長度。",
            "在提示詞欄位輸入你想呈現的動作描述，若需要也可加入分鏡圖作為首格畫面，送出前卡片會顯示該設定的確切點數。",
            "點擊生成按鈕，完成的短片會直接呈現在畫布上供你並排對比，挑選滿意的成果即可拖曳至時間軸剪輯成短劇。",
        ],
        faq: [
            {
                question: "Grok Imagine 是什麼？在 DramaCanvas 上能用來做什麼？",
                answer: "Grok Imagine Video 1.5 是由 xAI 開發的影片生成模型，在 DramaCanvas 畫布上專門負責動態鏡頭生成。創作者可以在同一塊畫布上將劇本分鏡直接轉為影片，省去在不同工具間切換的麻煩。生成後的片段能直接並排檢視比較，並可隨時拉入時間軸組合成完整的短劇。",
            },
            {
                question: "Grok Imagine 教學：如何在畫布上開始生成短劇影片？",
                answer: "建立專案後，在畫布新增一張生成卡並於模型選單選取 Grok Imagine Video 1.5。接著設定所需的解析度與秒數，並在提示詞欄位輸入你想生成的動作描述，也可選擇將既有圖片設為首格畫面。確認卡片上標示的確切點數後點擊生成，完成的影片就會直接出現在畫布上供你檢視。",
            },
            {
                question: "Grok Imagine 免費可以使用嗎？新帳號能試用多少秒？",
                answer: "在 DramaCanvas 上編寫劇本與安排分鏡卡皆為免費功能，生成影片則需使用點數。新註冊的帳號會直接獲得一次性發放的 {signupCredits} 點數，無須綁定信用卡且沒有使用期限。在最低畫質設定下，這筆點數約可涵蓋 {freeCount} 秒影片的生成測試，若選擇較高解析度點數消耗會隨之增加。",
            },
            {
                question: "Grok Imagine 費用如何計算？生成失敗會扣點嗎？",
                answer: "該模型依據影片秒數計費，最低畫質每秒為 {minCredits} 點數，最高畫質與階層每秒則為 {maxCredits} 點數，解析度越高每秒費用越高。生成卡在按下生成前會清楚顯示該次所需的確切點數，扣款完全透明。若生成過程中遇到失敗，系統會全額退回扣除的點數；需要更多額度時，可至定價頁面購買點數包或訂閱方案。",
            },
            {
                question: "Grok Imagine 提示詞該怎麼寫？可以用中文輸入嗎？",
                answer: "你可以直接使用繁體中文輸入提示詞，系統支援中文等跨語言介面與提示詞處理。撰寫短劇提示詞時，建議具體描述主體的動作細節、攝影機運鏡方式與場景動態變化。若手邊已有確認的分鏡圖，也可以直接作為首格畫面載入，讓模型依據現有畫面延伸動態。",
            },
            {
                question: "製作短劇時，該如何選擇 Grok Imagine 的輸出解析度？",
                answer: "Grok Imagine Video 1.5 支援 480p、720p 與 1080p 三種解析度，影片長度可在生成卡上直接指定。進行前期動作測試、喜劇笑點節奏或鏡頭實驗時，建議先用 480p 以最少點數快速確認效果。待分鏡節奏定案後，再選擇 720p 或 1080p 生成正式短劇所需的清晰片段。",
            },
            {
                question: "可以使用自備 API 金鑰（BYOK）來生成 Grok Imagine 影片嗎？",
                answer: "可以，DramaCanvas 支援自備金鑰（BYOK）模式，你可以綁定自己的 API 金鑰進行生成。使用自備金鑰時，發行該金鑰的 API 提供商會直接向你收取模型使用費用，DramaCanvas 不會扣除生成點數，僅收取獨立的工作區服務費。這適合本身已有可用額度且希望統一在畫布上管理短劇創作的用戶。",
            },
            {
                question: "在短劇多個鏡頭中，如何維持角色的一致性？可以商業使用嗎？",
                answer: "在畫布上重複使用審核通過的角色參考圖作為首格畫面有助於維持外觀，但每個鏡頭生成後仍需人工逐一檢查確認。你也可以透過畫布右側的對話助理（Agent chat）協助建立卡片並執行生成。關於商用授權規定，請參閱 xAI 的條款與 DramaCanvas 的服務條款以取得完整說明。",
            },
        ],
    },
    "zh-HK": {
        intro: "在 DramaCanvas 上使用 xAI 的 Grok Imagine Video 1.5 製作 AI 短劇，支援文字生成影片或以圖片作為首格畫面。新註冊帳號可獲贈 {signupCredits} 點數，足以在最低解析度下體驗 {freeCount} 秒影片。你可以在同一畫布上將分鏡轉化為動態鏡頭，隨時對比生成效果。",
        controls: "輸出支援 480p、720p 與 1080p，影片長度可在卡片上自行挑選。系統按影片秒數計費，最低解析度每秒為 {minCredits} 點數至 {maxCredits} 點數，較高解析度收費相應增加，卡片在生成前會顯示確切點數。",
        sceneText:
            "在製作 AI 短劇時，Grok Imagine Video 1.5 適合用於快速動態測試、具風格化或喜劇節奏的橋段，以及為靜態分鏡畫面注入動態效果。創作者可以先生成首格角色圖像，再以此模型接續生成短片，提高鏡頭連貫性。完成的片段可直接排入畫布底部的時間線，串聯成完整的故事節奏。",
        steps: [
            "註冊或登入後開啟畫布，你可以貼上劇本並拆分為分鏡卡片，或直接新增一張生成卡片。",
            "在模型選擇器中挑選 Grok Imagine Video 1.5，並在卡片上設定解析度與影片長度。",
            "以你慣用的語言輸入提示詞，亦可附上首格參考圖，卡片在生成前會顯示確切所需點數。",
            "點擊生成後，多個結果會在畫布上並排呈現以供比較，滿意的影片片段可直接拖曳至時間線進行剪輯。",
        ],
        faq: [
            {
                question: "什麼是 Grok Imagine？在 DramaCanvas 上支援哪些功能？",
                answer: "Grok Imagine Video 1.5 是由 xAI 開發的影片生成模型，在 DramaCanvas 上專注提供影片生成服務。創作者可透過文字提示詞生成影片，亦可在支援的設定下以靜態圖片作為首格畫面來生成動態鏡頭。所有生成的片段均直接保留在畫布上，方便與其他鏡頭並排對比。",
            },
            {
                question: "Grok Imagine 可以免費試用嗎？新用戶有多少額度？",
                answer: "新註冊用戶均可獲得一次性的 {signupCredits} 點數，無需綁定信用卡且無有效期限。這些免費點數足以在最低解析度規格下試用 {freeCount} 秒影片，讓你在付費前實測效果。畫布上的劇本編寫與分鏡規劃功能完全免費，只有執行生成時才會扣除點數。",
            },
            {
                question: "Grok Imagine 收費標準如何計算？",
                answer: "Grok Imagine Video 1.5 是按照影片秒數計費，依設定不同，最低解析度每秒需花費 {minCredits} 點數至 {maxCredits} 點數，選擇 720p 或 1080p 等較高解析度時每秒點數會相應增加。生成卡片在開始運算前會清楚列出該次操作所需的確切點數，絕無隱藏費用。若生成失敗，系統會全額退還該次扣除的點數。",
            },
            {
                question: "新手該如何開始使用 Grok Imagine 教學流程？提示詞該怎麼寫？",
                answer: "你只需在畫布建立生成卡片，選取 Grok Imagine Video 1.5 即可開始操作。提示詞支援繁體中文或你慣用的語言，建議具體描述主體動作、鏡頭運鏡與場景氛圍，避免抽象詞彙。此外，你也可以利用畫布右側的 AI 助手對話框，直接以對話形式建立卡片並下達生成指令。",
            },
            {
                question: "Grok Imagine Video 1.5 有哪些解析度可選？短劇創作應如何挑選？",
                answer: "模型目前提供 480p、720p 與 1080p 三種解析度，片段長度亦可在卡片上自行設定。在短劇的前期分鏡測試或喜劇動態摸索階段，建議選用最低解析度以節省點數；待確認動作節奏理想後，再以較高解析度輸出正式鏡頭。卡片會依據你挑選的規格，在生成前顯示確切所需點數。",
            },
            {
                question: "製作 AI 短劇時，如何維持角色在不同鏡頭間的一致性？",
                answer: "在畫布上重複使用審批通過的角色參考圖作為首格畫面，有助於維持各鏡頭的外貌連貫，但每個生成鏡頭仍需人工檢視與挑選。你可以先用畫布上的圖像模型（如 Midjourney V7 或 Nano Banana）鎖定角色造型，再將該圖導入 Grok Imagine 生成動態片段。這種在同一畫布串聯圖文與影片的流程，能有效輔助短劇製作。",
            },
            {
                question: "我可以綁定自己的 API 金鑰（BYOK）使用 Grok Imagine 嗎？",
                answer: "可以，DramaCanvas 支援自備金鑰（BYOK，即綁定你自己的 API 金鑰）功能。當你綁定金鑰後，產生之模型費用將由核發該金鑰的 API 提供商直接向你收取，DramaCanvas 則不再扣除生成點數，僅收取獨立的工作區服務費。這適合需要大量生成短片或已有配合 API 額度的創作者。",
            },
            {
                question: "使用 Grok Imagine 生成的影片可以用於商業短劇嗎？",
                answer: "關於生成內容的商業使用權限，請查閱 xAI 的使用條款與 DramaCanvas 的服務條款以確認最新規範。DramaCanvas 為獨立操作平台，並非 xAI 的官方合作夥伴或模型開發商。創作者在發布商業短劇前，應確保內容與授權符合雙方平台的法律與合約要求。",
            },
        ],
    },
    "ja-JP": {
        intro: "Grok Imagine Video 1.5は、xAIが開発した動画生成モデルです。DramaCanvasでは、新規登録時に付与される{signupCredits}クレジットで、最安設定なら約{freeCount}秒分の動画生成を試せます。Webブラウザ上で絵コンテから直接映像化できます。",
        controls: "解像度は480p、720p、1080pから選択でき、動画の長さ（秒数）に応じて1秒あたり{minCredits}クレジットから{maxCredits}クレジットが消費されます。生成を実行する前に、必要なクレジット数がカード上に表示されます。",
        sceneText: "AI短編ドラマの制作において、素早い動きのテストや、誇張されたコミカルな演技シーンの生成に適しています。絵コンテカードの画像を最初のフレームとして動かし、演出のテンポをすばやく確認する用途にも役立ちます。",
        steps: [
            "キャンバスを開き、生成カードを追加します。必要に応じて脚本を貼り付け、絵コンテカードに分割して構成を整えることも可能です。",
            "生成カードのモデルセレクターでGrok Imagine Video 1.5を選び、解像度（480p/720p/1080p）や動画の長さを指定します。",
            "プロンプトを自身の言語で入力します。設定に応じて最初のフレームとなる画像を指定することもでき、生成前に必要なクレジット数がカードに表示されます。",
            "生成を実行すると結果がキャンバス上に並んで表示され、比較して選んだ動画クリップをタイムラインへ送って短編ドラマを編集します。",
        ],
        faq: [
            {
                question: "Grok Imagineとは何ですか？Web版のDramaCanvasで利用できますか？",
                answer: "Grok Imagine Video 1.5は、xAIが開発した動画生成モデルです。DramaCanvasはWebブラウザ上で動作するため、PCやスマートフォンからアプリのインストール不要で利用できます。キャンバス上で絵コンテの整理から動画の生成、タイムライン編集までをまとめて行えます。",
            },
            {
                question: "無料で試すことはできますか？料金の仕組みはどうなっていますか？",
                answer: "新規登録時に{signupCredits}クレジットが付与され、最安設定であれば約{freeCount}秒分の動画生成を無料でお試しいただけます。キャンバス上での脚本執筆や絵コンテの配置は無料で行え、動画生成時にのみクレジットが消費されます。追加のクレジットや有料プランは料金ページから購入可能です。",
            },
            {
                question: "消費されるクレジット数はどのように決まりますか？",
                answer: "選択した解像度（480p、720p、1080p）と動画の長さによって異なり、1秒あたり{minCredits}クレジットから{maxCredits}クレジットが消費されます。生成を実行する前にカード上に必要なクレジット数が表示されるため、事前に確認できます。生成に失敗した場合は、消費されたクレジットが返却されます。",
            },
            {
                question: "画像から動画を生成する（Image-to-Video）使い方はできますか？",
                answer: "対応している設定を選択することで、静止画像を最初のフレームとして指定した動画生成が可能です。DramaCanvas内の画像生成カードで作成した画像や、お手持ちのキャラクター画像をそのまま動画の開始フレームとして活用できます。受け入れ可能な入力形式は生成カード上に表示されます。",
            },
            {
                question: "生成制限や利用回数の上限はありますか？",
                answer: "保有しているクレジットの範囲内であれば、生成回数に制限はありません。クレジットが不足した場合は、料金ページでクレジットパックを購入するか、会員プランに加入することで追加できます。また、BYOK（ご自身のAPIキー接続）を設定している場合は、DramaCanvasの生成クレジットを消費せずに利用できます。",
            },
            {
                question: "BYOK（自分のAPIキー）を利用する場合の請求はどうなりますか？",
                answer: "BYOK（ご自身のAPIキー接続）を利用する場合、APIキーを発行したプロバイダから直接利用料が請求されます。DramaCanvas側では生成クレジットの引き落としは行われません。ただし、キャンバスの利用にあたり別途ワークスペースのサービス料が発生します。",
            },
            {
                question: "プロンプトの規制やモデレート基準はどうなっていますか？",
                answer: "生成時に入力されたプロンプトや画像は、xAIおよびDramaCanvasのモデレート基準に沿って判定されます。規制やフィルターを解除する設定は提供されておらず、基準に反する内容は生成できません。短編ドラマ制作の際は、各サービスの利用規約に従ったプロンプトを入力してください。",
            },
            {
                question: "生成した動画は商用利用できますか？",
                answer: "商用利用の可否については、xAIの利用規約およびDramaCanvasの利用規約をご確認ください。DramaCanvasは独立したプラットフォームであり、権利関係や利用条件は各サービスの最新規約に準拠します。商用プロジェクトで利用する際は事前の確認を推奨します。",
            },
        ],
    },
    "ko-KR": {
        intro: "DramaCanvas에서 xAI의 Grok Imagine(그록 이매진) Video 1.5를 사용해 보세요. 텍스트 프롬프트나 첫 프레임 이미지로 숏드라마 컷을 영상 클립으로 제작합니다. 신규 가입 시 {signupCredits} 크레딧이 제공되어 캔버스에서 바로 테스트할 수 있습니다.",
        controls: "해상도(480p, 720p, 1080p)와 영상 길이에 따라 초당 요금이 달라지며, 최저 해상도 기준 초당 {minCredits} 크레딧에서 {maxCredits} 크레딧이 차감됩니다. 생성 전 카드에서 선택한 설정과 차감되는 정확한 크레딧을 확인할 수 있습니다.",
        sceneText:
            "숏드라마 제작 중 인물의 동선이나 빠른 움직임을 시험하는 모션 테스트, 개성 있는 연출이나 코믹한 장면, 스토리보드 컷을 움직이는 장면에 활용하기 적합합니다. 동일한 캔버스에서 생성한 이미지 컷을 첫 프레임으로 지정해 영상 클립으로 제작할 수 있습니다. 긴 호흡의 장면은 같은 캔버스에 있는 다른 영상 모델과 나란히 생성해 보며 연출 의도에 맞는 결과물을 선택하는 것을 권장합니다.",
        steps: [
            "캔버스 상단 메뉴나 우측 에이전트 채팅에서 생성 카드를 추가하고 모델 선택창에서 Grok Imagine Video 1.5를 선택합니다.",
            "프롬프트 입력창에 원하는 연출 내용을 한국어로 작성하고 필요하다면 첫 프레임으로 쓸 이미지 카드를 연결합니다.",
            "카드에서 해상도(480p, 720p, 1080p)와 영상 길이를 지정한 뒤 하단에 표시되는 차감 크레딧을 확인하고 생성 버튼을 누릅니다.",
            "캔버스에 나란히 생성된 비디오 클립을 확인하고 마음에 드는 컷을 하단 타임라인으로 끌어다 숏드라마로 편집합니다.",
        ],
        faq: [
            {
                question: "Grok Imagine(그록 이매진)을 무료로 써볼 수 있나요?",
                answer: "신규 가입 시 카드 등록 없이 {signupCredits} 크레딧이 계정당 한 번 지급되며 유효기간 없이 유지됩니다. 이 크레딧으로 최저 설정 기준 약 {freeCount}초의 영상을 테스트 생성할 수 있습니다. 캔버스에서 대본을 작성하고 스토리보드 카드를 배치하는 기획 작업은 크레딧 차감 없이 상시 무료입니다.",
            },
            {
                question: "Grok Imagine Video 1.5의 생성 비용과 과금 방식은 어떻게 되나요?",
                answer: "영상 초당 크레딧이 차감되며 해상도가 높을수록 초당 비용이 증가합니다. 최저 해상도 기준 초당 {minCredits} 크레딧부터 시작해 상위 옵션에 따라 초당 {maxCredits} 크레딧까지 적용됩니다. 생성 카드를 설정하면 실행 전에 차감되는 정확한 크레딧이 화면에 표시되며 생성이 실패하면 해당 크레딧은 전액 반환됩니다.",
            },
            {
                question: "DramaCanvas에서 그록 이매진 사용법은 어떻게 되나요?",
                answer: "캔버스에 생성 카드를 만든 뒤 모델 선택창에서 Grok Imagine Video 1.5를 지정합니다. 텍스트 프롬프트를 한국어로 직접 입력하거나 이미지를 첫 프레임으로 연결해 텍스트 투 비디오 또는 이미지 투 비디오 방식으로 클립을 생성할 수 있습니다. 우측 에이전트 채팅을 통해 대화하듯 카드를 생성하고 작업을 실행하는 방식도 지원합니다.",
            },
            {
                question: "그록 이매진 프롬프트는 어떻게 작성해야 하나요?",
                answer: "DramaCanvas에서는 영어로 번역할 필요 없이 한국어로 원하는 장면과 인물의 동작을 입력하면 됩니다. 카메라 구도, 조명, 인물의 구체적인 행동을 서술형으로 작성하면 의도에 가까운 영상 클립을 얻을 수 있습니다. 캔버스 내 이미지 생성 모델로 키 프레임을 먼저 만든 뒤 이를 첫 프레임으로 활용하면 영상의 시작 구도를 잡기 수월합니다.",
            },
            {
                question: "자체 API 키(BYOK)를 연결해서 사용할 수도 있나요?",
                answer: "네, 사용자가 발급받은 자체 API 키를 연결하는 BYOK 기능을 지원합니다. 이 경우 사용자의 키를 발급한 API 제공업체에서 직접 요금을 청구하며 DramaCanvas의 생성 크레딧은 차감되지 않습니다. 단, 캔버스 환경 이용에 따른 별도의 워크스페이스 서비스 수수료가 적용됩니다.",
            },
            {
                question: "숏드라마 제작 시 여러 컷에서 인물의 외형을 일정하게 유지할 수 있나요?",
                answer: "캔버스에서 확정된 캐릭터 참조 이미지를 첫 프레임으로 재사용하면 인물의 외형 일관성을 유지하는 데 도움이 됩니다. 다만 AI 영상 생성 특성상 매 컷마다 작업자의 육안 확인과 선별 과정이 반드시 필요합니다. 생성된 여러 클립을 캔버스 위에서 나란히 비교하며 장면에 가장 어울리는 컷을 선택해 타임라인으로 넘기는 방식을 권장합니다.",
            },
            {
                question: "그록 이매진 외에 캔버스에서 함께 쓸 수 있는 대체 모델이 있나요?",
                answer: "DramaCanvas 캔버스에서는 Grok Imagine Video 1.5 외에도 Seedance 2.5, Kling 3.0, Veo 3.1, MiniMax H3, Wan 3.0 같은 영상 모델을 자유롭게 교체하며 사용할 수 있습니다. 이미지 작업이 필요하다면 Nano Banana, GPT Image 2, Midjourney V7을 동일 캔버스에서 함께 다룰 수 있습니다. 장면의 성격에 맞춰 여러 모델의 카드를 나란히 띄워두고 결과물을 비교해 보시기 바랍니다.",
            },
            {
                question: "Grok Imagine Video 1.5로 만든 영상을 상업용 숏드라마에 사용할 수 있나요?",
                answer: "생성된 영상의 상업적 이용 가능 여부는 xAI의 이용약관 및 DramaCanvas 이용약관을 확인해야 합니다. DramaCanvas는 독립적인 플랫폼이며 모델 개발사의 공식 파트너가 아니므로 각 사의 최신 정책을 준수해야 합니다. 추가 크레딧 충전이나 멤버십 관련 상세 조건은 요금제 페이지에서 확인할 수 있습니다.",
            },
        ],
    },
    "es-ES": {
        intro: "Grok Imagine Video 1.5 de xAI genera tomas de video directamente en tu guion gráfico de DramaCanvas a partir de texto o de una imagen como primer fotograma. Puedes probar Grok Imagine gratis con los {signupCredits} créditos de bienvenida, que cubren alrededor de {freeCount} s en la resolución más baja. Cada segundo cuesta desde {minCredits} créditos según la configuración que elijas.",
        controls:
            "Puedes elegir una resolución de 480p, 720p o 1080p y la duración del clip en la tarjeta, con un costo de {minCredits} créditos a {maxCredits} créditos por segundo de video. La tarjeta muestra los créditos exactos antes de generar y una resolución mayor consume más créditos por segundo.",
        sceneText:
            "En un drama corto, Grok Imagine Video 1.5 resulta útil para pruebas de movimiento, remates cómicos o escenas estilizadas dentro de tu historia. También te permite animar un fotograma del guion gráfico usando una imagen previa como punto de partida. Así puedes evaluar el ritmo visual de una escena antes de enviar las tomas a la línea de tiempo.",
        steps: [
            "Abre el lienzo de DramaCanvas, organiza tus tarjetas de guion gráfico o añade una tarjeta de generación desde el menú.",
            "En el selector de modelos, elige Grok Imagine Video 1.5 y define la resolución deseada junto con la duración del clip.",
            "Escribe tu prompt en tu idioma y adjunta una imagen como primer fotograma si la opción lo admite; la tarjeta mostrará los créditos exactos antes de confirmar.",
            "Haz clic en generar para revisar los resultados uno al lado del otro en el lienzo y pasa los clips seleccionados a la línea de tiempo.",
        ],
        faq: [
            {
                question: "¿Qué es Grok Imagine y cómo funciona en DramaCanvas?",
                answer: "Grok Imagine Video 1.5 es el modelo de generación de video de xAI integrado en DramaCanvas para crear películas y dramas cortos con inteligencia artificial. Funciona sobre un lienzo visual que reúne guion, guion gráfico y generación de video en un mismo espacio de trabajo. DramaCanvas es una plataforma independiente y no es el desarrollador oficial ni un socio comercial de xAI.",
            },
            {
                question: "¿Cómo puedo probar Grok Imagine gratis?",
                answer: "Al crear una cuenta en DramaCanvas obtienes {signupCredits} créditos de bienvenida, sin necesidad de ingresar tarjeta bancaria y sin fecha de vencimiento. Con ellos puedes realizar una prueba inicial de unos {freeCount} s en la resolución de 480p para comprobar los resultados. Para generar tomas adicionales o acceder a resoluciones superiores, puedes adquirir paquetes de créditos o planes de membresía en la página de precios.",
            },
            {
                question: "¿Cuál es el precio de Grok Imagine en DramaCanvas?",
                answer: "El servicio se factura por segundo de video generado y su costo depende de la resolución elegida. En la opción básica de 480p el valor parte de {minCredits} créditos por segundo, mientras que en resoluciones más altas alcanza los {maxCredits} créditos por segundo. La tarjeta muestra siempre los créditos exactos antes de generar y, si una generación no se completa, los créditos regresan a tu saldo.",
            },
            {
                question: "¿Grok Imagine cómo usar paso a paso en una producción?",
                answer: "Primero abres el lienzo y pegas tu guion para dividirlo en tarjetas de guion gráfico, un proceso de planificación que es totalmente gratuito. Después agregas una tarjeta de generación, eliges Grok Imagine Video 1.5, defines la duración y redactas tu prompt. Si lo prefieres, puedes pedirle al chat del Asistente situado a la derecha del lienzo que cree las tarjetas y ejecute las generaciones por ti.",
            },
            {
                question: "¿Cómo escribir prompts para Grok Imagine efectivos?",
                answer: "Puedes redactar tus prompts para Grok Imagine en tu propio idioma, describiendo con claridad la acción, el entorno y los movimientos de cámara deseados. El modelo responde muy bien ante instrucciones para remates cómicos, situaciones estilizadas o pruebas de ritmo visual. Para mayor precisión, acompaña tu texto con una imagen inicial que sirva como primer fotograma de la toma.",
            },
            {
                question: "¿Es posible mantener la consistencia de personajes entre tomas?",
                answer: "Adjuntar una imagen de referencia aprobada como primer fotograma ayuda a conservar la apariencia del personaje en las tomas siguientes. Sin embargo, no existen garantías automáticas y cada escena requiere una revisión humana antes de darla por buena. En el mismo lienzo puedes generar esa imagen de partida con herramientas como Midjourney V7, GPT Image 2 o Nano Banana.",
            },
            {
                question: "¿Puedo conectar mi propia clave de API mediante BYOK?",
                answer: "Sí, DramaCanvas admite la modalidad BYOK para que utilices tu propia clave de API. Al hacerlo, el proveedor de la API que emitió tu clave te factura directamente y DramaCanvas no descuenta créditos de generación por esas tomas. Ten en cuenta que para las herramientas y el uso del espacio de trabajo se aplica una tarifa de servicio de la plataforma.",
            },
            {
                question: "¿Se pueden usar comercialmente los videos creados con Grok Imagine?",
                answer: "Para proyectos comerciales debes revisar los términos de xAI y los términos de DramaCanvas antes de su distribución. Los derechos y condiciones de uso comercial están sujetos a los acuerdos legales de ambas partes. Te recomendamos consultar la documentación vigente de cada servicio para asegurar el cumplimiento en tu país.",
            },
        ],
    },
    "pt-BR": {
        intro: "O Grok Imagine no DramaCanvas traz o modelo Grok Imagine Video 1.5 da xAI para o seu fluxo de criação de curtas. Crie cenas dinâmicas a partir de {minCredits} créditos por segundo de vídeo, comparando resultados lado a lado no canvas. Cadastre-se para testar o Grok Imagine grátis com {signupCredits} créditos iniciais na resolução básica.",
        controls:
            "Ajuste a resolução em 480p, 720p ou 1080p e defina a duração do clipe no card, com custo de {minCredits} créditos a {maxCredits} créditos por segundo de vídeo. O card mostra as configurações escolhidas e a quantidade exata de créditos antes de gerar.",
        sceneText:
            "Em curtas de animação e ficção, o Grok Imagine Video 1.5 é ideal para testes rápidos de movimento e para animar quadros do seu storyboard. O modelo também responde muito bem a cenas estilizadas e momentos de humor na narrativa. Você gera variações no mesmo canvas e envia os melhores takes direto para a linha do tempo.",
        steps: [
            "Abra o canvas do projeto e adicione um card de geração, podendo também colar seu roteiro para criar quadros de storyboard.",
            "No seletor de modelos, escolha o Grok Imagine Video 1.5 e defina a resolução entre 480p, 720p ou 1080p.",
            "Escreva seu prompt em português ou envie uma imagem como primeiro quadro, conferindo os créditos exatos exibidos no card antes de gerar.",
            "Compare os vídeos gerados lado a lado no canvas e envie os clipes aprovados para a linha do tempo do seu curta.",
        ],
        faq: [
            {
                question: "O que é o Grok Imagine no DramaCanvas?",
                answer: "O Grok Imagine no DramaCanvas traz o modelo Grok Imagine Video 1.5, desenvolvido pela xAI para geração exclusiva de vídeos via texto ou imagem inicial. Ele opera integrado ao canvas de produção, permitindo planejar o roteiro, organizar o storyboard e gerar as tomadas em um único lugar. O DramaCanvas é uma plataforma independente, sem vínculo oficial ou parceria com a xAI.",
            },
            {
                question: "O Grok Imagine é grátis para testar?",
                answer: "Sim, ao criar sua conta no DramaCanvas você ganha {signupCredits} créditos de cadastro, sem necessidade de cartão e sem data de expiração. Esse saldo cobre um teste rápido na menor resolução do modelo, rendendo cerca de {freeCount} s de vídeo. Planejar roteiros e organizar cards no canvas é gratuito, e você só utiliza créditos no momento em que gera o vídeo.",
            },
            {
                question: "Qual é o preço do Grok Imagine no DramaCanvas?",
                answer: "O Grok Imagine Video 1.5 é tarifado por segundo de vídeo, variando de {minCredits} créditos a {maxCredits} créditos por segundo na resolução inicial. Resoluções superiores como 720p e 1080p demandam mais créditos por segundo. O card de geração apresenta a configuração selecionada e o valor exato em créditos antes do início do processo. Planos de assinatura e pacotes de créditos avulsos ficam disponíveis na página de preços.",
            },
            {
                question: "Grok Imagine como usar para produzir vídeos?",
                answer: "Para começar, faça login no DramaCanvas, abra seu canvas e insira um card de geração. Selecione o Grok Imagine Video 1.5 no seletor de modelos, escolha entre as resoluções 480p, 720p ou 1080p e defina a duração do clipe no próprio card. Em seguida, digite seu prompt ou anexe uma imagem inicial e inicie a geração. Você também pode solicitar a criação de cards e execuções pelo chat do Agent no canto direito da tela.",
            },
            {
                question: "Como criar bons prompts para o Grok Imagine?",
                answer: "Você pode escrever prompts para o Grok Imagine no seu próprio idioma, descrevendo a ação, o estilo visual e o enquadramento desejado. Quando a configuração aceitar imagem, você pode anexar uma referência como primeiro quadro para orientar a geração. As versões geradas aparecem lado a lado no canvas, facilitando a escolha da melhor cena para a sua história.",
            },
            {
                question: "Como funciona a opção de chave própria (BYOK)?",
                answer: "Ao conectar sua própria chave de API (BYOK), a provedora de API que emitiu sua chave cobra você diretamente pelo processamento. Nessa modalidade, o DramaCanvas não desconta créditos de geração da sua conta, cobrando apenas uma taxa de serviço referente ao workspace. Isso dá mais flexibilidade para quem já possui cotas próprias de API.",
            },
            {
                question: "Como manter consistência de personagens e usar os vídeos comercialmente?",
                answer: "Usar uma imagem aprovada do personagem como primeiro quadro ajuda na continuidade entre tomadas, embora cada corte precise de revisão humana cuidadosa. Sobre o uso comercial dos materiais criados, consulte os termos da xAI e os termos do DramaCanvas. Caso precise de outros estilos, o mesmo canvas conta com modelos adicionais de imagem e vídeo, como Midjourney V7, Kling 3.0 e Wan 3.0.",
            },
            {
                question: "O que ocorre se a geração falhar e como funciona a automação?",
                answer: "Caso ocorra qualquer erro durante o processamento, os créditos daquela geração retornam automaticamente para a sua conta. Para fluxos avançados de automação, você pode comandar o canvas utilizando assistentes externos via DramaCanvas MCP. A interface completa da plataforma está disponível em português, inglês, espanhol, japonês, coreano e chinês.",
            },
        ],
    },
};

export default grokImagineOverrides;
