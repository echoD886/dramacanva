import { SUPPORT_EMAIL } from "@/lib/site-identity";
import { LegacySupportEmail } from "@/components/layout/support-emails";
import { BYOK_PORTUGUESE } from "./byok-copy.pt-BR";
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import { useUserStore } from "@/stores/use-user-store";
import { getPaymentOptions } from "@/services/api/wallet";
import { submitByokRequest } from "@/services/api/byok";
import { formatDisplayMoney, displayCurrency } from "@/lib/display-money";
import { formatPaymentAmount } from "@/lib/payment-money";
import { subscriptionIntervalLabel } from "@/pages/account/subscription-interval";
import { useByokStatus } from "@/hooks/use-byok-status";
import { ByokServiceControls } from "./byok-service-controls";
import { RollingValue, RollingValueGroup } from "@/components/payments/rolling-value";
import { pricingUxCopy } from "./pricing-ux-copy";
import { ByokSavingsCalculator } from "./byok-savings-calculator";
import "./byok-studio.css";
import { useI18n } from "@/i18n/use-i18n";
import { Check, AlertCircle, ChevronRight, Sparkles, ShieldAlert, X, Send, Gift, ReceiptText, CircleHelp } from "lucide-react";
import type { BlogLocale } from "@/content/blog-locales";
import { PaymentMethodsMiniRow } from "@/components/payments/payment-methods-section";
import { formatBillingAmount } from "./pricing-catalog";

type ByokContent = {
    badge: string;
    coCreationBadge: string;
    title: string;
    subtitle: string;
    price: string;
    period: string;
    priceNote: string;
    summary: string;
    includedTitle: string;
    includedItems: string[];
    boundariesTitle: string;
    boundariesItems: string[];
    whyTitle: string;
    whyParagraphs: string[];
    ctaButton: string;
    requestButton: string;
    modalTitle: string;
    modalSubtitle: string;
    modalSafetyTitle: string;
    modalSafetyText: string;
    formChannelName: string;
    formChannelPlaceholder: string;
    formDocUrl: string;
    formDocPlaceholder: string;
    formModels: string;
    formModelsPlaceholder: string;
    formProtocol: string;
    formContact: string;
    formContactPlaceholder: string;
    formSubmit: string;
    formCancel: string;
    requestSuccess: string;
    protocolOpenAi: string;
    protocolGemini: string;
    protocolClaude: string;
    protocolCustom: string;
    monthlyEquivalent: string;
};

/** Discount badge and the 6-month card-free trial offer shown on the BYOK card (trial = first-time accounts). */
export const BYOK_TRIAL_TEXTS: Record<BlogLocale, { save: string; trialCta: string; trialNote: string }> = {
    "zh-CN": { save: "省 {percent}%", trialCta: "新用户免费用 {months} 个月", trialNote: "无需绑卡。到期后按 {price} / 6 个月续费，不会自动扣款。" },
    "zh-HK": { save: "慳 {percent}%", trialCta: "新用戶免費用 {months} 個月", trialNote: "毋須綁定信用卡。到期後按 {price} / 6 個月續費，不會自動扣款。" },
    "zh-TW": { save: "省 {percent}%", trialCta: "新用戶免費用 {months} 個月", trialNote: "不需綁定信用卡。到期後以 {price} / 6 個月續費，不會自動扣款。" },
    "en-US": { save: "Save {percent}%", trialCta: "New users: {months} months free", trialNote: "No card required. When it ends, renew 6 months for {price}; you're never charged automatically." },
    "ja-JP": { save: "{percent}% オフ", trialCta: "新規ユーザーは {months} か月無料", trialNote: "カード登録は不要です。期間終了後は {price} / 6 か月で更新できます。自動で請求されることはありません。" },
    "ko-KR": { save: "{percent}% 할인", trialCta: "신규 사용자 {months}개월 무료", trialNote: "카드 등록이 필요 없어요. 기간이 끝나면 {price} / 6개월로 갱신할 수 있으며, 자동 결제되지 않아요." },
    "es-ES": { save: "Ahorra un {percent}%", trialCta: "Nuevos usuarios: {months} meses gratis", trialNote: "Sin tarjeta. Al terminar, renueva 6 meses por {price}; nunca se cobra automáticamente." },
    "pt-BR": { save: "Economize {percent}%", trialCta: "Novos usuários: {months} meses grátis", trialNote: "Sem cartão. Ao terminar, renove 6 meses por {price}; nunca há cobrança automática." },
};

