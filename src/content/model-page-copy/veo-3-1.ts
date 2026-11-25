import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Facts and prices from the live catalog and verified product limits.
export const veo31Overrides: ModelPageOverrides = {
    "en-US": {
        intro: "Veo 3.1 is Google's video generation model for creating cinematic 8-second video clips from text prompts or a single first-frame image. On DramaCanvas, you can try Veo 3.1 free with {signupCredits} credits on signup, giving you up to {freeCount} clips at {minCredits} credits per clip. Storyboard your short drama scenes on the canvas, compare generations side by side, and move your approved clips directly to the timeline.",
        controls:
            "Each 8-second clip costs a fixed rate from {minCredits} credits at 720p up to {maxCredits} credits at 1080p. The generation card displays the exact credits required before you click generate, and any failed generation automatically returns its credits.",
        sceneText:
            "In an AI short drama, Veo 3.1 is well suited for establishing shots, atmosphere, and focused single dramatic beats. You can animate an approved character still or storyboard frame by attaching it as the first frame on your generation card. Reusing that starting image helps maintain visual continuity across shots, though every take still needs a human check.",
        steps: [
            "Open the canvas and click to add a generation card, or paste your script to divide it into storyboard cards.",
            "Open the model selector on your card, choose Veo 3.1, and select your resolution at 720p or 1080p.",
            "Type your visual prompt in your own language, or attach a single image to serve as the first frame.",
            "Check the exact credits displayed on the card, click generate, and compare your 8-second clips side by side on the canvas before sending them to the timeline.",
        ],
        faq: [
            {
                question: "Can I try Veo 3.1 free on DramaCanvas?",
                answer: "Yes, every new account receives {signupCredits} credits with no credit card required and no expiration date. That initial balance lets you generate up to {freeCount} clips at {minCredits} credits per clip on the 720p setting. If you need more generations later, you can purchase credit packs or choose a membership plan on the pricing page.",
            },
            {
                question: "How does Veo 3.1 pricing work?",
                answer: "Veo 3.1 is billed per generated 8-second clip rather than per second. Each clip costs between {minCredits} credits for 720p and {maxCredits} credits for 1080p. The card shows the exact credits required before you run the job, and if a generation fails, those credits are returned to your balance.",
            },
            {
                question: "How do I use Veo 3.1 to make an AI short drama?",
                answer: "Create a generation card on your canvas and pick Veo 3.1 from the model selector. Enter your text prompt or upload an image to use as your opening frame, check the credit total, and click generate. Generated clips appear directly on the canvas so you can review them alongside your storyboard and drag your approved clips onto the editing timeline.",
            },
            {
                question: "How should I write Veo 3.1 prompts for dramatic scenes?",
                answer: "Describe a single clear action, camera movement, and lighting setup in plain language. You can write prompts in English or any supported interface language, including Japanese, Korean, Spanish, Portuguese, and Chinese. For tighter scene continuity, attach a still image as your first frame and prompt only the motion you want to see unfold.",
            },
            {
                question: "Can I use my own Veo 3.1 API key on DramaCanvas?",
                answer: "Yes, DramaCanvas supports BYOK (Bring Your Own Key) mode. When you connect your own API key, the API provider that issued your key bills you directly, and DramaCanvas deducts no generation credits. A separate workspace service fee applies when running generations with your own key.",
            },
            {
                question: "Should I choose 720p or 1080p for Veo 3.1?",
                answer: "Choose 720p at {minCredits} credits per clip while drafting scenes, testing angles, or checking storyboard pacing. Switch to 1080p at {maxCredits} credits per clip when you are finalizing master shots for your short film timeline. Both resolution options generate fixed 8-second clips.",
            },
            {
                question: "How do I maintain character consistency across Veo 3.1 shots?",
                answer: "Generate your character stills first using image models on the canvas, such as Midjourney V7 or Nano Banana. Then attach that approved character still as the first frame of your Veo 3.1 generation card to anchor the character's appearance. While reusing an approved reference image helps guide consistency across cuts, every shot still requires a human check.",
            },
            {
                question: "Can I use Veo 3.1 video clips for commercial projects?",
                answer: "DramaCanvas is an independent platform, not the model developer Google and not an official partner of Google. For commercial rights and usage policies, check Google's terms and DramaCanvas terms. You can download any generated clip directly from your canvas to include in your production edit.",
            },
        ],
    },
    "zh-CN": {
        intro: "Veo 3.1 是 Google 推出的视频生成模型，支持文生视频与首帧图像生视频。在 DramaCanvas 画布上，新用户注册即可获赠 {signupCredits} 积分，按最低档位可免费体验 {freeCount} 条 8 秒片段。你可以直接输入提示词生成镜头，并将满意的内容拖入时间线剪辑短剧。",
        controls: "每次生成均为 8 秒固定时长片段，支持 720p 与 1080p 分辨率，单次消耗 {minCredits} 积分至 {maxCredits} 积分。生成卡片在点击生成前会显示确切扣除的积分数，若生成失败系统会自动返还积分。",
        sceneText: "在短剧创作中，Veo 3.1 适合用来制作场景空镜与环境氛围镜头，建立故事基调。面对戏剧冲突，它能够稳定呈现单一动作节拍或情绪反应的短镜头。创作者也可以将分镜图或角色静态图片作为视频首帧输入，让静态画面连贯动起来。",
        steps: [
            "登录并打开 DramaCanvas 画布，点击添加生成卡片，或在右侧 Agent 对话框中直接发送需求创建卡片。",
            "在卡片的模型选择器中切换到 Veo 3.1，选择 720p 或 1080p 分辨率，卡片底部会显示本次生成所需的确切积分。",
            "在输入框中填入镜头提示词，若需要画面延续还可上传单张图片作为第一帧，确认后点击生成按钮。",
            "生成的 8 秒片段会直接并排呈现在画布上方便对比，挑选满意的镜头直接拖入底部时间线进行剪辑。",
        ],
        faq: [
            {
                question: "Veo 3.1 是什么？DramaCanvas 是它的官方平台吗？",
                answer: "Veo 3.1 是 Google 推出的视频生成模型，在生成连贯镜头和环境氛围方面表现突出。DramaCanvas 是一个独立的在线 AI 短剧与电影创作画布，并非该模型的开发者或官方合作伙伴。在 DramaCanvas 上，你可以将 Veo 3.1 与分镜故事板、角色生成图和剪辑时间线整合在同一工作区中使用。",
            },
            {
                question: "Veo 3.1 可以免费试用吗？",
                answer: "可以。每位新注册用户都能获得一次性到账的 {signupCredits} 积分，无需绑定信用卡，积分也没有过期时间。按照最低画质档位计算，这些赠送积分足够免费生成 {freeCount} 条 8 秒片段。画布上的剧本拆解与分镜规划功能完全免费，只有实际调用模型生成时才会扣除积分。",
            },
            {
                question: "Veo 3.1 价格与计费规则是怎样的？",
                answer: "Veo 3.1 采用按片段计费模式，每生成一条 8 秒片段扣除固定积分，而不是按生成秒数计费。根据你选择的 720p 或 1080p 分辨率，单次生成消耗 {minCredits} 积分至 {maxCredits} 积分，卡片在生成前会明确标出确切扣除数。若生成失败，系统会自动退还扣除的积分，需要更多积分可在定价页面选购会员计划或充值包。",
            },
            {
                question: "Veo 3.1 制作教程：在 DramaCanvas 上怎么用它生成短剧镜头？",
                answer: "你可以先在画布上粘贴剧本并拆分成故事板卡片，也可以直接添加生成卡片并在模型选择器中选定 Veo 3.1。接着用你习惯的语言编写镜头提示词，或上传单张角色图作为视频的第一帧，设置好分辨率后点击生成。生成完成后，多个片段会在画布上平铺展示以便比对，挑选满意的片段直接拖入时间线即可完成镜头组接。",
            },
            {
                question: "Veo 3.1 提示词怎么写？支持中文吗？",
                answer: "Veo 3.1 支持使用中文或你的母语直接输入提示词。写提示词时建议聚焦在单一戏剧拍子的具体动作、景别构图以及环境光影，避免堆砌过于复杂的长句。如果你需要保持角色外貌的一致性，建议先生成满意的角色静止图并作为首帧输入，不过每个镜头仍需人工确认把控。",
            },
            {
                question: "Veo 3.1 支持输入参考视频或音频吗？",
                answer: "不支持。Veo 3.1 目前仅支持纯文本生成视频，或者上传单张静态图片作为视频的第一帧。它不支持参考视频或参考音频输入，如果需要为短剧添加配音或背景音效，可以在剪辑时间线中另外导入处理。",
            },
            {
                question: "我可以绑定自己的 API 密钥（BYOK）使用 Veo 3.1 吗？",
                answer: "可以。DramaCanvas 支持接入你自己的 API 密钥，配置后为你发放密钥的 API 提供商会直接向你计费，DramaCanvas 不再扣除生成积分。需要说明的是，这种模式下 DramaCanvas 仅收取基础的工作区服务费。如果不习惯手动操作卡片，你还可以通过右侧 Agent 对话框或 DramaCanvas MCP 让 AI 助手驱动画布运行。",
            },
            {
                question: "生成的视频可以商用吗？画布上还有哪些可搭配的模型？",
                answer: "关于商业用途，请查阅 Google 的条款以及 DramaCanvas 的服务条款了解具体合规要求。在同一张画布上，你还可以随时切换使用 Seedance 2.5、Kling 3.0、MiniMax H3 或 Wan 3.0 等视频模型，或使用 Nano Banana、GPT Image 2 与 Midjourney V7 生成高质量首帧图片。不同模型生成的镜头可以平铺在画布上横向对比，方便挑选最适合短剧氛围的片段。",
            },
        ],
    },
    "zh-TW": {
        intro: "Veo 3.1 是 Google 的影片生成模型，能在 DramaCanvas 畫布上將短劇劇本與分鏡卡直接轉為 8 秒片段。支援提示詞生成與單張首格圖片驅動，生成前卡片會明確標示扣除點數。註冊即可獲得 {signupCredits} 點數，在最低設定下可免費體驗 {freeCount} 次，無需綁定信用卡。",
        controls: "Veo 3.1 採單支 8 秒片段固定計費而非按秒扣點，可輸出 720p 或 1080p 解析度。每段生成費用介於 {minCredits} 點數至 {maxCredits} 點數之間，卡片在點擊生成前均會顯示確切扣點。",
        sceneText: "在 AI 短劇製作中，Veo 3.1 適合用來生成場景交代鏡頭與環境氛圍空鏡，也能呈現單一戲劇節奏的動作轉折。創作者也可以將角色定裝照或分鏡圖作為首格畫面，直接帶動靜態人物演出並銜接劇情。",
        steps: [
            "登入後開啟畫布，直接貼上短劇劇本拆分為分鏡卡片，或從右側 Agent 對話新增一張生成卡片。",
            "在卡片的模型選擇器切換至 Veo 3.1 與所需解析度，輸入鏡頭提示詞，亦可上傳一張角色圖作為首格畫面。",
            "檢查卡片上顯示的規格與確切點數，確認無誤後點擊生成按鈕開始運算。",
            "生成的 8 秒片段會並排顯示在畫布上方便比對挑選，確認滿意的鏡頭可直接加入時間軸完成短劇剪輯。",
        ],
        faq: [
            {
                question: "Veo 3.1 費用在 DramaCanvas 上如何計算？",
                answer: "Veo 3.1 採固定片段計費，生成一支 8 秒片段需消耗 {minCredits} 點數至 {maxCredits} 點數，依你選擇的解析度而定。在畫布上進行劇本規劃與分鏡編排完全免費，只有執行生成時才會扣除點數，若生成失敗系統會自動退還點數。生成卡片在點擊前會直接顯示該次操作的確切點數，方案與點數包可隨時在定價頁面查看。",
            },
            {
                question: "有提供 Veo 3.1 免費試用額度嗎？",
                answer: "新帳號註冊完成即可獲得 {signupCredits} 點數，無須綁定信用卡且沒有使用期限。在最低設定規格下，這些贈點可讓你免費生成 {freeCount} 個 8 秒片段。如果切換至較高畫質設定，單次消耗的點數會增加，你可以依實際短劇製作需求挑選適合的規格。",
            },
            {
                question: "製作短劇時，Veo 3.1 提示詞該如何撰寫？",
                answer: "你可以直接使用繁體中文等常用語言撰寫提示詞，建議具體描述鏡頭景別、光影氛圍、主體外觀與單一關鍵動作。如果需要延續特定人物，建議搭配一張首格圖片作為視覺依據，避免在文字中堆砌過多抽象修飾詞。卡片會忠實根據你的提示詞運算畫面，讓鏡頭節奏更貼合劇本需求。",
            },
            {
                question: "新手製作短劇的 Veo 3.1 教學流程是什麼？",
                answer: "首先在 DramaCanvas 建立畫布，將短劇劇本貼入並拆分成數張分鏡卡片。接著建立生成卡片，在模型選單中指定 Veo 3.1，並輸入該鏡頭的提示詞或加入首格參考圖。點擊生成後，不同版本的 8 秒成果會並排呈現在畫布上，挑選滿意的片段即可拖入時間軸進行剪輯。",
            },
            {
                question: "在 DramaCanvas 上可以使用自己的 API 金鑰（BYOK）運行 Veo 3.1 嗎？",
                answer: "可以，DramaCanvas 支援 BYOK（自備 API 金鑰）模式。綁定後，由核發金鑰的 API 提供商直接向你計費，DramaCanvas 不會扣除生成點數，僅收取獨立的工作區服務費。這讓擁有自身金鑰的創作者能依照個人工作流彈性調度生成資源。",
            },
            {
                question: "使用 Veo 3.1 生成短劇連貫鏡頭時，如何維持角色外觀一致？",
                answer: "Veo 3.1 支援純文字生成或單張圖片作為首格畫面，但無法直接輸入參考影片或音訊。你可以在同一個畫布上，先使用 Midjourney V7 或 Nano Banana 生成滿意的角色定裝圖，再將該圖片設為 Veo 3.1 的首格畫面來驅動動作。重複使用已確認的角色參考圖能帶來幫助，但每個鏡頭的連貫性仍需要創作者逐一進行人工確認。",
            },
            {
                question: "除了手動點擊卡片，還有其他方式能在畫布上操作 Veo 3.1 嗎？",
                answer: "你可以透過畫布右側的 Agent 對話助手，以自然語言交談的方式直接新增卡片並觸發生成。此外，外部 AI 助手也能經由 DramaCanvas MCP 連接並操控整個畫布流程。這能讓劇本編排、提示詞填寫與生成測試更順暢地整合在同一個專案工作區中。",
            },
            {
                question: "使用 Veo 3.1 生成的短劇片段可以用於商業發行嗎？DramaCanvas 與 Google 的關係為何？",
                answer: "商業使用請查閱 Google 的條款與 DramaCanvas 的服務條款確認具體規範。DramaCanvas 為獨立運作的 AI 創作平台，並非模型開發商，亦非其官方合作夥伴。平台上同時整合了 Veo 3.1、Kling 3.0、MiniMax H3、Seedance 2.5 等多種模型，讓短劇團隊能在同一畫布上自由搭配使用。",
            },
        ],
    },
    "zh-HK": {
        intro: "Veo 3.1 是 Google 旗下的影片生成模型，現已登陸 DramaCanvas 創作畫布。平台按每個 8 秒片段扣除固定點數，註冊即送 {signupCredits} 點數，最低規格可免費體驗 {freeCount} 次（每段 {minCredits} 點數）。支援文字提示詞生成或上傳單張圖片作為首影格，讓你在畫布上直接排版與生成短劇鏡頭。",
        controls: "Veo 3.1 支援輸出 720p 或 1080p 解像度，按每個 8 秒片段計費而非按秒收費。生成卡片會在點擊前明確顯示所需點數，由最低規格的 {minCredits} 點數 至最高規格的 {maxCredits} 點數 不等。",
        sceneText:
            "在 AI 短劇創作中，Veo 3.1 適合用來製作環境空鏡頭與氛圍鏡頭，渲染開場或場景轉換的空間感。它亦能勝任單個戲劇節奏點的動態呈現，或將已確認的角色劇照與分鏡畫面作為首影格轉化為動態影片。生成後的片段能直接拖入時間線，與畫布上的其他鏡頭流暢銜接。",
        steps: [
            "登入 DramaCanvas 並開啟畫布，可在畫布貼上短劇劇本拆分出分鏡卡片，或直接在空白處點擊新增生成卡片。",
            "在卡片的模型選擇器中選取「Veo 3.1」及其規格版本，並設定輸出為 720p 或 1080p 解像度。",
            "輸入中文或自選語言的提示詞，亦可上傳單張圖片作為首影格，卡片下方會即時顯示該 8 秒片段所需的固定點數。",
            "點擊生成按鈕，完成的影片片段會並排顯示於畫布上以供對比挑選，滿意的鏡頭可直接加入時間線完成短劇剪輯。",
        ],
        faq: [
            {
                question: "Veo 3.1 是甚麼模型？在 DramaCanvas 上如何運作？",
                answer: "Veo 3.1 是 Google 推出的影片生成模型，專注於生成動態影片片段。在 DramaCanvas 上，它以獨立生成卡片的形式運作，支援純文字提示詞生成或將單張圖片作為首影格轉為動態。所有生成的 8 秒片段會直接排在畫布上，方便創作者在同一畫面快速比對並排入時間線。",
            },
            {
                question: "新手有簡單的 Veo 3.1 教學嗎？提示詞該如何撰寫？",
                answer: "在 DramaCanvas 上使用 Veo 3.1 非常直觀，你可以直接使用中文或熟悉的語言輸入提示詞，描述短劇鏡頭的環境氛圍或單一動作。若需要更具體的構圖，建議先在畫布生成角色或場景圖，再將其作為首影格上傳。此外，畫布右側的智能助理（Agent）亦支援透過對話自動建立卡片並執行生成。",
            },
            {
                question: "DramaCanvas 提供 Veo 3.1 免費試用額度嗎？",
                answer: "可以，每個新註冊帳戶均可獲贈一次性的 {signupCredits} 點數，無須綁定信用卡且沒有過期限制。這筆額度在最低規格設定下，足夠讓你免費生成 {freeCount} 次 8 秒片段（每次消耗 {minCredits} 點數）。若想嘗試 1080p 或更高階設定，則會按對應規格扣除點數。",
            },
            {
                question: "Veo 3.1 收費如何計算？最高與最低費用是多少？",
                answer: "DramaCanvas 上的 Veo 3.1 採用按片計費模式，以每個 8 秒片段為單位扣點，而非按秒計費。最低規格片段每次扣除 {minCredits} 點數，最高規格版本則為每次 {maxCredits} 點數。卡片在生成前均會明確標示所需點數，用完後可在定價頁面選購會員計劃或點數補充包。",
            },
            {
                question: "甚麼是自備金鑰（BYOK）？費用由誰收取？",
                answer: "創作者可以在 DramaCanvas 連接自己的 API 金鑰（BYOK）。使用自備金鑰時，DramaCanvas 不會扣除生成點數，生成費用由核發該金鑰的 API 提供商直接向你計費，平台僅收取獨立的工作區服務費。你亦可透過 DramaCanvas MCP 讓外部 AI 助手直接控制畫布工作。",
            },
            {
                question: "在畫布上編寫劇本要收費嗎？生成失敗會否退還點數？",
                answer: "在畫布上進行前期規劃完全免費，包括撰寫劇本、拆分與排列分鏡卡片等操作都不會消耗點數。只有按下生成影片時才會扣除點數，若系統生成失敗，相應點數會全數退還至你的帳戶。創作者隨時可以在無壓力的環境下整理短劇結構。",
            },
            {
                question: "製作連續短劇時，Veo 3.1 能否維持角色一致性？",
                answer: "在同一個畫布上，你可以先使用 Midjourney V7 或 Nano Banana 生成滿意的角色靜態圖，再將其作為首影格交由 Veo 3.1 生成動態鏡頭。重複使用已確認的角色參考圖能有助提升連貫性，但每個鏡頭仍需人工檢查與微調。同一個專案中，你亦能靈活搭配 Kling 3.0 或 Wan 3.0 等其他影片模型。",
            },
            {
                question: "Veo 3.1 生成的片段可以商業使用嗎？DramaCanvas 與 Google 是甚麼關係？",
                answer: "關於商業使用權利，請查閱 Google 的條款以及 DramaCanvas 的服務條款獲取最新規定。需要留意的是，DramaCanvas 是一個獨立的創作平台，並非模型開發者，亦非 Google 的官方合作夥伴。平台提供整合多種模型與多語言介面的畫布環境，方便創作者專注於短劇故事創作。",
            },
        ],
    },
    "ja-JP": {
        intro: "Googleの動画生成AI「Veo 3.1」（Veo 3）を、DramaCanvasのキャンバス上で直接動かせます。テキストや画像1枚から8秒の動画を生成でき、初回登録の{signupCredits}クレジットで最安設定なら無料クレジット{freeCount}本分をお試しいただけます。",
        controls: "Veo 3.1は秒単位ではなく1クリップ（8秒）ごとの固定課金で、720pまたは1080pの解像度を選択できます。設定に応じて1本あたり{minCredits}クレジットから{maxCredits}クレジットを消費し、生成前にカード上で正確なクレジット数が表示されます。",
        sceneText:
            "ショートドラマ制作では、作品の導入となる状況設定や雰囲気作りの情景カット、1つの感情変化を捉える短いドラマチックな場面に適しています。キャラクターの静止画や絵コンテ画像を最初の1コマ（先頭フレーム）として指定し、自然な動きをつけるカット作成にも向いています。テキストからの生成と画像1枚からの動画化の双方を用途に合わせて使い分けられます。",
        steps: [
            "キャンバスを開き、画面上で生成カードを追加してモデルセレクターから「Veo 3.1」を選択します。右側のエージェントチャットに対話形式で指示を出してカードを作成させることもできます。",
            "日本語などの使い慣れた言語でプロンプトを入力し、静止画を動かす場合は最初のフレームとして画像を1枚添付します。",
            "解像度などの設定を選ぶと生成前にカード上で必要なクレジット数が表示されるので、確認して生成ボタンをクリックします。",
            "生成された8秒の動画がキャンバス上に並んで表示されるため、仕上がりを比較して採用したクリップをタイムラインへ並べて編集します。",
        ],
        faq: [
            {
                question: "Google Veo 3（Veo 3.1）とはどのようなAIモデルですか？",
                answer: "Veo 3.1はGoogleが開発した動画生成AIモデルです。DramaCanvasでは、テキストプロンプトからの生成と、1枚の画像を先頭フレームにした8秒動画の生成に対応しています。生成結果はキャンバス上に並べて比較でき、そのままタイムラインへ配置してショートドラマの編集を行えます。",
            },
            {
                question: "Google Veo 3を無料で試す方法はありますか？",
                answer: "新規アカウント登録時に、クレジットカード不要かつ有効期限なしの{signupCredits}クレジットが付与されます。この特典により、最安設定であれば無料クレジット{freeCount}本分の動画生成をお試しいただけます。キャンバス上での脚本の整理や絵コンテカードの配置作業はクレジット不要で無料です。",
            },
            {
                question: "Veo 3.1の生成料金やクレジットの消費量はどのくらいですか？",
                answer: "DramaCanvasでは秒単位の課金ではなく、8秒の1クリップごとに固定のクレジットが消費されます。設定内容に応じて1本あたり{minCredits}クレジットから{maxCredits}クレジットが必要となり、生成前にカード上で正確な数値を確認できます。万が一生成に失敗した場合は、消費されたクレジットが自動で返還されます。",
            },
            {
                question: "Veo 3.1ではどの解像度を選べばよいですか？",
                answer: "出力解像度は720pと1080pに対応しています。カットの構図確認やテスト生成には最安設定の{minCredits}クレジットを活用し、本番のタイムラインに組み込む決定カットには1080pを選ぶ使い分けが実用的です。高解像度設定では消費クレジットが増加するため、カード上の表示を確認しながら選択してください。",
            },
            {
                question: "プロンプトの書き方や対応言語はどうなっていますか？",
                answer: "日本語をはじめとする使い慣れた言語でそのままプロンプトを記述できます。人物の動きや周囲の状況、構図を具体的に指定することで狙い通りの情景を生成しやすくなります。特定の静止画から動き始めたい場合は、画像生成モデルで作った画像を先頭フレームとして1枚指定してプロンプトを添えるのが効果的です。",
            },
            {
                question: "ショートドラマ制作で登場人物の見た目を一貫させることはできますか？",
                answer: "承認済みのキャラクター画像を先頭フレームとして再利用することで見た目のブレを抑えやすくなりますが、完全な一致が保証されるわけではないためカットごとの目視確認が必要です。DramaCanvasでは生成したカットをキャンバス上で並べて比較できるため、状態の良いクリップを厳選してタイムラインに並べられます。",
            },
            {
                question: "自分のAPIキー（BYOK）を使って生成することはできますか？",
                answer: "はい、ご自身のAPIキーを接続して利用するBYOKに対応しています。その場合、APIキーを発行したAPIプロバイダーから直接請求が行われるため、DramaCanvasの生成クレジットは消費されません（別途ワークスペース利用料がかかります）。",
            },
            {
                question: "Veo 3.1で生成した動画は商用利用できますか？",
                answer: "商用利用については、Googleの利用規約とDramaCanvasの利用規約をご確認ください。DramaCanvasは独立したプラットフォームであり、モデル開発元の公式パートナーではありません。利用条件は各サービスの最新規約に準拠します。",
            },
            {
                question: "GeminiやFlowのVeoと何が違いますか？他のAIモデルとも併用できますか？",
                answer: "DramaCanvasでは単一のモデルにとどまらず、同じキャンバス上でMidjourney V7などの画像モデルで第1フレームを作り、Veo 3.1で動かす連携が可能です。さらにWan 3.0やKling 3.0といった他の動画モデルも同一画面で切り替えられるため、シーンの役割に合わせて使い分けられます。画面右側のエージェントチャットから対話形式で生成を指示することも可能です。",
            },
        ],
    },
    "ko-KR": {
        intro: "구글 Veo 3.1을 DramaCanvas에서 바로 시작해 보세요. 대본 정리부터 8초 영상 생성까지 한 캔버스에서 완성됩니다. 가입 시 지급되는 {signupCredits} 크레딧으로 최저 설정 기준 {freeCount}회 생성을 체험할 수 있습니다.",
        controls: "해상도는 720p와 1080p를 지원하며, 8초 클립당 최저 {minCredits} 크레딧부터 최고 {maxCredits} 크레딧이 차감됩니다. 초당 과금이 아닌 클립 단위 과금이며, 생성 카드를 누르기 전 차감될 정확한 크레딧이 표시됩니다.",
        sceneText:
            "숏폼 드라마에서 분위기를 잡는 배경 샷이나 인물의 단일 감정 연출에 적합합니다. 첫 프레임으로 캐릭터 스틸컷이나 스토리보드 이미지를 넣어 자연스러운 동작으로 이어지는 장면을 만들 수 있습니다. 극적인 순간을 담은 8초 클립을 완성해 타임라인에서 바로 편집해 보세요.",
        steps: [
            "캔버스를 열고 생성 카드를 추가한 뒤, 모델 선택기에서 Veo 3.1과 원하는 버전을 선택합니다.",
            "한국어로 프롬프트를 입력하고, 첫 프레임으로 사용할 캐릭터나 배경 이미지가 있다면 참조 이미지로 첨부합니다.",
            "해상도 등 설정을 확인하면 카드에 필요한 크레딧이 정확히 표시되며, 생성 버튼을 누릅니다.",
            "생성된 영상 결과물이 캔버스에 나란히 나타나면 마음에 드는 클립을 골라 타임라인에 올려 편집합니다.",
        ],
        faq: [
            {
                question: "구글 Veo 3(Veo 3.1)은 어떤 모델이며 DramaCanvas에서 어떻게 쓰이나요?",
                answer: "Veo 3.1은 구글(Google)의 영상 생성 모델로, 텍스트 프롬프트나 한 장의 첫 프레임 이미지를 바탕으로 영상을 만듭니다. DramaCanvas에서는 대본 기획부터 스토리보드 배치, 영상 생성까지 한 화면에서 진행할 수 있습니다. 생성된 8초 영상은 타임라인에 바로 얹어 숏폼 드라마 편집에 활용됩니다.",
            },
            {
                question: "Veo 3 free(무료 체험)로 직접 써볼 수 있나요?",
                answer: "네, 신규 가입 시 카드 등록 없이 1회 제공되는 {signupCredits} 크레딧으로 Veo 3.1을 무료 체험할 수 있습니다. 최저 설정 기준 클립당 {minCredits} 크레딧이 소모되므로 총 {freeCount}회 생성이 가능합니다. 캔버스에서 대본을 작성하고 스토리보드 카드를 정리하는 기획 작업은 크레딧 차감 없이 언제나 무료입니다.",
            },
            {
                question: "Veo 3.1 영상 생성 비용은 어떻게 계산되나요?",
                answer: "초당 과금이 아닌 생성된 8초 클립당 고정 크레딧 방식으로 계산됩니다. 해상도(720p, 1080p)와 설정에 따라 최저 {minCredits} 크레딧부터 최고 {maxCredits} 크레딧이 차감됩니다. 생성 버튼을 누르기 전 카드에 필요한 정확한 크레딧이 미리 표시되며, 생성이 실패하면 사용된 크레딧은 그대로 반환됩니다.",
            },
            {
                question: "숏폼 드라마 제작을 위한 Veo 3 flow(워크플로우)는 어떻게 구성하나요?",
                answer: "먼저 대본을 붙여넣고 스토리보드 카드로 나눈 뒤, 첫 프레임으로 쓸 이미지 생성 카드를 추가합니다. 같은 캔버스에서 Nano Banana나 Midjourney V7 같은 이미지 모델로 캐릭터 컷을 만들고, 이를 Veo 3.1의 첫 프레임 참조 이미지로 지정해 8초 영상으로 확장합니다. 생성된 여러 클립을 캔버스 위에서 나란히 비교하며 좋은 컷을 골라 하단 타임라인에서 이어 붙이면 됩니다.",
            },
            {
                question: "Gemini Veo 3 연동처럼 캔버스 작업을 AI 어시스턴트로 자동화할 수 있나요?",
                answer: "DramaCanvas 화면 우측에 있는 에이전트 채팅을 통해 대화만으로 카드를 만들고 생성을 지시할 수 있습니다. 또한 DramaCanvas MCP를 지원하므로 연결된 외부 AI 어시스턴트가 캔버스를 직접 제어하도록 구성하는 것도 가능합니다. 복잡한 수동 작업 없이 아이디어 구상과 영상 생성을 대화형으로 빠르게 이어갈 수 있습니다.",
            },
            {
                question: "Veo 3.1 프롬프트는 어떤 언어로 어떻게 작성해야 하나요?",
                answer: "DramaCanvas에서는 한국어를 포함해 모국어로 편하게 프롬프트를 작성하실 수 있습니다. 분위기를 나타내는 배경 묘사나 인물의 동작, 카메라 구도를 구체적으로 적어주면 의도에 맞는 연출이 수월해집니다. 첫 프레임 이미지를 함께 넣을 때는 해당 이미지의 구도와 연결되는 동작 위주로 간결하게 적는 것이 좋습니다.",
            },
            {
                question: "연속된 샷에서 캐릭터 외모의 일관성을 어떻게 유지하나요?",
                answer: "승인된 캐릭터 참조 이미지를 첫 프레임으로 재사용하면 인물의 외모와 분위기를 유지하는 데 도움이 됩니다. 다만 AI 영상 생성 특성상 모든 샷마다 사람이 직접 결과물을 확인하고 검별하는 과정이 필요합니다. 캔버스 위에 여러 생성 결과를 나란히 띄워두고 가장 일관성이 높은 클립을 골라 타임라인에 배치하세요.",
            },
            {
                question: "자체 API 키(BYOK)를 연결해서 쓸 수도 있나요?",
                answer: "네, BYOK(사용자 API 키 연결) 방식을 통해 보유한 API 키를 직접 연동할 수 있습니다. 이 경우 모델 사용료는 해당 키를 발급한 제공업체에서 직접 청구하며, DramaCanvas에서는 영상 생성 크레딧을 차감하지 않고 별도의 워크스페이스 서비스 요금만 적용됩니다. 필요에 따라 플랫폼 크레딧 충전과 자체 키 연결 중 편한 방식을 선택하시면 됩니다.",
            },
            {
                question: "DramaCanvas에서 Veo 3.1로 만든 영상은 상업적으로 쓸 수 있나요?",
                answer: "상업적 이용에 대해서는 Google의 이용약관 및 DramaCanvas 이용약관을 확인하셔야 합니다. DramaCanvas는 모델 개발사가 아니며 공식 파트너 관계가 아닌 독립 플랫폼입니다. 추가 크레딧 팩이나 멤버십 플랜이 필요하신 경우 가격 책정 페이지에서 상세 구성을 확인하실 수 있습니다.",
            },
        ],
    },
    "es-ES": {
        intro: "Genera tomas cinematográficas para tus historias con Veo 3.1 de Google, la tecnología de video IA conocida habitualmente en búsquedas como Veo 3. Al registrarte en DramaCanvas obtienes {signupCredits} créditos iniciales para probar hasta {freeCount} clips en la configuración básica sin coste alguno. Diseña tu guion gráfico, compara variaciones en el lienzo y pasa tus mejores escenas a la línea de tiempo.",
        controls:
            "Cada clip de 8 segundos cuesta entre {minCredits} créditos y {maxCredits} créditos según elijas resolución 720p o 1080p. La tarjeta de generación muestra siempre los créditos exactos antes de ejecutar la toma y el cobro se realiza por clip, no por segundo.",
        sceneText:
            "En un drama corto, Veo 3.1 resulta idóneo para planos de establecimiento y tomas de atmósfera que sitúan el tono de la historia con rapidez. También responde con eficacia al generar un único golpe dramático o al animar una imagen fija de personaje como primer fotograma del plano. Al organizar los resultados en tarjetas paralelas dentro del lienzo, puedes contrastar alternativas y enviar las tomas válidas directo a la línea de tiempo.",
        steps: [
            "Inicia sesión en DramaCanvas, abre tu proyecto en el lienzo y añade una tarjeta de generación directamente o pidiéndoselo al chat del Agente situado a la derecha.",
            "Despliega el selector de modelos para elegir Veo 3.1 y define la resolución de salida entre 720p o 1080p.",
            "Escribe tu prompt en tu propio idioma y sube opcionalmente una imagen para usarla como primer fotograma; la tarjeta te mostrará los ajustes y los créditos exactos antes de hacer clic.",
            "Haz clic en generar para ver los clips de 8 segundos aparecer en paralelo sobre el lienzo y arrastra las tomas aprobadas a la línea de tiempo para montar tu corto.",
        ],
        faq: [
            {
                question: "¿Qué es Google Veo 3.1 y cómo se utiliza para crear video con IA?",
                answer: "Veo 3.1 es el modelo de generación de video desarrollado por Google, conocido habitualmente en búsquedas como Veo 3 o Google Veo 3 AI. En DramaCanvas puedes emplearlo sobre un lienzo visual integrado para convertir texto o una imagen inicial en clips de video de 8 segundos. Todo el proceso de guion, guion gráfico y generación convive en el mismo espacio de trabajo para facilitar la producción de tus dramas cortos.",
            },
            {
                question: "¿Es posible probar Veo 3 gratis en DramaCanvas?",
                answer: "Sí, cada cuenta nueva recibe automáticamente {signupCredits} créditos de bienvenida sin necesidad de registrar tarjeta bancaria y sin caducidad. Con este saldo puedes generar hasta {freeCount} clips de Veo 3.1 en la configuración básica de 720p sin realizar ningún pago. Si decides continuar produciendo más escenas, encontrarás paquetes de créditos y planes de suscripción en la página de precios.",
            },
            {
                question: "¿Cuánto cuesta generar clips con Veo 3.1 y cómo se descuentan los créditos?",
                answer: "La tarifa de Veo 3.1 se factura por clip generado y no por segundo de metraje. Cada clip de 8 segundos tiene un coste que va de {minCredits} créditos en 720p hasta {maxCredits} créditos en 1080p. La tarjeta de generación te indica la cantidad exacta de créditos necesarios antes de pulsar el botón y, si una generación llega a fallar, el sistema te reintegra los créditos de inmediato.",
            },
            {
                question: "¿Cómo es el flujo de trabajo (flow) de Veo 3 dentro de DramaCanvas?",
                answer: "El flujo reúne la creación completa en un único lienzo: puedes escribir o pegar tu guion, dividirlo en tarjetas de guion gráfico y asociar tarjetas de generación con Veo 3.1. También puedes interactuar con el chat del Agente en el lateral derecho para crear tarjetas y lanzar generaciones mediante conversación, o conectar asistentes externos mediante DramaCanvas MCP. Una vez generados los clips, los ordenas en la línea de tiempo integrada para editar la secuencia final de tu drama corto.",
            },
            {
                question: "¿Cuál es la relación de Veo 3.1 con Gemini y cuál es el papel de DramaCanvas?",
                answer: "Veo 3.1 forma parte de las tecnologías de inteligencia artificial de Google, motivo por el cual muchas personas lo asocian en sus búsquedas con el ecosistema de Gemini. DramaCanvas es una plataforma independiente que integra este modelo de Google en un lienzo de producción, sin ser el desarrollador del modelo ni un socio oficial del mismo. Además, la planificación, la redacción del guion y el orden de las tarjetas en el lienzo son totalmente gratuitos; los créditos únicamente se consumen al ejecutar generaciones.",
            },
            {
                question: "¿Qué tipo de entradas admite Veo 3.1 y cómo debo redactar los prompts?",
                answer: "Veo 3.1 permite generar video a partir de texto (text-to-video) o utilizando una sola imagen fija como primer fotograma. No admite videos de referencia ni pistas de audio como entrada. Para redactar tus instrucciones puedes escribir en tu propio idioma describiendo las acciones clave, el movimiento de la cámara y la atmósfera de la toma.",
            },
            {
                question: "¿Puedo utilizar mi propia clave de API (BYOK) para generar con Veo 3.1?",
                answer: "Sí, DramaCanvas admite la modalidad BYOK para que conectes tu propia clave de API. Al utilizar esta opción, el proveedor de la API que emitió tu clave te factura directamente y DramaCanvas no deduce créditos de generación de tu saldo. Ten en cuenta que se aplica una tarifa de servicio independiente por el uso del espacio de trabajo.",
            },
            {
                question: "¿Cómo se mantiene la consistencia de personajes y cómo se combina Veo 3.1 con otros modelos?",
                answer: "Reutilizar una imagen de referencia aprobada de tu personaje como primer fotograma ayuda a mantener la continuidad visual, aunque cada toma resultante requiere siempre una revisión humana. En el mismo lienzo puedes generar esa imagen inicial con modelos como Midjourney V7, Nano Banana o GPT Image 2 y después animarla con Veo 3.1. También puedes alternar planos con otros modelos de video disponibles en la plataforma, como Kling 3.0, Seedance 2.5, MiniMax H3 o Wan 3.0.",
            },
            {
                question: "¿Puedo utilizar los videos creados con Veo 3.1 para proyectos comerciales?",
                answer: "Para el uso comercial de tus piezas debes revisar los términos de Google y los términos de DramaCanvas. DramaCanvas no proporciona asesoría legal sobre los derechos de explotación de las obras generadas. Asegúrate de verificar las políticas vigentes de ambas entidades antes de distribuir o monetizar tu drama corto.",
            },
        ],
    },
    "pt-BR": {
        intro: "O Veo 3.1 é o modelo de geração de vídeo da Google para criar cenas a partir de texto ou de uma imagem inicial. No DramaCanvas, você estrutura o roteiro, organiza o storyboard e gera clipes de 8 segundos diretamente na tela. O cadastro inclui {signupCredits} créditos, cobrindo {freeCount} clipes na configuração mais básica sem exigir cartão de crédito.",
        controls:
            "A cobrança é feita por clipe de 8 segundos em 720p ou 1080p, variando entre {minCredits} créditos e {maxCredits} créditos conforme a resolução escolhida. O card de geração sempre mostra a quantidade exata de créditos antes de iniciar a criação.",
        sceneText:
            "Em mininovelas e produções curtas, o Veo 3.1 se destaca na criação de planos de estabelecimento e cenas que exigem atmosfera dramática. Você pode inserir um quadro do storyboard ou uma imagem aprovada de personagem como primeiro frame para dar vida a um único instante dramático. Na mesma tela de trabalho, os clipes gerados ficam dispostos lado a lado para comparação antes de seguirem para a linha do tempo.",
        steps: [
            "Abra o canvas e adicione um card de geração de vídeo, ou cole seu roteiro para organizar a história em quadros de storyboard.",
            "No seletor de modelos do card, selecione o Veo 3.1 e escolha a resolução do clipe entre 720p e 1080p.",
            "Escreva seu prompt em português e, se quiser orientar o início do movimento, anexe uma imagem como primeiro frame.",
            "Veja o custo em créditos exibido no próprio card, gere o vídeo e arraste os melhores clipes de 8 segundos para a linha do tempo.",
        ],
        faq: [
            {
                question: "O que é o Veo 3.1 da Google e como funciona no DramaCanvas?",
                answer: "O Veo 3.1 é um modelo de inteligência artificial da Google voltado para a criação de clipes de vídeo de 8 segundos. No DramaCanvas, ele opera em uma tela integrada onde você pode transformar texto ou uma imagem de primeiro frame em vídeo para compor sua mininovela. Você pode acionar as gerações manualmente pelos cards ou usar o chat do Agente no lado direito da tela para conduzir a produção por conversa.",
            },
            {
                question: "Como posso testar o Veo 3.1 grátis?",
                answer: "Ao criar sua conta, você recebe {signupCredits} créditos que não expiram e não exigem cadastro de cartão. Essa quantidade cobre a criação de {freeCount} clipes no valor de {minCredits} créditos cada na configuração mais básica do modelo. Configurações em resoluções mais altas consomem até {maxCredits} créditos por clipe, e você pode adquirir recargas ou planos na página de preços se precisar de mais volume.",
            },
            {
                question: "Como usar o Veo 3.1 para criar vídeo a partir de texto ou imagem?",
                answer: "Basta abrir um card no canvas, escrever o prompt em português e, opcionalmente, carregar uma imagem para guiar o primeiro frame. O modelo gera clipes baseados em texto ou a partir de uma única imagem estática, sem entrada para vídeos de referência ou áudio. Se precisar criar a imagem inicial, você pode usar modelos como Nano Banana ou Midjourney V7 no mesmo espaço de trabalho.",
            },
            {
                question: "O Veo 3.1 no DramaCanvas é o mesmo do Google Gemini ou Flow?",
                answer: "O modelo base é a tecnologia Veo 3.1 desenvolvida pela Google, mas o DramaCanvas é uma plataforma independente e não é parceira oficial da desenvolvedora. Enquanto chats como o Gemini geram arquivos avulsos, no DramaCanvas você trabalha com roteiro, storyboard e linha do tempo integrados. O mesmo canvas também permite alternar entre outros modelos de vídeo, como Seedance 2.5, Kling 3.0 e Wan 3.0.",
            },
            {
                question: "Como funciona o uso de chave própria de API (BYOK)?",
                answer: "Você pode conectar sua própria chave de API na plataforma por meio do recurso de BYOK (sua própria chave de API). Ao utilizar essa opção, o provedor da API que emitiu a sua chave faz a cobrança direta e o DramaCanvas não desconta créditos de geração. Uma taxa de serviço referente ao uso do espaço de trabalho é cobrada separadamente.",
            },
            {
                question: "Como manter a consistência de personagens nos vídeos?",
                answer: "Reutilizar uma imagem de referência aprovada do personagem como primeiro frame ajuda a manter a continuidade entre as tomadas. Apesar disso, cada clipe gerado ainda requer verificação humana cuidadosa antes de entrar na edição final. Os resultados ficam dispostos lado a lado na tela para facilitar a escolha das tomadas que mantêm a identidade da cena.",
            },
            {
                question: "Posso usar comercialmente os clipes gerados com o Veo 3.1?",
                answer: "Para o uso comercial de suas mininovelas e projetos audiovisuais, consulte os termos do Google e os termos do DramaCanvas. O planejamento prévio, a escrita de roteiro e a organização dos cards de storyboard na tela são totalmente gratuitos. O consumo de créditos ocorre somente no momento em que você clica para renderizar os clipes.",
            },
            {
                question: "O que acontece se a geração de vídeo falhar?",
                answer: "Caso ocorra qualquer falha durante o processamento do clipe, os créditos utilizados retornam imediatamente para o saldo da sua conta. Além disso, você pode integrar assistentes inteligentes externos para criar cards e disparar gerações por meio do DramaCanvas MCP. Isso garante flexibilidade tanto no controle manual quanto no fluxo assistido por inteligência artificial.",
            },
            {
                question: "Estudantes podem usar o Veo 3.1 para praticar criação audiovisual?",
                answer: "Estudantes e iniciantes podem começar a praticar sem custos usando os {signupCredits} créditos concedidos na abertura da conta. O ambiente suporta múltiplos idiomas, incluindo português, espanhol, inglês, japonês, coreano e chinês tradicional e simplificado. Caso o projeto escolar ou acadêmico demande mais cenas, novos pacotes de créditos e assinaturas estão listados na página de preços.",
            },
        ],
    },
};

export default veo31Overrides;
