import type { BlogLocale } from "../content/blog-locales";

// Only public metadata belongs in the deferred SEO registry, not complete UI catalogs.
export const MCP_PAGE_META = {
    "zh-CN": {
        title: "AI 影视创作平台 MCP 服务器 | DramaCanvas",
        description: "DramaCanvas 是 AI 影视创作平台。连接 Claude Code、Codex 或 Cursor 在画布上写剧本、拆分镜、生成图片与视频，或直接使用内置 Agent。AI 生成按任务扣积分。",
        keywords: "Claude Code MCP, MCP服务器, Cursor MCP, Codex MCP, AI影视创作, AI短剧, AI视频生成",
    },
    "en-US": {
        title: "AI Filmmaking MCP Server for Claude & Cursor | DramaCanvas",
        description: "Use Claude Code, Codex or Cursor via MCP to draft scripts, storyboards, images and videos on DramaCanvas. Built-in Agent included; AI generation uses credits.",
        keywords: "Claude Code MCP, MCP server, Cursor MCP, Codex MCP, AI filmmaking, Model Context Protocol, AI video",
    },
    "ja-JP": {
        title: "AI映像制作 MCPサーバー | DramaCanvas",
        description: "DramaCanvasはAI映像制作プラットフォームです。内蔵Agentのほか、Claude Code、Codex、CursorとMCP連携して脚本、絵コンテ、画像・動画を生成可能。AI生成はクレジットを消費します。",
        keywords: "MCP サーバー, Claude Code MCP, Cursor MCP, Codex MCP, AI 映像制作, ショートドラマ, 動画生成AI",
    },
    "ko-KR": {
        title: "AI 영상 제작 MCP 서버 | DramaCanvas",
        description: "DramaCanvas는 AI 영상 제작 플랫폼입니다. 내장 에이전트 외에도 Claude Code, Codex, Cursor를 MCP로 연동해 캔버스에서 대본, 콘티, 이미지·영상을 생성할 수 있습니다. AI 생성은 크레딧이 차감됩니다.",
        keywords: "MCP 서버, 클로드 코드 MCP, Claude Code MCP, Cursor MCP, Codex MCP, AI 영상 제작, 숏폼 드라마, AI 비디오",
    },
    "es-ES": {
        title: "Servidor MCP de cine con IA: Claude y Cursor | DramaCanvas",
        description: "Usa Claude Code, Codex o Cursor vía MCP para guiones, storyboards, imágenes y vídeo en DramaCanvas. Agente integrado incluido; la IA usa créditos.",
        keywords: "Claude Code MCP, servidor MCP, Cursor MCP, Codex MCP, cine con IA, crear videos con IA, series cortas",
    },
    "pt-BR": {
        title: "Servidor MCP de vídeo com IA: Claude e Cursor | DramaCanvas",
        description: "Use Claude Code, Codex ou Cursor via MCP para roteiro, storyboard, imagens e vídeo no DramaCanvas. Agente integrado incluído; a IA consome créditos.",
        keywords: "servidor mcp, claude code mcp, cursor mcp, codex mcp, vídeo com IA, novela vertical, cinema com IA",
    },
    "zh-HK": {
        title: "AI 影視創作平臺 MCP 伺服器 | DramaCanvas",
        description: "DramaCanvas 是 AI 影視創作平臺。連接 Claude Code、Codex 或 Cursor 在畫布上寫劇本、拆分鏡、生成圖片與影片，或直接使用內置 Agent。AI 生成按任務扣積分。",
        keywords: "Claude Code MCP, MCP 伺服器, Cursor MCP, Codex MCP, AI 影視創作, AI 影片生成, 短劇",
    },
    "zh-TW": {
        title: "AI 影視創作平臺 MCP 伺服器 | DramaCanvas",
        description: "DramaCanvas 是 AI 影視創作平臺。連接 Claude Code、Codex 或 Cursor 在畫布上寫劇本、拆分鏡、生成圖片與影片，或直接使用內置 Agent。AI 生成按任務扣點數。",
        keywords: "Claude Code MCP, MCP 伺服器, Cursor MCP, Codex MCP, AI 影視創作, AI 影片生成, 短劇",
    },
} satisfies Record<BlogLocale, { title: string; description: string; keywords: string }>;
