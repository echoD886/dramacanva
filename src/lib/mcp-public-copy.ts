import type { BlogLocale } from "../content/blog-locales";

// Shared visible copy for localized MCP JSON-LD and Markdown; no complete UI catalogs.
export const MCP_PUBLIC_COPY = {
    "zh-CN": {
        "mcp.getKey": "获取 API 密钥",
        "mcp.paste": "粘贴到终端",
        "mcp.explore": "查看能做什么 →",
        "mcp.faq1": "DramaCanvas 的 MCP 是什么，能做什么？|它是一个开放接口，让外部 AI 助手能直接操作你的画布。连接后，外部工具可以直接帮你编写剧本分镜、在画布上排布镜头卡片，甚至直接调用模型生成视频。",
        "mcp.faq2": "目前支持连接哪些 AI 工具？|目前支持 Claude Code、Codex、Cursor 等兼容 MCP 协议的开发工具。你可以直接在这些工具里用自然语言下达指令，指挥它在 DramaCanvas 画布上完成创作流程。",
        "mcp.faq3": "外部工具生成会扣积分吗？怎么控制花费？|会正常扣除你的账户积分。为了控制花费，你可以在平台的密钥管理页面为该连接设置具体的消费上限，达到额度后自动停止生成，有效避免非预期扣费。",
        "mcp.faq4": "不想用时怎么撤销外部工具的访问权限？|直接在平台的密钥管理页面吊销或删除对应的密钥即可。撤销后，外部工具将立即失去访问你的画布与消耗积分的权限，已有的画布内容不受任何影响。",
        "mcp.steps": "MCP 服务器配置与接入",
        "mcp.codexApproval": 'Codex 的无人值守执行需要设置审批模式。在 ~/.codex/config.toml 的 [mcp_servers.dramacanva] 段加入下方配置；也可改为 "writes"，让只读工具自动执行、写入或扣费操作需确认。',
        "mcp.billingDetail":
            "MCP 调用直接执行，不逐次确认。付费调用、任务及创建对象的工具必须提供 8–128 个字符的 idempotencyKey，重试时必须复用同一个幂等键 和原参数。付费模型与媒体用量直接扣积分，由密钥持有人负责。可在密钥页设置累计消费上限；付费 MCP 钱包记录标注 MCP 来源。本地视频渲染和语音转写当前不扣模型积分。外部客户端自身的费用另计。",
        "mcp.cliSteps": "创建密钥，在终端执行下方环境变量命令，再执行客户端命令。重启客户端，要求它使用 dramacanva。Windows 请用 PowerShell 环境变量命令；Claude Code 命令中的 $DRAMACANVA_API_KEY 改为 $env:DRAMACANVA_API_KEY。",
        "mcp.cursorSteps": "点击一键添加到 Cursor，确认安装并重启。公开配置需要在 Cursor 环境中设置 DRAMACANVA_API_KEY；创建密钥后可直接安装已填入密钥的配置。",
        "mcp.otherSteps": "把 JSON 粘贴到支持 Streamable HTTP 与 Authorization 请求头的客户端配置。在本机将 <YOUR_KEY> 替换为密钥，重新连接并确认 dramacanva 工具可用。",
        "mcp.example1": "帮我做一个 30 秒的猫咪短片分镜并生成首帧。|Agent 创建画布、写镜头、连接节点并提交图片任务。 generate_media(..., idempotencyKey=cat-frame-001).",
        "mcp.example2":
            "把这个剧本拆成 12 集，给主角定妆。|Agent 导入分集、写分镜并制作角色参考图。 create_project(..., idempotencyKey=script-project-001); generate_media(..., idempotencyKey=character-look-001). expert 工具配置：?profile=expert 后重连，并授予必要权限。",
        "mcp.example3":
            "让站内 Agent 补完这份分镜，并拼成视频。|Agent 委派任务、查看进度，再把可用片段渲染成片。 agent_start(..., idempotencyKey=storyboard-agent-001); render_timeline(..., idempotencyKey=storyboard-render-001). expert 工具配置：?profile=expert 后重连，并授予必要权限。",
    },
    "zh-HK": {
        "mcp.getKey": "取得 API 密鑰",
        "mcp.paste": "貼上至終端機",
        "mcp.explore": "查看能做什麼 →",
        "mcp.faq1": "DramaCanvas 的 MCP 是甚麼？具體有何功用？|它是一個開放協定介面，讓外部 AI 助手可以直接操作你的畫布。連接後，外部工具能直接為你撰寫劇本分鏡、在畫布上排布鏡頭卡片，甚至直接調用模型生成影片。",
        "mcp.faq2": "目前支援連接哪些外部 AI 工具？|目前支援 Claude Code、Codex、Cursor 等相容 MCP 協定的開發工具。你可以直接在這些工具內使用自然語言下達指令，指揮它在 DramaCanvas 畫布上完成創作流程。",
        "mcp.faq3": "外部工具生成會扣除積分嗎？如何控制開銷？|會正常扣除你的帳戶積分。為有效控制花費，你可以在平台的金鑰管理頁面為該連接設定具體的消費上限，達到額度後會自動停止生成，避免超出預算的扣費。",
        "mcp.faq4": "不再使用時如何撤銷外部工具的存取權限？|直接在平台的金鑰管理頁面撤銷或刪除對應金鑰即可。撤銷後，外部工具會即時失去存取畫布及消耗積分的權限，而畫布現有內容絕不受任何影響。",
        "mcp.steps": "MCP 伺服器設定與接入",
        "mcp.codexApproval": 'Codex 的無人值守執行需要設置審批模式。在 ~/.codex/config.toml 的 [mcp_servers.dramacanva] 段加入下方設定；也可改為 "writes"，讓只讀工具自動執行、寫入或扣費操作需確認。',
        "mcp.billingDetail":
            "MCP 調用直接執行，不逐次確認。付費呼叫、任務及建立物件的工具必須提供 8–128 個字元的 idempotencyKey，重試時必須重用同一個冪等鍵和原參數。付費模型與媒體用量直接扣積分，由密鑰持有人負責。可在密鑰頁設置累計消費上限；付費 MCP 錢包紀錄標註 MCP 來源。本機影片渲染及語音轉寫目前不扣模型積分。外部客戶端自身的費用另計。",
        "mcp.cliSteps": "建立密鑰，在終端執行下方環境變數命令，再執行客戶端命令。重啟客戶端，要求它使用 dramacanva。Windows 請用 PowerShell 環境變數命令；Claude Code 命令中的 $DRAMACANVA_API_KEY 改為 $env:DRAMACANVA_API_KEY。",
        "mcp.cursorSteps": "點擊一鍵加入 Cursor，確認安裝並重啟。公開設定需要在 Cursor 環境中設置 DRAMACANVA_API_KEY；建立密鑰後可直接安裝已填入密鑰的設定。",
        "mcp.otherSteps": "把 JSON 貼到支援 Streamable HTTP 與 Authorization 標頭的客戶端設定。在本機將 <YOUR_KEY> 替換為密鑰，重新連接並確認 dramacanva 工具可用。",
        "mcp.example1": "幫我做一個 30 秒的貓咪短片分鏡並生成首幀。|Agent 建立畫布、寫鏡頭、連接節點並提交圖片任務。 generate_media(..., idempotencyKey=cat-frame-001).",
        "mcp.example2":
            "把這個劇本拆成 12 集，給主角定妝。|Agent 導入分集、寫分鏡並製作角色參考圖。 create_project(..., idempotencyKey=script-project-001); generate_media(..., idempotencyKey=character-look-001). expert 工具設定：?profile=expert 後重新連接，並授予必要權限。",
        "mcp.example3":
            "讓站內 Agent 補完這份分鏡，並拼成影片。|Agent 委派任務、查看進度，再把可用片段渲染成片。 agent_start(..., idempotencyKey=storyboard-agent-001); render_timeline(..., idempotencyKey=storyboard-render-001). expert 工具設定：?profile=expert 後重新連接，並授予必要權限。",
    },
    "zh-TW": {
        "mcp.getKey": "取得 API 金鑰",
        "mcp.paste": "貼上至終端機",
        "mcp.explore": "查看能做什麼 →",
        "mcp.faq1": "DramaCanvas 的 MCP 功能是什麼？能做到哪些事？|MCP 是一套開放協定介面，能讓外部 AI 助手直接操作你的畫布。連線建立後，外部工具可以直接協助你撰寫劇本分鏡、在畫布上擺放鏡頭卡片，甚至直接呼叫模型生成影片。",
        "mcp.faq2": "目前支援與哪些外部 AI 工具進行連線？|目前支援 Claude Code、Codex、Cursor 等相容 MCP 協定的開發工具。你可以直接在這些工具中使用日常自然語言下達指令，指揮 AI 助手在 DramaCanvas 畫布上執行創作流程。",
        "mcp.faq3": "透過外部工具呼叫生成會扣除點數嗎？如何控制預算花費？|會正常扣除你的帳號點數。為了有效控管花費，你可以在平台的金鑰管理頁面為該連線設定具體的扣點上限；一旦達到額度上限便會自動停止生成，避免超出預期支出。",
        "mcp.faq4": "若不再使用，該如何撤銷外部工具的存取權限？|直接前往平台的金鑰管理頁面，將對應的金鑰撤銷或刪除即可。撤銷後，外部工具將立即失去存取你的畫布與扣除點數的權限，而畫布上已建立的內容完全不會受到影響。",
        "mcp.steps": "MCP 伺服器設定與串接",
        "mcp.codexApproval": 'Codex 在無人操作時執行需要設定核准模式。在 ~/.codex/config.toml 的 [mcp_servers.dramacanva] 區段加入下方設定；也可改為 "writes"，讓唯讀工具自動執行、寫入或扣費操作需確認。',
        "mcp.billingDetail":
            "MCP 呼叫直接執行，不逐次確認。付費呼叫、任務及建立物件的工具必須提供 8–128 個字元的 idempotencyKey，重試時必須重用同一個冪等鍵和原參數。付費模型與媒體用量直接扣點數，由金鑰持有人負責。可在金鑰頁設定累計消費上限；付費 MCP 錢包紀錄標註 MCP 來源。本機影片渲染和語音轉寫目前不扣模型點數。外部用戶端自身的費用另計。",
        "mcp.cliSteps": "建立金鑰，在終端執行下方環境變數命令，再執行用戶端命令。重啟用戶端，要求它使用 dramacanva。Windows 請用 PowerShell 環境變數命令；Claude Code 命令中的 $DRAMACANVA_API_KEY 改為 $env:DRAMACANVA_API_KEY。",
        "mcp.cursorSteps": "點擊一鍵加入 Cursor，確認安裝並重啟。公開設定需要在 Cursor 環境中設定 DRAMACANVA_API_KEY；建立金鑰後可直接安裝已填入金鑰的設定。",
        "mcp.otherSteps": "把 JSON 貼到支援 Streamable HTTP 與 Authorization 標頭的用戶端設定。在本機將 <YOUR_KEY> 替換為金鑰，重新連線並確認 dramacanva 工具可用。",
        "mcp.example1": "幫我做一個 30 秒的貓咪短片分鏡並生成第一個影格。|Agent 建立畫布、寫鏡頭、連接節點並提交圖片任務。 generate_media(..., idempotencyKey=cat-frame-001).",
        "mcp.example2":
            "把這個劇本拆成 12 集，給主角定妝。|Agent 匯入分集、寫分鏡並製作角色參考圖。 create_project(..., idempotencyKey=script-project-001); generate_media(..., idempotencyKey=character-look-001). expert 工具設定：?profile=expert 後重新連線，並授予必要權限。",
        "mcp.example3":
            "讓內建 Agent 補完這份分鏡，並剪輯成影片。|Agent 委派任務、查看進度，再把可用片段渲染成片。 agent_start(..., idempotencyKey=storyboard-agent-001); render_timeline(..., idempotencyKey=storyboard-render-001). expert 工具設定：?profile=expert 後重新連線，並授予必要權限。",
    },
    "en-US": {
        "mcp.getKey": "Get an API key",
        "mcp.paste": "Paste into your terminal",
        "mcp.explore": "See what it can do →",
        "mcp.faq1":
            "What is DramaCanvas MCP and what does it do?|Model Context Protocol (MCP) is an open standard that allows external AI assistants to control your canvas directly. Once connected, your external tools can write script breakdowns, arrange shot cards, and trigger video generation models on DramaCanvas.",
        "mcp.faq2":
            "Which AI tools can connect to DramaCanvas via MCP?|DramaCanvas supports MCP-compatible coding and agent tools including Claude Code, Codex, and Cursor. You can issue natural language prompts inside those tools to manage your storyboard and production workflow on the canvas.",
        "mcp.faq3":
            "Do external MCP tools consume credits, and how do I set spending limits?|Yes, generations triggered via MCP deduct credits from your account balance as usual. To control spending, you can set a credit usage limit on your API key management page. Once reached, generation stops automatically to prevent unexpected charges.",
        "mcp.faq4":
            "How do I revoke access for external MCP tools?|You can revoke or delete the corresponding API key anytime in the key management dashboard. External tools immediately lose access to your canvas and credit balance, while your existing canvas projects remain intact.",
        "mcp.steps": "Client setup",
        "mcp.codexApproval":
            'Unattended Codex runs need an approval mode. Add the line below to the [mcp_servers.dramacanva] section in ~/.codex/config.toml. You can use "writes" instead to auto-approve read-only tools and require confirmation for writes or paid calls.',
        "mcp.billingDetail":
            "MCP calls execute without per-call confirmation. Paid calls, tasks and creation tools require an 8–128 character idempotencyKey; retries must reuse the same key and arguments. Paid model and media usage charges your credits directly; the key holder is responsible. Set a cumulative spending limit on the keys page. Wallet entries label paid MCP usage as MCP. Local video rendering and transcription currently do not charge model credits. Your external client's own fees are separate.",
        "mcp.cliSteps":
            "Create a key, copy the environment command below and run it in your shell. Then run the client command, restart the client and ask it to use dramacanva. On Windows, use the PowerShell environment command; for Claude Code replace $DRAMACANVA_API_KEY with $env:DRAMACANVA_API_KEY in its command.",
        "mcp.cursorSteps": "Use Add to Cursor, approve installation and restart Cursor. The public configuration needs DRAMACANVA_API_KEY in Cursor's environment. After creating a key you can install with the key already filled in.",
        "mcp.otherSteps": "Copy the JSON into a client that supports Streamable HTTP and Authorization headers. Replace <YOUR_KEY> locally with your key, reconnect and check that dramacanva tools are available.",
        "mcp.example1": "Make a 30-second cat short and generate first frames.|The Agent creates a canvas, writes shots, connects nodes and submits image tasks. generate_media(..., idempotencyKey=cat-frame-001).",
        "mcp.example2":
            "Split this script into 12 episodes and design the lead character.|The Agent imports episodes, writes storyboards and builds character reference images. create_project(..., idempotencyKey=script-project-001); generate_media(..., idempotencyKey=character-look-001). Expert profile: reconnect with ?profile=expert and the required scopes.",
        "mcp.example3":
            "Ask the built-in Agent to finish this storyboard and assemble a video.|The Agent delegates the task, checks progress and renders the available clips into a video. agent_start(..., idempotencyKey=storyboard-agent-001); render_timeline(..., idempotencyKey=storyboard-render-001). Expert profile: reconnect with ?profile=expert and the required scopes.",
    },
    "ja-JP": {
        "mcp.getKey": "APIキーを取得",
        "mcp.paste": "ターミナルに貼り付け",
        "mcp.explore": "できることを見る →",
        "mcp.faq1":
            "DramaCanvasのMCP連携とは何ですか？どのようなことができますか？|外部のAIアシスタントがあなたのキャンバスを直接操作できるようにするオープンな連携規格です。接続することで、外部ツールから脚本や絵コンテを作成したり、キャンバス上にカットカードを配置したり、モデルを呼び出して動画を生成させることができます。",
        "mcp.faq2":
            "現在、どのような外部AIツールと接続できますか？|Claude Code、Codex、Cursorなど、MCP規格に対応した開発ツールやエージェントと接続できます。使い慣れたツールの対話画面から自然言語で指示を出し、DramaCanvasのキャンバス上での制作作業を操作できます。",
        "mcp.faq3":
            "外部ツール経由で生成を実行した場合、クレジットは消費されますか？利用額の制限は可能ですか？|通常どおりアカウントのクレジットが消費されます。予期せぬ利用を防ぐため、管理画面のAPIキー設定ページで接続ごとに消費上限額を設定できます。上限に達すると自動で生成が停止するため、費用を管理しやすくなっています。",
        "mcp.faq4":
            "外部ツールからのアクセス権限を取り消したい場合はどうすればいいですか？|プラットフォームのキー管理画面から、該当するAPIキーを無効化または削除してください。削除した瞬間から外部ツールはキャンバスへのアクセスおよびクレジット消費ができなくなります。すでに作成済みのキャンバスデータには影響しません。",
        "mcp.steps": "MCP サーバーの設定方法と接続",
        "mcp.codexApproval":
            "Codexを無人で実行するには承認モードの設定が必要です。以下の行を ~/.codex/config.toml の [mcp_servers.dramacanva] セクションに追加してください。「writes」にすると読み取り専用ツールは自動承認され、書き込みや有料操作には確認が必要です。",
        "mcp.billingDetail":
            "MCPは毎回の確認なしに実行されます。有料の呼び出し、タスク、オブジェクト作成には8–128文字のidempotencyKeyが必要です。再試行は同じキーと引数を使ってください。有料モデルとメディアの利用はクレジットを直接消費し、キー所有者が責任を負います。キー画面で累計上限を設定でき、ウォレットにはMCPと表示されます。ローカルの動画出力と文字起こしは現在モデルクレジットを消費しません。外部クライアントの料金は別です。",
        "mcp.cliSteps":
            "キーを作成し、下の環境変数コマンドを実行してからクライアントのコマンドを実行します。再起動して dramacanva の利用を指示してください。WindowsではPowerShellを使い、Claude Codeの $DRAMACANVA_API_KEY を $env:DRAMACANVA_API_KEY に変更します。",
        "mcp.cursorSteps": "Cursorに追加を押してインストールを承認し、再起動します。公開設定にはCursorの環境変数 DRAMACANVA_API_KEY が必要です。キー作成後はキー入りの設定を追加できます。",
        "mcp.otherSteps": "Streamable HTTPとAuthorizationヘッダーに対応したクライアントへJSONを貼り付けます。手元で <YOUR_KEY> をキーに置き換え、再接続してツールを確認してください。",
        "mcp.example1": "30秒の猫の短編の絵コンテと開始フレームを作って。|Agentがキャンバスとカットを作り、ノードを接続して画像生成を依頼します。 generate_media(..., idempotencyKey=cat-frame-001).",
        "mcp.example2":
            "脚本を12話に分けて主人公の見た目を作って。|Agentが各話を取り込み、絵コンテとキャラクターの参考画像を作ります。 create_project(..., idempotencyKey=script-project-001); generate_media(..., idempotencyKey=character-look-001). expert 構成：?profile=expert で再接続し、必要な権限を設定。",
        "mcp.example3":
            "内蔵Agentで絵コンテを仕上げて動画にして。|Agentが作業を委任し、進捗を確認して利用できるクリップを動画にします。 agent_start(..., idempotencyKey=storyboard-agent-001); render_timeline(..., idempotencyKey=storyboard-render-001). expert 構成：?profile=expert で再接続し、必要な権限を設定。",
    },
    "ko-KR": {
        "mcp.getKey": "API 키 받기",
        "mcp.paste": "터미널에 붙여넣기",
        "mcp.explore": "가능한 작업 보기 →",
        "mcp.faq1":
            "DramaCanvas의 MCP란 무엇이고 어떤 일을 할 수 있나요?|외부의 AI 코딩 및 작업 도구가 사용자의 캔버스를 직접 조작할 수 있도록 돕는 개방형 프로토콜이에요. 연동을 마치면 외부 AI 도구가 대본 콘티를 대신 작성하거나 캔버스에 컷 카드를 배치하고 영상 생성 모델을 직접 호출할 수도 있어요.",
        "mcp.faq2":
            "현재 어떤 AI 도구와 연동할 수 있나요?|현재 Claude Code, Codex, Cursor 등 MCP 프로토콜을 지원하는 다양한 개발 도구와 연동할 수 있어요. 평소 사용하시는 도구 안에서 자연어로 명령을 내려 DramaCanvas 캔버스 위에 기획과 장면을 만들어낼 수 있어요.",
        "mcp.faq3":
            "외부 도구를 통해 생성할 때도 크레딧이 차감되나요? 비용은 어떻게 관리하나요?|네, 외부 도구로 생성하더라도 계정의 크레딧이 동일하게 차감돼요. 불필요한 과금을 방지하려면 플랫폼의 API 키 관리 페이지에서 해당 연결의 크레딧 지출 한도를 미리 설정해 두세요. 설정한 한도에 도달하면 자동으로 생성이 멈춰 안전해요.",
        "mcp.faq4":
            "더 이상 쓰지 않을 때 외부 도구의 접근 권한은 어떻게 해제하나요?|플랫폼의 API 키 관리 페이지에서 등록된 키를 삭제하거나 비활성화하시면 돼요. 키를 해제하는 즉시 외부 도구의 캔버스 접근과 크레딧 차감 권한이 차단되며, 캔버스에 이미 작성된 프로젝트 내용은 그대로 안전하게 유지돼요.",
        "mcp.steps": "MCP 서버 설정 방법과 연결",
        "mcp.codexApproval": 'Codex를 무인으로 실행하려면 승인 모드를 설정해야 합니다. 아래 줄을 ~/.codex/config.toml의 [mcp_servers.dramacanva] 섹션에 추가하세요. "writes"로 바꾸면 읽기 전용 도구는 자동 승인되고 쓰기 또는 유료 호출은 확인이 필요합니다.',
        "mcp.billingDetail":
            "MCP는 호출별 확인 없이 실행됩니다. 유료 호출, 작업 및 생성에는 8–128자의 idempotencyKey가 필요하며 재시도는 같은 키와 인수를 사용해야 합니다. 유료 모델과 미디어 사용은 크레딧을 직접 차감하며 키 소유자가 책임집니다. 키 페이지에서 누적 한도를 설정할 수 있고 지갑 내역에 MCP가 표시됩니다. 로컬 영상 렌더링과 음성 전사는 현재 모델 크레딧을 차감하지 않습니다. 외부 클라이언트 비용은 별도입니다.",
        "mcp.cliSteps": "키를 만들고 아래 환경 변수 명령을 실행한 뒤 클라이언트 명령을 실행하세요. 재시작 후 dramacanva 사용을 요청하세요. Windows는 PowerShell을 사용하고 Claude Code의 $DRAMACANVA_API_KEY를 $env:DRAMACANVA_API_KEY로 바꾸세요.",
        "mcp.cursorSteps": "Cursor에 추가를 눌러 설치를 승인하고 재시작하세요. 공개 설정을 쓰려면 Cursor 환경에 DRAMACANVA_API_KEY를 설정해야 합니다. 키 생성 후에는 키가 채워진 설정을 설치할 수 있습니다.",
        "mcp.otherSteps": "Streamable HTTP와 Authorization 헤더를 지원하는 클라이언트에 JSON을 붙여넣으세요. 로컬에서 <YOUR_KEY>를 키로 바꾸고 재연결해 도구를 확인하세요.",
        "mcp.example1": "30초 고양이 단편의 스토리보드와 첫 프레임을 만들어 줘.|Agent가 캔버스와 장면을 만들고 노드를 연결해 이미지 작업을 제출합니다. generate_media(..., idempotencyKey=cat-frame-001).",
        "mcp.example2":
            "이 대본을 12개 에피소드로 나누고 주인공 외형을 디자인해 줘.|Agent가 회차를 가져와 스토리보드와 캐릭터 레퍼런스 이미지를 만듭니다. create_project(..., idempotencyKey=script-project-001); generate_media(..., idempotencyKey=character-look-001). expert: ?profile=expert로 재연결하고 필요한 권한을 설정하세요.",
        "mcp.example3":
            "내장 Agent에게 스토리보드를 완성하고 영상으로 편집해 달라고 해 줘.|Agent가 작업을 위임하고 진행 상황을 확인한 뒤 사용 가능한 클립을 렌더링합니다. agent_start(..., idempotencyKey=storyboard-agent-001); render_timeline(..., idempotencyKey=storyboard-render-001). expert: ?profile=expert로 재연결하고 필요한 권한을 설정하세요.",
    },
    "es-ES": {
        "mcp.getKey": "Obtener una clave API",
        "mcp.paste": "Pegar en el terminal",
        "mcp.explore": "Ver qué puede hacer →",
        "mcp.faq1":
            "¿Qué es el servidor MCP de DramaCanvas y qué permite hacer?|Es una interfaz abierta que permite a asistentes de IA externos interactuar con tu lienzo. Una vez conectado, estas herramientas pueden redactar guiones, organizar tarjetas de planos en el espacio de trabajo y solicitar la generación de imágenes y vídeos con los modelos disponibles.",
        "mcp.faq2":
            "¿Qué herramientas de IA son compatibles con MCP actualmente?|Admite herramientas compatibles con el protocolo MCP como Claude Code, Codex y Cursor. Desde cualquiera de ellas puedes dar instrucciones en lenguaje natural para que organicen y desarrollen tus proyectos en DramaCanvas.",
        "mcp.faq3":
            "¿Generar desde herramientas externas consume créditos? ¿Cómo controlo el gasto?|Sí, consume créditos de tu cuenta de forma habitual. Para fijar un límite, puedes configurar un tope de gasto en el panel de gestión de claves de la plataforma; al alcanzar ese importe, las generaciones se detienen para evitar consumos imprevistos.",
        "mcp.faq4":
            "¿Cómo revoco el acceso de una herramienta externa cuando ya no la necesite?|Entra en el panel de gestión de claves y elimina o revoca la clave correspondiente. La herramienta externa perderá el acceso a tu lienzo y a tus créditos de inmediato, sin que el contenido ya creado sufra ningún cambio.",
        "mcp.steps": "Cómo configurar y conectar el servidor MCP",
        "mcp.codexApproval":
            'Las ejecuciones desatendidas de Codex necesitan un modo de aprobación. Añade la línea siguiente a la sección [mcp_servers.dramacanva] de ~/.codex/config.toml. También puedes usar "writes" para aprobar automáticamente las herramientas de solo lectura y pedir confirmación para escrituras o llamadas de pago.',
        "mcp.billingDetail":
            "Las llamadas MCP se ejecutan sin pedir confirmación cada vez. Las llamadas de pago, tareas y creaciones requieren un idempotencyKey de 8–128 caracteres; reutiliza la misma clave y los mismos parámetros al reintentar. El uso de modelos y la generación de contenido de pago consumen créditos directamente; el titular es responsable. Configura un límite acumulado en la página de claves. La cartera identifica el consumo MCP. El renderizado y la transcripción locales no consumen actualmente créditos de modelos. Las tarifas del cliente externo son independientes.",
        "mcp.cliSteps":
            "Crea una clave, ejecuta el comando de entorno y después el del cliente. Reinicia y pídele al cliente que use dramacanva. En Windows usa PowerShell; cambia $DRAMACANVA_API_KEY por $env:DRAMACANVA_API_KEY en el comando de Claude Code.",
        "mcp.cursorSteps": "Pulsa Añadir a Cursor, acepta la instalación y reinicia. La configuración pública necesita DRAMACANVA_API_KEY en el entorno de Cursor. Tras crear una clave puedes instalar la configuración con la clave incluida.",
        "mcp.otherSteps": "Copia el JSON en un cliente compatible con Streamable HTTP y encabezados Authorization. Sustituye <YOUR_KEY> localmente por tu clave, reconecta y comprueba que las herramientas de dramacanva estén disponibles.",
        "mcp.example1": "Haz un corto de gatos de 30 segundos y genera los fotogramas iniciales.|El agente crea un lienzo, escribe planos, conecta nodos y envía tareas de imagen. generate_media(..., idempotencyKey=cat-frame-001).",
        "mcp.example2":
            "Divide este guion en 12 episodios y diseña al protagonista.|El agente importa episodios, escribe storyboards y crea referencias del personaje. create_project(..., idempotencyKey=script-project-001); generate_media(..., idempotencyKey=character-look-001). Perfil expert: reconecta con ?profile=expert y los permisos necesarios.",
        "mcp.example3":
            "Pide al agente integrado que termine el storyboard y monte un vídeo.|El agente delega, comprueba el progreso y renderiza los clips disponibles. agent_start(..., idempotencyKey=storyboard-agent-001); render_timeline(..., idempotencyKey=storyboard-render-001). Perfil expert: reconecta con ?profile=expert y los permisos necesarios.",
    },
    "pt-BR": {
        "mcp.getKey": "Obter chave API",
        "mcp.paste": "Colar no terminal",
        "mcp.explore": "Ver o que pode fazer →",
        "mcp.faq1":
            "O que é a integração MCP do DramaCanvas e para que ela serve?|O MCP é um protocolo aberto que permite a assistentes de IA externos operarem a sua tela diretamente. Com essa conexão ativa, ferramentas externas conseguem redigir roteiros, organizar cartões de storyboard e acionar os modelos integrados para gerar vídeos na sua área de trabalho.",
        "mcp.faq2":
            "Quais ferramentas de IA são compatíveis com o MCP da plataforma?|Atualmente há suporte para Claude Code, Codex, Cursor e outros ambientes compatíveis com o protocolo MCP. Você envia comandos em linguagem natural dentro dessas ferramentas para criar e modificar elementos na tela do DramaCanvas.",
        "mcp.faq3":
            "Gerações feitas por ferramentas externas gastam créditos? Como limitar os gastos?|Sim, as gerações solicitadas via MCP consomem créditos da sua conta normalmente. Para controlar os custos, acesse o painel de gerenciamento de chaves e defina um limite máximo de consumo; ao atingir essa cota, as gerações são pausadas para evitar despesas imprevistas.",
        "mcp.faq4":
            "Como revogar o acesso de ferramentas externas quando eu não quiser mais usar?|Basta revogar ou excluir a chave correspondente na página de gerenciamento de chaves da plataforma. O acesso à sua tela e ao saldo de créditos é interrompido na mesma hora, mantendo intactos todos os conteúdos já criados no projeto.",
        "mcp.steps": "Como configurar e conectar o servidor MCP",
        "mcp.codexApproval":
            'Execuções autônomas do Codex precisam de um modo de aprovação. Adicione a linha abaixo à seção [mcp_servers.dramacanva] de ~/.codex/config.toml. Você também pode usar "writes" para aprovar automaticamente ferramentas somente de leitura e exigir confirmação para gravações ou chamadas pagas.',
        "mcp.billingDetail":
            "As chamadas MCP são executadas sem pedir confirmação a cada vez. Chamadas pagas, tarefas e criações exigem um idempotencyKey de 8–128 caracteres; repita com a mesma chave e os mesmos parâmetros. O uso de modelos e a geração de mídia pagos descontam créditos diretamente; o titular é responsável. Defina um limite acumulado na página de chaves. O histórico da carteira identifica MCP. Renderização e transcrição locais atualmente não descontam créditos de modelos. O cliente externo tem tarifas próprias.",
        "mcp.cliSteps":
            "Crie uma chave, execute o comando da variável de ambiente e depois o comando do cliente. Reinicie e peça ao cliente para usar dramacanva. No Windows use PowerShell; no Claude Code troque $DRAMACANVA_API_KEY por $env:DRAMACANVA_API_KEY.",
        "mcp.cursorSteps": "Clique em Adicionar ao Cursor, confirme a instalação e reinicie. A configuração pública precisa de DRAMACANVA_API_KEY no ambiente do Cursor. Após criar uma chave, pode instalar a configuração já preenchida.",
        "mcp.otherSteps": "Cole o JSON em um cliente com Streamable HTTP e cabeçalhos Authorization. Substitua <YOUR_KEY> pela sua chave no seu computador, reconecte e confira as ferramentas.",
        "mcp.example1": "Faça um curta de gatos de 30 segundos e gere os frames iniciais.|O agente cria um canvas, escreve cenas, conecta nós e envia tarefas de imagem. generate_media(..., idempotencyKey=cat-frame-001).",
        "mcp.example2":
            "Divida este roteiro em 12 episódios e crie o visual do protagonista.|O agente importa episódios, escreve storyboards e cria referências do personagem. create_project(..., idempotencyKey=script-project-001); generate_media(..., idempotencyKey=character-look-001). Perfil expert: reconecte com ?profile=expert e as permissões necessárias.",
        "mcp.example3":
            "Peça ao agente integrado para terminar o storyboard e montar um vídeo.|O agente delega, verifica o progresso e renderiza os clipes disponíveis. agent_start(..., idempotencyKey=storyboard-agent-001); render_timeline(..., idempotencyKey=storyboard-render-001). Perfil expert: reconecte com ?profile=expert e as permissões necessárias.",
    },
} satisfies Record<BlogLocale, Record<string, string>>;
