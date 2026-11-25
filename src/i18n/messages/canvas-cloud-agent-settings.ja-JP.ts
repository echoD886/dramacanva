const messages = {
    // 権限オプション
    "canvasCloudAgentSettings.permission.readOnly": "読み取りのみ",
    "canvasCloudAgentSettings.permission.readOnlyDesc": "分析と提案のみ",
    "canvasCloudAgentSettings.permission.requestApproval": "承認をリクエスト",
    "canvasCloudAgentSettings.permission.requestApprovalDesc": "書き込み・生成の前に確認",
    "canvasCloudAgentSettings.permission.auto": "自動実行",
    "canvasCloudAgentSettings.permission.autoDesc": "予算内で許可済みツールを実行",
    "canvasCloudAgentSettings.permission.fallback": "承認をリクエスト",

    // コンテキスト範囲
    "canvasCloudAgentSettings.context.canvas": "保存済みキャンバスの概要",
    "canvasCloudAgentSettings.context.canvasDesc": "最大 80 ノードのタイトルとテキスト断片。メディア本体や未同期の変更は含みません",

    // 推論オプション
    "canvasCloudAgentSettings.reasoning.off": "オフ",
    "canvasCloudAgentSettings.reasoning.offDesc": "直接実行",
    "canvasCloudAgentSettings.reasoning.auto": "自動",
    "canvasCloudAgentSettings.reasoning.autoDesc": "タスクに応じて判断",
    "canvasCloudAgentSettings.reasoning.deep": "詳細",
    "canvasCloudAgentSettings.reasoning.deepDesc": "複雑なタスクは先に計画",

    // ヘッダー
    "canvasCloudAgentSettings.homeTitle": "Agent 設定",
    "canvasCloudAgentSettings.backToChat": "会話に戻る",
    "canvasCloudAgentSettings.backToSettings": "設定に戻る",
    "canvasCloudAgentSettings.homeHint": "次の新規実行から適用",
    "canvasCloudAgentSettings.enabledBadge": "{count} 件有効",
    "canvasCloudAgentSettings.currentAgentBadge": "現在の Agent",

    // 設定ホーム
    "canvasCloudAgentSettings.section.reasoning": "推論モード",
    "canvasCloudAgentSettings.section.model": "会話モデル",
    "canvasCloudAgentSettings.section.permission": "実行権限",
    "canvasCloudAgentSettings.section.capabilities": "能力と範囲",
    "canvasCloudAgentSettings.hint.newRun": "新規実行から適用",
    "canvasCloudAgentSettings.reasoningNote": "推論は目標の分解・不足判断・次のツール選択にのみ使用され、内部の思考過程はユーザーに表示されません。",
    "canvasCloudAgentSettings.permissionNote": "既定では各ステップを承認します。自動モードは許可済みのキャンバス内容を変更できます。画像と動画は常に先にドラフトを作成し、独立した承認を経てから生成します。",
    "canvasCloudAgentSettings.selectTextModel": "テキストモデルを選択",
    "canvasCloudAgentSettings.row.context": "コンテキスト",
    "canvasCloudAgentSettings.row.contextSummary": "{nodes} ノード · {scopes} 範囲",
    "canvasCloudAgentSettings.row.profile": "長期設定",
    "canvasCloudAgentSettings.row.skills": "Skills · ユーザースキルライブラリ",
    "canvasCloudAgentSettings.row.skillsSummary": "{installed} 件インストール済み · 今回 {enabled} 件有効",
    "canvasCloudAgentSettings.row.mcp": "ツールと接続",
    "canvasCloudAgentSettings.row.mcpSummary": "キャンバス、スキル参照ファイル、生成タスク",
    "canvasCloudAgentSettings.row.budget": "予算",
    "canvasCloudAgentSettings.row.budgetSummary": "1 回につき最大 {credits} クレジット · 固定価格モデル",
    "canvasCloudAgentSettings.budgetUnset": "未設定",

    // Skills ワークスペース
    "canvasCloudAgentSettings.skills.tabInstalled": "インストール済み {count}",
    "canvasCloudAgentSettings.skills.tabMarket": "Skill マーケット",
    "canvasCloudAgentSettings.skills.searchMarket": "Skill マーケットを検索",
    "canvasCloudAgentSettings.skills.searchInstalled": "インストール済み Skill を絞り込み",
    "canvasCloudAgentSettings.skills.searchAria": "Skills を検索",
    "canvasCloudAgentSettings.skills.marketHint": "現在の創作に合うスキルを見つける",
    "canvasCloudAgentSettings.skills.matchCount": "{count} 件の一致する Skill",
    "canvasCloudAgentSettings.skills.selectAll": "表示中をすべて選択",
    "canvasCloudAgentSettings.skills.deselectAll": "すべて選択解除",
    "canvasCloudAgentSettings.skills.loading": "スキルを読み込み中…",
    "canvasCloudAgentSettings.skills.noMatch": "一致なし。別のキーワードを試してください",
    "canvasCloudAgentSettings.skills.loadingMore": "読み込み中…",
    "canvasCloudAgentSettings.skills.loadMore": "さらに読み込む",

    // 長期設定ワークスペース
    "canvasCloudAgentSettings.profile.title": "長期設定ドキュメント",
    "canvasCloudAgentSettings.profile.intro": "Agent の長期的な作業習慣・口調・出力構造を定義します。ツール・ノード・予算・承認権限は増えません。安全契約は常にサーバーコードが管理します。",
    "canvasCloudAgentSettings.profile.tabUser": "ユーザー",
    "canvasCloudAgentSettings.profile.tabProject": "プロジェクト",
    "canvasCloudAgentSettings.profile.tabCanvas": "キャンバス",
    "canvasCloudAgentSettings.profile.projectUnbound": "現在のキャンバスはプロジェクトに紐付いていないため、プロジェクト設定は利用できません。",
    "canvasCloudAgentSettings.profile.loading": "設定スナップショットを読み込み中…",
    "canvasCloudAgentSettings.profile.revision": "リビジョン {revision}",
    "canvasCloudAgentSettings.profile.unsaved": " · 未保存",
    "canvasCloudAgentSettings.profile.placeholder": "例：毎回先に結論を示し、変更するショットを列挙する。プロンプトは中国語と英語の両方を提示する。",
    "canvasCloudAgentSettings.profile.saveHint": "保存後は次の新規実行にのみ影響します。実行中の Agent は元のスナップショットを固定します。",
    "canvasCloudAgentSettings.profile.save": "保存",
    "canvasCloudAgentSettings.profile.retry": "再読み込み",
    "canvasCloudAgentSettings.profile.scopeUser": "ユーザー設定",
    "canvasCloudAgentSettings.profile.scopeProject": "プロジェクト設定",
    "canvasCloudAgentSettings.profile.scopeCanvas": "現在のキャンバス設定",
    "canvasCloudAgentSettings.profile.configured": "{count} 層設定済み · 挙動設定のみ",
    "canvasCloudAgentSettings.profile.empty": "未設定 · 挙動設定のみ",

    // Skill 行
    "canvasCloudAgentSettings.skill.enableAria": "{name} を有効化",
    "canvasCloudAgentSettings.skill.noDescription": "説明なし",
    "canvasCloudAgentSettings.skill.installed": "インストール済み",
    "canvasCloudAgentSettings.skill.add": "追加",

    // MCP ワークスペース
    "canvasCloudAgentSettings.mcp.title": "サーバー組み込みツール",
    "canvasCloudAgentSettings.mcp.intro": "今回の権限に応じて開放されます。実際の能力は送信前にバックエンドへ確認します。Skills は操作知識を提供するだけで、ツール権限を上げません。",
    "canvasCloudAgentSettings.mcp.scope": "ツール範囲",
    "canvasCloudAgentSettings.mcp.toolCanvasRead": "保存済みキャンバスの読み取り",
    "canvasCloudAgentSettings.mcp.toolSkillFiles": "スキル参照ファイル（固定バージョン）",
    "canvasCloudAgentSettings.mcp.toolNodeWrite": "テキスト / Markdown ノードの書き込み",
    "canvasCloudAgentSettings.mcp.toolMediaGenerate": "システムモデルのメディア生成とタスク照会",
    "canvasCloudAgentSettings.mcp.permissionBound": "権限による制約",
    "canvasCloudAgentSettings.mcp.customNote": "カスタム MCP は未開放です。実際のツール権限・キー・呼び出し枠は Agent バックエンドが検証するため、ブラウザ側で有効と仮定してはいけません。",

    // コンテキストワークスペース
    "canvasCloudAgentSettings.context.title": "Agent が読み取れるもの",
    "canvasCloudAgentSettings.context.subtitle": "今回の新規実行のコンテキスト範囲にのみ影響",

    // 予算ワークスペース
    "canvasCloudAgentSettings.budget.title": "今回の累計予算",
    "canvasCloudAgentSettings.budget.intro": "クレジット予算は費用保護に使います。生成タスクと動画秒数に 0 を入れると上限なしになります。モデルループは予算と実行状態で制御され、固定回数では打ち切りません。",
    "canvasCloudAgentSettings.budget.credits": "クレジット上限",
    "canvasCloudAgentSettings.budget.creditsHint": "必須・0 より大きい値。全ステップの累計",
    "canvasCloudAgentSettings.budget.tasks": "生成タスク上限",
    "canvasCloudAgentSettings.budget.tasksHint": "0 は無制限。読み取りのみモードでは生成しません",
    "canvasCloudAgentSettings.budget.video": "動画秒数上限",
    "canvasCloudAgentSettings.budget.videoHint": "0 は無制限。リクエスト時間の累計",

    // セクションタイトル
    "canvasCloudAgentSettings.sectionTitle.profile": "長期設定",
    "canvasCloudAgentSettings.sectionTitle.mcp": "MCP とツール",
    "canvasCloudAgentSettings.sectionTitle.context": "コンテキスト",
    "canvasCloudAgentSettings.sectionTitle.budget": "予算",
    "canvasCloudAgentSettings.sectionSubtitle.profile": "ユーザー・プロジェクト・キャンバスの長期挙動設定",
    "canvasCloudAgentSettings.sectionSubtitle.skills": "今回のスキルを検索・インストール・選択",
    "canvasCloudAgentSettings.sectionSubtitle.mcp": "クラウドツールと接続状態",
    "canvasCloudAgentSettings.sectionSubtitle.context": "Agent が読み取れる範囲を制御",
    "canvasCloudAgentSettings.sectionSubtitle.budget": "今回のクレジットと生成消費を制御",
} as const;
export default messages;
