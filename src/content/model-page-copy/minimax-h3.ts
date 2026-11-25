import type { ModelPageOverrides } from "./types";

// Written natively per locale for local search intent (not translated). Facts and prices from the live catalog and verified product limits.
export const minimaxH3Overrides: ModelPageOverrides = {
    "en-US": {
        intro: "MiniMax H3 brings the Hailuo AI video generation family directly to your DramaCanvas storyboard. Turn text prompts or a single first-frame image into expressive character close-ups and reaction shots across resolutions up to 1080p. Start testing MiniMax H3 and H3 Max with your {signupCredits} credits, no credit card required.",
        controls:
            "Billed per second of video from {minCredits} credits to {maxCredits} credits depending on version and resolution, with MiniMax H3 supporting up to 1080p and H3 Max supporting up to 768p. Choose your clip length and resolution directly on the card to see the exact credits before generating.",
        sceneText:
            "MiniMax H3 excels at character close-ups, subtle facial expressions, and small emotional reaction shots that drive drama dialogue forward. You can animate an approved character still as the first frame to preserve facial features between cuts. Place multiple generation cards side by side on your canvas to compare variations before sending clips to the timeline.",
        steps: [
            "Open your canvas and click to add a generation card, or paste a script to split it into storyboard cards.",
            "Open the model selector on the card, pick MiniMax H3 or MiniMax H3 Max, and choose your resolution and clip length.",
            "Type your shot prompt in your own language, or attach a single image to use as the first frame.",
            "Check the exact credits on the card, click generate, and compare the resulting video clips side by side on the canvas.",
        ],
        faq: [
            {
                question: "Does MiniMax H3 (Hailuo AI) support multi-image to video?",
                answer: "MiniMax H3 and H3 Max each accept only 1 image as a start frame, with no multi-image, reference video or reference audio input.",
            },
            {
                question: "What is MiniMax H3 and Hailuo AI?",
                answer: "MiniMax H3 is a video generation model developed by MiniMax, belonging to the Hailuo AI family. On DramaCanvas, you can use MiniMax H3 and MiniMax H3 Max alongside image models and other video models on a single production board. It takes text prompts or a single first-frame image to generate character-driven video clips for short dramas.",
            },
            {
                question: "Can I use Hailuo AI free on DramaCanvas?",
                answer: "Yes, every new account receives {signupCredits} credits with no credit card required and no expiration date. Because generation is billed per second, this signup grant covers about {freeCount} s of video at the lowest resolution setting. Canvas planning, including writing scripts and arranging storyboard cards, is completely free.",
            },
            {
                question: "How does Hailuo AI pricing work for MiniMax H3?",
                answer: "Generations are billed per second of video, ranging from {minCredits} credits to {maxCredits} credits per second depending on the model version and resolution you select. MiniMax H3 supports 480p, 768p, and 1080p, while H3 Max offers 480p, 720p, and 768p at different rates. The card shows the exact credits before you start, and if a generation fails, those credits are returned to your account balance.",
            },
            {
                question: "Hailuo AI how to use: how do I create clips on DramaCanvas?",
                answer: "Add a generation card to your canvas, select MiniMax H3 or H3 Max, and set your target resolution and clip duration. Type your scene description or attach an approved image as your first frame. Alternatively, you can describe your shot to the Agent chat on the right side of the canvas to generate cards and run clips automatically.",
            },
            {
                question: "What are effective Hailuo AI prompts for short dramas?",
                answer: "Focus your text prompt on clear character actions, emotional shifts, and camera framing, such as close-up reactions or subtle head turns. You can write prompts in your own language without relying on English-only syntax. For stronger continuity, generate a character portrait first using models like Midjourney V7 or GPT Image 2, then supply it as the starting frame with a prompt describing only the movement.",
            },
            {
                question: "Can I connect my own Hailuo AI API key (BYOK)?",
                answer: "Yes, DramaCanvas supports BYOK, allowing you to connect your own API key. When using your key, the API provider that issued your key bills you directly, and DramaCanvas deducts no generation credits, though a separate workspace service fee applies. You can also automate your production workflow using DramaCanvas MCP with external AI assistants.",
            },
            {
                question: "How do I maintain character consistency across shots?",
                answer: "Reusing an approved character reference image as the first frame of your video card helps maintain consistent facial features and clothing across cuts. Both MiniMax H3 versions support one start image per generation, but they do not accept multiple reference images or reference video. Even with reference frames, every shot still requires a human check on the canvas to ensure continuity.",
            },
            {
                question: "Can I use MiniMax H3 video clips commercially?",
                answer: "DramaCanvas does not restrict your ownership of generated video assets, but commercial usage depends on platform and provider guidelines. For commercial use, check MiniMax's terms and DramaCanvas terms. If you need additional credits for commercial projects, credit packs and membership tiers are available on the pricing page.",
            },
        ],
    },
    "zh-CN": {
        intro: "在 DramaCanvas 上使用海螺 AI（MiniMax H3 与 H3 Max）制作短剧视频。支持输入文字提示词生成，或上传单张角色剧照作为首帧让人物动起来。新注册账号即送 {signupCredits} 积分免费试用，在最低画质下约可体验 {freeCount} 秒视频生成。",
        controls: "按视频时长按秒计费，每秒从 {minCredits} 积分至 {maxCredits} 积分不等，分辨率越高单秒消耗越多。卡片在生成前会显示确切所需积分，片长可在卡片上自行选择。",
        sceneText: "海螺 MiniMax H3 特别适合制作短剧中的人物特写、情绪反应镜头以及细腻的微表情动作。你可以在画板上用图片模型生成角色定妆照，将其作为首帧让人物动起来，让表演更生动。画面生成后可直接平铺在画板上并排对比，选出合适的片段拖入时间线剪辑。",
        steps: [
            "打开画板并添加一张生成卡片，在模型选择器中选定 MiniMax H3 或 MiniMax H3 Max。",
            "用常用语言输入画面提示词；若需保持角色连贯，可上传单张图片作为视频首帧。",
            "在卡片上选择视频分辨率与片长，确认卡片上显示的确切积分后，点击生成按钮。",
            "生成结果会平铺在画板上方便横向对比，满意的视频片段可直接拖入下方时间线进行短剧剪辑。",
        ],
        faq: [
            {
                question: "海螺 AI（MiniMax H3）支持多张图片合成视频吗？",
                answer: "MiniMax H3 与 H3 Max 均只支持 1 张图做首帧，不支持多图、参考视频或参考音频。",
            },
            {
                question: "什么是海螺 AI（MiniMax H3）？",
                answer: "海螺 AI 是 MiniMax 推出的视频生成模型家族，在 DramaCanvas 上提供 MiniMax H3 与 MiniMax H3 Max 两个版本。它支持纯文字生成视频，或使用单张图片作为视频首帧生成动态镜头，非常适合短剧中的人物特写与微表情演出。DramaCanvas 是独立创作平台，你可以直接在画板上调用它并配合分镜进行制作。",
            },
            {
                question: "海螺 AI 免费吗？新用户如何免费试用 MiniMax H3？",
                answer: "每个新注册账号都会获得一次性的 {signupCredits} 积分，无需绑定信用卡，积分长期有效。赠送的积分在最低画质档位下约可试用生成 {freeCount} 秒视频，更高版本或高分辨率则需要消耗更多积分。画板上的剧本编写与分镜排布完全免费，如需更多视频生成积分可在价格页购买会员或积分包。",
            },
            {
                question: "海螺 AI 价格是多少？MiniMax H3 在平台怎么收费？",
                answer: "MiniMax H3 采用按视频秒数计费，每秒最低从 {minCredits} 积分起，最高档位为 {maxCredits} 积分。MiniMax H3 提供 480p、768p 和 1080p 分辨率，H3 Max 提供 480p、720p 和 768p 分辨率，分辨率与版本不同每秒费用也不同。生成卡片会在你点击生成前显示确切扣除的积分，若生成失败则会自动全额返还积分。",
            },
            {
                question: "海螺 AI 教程：在 DramaCanvas 上怎么用它制作短剧？",
                answer: "你可以在画板上粘贴剧本并拆解为分镜卡片，或直接让右侧的 Agent 对话助手帮你创建生成卡片。先用画板上的生图模型生成角色定妆照，再将图片作为首帧填入 MiniMax H3 生成卡片让人物动起来。生成的视频片段会并排保存在画板上，挑选满意的镜头直接拖入时间线即可剪辑成短剧。",
            },
            {
                question: "海螺 AI 提示词怎么写？支持中文吗？",
                answer: "你可以直接使用母语或中文撰写提示词，平台界面也完全支持简体中文。写提示词时建议聚焦于单个人物的主体动作、镜头景别（如面部特写或情绪反应）以及微小的表情变化。若配合首帧图片使用，只需描述画面人物接下来发生的动态，避免输入过于复杂的长篇背景叙述。",
            },
            {
                question: "海螺 AI 支持上传多张参考图、参考视频或音频吗？",
                answer: "目前 MiniMax H3 与 H3 Max 均仅支持纯文字生成，或上传单张图片作为视频首帧，不支持同时上传多张参考图、参考视频或音频文件。如需保持短剧人物形象稳定，可以在同个画板上复用已确认的角色剧照作为首帧输入。虽然复用首帧图有助于维持人物特征，但每个镜头的成片效果仍需人工审核确认。",
            },
            {
                question: "可以使用自己的 API Key（BYOK）吗？费用怎么结算？",
                answer: "支持连接你自己的 API Key（BYOK，即自带密钥模式）。在此模式下，由为你签发 Key 的 API 提供方直接扣费，DramaCanvas 不扣除任何视频生成积分，仅按规定收取独立的画板工作区服务费。你可以在设置中配置自己的 Key，直接在画板和工作流中调用该模型。",
            },
            {
                question: "使用海螺 MiniMax H3 生成的短剧视频可以商用吗？",
                answer: "关于生成视频的商业使用权限，请查阅 MiniMax 的用户条款与 DramaCanvas 的服务条款。不同使用场景与版权归属以各方最新协议为准，建议在发布商业短剧前仔细核对相关规定。DramaCanvas 作为独立工具平台，为你提供完整的画板创作与导出工作流。",
            },
        ],
    },
    "zh-TW": {
        intro: "在 DramaCanvas 畫布上即可使用海螺 MiniMax H3（Hailuo AI）與 H3 Max 模型，將劇本分鏡或單張角色圖轉為短劇動態鏡頭。新註冊即贈 {signupCredits} 點數，在最低設定下約可生成 {freeCount} 秒影片。生成後可直接在畫布並排對比，並將滿意片段加入時間軸剪輯。",
        controls: "MiniMax H3 提供 480p、768p 與 1080p，H3 Max 提供 480p、720p 與 768p；費用按影片秒數計算，最低規格每秒為 {minCredits} 點數，最高階版本每秒為 {maxCredits} 點數。解析度越高每秒扣除點數越多，生成卡片會在生成前顯示確切點數。",
        sceneText: "海螺 MiniMax H3 特別適合用於短劇中的人物特寫與反應鏡頭，呈現細微且富有情緒的動作表現。常見用法是將設計好的角色定格圖作為首格圖片輸入，將靜態人物轉為動態畫面。片段生成後可直接在畫布上並排對比，挑選適合的畫面加入時間軸完成短劇剪輯。",
        steps: [
            "在畫布上點擊新增生成卡片，或使用右側 Agent 對話框輸入指令建立卡片，也可先貼上劇本拆分為分鏡卡片。",
            "在卡片的模型選擇器中選取 MiniMax H3 或 H3 Max，並設定解析度與影片長度。",
            "在提示詞欄位以中文輸入動作描述，若需固定角色外觀，可上傳一張圖片作為首格圖片。",
            "確認卡片顯示的設定與確切點數後點擊生成，完成的影片會在畫布並排呈現，可直接拖入時間軸剪輯。",
        ],
        faq: [
            {
                question: "海螺 AI（MiniMax H3）支援多張圖片生成影片嗎？",
                answer: "MiniMax H3 與 H3 Max 均只支援 1 張圖做首影格，不支援多圖、參考影片或參考音訊。",
            },
            {
                question: "什麼是 Hailuo AI？與海螺 MiniMax H3 有何關係？",
                answer: "Hailuo AI（海螺 AI）是 MiniMax 推出的影片生成模型系列，在 DramaCanvas 畫布上提供的正是其最新版本 MiniMax H3 與 H3 Max。創作者可以直接在單一畫布上完成劇本分鏡、首格圖像到短劇影片的生成，無需切換不同工具。DramaCanvas 是獨立運作的創作平台，並非 MiniMax 官方或合作夥伴。",
            },
            {
                question: "DramaCanvas 有提供 Hailuo AI 免費試用嗎？",
                answer: "每個新註冊帳號皆可獲得一次性的 {signupCredits} 點數，無須綁定信用卡且無使用期限。這筆新手點數僅供簡短測試，在最低畫質設定下大約可生成 {freeCount} 秒影片。在畫布上編寫劇本、排版分鏡卡片皆為免費，實際生成影片時才會扣除點數。",
            },
            {
                question: "在 DramaCanvas 上使用 Hailuo AI 費用如何計算？",
                answer: "費用依照影片秒數與選擇的規格計費，每秒從最低階的 {minCredits} 點數到最高階的 {maxCredits} 點數不等。MiniMax H3 提供 480p、768p 與 1080p，H3 Max 則提供 480p、720p 與 768p，解析度越高每秒扣除點數越多。生成卡片在按下生成前會明確顯示確切點數，若生成失敗系統會自動退還點數。",
            },
            {
                question: "DramaCanvas 上的 Hailuo AI 教學操作步驟有哪些？",
                answer: "基本流程為註冊登入後開啟畫布，新增生成卡片並在模型選擇器中切換為 MiniMax H3 或 H3 Max。接著輸入動作提示詞，或上傳一張角色圖片作為首格起始畫面，並選定解析度。按下生成後，影片會直接呈現在畫布上供你對比效果，最後可將滿意片段加入時間軸剪輯成短劇。也可以透過畫布右側的 Agent 對話框，以日常語言請 AI 協助建立卡片並執行生成。",
            },
            {
                question: "生成短劇時，Hailuo AI 提示詞該如何撰寫？",
                answer: "提示詞可直接使用中文撰寫，建議聚焦在單一鏡頭內的具體動作、肢體動態、視線方向與運鏡方式。若搭配了首格圖片，提示詞應著重描述圖片中人物「接下來要做什麼」，避免重複描述圖中已有的人物服裝或外貌細節。MiniMax H3 擅長捕捉人物微表情與動作，過於複雜的多重指令反而容易分散生成焦點。",
            },
            {
                question: "製作短劇時，如何維持人物角色的外觀一致性？",
                answer: "建議在同一個短劇專案中重複使用同一張已確認的角色圖片，作為 MiniMax H3 生成卡片的首格圖片。目前 MiniMax H3 與 H3 Max 僅支援單張起始圖片，不支援多張參考圖、參考影片或音訊。雖然固定首格圖片有助於保持外觀連貫，但短劇的每個鏡頭生成後仍需要創作者人工檢查確認。",
            },
            {
                question: "可以使用自己的 API 金鑰（BYOK）嗎？生成的影片可以商業使用嗎？",
                answer: "可以，DramaCanvas 支援自行串接 API 金鑰（BYOK）。使用自己的金鑰時，由核發該金鑰的 API 提供者直接向你計費，DramaCanvas 不扣除生成點數，僅收取個別的工作區服務費。關於商業使用權限，請詳細查閱 MiniMax 的服務條款與 DramaCanvas 的服務條款規範。",
            },
        ],
    },
    "zh-HK": {
        intro: "MiniMax H3（即海螺 Hailuo AI 系列影片模型）現已登陸 DramaCanvas。創作者可在同一個畫布上輸入提示詞生成影片，或以單張角色圖作為首格畫面製作動態鏡頭。新用戶註冊即可獲贈 {signupCredits} 點數，直接在畫布上測試微表情與角色動作。",
        controls:
            "MiniMax H3 提供 480p、768p 與 1080p 解析度，H3 Max 則提供 480p、720p 與 768p；模型按生成秒數收費，最低解析度每秒由 {minCredits} 點數至最高級別版本的每秒 {maxCredits} 點數。卡片在點擊生成前會直接顯示該設定所需扣除的確切點數，解析度愈高每秒點數愈多。",
        sceneText: "在 AI 短劇創作中，MiniMax H3 非常適合用於人物特寫與細膩的反應鏡頭，呈現角色的微妙表情與微小動作。你也可以將設計好的角色靜態圖作為首格畫面，讓靜態人物自然動起來。生成滿意的鏡頭可直接加入時間軸，與其他畫面一起剪輯成完整短劇。",
        steps: [
            "登入 DramaCanvas 並開啟畫布，點擊新增生成卡片，或使用右側 Agent 對話框建立。接著在模型選單中挑選 MiniMax H3 或 MiniMax H3 Max。",
            "以常用語言輸入畫面提示詞；若需固定角色，可上傳一張圖片作為首格畫面，並在卡片上設定片段長度與解析度。",
            "卡片在生成前會清楚顯示所需扣除的確切點數，確認設定無誤後點擊生成按鈕。",
            "生成結果會並排顯示於畫布上以便比對挑選，將滿意的鏡頭片段拖入時間軸即可接續剪輯短劇。",
        ],
        faq: [
            {
                question: "海螺 AI（MiniMax H3）支援多張圖片生成影片嗎？",
                answer: "MiniMax H3 與 H3 Max 均只支援 1 張圖做首幀，不支援多圖、參考影片或參考音訊。",
            },
            {
                question: "甚麼是 Hailuo AI（海螺 MiniMax H3）？",
                answer: "MiniMax H3 是 MiniMax 推出的 AI 影片生成模型，在創作者社群中常被稱為海螺或 Hailuo AI。DramaCanvas 現已將 MiniMax H3 及 MiniMax H3 Max 接入畫布環境，支援文字生成影片或以單張圖片作為首格畫面生成動態片段。DramaCanvas 為獨立創作平台，並非模型開發商亦非官方合作夥伴。",
            },
            {
                question: "Hailuo AI 在 DramaCanvas 上可以免費試用嗎？",
                answer: "可以，每位新用戶註冊即可獲得一次性的 {signupCredits} 點數，無需綁定信用卡，點數亦沒有有效期限。這筆新手點數足夠你在最低設定下完成一次極短的測試，約可生成 {freeCount} 秒影片。如果切換至較高解析度或進階版本，每秒消耗的點數則會相應提高。",
            },
            {
                question: "Hailuo AI 的收費標準是怎樣計算的？",
                answer: "在 DramaCanvas 畫布上撰寫劇本與編排分鏡卡片完全免費，只有點擊生成影片時才會扣除點數。MiniMax H3 採取按秒計費制，最低規格每秒需 {minCredits} 點數，而進階版本最低規格為每秒 {maxCredits} 點數，解析度愈高每秒費用愈多。生成卡片在操作前會明確列出所需扣除的確切點數，若生成失敗系統會自動全數退還點數。如需補充額度，可隨時在定價頁面購買會員計劃或點數包。",
            },
            {
                question: "新手如何參考 Hailuo AI 教學在畫布上製作短劇？",
                answer: "上手流程非常直接：登入畫布後，你可以先貼上劇本並拆分為分鏡卡片，或直接新增生成卡片。在模型選單中選擇 MiniMax H3 或 H3 Max，輸入畫面提示詞，亦可使用右側 Agent 對話框或透過 DramaCanvas MCP 讓 AI 助手協助建立與生成。生成出來的片段會並排顯示於畫布供你比對，滿意的鏡頭可直接加入時間軸完成短劇剪輯。",
            },
            {
                question: "如何為 MiniMax H3 撰寫提示詞？支援上傳參考影片或多張圖片嗎？",
                answer: "提示詞可以使用繁體中文或自己的慣用語言撰寫，建議具體描述角色的微表情、視角轉換與肢體動作。MiniMax H3 與 H3 Max 目前僅支援文字生成影片，或以上傳的單張圖片作為首格畫面，不支援多張參考圖、參考影片或音訊。你可以在生成卡片上自行選擇片段長度，設定完成後即可開始生成。",
            },
            {
                question: "在連續短劇分鏡中，如何利用 MiniMax H3 保持角色外觀一致？",
                answer: "建議在同一個畫布上重複使用同一張已確認的角色圖片，將其設為各鏡頭的首格畫面來生成動態片段。這種方式有助於穩定人物外貌特徵，但每個鏡頭生成後仍需要創作者親自檢視與把關。你也可以在同畫布利用 Nano Banana、GPT Image 2 或 Midjourney V7 先行生成理想的角色靜態圖，再導入模型中作為起始幀。",
            },
            {
                question: "我可以在 DramaCanvas 上連接自己的 API key（BYOK）嗎？",
                answer: "可以，DramaCanvas 支援自備金鑰（BYOK，即連接你自己的 API key）。在此模式下，發行該金鑰的 API 供應商會直接向你收取費用，DramaCanvas 不會扣除生成點數，僅收取獨立的工作區服務費。這讓已經擁有 API 額度的創作者可以直接使用畫布進行短劇排版與時間軸剪輯。",
            },
        ],
    },
    "ja-JP": {
        intro: "MiniMax H3（Hailuo AI）は、台本から動画まで1枚のキャンバスで制作できる動画生成AIです。画像1枚からキャラの表情やリアクション動画を生成できます。新規登録の{signupCredits}クレジットで、最安設定なら約{freeCount}秒試せます。",
        controls: "動画1秒あたりの課金制で、解像度やバージョンに応じて{minCredits}クレジットから{maxCredits}クレジットを消費します。生成前にカード上で必要なクレジットが表示され、生成に失敗した場合はクレジットが返還されます。",
        sceneText:
            "ショートドラマ制作では、登場人物のアップや細やかな表情変化、リアクションシーンの生成に適しています。画像生成モデルで作ったキャラクター画像を最初の1コマとして指定することで、人物の見た目を保ちながら演技をつけられます。ただしカットごとのブレを完全に防げるわけではないため、生成後は人間の目によるチェックが必要です。",
        steps: [
            "キャンバスを開いて生成カードを追加します。台本を貼り付けて絵コンテカードに分割するか、右側のエージェントチャットから作成することもできます。",
            "モデル選択で「MiniMax H3」または「MiniMax H3 Max」を選びます。プロンプト欄に日本語で動きを入力し、開始画像を使う場合は1枚添付して解像度を指定します。",
            "カード上に表示される設定内容と必要なクレジットを確認します。問題がなければ生成ボタンをクリックして動画生成を開始します。",
            "生成された動画がキャンバス上に並んで表示されるので、仕上がりをプレビューして比較します。採用したクリップはタイムラインへ送り、ショートドラマとして編集します。",
        ],
        faq: [
            {
                question: "MiniMax H3（Hailuo AI / 海螺AI）は複数画像からの動画生成に対応していますか？",
                answer: "MiniMax H3とH3 Maxは、どちらも開始画像1枚のみ対応。複数画像・参考動画・参考音声には対応していません。",
            },
            {
                question: "MiniMax H3（Hailuo AI）とはどのような動画生成AIですか？日本語で使えますか？",
                answer: "MiniMax H3は、MiniMax社が開発する動画生成モデル（海螺 / Hailuoシリーズ）です。DramaCanvas上では日本語を含む多言語に対応しており、日本語のプロンプトを入力して動画を生成できます。テキストからの生成に加えて、手持ちの画像1枚を開始フレームにした動画化にも対応しています。",
            },
            {
                question: "Hailuo AI（MiniMax H3）を無料で試すことはできますか？",
                answer: "新規登録時に{signupCredits}クレジットが付与され、クレジットカードの登録不要・有効期限なしで利用できます。この登録クレジットを使えば、最安設定で約{freeCount}秒のテスト生成が可能です。なお、キャンバス上での台本作成や絵コンテの整理はクレジットを消費せず無料で行えます。",
            },
            {
                question: "MiniMax H3の生成料金やクレジットの仕組みはどうなっていますか？",
                answer: "DramaCanvasでの生成は動画1秒ごとに課金され、最安設定の1秒あたり{minCredits}クレジットから上位設定の1秒あたり{maxCredits}クレジットまで解像度やバージョンに応じて変わります。必要なクレジットは生成前にカード上で表示され、生成に失敗した場合はクレジットが返還されます。追加のクレジットパックや月額プランは料金ページで確認できます。",
            },
            {
                question: "DramaCanvasでのMiniMax H3の基本的な使い方はどうすればよいですか？",
                answer: "キャンバス上で生成カードを追加し、モデル選択からMiniMax H3を指定してプロンプトや開始画像を設定します。カード上に表示された消費クレジットを確認して生成を実行すると、結果がキャンバス上に並んで表示されます。採用したクリップはそのままタイムラインに並べてショートドラマとして編集できます。",
            },
            {
                question: "MiniMax H3でショートドラマ用のプロンプトや登場人物を設定するコツはありますか？",
                answer: "プロンプトには登場人物の表情や小さなリアクションなど、具体的な演技や動きを日本語で指定するのが効果的です。また、画像生成モデルで作った人物画像を開始フレーム（1枚のみ対応）として設定すると、キャラクターの見た目を保ちやすくなります。ただし完全な同一性を保証するものではないため、カットごとに人間の目で仕上がりを確認してください。",
            },
            {
                question: "MiniMax H3で音声やBGMの生成、または参照音声の入力はできますか？",
                answer: "MiniMax H3は映像生成専用モデルであり、音声生成機能や参照音声・参照動画の入力機能には対応していません。入力できるのはテキストプロンプトと、開始フレームとなる画像1枚のみです。ドラマのセリフやBGMなどの音響は、生成後のクリップをタイムラインに配置して編集します。",
            },
            {
                question: "MiniMax H3はMacやComfyUIなどローカル環境で動かす必要がありますか？",
                answer: "DramaCanvasはブラウザ上で動作するオンラインキャンバスのため、ローカル環境へのインストールやComfyUIなどの環境構築は一切不要です。MacやWindowsなどの端末を問わず、ブラウザからログインするだけでクラウド上でMiniMax H3を利用できます。また、DramaCanvas MCPを利用して外部のAIアシスタントからキャンバスを操作することも可能です。",
            },
            {
                question: "自分のAPIキー（BYOK）を使ってMiniMax H3を利用できますか？",
                answer: "はい、自身が取得したAPIキーを接続して利用するBYOKに対応しています。この場合、生成費用はAPIキーを発行したAPIプロバイダーから直接請求され、DramaCanvas側の生成クレジットは消費されません（別途ワークスペースのサービス料がかかります）。",
            },
        ],
    },
    "ko-KR": {
        intro: "드라마캔버스에서 하이루오 MiniMax H3(Hailuo AI)로 숏드라마 인물의 표정과 클로즈업 샷을 영상화해 보세요. 첫 프레임 이미지로 움직임을 만들 수 있으며, {signupCredits} 크레딧으로 최저 설정 기준 약 {freeCount}초간 테스트할 수 있습니다.",
        controls:
            "MiniMax H3(480p·768p·1080p)와 H3 Max(480p·720p·768p)는 초당 과금되며, 최저 해상도 기준 1초당 {minCredits} 크레딧부터 {maxCredits} 크레딧까지 버전에 따라 다르게 책정됩니다. 해상도가 높을수록 초당 비용이 증가하며, 생성하기 전에 필요한 크레딧이 카드에 정확히 표시됩니다.",
        sceneText:
            "숏드라마 연출에서 하이루오 MiniMax H3는 등장인물의 클로즈업과 리액션 샷, 섬세한 표정 연기를 담아내는 데 적합합니다. 미리 준비한 인물 스틸컷 이미지를 첫 프레임으로 넣어 미세한 고개의 움직임이나 시선 변화를 영상으로 구현하기 좋습니다. 감정선이 중요한 대화 장면이나 인물의 심리를 강조하는 컷을 제작할 때 활용하기 유용합니다.",
        steps: [
            "로그인 후 캔버스를 열고, 대본을 붙여넣어 스토리보드 카드로 분할합니다.",
            "캔버스에서 생성 카드를 추가하고, 모델 선택기에서 MiniMax H3 또는 MiniMax H3 Max 버전을 선택합니다.",
            "프롬프트 입력창에 장면 설명을 한국어로 입력하고 첫 프레임으로 쓸 인물 이미지를 1장 첨부한 뒤, 카드에서 해상도와 길이를 설정합니다.",
            "카드에 표시된 소모 크레딧을 확인하고 생성 버튼을 누르면 영상 결과물이 캔버스에 나란히 나타나며, 마음에 드는 클립을 타임라인으로 보내 편집합니다.",
        ],
        faq: [
            {
                question: "MiniMax H3(하이루오 AI)는 여러 장의 이미지를 모아 영상으로 만들 수 있나요?",
                answer: "MiniMax H3와 H3 Max는 모두 시작 프레임 이미지 1장만 지원하며, 여러 이미지·참조 영상·참조 음성은 지원하지 않아요.",
            },
            {
                question: "하이루오 MiniMax H3(Hailuo AI)는 어떤 모델인가요?",
                answer: "MiniMax H3는 MiniMax가 개발한 하이루오(Hailuo / 海螺) 계열의 비디오 생성 모델입니다. 텍스트 프롬프트를 입력하거나 첫 프레임 이미지 1장을 시작 이미지로 지정하여 고품질의 움직이는 영상을 생성합니다. 드라마캔버스에서는 스크립트 작성부터 스토리보드 기획, 인물 컷 영상 생성까지 하나의 캔버스에서 다른 비디오 및 이미지 모델과 함께 작업할 수 있습니다.",
            },
            {
                question: "하이루오 AI(Hailuo AI)를 무료로 사용해 볼 수 있나요?",
                answer: "드라마캔버스에 신규 가입하면 카드 등록 없이 유효기간 없는 {signupCredits} 크레딧이 1회 지급됩니다. 이 가입 크레딧은 가장 낮은 설정 기준으로 약 {freeCount}초 분량의 영상을 시험 생성해 볼 수 있는 수준입니다. 캔버스에서 대본을 작성하고 스토리보드 카드를 정리하는 기획 작업은 크레딧 차감 없이 무료로 제공됩니다.",
            },
            {
                question: "MiniMax H3 영상 생성 비용과 가격 책정 방식은 어떻게 되나요?",
                answer: "MiniMax H3는 영상 길이 1초당 크레딧이 부과되며, 최저 해상도 기준 1초당 {minCredits} 크레딧부터 {maxCredits} 크레딧까지 버전에 따라 다르게 적용됩니다. 해상도가 높아질수록 초당 필요한 크레딧이 증가하며, 생성하기 전에 카드 설정창에서 소모 크레딧을 정확하게 확인할 수 있습니다. 생성이 실패하는 경우에는 사용된 크레딧이 계정으로 다시 반환됩니다.",
            },
            {
                question: "하이루오 AI(Hailuo AI) 영상 생성을 위한 사용법과 프롬프트 작성 팁은 무엇인가요?",
                answer: "드라마캔버스에서는 한국어를 포함해 사용자가 원하는 언어로 프롬프트를 작성할 수 있습니다. MiniMax H3는 텍스트 프롬프트만 입력하거나 첫 프레임으로 쓸 시작 이미지 1장을 첨부해 영상을 생성하는 방식만 지원합니다. 여러 장의 참조 이미지나 참조 영상, 오디오 입력은 지원하지 않으므로, 인물의 표정 변화나 작은 몸짓 묘사에 집중해 프롬프트를 작성하는 것이 좋습니다.",
            },
            {
                question: "숏드라마 제작 시 인물 일관성을 유지할 수 있나요?",
                answer: "확정된 인물 스틸컷 이미지를 생성 카드의 첫 프레임 이미지로 재사용하면 외형 일관성을 유지하는 데 도움이 됩니다. 다만 모든 샷은 제작자가 직접 눈으로 검토하고 확인해야 합니다. 캔버스에 생성된 여러 결과물을 나란히 비교해 보면서 가장 자연스러운 컷을 선별해 타임라인으로 가져가는 작업 방식을 권장합니다.",
            },
            {
                question: "자체 MiniMax API 키(BYOK)를 연결해 사용할 수도 있나요?",
                answer: "네, 사용자가 발급받은 자체 API 키(BYOK)를 드라마캔버스에 연결할 수 있습니다. 이 방식을 이용하면 API 키를 발급한 API 제공업체에서 직접 요금을 청구하며 드라마캔버스 생성 크레딧은 차감되지 않습니다. 다만 자체 API 키 연결 시 별도의 워크스페이스 서비스 이용료가 적용됩니다.",
            },
            {
                question: "MiniMax H3로 만든 영상을 상업적으로 이용할 수 있나요?",
                answer: "상업적 이용 가능 여부에 대해서는 MiniMax 이용약관과 드라마캔버스 이용약관을 함께 확인해야 합니다. 드라마캔버스는 독립적인 플랫폼이며 MiniMax의 공식 파트너나 모델 개발사가 아닙니다. 상업용 숏드라마를 제작 및 배포하기 전에 양사의 관련 정책을 직접 확인하시기 바랍니다.",
            },
        ],
    },
    "es-ES": {
        intro: "MiniMax H3, de la familia Hailuo AI, genera tomas de video para cortos desde texto o con una imagen fija como primer fotograma. En DramaCanvas puedes probar MiniMax H3 y H3 Max directamente sobre el lienzo, junto a tu guion gráfico. Empieza con {signupCredits} créditos de bienvenida sin tarjeta para probar la configuración básica.",
        controls:
            "El consumo va desde {minCredits} créditos hasta {maxCredits} créditos por segundo en la resolución mínima, según elijas MiniMax H3 o H3 Max. Las resoluciones mayores aumentan el costo por segundo, y la tarjeta muestra los créditos exactos antes de generar.",
        sceneText:
            "Este modelo destaca en planos cortos y tomas de reacción de personajes, así como en movimientos sutiles dentro de una escena. También resulta práctico para animar una imagen fija como primer fotograma y dar vida a un personaje en el lienzo. Aunque reutilizar una imagen de referencia aprobada ayuda a conservar el estilo, cada toma requiere revisión humana.",
        steps: [
            "Abre el lienzo y añade una tarjeta de generación, o solicítala desde el chat con el agente a la derecha.",
            "En el selector de modelos, elige MiniMax H3 o H3 Max y define la resolución junto con la duración del clip.",
            "Escribe tu prompt en tu idioma o añade una imagen de inicio como primer fotograma, viendo los créditos exactos en la tarjeta.",
            "Pulsa generar para comparar los resultados lado a lado en el lienzo, guarda los mejores y llévalos a la línea de tiempo.",
        ],
        faq: [
            {
                question: "¿Admite MiniMax H3 (Hailuo AI) generar vídeo a partir de varias imágenes?",
                answer: "MiniMax H3 y H3 Max solo aceptan 1 imagen como fotograma inicial; no admiten varias imágenes ni vídeo o audio de referencia.",
            },
            {
                question: "¿Qué es MiniMax H3 en Hailuo AI y cómo funciona en DramaCanvas?",
                answer: "MiniMax H3 es el modelo de generación de video de MiniMax, perteneciente a la familia Hailuo AI. En DramaCanvas puedes trabajar con MiniMax H3 y H3 Max dentro de un mismo lienzo para convertir guiones e imágenes en video. DramaCanvas es una plataforma independiente y no es el desarrollador del modelo ni un socio oficial de MiniMax.",
            },
            {
                question: "¿Se puede probar Hailuo AI gratis en DramaCanvas?",
                answer: "Cada cuenta nueva recibe {signupCredits} créditos de bienvenida que no caducan y no piden tarjeta bancaria. Con ellos puedes generar una prueba corta de unos {freeCount} segundos en la resolución mínima de 480p. Si deseas producir más tomas o usar resoluciones mayores, puedes adquirir paquetes de créditos o membresías en la página de precios.",
            },
            {
                question: "¿Cuál es el precio de generar video con Hailuo AI y MiniMax H3?",
                answer: "El costo se calcula por cada segundo de video y depende de la versión y la resolución que elijas. La opción base va de {minCredits} créditos a {maxCredits} créditos por segundo en resolución baja, aumentando en 720p, 768p y 1080p. Antes de iniciar la generación, la tarjeta muestra los créditos exactos que consumirá la toma.",
            },
            {
                question: "¿Cómo usar Hailuo AI y MiniMax H3 para crear un corto?",
                answer: "Puedes comenzar dividiendo tu guion en tarjetas dentro del lienzo o pidiéndole al chat con el agente que organice tu escena. Después, añade una tarjeta de generación, selecciona MiniMax H3 o H3 Max y redacta tu prompt en tu idioma o sube una imagen de inicio. Los resultados aparecen lado a lado en el lienzo para que elijas las tomas finales y las coloques en la línea de tiempo.",
            },
            {
                question: "¿Cómo redactar prompts para Hailuo AI y MiniMax H3?",
                answer: "Escribe directamente en tu idioma describiendo la acción del sujeto, la cámara y el entorno con palabras concretas. Si necesitas mantener los rasgos de un personaje, sube una imagen aprobada como primer fotograma para guiar el inicio del video. Ten presente que MiniMax H3 solo admite una imagen inicial y no procesa múltiples imágenes de referencia, video de referencia ni pistas de audio.",
            },
            {
                question: "¿Puedo usar mi propia clave de API (BYOK) con MiniMax H3 en DramaCanvas?",
                answer: "Sí, puedes conectar tu propia clave de API (BYOK) para generar video en el lienzo. En esta modalidad, el proveedor que emitió tu clave de API te factura directamente el uso del modelo y DramaCanvas no descuenta créditos de generación. Solo se aplica una tarifa de servicio independiente por el uso del espacio de trabajo.",
            },
            {
                question: "¿Qué ocurre si una generación falla o si solo quiero planificar mi guion?",
                answer: "Toda la etapa de planificación, como redactar el guion y acomodar tarjetas en el lienzo, es totalmente gratuita. Los créditos únicamente se consumen al ejecutar generaciones de video o imagen. Si una generación falla por cualquier motivo técnico, el sistema reintegra los créditos de inmediato a tu saldo.",
            },
            {
                question: "¿Se pueden utilizar comercialmente los videos creados con MiniMax H3?",
                answer: "Para proyectos comerciales debes consultar los términos de MiniMax y los términos de DramaCanvas antes de publicar tus producciones. También ten en cuenta que, si bien usar una imagen de referencia aprobada facilita la continuidad de los personajes, cada toma debe ser verificada manualmente. En el mismo lienzo puedes combinar estas tomas con modelos de imagen como Midjourney V7 o Nano Banana y otros modelos de video como Kling 3.0 o Veo 3.1.",
            },
        ],
    },
    "pt-BR": {
        intro: "O MiniMax H3, da família Hailuo AI, gera cenas de vídeo para minisséries a partir de texto ou de uma imagem inicial. No DramaCanvas, você testa o modelo com os {signupCredits} créditos de cadastro, cobrindo {freeCount} segundos na resolução mais baixa. Basta abrir a tela de criação, escrever sua cena em português e gerar.",
        controls:
            "A cobrança é feita por segundo de vídeo, variando de {minCredits} créditos na opção básica até {maxCredits} créditos no nível mais alto, conforme a versão e a resolução selecionadas. O card de geração sempre exibe os créditos exatos antes de você confirmar a execução.",
        sceneText:
            "Nas produções de minisséries e dramas curtos, o MiniMax H3 se destaca em planos fechados, tomadas de reação e movimentos expressivos sutis dos personagens. Usar uma imagem aprovada como primeiro quadro ajuda a manter o estilo visual ao longo das tomadas, embora cada cena ainda precise de validação humana. Os clipes gerados podem ser enviados para a linha do tempo ou comparados lado a lado na tela com outros modelos de vídeo.",
        steps: [
            "Entre no DramaCanvas e abra a tela do seu projeto. Você pode colar seu roteiro para estruturar os cards de storyboard ou adicionar diretamente um novo card de geração.",
            "No seletor de modelos do card, escolha MiniMax H3 ou MiniMax H3 Max e selecione a resolução e a duração do clipe. Se quiser animar uma foto de personagem, carregue um único arquivo para servir como primeiro quadro.",
            "Escreva a descrição da ação em português no campo de texto do card. Antes de clicar no botão de gerar, o próprio card apresenta todas as configurações e a quantidade de créditos exatos que serão consumidos.",
            "Acompanhe o clipe gerado aparecer na tela ao lado de outras versões para comparar o resultado visual. Selecione as melhores tomadas e envie os vídeos aprovados diretamente para a linha do tempo do seu drama.",
        ],
        faq: [
            {
                question: "O MiniMax H3 (Hailuo AI) permite gerar vídeo a partir de várias imagens?",
                answer: "MiniMax H3 e H3 Max aceitam apenas 1 imagem como quadro inicial; não aceitam várias imagens nem vídeo ou áudio de referência.",
            },
            {
                question: "O que é o MiniMax H3 e qual a sua relação com o Hailuo AI?",
                answer: "O MiniMax H3 é o modelo de geração de vídeo desenvolvido pela MiniMax, parte da família popularmente conhecida como Hailuo AI. No DramaCanvas, ele está disponível nas versões MiniMax H3 e MiniMax H3 Max para produzir tomadas de vídeo a partir de comandos de texto ou de uma imagem inicial. A ferramenta funciona de forma direta na tela de criação, permitindo planejar o roteiro e criar as cenas no mesmo ambiente.",
            },
            {
                question: "É possível testar o Hailuo AI grátis no DramaCanvas?",
                answer: "Sim, novos usuários recebem {signupCredits} créditos de cadastro sem precisar inserir dados de cartão de crédito. Esse saldo permite testar {freeCount} segundos de vídeo na configuração mais econômica do modelo. Para continuar gerando após o teste inicial, você pode escolher pacotes de créditos avulsos ou planos de assinatura disponíveis na página de preços.",
            },
            {
                question: "Qual é o preço do MiniMax H3 e como funciona a cobrança?",
                answer: "O consumo é calculado por segundo de vídeo, iniciando em {minCredits} créditos por segundo na resolução básica e chegando a {maxCredits} créditos por segundo na qualidade mais alta. As opções de resolução são 480p, 768p e 1080p no MiniMax H3, e 480p, 720p e 768p no H3 Max. O card exibe os créditos exatos necessários antes de você iniciar a geração, e qualquer tentativa com falha tem seus créditos estornados automaticamente.",
            },
            {
                question: "Como usar o Hailuo AI no DramaCanvas para criar uma cena de drama curto?",
                answer: "Abra a tela do projeto e adicione um card de geração ou organize seu roteiro em cards de storyboard. Depois, selecione o MiniMax H3 no seletor de modelos, configure a resolução desejada e digite a ação que deve acontecer. Ao concluir a geração, você pode manter as tomadas que deram certo e transferir os clipes para a linha do tempo de montagem.",
            },
            {
                question: "Como criar bons prompts para o MiniMax H3?",
                answer: "Escreva comandos objetivos em português detalhando a iluminação, o enquadramento de câmera e o movimento sutil da personagem. Se você carregar uma imagem estática como primeiro quadro, foque o texto apenas na ação imediata que o modelo deve executar a partir daquela pose. Vale notar que o modelo aceita somente uma imagem inicial, sem suporte a múltiplos arquivos de referência ou áudio.",
            },
            {
                question: "Posso usar minha própria chave de API (BYOK) no DramaCanvas?",
                answer: "Sim, você pode conectar sua própria chave de API através do recurso BYOK. Nessa configuração, o provedor da API que emitiu sua chave faz a cobrança direta do uso, e o DramaCanvas não deduz créditos de geração, aplicando apenas uma taxa de serviço do espaço de trabalho. A etapa de planejamento e organização dos cards no canvas continua totalmente gratuita.",
            },
            {
                question: "Como manter a consistência do personagem e posso usar os vídeos comercialmente?",
                answer: "Reutilizar uma imagem de referência aprovada como primeiro quadro do clipe ajuda na consistência do elenco, mas cada tomada ainda requer verificação humana para garantir o padrão visual. Em relação aos direitos de uso comercial das gerações, consulte os termos da MiniMax e os termos do DramaCanvas para verificar as diretrizes aplicáveis ao seu plano.",
            },
        ],
    },
};

export default minimaxH3Overrides;