export const BYOK_TEXTS: Record<BlogLocale, ByokContent> = {
    "pt-BR": BYOK_PORTUGUESE,
    "zh-CN": {
        badge: "自带模型渠道 · 模型费用零加价",
        coCreationBadge: "开发者自用 · 顶级短剧共建",
        title: "创作主场",
        subtitle: "你的模型已经就位，创作只管开始。",
        price: "$25 USD",
        period: "/ 6 个月",
        priceNote: "一次开通，获得 6 个月的环境服务与基础维护。",
        summary:
            "带上你自己的模型渠道，我们负责把创作工作台、模型接入和日常维护准备好。模型费用仍由你直接支付给渠道方；DramaCanvas 不扣平台积分，也不从你的模型调用中加价。更重要的是：这个工作台源于开发者日常自用，并由多位一线顶级短剧导演与团队深度共建优化，我们会根据创作者的实际使用与痛点实时更新——相当于为你的团队配备了专属 AI 工作流工程师。",
        includedTitle: "包含环境与服务权益：",
        includedItems: [
            "连接 1 个自带模型，支持随时更换 Key 与同步模型列表",
            "画布中调用自带模型：0 平台抽成、不扣平台积分",
            "已就绪创作工作台：免配显卡、Python 与 ComfyUI",
            "包含 {period}环境服务、协议兼容维护与基础故障排查",
            "开发者随自用高频维护，协议微调时快速热更新兼容",
            "与一线顶级短剧团队共建的连贯性工作流持续开放",
            "支持一键申请适配新第三方渠道与接口协议",
        ],
        boundariesTitle: "不包含与价格边界说明：",
        boundariesItems: [
            "任何模型调用额度、第三方 API 费用或第三方账号费用（仍由您直接付给渠道方）",
            "任意小众渠道、非标私有协议或专属工作流的无限制兼容保证",
            "独立 VPS、SSH 权限、专属独立后端部署、数据库运维（如需独占实例需走私有化方案）",
            "第三方模型的价格变动、速率限流、内容审核策略、网络稳定性与输出质量保证",
        ],
        whyTitle: "查看真实成本拆解与边界说明",
        whyParagraphs: [
            "这 29 不是模型调用费，也不是积分充值。你购买的是一个已经准备好的创作环境，以及 6 个月内的部署、配置、安全接入、模型兼容和基础维护。",
            "你的模型账号仍归你，模型费用仍直接付给渠道方；我们不扣你的平台积分，也不把你的 API 用量加价出售。",
            "按 6 个月收费，是因为模型接口、部署环境和创作工具需要持续维护，而不是一次配置后就永远不管。我们把服务周期、责任范围和续费时间写清楚，让你知道这笔钱具体买到了什么。",
            "更关键的是：这相当于你以极低成本雇佣了一个专属研发后盾。这个项目本身就是开发者日常自用、并与一线顶尖短剧团队深度共建的产物。我们会根据大家的使用和反馈进行实时更新，上游接口变了我们第一时间修，新模型发布了我们第一时间接，持续优化你的出片体验。",
            "你不该把时间花在部署、排错和追接口变化上；把模型带来，剩下的基础工作与持续进化交给我们。",
        ],
        ctaButton: "立即开通创作主场",
        requestButton: "未列出渠道？申请协议接入",
        modalTitle: "提交未支持渠道适配申请",
        modalSubtitle: "告诉我们你正在使用的渠道，我们将在评估适配完成后通知您购买开通。",
        modalSafetyTitle: "严正安全红线",
        modalSafetyText: "请不要发送 API Key、Secret、Authorization Header 或账号密码！提交申请不代表一定接入，也不会触发任何扣费。",
        formChannelName: "渠道名称 / 平台提供商",
        formChannelPlaceholder: "例如：你自己的模型 API 服务",
        formDocUrl: "官方 API 文档链接",
        formDocPlaceholder: "https://api.example.com/docs",
        formModels: "期望支持的核心模型",
        formModelsPlaceholder: "例如：Seedance 2.5, Kling 3.0 Pro, MiniMax H3",
        formProtocol: "协议规范类型",
        formContact: "您的联系方式（选填）",
        formContactPlaceholder: "邮箱或社交账号（适配完成后第一时间通知您）",
        formSubmit: "提交适配申请",
        formCancel: "取消",
        requestSuccess: "申请已成功提交！官方将在 3 个工作日内评估适配，完成后第一时间通知您。感谢与我们共同打磨！",
        protocolOpenAi: "OpenAI 兼容协议",
        protocolGemini: "Google Gemini 原生协议",
        protocolClaude: "Anthropic Claude 协议",
        protocolCustom: "自研 / 私有 / 其他格式",
        monthlyEquivalent: "折合 {amount}/月",
    },
    "zh-HK": {
        badge: "自帶模型 · 模型費用零加價",
        coCreationBadge: "開發者自用 · 頂級短劇共建",
        title: "創作主場",
        subtitle: "你的模型已經就位，創作只管開始。",
        price: "$25 USD",
        period: "/ 6 個月",
        priceNote: "一次開通，獲得 6 個月的環境服務與基礎維護。",
        summary:
            "帶上你自己的模型渠道，我哋負責將創作工作台、模型接入同日常維護準備好。模型費用依然由你直接支付畀渠道方；DramaCanvas 唔扣平台點數，亦唔會從你嘅模型調用中加價。更重要的是：這個工作台源於開發者日常自用，並由多位一線頂級短劇導演與團隊深度共建優化，我哋會根據創作者嘅實際使用同痛點即時更新——相當於為你嘅團隊配備咗專屬 AI 工作流工程師。",
        includedTitle: "包含環境與服務權益：",
        includedItems: [
            "連接 1 個自帶模型，支援隨時更換 Key 與同步模型清單",
            "畫布中調用自帶模型：0 平台抽成、不扣平台點數",
            "已就緒創作工作台：免配顯卡、Python 與 ComfyUI",
            "包含 {period}環境服務、協議相容維護與基礎故障排除",
            "開發者隨自用高頻維護，協議微調時快速熱更新相容",
            "與一線頂級短劇團隊共建的連貫性工作流持續開放",
            "支援一鍵申請適配新第三方渠道與介面協議",
        ],
        boundariesTitle: "不包含與價格邊界說明：",
        boundariesItems: [
            "任何模型調用額度、第三方 API 費用或第三方帳號費用（仍由你直接付畀渠道方）",
            "任意小眾渠道、非標私有協議或專屬工作流嘅無限制相容保證",
            "獨立 VPS、SSH 權限、專屬獨立後端部署、資料庫維運（如需獨佔實例需走私有化方案）",
            "第三方模型嘅價格變動、速率限流、內容審核策略、網絡穩定性與輸出質量保證",
        ],
        whyTitle: "查看真實成本拆解與邊界說明",
        whyParagraphs: [
            "這 29 不是模型調用費，也不是點數充值。你購買嘅係一個已經準備好嘅創作環境，以及 6 個月內嘅部署、配置、安全接入、模型相容和基礎維護。",
            "你的模型帳號仍歸你，模型費用仍直接付畀渠道方；我們不扣你的平台點數，也不把你的 API 用量加價出售。",
            "按 6 個月收費，是因為模型接口、部署環境和創作工具需要持續維護，而不是一次配置後就永遠不管。我們把服務週期、責任範圍和續費時間寫清楚，讓你知道這筆錢具體買到了什麼。",
            "更關鍵嘅係：這相當於你以極低成本僱傭咗一個專屬研發後盾。這個項目本身就係開發者日常自用、並與一線頂尖短劇團隊深度共建嘅產物。我們會根據大家嘅使用同反饋進行即時更新，上游接口變咗我們第一時間修，新模型發布咗我們第一時間接，持續優化你嘅出片體驗。",
            "你不該把時間花在部署、排錯和追接口變化上；把模型帶來，剩下的基礎工作與持續進化交給我們。",
        ],
        ctaButton: "立即開通創作主場",
        requestButton: "未列出渠道？申請協議接入",
        modalTitle: "提交未支援渠道適配申請",
        modalSubtitle: "話畀我哋知你正喺度使用嘅渠道，我哋將在評估適配完成後通知你購買開通。",
        modalSafetyTitle: "嚴正安全紅線",
        modalSafetyText: "請不要發送 API Key、Secret、Authorization Header 或帳號密碼！提交申請不代表一定接入，亦絕不會觸發任何扣費。",
        formChannelName: "渠道名稱 / 平台提供商",
        formChannelPlaceholder: "例如：你自己的模型 API 服務",
        formDocUrl: "官方 API 文檔連結",
        formDocPlaceholder: "https://api.example.com/docs",
        formModels: "期望支援嘅核心模型",
        formModelsPlaceholder: "例如：Seedance 2.5, Kling 3.0 Pro, MiniMax H3",
        formProtocol: "協議規範類型",
        formContact: "你嘅聯絡方式（選填）",
        formContactPlaceholder: "電郵或社交帳號（適配完成後第一時間通知你）",
        formSubmit: "提交適配申請",
        formCancel: "取消",
        requestSuccess: "申請已成功提交！官方將在 3 個工作天內評估適配，完成後第一時間通知你。感謝與我哋共同打磨！",
        protocolOpenAi: "OpenAI 相容協議",
        protocolGemini: "Google Gemini 原生協議",
        protocolClaude: "Anthropic Claude 協議",
        protocolCustom: "自研 / 私有 / 其他格式",
        monthlyEquivalent: "折合 {amount}/月",
    },
    "zh-TW": {
        badge: "自帶模型 · 模型費用零加價",
        coCreationBadge: "開發者自用 · 頂級短劇共建",
        title: "創作主場",
        subtitle: "你的模型已經就位，創作只管開始。",
        price: "$25 USD",
        period: "/ 6 個月",
        priceNote: "一次開通，獲得 6 個月的環境服務與基礎維護。",
        summary:
            "帶上你自己的模型渠道，我們負責把創作工作台、模型接入和日常維護準備好。模型費用仍由你直接支付給渠道方；DramaCanvas 不扣平台點數，也不從你的模型調用中加價。更重要的是：這個工作台源於開發者日常自用，並由多位一線頂級短劇導演與團隊深度共建優化，我們會根據創作者的實際使用與痛點即時更新——相當於為你的團隊配備了專屬 AI 工作流程工程師。",
        includedTitle: "包含環境與服務權益：",
        includedItems: [
            "連接 1 個自帶模型，支援隨時更換 Key 與同步模型清單",
            "畫布中調用自帶模型：0 平台抽成、不扣平台點數",
            "已就緒創作工作台：免配顯卡、Python 與 ComfyUI",
            "包含 {period}環境服務、協議相容維護與基礎故障排除",
            "開發者隨自用高頻維護，協議微調時快速熱更新相容",
            "與一線頂級短劇團隊共建的連貫性工作流持續開放",
            "支援一鍵申請適配新第三方渠道與介面協議",
        ],
        boundariesTitle: "不包含與價格邊界說明：",
        boundariesItems: [
            "任何模型調用額度、第三方 API 費用或第三方帳號費用（仍由你直接付給渠道方）",
            "任意小眾渠道、非標私有協議或專屬工作流程的無限制相容保證",
            "獨立 VPS、SSH 權限、專屬獨立後端部署、資料庫維運（如需獨占實例需走私有化方案）",
            "第三方模型的價格變動、速率限流、內容審核策略、網路穩定性與輸出品質保證",
        ],
        whyTitle: "查看真實成本拆解與邊界說明",
        whyParagraphs: [
            "這 29 不是模型調用費，也不是點數儲值。你購買的是一個已經準備好的創作環境，以及 6 個月內的部署、配置、安全接入、模型相容和基礎維護。",
            "你的模型帳號仍歸你，模型費用仍直接付給渠道方；我們不扣你的平台點數，也不把你的 API 用量加價出售。",
            "按 6 個月收費，是因為模型接口、部署環境和創作工具需要持續維護，而不是一次配置後就永遠不管。我們把服務週期、責任範圍和續費時間寫清楚，讓你知道这筆錢具體買到了什麼。",
            "更關鍵的是：這相當於你以極低成本僱傭了一個專屬研發後盾。這個專案本身就是開發者日常自用、並與一線頂尖短劇團隊深度共建的產物。我們會根據大家的使用和反饋進行即時更新，上游接口變了我們第一時間修，新模型發布了我們第一時間接，持續優化你的出片體驗。",
            "你不該把時間花在部署、排錯和追接口變化上；把模型帶來，剩下的基礎工作與持續進化交給我們。",
        ],
        ctaButton: "立即開通創作主場",
        requestButton: "渠道未支援？免費提交適配申請",
        modalTitle: "提交未支援渠道適配申請",
        modalSubtitle: "告訴我們你正在使用的渠道，我們將在評估適配完成後通知你購買開通。",
        modalSafetyTitle: "嚴正安全紅線",
        modalSafetyText: "請不要發送 API Key、Secret、Authorization Header 或帳號密碼！提交申請不代表一定接入，也絕不會觸發任何扣費。",
        formChannelName: "渠道名稱 / 平台提供商",
        formChannelPlaceholder: "例如：你自己的模型 API 服務",
        formDocUrl: "官方 API 文件連結",
        formDocPlaceholder: "https://api.example.com/docs",
        formModels: "期望支援的核心模型",
        formModelsPlaceholder: "例如：Seedance 2.5, Kling 3.0 Pro, MiniMax H3",
        formProtocol: "協議規範類型",
        formContact: "你的聯絡方式（選填）",
        formContactPlaceholder: "電子郵件或社交帳號（適配完成後第一時間通知你）",
        formSubmit: "提交適配申請",
        formCancel: "取消",
        requestSuccess: "申請已成功提交！官方將在 3 個工作天內評估適配，完成後第一時間通知你。感謝與我們共同打磨！",
        protocolOpenAi: "OpenAI 相容協議",
        protocolGemini: "Google Gemini 原生協議",
        protocolClaude: "Anthropic Claude 協議",
        protocolCustom: "自研 / 私有 / 其他格式",
        monthlyEquivalent: "折合 {amount}/月",
    },
    "en-US": {
        badge: "Your APIs · No platform model markup",
        coCreationBadge: "Dogfooded by Devs · Built with Top Creators",
        title: "BYOK Studio Pass",
        subtitle: "Your models are ready. Just start creating.",
        price: "$25 USD",
        period: "/ 6 Months",
        priceNote: "One-time activation for 6 months of hosted environment, agile updates, and maintenance.",
        summary:
            "Bring your own model channels; we handle the pre-deployed storyboard canvas, model connectivity, and ongoing maintenance. You pay your model provider directly at raw cost; DramaCanvas takes zero cuts and deducts zero platform credits. Crucially, this studio is daily dogfooded by our engineers and co-developed with top-tier film and short-drama directors. We push real-time updates based on your actual production needs—acting as your dedicated on-call AI workflow developer.",
        includedTitle: "Included Environment & Service Benefits:",
        includedItems: [
            "Connect 1 custom model channel: change API keys & sync model rosters anytime",
            "Zero platform markup & 0 credits deducted on canvas generations",
            "Pre-deployed cloud workspace; skip GPUs, Python & ComfyUI setup",
            "6-month environment uptime & foundational protocol maintenance",
            "High-frequency dev dogfooding; fast hotfix updates on protocol shifts",
            "Continuous access to industrial filmmaker-grade consistency workflows",
            "1-click submission for newly released model channels & custom protocols",
        ],
        boundariesTitle: "Scope & Boundaries (Infrastructure Protection):",
        boundariesItems: [
            "Does not include model call quotas, third-party API bills, or external account subscription costs",
            "No warranty of universal compatibility for arbitrary non-standard private protocols",
            "Does not include dedicated VPS instances, root SSH access, or private backend instances",
            "No liability over third-party model rate limits, price shifts, content moderation, or output quality",
        ],
        whyTitle: "View transparent cost breakdown & boundaries",
        whyParagraphs: [
            "This $25 is neither a model fee nor a credit pack. You are purchasing a fully prepared, zero-setup production environment with 6 months of hosting, secure proxying, and continuous protocol maintenance.",
            "Your model account remains yours, and you pay providers directly. We take zero margins, zero cuts, and deduct zero platform credits.",
            "We charge for 6 months because AI model APIs, cloud runtimes, and creative tools require persistent maintenance, rather than a one-time setup that is abandoned. Clear scopes and transparent timelines guarantee you know exactly what you're paying for.",
            "Crucially, you gain an on-call AI workflow engineering team: this project is born from daily developer dogfooding and co-developed with top short-drama creators. When upstream specs shift or new models drop, we adapt them immediately based on your real-world feedback.",
            "Your creative hours shouldn't be wasted debugging servers, fixing proxy timeouts, or chasing API changelogs. Bring your models; leave the infrastructure and evolution to us.",
        ],
        ctaButton: "Get BYOK Studio Pass",
        requestButton: "Unlisted channel? Request adapter",
        modalTitle: "Request Unlisted Channel Adapter",
        modalSubtitle: "Tell us what channel you're using. We will evaluate compatibility and notify you once ready.",
        modalSafetyTitle: "Strict Security Red Line",
        modalSafetyText: "Do NOT submit API Keys, Secrets, Authorization Headers, or passwords! Submissions are for protocol analysis only.",
        formChannelName: "Channel Provider / Platform Name",
        formChannelPlaceholder: "e.g., your own model API service",
        formDocUrl: "Official API Documentation URL",
        formDocPlaceholder: "https://api.example.com/docs",
        formModels: "Key Models to Support",
        formModelsPlaceholder: "e.g., Seedance 2.5, Kling 3.0 Pro, MiniMax H3",
        formProtocol: "Protocol Standard",
        formContact: "Contact Info (Optional)",
        formContactPlaceholder: "Email or handle (we notify you once supported)",
        formSubmit: "Submit Adapter Request",
        formCancel: "Cancel",
        requestSuccess: "Request submitted! Our team will evaluate protocol compatibility within 3 business days.",
        protocolOpenAi: "OpenAI Compatible Protocol",
        protocolGemini: "Google Gemini Native Protocol",
        protocolClaude: "Anthropic Claude Protocol",
        protocolCustom: "In-house / Private / Other Standard",
        monthlyEquivalent: "~{amount}/mo",
    },
    "ja-JP": {
        badge: "自分のAPIキーで制作 · モデル利用料への上乗せなし",
        coCreationBadge: "開発者自用 · 一流ドラマ共建",
        title: "BYOKスタジオパス",
        subtitle: "モデルは準備完了。創作を今すぐ始めよう。",
        price: "$25 USD",
        period: "/ 6ヶ月",
        priceNote: "6ヶ月間のアトリエ環境、連携保守、高速アップデートが含まれます。",
        summary:
            "お持ちのモデルチャンネルを持ち込めば、ワークスペース準備と連携・保守はDramaCanvasが担当。プラットフォーム手数料0・クレジット消費なし。開発者が毎日自用し、一流短編ドラマ制作チームと共同開発。現場の課題をリアルタイムにアップデートします。",
        includedTitle: "含まれる制作環境とサポート特典：",
        includedItems: [
            "独自モデルチャンネルを1つ接続、Key変更やモデル一覧同期に対応",
            "キャンバス生成で自前モデル使用時、プラットフォーム手数料0・クレジット無消費",
            "クラウド上で即利用可能。GPU調達やPython、ComfyUIの構築不要",
            "{period}間の環境稼働保証と基本障害サポート",
            "開発者自用による高頻度メンテナンス、上流プロトコル変更も迅速対応",
            "トップ短編制作チームと共同開発した一貫性ワークフローを継続提供",
            "新しいサードパーティAPIやプロトコル連携のリクエストが可能",
        ],
        boundariesTitle: "サービス対象外と境界について：",
        boundariesItems: [
            "サードパーティAPI料金やモデル利用料（各プロバイダーへ直接お支払い）",
            "あらゆる非標準プライベートプロトコルの無制限な動作保証",
            "専用独立VPS、SSH権限、プライベートサーバー（専用環境は個別相談）",
            "サードパーティモデルのレート制限、規約改定、品質変動",
        ],
        whyTitle: "透明なコスト内訳とサービス境界を確認",
        whyParagraphs: [
            "この料金はモデルの利用料ではありません。準備済みの創作環境と、6ヶ月間の保守・プロトコル対応を提供する費用です。",
            "モデルの契約はお客様のもの。DramaCanvasがトークンを中抜きすることはありません。",
            "APIやツールの仕様変更に追従し続けるため、半年ごとの安心保守サイクルを採用しています。",
            "開発者が自ら毎日使い、トップクリエイターと磨き上げているため、専属エンジニアがいるような迅速な対応を受けられます。",
            "面倒なインフラ設定は任せて、創作に専念してください。",
        ],
        ctaButton: "BYOKスタジオパスを契約",
        requestButton: "未対応チャンネル？連携を申請",
        modalTitle: "未対応チャンネル連携リクエスト",
        modalSubtitle: "ご利用中のプロバイダーをご連絡ください。検証完了後にお知らせします。",
        modalSafetyTitle: "セキュリティに関する厳重注意",
        modalSafetyText: "API Keyやパスワードは絶対に送信しないでください！仕様書の確認のみに使用します。",
        formChannelName: "チャンネル名 / プロバイダー",
        formChannelPlaceholder: "例：ご自身のモデル API サービス",
        formDocUrl: "公式APIドキュメントURL",
        formDocPlaceholder: "https://api.example.com/docs",
        formModels: "希望モデル",
        formModelsPlaceholder: "例：Seedance 2.5, Kling 3.0 Pro, MiniMax H3",
        formProtocol: "プロトコル規格",
        formContact: "連絡先（任意）",
        formContactPlaceholder: "メールアドレス等",
        formSubmit: "申請を送信",
        formCancel: "キャンセル",
        requestSuccess: "申請を受け付けました！3営業日以内に検証いたします。",
        protocolOpenAi: "OpenAI 互換プロトコル",
        protocolGemini: "Google Gemini ネイティブプロトコル",
        protocolClaude: "Anthropic Claude プロトコル",
        protocolCustom: "自社開発 / プライベート / その他",
        monthlyEquivalent: "月額換算 約{amount}",
    },
    "ko-KR": {
        badge: "내 API 키로 제작 · 모델 이용료 추가 마진 없음",
        coCreationBadge: "개발자 매일 사용 · 숏드라마 공동 개발",
        title: "BYOK 스튜디오 패스",
        subtitle: "모델은 이미 준비되었습니다. 창작을 시작하세요.",
        price: "$25 USD",
        period: "/ 6개월",
        priceNote: "6개월간의 호스팅 환경, 프로토콜 유지보수, 실시간 업데이트 포함.",
        summary: "자체 모델 채널을 연동하세요. 워크스페이스 준비와 프로토콜 관리, 유지보수는 DramaCanvas가 전담합니다. 수수료 0%, 크레딧 차감 없음. 개발자가 매일 직접 사용하고 정상급 제작진과 함께 고도화합니다.",
        includedTitle: "포함된 환경 및 서비스 혜택：",
        includedItems: [
            "자체 모델 채널 1개 연결, API Key 교체 및 모델 목록 동기화 지원",
            "캔버스 생성 시 자체 모델 호출: 플랫폼 수수료 0%, 크레딧 차감 0",
            "클라우드 즉시 사용 가능: GPU, 파이썬, ComfyUI 설정 불필요",
            "{period}간의 안정적인 환경 서비스 및 기초 장애 지원 제공",
            "개발자의 매일 사용을 통한 고빈도 유지보수 및 프로토콜 변경 신속 대응",
            "정상급 제작진과 함께 검증한 연속성 워크플로 도구 지속 제공",
            "새로운 서드파티 채널 및 프로토콜 지원 1클릭 신청",
        ],
        boundariesTitle: "서비스 제외 항목 및 경계 안내：",
        boundariesItems: [
            "모델 호출 비용, 서드파티 API 요금 (해당 업체에 직접 결제)",
            "모든 비표준 사설 프로토콜에 대한 무제한 호환성 보장",
            "독립 VPS, SSH 루트 권한, 전용 백엔드 인스턴스 (단독 인스턴스는 별도 문의)",
            "서드파티 업체의 레이트리밋, 정책 변경 및 출력 품질",
        ],
        whyTitle: "투명한 비용 분석 및 서비스 경계 확인",
        whyParagraphs: [
            "이 $25는 모델 사용료나 크레딧 충전이 아닙니다. 즉시 사용 가능한 환경과 6개월간의 유지보수 비용입니다.",
            "모델 계정은 본인 소유이며 원가 그대로 이용합니다. 플랫폼 차익은 없습니다.",
            "API 스펙과 환경이 지속적으로 변하므로 6개월 단위의 책임 있는 유지보수를 제공합니다.",
            "개발자가 직접 매일 쓰고 크리에이터들과 함께 개선하여 전담 엔지니어가 있는 효과를 누릴 수 있습니다.",
            "서버와 환경 문제로 고민하지 마시고 창작에만 집중하세요.",
        ],
        ctaButton: "스튜디오 패스 시작하기",
        requestButton: "목록에 없는 채널? 프로토콜 연동 신청",
        modalTitle: "미지원 채널 연동 요청",
        modalSubtitle: "사용 중인 채널을 알려주시면 호환성 평가 후 안내해 드립니다.",
        modalSafetyTitle: "보안 주의사항",
        modalSafetyText: "API Key, Secret, 비밀번호는 절대 입력하지 마세요! 인터페이스 규격 확인용입니다.",
        formChannelName: "채널명 / 제공업체",
        formChannelPlaceholder: "예: 직접 사용하는 모델 API 서비스",
        formDocUrl: "공식 API 문서 링크",
        formDocPlaceholder: "https://api.example.com/docs",
        formModels: "희망 지원 모델",
        formModelsPlaceholder: "예: Seedance 2.5, Kling 3.0 Pro, MiniMax H3",
        formProtocol: "프로토콜 유형",
        formContact: "연락처 (선택)",
        formContactPlaceholder: "이메일 주소 등",
        formSubmit: "연동 요청 제출",
        formCancel: "취소",
        requestSuccess: "요청이 접수되었습니다! 영업일 기준 3일 이내에 검토해 드립니다.",
        protocolOpenAi: "OpenAI 호환 프로토콜",
        protocolGemini: "Google Gemini 네이티브 프로토콜",
        protocolClaude: "Anthropic Claude 프로토콜",
        protocolCustom: "자체 개발 / 비공개 / 기타 형식",
        monthlyEquivalent: "월 약 {amount}",
    },
    "es-ES": {
        badge: "Tus propias API · Sin recargo sobre los modelos",
        coCreationBadge: "Uso diario técnico · Co-creado con cineastas",
        title: "Pase de Estudio BYOK",
        subtitle: "Tus modelos ya están listos. Solo empieza a crear.",
        price: "$25 USD",
        period: "/ 6 Meses",
        priceNote: "Acceso de 6 meses al entorno en la nube, mantenimiento y actualizaciones ágiles.",
        summary:
            "Trae tus propios canales de modelos. DramaCanvas se encarga del espacio de trabajo, la integración y el mantenimiento continuo. Cero comisiones, 0 créditos deducidos. Usado a diario por nuestro equipo técnico y optimizado junto a directores de miniseries.",
        includedTitle: "Entorno Incluido y Ventajas de Servicio:",
        includedItems: [
            "Conecta 1 canal privado de modelos, cambia claves API y sincroniza listas",
            "0 comisiones de plataforma y 0 créditos deducidos al generar en el lienzo",
            "Espacio de trabajo listo en la nube; sin instalaciones de GPU, Python o ComfyUI",
            "{period} de disponibilidad garantizada y soporte básico de incidencias",
            "Mantenimiento frecuente por uso diario del equipo y rápida adaptación a cambios",
            "Acceso continuo a herramientas de consistencia desarrolladas con cineastas",
            "Solicitud en 1 clic para adaptar nuevos canales y protocolos de terceros",
        ],
        boundariesTitle: "Límites y Alcance del Servicio:",
        boundariesItems: [
            "No incluye cuotas de llamadas a modelos ni facturación de API de terceros",
            "No garantiza compatibilidad universal para protocolos privados no estándar",
            "No incluye servidores VPS dedicados, accesos SSH ni bases de datos exclusivas",
            "Sin responsabilidad por límites de velocidad o cambios de precio del proveedor",
        ],
        whyTitle: "Ver desglose transparente de costes y límites",
        whyParagraphs: [
            "Estos $25 no son para saldo de modelos, sino para disponer de un entorno en la nube ya configurado con 6 meses de soporte continuo.",
            "Tus cuentas de modelos siguen siendo tuyas y pagas a tu proveedor directamente sin recargos.",
            "Cobramos por 6 meses porque las APIs y herramientas requieren mantenimiento persistente.",
            "Al estar co-desarrollado con creadores y usado a diario por nosotros, tienes un equipo técnico detrás resolviendo cualquier fricción.",
            "No pierdas tiempo configurando servidores ni adaptando APIs; trae tus modelos y nosotros nos encargamos del resto.",
        ],
        ctaButton: "Obtener Pase de Estudio BYOK",
        requestButton: "¿Canal no listado? Solicitar adaptador",
        modalTitle: "Solicitar Adaptación de Canal No Listado",
        modalSubtitle: "Indícanos tu proveedor y evaluaremos la integración técnica.",
        modalSafetyTitle: "Aviso Estricto de Seguridad",
        modalSafetyText: "¡NO envíes claves API, secrets ni contraseñas! Solo analizamos documentación técnica pública.",
        formChannelName: "Nombre del Canal / Proveedor",
        formChannelPlaceholder: "Ej.: tu propio servicio de API de modelos",
        formDocUrl: "Enlace a Documentación API Oficial",
        formDocPlaceholder: "https://api.example.com/docs",
        formModels: "Modelos Clave Requeridos",
        formModelsPlaceholder: "Ej: Seedance 2.5, Kling 3.0 Pro, MiniMax H3",
        formProtocol: "Tipo de Protocolo",
        formContact: "Contacto (Opcional)",
        formContactPlaceholder: "Email o usuario para avisarte",
        formSubmit: "Enviar Solicitud",
        formCancel: "Cancelar",
        requestSuccess: "¡Solicitud recibida! La evaluaremos en un plazo de 3 días laborables.",
        protocolOpenAi: "Protocolo compatible con OpenAI",
        protocolGemini: "Protocolo nativo de Google Gemini",
        protocolClaude: "Protocolo de Anthropic Claude",
        protocolCustom: "Desarrollo propio / Privado / Otro formato",
        monthlyEquivalent: "Aprox. {amount}/mes",
    },
};

