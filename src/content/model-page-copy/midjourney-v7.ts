import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Facts and prices from the live catalog.
export const midjourneyV7Overrides: ModelPageOverrides = {
    "en-US": {
        intro: "Generate cinematic concept art and mood boards with Midjourney V7 directly on your production canvas. New DramaCanvas accounts get {signupCredits} credits with no card required, covering about {freeCount} generations at {minCredits} credits each. Turn your script into storyboard shots, establish your art direction, and feed approved frames into video models.",
        controls: "Midjourney V7 costs a fixed {minCredits} credits per generation on DramaCanvas. The generation card displays your exact settings and credit cost before you generate, and any failed generation automatically returns its credits.",
        sceneText:
            "In an AI short drama workflow, Midjourney V7 is built for early look development, costume and set concept art, mood boards, and key visual posters. It helps directors establish a unified visual tone before moving into shot-by-shot production. For locking recurring character appearances with reference images, creators switch to models like Nano Banana or GPT Image 2 on the same canvas.",
        steps: [
            "Sign up or log in, open your canvas, and optionally paste your script to split it into storyboard cards.",
            "Add a generation card and select Midjourney V7 in the model selector to see your settings and the fixed {minCredits} credits cost.",
            "Type your scene prompt in your own language into the text field, review the card details, and click generate.",
            "Compare results side by side on the canvas, send approved images as the first frame to video models like Kling 3.0 or Seedance 2.5, and arrange clips on the timeline.",
        ],
        faq: [
            {
                question: "What is Midjourney V7 and how does it work on DramaCanvas?",
                answer: "Midjourney V7 is Midjourney's image generation model, available directly inside the DramaCanvas workspace. Instead of juggling separate tools, you can plan your script, generate storyboard images, and edit video clips on a single canvas. DramaCanvas is an independent platform hosting the model so creators can produce complete AI short dramas in one place.",
            },
            {
                question: "Can I try Midjourney V7 for free?",
                answer: "Yes, every new DramaCanvas account receives {signupCredits} credits once upon registration with no credit card required. At {minCredits} credits per generation, that signup balance covers about {freeCount} generations so you can test Midjourney V7 on your project before purchasing paid credits. Planning your script and organizing storyboard cards on the canvas is completely free.",
            },
            {
                question: "What is the Midjourney V7 pricing on DramaCanvas?",
                answer: "Generating an image with Midjourney V7 costs a fixed {minCredits} credits per generation on DramaCanvas. The generation card shows this exact credit amount before you generate, so you always know the cost up front. If any generation fails to complete, the system automatically returns your credits to your account balance.",
            },
            {
                question: "How to use Midjourney V7 in an AI short drama workflow?",
                answer: "Start by opening your canvas and adding a generation card, then pick Midjourney V7 from the model selector. Enter your text prompt, review your card settings and credit cost, and click generate to compare results side by side. You can also use the Agent chat on the right side of the canvas to create cards and run generations through conversation.",
            },
            {
                question: "How should I write Midjourney V7 prompts for short films?",
                answer: "Write descriptive scene prompts focusing on lighting, camera framing, wardrobe, and environment details. You can prompt in your own language, as DramaCanvas supports interfaces in English, Japanese, Korean, Spanish, Portuguese, and Chinese. Clear, concrete visual descriptions work best for dialing in concept art and establishing production mood boards.",
            },
            {
                question: "Can I connect my own Midjourney V7 API key with BYOK?",
                answer: "Yes, DramaCanvas allows you to connect your own API key through BYOK. When you use your own key, the API provider that issued your key bills you directly, and DramaCanvas deducts no generation credits. A separate workspace service fee applies when generating with your own connected key.",
            },
            {
                question: "How do I maintain character consistency across scenes?",
                answer: "Midjourney V7 is ideal for initial look development, costume concepts, and scene mood boards. To lock recurring character appearances across multiple storyboard shots using reference images, use models like Nano Banana or GPT Image 2 on the same canvas. Reusing an approved character reference image helps maintain continuity, though every shot still requires a human check.",
            },
            {
                question: "Can I turn Midjourney V7 images into video clips?",
                answer: "Yes, any image generated with Midjourney V7 can be used as the first frame for video models like Seedance 2.5, Kling 3.0, or Veo 3.1 on the same canvas. Once your video shots are generated, drag them onto the timeline to assemble your short drama. For commercial use of your completed work, check Midjourney's terms and DramaCanvas terms.",
            },
        ],
    },
    "zh-CN": {
        intro: "在 DramaCanvas 画布上可以直接使用 Midjourney V7 进行图像生成，将短剧剧本构思转化为视觉画面。新账号注册即可获赠 {signupCredits} 积分，单次固定消耗 {minCredits} 积分，可免费体验约 {freeCount} 次。生成的关键图像能直接作为视频模型的首帧，继续在时间线上剪辑出完整短剧。",
        controls: "生成卡片在点击生成前会明确显示单次固定的 {minCredits} 积分消耗。支持直接输入常用语言的文本提示词，若生成失败会自动返还积分。",
        sceneText:
            "在 AI 短剧创作中，Midjourney V7 适合用来做前期视觉探索、设定情绪板、制作先导海报，以及设计服装与场景概念图。它能帮主创快速敲定全剧的美术基调与视觉风格。当需要锁定具体角色形象并进行多机位微调时，建议在画布中切换到 Nano Banana 或 GPT Image 2 等模型。",
        steps: [
            "注册并登录 DramaCanvas 进入画布，可以先粘贴短剧剧本拆分分镜卡片，或直接新建一张生成卡片。",
            "在模型选择器中选定 Midjourney V7，然后在输入框中用自己的语言输入画面提示词。",
            "卡片会在生成前明确显示当前设置与固定的 {minCredits} 积分，确认后点击生成按钮。",
            "生成结果会并排展示在画布上方便对比，满意的图像可直接设为视频模型首帧并送入时间线剪辑。",
        ],
        faq: [
            {
                question: "Midjourney V7 是什么模型？在短剧制作中能做什么？",
                answer: "Midjourney V7 是由 Midjourney 推出的图像生成模型，主要用于高质量的视觉概念设计与场景画面渲染。在 DramaCanvas 画布中，创作者常将其用于短剧前期的情绪板搭建、服装道具概念设定以及宣发海报生成。生成的画面还可以作为首帧直接传递给视频模型，方便衔接后续的动态画面制作。",
            },
            {
                question: "新手如何在 DramaCanvas 上使用 Midjourney V7？操作流程是怎样的？",
                answer: "登录 DramaCanvas 后打开画布，添加一张生成卡片并在模型选择器中勾选 Midjourney V7。在提示词框中用自己的语言描述所需的分镜画面，卡片会明确显示单次生成所需的 {minCredits} 积分。点击生成后画面会并排呈现，你也可以通过画布右侧的 Agent 助手以自然语言对话来创建卡片和运行生成。",
            },
            {
                question: "Midjourney V7 可以免费试用吗？",
                answer: "新用户在 DramaCanvas 注册账号后，平台会一次性赠送 {signupCredits} 积分，无需绑定银行卡且永久有效。按照每次生成固定扣除 {minCredits} 积分计算，这些积分大约可供免费生成 {freeCount} 次。在画布上梳理剧本和排列分镜卡片完全免费，即使遇到生成失败的情况也会自动退还对应积分。",
            },
            {
                question: "Midjourney V7 在 DramaCanvas 上的价格与扣费规则是怎样的？",
                answer: "在 DramaCanvas 画布上调用 Midjourney V7，单次生成固定扣除 {minCredits} 积分，卡片在点击生成前会清楚展示确切的积分扣除数。平台提供了不同的会员方案与积分加油包，具体规格可在定价页面查看。只要生成未成功完成，系统都会即时把积分返还到账户余额中。",
            },
            {
                question: "Midjourney V7 提示词该怎么写？必须输入英文吗？",
                answer: "在 DramaCanvas 中你可以直接输入中文或其它常用语言的提示词，无需提前翻译成英文。建议在提示词中明确交代镜头主体、构图视角、光照环境以及服装道具等细节要素。具体设置项是否支持上传参考图会在卡片界面清晰显示，按照界面指引操作即可。",
            },
            {
                question: "制作短剧时，如何用 Midjourney V7 保持人物角色的外观一致性？",
                answer: "复用通过审核的角色参考图有助于稳定画面形象，但在短剧分镜推进过程中，每个生成的镜头依然需要人工把关。如果你需要对固定角色的五官特征与装束进行严格锁定与垫图微调，建议切换使用同画布中的 Nano Banana 或 GPT Image 2 模型。通常可以先用 Midjourney V7 探索视觉设定，再换用适合锁脸的模型完成角色定型。",
            },
            {
                question: "配置自带 API 密钥（BYOK）是如何计费的？",
                answer: "通过自带 API 密钥（BYOK）模式，你可以将个人的密钥连接至 DramaCanvas 进行生成。该模式下由发放该密钥的 API 服务商直接向你结算费用，DramaCanvas 不会扣除你的模型生成积分，仅收取独立的工作区服务费。用户也可以借助 DramaCanvas MCP 协议，让外部 AI 助手直接调用和驱动画布。",
            },
            {
                question: "在 DramaCanvas 上用 Midjourney V7 生成的图片可以商用吗？",
                answer: "DramaCanvas 是独立的创作平台，并非 Midjourney 官方或其合作方。关于生成图像的商业使用授权与版权界定，请查看 Midjourney 的服务条款与 DramaCanvas 的服务条款。在将素材用于商业短剧发行前，建议认真阅读双方平台的相关协议规定。",
            },
            {
                question: "在画布上生成的 Midjourney V7 静态图如何转化为动态视频？",
                answer: "DramaCanvas 支持在同一画布内完成图生视频的衔接，你可以直接将满意的 Midjourney V7 图像设为视频模型的起始首帧。画布支持调用 Seedance 2.5、Kling 3.0 以及 Veo 3.1 等视频模型进行镜头延伸，生成的视频片段可直接拖入画布底部的时间线展开剪辑。",
            },
        ],
    },
    "zh-TW": {
        intro: "在 DramaCanvas 畫布上運用 Midjourney V7，能為 AI 短劇建立場景氛圍圖與美術設定。卡片生成固定消耗 {minCredits} 點數，輸入中文提示詞即可在畫布上出圖。新帳號註冊即贈 {signupCredits} 點數，可直接免費體驗約 {freeCount} 次生成。",
        controls: "生成卡片在點擊生成前會明確標註當前設定與所需點數，使用 Midjourney V7 每次固定消耗 {minCredits} 點數。若生成失敗，系統會全額退還該次扣除的點數。",
        sceneText: "在短劇前製階段，Midjourney V7 適合用來繪製美術風格主視覺、情緒板（Mood Board）與宣傳海報，以及服裝與場景概念設計。它能協助團隊在鎖定角色前探索整體視覺基調（Look Development），產出的畫面也能直接作為後續影片模型的首格畫面。",
        steps: [
            "註冊或登入後開啟畫布，可貼上劇本拆分為分鏡卡片，或點擊空白處新增生成卡片；亦可透過右側 Agent 對話建立。",
            "點擊卡片頂端的模型選擇器，在選單中點選 Midjourney V7。",
            "在卡片輸入框鍵入場景描述提示詞（可直接使用自己的語言），卡片會顯示設定與本次所需的 {minCredits} 點數。",
            "點擊卡片上的生成按鈕，生成結果會並列顯示於畫布上方便比對，滿意的圖片可直接設為影片模型的首格畫面。",
        ],
        faq: [
            {
                question: "Midjourney V7 是什麼？在 DramaCanvas 上能做什麼？",
                answer: "Midjourney V7 是 Midjourney 開發的圖像生成模型。在 DramaCanvas 畫布上，創作者主要用它來產出短劇美術風格設定、情緒板、宣傳海報與場景概念圖。生成的靜態畫面也能直接串接同畫布上的影片模型作為首格畫面使用。",
            },
            {
                question: "Midjourney V7 教學：新手如何在畫布上開始製作短劇分鏡？",
                answer: "登入後開啟畫布，你可以先在畫布上貼上劇本並拆分為分鏡卡片，也可以直接點擊新增生成卡片。接著在模型選擇器中選取 Midjourney V7，輸入畫面提示詞，確認卡片顯示的點數後點擊生成。外部 AI 助手也能透過 DramaCanvas MCP 操作畫布，或直接使用右側的 Agent 對話執行生成。",
            },
            {
                question: "Midjourney V7 提示詞該怎麼寫？可以使用中文輸入嗎？",
                answer: "在 DramaCanvas 上你可以直接使用繁體中文等自己的母語輸入提示詞，系統能正常接收理解。撰寫時建議具體描繪主體、場景光影、鏡頭景別與美術氛圍。卡片會依據你輸入的提示詞進行生成，送出前卡片上都會清楚標明當前設定。",
            },
            {
                question: "Midjourney V7 費用如何計算？生成失敗會扣點嗎？",
                answer: "在 DramaCanvas 上使用 Midjourney V7，每次生成固定消耗 {minCredits} 點數，生成前卡片會明確顯示扣除額度。如果遇到生成失敗，系統會自動全額退還該次消耗的點數。在畫布上編寫劇本與排列分鏡卡片等企劃操作則是完全免費的。",
            },
            {
                question: "有 Midjourney V7 免費體驗額度嗎？新用戶能試用幾次？",
                answer: "每個新註冊帳號都會獲得一次性的 {signupCredits} 點數，無需綁定信用卡也沒有使用期限。以 Midjourney V7 每次生成固定消耗 {minCredits} 點數計算，這些贈送的點數大約可供你免費體驗 {freeCount} 次生成。若需要更多點數，可隨時前往定價頁面購買點數包或訂閱會員方案。",
            },
            {
                question: "可以使用自備金鑰（BYOK）運行 Midjourney V7 嗎？帳單如何計算？",
                answer: "可以，DramaCanvas 支援自備金鑰（BYOK，即使用自己的 API 金鑰）。在此模式下，由發行該金鑰的 API 提供者直接向你收取費用，DramaCanvas 不會扣除生成點數，僅收取獨立的工作區服務費。這讓擁有自己金鑰的團隊能彈性管理成本。",
            },
            {
                question: "Midjourney V7 支援參考圖嗎？如何保持短劇角色的一致性？",
                answer: "生成卡片上會明確顯示當前設定是否接受參考圖。若要在 AI 短劇中鎖定特定角色外觀，建議使用同畫布上的 Nano Banana 或 GPT Image 2 等支援參考圖編輯的模型。即使重複使用已確認的角色參考圖，製作每個分鏡鏡頭時依然需要創作者人工檢查確認。",
            },
            {
                question: "Midjourney V7 生成的圖片如何轉換成短劇影片？",
                answer: "在畫布上生成滿意的圖片後，可直接將該圖片指定為影片模型的首格畫面，無需手動下載重傳。同一個畫布上整合了 Seedance 2.5、Kling 3.0 與 Veo 3.1 等影片模型，生成的分鏡短片能直接排進時間軸進行短劇剪輯。",
            },
            {
                question: "DramaCanvas 是 Midjourney 的官方合作夥伴嗎？支援哪些介面語言？",
                answer: "不是，DramaCanvas 是獨立運作的創作平台，並非模型開發商 Midjourney，亦非其官方合作夥伴。平台介面支援繁體中文、簡體中文、英文、日文、韓文、西班牙文與葡萄牙文，方便不同語言背景的創作者在同一個畫布上協作。",
            },
        ],
    },
    "zh-HK": {
        intro: "在 DramaCanvas 畫布上即可直接調用 Midjourney V7 製作短劇分鏡圖與美術設定。新帳戶註冊即贈 {signupCredits} 點數，以每次生成固定扣除 {minCredits} 點數計算，大約可免費體驗 {freeCount} 次。生成的圖像能直接作為同一個畫布上影片模型的首幀，輕鬆銜接動態鏡頭。",
        controls: "每次生成固定扣除 {minCredits} 點數，生成卡片會在點擊生成前清楚顯示所需點數與當前設定。若生成失敗，系統會全額退回點數。",
        sceneText:
            "在 AI 短劇製作中，Midjourney V7 適合用於前期美術概念設計、氛圍板（mood board）、宣傳海報及服裝與場景的視覺探索。主創團隊可在早期嘗試不同風格基調，待視覺風格確立後，再轉至 Nano Banana 或 GPT Image 2 配合參考圖鎖定固定角色。篩選出的優秀概念圖亦可直接送入 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型作為起始首幀。",
        steps: [
            "登入 DramaCanvas 打開畫布，可貼上短劇劇本拆分分鏡卡片，或直接點擊新增一張生成卡片。",
            "在卡片的模型選擇器中選取 Midjourney V7，接著用自己的語言輸入畫面提示詞，卡片會即時顯示設定與所需點數。",
            "確認設定後點擊生成，生成結果會並排呈現在畫布上，方便隨時比對構圖與光影細節。",
            "保留滿意的鏡頭畫面，可將其設為同畫布上影片模型的首幀生成短片，最後把片段排入時間軸剪輯短劇。",
        ],
        faq: [
            {
                question: "甚麼是 Midjourney V7？在 DramaCanvas 上如何使用？",
                answer: "Midjourney V7 是 Midjourney 開發的圖像生成模型，擅長呈現細緻的構圖與藝術氛圍。在 DramaCanvas 上，你可以直接在視覺畫布中調用此模型，將劇本分鏡、生成卡片與影片模型整合在同一工作區內。畫布右側的智能助理（Agent）亦支援透過對話協助建立卡片並執行生成。",
            },
            {
                question: "Midjourney V7 在 DramaCanvas 上的收費方式是甚麼？",
                answer: "在 DramaCanvas 調用 Midjourney V7 採用固定扣點機制，每次生成固定消耗 {minCredits} 點數。卡片在點擊生成前會明確顯示所需點數與各項參數，不會產生未說明的扣費。若遇到生成失敗的情況，系統會自動將該次點數退回你的帳戶。",
            },
            {
                question: "可以免費試用 Midjourney V7 嗎？",
                answer: "可以。所有新註冊帳戶均可獲得一次性贈送的 {signupCredits} 點數，無需綁定信用卡且無有效期限。按每次生成消耗 {minCredits} 點數計算，贈送點數大約可供你免費體驗 {freeCount} 次生成。在畫布上進行劇本編寫、排版分鏡卡片等前置規劃均為完全免費。",
            },
            {
                question: "有 Midjourney V7 的入門教學或提示詞撰寫建議嗎？",
                answer: "在生成卡片中，你可以直接使用自己的常用語言輸入提示詞，清楚描述短劇場景的光影、主體動作與攝影機鏡頭角度。生成卡片會標明當前設定是否支援參考圖輸入，你只需依畫面提示操作即可。如果不想手動設定，亦可在右側與智能助理（Agent）對話，由助理直接為你建立生成卡片。",
            },
            {
                question: "製作短劇時，如何利用 Midjourney V7 維持角色一致性？",
                answer: "Midjourney V7 適合在前置階段探索角色外觀與服裝設定。若短劇需要跨鏡頭鎖定固定角色特徵，建議在畫布上切換至 Nano Banana 或 GPT Image 2 模型，配合已確認的角色參考圖進行生成。不論使用何種模型，每組分鏡鏡頭仍需創作者人工審查與確認。",
            },
            {
                question: "在畫布上生成的 Midjourney V7 圖像，能直接轉成影片嗎？",
                answer: "可以。在同一畫布上，你可以直接將 Midjourney V7 生成的圖像設為 Seedance 2.5、Kling 3.0 或 Veo 3.1 等影片模型的首幀畫面。生成後的短片能直接拖放至底部的時間軸，方便即時剪輯並預覽整部短劇。",
            },
            {
                question: "DramaCanvas 是否支援自備 API 金鑰（BYOK）？",
                answer: "支援。你可以在 DramaCanvas 中綁定自備金鑰（BYOK），此時發行該金鑰的 API 提供商會直接向你收取模型使用費，DramaCanvas 不會扣除生成點數。在此模式下，平台僅收取獨立的工作區服務費。",
            },
            {
                question: "生成的圖像可用於商業短劇嗎？DramaCanvas 與 Midjourney 是甚麼關係？",
                answer: "關於商業用途規範，請查閱 Midjourney 的官方條款以及 DramaCanvas 的使用者服務條款。DramaCanvas 是獨立的創作平台，並非模型開發者，亦非 Midjourney 的官方合作夥伴。你在畫布上保留滿意的圖像後，即可按相關條款規範用於短劇發行。",
            },
        ],
    },
    "ja-JP": {
        intro: "Midjourney V7（ミッドジャーニー）は、短編ドラマの美術設定やキービジュアル作成に適した画像生成モデルです。新規登録の{signupCredits}クレジットで、1回{minCredits}クレジットの設定なら約{freeCount}回試せます。",
        controls: "生成カードにプロンプトを入力して生成します。1回あたり{minCredits}クレジット固定で、実行前にカード上で設定内容と消費クレジットを確認できます。",
        sceneText:
            "短編ドラマの制作では、作品の世界観を固めるムードボードや美術コンセプト、衣装デザイン、キービジュアルの作成に適しています。他モデルでキャラクターを固定する前のルック開発にも役立ち、生成した画像は同じキャンバス上で動画モデル（Seedance 2.5、Kling 3.0、Veo 3.1）の始点フレームに指定できます。リファレンス画像を使ったキャラクター固定には、Nano BananaやGPT Image 2の利用をおすすめします。",
        steps: [
            "キャンバスを開き、画面上のメニューから生成カードを追加します。必要に応じて脚本を貼り付け、絵コンテカードに分割して配置することもできます。",
            "カード内のモデル選択で「Midjourney V7」を選び、プロンプト入力欄に生成したいシーンの指示文を母国語で入力します。",
            "カードに表示された設定と{minCredits}クレジットの消費量を確認して生成ボタンを押すと、キャンバス上に結果画像が並んで出力されます。",
            "仕上がりを比較して採用した画像は、同じキャンバス上の動画生成モデルの始点フレームに設定でき、動画クリップをタイムラインに並べて編集します。",
        ],
        faq: [
            {
                question: "Midjourney V7（ミッドジャーニー）とはどのようなAIモデルですか？",
                answer: "Midjourneyが開発した画像生成モデルです。DramaCanvasではキャンバス上に生成カードを配置して直接呼び出すことができ、AIショートドラマのキービジュアル作成や美術コンセプト、衣装のルック開発などに活用できます。画面右側のAgentチャットから会話形式でカードを作成し、生成を実行することも可能です。",
            },
            {
                question: "Midjourneyは無料で利用できますか？料金の仕組みはどうなっていますか？",
                answer: "新規登録時に{signupCredits}クレジットが付与され、1回あたり{minCredits}クレジットで約{freeCount}回の画像生成を無料でお試しいただけます。キャンバス上での脚本執筆や絵コンテの配置などの構想作業は無料で行え、画像生成時にのみクレジットが消費されます。失敗した生成のクレジットは自動で返却され、継続利用向けのメンバーシッププランやクレジットパックは料金ページで確認できます。",
            },
            {
                question: "日本語のプロンプトでMidjourneyを使うことはできますか？使い方は？",
                answer: "はい、日本語のプロンプトをそのまま入力して利用できます。キャンバスに生成カードを追加し、モデル選択でMidjourney V7を指定して指示文を入力するだけで手軽に生成が始まります。カード上に生成前の設定内容と必要な{minCredits}クレジットが表示されるため、事前に消費量を確認しながら操作可能です。",
            },
            {
                question: "生成したMidjourneyのイラストや画像は商用利用できますか？",
                answer: "商用利用の可否については、Midjourneyの利用規約およびDramaCanvasの利用規約をご確認ください。DramaCanvasは独立したプラットフォームであり、モデル開発元の公式パートナーではありません。商用プロジェクトでの利用に際しては、双方の最新の規約条件を満たしているかご自身で確認することをおすすめします。",
            },
            {
                question: "Midjourneyで生成した画像からショートドラマの動画を作ることはできますか？",
                answer: "はい、生成した画像を同じキャンバス上にある動画生成モデルの始点フレームとして利用できます。DramaCanvasではSeedance 2.5、Kling 3.0、Veo 3.1に対応しており、生成画像をそのまま動画化へ繋げることが可能です。完成した動画クリップはキャンバス下のタイムラインに並べてショートドラマとして編集できます。",
            },
            {
                question: "ショートドラマ制作でキャラクターの見た目を一貫させる方法はありますか？",
                answer: "承認済みのキャラクターリファレンス画像を活用することで人物像のブレを抑えやすくなりますが、すべてのカットで人の目による確認が必要です。Midjourney V7の設定がリファレンス画像を受け付けるかどうかはカード上の表示で確認できます。リファレンス画像を用いたキャラクターの固定や画像編集を行いたい場合は、同じキャンバス上のNano BananaやGPT Image 2の利用をおすすめします。",
            },
            {
                question: "自分のAPIキーを使うBYOK接続に対応していますか？",
                answer: "はい、ご自身のAPIキーを接続して利用するBYOKに対応しています。この場合、キーを発行したAPIプロバイダーから直接利用料金が請求され、DramaCanvas側の生成クレジットは消費されません（別途ワークスペース利用のサービス料が適用されます）。また、DramaCanvas MCPを利用すれば、外部のAIアシスタントからキャンバスを操作して制作を進めることも可能です。",
            },
            {
                question: "DramaCanvasの対応言語や解約について教えてください。",
                answer: "DramaCanvasは日本語、英語、韓国語、スペイン語、ポルトガル語、簡体字中国語、繁体字中国語の表示に対応しています。生成に失敗した場合は消費されたクレジットが自動でアカウントに返却されます。有料プランの解約や追加クレジットの購入については、料金ページおよびアカウント設定画面からいつでも確認できます。",
            },
        ],
    },
    "ko-KR": {
        intro: "미드저니 V7은 AI 숏드라마의 키 비주얼과 콘셉트 무드보드를 설계하는 이미지 생성 모델입니다. DramaCanvas 신규 가입 시 제공되는 {signupCredits} 크레딧으로 회당 {minCredits} 크레딧 기준 약 {freeCount}회 무료 생성을 바로 시작할 수 있습니다.",
        controls: "미드저니 V7은 생성 1회당 {minCredits} 크레딧이 고정으로 차감되며, 생성 버튼을 누르기 전 카드에서 설정과 정확한 크레딧을 확인할 수 있습니다. 생성이 실패하면 사용된 크레딧은 계정으로 즉시 반환됩니다.",
        sceneText:
            "AI 숏드라마 제작 초기 단계에서 전체적인 시각적 톤을 잡는 아트 디렉션과 무드보드, 포스터용 키 비주얼 및 의상·세트 콘셉트 아트를 제작하는 데 적합합니다. 다른 모델로 캐릭터를 고정하기 전 룩 디벨롭먼트 단계에 활용하기 좋으며, 생성된 이미지는 같은 캔버스의 Seedance 2.5, Kling 3.0, Veo 3.1 등 비디오 모델의 첫 프레임으로 바로 투입할 수 있습니다. 레퍼런스를 활용해 캐릭터를 본격적으로 고정하고 편집해야 하는 컷은 Nano Banana나 GPT Image 2를 함께 구성해 제작을 이어갈 수 있습니다.",
        steps: [
            "캔버스를 열고 대본을 붙여넣어 스토리보드 카드로 분할하거나, 작업 공간에 생성 카드를 직접 추가합니다. 우측 Agent 채팅에 대화를 입력해 카드를 생성할 수도 있습니다.",
            "생성 카드의 모델 선택기에서 미드저니 V7을 선택한 뒤, 프롬프트 입력창에 연출하려는 무드나 의상, 세트 묘사를 한국어로 작성합니다.",
            "카드 하단에 표시된 설정과 고정 차감되는 {minCredits} 크레딧을 확인하고 생성 버튼을 클릭합니다.",
            "캔버스에 나란히 생성된 결과물 중 원하는 컷을 골라 비디오 모델의 첫 프레임으로 지정하고, 완성된 클립을 타임라인으로 옮겨 숏드라마를 편집합니다.",
        ],
        faq: [
            {
                question: "미드저니 V7을 무료로 사용해 볼 수 있나요? 가격과 요금 체계는 어떻게 되나요?",
                answer: "DramaCanvas 신규 계정 가입 시 최초 1회 {signupCredits} 크레딧이 지급되며, 미드저니 V7의 회당 생성 비용인 {minCredits} 크레딧 기준으로 약 {freeCount}회 무료 생성이 가능합니다. 가입 크레딧에는 별도의 유효기간이나 카드 등록 요구가 없으며, 캔버스에서 대본을 쓰고 카드를 배치하는 기획 작업은 상시 무료입니다. 추가 이용이 필요할 때는 요금제 페이지에서 멤버십 플랜이나 크레딧 팩을 충전해 이용할 수 있습니다.",
            },
            {
                question: "디스코드(Discord) 없이 웹 브라우저 캔버스에서 미드저니 V7을 바로 쓸 수 있나요?",
                answer: "네, 별도의 디스코드 설치나 복잡한 명령어 입력 없이 DramaCanvas 웹 사이트의 단일 캔버스에서 바로 사용할 수 있습니다. 생성 카드에서 미드저니 V7을 선택하고 일반적인 문장으로 프롬프트를 작성하면 즉시 결과 이미지가 캔버스에 생성됩니다. 화면 우측의 Agent 채팅창을 통해 자연어로 대화하며 카드를 만들고 생성을 실행하는 방식도 지원합니다.",
            },
            {
                question: "미드저니 V7 프롬프트는 한국어로 입력해도 생성되나요?",
                answer: "네, DramaCanvas는 한국어를 비롯해 영어, 일본어, 중국어 등 다양한 인터페이스 언어를 지원하며 프롬프트도 한국어로 작성할 수 있습니다. 표현하려는 무드, 인물의 의상, 조명 및 공간 분위기를 자연스러운 묘사형 텍스트로 적어 넣으시면 됩니다. 레퍼런스 이미지 첨부 가능 여부는 생성 카드 설정창에 직관적으로 표시되므로 해당 항목을 확인하고 진행하시면 됩니다.",
            },
            {
                question: "미드저니 V7으로 생성한 이미지를 AI 숏드라마 영상으로 어떻게 만드나요?",
                answer: "캔버스에 생성된 미드저니 V7 이미지를 Seedance 2.5, Kling 3.0, Veo 3.1 등 동일 캔버스에 있는 비디오 모델 카드의 첫 프레임으로 바로 지정할 수 있습니다. 이렇게 생성된 영상 클립들을 하단 타임라인으로 끌어다 놓으면 화면 전환과 장면 배치를 직접 조율하며 숏드라마 편집을 완성할 수 있습니다. 대본부터 콘셉트 아트, 비디오 클립 생성과 최종 편집까지 모든 과정이 하나의 캔버스에서 연결됩니다.",
            },
            {
                question: "숏드라마에서 미드저니 V7으로 동일한 캐릭터 얼굴을 고정할 수 있나요?",
                answer: "승인된 캐릭터 레퍼런스 이미지를 활용하는 방식이 인물 일관성을 유지하는 데 도움을 주지만, 모든 장면 컷에 대해 창작자의 시각적 검수가 반드시 필요합니다. 특히 레퍼런스 이미지를 사용해 캐릭터 외형을 정밀하게 고정하고 컷을 이어가야 하는 작업이라면 동일 캔버스 내의 Nano Banana나 GPT Image 2 모델을 사용하는 것을 권장합니다. 미드저니 V7은 초반 인물의 콘셉트 아트나 전체적인 룩 디벨롭먼트를 설계하는 데 효과적입니다.",
            },
            {
                question: "이미지 생성이 실패하면 사용된 크레딧은 환불되나요?",
                answer: "네, 시스템 오류나 네트워크 문제 등으로 생성이 실패할 경우 차감되었던 크레딧은 자동으로 계정에 반환됩니다. 미드저니 V7은 생성 버튼을 누르기 전 카드에 고정 비용인 {minCredits} 크레딧이 명시되므로 차감량을 사전에 명확하게 확인할 수 있습니다. 멤버십 플랜 및 크레딧 충전과 관련된 일반 환불 정책은 DramaCanvas 요금제 안내 페이지의 규정을 따릅니다.",
            },
            {
                question: "본인의 자체 API 키(BYOK)를 등록해서 미드저니 V7을 이용할 수 있나요?",
                answer: "네, DramaCanvas에서는 자체 API 키(BYOK)를 직접 등록해 연결하는 기능을 지원합니다. 이 방식을 사용하면 키를 발급한 API 제공업체에서 사용자에게 직접 이용 요금을 청구하며, DramaCanvas의 생성 크레딧은 차감되지 않습니다. 다만 이 경우 별도의 워크스페이스 서비스 수수료가 적용됩니다.",
            },
            {
                question: "DramaCanvas에서 미드저니 V7으로 생성한 이미지를 상업적으로 이용할 수 있나요?",
                answer: "생성물의 상업적 이용 권한과 저작권 범위에 대해서는 Midjourney 이용약관과 DramaCanvas 이용약관을 함께 확인해야 합니다. DramaCanvas는 독립적인 플랫폼으로, Midjourney의 공식 파트너나 모델 개발사가 아닙니다. 또한 DramaCanvas MCP를 지원하므로 외부 AI 어시스턴트를 연동하여 캔버스를 자동 제어하는 작업 환경도 구성할 수 있습니다.",
            },
        ],
    },
    "es-ES": {
        intro: "Genera imágenes para tus proyectos audiovisuales con Midjourney V7 directamente en el lienzo de DramaCanvas. Diseña el arte conceptual, los pósteres y los entornos de tu historia a partir de tus descripciones de texto y conecta los resultados con modelos de video. Puedes comenzar a probarlo con los {signupCredits} créditos de bienvenida que incluye cada cuenta nueva.",
        controls: "Cada generación con Midjourney V7 tiene un costo fijo de {minCredits} créditos. La tarjeta de generación te muestra los ajustes seleccionados y el costo exacto antes de pulsar el botón.",
        sceneText:
            "En la producción de dramas cortos, Midjourney V7 se utiliza en la dirección de arte, el desarrollo visual inicial y la creación de pósteres y visuales clave. Sirve para definir la estética de escenarios y el vestuario antes de fijar a tus personajes en modelos como Nano Banana o GPT Image 2. Además, puedes enviar la imagen resultante como primer fotograma a modelos de video como Seedance 2.5, Kling 3.0 o Veo 3.1 en el mismo lienzo.",
        steps: [
            "Abre el lienzo de DramaCanvas y añade una tarjeta de generación manual o pide al asistente del chat lateral que la cree por ti.",
            "Abre el selector de modelos, elige Midjourney V7 y escribe tu prompt descriptivo en tu propio idioma dentro del campo de texto.",
            "Revisa los ajustes configurados y el consumo exacto de créditos fijado en la tarjeta antes de pulsar el botón de generar.",
            "Observa los resultados generados uno al lado de otro sobre el lienzo para compararlos y traslada la toma elegida a la línea de tiempo o a un modelo de video.",
        ],
        faq: [
            {
                question: "¿Qué es Midjourney V7 y cómo funciona en DramaCanvas?",
                answer: "Midjourney V7 es un modelo de generación de imágenes por inteligencia artificial desarrollado por Midjourney. En DramaCanvas puedes integrarlo en un flujo de trabajo para dramas cortos junto a tu guion, organizando tarjetas visuales y conectando los fotogramas resultantes con modelos de video. Todo el proceso ocurre en un único lienzo interactivo, ya sea configurando tarjetas manualmente o mediante el asistente de chat integrado.",
            },
            {
                question: "¿Se puede usar Midjourney V7 gratis?",
                answer: "Al registrarte en DramaCanvas obtienes {signupCredits} créditos iniciales sin necesidad de ingresar tarjeta bancaria ni fecha de caducidad. Dado que cada imagen con Midjourney V7 consume {minCredits} créditos, ese saldo inicial cubre {freeCount} generaciones para probar el modelo en tus proyectos. La planificación, la redacción del guion y la organización de tarjetas en el lienzo no consumen créditos.",
            },
            {
                question: "¿Cuál es el precio de Midjourney V7 en la plataforma?",
                answer: "Cada generación con Midjourney V7 consume {minCredits} créditos en DramaCanvas. El costo exacto se indica en la tarjeta antes de pulsar el botón de generar, por lo que conoces de antemano el saldo requerido. Si necesitas más saldo, puedes adquirir paquetes de créditos o planes de membresía en la página de precios, y si una generación llega a fallar, el sistema devuelve los créditos automáticamente.",
            },
            {
                question: "¿Midjourney V7 cómo usar en un drama corto?",
                answer: "Primero abre el lienzo, divide tu guion en tarjetas de guion gráfico y añade una tarjeta de generación seleccionando Midjourney V7. Escribe la descripción de la toma, comprueba los créditos indicados y genera las imágenes conceptuales o fotogramas clave. Las imágenes creadas aparecen una al lado de la otra para que elijas las tomas que prefieras y las envíes directamente como primer fotograma a modelos de video como Seedance 2.5, Kling 3.0 o Veo 3.1.",
            },
            {
                question: "¿Cómo escribir Midjourney V7 prompts en DramaCanvas?",
                answer: "Puedes redactar tus prompts para Midjourney V7 directamente en tu propio idioma, ya sea español u otros disponibles en la interfaz. Describe con precisión el sujeto, la iluminación, el vestuario, el encuadre cinematográfico y la ambientación general de la escena. La tarjeta de generación muestra si la configuración seleccionada admite imágenes de referencia para guiar el resultado.",
            },
            {
                question: "¿Cómo mantener la consistencia de personajes con Midjourney V7?",
                answer: "Midjourney V7 es útil para explorar la dirección de arte y el vestuario inicial, aunque cada toma generada requiere revisión humana. Si tu proyecto necesita fijar la identidad de un personaje mediante imágenes de referencia, puedes utilizar modelos como Nano Banana o GPT Image 2 en el mismo lienzo. Posteriormente, puedes usar esas imágenes fijadas como punto de partida en los modelos de video de la plataforma.",
            },
            {
                question: "¿Puedo conectar mi propia clave de API (BYOK) para usar Midjourney V7?",
                answer: "DramaCanvas admite la modalidad BYOK (traer tu propia clave de API) para conectar tus credenciales en el espacio de trabajo. Cuando usas tu propia clave, el proveedor de API que emitió dicha clave te factura directamente y DramaCanvas no descuenta créditos de generación. Para este modo de uso se aplica una tarifa de servicio independiente por el espacio de trabajo.",
            },
            {
                question: "¿Se pueden utilizar comercialmente las imágenes de Midjourney V7 creadas en DramaCanvas?",
                answer: "DramaCanvas es una plataforma independiente, no es el desarrollador del modelo ni un socio oficial de Midjourney. Para el uso comercial, revisa los términos de Midjourney y los términos de DramaCanvas. Comprueba las condiciones de licencia de ambos servicios antes de distribuir tus producciones audiovisuales.",
            },
        ],
    },
    "pt-BR": {
        intro: "O Midjourney V7 no DramaCanvas gera imagens de direção de arte, pôsteres e conceitos visuais diretamente no seu fluxo de produção. Você pode testar o Midjourney V7 grátis com os {signupCredits} créditos iniciais da sua conta, rendendo cerca de {freeCount} gerações no canvas. Basta abrir o canvas, digitar seu prompt em português e comparar os resultados lado a lado para avançar no seu roteiro.",
        controls: "Cada geração com o Midjourney V7 custa um valor fixo de {minCredits} créditos, exibido no próprio card antes de você clicar em gerar. Se uma geração falhar, os créditos retornam automaticamente para a sua conta.",
        sceneText:
            "Em mininovelas e curtas de IA, o Midjourney V7 atende à criação de key visuals, pôsteres conceituais, direção de arte e desenvolvimento de figurinos e cenários. O modelo ajuda a definir a identidade visual do projeto antes de travar personagens com opções como Nano Banana ou GPT Image 2. As imagens aprovadas no canvas podem ser aproveitadas como primeiro quadro para modelos de vídeo como Seedance 2.5, Kling 3.0 ou Veo 3.1 na mesma tela.",
        steps: [
            "Abra o canvas e adicione um card de geração, ou cole seu roteiro para dividir a história em quadros de storyboard.",
            "No seletor de modelos do card, selecione o Midjourney V7 para carregar as opções de imagem.",
            "Digite seu prompt de cena em português e confira os ajustes e o custo de {minCredits} créditos exibidos no card antes de confirmar.",
            "Clique em gerar para ver os resultados lado a lado no canvas, guardando as imagens aprovadas para usar como primeiro quadro de vídeo ou enviar à timeline.",
        ],
        faq: [
            {
                question: "O que é o Midjourney V7 no DramaCanvas?",
                answer: "O Midjourney V7 é o modelo de geração de imagens da Midjourney integrado diretamente ao DramaCanvas. Ele permite criar conceitos visuais, direção de arte e pôsteres para suas produções audiovisuais no mesmo espaço onde você organiza seu roteiro. Além disso, as imagens criadas podem ser usadas como primeiro quadro para modelos de vídeo na plataforma.",
            },
            {
                question: "Como testar o Midjourney V7 grátis?",
                answer: "Ao criar uma nova conta no DramaCanvas, você recebe {signupCredits} créditos gratuitos uma única vez, sem precisar cadastrar cartão e sem prazo de validade. Com o custo fixo de {minCredits} créditos por geração, esse saldo inicial cobre cerca de {freeCount} gerações para você experimentar o modelo no canvas. O planejamento de roteiro e a organização dos quadros de storyboard também são totalmente gratuitos.",
            },
            {
                question: "Qual é o preço por geração do Midjourney V7?",
                answer: "No DramaCanvas, cada geração com o Midjourney V7 tem o custo fixo de {minCredits} créditos por imagem. O card de geração sempre mostra a quantidade exata de créditos necessária antes do envio, evitando surpresas. Se uma tentativa falhar por erro técnico, os créditos consumidos são devolvidos automaticamente para a sua conta.",
            },
            {
                question: "Midjourney V7: como usar na criação de mininovelas?",
                answer: "Você começa abrindo o canvas e criando um card de geração ou dividindo seu roteiro em quadros de storyboard. Em seguida, escolhe o Midjourney V7 no seletor de modelos, escreve o prompt descritivo da cena e clica em gerar. As imagens geradas aparecem lado a lado para comparação visual imediata e podem servir como ponto de partida para animar cenas na timeline.",
            },
            {
                question: "Como escrever prompts para o Midjourney V7 no DramaCanvas?",
                answer: "Você pode digitar seus prompts diretamente em português ou no idioma que preferir, descrevendo iluminação, enquadramento, figurino e atmosfera da cena. O card indica os campos de entrada disponíveis para o modelo antes de você gerar. Se preferir criar a partir de um diálogo, o chat com agente no lado direito do canvas pode montar os cards e redigir prompts com base nas suas orientações.",
            },
            {
                question: "Como manter a consistência de personagens com o Midjourney V7?",
                answer: "O Midjourney V7 é ideal para a fase de exploração visual, figurino e cenários do seu projeto. Para travar a aparência de um personagem com base em imagens de referência e editar consistência, recomendamos usar modelos como Nano Banana ou GPT Image 2 no mesmo canvas. Mesmo utilizando imagens de referência aprovadas nesses modelos, cada cena final sempre deve passar pela conferência humana.",
            },
            {
                question: "Como transformar imagens do Midjourney V7 em cenas de vídeo?",
                answer: "Depois de escolher a melhor imagem gerada pelo Midjourney V7 no canvas, você pode conectá-la diretamente como o primeiro quadro de um modelo de vídeo. A plataforma oferece modelos de vídeo como Seedance 2.5, Kling 3.0 e Veo 3.1 no mesmo ambiente de trabalho. Os clipes de vídeo gerados podem ser arrastados para a timeline para montar e editar a sua mininovela.",
            },
            {
                question: "Posso usar minha própria chave de API (BYOK) no DramaCanvas?",
                answer: "Sim, você pode conectar sua própria chave de API na plataforma. Nesse caso, o provedor que emitiu a sua chave faz a cobrança diretamente e o DramaCanvas não desconta créditos de geração, aplicando apenas uma taxa de serviço separada pelo uso do workspace. Usuários avançados e assistentes de IA também podem operar o canvas por meio do DramaCanvas MCP.",
            },
            {
                question: "O DramaCanvas é parceiro da Midjourney e posso usar as imagens comercialmente?",
                answer: "O DramaCanvas é uma plataforma independente, não sendo a desenvolvedora do modelo nem parceira oficial da Midjourney. Para o uso comercial das imagens geradas, consulte os termos da Midjourney e os termos da DramaCanvas. A interface da ferramenta está disponível em vários idiomas, incluindo português, espanhol, inglês, japonês, coreano e chinês.",
            },
        ],
    },
};

export default midjourneyV7Overrides;