/**
 * 创作主场 (BYOK Studio Pass) 卡片
 * 仅在独立创作主场栏目展示；环境服务不混入普通积分会员。
 */
export function ByokPlanCard({
    t,
    checkoutBusy,
    onChoose,
    onRequestAdapter,
    onViewCost,
    exclusiveBenefitKeys = [],
}: {
    t: (key: string, values?: Record<string, string | number>) => string;
    checkoutBusy: boolean;
    onChoose: () => void;
    onRequestAdapter: () => void;
    onViewCost: () => void;
    exclusiveBenefitKeys?: string[];
}) {
    const { locale } = useI18n();
    const content = BYOK_TEXTS[locale as BlogLocale] || BYOK_TEXTS["en-US"];
    const billingCurrency = "USD" as const;
    const user = useUserStore((state) => state.user);
    const options = useQuery({ queryKey: ["payment-options", user?.id], queryFn: getPaymentOptions, retry: false, staleTime: 30_000 });
    const service = useByokStatus();
    const serviceSub = service.data?.subscription;
    // 一次性购买的服务（含免费试用）和已设为到期不续费的老订阅都可以继续购买，有效期顺延。
    const renewable = Boolean(serviceSub && ((serviceSub.provider === "waffo" && !serviceSub.providerSubscriptionId) || (serviceSub.provider === "stripe" && serviceSub.cancelAtPeriodEnd)));
    const existingService = !renewable && ["checkout_pending", "pending_activation", "incomplete", "active", "trialing", "past_due", "unpaid", "paused"].includes(serviceSub?.status || "");
    const offer = options.isSuccess && !options.isFetching && options.data?.byokProduct?.enabled ? options.data.byokProduct : undefined;
    const currency = offer?.currency || "USD";
    const price = offer ? formatDisplayMoney(offer.amountMinor, currency, locale) : "—";
    const originalPrice = offer?.originalAmountMinor && offer.originalAmountMinor > offer.amountMinor ? formatDisplayMoney(offer.originalAmountMinor, currency, locale) : "";
    const period = subscriptionIntervalLabel(offer?.interval, offer?.intervalCount);
    const months = (offer?.intervalCount || 1) * (offer?.interval === "year" ? 12 : 1);
    const monthlyEquivalent = offer ? content.monthlyEquivalent.replace("{amount}", formatDisplayMoney(offer.amountMinor / months, currency, locale)) : "";
    const checkoutReady = options.isSuccess && !options.isFetching && options.data?.byokCheckoutReady === true && Boolean(offer) && (!user || (service.isSuccess && !service.isFetching && service.data.checkoutReady));
    const trialText = BYOK_TRIAL_TEXTS[locale as BlogLocale] || BYOK_TRIAL_TEXTS["en-US"];
    const savePercent = offer?.originalAmountMinor && offer.originalAmountMinor > offer.amountMinor ? Math.round((1 - offer.amountMinor / offer.originalAmountMinor) * 100) : 0;
    // Signed-out visitors see the trial too: every new account starts with it. The server decides at checkout.
    const trialMonths = service.data?.trialMonths || 6;
    const trialOffer = Boolean(offer) && !existingService && (!user || service.data?.trialEligible === true);

    const copy = pricingUxCopy(locale);
    return (
        <section className="sa-byok-studio" data-byok-dedicated="true" data-display-currency={displayCurrency(locale)} aria-label={content.title}>
            <div className="sa-byok-master">
                <header className="sa-byok-overview">
                    <span className="sa-byok-eyebrow">BYOK · {content.title}</span>
                    <h1>{t("pricing.byokValueTitle")}</h1>
                    <p className="sa-byok-lead">{t("pricing.byokValueIntro")}</p>
                    <ul className="sa-byok-facts">
                        {["pricing.byokPain1", "pricing.byokPain2", "pricing.byokPain3"].map((key) => (
                            <li key={key}>
                                <Check aria-hidden />
                                {t(key)}
                            </li>
                        ))}
                    </ul>
                </header>
                <RollingValueGroup className="sa-byok-offer">
                    <span className="sa-byok-eyebrow">{t("pricing.byokMetaZeroMarkup")}</span>
                    <h2>{content.title}</h2>
                    <div className="sa-byok-price-row">
                        <strong>
                            <RollingValue animateOnMount value={price} />
                        </strong>
                        <span>{offer ? t(period.key, period.values) : "—"}</span>
                        {originalPrice ? <s>{originalPrice}</s> : null}
                        {savePercent > 0 ? <em className="sa-byok-save">{trialText.save.replace("{percent}", String(savePercent))}</em> : null}
                    </div>
                    <p>{monthlyEquivalent}</p>
                    {offer ? <p data-settlement-currency={currency}>{t("pricing.actualCharge", { amount: formatPaymentAmount(offer.amountMinor, currency, locale) })}</p> : null}
                    <p className="sa-byok-fee-boundary">{t("pricing.byokFeeBoundary")}</p>
                    <button
                        className="sa-byok-primary"
                        type="button"
                        disabled={checkoutBusy}
                        onClick={
                            existingService
                                ? () => document.querySelector(".sa-byok-account")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })
                                : checkoutReady
                                  ? onChoose
                                  : onViewCost
                        }
                    >
                        {checkoutBusy
                            ? t("pricing.creatingCheckout")
                            : existingService
                              ? t("pricing.byokManageTitle")
                              : checkoutReady
                                ? trialOffer
                                    ? trialText.trialCta.replace("{months}", String(trialMonths))
                                    : content.ctaButton
                                : t("pricing.byokValueAction")}
                    </button>
                    <PaymentMethodsMiniRow paymentProviders={options.data?.paymentProviders || []} locale={locale} />
                    {checkoutReady && trialOffer ? <small className="sa-byok-trial-note">{trialText.trialNote.replace("{price}", price)}</small> : null}
                    {!checkoutReady && !existingService ? <small role="status">{copy.servicePreview}</small> : null}
                    <div className="sa-byok-offer-links">
                        <button type="button" onClick={onRequestAdapter}>
                            {content.requestButton}
                            <ChevronRight aria-hidden />
                        </button>
                        <button type="button" onClick={onViewCost}>
                            {content.whyTitle}
                        </button>
                    </div>
                </RollingValueGroup>
                <div className="sa-byok-suite">
                    <h3>{copy.suiteTitle}</h3>
                    <ul>
                        {copy.suiteTags.map((tag) => (
                            <li key={tag}>{tag}</li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="sa-byok-pillars">
                {[1, 2, 3].map((item) => (
                    <article key={item}>
                        <span className="sa-byok-step-number" aria-hidden>
                            {String(item).padStart(2, "0")}
                        </span>
                        <h3>{t(`pricing.byokPain${item}`)}</h3>
                        <p>{t(`pricing.byokGain${item}`)}</p>
                        {item === 2 ? (
                            <button type="button" onClick={onViewCost}>
                                {content.whyTitle}
                                <ChevronRight aria-hidden />
                            </button>
                        ) : null}
                    </article>
                ))}
            </div>
            <ByokSavingsCalculator serviceAmountMinor={offer?.amountMinor ?? 0} months={months} configured={checkoutReady && currency.toUpperCase() === "USD"} />
            <section className="sa-byok-workflow" aria-label={copy.stepsTitle}>
                <h2>{copy.stepsTitle}</h2>
                <ol>
                    {[
                        { title: t("channels.title"), body: t("byok.step1") },
                        { title: t("pricing.byokManageTitle"), body: t("byok.step2") },
                        { title: t("byok.unbound"), body: t("byok.step3") },
                    ].map((step, index) => (
                        <li key={index}>
                            <span className="sa-byok-step-number" aria-hidden>
                                {String(index + 1).padStart(2, "0")}
                            </span>
                            <h3>{step.title}</h3>
                            <p>{step.body}</p>
                        </li>
                    ))}
                </ol>
            </section>
            <section className="sa-byok-protocols" aria-label={copy.protocolTitle}>
                <h2>{copy.protocolTitle}</h2>
                <div>
                    {[content.protocolOpenAi, content.protocolGemini, content.protocolClaude, content.protocolCustom].map((protocol) => (
                        <span key={protocol}>{protocol}</span>
                    ))}
                </div>
                <p>{copy.protocolNote}</p>
                <button type="button" onClick={onRequestAdapter}>
                    {content.requestButton}
                    <ChevronRight aria-hidden />
                </button>
            </section>
            <section className="sa-byok-details">
                <h2>{copy.faqTitle}</h2>
                <details open>
                    <summary>{content.includedTitle}</summary>
                    <ul>
                        {content.includedItems
                            .map((item) => item.replace("{period}", offer ? t(period.key, period.values) : "—"))
                            .map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                    </ul>
                </details>
                <details>
                    <summary>{content.boundariesTitle}</summary>
                    <ul>
                        {content.boundariesItems.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </details>
                {exclusiveBenefitKeys.length ? (
                    <details>
                        <summary>{t("pricing.exclusiveFeatures")}</summary>
                        <ul>
                            {exclusiveBenefitKeys.map((key) => (
                                <li key={key}>{t(key)}</li>
                            ))}
                        </ul>
                    </details>
                ) : null}
            </section>
            <ByokServiceControls />
        </section>
    );
}

/**
 * 安全渠道适配申请弹窗
 * 拦截 API Key / 密码，仅收集公开协议与文档
 */
export function ByokAdapterModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (msg: string) => void }) {
    const { locale, t } = useI18n();
    const user = useUserStore((state) => state.user);
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const content = BYOK_TEXTS[locale as BlogLocale] || BYOK_TEXTS["en-US"];
    const [channelName, setChannelName] = useState("");
    const [docUrl, setDocUrl] = useState("");
    const [models, setModels] = useState("");
    const [protocol, setProtocol] = useState("openai");
    const [contact, setContact] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const submitLock = useRef(false);
    const active = useRef(open);
    active.current = open;
    const requestGeneration = useRef(0);
    useEffect(() => {
        active.current = open;
        requestGeneration.current += 1;
        submitLock.current = false;
        setSubmitted(false);
        setSubmitError("");
        return () => {
            requestGeneration.current += 1;
            active.current = false;
        };
    }, [open, user?.id]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitLock.current) return;
        if (!user) {
            navigate(`/login?next=${encodeURIComponent(location.pathname + "?plan=byok&adapter=1")}`);
            return;
        }
        const generation = requestGeneration.current;
        submitLock.current = true;
        setSubmitted(true);
        setSubmitError("");
        try {
            const result = await submitByokRequest({ channelName, docUrl, models, protocol, contact });
            await queryClient.invalidateQueries({ queryKey: ["byok-requests", user.id] });
            if (!active.current || generation !== requestGeneration.current) return;
            onSuccess(t("pricing.byokSubmitSaved", { id: result.request.id }));
            setChannelName("");
            setDocUrl("");
            setModels("");
            setContact("");
            onClose();
        } catch (error) {
            if (active.current && generation === requestGeneration.current) setSubmitError(error instanceof Error ? error.message : t("pricing.catalogLoadError"));
        } finally {
            if (generation === requestGeneration.current) {
                submitLock.current = false;
                if (active.current) setSubmitted(false);
            }
        }
    };

    return (
        <div className="libtv-byok-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="byok-modal-title">
            <div className="libtv-byok-modal">
                <header className="libtv-byok-modal-header">
                    <div>
                        <h3 id="byok-modal-title">{content.modalTitle}</h3>
                        <p>{content.modalSubtitle}</p>
                    </div>
                    <button type="button" className="libtv-byok-modal-close" onClick={onClose} aria-label={content.formCancel}>
                        <X aria-hidden />
                    </button>
                </header>

                <div className="libtv-byok-modal-safety">
                    <ShieldAlert aria-hidden />
                    <div>
                        <strong>{content.modalSafetyTitle}</strong>
                        <p>{content.modalSafetyText}</p>
                    </div>
                </div>
                <p className="libtv-byok-adapter-contact">
                    <a href={`mailto:${SUPPORT_EMAIL}`}>
                        {t("pricing.contactSupport")}: {SUPPORT_EMAIL}
                    </a>
                    <LegacySupportEmail />
                </p>

                <form onSubmit={(event) => void handleSubmit(event)} className="libtv-byok-form">
                    {submitError ? <p role="alert">{submitError}</p> : null}
                    <div className="libtv-byok-form-field">
                        <label>{content.formChannelName} *</label>
                        <input type="text" required placeholder={content.formChannelPlaceholder} value={channelName} maxLength={120} onChange={(e) => setChannelName(e.target.value)} />
                    </div>

                    <div className="libtv-byok-form-field">
                        <label>{content.formDocUrl}</label>
                        <input type="url" placeholder={content.formDocPlaceholder} value={docUrl} maxLength={1024} onChange={(e) => setDocUrl(e.target.value)} />
                    </div>

                    <div className="libtv-byok-form-field">
                        <label>{content.formModels} *</label>
                        <input type="text" required placeholder={content.formModelsPlaceholder} value={models} maxLength={1000} onChange={(e) => setModels(e.target.value)} />
                    </div>

                    <div className="libtv-byok-form-field">
                        <label>{content.formProtocol}</label>
                        <select value={protocol} onChange={(e) => setProtocol(e.target.value)}>
                            <option value="openai">{content.protocolOpenAi}</option>
                            <option value="gemini">{content.protocolGemini}</option>
                            <option value="claude">{content.protocolClaude}</option>
                            <option value="custom">{content.protocolCustom}</option>
                        </select>
                    </div>

                    <div className="libtv-byok-form-field">
                        <label>{content.formContact}</label>
                        <input type="text" placeholder={content.formContactPlaceholder} value={contact} maxLength={200} onChange={(e) => setContact(e.target.value)} />
                    </div>

                    <footer className="libtv-byok-modal-footer">
                        <button type="button" className="libtv-byok-btn-cancel" onClick={onClose}>
                            {content.formCancel}
                        </button>
                        <button type="submit" className="libtv-byok-btn-submit" disabled={submitted}>
                            <Send aria-hidden />
                            <span>{submitted ? "..." : user ? content.formSubmit : t("pricing.byokApplyLogin")}</span>
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}

/**
 * 真实成本拆解与边界说明弹窗
 */
export function ByokCostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { locale, t } = useI18n();
    const content = BYOK_TEXTS[locale as BlogLocale] || BYOK_TEXTS["en-US"];

    if (!open) return null;

    return (
        <div className="libtv-byok-modal-backdrop" role="dialog" aria-modal="true">
            <div className="libtv-byok-modal libtv-byok-modal--cost">
                <header className="libtv-byok-modal-header">
                    <div>
                        <h3>{content.whyTitle}</h3>
                        <p>{content.coCreationBadge}</p>
                    </div>
                    <button type="button" className="libtv-byok-modal-close" onClick={onClose} aria-label={content.formCancel}>
                        <X aria-hidden />
                    </button>
                </header>

                <div className="libtv-byok-cost-content">
                    <div className="libtv-byok-cost-paragraphs">
                        {[t("byok.fees"), t("byok.privacy")].map((p, idx) => (
                            <p key={idx}>{p}</p>
                        ))}
                    </div>

                    <div className="libtv-byok-boundaries-box">
                        <strong>
                            <AlertCircle aria-hidden />
                            {content.boundariesTitle}
                        </strong>
                        <ul>
                            {content.boundariesItems.map((item, idx) => (
                                <li key={idx}>
                                    <span className="libtv-byok-dot" aria-hidden />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <footer className="libtv-byok-modal-footer">
                    <button type="button" className="libtv-byok-btn-submit" onClick={onClose}>
                        {content.formCancel || "关闭"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
