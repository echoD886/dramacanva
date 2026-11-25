import type { BlogLocale } from "./blog-locales";
import { SIGNUP_CREDITS_COPY } from "../lib/signup-credits-copy";
import { HOME_POSITIONING } from "../lib/home-positioning";
import { GENERATION_REFUND_COPY } from "../lib/public-product-copy";

export type PublicFaq = { question: string; answer: string };
/** Reader-facing FAQs per page, written per language from real search questions (not machine-translated).
 * Keys: home, pricing, help, mcp and model page slugs. Languages without an entry keep their previous FAQ. */
export const PUBLIC_FAQS: Partial<Record<BlogLocale, Record<string, PublicFaq[]>>> = {
    "zh-CN": {
        home: [
            { question: HOME_POSITIONING["zh-CN"].question, answer: HOME_POSITIONING["zh-CN"].answer },
            { question: SIGNUP_CREDITS_COPY["zh-CN"].question, answer: SIGNUP_CREDITS_COPY["zh-CN"].answer },
            { question: "生成失败会退积分吗？", answer: GENERATION_REFUND_COPY["zh-CN"] },
            { question: "不会写提示词或不会剪辑能用吗？", answer: "完全可以。你只要用日常大白话输入故事剧情，AI 助手就会帮你拆成带景别和动作描述的分镜卡片；生成的视频片段可以在画布自带的时间线上直接拖拽排布，无需专业剪辑经验。" },
        ],
        pricing: [
            {
                question: "DramaCanvas 的订阅价格方案是怎样的？",
                answer: "标准版月付{monthly}包含 {monthlyCredits} 积分，年付{annual}包含 {annualCredits} 积分。所有方案均以美元结算，图片和视频生成共用积分，生成前显示本次最终扣费，生成失败退回积分。",
            },
            {
                question: "订阅付款后积分什么时候到账？",
                answer: "付款成功后积分就会到账。月付每个月到账一次；年付一次发放全年的积分。每次生成前，画布都会显示这次要扣多少积分。",
            },
            {
                question: "生成失败会退还积分吗？",
                answer: GENERATION_REFUND_COPY["zh-CN"],
            },
            {
                question: "积分包和会员订阅能一起用吗？",
                answer: "可以一起用。会员积分和单独购买的积分包分开记账，按钱包里设置的顺序扣除，余额都能在钱包里查看。",
            },
            {
                question: "年付订阅比按月订阅划算吗？",
                answer: "选年付更划算。标准版、进阶版、高级版选年付，交 10 个月的钱，一次性拿 12 个月的积分（豪华版约拿 11.6 个月，至尊版各周期同价），每积分折算约{annualUnit}，比月付（每积分约{monthlyUnit}）优惠不少。",
            },
            {
                question: "团队版怎么收费和管理？",
                answer: "团队套餐支持在线购买。付款人即为团队所有者，可通过邮箱邀请成员加入并设置积分用量上限。每期积分统一进入团队共享池供成员使用。",
            },
            {
                question: "自带 API Key（BYOK）是怎么收费的？",
                answer: "平台不赚取任何模型差价，也不会扣除平台的生成积分。你只需支付 DramaCanvas 的工作空间服务费，模型调用费用由你绑定的第三方厂商账户直接扣除。",
            },
            { question: "平台上有哪些功能是免费的？", answer: "手动编写剧本和手动编辑分镜完全免费。素材可以保存在浏览器或授权的本地文件夹中，画布也能导出为包含素材的 ZIP 压缩包；平台不承诺提供云盘存储空间。" },
            { question: "哪些 AI 操作会消耗积分？", answer: "使用 AI 生成剧本、文字分镜、图片和视频都会扣除积分。具体消耗取决于任务类型与模型：文字按请求或用量计费，图片按模型规格计费，视频按请求或按秒计费。每次运行前界面都会显示本次要扣的积分。" },
            { question: "积分包和订阅发放的积分会过期吗？", answer: "购买的积分包和订阅发放的积分没有到期日，订阅期结束后也不会清零。活动赠送或奖励性质的积分可能各自设有有效期，具体以发放时的说明为准。" },
            { question: "模型规格、生成时长和分辨率会怎样影响积分消耗？", answer: "所选模型与规格直接决定价格档位。部分视频按秒计费，时长越长扣除越多，且分辨率会影响可选的时长范围与计费标准；多预留的积分会退回到余额。" },
            { question: "使用 Agent 会产生额外的服务费吗？", answer: "平台不收取单独的 Agent 服务费，只按 Agent 实际执行的文字、图片或视频生成操作扣除积分。通过 MCP 运行 Agent 时，你可以为每轮对话设置积分预算上限，该数值仅作为支出上限，并非固定扣费。" },
            {
                question: "任务取消、超时、部分成功或重新生成时，积分如何处理？",
                answer: "明确失败或在提交给模型服务前取消的任务，积分都会退回到余额；若模型端状态暂时不明，积分会先冻结，核实成功则结算、失败则退回到余额。部分成功时，多预留的积分会退回到余额；重新生成属于新任务，会按新报价扣除积分。",
            },
            { question: "团队积分如何分配和管理？", answer: "团队拥有独立的积分账户，可以为成员设置月度预算额度。团队所有者和管理员可以查看团队流水明细，并将个人积分划转至团队账户；普通成员无法查看流水或进行划转。" },
            { question: "免费生成的作品有水印吗？", answer: "未付费账号生成的图片和视频左上角会带有水印（使用自己的 API Key 则无水印），添加水印不消耗积分。只要充值积分或订阅过任意套餐，历史与后续生成的所有作品都可以下载无水印版本。" },
        ],
        help: [
            {
                question: "怎么在画布上开始制作第一个短剧？",
                answer: "贴上你的剧本大纲，告诉右侧的 AI 助手即可开始。助手会自动帮你拆分成带景别和机位动作的分镜卡片，确认角色设定后即可逐个镜头生成画面，并在时间线上排好。",
            },
            {
                question: "怎么让主角在不同镜头里更像同一个人？",
                answer: "建议在生成前先选定一张清晰的角色参考图。系统在排布后续镜头时会优先参考该面部特征，尽量保持人物形象连贯；如果个别镜头长相走样，更换参考图或微调提示词重新生成即可。",
            },
            {
                question: "素材保存在哪里，怎么备份？",
                answer: "素材可以保存在浏览器里，也可以授权一个电脑文件夹来保存。要备份时，在画布列表选中画布导出 .zip 文件；原始素材建议另外留一份。",
            },
            {
                question: "用 DramaCanvas 生成的视频能商用吗？",
                answer: "可以用于商业项目，但要看你所用模型的使用条款，以及你上传的素材是否有版权。开通会员不代表自动获得第三方内容的版权。",
            },
            {
                question: "怎么邀请团队成员一起协作？",
                answer: "团队管理员可以在团队页面发送邀请，并管理成员和积分用量。",
            },
            {
                question: "生成失败会扣积分吗？",
                answer: GENERATION_REFUND_COPY["zh-CN"],
            },
        ],
        mcp: [
            {
                question: "DramaCanvas 的 MCP 是什么，能做什么？",
                answer: "它是一个开放接口，让外部 AI 助手能直接操作你的画布。连接后，外部工具可以直接帮你编写剧本分镜、在画布上排布镜头卡片，甚至直接调用模型生成视频。",
            },
            {
                question: "目前支持连接哪些 AI 工具？",
                answer: "目前支持 Claude Code、Codex、Cursor 等兼容 MCP 协议的开发工具。你可以直接在这些工具里用自然语言下达指令，指挥它在 DramaCanvas 画布上完成创作流程。",
            },
            {
                question: "外部工具生成会扣积分吗？怎么控制花费？",
                answer: "会正常扣除你的账户积分。为了控制花费，你可以在平台的密钥管理页面为该连接设置具体的消费上限，达到额度后自动停止生成，有效避免非预期扣费。",
            },
            {
                question: "不想用时怎么撤销外部工具的访问权限？",
                answer: "直接在平台的密钥管理页面吊销或删除对应的密钥即可。撤销后，外部工具将立即失去访问你的画布与消耗积分的权限，已有的画布内容不受任何影响。",
            },
        ],
        "seedance-2-0": [
            {
                question: "DramaCanvas 上的 Seedance 2.0 是哪家开发的技术？",
                answer: "它是字节跳动旗下的模型，也是即梦同款技术。你可以在画布右侧和 AI 助手对话，或者在卡片上直接选 Seedance 2.0 生成视频画面，排布分镜过程完全免费。",
            },
            {
                question: "Seedance 2.0 支持哪些版本？",
                answer: "平台目前提供标准、Fast、Mini、HC 和 720P 五个版本。不同版本和分辨率的计费不同，你可以在卡片上根据生成需求自主挑选。",
            },
            {
                question: "使用 Seedance 2.0 生成视频如何收费？",
                answer: "Seedance 2.0 按生成视频的秒数计费。不同版本和分辨率的价格不同，生成前画布会明确显示这次要扣的准确积分，生成失败积分会自动退回；对结果不满意重新生成，按新任务扣费。",
            },
            {
                question: "可以用自己的 API Key 跑 Seedance 2.0 吗？",
                answer: "可以。在设置里接入兼容 OpenAI、Gemini 等接口的自带密钥（BYOK）后，模型费用由你的服务商直接收取，平台不加价、不扣平台积分，另收工作空间服务费。",
            },
        ],
        "seedance-2-5": [
            {
                question: "Seedance 2.5 和之前的 2.0 有什么区别？",
                answer: "Seedance 2.5 是字节跳动推出的新一代模型，同样属于即梦同款。平台为它提供了标准与 1080P Max 两个可用版本，视频均按秒计费。",
            },
            {
                question: "Seedance 2.5 包含哪些可用版本？",
                answer: "目前支持标准版和 1080P Max 两个版本。不同版本与分辨率的扣费不同，在生成前画布上都会直接标明这次需要扣除的准确积分。",
            },
            {
                question: "如何在 DramaCanvas 中使用 Seedance 2.5 生成视频？",
                answer: "你可以在画布右侧和 AI 助手对话，或者在分镜卡片上直接选择该模型生成。在点击生成前，画布会明确显示本次扣除的积分，生成失败会自动退回。",
            },
            {
                question: "使用 Seedance 2.5 创作短剧可以免费体验吗？",
                answer: "画布、手动写剧本和编辑分镜功能是完全免费的。AI 写剧本、AI 分镜与视频生成按所选模型扣除积分，视频生成按秒计费，每次生成前都会显示扣费数值。",
            },
        ],
        "sora-2": [
            {
                question: "在 DramaCanvas 用 Sora 2 需要邀请码吗？",
                answer: "完全不需要邀请码。Sora 2 由 OpenAI 开发，用户直接在网页画布里就能调用，无需内测资格，在卡片上选定模型或与右侧助手对话即可生成视频。",
            },
            {
                question: "Sora 2 是由哪家厂商提供的？",
                answer: "Sora 2 是 OpenAI 旗下的视频生成模型。在平台中它用于视频生成，采用按秒计费规则，生成前画布界面会展示扣费积分。",
            },
            {
                question: "生成 Sora 2 视频是怎么扣费的？",
                answer: "Sora 2 属于视频模型，统一按照生成的秒数扣费。不同分辨率的收费标准不同，每次生成前画布会明确显示要扣的积分，且生成失败积分退回。",
            },
            {
                question: "可以接入自己的 OpenAI API Key 来用 Sora 2 吗？",
                answer: "可以。在设置里接入兼容 OpenAI、Gemini 等接口的自带密钥（BYOK）后，模型费用由你的服务商直接收取，平台不加价、不扣平台积分，另收工作空间服务费。",
            },
        ],
        "veo-3-1": [
            {
                question: "Veo 3.1 是哪个公司的 AI 模型？",
                answer: "Veo 3.1 是 Google 推出的视频生成模型。你可以在 DramaCanvas 的画布卡片上直接选择它，或者在右侧向 AI 助手发送指令进行视频生成。",
            },
            {
                question: "Veo 3.1 是按秒计费还是按次计费？",
                answer: "平台对 Veo 3.1 提供了按秒计费以及部分规格按次计费的规则。具体不同规格与分辨率的价格不同，在点击生成前画布都会直接标明准确扣除的积分。",
            },
            {
                question: "可以在不花积分的情况下体验 Veo 3.1 相关的创作吗？",
                answer: "画布、手动写剧本与手动编辑分镜完全免费。AI 写剧本、AI 分镜与 Veo 3.1 视频生成均按模型扣除积分，系统在生成前会显示扣费数值，如遇到生成失败积分会自动退回。",
            },
            {
                question: "支持配置自己的 Key 来调用 Google Veo 3.1 吗？",
                answer: "可以。在设置里接入兼容 OpenAI、Gemini 等接口的自带密钥（BYOK）后，模型费用由你的服务商直接收取，平台不加价、不扣平台积分，另收工作空间服务费。",
            },
        ],
        "kling-3-0": [
            {
                question: "Kling 3.0 具备哪些独特的功能？",
                answer: "Kling 3.0 支持 2 张图做首尾帧，常规生成 3–15 秒，运动控制 3–30 秒；Turbo 只支持 1 张首帧图，时长 3–15 秒。",
            },
            {
                question: "什么是可灵 3.0 的运动控制功能？",
                answer: "Kling 3.0 的运动控制模式支持 3–30 秒输出；常规生成时长为 3–15 秒。生成前可在画布确认所选规格与扣费。",
            },
            {
                question: "Kling 3.0 都有哪些版本可选？计费有什么差别？",
                answer: "提供标准版和 Turbo 两个版本，均按秒计费。不同版本和分辨率的价格有所不同，每次生成前画布都会显示本次准确扣除的积分。",
            },
            {
                question: "怎么在画布里操作 Kling 3.0 生成视频？",
                answer: "可以在画布右侧与 AI 助手对话，或者在分镜卡片上直接挑选可灵 3.0。生成前会看到扣费数值，万一生成失败积分会自动退回。",
            },
        ],
        "minimax-h3": [
            {
                question: "海螺 AI（MiniMax H3）支持多张图片合成视频吗？",
                answer: "MiniMax H3 与 H3 Max 均只支持 1 张图做首帧，不支持多图、参考视频或参考音频。",
            },
            {
                question: "MiniMax H3 在 DramaCanvas 提供了哪些版本？",
                answer: "平台提供了标准版与 H3 Max 版本。模型按生成的视频秒数计费，不同版本和分辨率的价格不同，生成前在画布卡片上能直接看到扣费数值。",
            },
            {
                question: "使用海螺 AI 生成视频是如何扣费的？",
                answer: "MiniMax H3 按视频秒数计费。不同版本及分辨率扣费不同，在生成前画布会明确显示应扣积分；若出现生成失败，积分将全部退回。",
            },
            {
                question: "可以用自带的 API Key 使用 MiniMax H3 吗？",
                answer: "可以。在设置里接入兼容 OpenAI、Gemini 等接口的自带密钥（BYOK）后，模型费用由你的服务商直接收取，平台不加价、不扣平台积分，另收工作空间服务费。",
            },
        ],
        "wan-3-0": [
            {
                question: "Wan 3.0 是由哪家公司推出的模型？",
                answer: "Wan 3.0 即通义万相，是由阿里巴巴研发的视频生成模型。用户可以在画布右侧与 AI 助手对话，或者在卡片上直接选择该模型生成视频。",
            },
            {
                question: "通义万相 Wan 3.0 有哪些可选版本？",
                answer: "平台目前提供标准版和 Prime 两个版本。两个版本均按视频秒数计费，因版本与分辨率不同价格有差异，生成前画布会直接显示扣除积分。",
            },
            {
                question: "Wan 3.0 视频生成是怎么计费的？",
                answer: "Wan 3.0 属于视频模型，统一按秒计费。不同版本和分辨率价格不同，生成前画布会给出本次所需扣除的准确积分，生成失败积分退回。",
            },
            {
                question: "刚开始用 Wan 3.0 编排剧本分镜要收费吗？",
                answer: "在画布上手动写剧本、编辑分镜全流程免费。AI 写剧本、AI 分镜与 Wan 3.0 视频生成均按模型扣积分，视频按秒计费，生成前有明确扣费提示。",
            },
        ],
        "grok-imagine": [
            {
                question: "Grok Imagine 是哪家厂商的模型？包含什么规格？",
                answer: "Grok Imagine 由 xAI 开发。它包含了用于生成图片的 Grok Imagine Image 2.0，以及用于生成视频的 Grok Imagine Video 1.5。",
            },
            {
                question: "Grok Imagine 能同时生成图片和视频吗？",
                answer: "可以同时生成图片与视频。该系列生图可用 Grok Imagine Image 2.0，生视频可用 Grok Imagine Video 1.5，均可在画布中直接调用。",
            },
            {
                question: "Grok Imagine 是如何计费的？",
                answer: "图片模型 Image 2.0 按张计费，视频模型 Video 1.5 按秒计费。分辨率不同价格也不同，生成前画布都会标出此次扣除的准确积分。",
            },
            {
                question: "生成 Grok Imagine 时如果失败会退回积分吗？",
                answer: "生成失败积分会自动退回。此外画布使用、手动写剧本和编辑分镜都是免费的；AI 写剧本、AI 分镜、图片和视频生成按所选模型扣费，生成前会明确显示应扣积分。",
            },
        ],
        "nano-banana": [
            {
                question: "Nano Banana 是哪家公司的技术？用于做什么？",
                answer: "Nano Banana 是 Google 旗下的图片生成模型。创作者可以在卡片上选用它，或者通过右侧 AI 助手对话，生成短剧分镜所需的图片素材。",
            },
            {
                question: "Nano Banana 在平台上有哪些可用版本？",
                answer: "平台目前提供 Nano Banana、Nano Banana 2、Nano Banana 2.1 以及 Nano Banana Pro（1K）四个版本供创作者选用。",
            },
            {
                question: "使用 Nano Banana 生图怎么计费？",
                answer: "Nano Banana 属于图片模型，统一按张计费。不同版本与分辨率的价格不同，生成前画布卡片会显示扣除的准确积分，生成失败积分退回。",
            },
            {
                question: "能用自带的 Google API Key 调用 Nano Banana 吗？",
                answer: "可以。在设置里接入兼容 OpenAI、Gemini 等接口的自带密钥（BYOK）后，模型费用由你的服务商直接收取，平台不加价、不扣平台积分，另收工作空间服务费。",
            },
        ],
        "gpt-image-2": [
            {
                question: "GPT Image 2 是由哪家公司开发的？有哪些可用版本？",
                answer: "GPT Image 2 由 OpenAI 开发，平台目前同时支持 GPT Image 2、GPT Image 2.5 与 GPT Image 2.6 三个版本的图片生成。",
            },
            {
                question: "GPT Image 2、GPT Image 2.5 与 GPT Image 2.6 是视频还是图片模型？",
                answer: "它们都是图片生成模型，统一按照生成张数计费。创作者可以在分镜卡片上根据需要自由切换不同版本和不同分辨率。",
            },
            {
                question: "GPT Image 系列生成图片怎么收费？",
                answer: "该系列按张计费。不同版本及分辨率价格不同，在点击生成前，画布会明确显示本次扣除的准确积分，如果生成失败积分会自动退回。",
            },
            {
                question: "如何在 DramaCanvas 中调用 GPT Image 2？",
                answer: "在画布右侧与 AI 助手对话，或在分镜卡片上直接选中该模型即可生成。手动写剧本和编辑分镜完全免费；生成 GPT Image 2 图片按张扣费，AI 剧本与 AI 分镜也按积分扣费。",
            },
        ],
        "midjourney-v7": [
            {
                question: "使用 Midjourney V7 必须登录或绑定 Discord 吗？",
                answer: "完全不需要 Discord。在 DramaCanvas 里，用户直接在网页画布上就能调用 Midjourney V7 生成图片，无需复杂配置。",
            },
            {
                question: "Midjourney V7 是按生成张数还是按使用时长计费？",
                answer: "Midjourney V7 属于图片模型，按生成张数计费。不同分辨率价格不同，在每次生成图片前，画布都会清晰显示本次需要扣除的准确积分。",
            },
            {
                question: "使用 Midjourney V7 生成图片失败了会扣除积分吗？",
                answer: "生成失败积分会自动退回。生成前画布会显示这次要扣的积分。",
            },
            {
                question: "用 Midjourney V7 生成的图片可以商用吗？",
                answer: "一般可以，但要看 Midjourney 的使用条款，以及你上传的参考素材有没有版权。开通会员不代表自动获得第三方内容的版权。",
            },
        ],
    },
    "en-US": {
        home: [
            { question: HOME_POSITIONING["en-US"].question, answer: HOME_POSITIONING["en-US"].answer },
            { question: SIGNUP_CREDITS_COPY["en-US"].question, answer: SIGNUP_CREDITS_COPY["en-US"].answer },
            { question: "Are credits returned if a generation fails?", answer: GENERATION_REFUND_COPY["en-US"] },
            {
                question: "Do I need prompting or video editing experience?",
                answer: "No experience is required. You describe your story in plain English, and the AI assistant breaks it down into storyboard cards with shot types and character actions. You can drag and drop generated clips directly on the built-in timeline without professional editing skills.",
            },
        ],
        pricing: [
            {
                question: "What are the subscription pricing plans for DramaCanvas?",
                answer: "The monthly plan is {monthly} per month with {monthlyCredits} credits, and the annual plan is {annual} per year with {annualCredits} credits. All plans are billed in USD. Images and videos share the same credit balance, and the canvas shows confirmed credits before each generation.",
            },
            {
                question: "When do subscription credits arrive in my account?",
                answer: "Credits are added to your account right after payment succeeds. Monthly plans renew credits every month, while annual plans deliver the full year of credits upfront. The canvas displays the credit cost before every generation.",
            },
            { question: "Are credits returned if a generation fails?", answer: GENERATION_REFUND_COPY["en-US"] },
            {
                question: "Can I use top-up credit packs alongside a subscription?",
                answer: "Yes, you can use both together. Subscription credits and top-up credit packs are tracked separately and deducted according to your wallet settings. You can check both balances anytime in your wallet.",
            },
            {
                question: "Is an annual subscription a better deal than monthly?",
                answer: "Yes, the annual subscription offers better value. On Standard, Advanced, and Premium, you pay for 10 months and get 12 months of credits upfront (Luxury gets about 11.6 months, Supreme is the same rate across all periods), working out to about {annualUnit} per credit compared to roughly {monthlyUnit} per credit on the monthly plan.",
            },
            {
                question: "How does team billing and workspace management work?",
                answer: "Team plans can be purchased online. The purchaser becomes the team owner, who can invite members by email and set credit limits. Credits for each billing cycle go into a shared team pool.",
            },
            {
                question: "How does Bring Your Own Key (BYOK) billing work?",
                answer: "DramaCanvas charges no markup on model calls and deducts no platform generation credits under BYOK. You only pay the DramaCanvas workspace service fee, and your third-party model provider bills you directly for API usage.",
            },
            {
                question: "What features are free to use?",
                answer: "Writing scripts and editing storyboards manually are completely free. You can save your assets in your browser or an authorized local folder, and export your canvas as a ZIP package containing the assets; the platform does not promise cloud storage space.",
            },
            {
                question: "Which AI actions consume credits?",
                answer: "Generating scripts, text storyboards, images, and videos with AI all consume credits based on the selected task and model. Text is charged per request or by usage, images follow the selected model specifications, and videos are billed per request or per second. The credits to be deducted are displayed before each run.",
            },
            {
                question: "Do credit packs and subscription credits expire?",
                answer: "Purchased credit packs and credits granted from subscriptions have no expiration date and will not reset when your subscription period ends. Event or reward credits may have their own validity periods, subject to the terms provided when issued.",
            },
            {
                question: "How do model choice, duration, and resolution affect credit consumption?",
                answer: "The chosen model and specifications determine the pricing tier. Some videos are billed per second, consuming more credits as duration increases, and resolution influences available durations and pricing; when settling by actual usage, extra reserved credits are returned to your balance.",
            },
            {
                question: "Is there an extra fee for using Agents?",
                answer: "There is no standalone Agent service fee; credits are only deducted for the actual billable generation actions (text, image, or video) executed by the Agent. When running Agents via MCP, you can set a credit budget ceiling per round, which acts strictly as an upper limit rather than a fixed fee.",
            },
            {
                question: "How are credits handled for canceled, timed-out, partially successful, or regenerated tasks?",
                answer: "Credits for definitively failed tasks or tasks canceled before reaching the model service are returned to your balance; if the model status is temporarily unclear, credits are frozen first and then settled upon success or returned to your balance upon failure. Partially successful tasks settle based on actual usage with extra reserved credits returned to your balance, while regenerating counts as a new run deducted under the new quote.",
            },
            {
                question: "How do team credits work?",
                answer: "Teams have an independent credit account and can establish monthly budgets for members. Team owners and admins can view team usage records and transfer their personal credits into the team account; regular members cannot view transaction records or make transfers.",
            },
            {
                question: "Do free creations have watermarks?",
                answer: "Images and videos generated by unpaid accounts include a watermark in the top-left corner (except when using your own API key), and watermarks do not cost credits. Once you top up credits or subscribe to any plan, you can download watermark-free versions of all your past and future creations.",
            },
        ],
        help: [
            {
                question: "How do I start my first short drama on the canvas?",
                answer: "Paste your script outline into the chat on the right and tell the AI assistant to start. The assistant breaks your story into storyboard cards with shot types and camera movements. After confirming character references, generate each shot and arrange the clips on the timeline.",
            },
            {
                question: "How do I keep a character consistent across different shots?",
                answer: "Upload a clear character reference image before generating shots. The system prioritizes those facial features across subsequent frames to help keep the character consistent. If a shot drifts, update the reference image or adjust the prompt and regenerate that frame.",
            },
            {
                question: "Where are my assets saved, and how do I back them up?",
                answer: "Assets can be stored in your browser or in an authorized local folder on your computer. To back up your project, select the canvas from your project list and export it as a .zip file. We recommend keeping a separate copy of your original files.",
            },
            {
                question: "Can I use videos generated on DramaCanvas for commercial projects?",
                answer: "Yes, you can use generated videos commercially, subject to the terms of service of the specific model you use and your ownership of uploaded assets. A paid subscription does not grant copyright to third-party materials.",
            },
            {
                question: "How do I invite team members to collaborate?",
                answer: "A team admin can send invitations from the team management page and oversee member access and credit usage.",
            },
            { question: "What should I do if a generation fails?", answer: GENERATION_REFUND_COPY["en-US"] },
        ],
        mcp: [
            {
                question: "What is DramaCanvas MCP and what does it do?",
                answer: "Model Context Protocol (MCP) is an open standard that allows external AI assistants to control your canvas directly. Once connected, your external tools can write script breakdowns, arrange shot cards, and trigger video generation models on DramaCanvas.",
            },
            {
                question: "Which AI tools can connect to DramaCanvas via MCP?",
                answer: "DramaCanvas supports MCP-compatible coding and agent tools including Claude Code, Codex, and Cursor. You can issue natural language prompts inside those tools to manage your storyboard and production workflow on the canvas.",
            },
            {
                question: "Do external MCP tools consume credits, and how do I set spending limits?",
                answer: "Yes, generations triggered via MCP deduct credits from your account balance as usual. To control spending, you can set a credit usage limit on your API key management page. Once reached, generation stops automatically to prevent unexpected charges.",
            },
            {
                question: "How do I revoke access for external MCP tools?",
                answer: "You can revoke or delete the corresponding API key anytime in the key management dashboard. External tools immediately lose access to your canvas and credit balance, while your existing canvas projects remain intact.",
            },
        ],
        "seedance-2-0": [
            {
                question: "Who developed Seedance 2.0 and how do I use it on DramaCanvas?",
                answer: "Seedance 2.0 is developed by ByteDance. You can generate video clips with it by chatting with the AI assistant on the right or selecting Seedance 2.0 directly on any shot card. Organizing scripts and storyboards on the canvas is free.",
            },
            {
                question: "Which versions of Seedance 2.0 are available?",
                answer: "DramaCanvas provides five versions: Standard, Fast, Mini, HC, and 720P. Each version and resolution has different credit pricing, and you can pick the one that matches your project needs on the shot card.",
            },
            {
                question: "How is Seedance 2.0 video generation billed?",
                answer: "Seedance 2.0 is billed by the second of generated video. Pricing varies by version and resolution, and the canvas displays the exact credit cost before generation. If a generation fails, credits are returned to your balance.",
            },
            {
                question: "Can I use my own API key with Seedance 2.0?",
                answer: "Yes. Connect your own API key (BYOK) supporting OpenAI or Gemini compatible interfaces in settings. Your provider charges for model usage directly with zero platform markup and no credit deduction, while workspace service is billed separately.",
            },
        ],
        "seedance-2-5": [
            {
                question: "What is Seedance 2.5 and how does it compare to 2.0?",
                answer: "Seedance 2.5 is the next-generation video model from ByteDance. DramaCanvas supports both Standard and 1080P Max versions, with video generation billed by the second.",
            },
            { question: "What versions of Seedance 2.5 are supported?", answer: "DramaCanvas supports Seedance 2.5 Standard and 1080P Max. Pricing differs by version and resolution, and the canvas displays the exact credit cost before you generate." },
            {
                question: "How do I generate video with Seedance 2.5 on DramaCanvas?",
                answer: "Chat with the AI assistant on the right or select Seedance 2.5 directly on your storyboard card. The canvas displays the required credits before you click generate, and credits are returned to your balance if generation fails.",
            },
            {
                question: "Can I try Seedance 2.5 for short dramas for free?",
                answer: "Using the canvas, manual scriptwriting, and storyboard editing are completely free. AI scripts, AI storyboards, and video generation deduct credits by model, with video billed by the second and the cost displayed before each run.",
            },
        ],
        "sora-2": [
            {
                question: "Do I need an invite code to use Sora 2 on DramaCanvas?",
                answer: "No invite code is needed. Sora 2 from OpenAI is accessible directly inside the web canvas without waitlists. Select Sora 2 on any shot card or prompt the assistant on the right to start generating videos.",
            },
            {
                question: "Who provides Sora 2 and what does it do?",
                answer: "Sora 2 is a video generation model developed by OpenAI. On DramaCanvas, it generates video clips billed by the second, and the canvas shows the required credits before each run.",
            },
            {
                question: "How is Sora 2 video generation billed?",
                answer: "Sora 2 is billed per second of generated video. Pricing varies by resolution, the canvas shows the exact credit cost before generation, and credits are returned to your balance if generation fails.",
            },
            {
                question: "Can I connect my own OpenAI API key to run Sora 2?",
                answer: "Yes. Add your own API key (BYOK) supporting OpenAI or Gemini compatible endpoints in settings. Your provider charges for model calls directly with zero platform markup and no platform credit deductions; workspace service is billed separately.",
            },
        ],
        "veo-3-1": [
            {
                question: "Who makes Veo 3.1 and how can I access it?",
                answer: "Veo 3.1 is a video generation model developed by Google. You can select it directly on any storyboard card on DramaCanvas or instruct the AI assistant in the right panel to generate video.",
            },
            {
                question: "Is Google Veo 3.1 billed by the second or per generation?",
                answer: "DramaCanvas supports per-second billing for Veo 3.1, with certain specifications billed per generation. Costs depend on resolution and settings, and the canvas clearly shows the required credits before you generate.",
            },
            {
                question: "Can I try Veo 3.1 workflows without spending credits?",
                answer: "Manual scriptwriting, storyboard editing, and canvas planning are free of charge. AI scripts, AI storyboards, and Veo 3.1 video generation deduct credits, with the exact amount displayed upfront and credits returned to your balance if generation fails.",
            },
            {
                question: "Can I bring my own API key for Google Veo 3.1?",
                answer: "Yes. Configure your own API key (BYOK) with compatible endpoints in settings. Your provider bills model usage directly with no platform markup or credit deductions, while workspace service is billed separately.",
            },
        ],
        "kling-3-0": [
            {
                question: "What features are supported in Kling 3.0?",
                answer: "Kling 3.0 accepts 2 images as start/end frames, with 3–15 sec generation or 3–30 sec motion control. Turbo accepts only 1 start image and generates 3–15 sec.",
            },
            {
                question: "How does motion control work in Kling 3.0?",
                answer: "Kling 3.0 motion control supports 3–30 sec output; ordinary generation supports 3–15 sec. Confirm the selected settings and credit cost on the canvas before generating.",
            },
            {
                question: "Which versions of Kling 3.0 are available, and how are they billed?",
                answer: "DramaCanvas offers Standard and Turbo versions of Kling 3.0, both billed by the second. Pricing varies by version and resolution, and the canvas displays the exact credit deduction before every generation.",
            },
            {
                question: "How do I generate video with Kling 3.0 on the canvas?",
                answer: "Chat with the AI assistant on the right or select Kling 3.0 on your storyboard card. The canvas displays the required credits before generation, and any failed generation automatically returns your credits.",
            },
        ],
        "minimax-h3": [
            { question: "Does MiniMax H3 (Hailuo AI) support multi-image to video?", answer: "MiniMax H3 and H3 Max each accept only 1 image as a start frame, with no multi-image, reference video or reference audio input." },
            {
                question: "Which versions of MiniMax H3 are available on DramaCanvas?",
                answer: "DramaCanvas offers MiniMax H3 Standard and H3 Max. Video generation is billed by the second, with pricing varying by version and resolution. The credit cost is always visible on the card before generation.",
            },
            {
                question: "How is video generation billed for MiniMax H3?",
                answer: "MiniMax H3 is billed per second of generated video. Credit amounts depend on the version and resolution selected, with the cost shown before generation and credits returned to your balance if a generation fails.",
            },
            {
                question: "Can I bring my own API key to use MiniMax H3?",
                answer: "Yes. Configure your own API key (BYOK) with compatible endpoints in workspace settings. Your provider bills your model usage directly with zero platform markup and no credit deduction; workspace service is billed separately.",
            },
        ],
        "wan-3-0": [
            { question: "Who created Wan 3.0 and how can I run it?", answer: "Wan 3.0 is a video generation model developed by Alibaba. You can chat with the AI assistant on the right or select Wan 3.0 directly on any card to generate video." },
            {
                question: "What versions of Wan 3.0 are available?",
                answer: "DramaCanvas supports Wan 3.0 Standard and Prime. Both versions are billed by the second of video, with costs varying by version and resolution, shown on the canvas before generation.",
            },
            {
                question: "How does credit billing work for Wan 3.0 video generation?",
                answer: "Wan 3.0 is billed by the second of video output. Pricing varies by version and resolution, the exact credit requirement is displayed prior to generation, and credits are returned to your balance if generation fails.",
            },
            {
                question: "Is it free to plan scripts and storyboards before using Wan 3.0?",
                answer: "Manual scriptwriting and arranging storyboards on the canvas are free. AI scripts, AI storyboards, and Wan 3.0 video generation deduct credits, with video billed by the second and the exact cost shown beforehand.",
            },
        ],
        "grok-imagine": [
            {
                question: "Who developed Grok Imagine and what models are included?",
                answer: "Grok Imagine is developed by xAI. The lineup includes Grok Imagine Image 2.0 for image generation, as well as Grok Imagine Video 1.5 for video generation.",
            },
            {
                question: "Can Grok Imagine generate both images and videos?",
                answer: "Yes, Grok Imagine handles both image and video creation. Use Grok Imagine Image 2.0 for image cards and Grok Imagine Video 1.5 for video clips directly on the canvas.",
            },
            {
                question: "How is Grok Imagine generation billed?",
                answer: "Image 2.0 is billed per image generated, while Video 1.5 is billed by the second of video. Pricing varies by resolution, and the canvas displays the exact credit cost before generation.",
            },
            {
                question: "Are credits returned to your balance if Grok Imagine generation fails?",
                answer: "Yes, credits are returned to your balance if generation fails. Using the canvas, manual scriptwriting, and storyboard editing are free; AI scripts, storyboards, images, and videos deduct credits, with the cost shown upfront.",
            },
        ],
        "nano-banana": [
            {
                question: "Who develops Nano Banana and what is it used for?",
                answer: "Nano Banana is an image generation model from Google. Creators use it on storyboard cards or through the AI assistant on the right to generate character references and storyboard visuals.",
            },
            {
                question: "Which versions of Nano Banana are available on DramaCanvas?",
                answer: "DramaCanvas offers four versions: Nano Banana, Nano Banana 2, Nano Banana 2.1, and Nano Banana Pro (1K). You can select the version you need on any image card.",
            },
            {
                question: "How is Nano Banana image generation billed?",
                answer: "Nano Banana is billed per generated image. Pricing depends on the version and resolution chosen, with exact credits displayed on the card before generation and credits returned to your balance if a generation fails.",
            },
            {
                question: "Can I connect my own Google API key to use Nano Banana?",
                answer: "Yes. Add your own API key (BYOK) with compatible endpoints in settings. Your provider bills model usage directly with zero platform markup and no credit deduction; workspace service is billed separately.",
            },
        ],
        "gpt-image-2": [
            { question: "Who developed GPT Image 2 and what versions are supported?", answer: "GPT Image 2 is developed by OpenAI. DramaCanvas supports GPT Image 2, GPT Image 2.5, and GPT Image 2.6 for generating still images on the canvas." },
            {
                question: "Are GPT Image 2, 2.5, and 2.6 image or video models?",
                answer: "All are image generation models billed per image created. Creators can switch between versions and resolutions on any storyboard card according to project requirements.",
            },
            {
                question: "How is image generation billed for the GPT Image series?",
                answer: "The GPT Image series is billed per image. Costs vary by version and resolution, with the exact credit deduction displayed on the canvas before you generate, and credits returned to your balance if generation fails.",
            },
            {
                question: "How do I generate images with GPT Image 2 on DramaCanvas?",
                answer: "Chat with the AI assistant on the right or select GPT Image 2 directly on a storyboard card. Manual scriptwriting and storyboard editing are free; generating GPT Image 2 images deducts credits per image, and AI scripts and storyboards also use credits.",
            },
        ],
        "midjourney-v7": [
            { question: "Do I need Discord to use Midjourney V7 on DramaCanvas?", answer: "No Discord account is required. On DramaCanvas, you can generate images with Midjourney V7 directly inside the web canvas without extra configuration." },
            {
                question: "Is Midjourney V7 billed per image or by usage time?",
                answer: "Midjourney V7 is an image model billed per generated image. Pricing depends on resolution, and the canvas displays the exact credit deduction before every generation.",
            },
            { question: "Are credits deducted if a Midjourney V7 image generation fails?", answer: "No, credits are returned to your balance if a generation fails. The canvas always shows the required credits before you initiate the generation." },
            {
                question: "Can I use images generated with Midjourney V7 commercially?",
                answer: "Generally yes, subject to Midjourney's terms of service and the copyright status of any reference assets you upload. A paid subscription does not grant copyright to third-party content.",
            },
        ],
    },
    "ja-JP": {
        home: [
            { question: HOME_POSITIONING["ja-JP"].question, answer: HOME_POSITIONING["ja-JP"].answer },
            { question: SIGNUP_CREDITS_COPY["ja-JP"].question, answer: SIGNUP_CREDITS_COPY["ja-JP"].answer },
            { question: "動画や画像の生成に失敗した場合、クレジットは返還されますか？", answer: GENERATION_REFUND_COPY["ja-JP"] },
            {
                question: "プロンプトの作成や動画編集の経験がなくても使えますか？",
                answer: "問題なくご利用いただけます。普段通りの言葉でストーリーのあらすじを伝えるだけで、AIアシスタントが画角やカメラワークの指示を含めた絵コンテカードへ分解します。生成された動画クリップはキャンバス内のタイムラインに並べるだけで、専門的な編集スキルがなくても構成できます。",
            },
        ],
        pricing: [
            {
                question: "有料プランの料金とクレジットの付与数はどのようになっていますか？",
                answer: "スタンダードプランは月払い月額{monthly}で{monthlyCredits}クレジット、年払い年額{annual}で{annualCredits}クレジットが含まれます。すべてのプランは米ドル（USD）決済となり、画像と動画の生成で共通のクレジットを使用します。生成前には消費予定のクレジット数が必ず画面に明示されます。",
            },
            {
                question: "プランに登録・決済した後、クレジットはいつ反映されますか？",
                answer: "決済が完了した時点で即座にアカウントへ付与されます。月払いプランは毎月更新時に付与され、年払いプランは1年分のクレジットが一括で付与されます。毎回生成を実行する前に、キャンバス上に消費クレジット数が表示されます。",
            },
            { question: "生成に失敗した際、消費されたクレジットは戻ってきますか？", answer: GENERATION_REFUND_COPY["ja-JP"] },
            {
                question: "都度購入の追加クレジットと月額プランのクレジットは併用できますか？",
                answer: "問題なく併用いただけます。プラン付与分のクレジットと追加購入分のクレジットは個別に管理され、ウォレットで設定された順序に沿って自動で消費されます。各残高の内訳はウォレット画面でいつでも確認可能です。",
            },
            {
                question: "年払いプランは月払いプランと比べてお得ですか？",
                answer: "年払いのほうが割安です。年払いは10か月分の料金（{annual}/年）で12か月分のクレジット（{annualCredits}クレジット）が一括付与されるため、1クレジットあたり約{annualUnit}となり、月払い（1クレジットあたり約{monthlyUnit}）と比べてお得にご利用いただけます。",
            },
            {
                question: "チームプランの請求やメンバー管理の仕組みはどうなっていますか？",
                answer: "チームプランはオンラインで購入できます。購入者がチームオーナーとなり、メールでメンバーを招待してクレジット利用上限を設定できます。毎サイクルのクレジットはチーム共有プールに付与されます。",
            },
            {
                question: "自分のAPIキーを使うBYOK接続の場合、料金はどのように発生しますか？",
                answer: "プラットフォームによるモデル料金の上乗せはなく、生成クレジットも消費されません。お支払いいただくのはDramaCanvasのワークスペース利用料のみとなり、モデルの呼び出し利用料は接続先のアカウントから直接引き落とされます。",
            },
            {
                question: "無料で使える機能には何がありますか？",
                answer: "脚本の手動作成や絵コンテの手動編集は無料です。素材はブラウザまたは許可したローカルフォルダに保存でき、素材を含んだZIPファイルとしてキャンバスを書き出すことも可能です。なお、プラットフォームはクラウドストレージの提供を約束していません。",
            },
            {
                question: "クレジットが消費されるAI操作はどれですか？",
                answer: "AIによる脚本作成、テキスト絵コンテ、画像、動画の生成では、選択したタスクとモデルに応じてクレジットが消費されます。テキストはリクエストまたは利用量単位、画像はモデル仕様、動画はリクエストまたは秒単位で計算され、実行前に消費予定クレジットが表示されます。",
            },
            {
                question: "クレジットパックやサブスクリプションのクレジットに有効期限はありますか？",
                answer: "購入したクレジットパックやサブスクリプションで付与されたクレジットには有効期限がなく、利用期間終了後も消滅しません。イベントや特典で獲得したクレジットには個別の有効期限が定められている場合があるため、付与時の案内をご確認ください。",
            },
            {
                question: "モデル、生成時間、解像度はクレジット消費にどう影響しますか？",
                answer: "選択したモデルと仕様によって価格帯が決まります。一部の動画は秒単位で課金され、時間が長くなるほど消費が増えるほか、解像度によって指定可能な時間や価格が変動します。実際の利用量で精算される場合、余分に確保されたクレジットは残高に戻ります。",
            },
            {
                question: "エージェント機能を利用すると別途費用がかかりますか？",
                answer: "エージェント自体の利用料は不要で、エージェントが実際に実行したテキスト、画像、動画の生成処理についてのみクレジットが差し引かれます。MCP経由で実行する場合はラウンドごとのクレジット予算上限を設定できますが、これは上限枠であり固定の消費額ではありません。",
            },
            {
                question: "キャンセル、タイムアウト、一部成功、再生成の場合、クレジットはどう処理されますか？",
                answer: "明確に失敗したタスクやモデルサービスへ送信する前にキャンセルしたタスクのクレジットは残高に戻ります。モデル側の状態が不明な場合は一時的に凍結され、確認後に成功なら精算、失敗なら残高に戻されます。一部のみ成功した場合は実利用量で精算されて余分な確保分が残高に戻り、再生成は新規タスクとして新たな見積もりでクレジットが消費されます。",
            },
            {
                question: "チームクレジットはどのように利用・管理しますか？",
                answer: "チーム専用のクレジットアカウントがあり、メンバーに月ごとの予算を設定できます。チーム所有者と管理者は利用履歴を確認でき、個人のクレジットをチームアカウントに移すことが可能です。一般メンバーは履歴の閲覧や移行を行えません。",
            },
            {
                question: "無料で生成した作品にウォーターマークは付きますか？",
                answer: "未課金アカウントで生成した画像や動画の左上にはウォーターマークが入りますが（自身のAPIキー利用時を除く）、ウォーターマークの追加でクレジットは消費されません。クレジットチャージまたはプラン購読を一度でも行うと、過去および今後のすべての作品をウォーターマークなしでダウンロードできます。",
            },
        ],
        help: [
            {
                question: "キャンバスを使って最初のショートドラマを作る手順は？",
                answer: "ストーリーのプロットやあらすじを貼り付け、画面右側のAIアシスタントに伝えるだけで始められます。アシスタントが画角やカメラワークを指定した絵コンテカードに分解してくれるので、登場人物の設定を確認したあと、カットごとに映像を生成してタイムラインに並べます。",
            },
            {
                question: "複数カットにわたって主人公の顔や見た目を揃えるにはどうすればいいですか？",
                answer: "生成を始める前に、鮮明なキャラクター参考画像を1枚設定することをおすすめします。以降のカットを生成する際、システムがその顔の特徴を優先して参照し、人物の見た目を可能な限り維持します。もし特定のカットで崩れた場合は、参考画像を変えるかプロンプトを微調整して再生成してください。",
            },
            {
                question: "制作した素材はどこに保存されますか？バックアップの方法は？",
                answer: "ブラウザ内に保存するほか、PCのローカルフォルダを指定して保存することも可能です。バックアップを取る際は、キャンバス一覧から該当プロジェクトを選択して.zipファイルとして書き出せます。大切なオリジナル素材は別途手元に保管しておくことを推奨します。",
            },
            {
                question: "DramaCanvasで生成した動画は商用利用できますか？",
                answer: "商用プロジェクトにご利用いただけます。ただし、生成に使用した各AIモデルの利用規約や、アップロードした素材の著作権に準拠する必要があります。有料プランへの加入によって第三者のコンテンツ著作権が自動で付与されるわけではありません。",
            },
            {
                question: "チームメンバーを招待して共同制作するにはどうすればいいですか？",
                answer: "チーム管理者が管理画面から招待リンクを送信し、メンバーの追加やクレジット上限を設定できます。",
            },
            { question: "生成が失敗した場合はどのように対処すればよいですか？", answer: GENERATION_REFUND_COPY["ja-JP"] },
        ],
        mcp: [
            {
                question: "DramaCanvasのMCP連携とは何ですか？どのようなことができますか？",
                answer: "外部のAIアシスタントがあなたのキャンバスを直接操作できるようにするオープンな連携規格です。接続することで、外部ツールから脚本や絵コンテを作成したり、キャンバス上にカットカードを配置したり、モデルを呼び出して動画を生成させることができます。",
            },
            {
                question: "現在、どのような外部AIツールと接続できますか？",
                answer: "Claude Code、Codex、Cursorなど、MCP規格に対応した開発ツールやエージェントと接続できます。使い慣れたツールの対話画面から自然言語で指示を出し、DramaCanvasのキャンバス上での制作作業を操作できます。",
            },
            {
                question: "外部ツール経由で生成を実行した場合、クレジットは消費されますか？利用額の制限は可能ですか？",
                answer: "通常どおりアカウントのクレジットが消費されます。予期せぬ利用を防ぐため、管理画面のAPIキー設定ページで接続ごとに消費上限額を設定できます。上限に達すると自動で生成が停止するため、費用を管理しやすくなっています。",
            },
            {
                question: "外部ツールからのアクセス権限を取り消したい場合はどうすればいいですか？",
                answer: "プラットフォームのキー管理画面から、該当するAPIキーを無効化または削除してください。削除した瞬間から外部ツールはキャンバスへのアクセスおよびクレジット消費ができなくなります。すでに作成済みのキャンバスデータには影響しません。",
            },
        ],
        "seedance-2-0": [
            {
                question: "DramaCanvasで使えるSeedance 2.0はどのようなモデルですか？",
                answer: "ByteDance（バイトダンス）社が開発した動画生成モデルで、即夢（Jimeng）と同系統の技術です。キャンバス右側のAIアシスタントに対話で指示するか、カード上でSeedance 2.0を選択して動画を生成できます。絵コンテの構成は無料です。",
            },
            {
                question: "Seedance 2.0ではどのバージョンを利用できますか？",
                answer: "標準（Standard）、Fast、Mini、HC、720Pの5つのバージョンに対応しています。バージョンや解像度によって消費クレジットが異なるため、演出意図や用途に合わせてカード上で自由に選択できます。",
            },
            {
                question: "Seedance 2.0での動画生成料金はどのように計算されますか？",
                answer: "生成した動画の秒数に応じてクレジットが消費されます。バージョンや解像度ごとにレートが設定されており、生成を実行する前に消費予定の正確なクレジットが画面に表示されます。生成に失敗した場合はクレジットが返還されます。",
            },
            {
                question: "自分のAPIキーを持ち込んでSeedance 2.0を利用できますか？",
                answer: "ご利用いただけます。設定画面で対応するAPIキー（BYOK）を登録すれば、モデルの利用料はお使いのプロバイダーから直接請求されます。プラットフォーム側での上乗せや生成クレジットの消費はなく、ワークスペース利用料のみが発生します。",
            },
        ],
        "seedance-2-5": [
            {
                question: "Seedance 2.5は従来のバージョンと何が異なりますか？",
                answer: "ByteDance社が提供する新世代の動画生成モデルで、即夢（Jimeng）と同系統の最新技術を採用しています。プラットフォーム上では標準版と1080P Maxの2つのバージョンを用意しており、いずれも動画の秒数単位で計算されます。",
            },
            {
                question: "Seedance 2.5で選択できるバージョンは何ですか？",
                answer: "標準版（Standard）と高解像度な1080P Maxの2種類を提供しています。バージョンや解像度によって消費クレジットが異なりますが、生成前にキャンバス上で必要なクレジット数が明確に提示されます。",
            },
            {
                question: "DramaCanvasのキャンバス上でSeedance 2.5を使って動画を生成する方法は？",
                answer: "画面右側のAIアシスタントにチャットで指示するか、絵コンテカードのモデル選択から直接指定して生成できます。生成ボタンを押す前に消費クレジットが表示され、万が一生成に失敗した場合はクレジットが自動で返還されます。",
            },
            {
                question: "Seedance 2.5を使ったショートドラマ制作は無料で試せますか？",
                answer: "キャンバスの操作、手動での脚本作成や絵コンテ編集は無料で行えます。AI脚本、AI絵コンテ、動画生成はモデルに応じてクレジットを消費し、動画は秒数で計算され、生成前に消費数を確認できます。",
            },
        ],
        "sora-2": [
            {
                question: "DramaCanvasでSora 2を使うのに招待コードや事前申請は必要ですか？",
                answer: "招待コードは不要です。OpenAI社のSora 2をWebキャンバス上から直接呼び出すことができます。カード上でモデルを選択するか、右側のアシスタントに対話で指示するだけで動画生成を開始できます。",
            },
            {
                question: "Sora 2はどの企業が提供しているモデルですか？",
                answer: "OpenAI社が開発した動画生成AIモデルです。DramaCanvas内では動画生成用途として組み込まれており、生成動画の秒数に応じたクレジット消費で利用できます。生成前には消費クレジットが表示されます。",
            },
            {
                question: "Sora 2で動画を生成する際の料金の仕組みはどうなっていますか？",
                answer: "生成する動画の秒数に応じてクレジットが消費されます。解像度によって料金設定が異なりますが、生成を実行する前に正確な消費クレジット数が画面に表示され、生成に失敗した場合はクレジットが返還されます。",
            },
            {
                question: "自分のOpenAI APIキーを接続してSora 2を利用できますか？",
                answer: "接続可能です。設定画面からお持ちのAPIキー（BYOK）を登録すれば、モデルの利用料金は接続先の事業者から直接引き落とされます。プラットフォーム側での上乗せやクレジットの引き落としはなく、ワークスペース利用料のみが発生します。",
            },
        ],
        "veo-3-1": [
            { question: "Veo 3.1はどこの会社が開発したAIモデルですか？", answer: "Google（グーグル）社が開発した最新の動画生成モデルです。DramaCanvasのキャンバスカード上で直接指定するか、右側のAIアシスタントにチャットで指示して動画を生成できます。" },
            {
                question: "Veo 3.1の課金体系は秒単位ですか、それとも回数単位ですか？",
                answer: "秒数単位の課金を基本としつつ、一部の特定仕様では1回ごとの生成単位で計算されます。仕様や解像度によって消費量が異なりますが、生成ボタンを押す前に消費クレジット数が明記されます。",
            },
            {
                question: "Veo 3.1を使った制作をクレジット消費なしで試すことはできますか？",
                answer: "キャンバスの配置、手動での脚本執筆や絵コンテ編集は無料で行えます。AI脚本、AI絵コンテ、Veo 3.1での動画生成はクレジットが必要となりますが、事前に消費数が提示され、生成に失敗した場合はクレジットが返還されます。",
            },
            {
                question: "自分のAPIキーを設定してGoogleのVeo 3.1を呼び出すことは可能ですか？",
                answer: "対応しています。設定画面でお手持ちのAPIキー（BYOK）を連携させれば、モデル利用料はお使いのプロバイダーから直接請求されます。プラットフォームによる上乗せや生成クレジットの消費はなく、ワークスペース利用料のみで運用できます。",
            },
        ],
        "kling-3-0": [
            {
                question: "Kling 3.0（可霊）にはどのような独自機能がありますか？",
                answer: "Kling 3.0は開始・終了画像2枚に対応。通常生成は3–15秒、モーション制御は3–30秒です。Turboは開始画像1枚のみ対応し、3–15秒の動画を生成します。",
            },
            {
                question: "Kling 3.0のモーションコントロール機能とは何ですか？",
                answer: "Kling 3.0のモーション制御は3–30秒、通常生成は3–15秒に対応します。生成前にキャンバスで設定と消費クレジットを確認できます。",
            },
            {
                question: "Kling 3.0にはどのようなバージョンがあり、料金はどう計算されますか？",
                answer: "標準版（Standard）と高速なTurbo版の2つが用意されており、いずれも生成秒数に応じた課金となります。バージョンや出力解像度により消費クレジットは変動しますが、生成前に正確な数値が提示されます。",
            },
            {
                question: "キャンバス内でKling 3.0を使って動画を生成する手順は？",
                answer: "画面右側のAIアシスタントに対話で指示するか、絵コンテカード上でKling 3.0を選択して生成を実行します。生成前に消費クレジットが表示され、万が一処理に失敗した場合はクレジットが返還されます。",
            },
        ],
        "minimax-h3": [
            {
                question: "MiniMax H3（Hailuo AI / 海螺AI）は複数画像からの動画生成に対応していますか？",
                answer: "MiniMax H3とH3 Maxは、どちらも開始画像1枚のみ対応。複数画像・参考動画・参考音声には対応していません。",
            },
            { question: "DramaCanvasで利用可能なMiniMax H3のバージョンは何ですか？", answer: "標準版と上位のH3 Maxの2種類を提供しています。生成した動画の秒数単位で計算され、バージョンや解像度ごとの消費クレジットは生成前にカード上で確認できます。" },
            {
                question: "MiniMax H3を使って動画を生成する際の課金方法は？",
                answer: "動画の生成秒数に応じてクレジットが消費されます。バージョンや解像度によって消費量が異なりますが、生成前に必要なクレジット数が表示され、生成に失敗した場合はクレジットが返還されます。",
            },
            {
                question: "自分のAPIキーを登録してMiniMax H3を動かすことはできますか？",
                answer: "可能です。設定画面からお持ちのAPIキー（BYOK）を接続すれば、モデルの利用料はプロバイダーから直接請求されます。プラットフォーム側での上乗せや生成クレジットの引き落としはなく、ワークスペース利用料のみがかかります。",
            },
        ],
        "wan-3-0": [
            {
                question: "Wan 3.0（通義万相）はどこの企業が開発した動画生成モデルですか？",
                answer: "Alibaba（アリババ）グループが開発した動画生成AIモデルです。キャンバス右側のアシスタントとチャットするか、カード上でWan 3.0を選択して直接映像を生成できます。",
            },
            {
                question: "Wan 3.0にはどのようなバージョンが用意されていますか？",
                answer: "標準版（Standard）とPrime版の2種類を提供しています。どちらも動画の長さに応じた秒単位の計算となり、解像度やバージョンごとの消費クレジットは生成前に画面へ表示されます。",
            },
            {
                question: "Wan 3.0での動画生成料金の計算方法はどのようになっていますか？",
                answer: "生成する動画の秒数に基づいてクレジットが消費されます。選択したバージョンや解像度ごとに設定されており、生成前に消費クレジットが提示され、生成に失敗した場合は返還されます。",
            },
            {
                question: "Wan 3.0を使った制作を始める際、絵コンテや脚本の整理にお金はかかりますか？",
                answer: "キャンバス上での手動による脚本執筆や絵コンテ編集は無料で利用できます。AI脚本、AI絵コンテ、Wan 3.0での映像生成はクレジットを消費し、動画は秒数で計算され、生成前に消費数が表示されます。",
            },
        ],
        "grok-imagine": [
            {
                question: "Grok Imagineはどの会社が開発したモデルですか？どのような種類がありますか？",
                answer: "xAI社が開発した生成モデルです。静止画像生成用のGrok Imagine Image 2.0と、動画生成用のGrok Imagine Video 1.5の両方を揃えています。",
            },
            {
                question: "Grok Imagineを使って画像と動画の両方を生成できますか？",
                answer: "両方に対応しています。絵コンテ用の静止画作成にはImage 2.0、動的な映像シーンの作成にはVideo 1.5を選択し、同一のキャンバス上で目的に応じて自由に切り替えて利用できます。",
            },
            {
                question: "Grok Imagineの利用料金はどのように計算されますか？",
                answer: "画像生成のImage 2.0は画像1枚単位、動画生成のVideo 1.5は秒数単位でクレジットが消費されます。解像度によって消費量が異なりますが、実行前に必ず消費クレジットが表示されます。",
            },
            {
                question: "Grok Imagineでの生成に失敗した場合、クレジットは戻りますか？",
                answer: "生成に失敗したクレジットは自動でアカウントへ返還されます。また、キャンバスの利用、手動での脚本作成や絵コンテ編集は無料であり、AI脚本、絵コンテ、画像や動画の生成時にモデルに応じたクレジットが消費されます。",
            },
        ],
        "nano-banana": [
            {
                question: "Nano Banana（ナノバナナ）はどの企業の技術ですか？どのような用途に使えますか？",
                answer: "Google社が手掛ける高品質な画像生成モデルです。絵コンテ用のカット画像やキャラクター設定の参考画像などを、カード上での選択や右側のアシスタントとの対話を通じて生成できます。",
            },
            { question: "Nano Bananaにはどのようなバージョンが用意されていますか？", answer: "Nano Banana、Nano Banana 2、Nano Banana 2.1、そしてNano Banana Pro（1K）の4つのバージョンが提供されています。用途や解像度に合わせてカード上で選択できます。" },
            {
                question: "Nano Bananaを使って画像を生成する際の料金体系はどうなっていますか？",
                answer: "画像生成モデルのため、生成画像1枚ごとにクレジットが消費されます。バージョンや解像度により消費量は異なりますが、生成前に正確な数値が提示され、生成失敗時はクレジットが返還されます。",
            },
            {
                question: "自分のGoogle APIキーを持ち込んでNano Bananaを利用できますか？",
                answer: "接続可能です。設定画面からお持ちのAPIキー（BYOK）を登録すれば、モデルの利用料金は提供元から直接引き落とされます。プラットフォーム側での上乗せはなく、ワークスペース利用料のみで利用できます。",
            },
        ],
        "gpt-image-2": [
            {
                question: "GPT Image 2はどの企業が開発したモデルですか？利用可能なバージョンは？",
                answer: "OpenAI社が開発した画像生成モデルです。DramaCanvasではGPT Image 2、GPT Image 2.5およびGPT Image 2.6の3つのバージョンに対応しており、用途に合わせて切り替えられます。",
            },
            {
                question: "GPT Image 2、2.5および2.6は画像用ですか、それとも動画用のモデルですか？",
                answer: "静止画像を生成するためのモデルであり、生成した画像の枚数に応じてクレジットが消費されます。絵コンテカード上でバージョンや解像度を自由に選んで出力できます。",
            },
            {
                question: "GPT Imageシリーズの画像生成料金はどのように計算されますか？",
                answer: "画像1枚単位でのクレジット課金となります。バージョンや解像度ごとに設定された消費クレジットが実行前に明示され、生成に失敗した場合はクレジットがアカウントに戻ります。",
            },
            {
                question: "DramaCanvasのキャンバス上でGPT Image 2を呼び出す方法は？",
                answer: "画面右側のAIアシスタントにチャットで指示するか、絵コンテカードで対象モデルを指定して生成します。手動での脚本作成や絵コンテ編集は無料で、GPT Image 2 での画像生成は枚数に応じて消費され、AI脚本やAI絵コンテもクレジットを消費します。",
            },
        ],
        "midjourney-v7": [
            {
                question: "Midjourney V7を使うためにDiscordのアカウントや接続は必要ですか？",
                answer: "Discordは不要です。DramaCanvasならWebキャンバス上から直接Midjourney V7を呼び出して画像を生成できます。複雑な設定なしで、カード上やチャットからすぐに利用可能です。",
            },
            {
                question: "Midjourney V7の料金は生成枚数単位ですか、それとも利用時間単位ですか？",
                answer: "生成した画像1枚ごとにクレジットが消費される枚数単位の計算です。解像度によって消費量が異なりますが、画像を生成する前に消費クレジットが明確に画面へ表示されます。",
            },
            {
                question: "Midjourney V7での画像生成に失敗した場合、クレジットは差し引かれますか？",
                answer: "生成に失敗したクレジットは自動でアカウントへ返還されます。生成を実行する前に今回の消費クレジットが表示されるため、事前に確認したうえで安心してご利用いただけます。",
            },
            {
                question: "Midjourney V7で生成した画像は商用利用できますか？",
                answer: "原則として商用利用が可能です。ただし、Midjourney社の利用規約およびアップロードした参考素材の著作権に準拠する必要があります。有料プランの利用によって他者の権利が自動で付与されるわけではありません。",
            },
        ],
    },
    "ko-KR": {
        home: [
            { question: HOME_POSITIONING["ko-KR"].question, answer: HOME_POSITIONING["ko-KR"].answer },
            { question: SIGNUP_CREDITS_COPY["ko-KR"].question, answer: SIGNUP_CREDITS_COPY["ko-KR"].answer },
            { question: "생성에 실패하면 크레딧이 반환되나요?", answer: GENERATION_REFUND_COPY["ko-KR"] },
            {
                question: "프롬프트를 잘 모르거나 영상 편집 경험이 없어도 쓸 수 있나요?",
                answer: "전문 지식이 없어도 얼마든지 쓸 수 있어요. 일상적인 대화체로 줄거리를 입력하기만 하면 AI 어시스턴트가 숏 크기, 카메라 앵글, 인물 동작이 적힌 콘티 카드로 알맞게 나눠줘요. 생성된 영상 클립은 캔버스에 내장된 타임라인에 끌어다 놓기만 하면 순서대로 이어져서 손쉽게 연출할 수 있어요.",
            },
        ],
        pricing: [
            {
                question: "DramaCanvas의 구독 요금제는 어떻게 구성되어 있나요?",
                answer: "스탠다드 플랜은 월간 구독 시 월 {monthly}에 {monthlyCredits} 크레딧이 제공되고, 연간 구독 시 연 {annual}에 {annualCredits} 크레딧이 제공돼요. 모든 요금은 미국 달러(USD)로 결제되며, 제공된 크레딧으로 이미지와 영상을 모두 생성할 수 있어요. 화면을 만들기 전에 차감될 크레딧이 항상 미리 안내돼요.",
            },
            {
                question: "구독을 결제하면 크레딧은 언제 충전되나요?",
                answer: "결제가 완료되는 즉시 계정으로 크레딧이 들어와요. 월간 플랜은 매달 한 번씩 지급되고, 연간 플랜은 1년 치 크레딧이 한 번에 모두 지급돼요. 캔버스에서 생성 버튼을 누르기 전 이번에 차감될 정확한 크레딧을 언제나 확인할 수 있어요.",
            },
            { question: "생성에 실패하면 크레딧이 반환되나요?", answer: GENERATION_REFUND_COPY["ko-KR"] },
            {
                question: "크레딧 충전팩과 멤버십 구독을 함께 쓸 수 있나요?",
                answer: "네, 함께 이용하실 수 있어요. 멤버십으로 받은 정기 크레딧과 별도로 구매한 충전팩 크레딧은 분리되어 관리되며, 지갑에 설정된 순서에 맞춰 차감돼요. 현재 남은 잔액은 지갑 메뉴에서 언제든 확인 가능해요.",
            },
            {
                question: "연간 구독이 월간 구독보다 더 유리한가요?",
                answer: "네, 연간 구독이 훨씬 알뜰해요. 연간 구독은 10개월 치 요금만 내고 12개월 분량인 총 {annualCredits} 크레딧을 한꺼번에 받으실 수 있어요. 1 크레딧당 비용을 따져보면 약 {annualUnit} 수준으로, 월간 구독(약 {monthlyUnit})보다 비용을 크게 아낄 수 있어요.",
            },
            {
                question: "팀 요금제는 어떻게 운영되고 관리하나요?",
                answer: "팀은 소유자와 관리자가 관리하며, 구성원 초대와 권한, 크레딧 사용 한도를 설정할 수 있어요. 팀 플랜 온라인 결제는 아직 지원되지 않아요.",
            },
            {
                question: "자체 API 키(BYOK)를 연결하면 요금이 어떻게 청구되나요?",
                answer: "플랫폼은 모델 이용료에 추가 마진을 전혀 붙이지 않으며 플랫폼 생성 크레딧도 차감하지 않아요. 사용자는 DramaCanvas의 작업 공간 이용료만 결제하시면 되고, 모델 호출 비용은 연결하신 외부 제공업체 계정에서 직접 청구돼요.",
            },
            {
                question: "무료로 이용할 수 있는 기능은 무엇이 있나요?",
                answer: "각본을 수동으로 작성하고 스토리보드를 직접 편집하는 작업은 무료입니다. 작업 리소스는 브라우저나 권한을 허용한 로컬 폴더에 보관할 수 있으며, 리소스가 포함된 ZIP 파일로 캔버스를 내보낼 수도 있습니다. 플랫폼에서 클라우드 저장 공간 제공을 약속하지는 않습니다.",
            },
            {
                question: "어떤 AI 기능을 실행할 때 크레딧이 차감되나요?",
                answer: "AI 각본 생성, AI 텍스트 스토리보드, 이미지 및 비디오 생성 시 선택한 작업과 모델에 따라 크레딧이 차감됩니다. 텍스트는 요청 건당 또는 사용량 기준, 이미지는 모델 사양 기준, 비디오는 요청 건당 또는 초 단위로 계산됩니다. 실행 전 이번 작업에 차감될 크레딧이 표시됩니다.",
            },
            {
                question: "크레딧 팩과 구독 크레딧에 유효기간이 있나요?",
                answer: "구매한 크레딧 팩과 정기 구독으로 지급된 크레딧은 만료일이 없으며 구독 기간이 끝나도 초기화되지 않습니다. 이벤트나 혜택으로 제공된 크레딧은 각자의 유효기간이 있을 수 있으니 지급 당시의 안내를 확인해 주시기 바랍니다.",
            },
            {
                question: "모델, 영상 길이, 해상도가 크레딧 소모에 어떤 영향을 주나요?",
                answer: "선택한 모델과 세부 사양에 따라 가격 등급이 달라집니다. 일부 비디오는 초 단위로 요금이 책정되어 길이가 길수록 더 많이 차감되며 해상도에 따라 선택 가능한 영상 길이나 가격이 영향을 받습니다. 실제 사용량 기준으로 정산될 때 초과 예약된 크레딧은 잔액으로 반환됩니다.",
            },
            {
                question: "에이전트를 사용하면 별도 이용료가 청구되나요?",
                answer: "별도의 에이전트 서비스 비용은 없으며 에이전트가 실제로 수행한 텍스트, 이미지, 비디오 생성 작업에 대해서만 크레딧이 차감됩니다. MCP를 통해 에이전트를 실행할 때는 라운드별 크레딧 예산 상한을 설정할 수 있으며 이는 지출 한도일 뿐 고정 청구 금액이 아닙니다.",
            },
            {
                question: "작업 취소, 시간 초과, 일부 성공, 재생성 시 크레딧은 어떻게 처리되나요?",
                answer: "명확히 실패한 작업이나 모델 서비스로 전달되기 전에 취소된 작업의 크레딧은 잔액으로 반환됩니다. 모델 측 상태를 즉시 알 수 없는 경우에는 크레딧이 우선 동결되며 확인 후 성공 시 정산, 실패 시 잔액으로 반환됩니다. 일부 성공한 작업은 실제 사용량에 맞춰 정산되고 초과 예약분은 잔액으로 반환되며, 다시 생성하는 작업은 새로운 생성으로 간주되어 새 견적에 맞춰 크레딧이 차감됩니다.",
            },
            {
                question: "팀 크레딧은 어떻게 사용하고 관리하나요?",
                answer: "팀 전용 독립 크레딧 계정이 제공되어 멤버별 월간 예산을 설정할 수 있습니다. 팀 소유자와 관리자는 팀 이용 내역을 확인하고 본인의 개인 크레딧을 팀 계정으로 이관할 수 있으며, 일반 멤버는 이용 내역 확인이나 크레딧 이관이 불가능합니다.",
            },
            {
                question: "무료로 생성한 작품에 워터마크가 표시되나요?",
                answer: "결제 이력이 없는 계정으로 생성한 이미지와 영상 좌측 상단에는 워터마크가 표시되며(개인 API 키 사용 시 제외), 워터마크 생성 시 크레딧은 차감되지 않습니다. 크레딧을 충전하거나 요금제를 구독하시면 이전 및 향후 생성된 모든 작품을 워터마크 없이 다운로드할 수 있습니다.",
            },
        ],
        help: [
            {
                question: "캔버스에서 첫 숏폼 드라마는 어떻게 만들기 시작하나요?",
                answer: "준비한 줄거리나 대본 대강을 입력하고 오른쪽 AI 어시스턴트에게 말을 걸면 바로 시작할 수 있어요. 어시스턴트가 카메라 앵글과 숏 크기, 인물 동작이 포함된 콘티 카드를 자동으로 나눠주고, 등장인물 설정을 확인한 다음 한 컷씩 장면을 만들어 타임라인에 정돈하시면 돼요.",
            },
            {
                question: "여러 장면에서 주인공의 외모를 비슷하게 유지하려면 어떻게 해야 하나요?",
                answer: "장면을 생성하기 전에 선명한 얼굴이 담긴 캐릭터 참고 이미지를 미리 지정해 두는 것을 추천해요. 시스템이 다음 컷들을 배치할 때 해당 얼굴 윤곽을 우선적으로 참고해 일관성을 최대한 유지해 줘요. 만약 특정 컷에서 얼굴이 다르게 나왔다면 참고 이미지를 바꾸거나 프롬프트를 약간 수정해 해당 컷만 다시 생성해 보세요.",
            },
            {
                question: "만든 작업물과 소재는 어디에 저장되며 어떻게 백업하나요?",
                answer: "작업한 에셋은 웹 브라우저에 저장하거나 로컬 컴퓨터 폴더 권한을 승인해 보관할 수 있어요. 백업을 원할 때는 캔버스 목록에서 해당 프로젝트를 골라 .zip 파일로 내보내시면 돼요. 중요한 원본 소스는 별도의 공간에 따로 보관해 두시는 것이 좋아요.",
            },
            {
                question: "DramaCanvas로 생성한 영상을 상업적으로 이용할 수 있나요?",
                answer: "상업적 프로젝트에 활용하실 수 있지만, 선택한 각 AI 모델의 이용약관과 직접 올린 원본 소재의 저작권 여부를 확인하셔야 해요. DramaCanvas 멤버십에 가입했다고 해서 외부 제3자 콘텐츠의 저작권까지 자동으로 취득되는 것은 아니에요.",
            },
            {
                question: "다른 팀원을 초대해서 함께 작업하려면 어떻게 하나요?",
                answer: "팀 관리자가 팀 설정 화면에서 초대 링크를 보내고 팀원들의 권한과 크레딧 한도를 관리할 수 있어요.",
            },
            { question: "생성에 실패했을 때는 어떻게 대처해야 하나요?", answer: GENERATION_REFUND_COPY["ko-KR"] },
        ],
        mcp: [
            {
                question: "DramaCanvas의 MCP란 무엇이고 어떤 일을 할 수 있나요?",
                answer: "외부의 AI 코딩 및 작업 도구가 사용자의 캔버스를 직접 조작할 수 있도록 돕는 개방형 프로토콜이에요. 연동을 마치면 외부 AI 도구가 대본 콘티를 대신 작성하거나 캔버스에 컷 카드를 배치하고 영상 생성 모델을 직접 호출할 수도 있어요.",
            },
            {
                question: "현재 어떤 AI 도구와 연동할 수 있나요?",
                answer: "현재 Claude Code, Codex, Cursor 등 MCP 프로토콜을 지원하는 다양한 개발 도구와 연동할 수 있어요. 평소 사용하시는 도구 안에서 자연어로 명령을 내려 DramaCanvas 캔버스 위에 기획과 장면을 만들어낼 수 있어요.",
            },
            {
                question: "외부 도구를 통해 생성할 때도 크레딧이 차감되나요? 비용은 어떻게 관리하나요?",
                answer: "네, 외부 도구로 생성하더라도 계정의 크레딧이 동일하게 차감돼요. 불필요한 과금을 방지하려면 플랫폼의 API 키 관리 페이지에서 해당 연결의 크레딧 지출 한도를 미리 설정해 두세요. 설정한 한도에 도달하면 자동으로 생성이 멈춰 안전해요.",
            },
            {
                question: "더 이상 쓰지 않을 때 외부 도구의 접근 권한은 어떻게 해제하나요?",
                answer: "플랫폼의 API 키 관리 페이지에서 등록된 키를 삭제하거나 비활성화하시면 돼요. 키를 해제하는 즉시 외부 도구의 캔버스 접근과 크레딧 차감 권한이 차단되며, 캔버스에 이미 작성된 프로젝트 내용은 그대로 안전하게 유지돼요.",
            },
        ],
        "seedance-2-0": [
            {
                question: "DramaCanvas에서 지원하는 Seedance 2.0은 어디에서 개발했나요?",
                answer: "Seedance 2.0은 바이트댄스(ByteDance)에서 개발한 영상 모델로 지몽(即梦)과 같은 기술 계열이에요. 캔버스 오른쪽에서 AI 어시스턴트와 대화하거나 콘티 카드에서 Seedance 2.0을 직접 선택해 영상을 만들 수 있으며, 콘티를 기획하는 과정은 무료예요.",
            },
            { question: "Seedance 2.0은 어떤 버전들을 지원하나요?", answer: "플랫폼에서는 표준, Fast, Mini, HC, 720P 등 총 5가지 버전을 제공하고 있어요. 각 버전과 해상도에 따라 차감되는 크레딧이 다르므로 영상 연출 목적에 맞춰 자유롭게 선택하시면 돼요." },
            {
                question: "Seedance 2.0으로 영상을 만들 때 요금은 어떻게 계산되나요?",
                answer: "Seedance 2.0은 생성되는 영상의 초(초당) 단위로 크레딧을 계산해요. 버전과 해상도에 따라 필요한 크레딧이 다르며, 생성 버튼을 누르기 전 캔버스에 정확한 차감량이 표시되고 생성에 실패하면 크레딧이 자동으로 반환돼요.",
            },
            {
                question: "보유한 개인 API 키로 Seedance 2.0을 이용할 수 있나요?",
                answer: "네, 가능해요. 설정 메뉴에서 OpenAI나 Gemini 등과 호환되는 자체 키(BYOK)를 등록하시면 모델 사용료는 해당 공급사 계정에서 직접 결제되며, 플랫폼은 모델 추가 요금을 붙이거나 크레딧을 차감하지 않고 작업 공간 서비스 요금만 별도로 청구해요.",
            },
        ],
        "seedance-2-5": [
            {
                question: "Seedance 2.5는 이전 2.0 버전과 어떤 점이 다른가요?",
                answer: "Seedance 2.5는 바이트댄스에서 선보인 차세대 영상 모델로 역시 지몽과 같은 기술 계열이에요. 플랫폼에서는 표준 버전과 1080P Max 버전을 지원하며, 생성된 영상 길이에 따라 초 단위로 크레딧이 계산돼요.",
            },
            {
                question: "Seedance 2.5에는 어떤 버전들이 준비되어 있나요?",
                answer: "현재 표준 버전과 1080P Max 버전 두 가지를 지원하고 있어요. 버전과 선택한 해상도마다 필요한 크레딧이 달라지며, 생성하기 전에 이번 컷에 쓰일 정확한 수치를 캔버스 화면에서 미리 확인할 수 있어요.",
            },
            {
                question: "DramaCanvas에서 Seedance 2.5로 영상을 생성하려면 어떻게 하나요?",
                answer: "캔버스 오른쪽에서 AI 어시스턴트에게 생성을 요청하거나 콘티 카드에서 Seedance 2.5 모델을 직접 고르시면 돼요. 생성을 진행하기 전에 소모될 크레딧이 화면에 투명하게 안내되며 생성이 실패하면 크레딧은 계정으로 즉시 돌아와요.",
            },
            {
                question: "Seedance 2.5를 이용한 숏폼 드라마 기획을 무료로 체험할 수 있나요?",
                answer: "네, 캔버스에서 수동으로 대본을 작성하고 콘티를 배열하는 작업은 무료예요. AI 대본, AI 콘티 및 영상 생성은 모델에 따라 크레딧이 차감되며, 영상은 초 단위로 계산되어 실행 전 화면에 표시돼요.",
            },
        ],
        "sora-2": [
            {
                question: "DramaCanvas에서 Sora 2를 쓰려면 초대 코드가 필요한가요?",
                answer: "초대 코드가 전혀 필요 없어요. Sora 2는 OpenAI에서 개발한 모델로, 별도의 클로즈드 베타 신청 없이 웹 캔버스에서 바로 선택해 쓸 수 있어요. 카드에서 모델을 선택하거나 오른쪽 어시스턴트와 대화해 바로 영상을 생성해 보세요.",
            },
            {
                question: "Sora 2는 어느 회사에서 만든 모델인가요?",
                answer: "Sora 2는 OpenAI의 비디오 생성 모델이에요. DramaCanvas에서는 영상 생성에 활용되며 영상의 재생 길이에 맞춰 초 단위로 크레딧이 차감돼요. 생성하기 전 화면에서 소모될 크레딧을 미리 알려드려요.",
            },
            {
                question: "Sora 2 영상 생성 시 크레딧은 어떻게 차감되나요?",
                answer: "Sora 2는 영상 모델이므로 생성되는 영상의 초 단위 길이에 따라 요금이 차감돼요. 해상도 규격에 따라 단가가 다르며 생성 버튼을 누르기 전 정확한 크레딧이 표시되고 생성에 실패하면 크레딧이 반환돼요.",
            },
            {
                question: "자체 OpenAI API 키를 등록해 Sora 2를 호출할 수 있나요?",
                answer: "네, 지원해요. 계정 설정에서 OpenAI 호환 자체 키(BYOK)를 연결하시면 모델 호출 비용은 OpenAI 계정에서 직접 청구돼요. 플랫폼은 모델 추가 마진을 남기지 않고 생성 크레딧도 깎지 않으며 작업 공간 이용료만 별도로 청구돼요.",
            },
        ],
        "veo-3-1": [
            { question: "Veo 3.1은 어느 회사의 AI 모델인가요?", answer: "Veo 3.1은 구글(Google)에서 개발한 영상 생성 모델이에요. DramaCanvas의 콘티 카드에서 모델을 직접 고르거나 오른쪽 AI 어시스턴트 대화창에 명령을 내려 고품질 영상을 생성할 수 있어요." },
            {
                question: "Veo 3.1은 초 단위 과금인가요, 생성 횟수 단위 과금인가요?",
                answer: "Veo 3.1은 기본적으로 초 단위 과금을 적용하며 일부 규격에 한해 생성 횟수(회당) 단위로 차감돼요. 세부 규격과 해상도에 따라 필요한 크레딧이 달라지며, 생성 전 캔버스 카드에 정확한 수치가 표시돼요.",
            },
            {
                question: "크레딧 소모 없이 Veo 3.1 관련 연출을 미리 기획해 볼 수 있나요?",
                answer: "네, 캔버스에서 수동으로 대본을 쓰고 콘티를 편집하는 과정은 무료예요. AI 대본, AI 콘티 및 Veo 3.1 영상 생성에는 크레딧이 들며, 실행 전 차감량을 미리 확인하실 수 있고 생성이 실패하면 크레딧은 안전하게 돌아와요.",
            },
            {
                question: "자체 구글 API 키를 연결해 Veo 3.1을 사용할 수 있나요?",
                answer: "네, 가능해요. 설정에서 Gemini 호환 자체 키(BYOK)를 등록하시면 구글 계정에서 직접 모델 비용이 청구돼요. DramaCanvas는 모델 요금에 마진을 붙이지 않고 플랫폼 크레딧도 차감하지 않으며 작업 공간 서비스 요금만 별도로 책정돼요.",
            },
        ],
        "kling-3-0": [
            {
                question: "Kling 3.0(클링 3.0)은 어떤 차별화된 기능들을 갖추고 있나요?",
                answer: "Kling 3.0은 시작·종료 이미지 2장을 지원하며 일반 생성은 3–15초, 모션 제어는 3–30초예요. Turbo는 시작 이미지 1장만 지원하며 길이는 3–15초예요.",
            },
            {
                question: "클링 3.0의 모션 컨트롤 기능이란 무엇인가요?",
                answer: "Kling 3.0의 모션 제어는 3–30초, 일반 생성은 3–15초를 지원해요. 생성 전에 캔버스에서 선택한 설정과 크레딧 비용을 확인할 수 있어요.",
            },
            {
                question: "Kling 3.0에는 어떤 버전이 있고 요금은 어떻게 계산되나요?",
                answer: "표준 버전과 고속 생성을 위한 Turbo 버전 두 가지가 있으며, 모두 생성된 초 단위로 계산돼요. 버전과 해상도 옵션에 따라 필요한 크레딧이 다르며, 생성 버튼을 누르기 전 캔버스 카드에 정확한 수치가 표시돼요.",
            },
            {
                question: "캔버스에서 Kling 3.0으로 영상을 만들려면 어떻게 조작하나요?",
                answer: "화면 오른쪽의 AI 어시스턴트에게 원하는 장면을 말하거나 콘티 카드에서 Kling 3.0을 선택해 생성하시면 돼요. 실행 전 이번 컷에 소모될 크레딧을 바로 확인할 수 있으며, 만에 하나 생성이 실패하더라도 크레딧은 반환돼요.",
            },
        ],
        "minimax-h3": [
            {
                question: "MiniMax H3(하이루오 AI)는 여러 장의 이미지를 모아 영상으로 만들 수 있나요?",
                answer: "MiniMax H3와 H3 Max는 모두 시작 프레임 이미지 1장만 지원하며, 여러 이미지·참조 영상·참조 음성은 지원하지 않아요.",
            },
            {
                question: "DramaCanvas에서는 MiniMax H3의 어떤 버전을 제공하나요?",
                answer: "플랫폼에서는 표준 버전과 성능을 높인 H3 Max 버전 두 가지를 지원하고 있어요. 생성되는 영상의 초 단위로 크레딧이 계산되며 버전 및 해상도에 따른 차감 수치는 생성 전 캔버스 카드에서 바로 확인하실 수 있어요.",
            },
            {
                question: "MiniMax H3로 영상을 생성할 때 요금은 어떻게 차감되나요?",
                answer: "MiniMax H3는 영상의 재생 초 단위로 크레딧이 차감돼요. 선택한 버전과 해상도에 따라 차감되는 크레딧이 다르며, 작업을 시작하기 전 캔버스에 확정 소모량이 명확히 표시되고 생성이 실패하면 크레딧은 전부 반환돼요.",
            },
            {
                question: "보유한 자체 API 키로 MiniMax H3를 이용할 수 있나요?",
                answer: "네, 가능해요. 설정에서 호환되는 자체 API 키(BYOK)를 등록하시면 모델 호출 요금은 해당 공급사 계정에서 직접 빠져나가요. 플랫폼은 추가 마진을 붙이지 않고 생성 크레딧도 차감하지 않으며 작업 공간 서비스 이용료만 별도로 청구돼요.",
            },
        ],
        "wan-3-0": [
            {
                question: "Wan 3.0(통이완샹)은 어느 회사에서 개발한 모델인가요?",
                answer: "Wan 3.0은 알리바바(Alibaba)에서 개발한 영상 생성 모델이에요. 캔버스 오른쪽에서 AI 어시스턴트와 대화하며 연출을 지시하거나 콘티 카드에서 해당 모델을 직접 선택해 영상을 생성할 수 있어요.",
            },
            { question: "Wan 3.0에는 어떤 버전 옵션이 마련되어 있나요?", answer: "플랫폼에서는 표준 버전과 Prime 버전 두 가지를 제공하고 있어요. 두 버전 모두 영상의 초 단위로 요금이 계산되며, 버전 및 해상도에 따라 필요한 크레딧이 화면에 미리 안내돼요." },
            {
                question: "Wan 3.0 영상 생성은 어떻게 과금되나요?",
                answer: "Wan 3.0은 영상 모델로 생성된 영상의 길이에 맞춰 초 단위로 계산돼요. 해상도와 버전에 따라 단가가 다르며 실행 전 캔버스 카드에 차감될 정확한 크레딧이 표시되고 생성 실패 시 크레딧은 반환돼요.",
            },
            {
                question: "Wan 3.0으로 대본과 콘티를 먼저 구성할 때도 비용이 발생하나요?",
                answer: "캔버스 위에서 수동으로 대본을 작성하고 콘티를 배열하는 과정은 무료예요. AI 대본, AI 콘티 및 Wan 3.0 영상 생성은 크레딧이 차감되며, 영상은 초 단위로 계산되어 실행 전 차감량이 미리 안내돼요.",
            },
        ],
        "grok-imagine": [
            {
                question: "Grok Imagine은 어느 회사에서 만든 모델이며 어떤 규격이 있나요?",
                answer: "Grok Imagine은 xAI에서 개발한 모델 시리즈예요. 이미지를 생성하는 데 쓰이는 Grok Imagine Image 2.0과 영상을 생성하는 Grok Imagine Video 1.5로 구성되어 있어요.",
            },
            {
                question: "Grok Imagine으로 이미지와 영상을 둘 다 만들 수 있나요?",
                answer: "네, 이미지와 영상을 모두 지원해요. 콘티 장면을 그릴 때는 Grok Imagine Image 2.0을 호출하고 움직이는 영상을 만들 때는 Grok Imagine Video 1.5를 선택해 캔버스에서 바로 제작할 수 있어요.",
            },
            {
                question: "Grok Imagine의 이용 요금은 어떻게 계산되나요?",
                answer: "이미지 모델인 Image 2.0은 생성 장수(장당) 단위로, 영상 모델인 Video 1.5는 영상 길이(초당) 단위로 크레딧이 차감돼요. 선택한 해상도에 따라 필요한 크레딧이 달라지며 생성 전 캔버스 카드에 정확한 수치가 표시돼요.",
            },
            {
                question: "Grok Imagine으로 생성하다가 실패하면 크레딧이 반환되나요?",
                answer: "네, 생성에 실패하면 차감된 크레딧이 자동으로 반환돼요. 캔버스를 열어 수동으로 대본을 쓰고 콘티를 정리하는 과정은 무료이며, AI 대본, 콘티, 이미지 및 영상 생성 시 사전에 고지된 크레딧이 차감돼요.",
            },
        ],
        "nano-banana": [
            {
                question: "Nano Banana(나노바나나)는 어느 회사 기술이며 주로 어디에 쓰이나요?",
                answer: "나노바나나는 구글(Google)의 이미지 생성 모델 기술이에요. 캔버스 콘티 카드에서 모델을 직접 고르거나 오른쪽 AI 어시스턴트에게 요청해 숏폼 드라마 연출에 필요한 캐릭터 원화와 컷별 콘티 이미지를 생성할 수 있어요.",
            },
            { question: "DramaCanvas에서는 Nano Banana의 어떤 버전을 지원하나요?", answer: "현재 플랫폼에서는 Nano Banana, Nano Banana 2, Nano Banana 2.1, 그리고 고해상도 규격인 Nano Banana Pro(1K)까지 총 4개 버전을 제공하고 있어요." },
            {
                question: "Nano Banana로 이미지를 만들 때 요금은 어떻게 차감되나요?",
                answer: "Nano Banana는 이미지 생성 모델이므로 생성되는 장수(장당)를 기준으로 크레딧이 차감돼요. 버전과 해상도 규격에 따라 차감 수치가 다르며, 실행 전 캔버스에 정확한 소모량이 표시되고 생성이 실패하면 크레딧이 반환돼요.",
            },
            {
                question: "자체 구글 API 키를 등록해 Nano Banana를 호출할 수 있나요?",
                answer: "네, 지원해요. 계정 설정에서 호환되는 자체 키(BYOK)를 연결하시면 모델 호출 비용은 구글 계정에서 직접 청구돼요. 플랫폼은 추가 마진을 남기지 않고 생성 크레딧도 차감하지 않으며 작업 공간 서비스 이용료만 별도로 청구돼요.",
            },
        ],
        "gpt-image-2": [
            {
                question: "GPT Image 2는 어디에서 개발한 모델인가요? 어떤 버전을 제공하나요?",
                answer: "GPT Image 2는 OpenAI에서 개발한 이미지 모델이에요. 현재 DramaCanvas에서는 GPT Image 2, GPT Image 2.5와 GPT Image 2.6 세 가지 버전을 모두 지원하고 있어요.",
            },
            {
                question: "GPT Image 2, 2.5와 2.6은 비디오 모델인가요, 이미지 모델인가요?",
                answer: "세 모델 모두 이미지를 생성하는 모델이에요. 생성되는 장수(장당)를 기준으로 과금되며, 콘티 카드에서 제작 스타일에 맞춰 원하는 버전과 해상도를 자유롭게 전환해 쓰실 수 있어요.",
            },
            {
                question: "GPT Image 시리즈로 이미지를 생성할 때 요금은 어떻게 되나요?",
                answer: "해당 시리즈는 생성 장수 단위로 크레딧이 차감돼요. 버전과 해상도에 따라 필요한 크레딧이 달라지며, 생성 전 캔버스 카드에 정확한 수치가 표시되고 생성에 실패하면 크레딧이 자동으로 반환돼요.",
            },
            {
                question: "DramaCanvas에서 GPT Image 2를 호출하려면 어떻게 하나요?",
                answer: "캔버스 오른쪽에서 AI 어시스턴트에게 원하는 장면을 설명하거나 콘티 카드에서 직접 GPT Image 2 모델을 선택하시면 돼요. 수동 대본 작성과 콘티 배치는 무료이며, GPT Image 2 이미지 생성은 장당 크레딧이 차감되고 AI 대본과 AI 콘티 역시 크레딧이 차감돼요.",
            },
        ],
        "midjourney-v7": [
            {
                question: "Midjourney V7(미드저니 V7)을 쓰려면 Discord 계정에 로그인하거나 연동해야 하나요?",
                answer: "Discord 계정이 전혀 필요 없어요. DramaCanvas에서는 복잡한 설정 없이 웹 캔버스 안에서 Midjourney V7을 직접 호출해 고품질 이미지를 바로 생성할 수 있어요.",
            },
            {
                question: "Midjourney V7은 생성 장수 기준인가요, 사용 시간 기준인가요?",
                answer: "Midjourney V7은 이미지 모델로 생성 장수(장당) 단위로 크레딧이 차감돼요. 해상도에 따라 필요한 크레딧이 다르며 이미지를 생성하기 전 캔버스에 차감될 정확한 크레딧이 투명하게 표시돼요.",
            },
            {
                question: "Midjourney V7으로 이미지를 만들다가 실패하면 크레딧이 차감되나요?",
                answer: "아니요, 생성에 실패하면 차감된 크레딧이 자동으로 반환돼요. 생성 버튼을 누르기 전에 차감될 크레딧이 항상 화면에 표시되므로 편안하게 작업하실 수 있어요.",
            },
            {
                question: "Midjourney V7으로 생성한 이미지를 상업적으로 이용할 수 있나요?",
                answer: "상업적 이용이 가능하지만 미드저니의 공식 이용약관과 직접 업로드한 원본 참고 자료의 저작권을 준수해야 해요. 멤버십을 결제하더라도 외부 콘텐츠의 저작권이 자동으로 부여되는 것은 아니에요.",
            },
        ],
    },
    "es-ES": {
        home: [
            { question: HOME_POSITIONING["es-ES"].question, answer: HOME_POSITIONING["es-ES"].answer },
            { question: SIGNUP_CREDITS_COPY["es-ES"].question, answer: SIGNUP_CREDITS_COPY["es-ES"].answer },
            { question: "¿Qué pasa con mis créditos si falla una generación?", answer: GENERATION_REFUND_COPY["es-ES"] },
            {
                question: "¿Puedo usarlo si no sé escribir prompts ni editar vídeo?",
                answer: "Sí, sin problema. Solo tienes que describir tu historia con tus propias palabras y el asistente de IA la desglosará en tarjetas de planos con encuadres y acciones; además, puedes ordenar los fragmentos de vídeo arrastrándolos en la línea de tiempo integrada, sin conocimientos técnicos de edición.",
            },
        ],
        pricing: [
            {
                question: "¿Cuáles son los planes y precios de suscripción de DramaCanvas?",
                answer: "El plan mensual cuesta {monthly} al mes e incluye {monthlyCredits} créditos, y el plan anual cuesta {annual} al año con {annualCredits} créditos. Todos los planes se cobran en dólares estadounidenses ($), las imágenes y los vídeos comparten el mismo saldo y siempre verás el consumo confirmado de créditos antes de cada generación.",
            },
            {
                question: "¿Cuándo se reciben los créditos tras pagar la suscripción?",
                answer: "Los créditos se añaden a tu cuenta en cuanto el pago se completa. En la suscripción mensual se renuevan cada mes; en la suscripción anual recibes todos los créditos del año de una sola vez. Antes de generar cualquier contenido, el lienzo te mostrará el coste exacto en créditos.",
            },
            { question: "¿Se devuelven los créditos si falla una generación?", answer: GENERATION_REFUND_COPY["es-ES"] },
            {
                question: "¿Puedo combinar los paquetes de créditos con la suscripción?",
                answer: "Sí, puedes usarlos a la vez. Los créditos de tu suscripción y los de paquetes adquiridos por separado se registran de forma independiente y se consumen según el orden establecido en tu monedero, donde puedes consultar tu saldo en todo momento.",
            },
            {
                question: "¿Sale más a cuenta la suscripción anual que la mensual?",
                answer: "Sí, la suscripción anual es más ventajosa. En Estándar, Avanzado y Premium solo pagas 10 meses y recibes los créditos de 12 meses juntos (Lujo recibe unos 11,6 meses y Supreme tiene la misma tarifa en todos los periodos), lo que deja el crédito a unos {annualUnit} frente a los aproximadamente {monthlyUnit} del plan mensual.",
            },
            {
                question: "¿Cómo funciona la facturación y la gestión del plan para equipos?",
                answer: "Los planes de equipo ya se pueden comprar online. El comprador se convierte en el propietario del equipo, puede invitar a miembros por correo y asignar límites de créditos. Los créditos de cada ciclo se acumulan en un fondo común del equipo.",
            },
            {
                question: "¿Cómo se cobra al usar mis propias claves API (BYOK)?",
                answer: "DramaCanvas no añade ningún recargo sobre el precio de los modelos ni consume tus créditos de la plataforma. Pagas únicamente la tarifa del espacio de trabajo de DramaCanvas, y el consumo de los modelos te lo factura directamente tu proveedor de API.",
            },
            {
                question: "¿Qué funciones de la plataforma son gratuitas?",
                answer: "La redacción manual de guiones y la edición manual de guiones gráficos son completamente gratuitas. Puedes guardar tus materiales en el navegador o en una carpeta local autorizada, así como exportar el lienzo en un archivo ZIP con los recursos; la plataforma no promete espacio de almacenamiento en la nube.",
            },
            {
                question: "¿Qué operaciones de IA descuentan créditos?",
                answer: "La generación de guiones, guiones gráficos de texto, imágenes y vídeos mediante IA descuenta créditos según la tarea y el modelo elegidos. El texto se factura por solicitud o volumen de uso, las imágenes por especificación del modelo y los vídeos por solicitud o por segundo. Antes de cada ejecución se muestra el importe de créditos previsto.",
            },
            {
                question: "¿Caducan los paquetes de créditos o los créditos de suscripción?",
                answer: "Los paquetes de créditos adquiridos y los créditos asignados por suscripción no tienen fecha de vencimiento ni se pierden al finalizar el periodo de suscripción. Los créditos obtenidos por promociones o recompensas pueden tener periodos de validez específicos, sujetos a las condiciones indicadas al recibirlos.",
            },
            {
                question: "¿De qué manera afectan el modelo, la duración y la resolución al consumo de créditos?",
                answer: "El modelo y sus especificaciones determinan el nivel de tarifa. Algunos vídeos se tarifan por segundo, consumiendo más a mayor duración, y la resolución influye en la duración elegible y en el coste; al liquidar según el uso real, los créditos retenidos de más se devuelven al saldo.",
            },
            {
                question: "¿Se aplica un suplemento por utilizar los agentes?",
                answer: "No existe una tarifa de servicio independiente para los agentes; solo se descuentan créditos por las tareas generativas reales de texto, imagen o vídeo que ejecute el agente. Al usar agentes vía MCP puedes definir un presupuesto máximo de créditos por ronda, que opera como límite máximo y no como una tarifa fija.",
            },
            {
                question: "¿Cómo se gestionan los créditos en caso de cancelación, tiempo agotado, éxito parcial o regeneración?",
                answer: "Los créditos de tareas claramente fallidas o canceladas antes de enviarse al servicio del modelo se devuelven al saldo; si el estado del modelo queda temporalmente pendiente de confirmar, los créditos se congelan y se liquidan si concluye con éxito o se devuelven al saldo si falla. Los resultados parcialmente completados se liquidan por consumo real devolviendo el exceso reservado al saldo, mientras que regenerar constituye una nueva ejecución sujeta a una nueva cotización de créditos.",
            },
            {
                question: "¿Cómo se administran los créditos de equipo?",
                answer: "El equipo cuenta con una cuenta de créditos independiente que permite asignar presupuestos mensuales a los miembros. Los propietarios y administradores pueden consultar el historial de movimientos y traspasar sus créditos personales a la cuenta del equipo; los miembros estándar no pueden consultar movimientos ni transferir créditos.",
            },
            {
                question: "¿Las creaciones gratuitas tienen marca de agua?",
                answer: "Las imágenes y vídeos generados por cuentas sin pagos previos incluyen una marca de agua en la esquina superior izquierda (salvo si usas tu propia API Key), y añadirla no consume créditos. En cuanto recargues créditos o te suscribas a cualquier plan, podrás descargar sin marca de agua todas tus creaciones pasadas y futuras.",
            },
        ],
        help: [
            {
                question: "¿Cómo creo mi primera serie corta en el lienzo?",
                answer: "Pega el resumen de tu guion y explícaselo al asistente de IA en el panel lateral. El asistente dividirá la historia en tarjetas de storyboard con encuadres y movimientos; cuando confirmes el aspecto de los personajes, genera los planos uno a uno y ordénalos en la línea de tiempo.",
            },
            {
                question: "¿Cómo mantengo la coherencia del personaje en diferentes planos?",
                answer: "Sube una imagen de referencia clara del personaje antes de generar. El sistema priorizará sus rasgos faciales en las siguientes tomas para intentar mantener la coherencia; si un plano se desvía, cambia la imagen de referencia o ajusta el prompt y vuelve a generarlo.",
            },
            {
                question: "¿Dónde se guardan mis archivos y cómo hago una copia de seguridad?",
                answer: "Los archivos pueden guardarse en tu navegador o en una carpeta local de tu ordenador con tu permiso. Para hacer una copia de seguridad, entra en la lista de lienzos y exporta el proyecto como archivo .zip; te recomendamos conservar también una copia de tus materiales originales.",
            },
            {
                question: "¿Puedo usar comercialmente los vídeos generados en DramaCanvas?",
                answer: "Sí, puedes utilizarlos en proyectos comerciales, siempre que respetes las condiciones de uso de cada modelo y cuentes con los derechos del material que subas. La suscripción a la plataforma no otorga automáticamente derechos sobre contenidos de terceros.",
            },
            {
                question: "¿Cómo invito a miembros de mi equipo a colaborar?",
                answer: "La persona administradora puede enviar invitaciones desde la sección de equipo y asignar los permisos y el uso de créditos.",
            },
            { question: "¿Qué hago si una generación da error?", answer: GENERATION_REFUND_COPY["es-ES"] },
        ],
        mcp: [
            {
                question: "¿Qué es el servidor MCP de DramaCanvas y qué permite hacer?",
                answer: "Es una interfaz abierta que permite a asistentes de IA externos interactuar con tu lienzo. Una vez conectado, estas herramientas pueden redactar guiones, organizar tarjetas de planos en el espacio de trabajo y solicitar la generación de imágenes y vídeos con los modelos disponibles.",
            },
            {
                question: "¿Qué herramientas de IA son compatibles con MCP actualmente?",
                answer: "Admite herramientas compatibles con el protocolo MCP como Claude Code, Codex y Cursor. Desde cualquiera de ellas puedes dar instrucciones en lenguaje natural para que organicen y desarrollen tus proyectos en DramaCanvas.",
            },
            {
                question: "¿Generar desde herramientas externas consume créditos? ¿Cómo controlo el gasto?",
                answer: "Sí, consume créditos de tu cuenta de forma habitual. Para fijar un límite, puedes configurar un tope de gasto en el panel de gestión de claves de la plataforma; al alcanzar ese importe, las generaciones se detienen para evitar consumos imprevistos.",
            },
            {
                question: "¿Cómo revoco el acceso de una herramienta externa cuando ya no la necesite?",
                answer: "Entra en el panel de gestión de claves y elimina o revoca la clave correspondiente. La herramienta externa perderá el acceso a tu lienzo y a tus créditos de inmediato, sin que el contenido ya creado sufra ningún cambio.",
            },
        ],
        "seedance-2-0": [
            {
                question: "¿Quién ha desarrollado Seedance 2.0 y cómo se usa en DramaCanvas?",
                answer: "Es un modelo desarrollado por ByteDance (la tecnología presente en Jimeng). Puedes seleccionarlo directamente en las tarjetas de plano o pedírselo al asistente lateral para generar tomas de vídeo; organizar tu guion gráfico en el lienzo es gratis.",
            },
            {
                question: "¿Qué versiones de Seedance 2.0 están disponibles?",
                answer: "DramaCanvas ofrece cinco versiones: Estándar, Fast, Mini, HC y 720P. Cada versión y resolución tiene un coste en créditos distinto, visible en la tarjeta para que elijas la que mejor se adapte a tu plano.",
            },
            {
                question: "¿Cómo se tarifa la generación de vídeo con Seedance 2.0?",
                answer: "Seedance 2.0 se cobra por segundo de vídeo generado. El precio varía según la versión y la resolución, y el lienzo muestra los créditos exactos antes de generar; si la generación falla, los créditos se reintegran a tu cuenta.",
            },
            {
                question: "¿Puedo usar mi propia clave API con Seedance 2.0?",
                answer: "Sí. Si configuras tus propias claves (BYOK) compatibles en los ajustes, pagas el uso directamente a tu proveedor de API sin recargos de DramaCanvas ni consumo de créditos de la plataforma; solo abonas el servicio del espacio de trabajo.",
            },
        ],
        "seedance-2-5": [
            {
                question: "¿En qué se diferencia Seedance 2.5 de Seedance 2.0?",
                answer: "Seedance 2.5 es el modelo de nueva generación de ByteDance (también de la familia Jimeng). En DramaCanvas dispones de las versiones Estándar y 1080P Max, ambas tarifadas por segundo de vídeo generado.",
            },
            {
                question: "¿Qué opciones y resoluciones ofrece Seedance 2.5 en la plataforma?",
                answer: "Dispones de la versión estándar y de la versión 1080P Max. El consumo varía en función de la opción y la resolución elegidas, y el lienzo muestra siempre los créditos exactos requeridos antes de pulsar en generar.",
            },
            {
                question: "¿Cómo se generan vídeos con Seedance 2.5 en el lienzo?",
                answer: "Puedes indicárselo al asistente en el panel de conversación o seleccionar Seedance 2.5 directamente en la tarjeta del storyboard. El lienzo te indicará el importe de créditos antes de generar y, si el proceso falla, se devuelven a tu cuenta.",
            },
            {
                question: "¿Puedo probar Seedance 2.5 para crear series cortas de forma gratuita?",
                answer: "Escribir el guion y organizar el storyboard en el lienzo no cuesta nada. Solo consumes créditos al generar los vídeos, con tarifas por segundo según versión y resolución que siempre se detallan antes de empezar.",
            },
        ],
        "sora-2": [
            {
                question: "¿Hace falta código de invitación para usar Sora 2 en DramaCanvas?",
                answer: "No, no necesitas ninguna invitación ni lista de espera. Sora 2, desarrollado por OpenAI, se usa directamente desde el lienzo web; basta con seleccionarlo en la tarjeta del plano o pedírselo al asistente lateral.",
            },
            {
                question: "¿Quién desarrolla Sora 2 y cómo se integra en la plataforma?",
                answer: "Sora 2 es un modelo de generación de vídeo creado por OpenAI. En DramaCanvas se factura por segundo de vídeo producido, y la interfaz detalla los créditos necesarios antes de confirmar la generación.",
            },
            {
                question: "¿Cómo se calculan los créditos al generar vídeo con Sora 2?",
                answer: "Sora 2 se tarifica por los segundos de vídeo generados. El consumo cambia según la resolución escogida, el coste exacto aparece antes de iniciar la tarea y, si la generación falla, los créditos se devuelven.",
            },
            {
                question: "¿Puedo conectar mi propia clave API de OpenAI para usar Sora 2?",
                answer: "Sí. Mediante la opción BYOK en los ajustes, conectas tu clave para que el proveedor te facture el consumo directamente; DramaCanvas no cobra margen ni consume créditos de la plataforma, solo el servicio del espacio de trabajo.",
            },
        ],
        "veo-3-1": [
            {
                question: "¿Qué empresa ha creado Veo 3.1 y cómo se utiliza?",
                answer: "Veo 3.1 es el modelo de vídeo desarrollado por Google. Puedes seleccionarlo en cualquier tarjeta de plano de DramaCanvas o pedirle al asistente lateral que lo ejecute para generar tus tomas.",
            },
            {
                question: "¿Veo 3.1 se cobra por segundos o por vídeo generado?",
                answer: "Veo 3.1 cuenta con opciones tarifadas por segundo y algunas especificaciones tarifadas por generación unitaria. El coste varía según la resolución y el formato, y siempre verás la cifra exacta en créditos antes de confirmar.",
            },
            {
                question: "¿Puedo organizar mi proyecto sin consumir créditos antes de usar Veo 3.1?",
                answer: "Sí, estructurar el guion manualmente y preparar el storyboard en el lienzo es gratuito. Los guiones y storyboards por IA y la generación de vídeo con Veo 3.1 consumen créditos, siempre con aviso previo del coste y devolución en caso de error.",
            },
            {
                question: "¿Es posible usar una clave propia de Google para generar con Veo 3.1?",
                answer: "Sí. Al vincular tu clave API en el menú de ajustes mediante BYOK, abonas el uso a tu proveedor sin márgenes añadidos por DramaCanvas ni consumo de créditos; únicamente se factura el servicio del espacio de trabajo.",
            },
        ],
        "kling-3-0": [
            {
                question: "¿Qué funciones y versiones ofrece Kling 3.0 en DramaCanvas?",
                answer: "Kling 3.0 acepta 2 imágenes como fotogramas inicial/final, con generación de 3–15 s o control de movimiento de 3–30 s. Turbo acepta solo 1 imagen inicial y genera vídeos de 3–15 s.",
            },
            {
                question: "¿En qué consiste el control de movimiento de Kling AI?",
                answer: "El control de movimiento de Kling 3.0 admite salidas de 3–30 s; la generación normal admite 3–15 s. Consulta los ajustes y el coste en créditos en el lienzo antes de generar.",
            },
            {
                question: "¿Qué diferencias de precio hay entre las versiones de Kling 3.0?",
                answer: "Dispones de la versión Estándar y de la versión Turbo, ambas calculadas por segundo de vídeo. El consumo de créditos cambia según la versión y resolución, indicándose con claridad en la tarjeta antes de generar.",
            },
            {
                question: "¿Cómo se activa Kling 3.0 desde el lienzo de trabajo?",
                answer: "Elige Kling 3.0 en la tarjeta del storyboard o pídeselo al asistente en el chat. La tarjeta mostrará los créditos necesarios antes de empezar y, si se produce algún fallo durante la generación, los créditos se reintegran a tu cuenta.",
            },
        ],
        "minimax-h3": [
            {
                question: "¿Admite MiniMax H3 (Hailuo AI) generar vídeo a partir de varias imágenes?",
                answer: "MiniMax H3 y H3 Max solo aceptan 1 imagen como fotograma inicial; no admiten varias imágenes ni vídeo o audio de referencia.",
            },
            {
                question: "¿Qué versiones de MiniMax H3 están disponibles en la plataforma?",
                answer: "Tienes disponibles las versiones Estándar y H3 Max. El modelo se cobra por segundo de vídeo y el coste exacto en créditos se muestra en la tarjeta antes de iniciar la generación según la resolución elegida.",
            },
            {
                question: "¿Cómo se tarifican las generaciones de vídeo con Hailuo AI?",
                answer: "MiniMax H3 descuenta créditos en función de los segundos del vídeo resultante. Las tarifas varían según la versión y la resolución, mostrándose siempre antes de empezar; si la generación falla, los créditos se devuelven.",
            },
            {
                question: "¿Se puede utilizar MiniMax H3 con una clave API propia?",
                answer: "Sí. Si vinculas tu clave API en la configuración mediante BYOK, pagas el uso a tu proveedor habitual sin recargo de la plataforma ni gasto de créditos de DramaCanvas; solo abonas el servicio del espacio de trabajo.",
            },
        ],
        "wan-3-0": [
            {
                question: "¿Quién desarrolla el modelo Wan 3.0 (Tongyi Wanxiang)?",
                answer: "Wan 3.0 es el modelo de generación de vídeo desarrollado por Alibaba. Puedes pedirle al asistente del panel lateral que genere escenas con él o seleccionarlo directamente en las tarjetas de tu lienzo.",
            },
            {
                question: "¿Qué versiones de Wan 3.0 se pueden utilizar en DramaCanvas?",
                answer: "Dispones de las modalidades Estándar y Prime. Ambas se cobran por segundo de vídeo, y sus diferentes resoluciones muestran los créditos correspondientes antes de confirmar el lanzamiento.",
            },
            {
                question: "¿Cómo se descuentan los créditos al generar con Wan 3.0?",
                answer: "El consumo de Wan 3.0 se mide por los segundos de vídeo generados. El lienzo te muestra la cantidad exacta de créditos antes de comenzar según la versión elegida y, si la tarea da error, los créditos se devuelven.",
            },
            {
                question: "¿Cuesta dinero preparar el guion y los planos antes de usar Wan 3.0?",
                answer: "La redacción manual de guiones y el desglose del storyboard son gratuitos. Los guiones y storyboards por IA y la generación de vídeo con Wan 3.0 consumen créditos, tras revisar el coste detallado en pantalla.",
            },
        ],
        "grok-imagine": [
            {
                question: "¿Qué empresa desarrolla Grok Imagine y qué formatos incluye?",
                answer: "Grok Imagine ha sido desarrollado por xAI. Incluye la opción Grok Imagine Image 2.0 para imágenes y Grok Imagine Video 1.5 para generar vídeo.",
            },
            {
                question: "¿Permite Grok Imagine crear tanto imágenes como clips de vídeo?",
                answer: "Sí, cubre ambos formatos. Puedes usar Grok Imagine Image 2.0 para ilustraciones y Grok Imagine Video 1.5 para vídeo, directamente desde las tarjetas del lienzo.",
            },
            {
                question: "¿Cómo se factura el uso de Grok Imagine en créditos?",
                answer: "Las imágenes con Image 2.0 se cobran por unidad, mientras que los vídeos con Video 1.5 se cobran por segundo generado. Los créditos requeridos según la resolución se indican siempre antes de la generación.",
            },
            {
                question: "¿Se devuelven los créditos si falla una generación con Grok Imagine?",
                answer: "Sí, si se produce un fallo los créditos se reintegran a tu cuenta. Planificar el guion y el storyboard en el lienzo no cuesta nada; solo se deduce saldo al generar, viendo siempre la cantidad de antemano.",
            },
        ],
        "nano-banana": [
            {
                question: "¿De quién es la tecnología de Nano Banana y para qué sirve?",
                answer: "Nano Banana es un modelo de generación de imágenes desarrollado por Google. Puedes seleccionarlo en el lienzo o pedírselo al asistente lateral para crear personajes y planos ilustrados de tu guion gráfico.",
            },
            {
                question: "¿Qué versiones de Nano Banana están disponibles en DramaCanvas?",
                answer: "Tienes a tu disposición cuatro versiones: Nano Banana, Nano Banana 2, Nano Banana 2.1 y Nano Banana Pro (1K), listas para aplicar a cualquier tarjeta de tu proyecto.",
            },
            {
                question: "¿Cómo se calculan los créditos al generar imágenes con Nano Banana?",
                answer: "Nano Banana se cobra por imagen generada. El precio varía según la versión y resolución elegidas, el valor en créditos aparece antes de confirmar y, si la generación falla, los créditos se devuelven.",
            },
            {
                question: "¿Puedo conectar mi propia clave API de Google para usar Nano Banana?",
                answer: "Sí. Mediante BYOK en la configuración de la cuenta, puedes vincular tu clave para que el proveedor te facture directamente; DramaCanvas no cobra comisiones ni gasta tus créditos, solo el servicio del espacio de trabajo.",
            },
        ],
        "gpt-image-2": [
            { question: "¿Quién desarrolla GPT Image 2 y qué versiones hay disponibles?", answer: "GPT Image 2 ha sido creado por OpenAI. En DramaCanvas puedes generar imágenes con las versiones GPT Image 2, GPT Image 2.5 y GPT Image 2.6." },
            {
                question: "¿Son modelos de imagen o de vídeo y cómo se eligen en el lienzo?",
                answer: "Son modelos de generación de imágenes y se tarifan por unidad generada. Puedes alternar entre las versiones y diferentes resoluciones directamente desde las tarjetas del storyboard.",
            },
            {
                question: "¿Cómo se cobran las imágenes generadas con la serie GPT Image?",
                answer: "Esta serie se factura por cada imagen producida. El importe depende de la versión y la resolución, mostrándose siempre antes de pulsar el botón de generar; si hay un error, los créditos se devuelven a tu cuenta.",
            },
            {
                question: "¿Cómo se utiliza GPT Image 2 dentro de un proyecto?",
                answer: "Pídeselo al asistente de IA en el panel lateral o selecciona el modelo en la tarjeta del plano que quieras ilustrar. Redactar el guion y editar el storyboard manualmente son gratis; generar imágenes con GPT Image 2 consume créditos por imagen, y los guiones y storyboards por IA también usan créditos.",
            },
        ],
        "midjourney-v7": [
            {
                question: "¿Hace falta tener cuenta o usar Discord para generar con Midjourney V7?",
                answer: "No, no necesitas Discord en absoluto. En DramaCanvas puedes generar imágenes con Midjourney V7 directamente desde el lienzo web, sin configuraciones complejas.",
            },
            {
                question: "¿Midjourney V7 se cobra por imagen generada o por tiempo?",
                answer: "Se factura por imagen generada. El importe en créditos varía según la resolución seleccionada y siempre se muestra con claridad en la interfaz antes de realizar cualquier generación.",
            },
            { question: "¿Se pierden los créditos si una imagen de Midjourney V7 falla?", answer: "No, los créditos se devuelven automáticamente si la generación no se completa. Además, el lienzo siempre te indica el consumo exacto antes de empezar." },
            {
                question: "¿Puedo usar comercialmente las imágenes generadas con Midjourney V7?",
                answer: "Por lo general sí, según los términos de uso vigentes de Midjourney y siempre que tengas los derechos de las imágenes de referencia que utilices. Suscribirte no te concede derechos sobre material de terceros.",
            },
        ],
    },
    "pt-BR": {
        home: [
            { question: HOME_POSITIONING["pt-BR"].question, answer: HOME_POSITIONING["pt-BR"].answer },
            { question: SIGNUP_CREDITS_COPY["pt-BR"].question, answer: SIGNUP_CREDITS_COPY["pt-BR"].answer },
            { question: "Se a geração falhar, os créditos são devolvidos?", answer: GENERATION_REFUND_COPY["pt-BR"] },
            {
                question: "Preciso saber escrever prompts avançados ou editar vídeo para usar a plataforma?",
                answer: "Não precisa ter experiência prévia. Você só precisa contar a sua história em linguagem simples no bate-papo, e o assistente de IA divide a trama em cartões de storyboard com enquadramentos e orientações de ação. Depois, basta arrastar as cenas geradas diretamente na linha do tempo da tela para definir a sequência do vídeo.",
            },
        ],
        pricing: [
            {
                question: "Quais são os planos e preços de assinatura do DramaCanvas?",
                answer: "O plano padrão mensal custa {monthly}/mês com {monthlyCredits} créditos, e a assinatura anual custa {annual}/ano com {annualCredits} créditos. As cobranças são feitas em dólares, os créditos servem tanto para gerar imagens quanto vídeos, e a tela sempre mostra a quantidade exata de créditos necessária antes de iniciar cada criação.",
            },
            {
                question: "Quando os créditos caem na conta após a assinatura?",
                answer: "Os créditos entram no seu saldo assim que o pagamento for confirmado. No plano mensal, o lote é renovado a cada mês; no plano anual, o total de créditos do ano inteiro é liberado de uma vez só. Antes de qualquer geração, a tela avisa o consumo previsto.",
            },
            { question: "Os créditos são devolvidos se houver falha na geração?", answer: GENERATION_REFUND_COPY["pt-BR"] },
            {
                question: "Posso usar pacotes avulsos de créditos junto com a assinatura?",
                answer: "Sim, você pode combinar as duas opções. Os créditos da assinatura e os pacotes avulsos comprados à parte ficam registrados separadamente e são descontados conforme a ordem definida na sua carteira, onde você confere o saldo detalhado.",
            },
            {
                question: "Vale mais a pena assinar o plano anual do que o mensal?",
                answer: "Sim, a assinatura anual oferece um custo-benefício melhor. Nos planos Standard, Advanced e Premium, você paga o equivalente a 10 meses e recebe 12 meses de créditos de uma só vez (o Luxury recebe cerca de 11,6 meses e o Supreme mantém o mesmo valor unitário em todos os ciclos), o que reduz o custo por crédito para cerca de {annualUnit}, frente a cerca de {monthlyUnit} na assinatura mensal.",
            },
            {
                question: "Como funciona a contratação e a gestão do plano para equipes?",
                answer: "Os planos para equipes já podem ser adquiridos online. Quem realiza a compra se torna o proprietário, podendo convidar membros por e-mail e definir limites de créditos. Os créditos de cada ciclo entram no saldo compartilhado da equipe.",
            },
            {
                question: "Como funciona a cobrança ao usar minha própria chave de API (BYOK)?",
                answer: "A plataforma não cobra margem sobre os modelos nem desconta créditos do seu saldo do DramaCanvas. Você paga diretamente ao fornecedor da API pelo consumo de geração e arca apenas com a taxa de serviço do espaço de trabalho da nossa plataforma.",
            },
            {
                question: "Quais recursos são gratuitos na plataforma?",
                answer: "Escrever roteiros e editar storyboards manualmente é totalmente gratuito. Você pode salvar seus arquivos no navegador ou em uma pasta local autorizada, além de exportar o canvas em um arquivo ZIP com os materiais; a plataforma não promete espaço de armazenamento em nuvem.",
            },
            {
                question: "Quais ações de IA consomem créditos?",
                answer: "Gerar roteiros, storyboards em texto, imagens e vídeos com IA consome créditos conforme a tarefa e o modelo selecionados. O texto é tarifado por solicitação ou consumo, as imagens pelas especificações do modelo e os vídeos por solicitação ou por segundo. O total de créditos a ser descontado é exibido antes de cada execução.",
            },
            {
                question: "Os pacotes de créditos ou os créditos da assinatura expiram?",
                answer: "Pacotes de créditos comprados e créditos concedidos por assinaturas não têm prazo de validade e não são zerados ao término da assinatura. Créditos de eventos ou recompensas podem ter prazos próprios de validade, conforme informado no momento da concessão.",
            },
            {
                question: "Como a escolha do modelo, a duração e a resolução influenciam o gasto de créditos?",
                answer: "O modelo e suas especificações determinam a faixa de custo. Alguns vídeos são cobrados por segundo, consumindo mais quanto maior a duração, e a resolução impacta as durações disponíveis e os valores; ao liquidar pelo uso real, os créditos reservados a mais voltam para o seu saldo.",
            },
            {
                question: "Existe taxa extra para usar os agentes?",
                answer: "Não há taxa avulsa de serviço para agentes; os créditos são debitados apenas pelas ações reais de geração (texto, imagem ou vídeo) executadas por eles. Ao executar agentes via MCP, é possível definir um teto de orçamento de créditos por rodada, que serve como limite máximo e não como cobrança fixa.",
            },
            {
                question: "Como funcionam os créditos em caso de cancelamento, tempo limite excedido, sucesso parcial ou nova geração?",
                answer: "Créditos de tarefas que falharem de forma definitiva ou que forem canceladas antes do envio ao serviço do modelo voltam para o seu saldo; se o status do modelo ficar indefinido temporariamente, os créditos são congelados primeiro e depois confirmados em caso de sucesso ou devolvidos ao saldo em caso de falha. Conclusões parciais são cobradas pelo consumo real com retorno da reserva excedente ao saldo, enquanto gerar novamente é considerado uma nova solicitação cobrada conforme a nova cotação.",
            },
            {
                question: "Como são usados e gerenciados os créditos de equipe?",
                answer: "As equipes têm uma conta de créditos própria e podem definir limites de orçamento mensal para os integrantes. Proprietários e administradores podem visualizar o extrato de consumo e transferir créditos pessoais para a conta da equipe; membros comuns não podem consultar o extrato nem realizar transferências.",
            },
            {
                question: "As criações gratuitas têm marca d'água?",
                answer: "Imagens e vídeos gerados por contas sem pagamentos anteriores incluem uma marca d'água no canto superior esquerdo (exceto ao usar sua própria chave de API), e a marca d'água não consome créditos. Ao recarregar créditos ou assinar qualquer plano, você poderá baixar a versão sem marca d'água de todas as suas criações passadas e futuras.",
            },
        ],
        help: [
            {
                question: "Como começar a criar a minha primeira minissérie na tela?",
                answer: "Basta colar o resumo do seu roteiro e enviar uma mensagem para o assistente de IA na lateral direita. Ele estrutura a história em cartões de storyboard com enquadramentos e movimentos de câmera; após você conferir o visual dos personagens, pode gerar as cenas plano a plano e organizá-las na linha do tempo.",
            },
            {
                question: "Como manter o mesmo rosto do personagem em diferentes planos?",
                answer: "Envie uma imagem de referência nítida do personagem antes de começar as gerações. O sistema usa esses traços faciais como base nos planos seguintes para ajudar a manter a consistência do visual. Se algum quadro apresentar alterações indesejadas, troque a imagem de referência ou ajuste o prompt e gere aquele plano novamente.",
            },
            {
                question: "Onde os arquivos ficam salvos e como fazer backup do projeto?",
                answer: "Seus arquivos podem ficar salvos no próprio navegador ou em uma pasta autorizada no seu computador. Para fazer backup, acesse a lista de telas, selecione o projeto desejado e exporte um arquivo .zip; recomendamos manter uma cópia dos arquivos originais em outro local seguro.",
            },
            {
                question: "Posso usar comercialmente os vídeos criados no DramaCanvas?",
                answer: "Sim, os vídeos podem ser usados em projetos comerciais, desde que respeitem os termos de uso do modelo escolhido e os direitos autorais dos materiais que você enviou. A assinatura da plataforma não transfere direitos sobre conteúdos de terceiros.",
            },
            {
                question: "Como convidar outras pessoas para colaborar no mesmo projeto?",
                answer: "O administrador da equipe pode enviar convites pela página de gestão e controlar os limites de créditos de cada colaborador.",
            },
            { question: "O que fazer se uma geração apresentar erro ou falhar?", answer: GENERATION_REFUND_COPY["pt-BR"] },
        ],
        mcp: [
            {
                question: "O que é a integração MCP do DramaCanvas e para que ela serve?",
                answer: "O MCP é um protocolo aberto que permite a assistentes de IA externos operarem a sua tela diretamente. Com essa conexão ativa, ferramentas externas conseguem redigir roteiros, organizar cartões de storyboard e acionar os modelos integrados para gerar vídeos na sua área de trabalho.",
            },
            {
                question: "Quais ferramentas de IA são compatíveis com o MCP da plataforma?",
                answer: "Atualmente há suporte para Claude Code, Codex, Cursor e outros ambientes compatíveis com o protocolo MCP. Você envia comandos em linguagem natural dentro dessas ferramentas para criar e modificar elementos na tela do DramaCanvas.",
            },
            {
                question: "Gerações feitas por ferramentas externas gastam créditos? Como limitar os gastos?",
                answer: "Sim, as gerações solicitadas via MCP consomem créditos da sua conta normalmente. Para controlar os custos, acesse o painel de gerenciamento de chaves e defina um limite máximo de consumo; ao atingir essa cota, as gerações são pausadas para evitar despesas imprevistas.",
            },
            {
                question: "Como revogar o acesso de ferramentas externas quando eu não quiser mais usar?",
                answer: "Basta revogar ou excluir a chave correspondente na página de gerenciamento de chaves da plataforma. O acesso à sua tela e ao saldo de créditos é interrompido na mesma hora, mantendo intactos todos os conteúdos já criados no projeto.",
            },
        ],
        "seedance-2-0": [
            {
                question: "Quem desenvolveu o Seedance 2.0 disponível no DramaCanvas?",
                answer: "O Seedance 2.0 foi desenvolvido pela ByteDance e traz a mesma base tecnológica do Jimeng. Na plataforma, você pode pedir gerações ao assistente no bate-papo ou selecionar o modelo direto no cartão de cena, sendo que todo o trabalho de roteiro e storyboard na tela é gratuito.",
            },
            {
                question: "Quais versões do Seedance 2.0 estão disponíveis na plataforma?",
                answer: "A plataforma oferece cinco versões: Standard, Fast, Mini, HC e 720P. Cada opção e resolução tem sua respectiva tarifação de créditos, e você escolhe a versão mais adequada diretamente no cartão do storyboard.",
            },
            {
                question: "Como funciona a cobrança para gerar vídeos com o Seedance 2.0?",
                answer: "O Seedance 2.0 é tarifado por segundo de vídeo produzido. O consumo em créditos varia conforme a versão e a resolução selecionadas, a tela exibe o valor exato antes da confirmação e, se a geração falhar, os créditos retornam para a sua conta.",
            },
            {
                question: "Posso utilizar minha própria chave de API para rodar o Seedance 2.0?",
                answer: "Sim. Ao configurar sua própria chave de API compatível (BYOK) nas preferências, os custos de processamento são cobrados diretamente pelo seu provedor, sem acréscimo da plataforma e sem gastar créditos internos, incidindo apenas a taxa de serviço do espaço de trabalho.",
            },
        ],
        "seedance-2-5": [
            {
                question: "Qual a diferença entre o Seedance 2.5 e a versão 2.0?",
                answer: "O Seedance 2.5 representa a nova geração de modelos de vídeo da ByteDance, também alinhado à tecnologia do Jimeng. No DramaCanvas, ele conta com as opções Standard e 1080P Max, ambas com tarifação calculada por segundo de vídeo gerado.",
            },
            {
                question: "Quais versões do Seedance 2.5 posso escolher?",
                answer: "Estão disponíveis as versões Standard e 1080P Max. A quantidade de créditos varia segundo a versão e a resolução, e a tela informa a dedução exata antes de você iniciar a geração.",
            },
            {
                question: "Como gerar vídeos com o Seedance 2.5 dentro do DramaCanvas?",
                answer: "Você pode pedir a criação conversando com o assistente à direita ou escolher o Seedance 2.5 diretamente no cartão do plano de filmagem. Antes de confirmar, a tela destaca o consumo em créditos previsto e, caso a operação falhe, os créditos voltam para a sua conta.",
            },
            {
                question: "Dá para testar a criação de minisséries com o Seedance 2.5 de graça?",
                answer: "O uso da tela, a escrita manual do roteiro e a decupagem de planos são totalmente gratuitos. Roteiros e storyboards por IA e a geração de vídeo consomem créditos por modelo, sendo o vídeo cobrado por segundo e o valor exibido antes do envio.",
            },
        ],
        "sora-2": [
            {
                question: "Preciso de código de convite para usar o Sora 2 no DramaCanvas?",
                answer: "Não precisa de código de convite. O modelo Sora 2, criado pela OpenAI, está acessível diretamente na tela web da plataforma para qualquer usuário registrado, bastando selecioná-lo no cartão ou solicitar a geração pelo bate-papo com o assistente.",
            },
            {
                question: "Quem é o fornecedor do modelo Sora 2?",
                answer: "O Sora 2 é o modelo de geração de vídeo desenvolvido pela OpenAI. No DramaCanvas, ele funciona para a criação de cenas em vídeo com cobrança baseada no número de segundos gerados, exibindo os créditos necessários antes de cada execução.",
            },
            {
                question: "Como funciona a cobrança por segundo no Sora 2?",
                answer: "O Sora 2 cobra por segundo de vídeo renderizado. As tarifas de créditos variam de acordo com a resolução definida, a quantidade exata é sinalizada na tela antes do início e, se a renderização não der certo, os créditos são devolvidos.",
            },
            {
                question: "Posso conectar minha própria chave de API da OpenAI para rodar o Sora 2?",
                answer: "Sim. Você pode cadastrar sua chave própria (BYOK) compatível nas configurações; dessa forma, o consumo do modelo é cobrado diretamente na sua conta da OpenAI, sem repasse de margem nem uso de créditos da plataforma, pagando somente a taxa de serviço do espaço de trabalho.",
            },
        ],
        "veo-3-1": [
            {
                question: "De qual empresa é o modelo Veo 3.1?",
                answer: "O Veo 3.1 é o modelo de geração de vídeo do Google. Você pode utilizá-lo escolhendo a opção diretamente nos cartões de cena da tela ou pedindo a criação ao assistente de IA na lateral direita.",
            },
            {
                question: "O Google Veo 3.1 é cobrado por segundo ou por vídeo gerado?",
                answer: "O Veo 3.1 conta com tarifação por segundo em algumas modalidades e por geração única em especificações selecionadas. O custo em créditos varia conforme a especificação e resolução, e o valor exato é sempre indicado na tela antes de você confirmar.",
            },
            {
                question: "É possível testar projetos com o Veo 3.1 sem gastar créditos?",
                answer: "A escrita manual de roteiro, decupagem de planos e organização na tela são gratuitas. Roteiros e storyboards por IA e a geração no Veo 3.1 consomem créditos, com o valor informado antes da execução e os créditos voltam para o seu saldo se a geração falhar.",
            },
            {
                question: "Consigo usar minha própria chave de API para acessar o Veo 3.1?",
                answer: "Sim. Ao integrar sua chave de API compatível (BYOK) no painel de configurações, o custo do modelo corre diretamente junto ao seu provedor, sem cobrança de créditos internos ou margem extra da plataforma, incidindo unicamente a taxa de serviço do espaço de trabalho.",
            },
        ],
        "kling-3-0": [
            {
                question: "Quais recursos e funções o Kling 3.0 oferece no DramaCanvas?",
                answer: "Kling 3.0 aceita 2 imagens como quadros inicial/final, com geração de 3–15 s ou controle de movimento de 3–30 s. Turbo aceita apenas 1 imagem inicial e gera vídeos de 3–15 s.",
            },
            {
                question: "Como funciona o recurso de controle de movimento do Kling 3.0?",
                answer: "O controle de movimento do Kling 3.0 aceita saídas de 3–30 s; a geração normal aceita 3–15 s. Confira os ajustes e o custo em créditos no canvas antes de gerar.",
            },
            {
                question: "Quais são as versões disponíveis do Kling 3.0 e como elas são cobradas?",
                answer: "Você pode escolher entre as versões Standard e Turbo, ambas tarifadas por segundo de vídeo. O consumo de créditos varia conforme a versão e a resolução adotadas, e a tela destaca o valor exato a ser debitado antes de você prosseguir.",
            },
            {
                question: "Como utilizar o Kling 3.0 para produzir vídeos na tela?",
                answer: "Você pode pedir as cenas ao assistente de IA no chat lateral ou escolher o Kling 3.0 diretamente no cartão do storyboard. A tela avisa os créditos necessários antes de iniciar e, caso o processo encontre erros, o saldo é devolvido automaticamente.",
            },
        ],
        "minimax-h3": [
            {
                question: "O MiniMax H3 (Hailuo AI) permite gerar vídeo a partir de várias imagens?",
                answer: "MiniMax H3 e H3 Max aceitam apenas 1 imagem como quadro inicial; não aceitam várias imagens nem vídeo ou áudio de referência.",
            },
            {
                question: "Quais versões do MiniMax H3 estão disponíveis na plataforma?",
                answer: "Estão disponíveis as versões Standard e H3 Max. O consumo é calculado por segundo de vídeo gerado, com valores diferenciados por versão e resolução, sempre informados no cartão da tela antes da geração.",
            },
            {
                question: "Como funciona a cobrança por segundo no Hailuo AI (MiniMax H3)?",
                answer: "O modelo debita créditos por segundo de vídeo finalizado. Os custos mudam conforme a versão e a resolução definidas, com exibição prévia da taxa exata na tela, e devolução total dos créditos se a geração falhar.",
            },
            {
                question: "Posso utilizar minha própria chave de API para gerar com o MiniMax H3?",
                answer: "Sim. Ao cadastrar sua chave de API compatível (BYOK) na seção de configurações, as despesas do modelo são acertadas diretamente com a sua provedora, sem acréscimo da plataforma e sem deduzir créditos do DramaCanvas, com cobrança apenas da taxa de serviço do espaço de trabalho.",
            },
        ],
        "wan-3-0": [
            {
                question: "Quem criou o modelo Wan 3.0 disponível na plataforma?",
                answer: "O Wan 3.0 (Tongyi Wanxiang) foi desenvolvido pelo grupo Alibaba. Você pode acioná-lo conversando com o assistente na lateral da tela ou selecionando o modelo diretamente no cartão da cena desejada.",
            },
            {
                question: "Quais são as versões disponíveis do Wan 3.0?",
                answer: "O DramaCanvas disponibiliza as versões Standard e Prime. Ambas operam com tarifação calculada por segundo de vídeo, variando conforme a versão e resolução, com indicação clara dos créditos necessários na tela antes da renderização.",
            },
            {
                question: "Como funciona o consumo de créditos ao gerar vídeos com o Wan 3.0?",
                answer: "O Wan 3.0 debita créditos de acordo com os segundos de vídeo produzidos. As taxas diferem segundo a versão e a resolução selecionadas, a tela aponta o montante exato antes da confirmação e devolve os créditos em caso de erro.",
            },
            {
                question: "Preciso pagar para rascunhar roteiros e storyboards antes de gerar com o Wan 3.0?",
                answer: "A escrita manual de roteiro e a montagem da decupagem de planos na tela são gratuitas. Roteiros e storyboards por IA e a geração de vídeo no Wan 3.0 consomem créditos, com aviso prévio do consumo na interface.",
            },
        ],
        "grok-imagine": [
            {
                question: "Qual empresa desenvolveu o Grok Imagine e quais modelos fazem parte da linha?",
                answer: "A família Grok Imagine foi criada pela xAI. Ela conta com o modelo Grok Imagine Image 2.0 para geração de imagens estáticas e com o Grok Imagine Video 1.5 para criação de vídeos.",
            },
            {
                question: "O Grok Imagine cria tanto imagens quanto vídeos dentro da tela?",
                answer: "Sim, a linha atende às duas finalidades. Você pode usar o Grok Imagine Image 2.0 para ilustrar quadros e o Grok Imagine Video 1.5 para gerar animações e planos de vídeo, ambos acionados nos cartões do DramaCanvas.",
            },
            {
                question: "Como é calculado o custo de créditos no Grok Imagine?",
                answer: "O modelo de imagem Image 2.0 é tarifado por imagem gerada, enquanto o modelo de vídeo Video 1.5 é cobrado por segundo. Os valores mudam conforme a resolução escolhida, e a tela avisa o consumo exato antes da execução.",
            },
            {
                question: "O que acontece com os créditos se a geração no Grok Imagine falhar?",
                answer: "Os créditos voltam automaticamente para a sua conta se a geração não for concluída. Além disso, a escrita manual de roteiros e a decupagem de planos na tela são gratuitas; roteiros por IA, storyboards, imagens e vídeos consomem créditos, com aviso prévio na tela.",
            },
        ],
        "nano-banana": [
            {
                question: "Quem desenvolveu o Nano Banana e para que ele serve?",
                answer: "O Nano Banana é uma linha de modelos de geração de imagens do Google. Na plataforma, você pode escolhê-lo no cartão ou pedir ao assistente no chat para gerar ilustrações de personagens, cenários e planos para seus storyboards.",
            },
            {
                question: "Quais versões do Nano Banana posso utilizar no DramaCanvas?",
                answer: "O DramaCanvas disponibiliza quatro versões: Nano Banana, Nano Banana 2, Nano Banana 2.1 e Nano Banana Pro (1K), que você pode selecionar de acordo com a necessidade visual de cada cena.",
            },
            {
                question: "Como funciona a tarifação para gerar imagens com o Nano Banana?",
                answer: "Por ser um modelo de imagem, o Nano Banana debita créditos por unidade gerada. A dedução varia conforme a versão e a resolução estabelecidas, o valor exato é apresentado no cartão antes da geração e os créditos são devolvidos se houver erro.",
            },
            {
                question: "Posso conectar minha própria chave de API para usar o Nano Banana?",
                answer: "Sim. Configurando sua própria chave de API (BYOK) no menu de preferências, os custos são debitados diretamente pelo seu provedor externo, sem acréscimo de preço ou uso de créditos da plataforma, restando somente a taxa de serviço do espaço de trabalho.",
            },
        ],
        "gpt-image-2": [
            {
                question: "Quem desenvolveu o GPT Image 2 e quais versões estão disponíveis?",
                answer: "O GPT Image 2 é uma tecnologia desenvolvida pela OpenAI. Atualmente, o DramaCanvas oferece o GPT Image 2, o GPT Image 2.5 e o GPT Image 2.6 para geração de imagens na tela.",
            },
            {
                question: "O GPT Image 2, o 2.5 e o 2.6 geram imagens ou vídeos?",
                answer: "Ambos são modelos dedicados à geração de imagens, com tarifação calculada por imagem produzida. Você pode alternar livremente entre as versões e resoluções disponíveis dentro dos cartões do storyboard.",
            },
            {
                question: "Qual é o modelo de cobrança para imagens da linha GPT Image?",
                answer: "A linha é cobrada por imagem criada. Os créditos necessários mudam segundo a versão e resolução escolhidas, a tela informa a dedução exata antes do envio e, caso a geração falhe, os créditos são devolvidos automaticamente.",
            },
            {
                question: "Como acionar o GPT Image 2 nos meus projetos de storyboard?",
                answer: "Você pode pedir as imagens no chat com o assistente à direita ou selecionar o modelo diretamente no cartão da cena. A escrita manual de roteiro e a edição de planos são gratuitas; gerar imagens no GPT Image 2 debita créditos por imagem, e roteiros e storyboards por IA também consomem créditos.",
            },
        ],
        "midjourney-v7": [
            {
                question: "Preciso de conta ou acesso ao Discord para usar o Midjourney V7 no DramaCanvas?",
                answer: "Não precisa de Discord. No DramaCanvas, você gera imagens com o Midjourney V7 diretamente na tela do navegador, sem comandos complicados nem etapas de integração externas.",
            },
            {
                question: "O Midjourney V7 é cobrado por imagem gerada ou por tempo de uso?",
                answer: "O Midjourney V7 é tarifado por imagem gerada. Os créditos requeridos variam de acordo com a resolução estabelecida, e a tela indica com clareza o montante que será descontado antes de iniciar cada processo.",
            },
            {
                question: "Se a geração de imagem com o Midjourney V7 falhar, os créditos são perdidos?",
                answer: "Não, os créditos são devolvidos automaticamente em caso de erro. A tela sempre sinaliza o valor da operação antes de você confirmar a criação.",
            },
            {
                question: "As imagens criadas com o Midjourney V7 na plataforma podem ser usadas comercialmente?",
                answer: "Em regra sim, desde que estejam de acordo com os termos de uso do Midjourney e com os direitos autorais dos materiais que você forneceu como referência. A assinatura do DramaCanvas não garante nem transfere licenças de direitos de terceiros.",
            },
        ],
    },
    "zh-TW": {
        home: [
            { question: HOME_POSITIONING["zh-TW"].question, answer: HOME_POSITIONING["zh-TW"].answer },
            { question: SIGNUP_CREDITS_COPY["zh-TW"].question, answer: SIGNUP_CREDITS_COPY["zh-TW"].answer },
            { question: "生成失敗會退還點數嗎？", answer: GENERATION_REFUND_COPY["zh-TW"] },
            {
                question: "不會寫提示詞或沒有剪輯經驗，也能使用嗎？",
                answer: "完全可以。只要用平常說話的方式輸入故事劇情，AI 助手就會自動將情節拆解為包含景別、鏡頭動作與台詞說明的分鏡卡片；產生的影片片段也能直接拖曳到畫布內建的時間軸上排序，不需要專業剪輯基礎即可完成創作。",
            },
        ],
        pricing: [
            {
                question: "DramaCanvas 的訂閱方案與收費標準為何？",
                answer: "標準版月繳方案為每月 {monthly}，包含 {monthlyCredits} 點數；年繳方案為每年 {annual}，包含 {annualCredits} 點數。所有方案均以美元計價結算，圖片與影片生成共用點數額度，每次在畫布上點擊生成前，都會明確顯示本次扣除的點數。",
            },
            { question: "訂閱付款完成後，點數何時會入帳？", answer: "付款完成後點數會立即入帳。月繳方案每月定期發放當月點數；年繳方案則會一次發放全年度的總點數。在畫布上每次生成前，系統都會清楚標出該次本次扣除的點數。" },
            { question: "生成失敗會退還點數嗎？", answer: GENERATION_REFUND_COPY["zh-TW"] },
            { question: "加購的點數包能和會員訂閱點數一起使用嗎？", answer: "可以同時使用。訂閱會員所贈送的點數與另外購買的點數包採分開記帳，系統會依照你在錢包設定中指定的順序依序扣除，剩餘點數隨時都能在錢包中查看。" },
            {
                question: "年繳訂閱方案會比按月付費更划算嗎？",
                answer: "選擇年繳更加划算。標準版、進階版、高級版選年繳，交 10 個月的錢，一次性拿 12 個月的點數（豪華版約拿 11.6 個月，至尊版各週期同價）；折算下來每點約為 {annualUnit}，相較於月繳方案的每點約 {monthlyUnit}優惠許多。",
            },
            { question: "團隊方案如何計費與進行成員管理？", answer: "團隊由擁有者與管理員管理，可邀請成員、設定角色權限與點數用量上限。團隊方案目前尚未開放線上購買。" },
            { question: "自備 API Key（BYOK）的計費模式是什麼？", answer: "平台不會賺取任何模型差價，也不會扣除平台本身的生成點數。你只需要支付 DramaCanvas 的工作空間服務費，而模型調用的實際費用，則由你所綁定的第三方服務商帳戶直接扣款。" },
            { question: "平台上有哪些功能是免費的？", answer: "手動撰寫劇本與手動編輯分鏡完全免費。素材可以儲存在瀏覽器或授權的本機資料夾，畫布也能匯出為包含素材的 ZIP 壓縮檔；平台不承諾提供雲端儲存空間。" },
            { question: "哪些 AI 操作會扣除點數？", answer: "使用 AI 產生劇本、文字分鏡、圖片與影片都會依照所選任務與模型扣除點數。文字按請求或用量計費，圖片依模型規格計費，影片按請求或按秒計算。每次執行前畫面都會顯示本次要扣的點數。" },
            { question: "點數包與訂閱發放的點數會過期嗎？", answer: "購買的點數包與訂閱發放的點數不設到期日，訂閱期結束也不會歸零。活動贈送或獎勵性質的點數可能各自設有有效期限，以發放時的說明為準。" },
            { question: "模型規格、影片長度與解析度如何影響點數消耗？", answer: "選擇的模型與規格決定費用級距。部分影片按秒計費，長度越長扣除越多，解析度也會影響可選擇的時長與價格；若依實際用量結算，多預留的點數會退回到餘額。" },
            { question: "使用 Agent 需要另外支付服務費嗎？", answer: "平台沒有單獨的 Agent 服務費，只會按 Agent 實際執行的文字、圖片或影片生成動作扣取點數。透過 MCP 執行 Agent 時，你可以為每一輪設定點數預算上限，該設定僅為上限，並不是固定扣點。" },
            {
                question: "任務取消、超時、部分成功或重新產生時，點數如何處理？",
                answer: "明確失敗或在送至模型服務前取消的任務，點數都會退回到餘額；若模型端狀態暫時未明，點數會先凍結，核實成功則結算、失敗則退回到餘額。部分成功會依實際用量結算並將多預留的點數退回到餘額，重新產生屬於新任務，會依照新報價扣除點數。",
            },
            { question: "團隊點數如何分配與管理？", answer: "團隊擁有獨立的點數帳戶，可以為成員設定每月預算額度。團隊擁有者與管理員可以檢視團隊流水明細，並將個人點數劃入團隊帳戶；一般成員無法查看流水或進行點數劃轉。" },
            { question: "生成的圖片和影片會有浮水印嗎？", answer: "未付費帳號生成的圖片與影片左上角會帶有浮水印（使用自己的 API Key 則不帶），且添加浮水印不扣除點數。只要儲值或訂閱任一方案，以往與未來的所有作品皆可下載無浮水印版本。" },
        ],
        help: [
            { question: "如何在畫布上開始製作第一部短劇？", answer: "貼上你的劇本大綱，直接告訴右側面板的 AI 助手即可開始。助手會自動將劇情拆解為標記景別、鏡頭動作與台詞的分鏡卡片；在確認角色設定後，即可逐一生成各鏡頭畫面，並在時間軸上完成排版。" },
            {
                question: "如何讓主角在不同鏡頭中盡量保持長相一致？",
                answer: "建議在生成鏡頭前先選定一張清晰的角色參考圖。系統在排布後續鏡頭時會優先參考該面部特徵，盡量維持人物外貌連貫；若有個別鏡頭長相偏差，只要更換參考圖或微調提示詞後重新生成該鏡頭即可。",
            },
            { question: "創作素材儲存在哪裡？該如何進行專案備份？", answer: "素材可以儲存在瀏覽器本機快取中，也可以授權指定的電腦資料夾來儲存。如需備份，在畫布列表選取該畫布並匯出為 .zip 壓縮檔即可；建議原始素材也在電腦中另外保留一份備份。" },
            { question: "使用 DramaCanvas 生成的影片可以用於商業用途嗎？", answer: "可以用於商業專案，但具體需遵守你所選擇模型的官方使用條款，並確認你上傳的參考素材具備合法版權。開通平台會員並不代表自動取得第三方素材的版權授權。" },
            { question: "如何邀請團隊成員一同在畫布上協同創作？", answer: "團隊管理員可以直接在團隊管理頁面發送邀請連結，並設定各成員的權限與點數使用額度。" },
            { question: "遇到影片或圖片生成失敗時該如何處理？", answer: GENERATION_REFUND_COPY["zh-TW"] },
        ],
        mcp: [
            { question: "DramaCanvas 的 MCP 功能是什麼？能做到哪些事？", answer: "MCP 是一套開放協定介面，能讓外部 AI 助手直接操作你的畫布。連線建立後，外部工具可以直接協助你撰寫劇本分鏡、在畫布上擺放鏡頭卡片，甚至直接呼叫模型生成影片。" },
            { question: "目前支援與哪些外部 AI 工具進行連線？", answer: "目前支援 Claude Code、Codex、Cursor 等相容 MCP 協定的開發工具。你可以直接在這些工具中使用日常自然語言下達指令，指揮 AI 助手在 DramaCanvas 畫布上執行創作流程。" },
            { question: "透過外部工具呼叫生成會扣除點數嗎？如何控制預算花費？", answer: "會正常扣除你的帳號點數。為了有效控管花費，你可以在平台的金鑰管理頁面為該連線設定具體的扣點上限；一旦達到額度上限便會自動停止生成，避免超出預期支出。" },
            { question: "若不再使用，該如何撤銷外部工具的存取權限？", answer: "直接前往平台的金鑰管理頁面，將對應的金鑰撤銷或刪除即可。撤銷後，外部工具將立即失去存取你的畫布與扣除點數的權限，而畫布上已建立的內容完全不會受到影響。" },
        ],
        "seedance-2-0": [
            {
                question: "DramaCanvas 上的 Seedance 2.0 是由哪家公司開發的技術？",
                answer: "Seedance 2.0 是字節跳動旗下的影片模型，採用與即夢相同的技術架構。你可以在畫布右側與 AI 助手對話，或直接在卡片上選擇 Seedance 2.0 生成影片畫面，前期排布分鏡過程完全免費。",
            },
            { question: "Seedance 2.0 在平台上支援哪些可用版本？", answer: "平台目前提供標準、Fast、Mini、HC 與 720P 共五個版本。不同版本與解析度的計費標準不同，你可以在分鏡卡片上依生成需求自由挑選。" },
            { question: "使用 Seedance 2.0 生成影片是如何計費與扣點的？", answer: "Seedance 2.0 依生成影片的實際秒數計費。各版本與解析度的價格有所不同，每次點擊生成前，畫布都會明確標出本次需扣除的準確點數；若生成失敗，點數會自動退回。" },
            { question: "可以使用自己持有的 API Key 來調用 Seedance 2.0 嗎？", answer: "可以。在平台設定中串接相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型調用費用由你的服務商直接收取，平台不加價、不扣平台點數，僅另收工作空間服務費。" },
        ],
        "seedance-2-5": [
            { question: "Seedance 2.5 與先前的 2.0 版本有何不同？", answer: "Seedance 2.5 是字節跳動推出的新一代影片生成模型，同樣採用即夢同款技術。平台目前提供標準版與 1080P Max 兩個可用版本，影片皆依生成秒數計費。" },
            { question: "Seedance 2.5 在畫布中包含哪些版本可供選擇？", answer: "目前支援標準版與 1080P Max 兩個版本。不同版本與解析度對應的扣點標準不同，在點擊生成前，畫布卡片都會清楚標明本次需要扣除的準確點數。" },
            { question: "如何在 DramaCanvas 中呼叫 Seedance 2.5 生成影片？", answer: "你可以在畫布右側面板與 AI 助手對話，或在分鏡卡片上直接切換選取該模型。在確認生成前，畫布會明確顯示本次扣除的點數；若生成失敗，點數會退回。" },
            { question: "使用 Seedance 2.5 創作短劇可以免費體驗哪些功能？", answer: "使用畫布、手動撰寫劇本與編輯分鏡腳本完全免費。AI 劇本、AI 分鏡與影片生成依所選模型扣除點數，影片依秒數計費，每次生成前都會顯示本次扣點數值。" },
        ],
        "sora-2": [
            { question: "在 DramaCanvas 上使用 Sora 2 需要邀請碼嗎？", answer: "完全不需要邀請碼。Sora 2 由 OpenAI 開發，創作者直接在網頁畫布中即可調用，無需等待內測資格，在卡片上選定模型或向右側助手下指令即可生成影片。" },
            { question: "Sora 2 是由哪家廠商推出的 AI 模型？", answer: "Sora 2 是由 OpenAI 開發的影片生成模型。在 DramaCanvas 中用於影片生成，採按生成秒數計費的規則，生成前畫布介面會清楚展示本次扣除的點數。" },
            { question: "生成 Sora 2 影片是如何扣除點數的？", answer: "Sora 2 屬於影片模型，統一依照生成的秒數扣除點數。不同解析度對應的點數標準不同，每次生成前畫布會明確提示本次扣點數值，若生成失敗點數退回。" },
            { question: "可以自備 OpenAI API Key 來調用 Sora 2 嗎？", answer: "可以。在設定中串接相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型費用由你的供應商直接收取，平台不加價、不扣平台點數，僅另收工作空間服務費。" },
        ],
        "veo-3-1": [
            { question: "Veo 3.1 是由哪家公司開發的 AI 影片模型？", answer: "Veo 3.1 是由 Google 推出的影片生成模型。你可以在 DramaCanvas 的畫布卡片上直接挑選它，或在右側面板向 AI 助手發送提示詞進行影片生成。" },
            { question: "Veo 3.1 的計費方式是依秒數還是依次數計算？", answer: "平台對 Veo 3.1 提供依秒數計費以及部分規格依產生次數計費的規則。不同規格與解析度價格不同，在點擊生成前，畫布皆會直接標明本次準確扣除的點數。" },
            { question: "可以在不消耗點數的情況下體驗 Veo 3.1 相關創作嗎？", answer: "使用畫布、手動撰寫劇本與編輯分鏡腳本完全免費。AI 劇本、AI 分鏡與 Veo 3.1 影片生成均依模型扣除點數，系統在生成前會標明扣點數值，若遇到生成失敗點數會自動退回。" },
            { question: "平台支援設定自備金鑰來調用 Google Veo 3.1 嗎？", answer: "支援。在設定頁面中綁定相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型調用費用由你的服務商直接收取，平台不加價也不扣平台點數，僅另收工作空間服務費。" },
        ],
        "kling-3-0": [
            { question: "Kling 3.0（可靈 3.0）具備哪些特色功能？", answer: "Kling 3.0 支援 2 張圖做首尾影格，一般生成 3–15 秒，運動控制 3–30 秒；Turbo 只支援 1 張首影格圖，時長 3–15 秒。" },
            { question: "什麼是可靈 3.0 的運動控制功能？", answer: "Kling 3.0 的運動控制模式支援 3–30 秒輸出；一般生成時長為 3–15 秒。生成前可在畫布確認所選規格與扣款。" },
            { question: "Kling 3.0 提供哪些可用版本？計費方式有何不同？", answer: "平台提供標準版與 Turbo 兩個版本，均依影片秒數計費。不同版本與解析度價格有所差異，每次生成前畫布都會顯示該次準確扣除的點數。" },
            { question: "如何在畫布中操作 Kling 3.0 產生影片？", answer: "你可以直接在畫布右側與 AI 助手對話，或在分鏡卡片上直接選取可靈 3.0 生成。生成前畫面上會顯示應扣點數，若生成失敗點數會自動退回。" },
        ],
        "minimax-h3": [
            { question: "海螺 AI（MiniMax H3）支援多張圖片生成影片嗎？", answer: "MiniMax H3 與 H3 Max 均只支援 1 張圖做首影格，不支援多圖、參考影片或參考音訊。" },
            { question: "MiniMax H3 在 DramaCanvas 上提供哪些版本可供使用？", answer: "平台提供標準版與 H3 Max 兩個可用版本。模型依生成影片的秒數計費，不同版本與解析度價格各異，生成前在畫布卡片上可直接確認扣點數值。" },
            { question: "使用海螺 AI（MiniMax H3）生成影片是如何扣點的？", answer: "MiniMax H3 統一依影片秒數計費。不同版本與解析度扣除的點數不同，生成前畫布會明確提示應扣點數；若生成失敗，點數將退回。" },
            { question: "可以使用自備的 API Key 來調用 MiniMax H3 嗎？", answer: "可以。在設定中串接相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型調用費用由你的服務商直接收取，平台不加價、不扣平台點數，僅另收工作空間服務費。" },
        ],
        "wan-3-0": [
            { question: "Wan 3.0（通義萬相）是由哪家公司推出的模型？", answer: "Wan 3.0 即通義萬相，是由阿里巴巴研發的影片生成模型。創作者可以在畫布右側與 AI 助手對話，或直接在分鏡卡片上挑選該模型生成影片。" },
            { question: "通義萬相 Wan 3.0 在平台上有哪些可用版本？", answer: "平台目前提供標準版與 Prime 兩個版本。兩個版本皆依影片生成秒數計費，不同版本與解析度價格有所差異，生成前畫布會直接顯示扣除點數。" },
            { question: "Wan 3.0 影片生成的計費與扣點規則為何？", answer: "Wan 3.0 屬於影片模型，統一依生成秒數計費。不同版本與解析度價格不同，生成前畫布會標示本次所需扣除的準確點數，若生成失敗點數退回。" },
            { question: "剛開始使用 Wan 3.0 編排劇本與分鏡需要付費嗎？", answer: "在畫布上手動撰寫劇本與編輯分鏡全流程完全免費。AI 劇本、AI 分鏡與 Wan 3.0 影片生成均依模型扣除點數，影片依秒數計費，生成前皆有明確扣點提示。" },
        ],
        "grok-imagine": [
            { question: "Grok Imagine 是由哪家廠商開發的模型？包含哪些規格？", answer: "Grok Imagine 由 xAI 開發。它包含用於生成圖片的 Grok Imagine Image 2.0，以及用於生成影片的 Grok Imagine Video 1.5。" },
            { question: "Grok Imagine 可以同時用於產生圖片與影片嗎？", answer: "可以同時生成圖片與影片。該系列中圖片生成可使用 Grok Imagine Image 2.0，影片生成可使用 Grok Imagine Video 1.5，皆可直接在畫布中調用。" },
            { question: "Grok Imagine 的點數扣除方式為何？", answer: "圖片模型 Image 2.0 依張數計費，影片模型 Video 1.5 依秒數計費。不同解析度對應的價格不同，每次生成前畫布都會標示本次扣除的準確點數。" },
            { question: "生成 Grok Imagine 畫面時若失敗，會退回點數嗎？", answer: "生成失敗點數會自動退回。此外，畫布操作、手動劇本撰寫與分鏡編輯全數免費；AI 劇本、AI 分鏡、圖片與影片生成依模型扣除點數，生成前也會明確顯示應扣點數。" },
        ],
        "nano-banana": [
            { question: "Nano Banana 是由哪家公司開發的技術？主要用於什麼？", answer: "Nano Banana 是 Google 旗下的圖片生成模型。創作者可以在卡片上選用它，或透過右側 AI 助手對話，生成短劇分鏡所需的角色或場景圖片素材。" },
            { question: "Nano Banana 在平台上有哪些可用版本可供選擇？", answer: "平台目前提供 Nano Banana、Nano Banana 2、Nano Banana 2.1 以及 Nano Banana Pro（1K）共四個版本供創作者自由選用。" },
            { question: "使用 Nano Banana 生成圖片是如何計費與扣點的？", answer: "Nano Banana 屬於圖片模型，統一按生成張數計費。不同版本與解析度的價格不同，生成前畫布卡片會清楚標示扣除的準確點數，若生成失敗點數退回。" },
            { question: "可以使用自備的 API Key 來調用 Nano Banana 嗎？", answer: "可以。在設定頁面中串接相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型調用費用由你的服務商直接收取，平台不加價、不扣平台點數，僅另收工作空間服務費。" },
        ],
        "gpt-image-2": [
            { question: "GPT Image 2 是由哪家公司研發的？目前提供哪些版本？", answer: "GPT Image 2 由 OpenAI 開發，平台目前同時支援 GPT Image 2、GPT Image 2.5 與 GPT Image 2.6 三個版本的圖片生成。" },
            { question: "GPT Image 2、GPT Image 2.5 與 GPT Image 2.6 是影片還是圖片模型？", answer: "它們均為圖片生成模型，統一依照生成張數計費。創作者可以在分鏡卡片上根據構圖需求，自由切換不同版本與不同解析度。" },
            { question: "GPT Image 系列生成圖片的收費標準為何？", answer: "該系列統一按張計費。不同版本與解析度價格各異，在點擊確認生成前，畫布會明確顯示本次扣除的準確點數；若生成失敗點數會自動退回。" },
            { question: "如何在 DramaCanvas 中調用 GPT Image 2 生成分鏡圖？", answer: "在畫布右側面板與 AI 助手對話，或在分鏡卡片上直接選取該模型即可生成。手動撰寫劇本與編輯分鏡完全免費；生成 GPT Image 2 圖片依張數扣點，AI 劇本與 AI 分鏡也按點數計費。" },
        ],
        "midjourney-v7": [
            { question: "在 DramaCanvas 使用 Midjourney V7 必須登入或綁定 Discord 嗎？", answer: "完全不需要 Discord。在 DramaCanvas 中，創作者直接在網頁畫布上就能直接調用 Midjourney V7 生成圖片，無需繁瑣設定。" },
            { question: "Midjourney V7 是依生成張數還是使用時長來計費？", answer: "Midjourney V7 屬於圖片模型，統一按生成張數計費。不同解析度價格各異，每次生成圖片前，畫布都會清楚顯示本次需扣除的準確點數。" },
            { question: "使用 Midjourney V7 生成圖片若失敗，會扣除點數嗎？", answer: "生成失敗點數會自動退回。每次生成前，畫布卡片都會清楚標明本次本次扣除的點數。" },
            { question: "透過 Midjourney V7 生成的圖片可以用於商業用途嗎？", answer: "一般可以用於商業專案，但具體須遵守 Midjourney 的官方使用條款，並確認你上傳的參考素材具有合法版權。開通平台會員並不代表自動取得第三方內容的版權授權。" },
        ],
    },
    "zh-HK": {
        home: [
            { question: HOME_POSITIONING["zh-HK"].question, answer: HOME_POSITIONING["zh-HK"].answer },
            { question: SIGNUP_CREDITS_COPY["zh-HK"].question, answer: SIGNUP_CREDITS_COPY["zh-HK"].answer },
            { question: "生成失敗會退還積分嗎？", answer: GENERATION_REFUND_COPY["zh-HK"] },
            { question: "不懂寫提示詞或沒有剪片經驗也可以使用嗎？", answer: "完全可以。你只需用日常通俗語言輸入故事劇情，AI 助手就會幫你拆解為帶有景別與動作指引的分鏡卡片；生成的影片片段可直接在畫布內建的時間軸上拖曳排版，無需專業剪片經驗。" },
        ],
        pricing: [
            {
                question: "DramaCanvas 的訂閱收費方案與價格是如何計算的？",
                answer: "標準版月費為 {monthly}（包含 {monthlyCredits} 積分），年費為 {annual}（包含 {annualCredits} 積分）。所有方案均以美元結算，圖片與影片生成共用帳戶積分，在生成畫面之前，畫布均會明確提示本次消耗的積分。",
            },
            { question: "訂閱付款後，積分何時會存入帳戶？", answer: "付款成功後積分即時存入帳戶。按月訂閱每月發放一次積分；按年訂閱則一次過發放全年的總積分。每次在畫布生成畫面或影片前，系統都會清楚顯示本次需要扣除的積分。" },
            { question: "生成失敗會退還積分嗎？", answer: GENERATION_REFUND_COPY["zh-HK"] },
            { question: "積分包與會員訂閱可以一併使用嗎？", answer: "可以同時使用。會員訂閱積分與單獨購買的積分包分開記賬，並按錢包設定的順序扣除，兩者餘額均可隨時在錢包內查看。" },
            {
                question: "按年訂閱會比按月訂閱更划算嗎？",
                answer: "選擇按年訂閱更划算。標準版、進階版、高級版選按年訂閱，交 10 個月的錢，一次過拿 12 個月的積分（豪華版約拿 11.6 個月，至尊版各週期同價），每積分折算約 {annualUnit}，比月費方案（每積分約 {monthlyUnit}）優惠得多。",
            },
            { question: "團隊方案如何收費與管理？", answer: "團隊方案現已支援線上購買。付款人即為團隊擁有者，可透過電子郵件邀請成員並設定點數用量上限。每期點數會統一計入團隊共享集區。" },
            { question: "自備 API Key（BYOK）是如何收費的？", answer: "平台絕不賺取任何模型差價，亦不會扣除平台的生成積分。你只需支付 DramaCanvas 的工作空間服務費，模型調用費用由你所綁定的第三方服務商帳戶直接扣除。" },
            { question: "平台上有哪些功能是免費的？", answer: "手動撰寫劇本與手動編輯分鏡完全免費。素材可以儲存在瀏覽器或授權的本機資料夾，畫布也能匯出為包含素材的 ZIP 壓縮檔；平台不承諾提供雲端儲存空間。" },
            { question: "哪些 AI 操作會扣除積分？", answer: "使用 AI 生成劇本、文字分鏡、圖片與影片都會依照所選任務與模型扣除積分。文字按請求或用量計費，圖片依模型規格計費，影片按請求或按秒計算。每次執行前畫面都會顯示本次要扣的積分。" },
            { question: "積分包與訂閱發放的積分會過期嗎？", answer: "購買的積分包與訂閱發放的積分不設到期日，訂閱期結束也不會歸零。活動贈送或獎勵性質的積分可能各自設有有效期限，以發放時的說明為準。" },
            { question: "模型規格、影片長度與解析度如何影響積分消耗？", answer: "選擇的模型與規格決定價格級別。部分影片按秒計費，長度越長扣除越多，解析度也會影響可選擇的時長與價格；若依實際用量結算，多預留的積分會退回到餘額。" },
            { question: "使用 Agent 需要另外支付服務費嗎？", answer: "平台沒有單獨的 Agent 服務費，只會按 Agent 實際執行的文字、圖片或影片生成動作扣取積分。透過 MCP 執行 Agent 時，你可以為每一輪設定積分預算上限，該設定僅為上限，並不是固定扣費。" },
            {
                question: "任務取消、超時、部分成功或重新生成時，積分如何處理？",
                answer: "明確失敗或在送至模型服務前取消的任務，積分都會退回到餘額；若模型端狀態暫時未明，積分會先凍結，核實成功則結算、失敗則退回到餘額。部分成功會依實際用量結算並將多預留的積分退回到餘額，重新生成屬於新任務，會依照新報價扣除積分。",
            },
            { question: "團隊積分如何分配與管理？", answer: "團隊擁有獨立的積分帳戶，可以為成員設定每月預算額度。團隊擁有者與管理員可以查看團隊流水明細，並將個人積分劃入團隊帳戶；普通成員無法查看流水或進行積分劃轉。" },
            { question: "生成的圖片和影片會有水印嗎？", answer: "未付費帳戶生成的圖片及影片左上角會帶有水印（使用自己的 API Key 則不帶），且添加水印不扣除積分。只要增值或訂閱任何計劃，過往及未來的所有作品均可下載無水印版本。" },
        ],
        help: [
            { question: "如何在畫布上開始製作第一部短劇？", answer: "貼上你的劇本大綱，直接告訴右側的 AI 助手即可開始。助手會自動幫你拆解為帶有景別與鏡頭動作的分鏡卡片，確認角色設定後即可逐一生成鏡頭畫面，並在時間軸上排好順序。" },
            { question: "如何讓主角在不同鏡頭中更像同一個人？", answer: "建議在生成前先選定一張清晰的角色參考圖。系統排布後續鏡頭時會優先參考該面部特徵，盡量保持角色外貌連貫；若個別鏡頭樣貌走樣，更換參考圖或微調提示詞重新生成該鏡即可。" },
            { question: "專案素材儲存在哪裡？如何備份？", answer: "素材可儲存在瀏覽器內，亦可授權電腦本機資料夾進行儲存。如需備份，在畫布列表選取畫布並匯出為 .zip 檔案即可；建議原始素材另行保留一份副本。" },
            { question: "在 DramaCanvas 生成的影片可以用於商業用途嗎？", answer: "可以用於商業專案，但須視乎你所調用模型的使用條款，以及你所上傳的素材是否擁有版權。開通會員並不代表自動獲得第三方內容的版權。" },
            { question: "如何邀請團隊成員共同協作？", answer: "團隊管理員可在團隊管理頁面發送邀請，並管理成員權限與積分用量。成員加入後，在選擇團隊且開啟共享積分時，即可使用團隊積分進行生成。" },
            { question: "遇到影片或畫面生成失敗時該如何處理？", answer: GENERATION_REFUND_COPY["zh-HK"] },
        ],
        mcp: [
            { question: "DramaCanvas 的 MCP 是甚麼？具體有何功用？", answer: "它是一個開放協定介面，讓外部 AI 助手可以直接操作你的畫布。連接後，外部工具能直接為你撰寫劇本分鏡、在畫布上排布鏡頭卡片，甚至直接調用模型生成影片。" },
            { question: "目前支援連接哪些外部 AI 工具？", answer: "目前支援 Claude Code、Codex、Cursor 等相容 MCP 協定的開發工具。你可以直接在這些工具內使用自然語言下達指令，指揮它在 DramaCanvas 畫布上完成創作流程。" },
            { question: "外部工具生成會扣除積分嗎？如何控制開銷？", answer: "會正常扣除你的帳戶積分。為有效控制花費，你可以在平台的金鑰管理頁面為該連接設定具體的消費上限，達到額度後會自動停止生成，避免超出預算的扣費。" },
            { question: "不再使用時如何撤銷外部工具的存取權限？", answer: "直接在平台的金鑰管理頁面撤銷或刪除對應金鑰即可。撤銷後，外部工具會即時失去存取畫布及消耗積分的權限，而畫布現有內容絕不受任何影響。" },
        ],
        "seedance-2-0": [
            { question: "DramaCanvas 上的 Seedance 2.0 是哪間公司的技術？", answer: "它是字節跳動旗下的模型，亦即即夢同款技術。你可以在畫布右側與 AI 助手對話，或直接在卡片上選用 Seedance 2.0 生成影片畫面，排布分鏡的過程完全免費。" },
            { question: "Seedance 2.0 支援哪些可用版本？", answer: "平台目前提供標準、Fast、Mini、HC 與 720P 共五個版本。不同版本及解像度的計費各有不同，你可以在鏡頭卡片上按創作需要自由挑選。" },
            { question: "使用 Seedance 2.0 生成影片如何收費？", answer: "Seedance 2.0 按生成影片的秒數計費。不同版本與解像度的價格不同，生成前畫布會明確顯示本次扣除的準確積分，若生成失敗積分會自動全數退回。" },
            { question: "可以自備 API Key 調用 Seedance 2.0 嗎？", answer: "可以。在設定中接入相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型費用由你的服務商直接收取，平台不加價、不扣除平台積分，僅另收工作空間服務費。" },
        ],
        "seedance-2-5": [
            { question: "Seedance 2.5 與先前的 2.0 版本有何分別？", answer: "Seedance 2.5 是字節跳動推出的新一代模型，同屬即夢同款技術。平台提供標準版與 1080P Max 兩個可用版本，影片均按秒數計費。" },
            { question: "Seedance 2.5 包含哪些可用版本？", answer: "目前支援標準版與 1080P Max 兩個版本。不同版本與解像度的收費各有不同，在點擊生成前，畫布均會直接標明本次需要扣除的準確積分。" },
            { question: "如何在 DramaCanvas 中使用 Seedance 2.5 生成影片？", answer: "你可以在畫布右側與 AI 助手對話，或在分鏡卡片上直接選用該模型生成。點擊生成前，畫布會明確顯示本次扣除的積分，若生成失敗積分會自動退回。" },
            { question: "使用 Seedance 2.5 創作短劇可以免費試用嗎？", answer: "畫布、手動撰寫劇本與編輯分鏡功能完全免費。AI 劇本、AI 分鏡與影片生成按所選模型扣除積分，影片按秒數計費，每次生成前均會清楚顯示扣費數值。" },
        ],
        "sora-2": [
            { question: "在 DramaCanvas 使用 Sora 2 需要邀請碼嗎？", answer: "完全毋須邀請碼。Sora 2 由 OpenAI 開發，用戶在網頁畫布內即可直接調用，毋須排隊申請內測資格，在卡片上選取模型或與右側助手對話即可生成影片。" },
            { question: "Sora 2 是由哪間公司開發的？", answer: "Sora 2 是 OpenAI 旗下的影片生成模型。在平台內專門用於生成影片，採取按秒計費機制，生成前畫布介面會清楚顯示扣除的積分。" },
            { question: "生成 Sora 2 影片是如何計費與扣費的？", answer: "Sora 2 屬於影片模型，統一按生成的秒數扣費。不同解像度的收費各有不同，每次生成前畫布均會明確顯示所需積分，若生成失敗積分退回。" },
            { question: "可以自備 OpenAI API Key 調用 Sora 2 嗎？", answer: "可以。在設定中接入相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型費用由你的服務商直接收取，平台不加價、不扣除平台積分，僅另收工作空間服務費。" },
        ],
        "veo-3-1": [
            { question: "Veo 3.1 是哪間公司的 AI 模型？", answer: "Veo 3.1 是 Google 推出的影片生成模型。你可以在 DramaCanvas 的畫布卡片上直接選用，或在右側向 AI 助手發送指令生成影片。" },
            { question: "Veo 3.1 是按秒計費還是按次計費？", answer: "平台對 Veo 3.1 採取按秒計費及部分規格按次計費的規則。不同規格與解像度的價格各有不同，在點擊生成前，畫布均會直接標明準確扣除的積分。" },
            { question: "可以在不消耗積分的情況下體驗 Veo 3.1 相關創作嗎？", answer: "畫布、手動撰寫劇本與編輯分鏡等功能完全免費。AI 劇本、AI 分鏡與 Veo 3.1 影片生成均按模型扣除積分，系統在生成前會清楚顯示扣費數值，若生成失敗積分會自動退回。" },
            { question: "支援設定個人金鑰調用 Google Veo 3.1 嗎？", answer: "可以。在設定中接入相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型費用由你的服務商直接收取，平台不加價、不扣除平台積分，僅另收工作空間服務費。" },
        ],
        "kling-3-0": [
            { question: "可靈 Kling 3.0 具備哪些特色功能？", answer: "Kling 3.0 支援 2 張圖做首尾幀，一般生成 3–15 秒，運動控制 3–30 秒；Turbo 只支援 1 張首幀圖，時長 3–15 秒。" },
            { question: "甚麼是可靈 3.0 的運動控制功能？", answer: "Kling 3.0 的運動控制模式支援 3–30 秒輸出；一般生成時長為 3–15 秒。生成前可在畫布確認所選規格與扣費。" },
            { question: "Kling 3.0 提供哪些版本可供選擇？計費方式有何分別？", answer: "平台提供標準版與 Turbo 兩個版本，均按秒數計費。不同版本與解像度的價格各有不同，每次生成前畫布均會顯示本次準確扣除的積分。" },
            { question: "如何在畫布中使用 Kling 3.0 生成影片？", answer: "你可以在畫布右側與 AI 助手對話，或在分鏡卡片上直接選用可靈 3.0。生成前會清晰看到本次扣除的積分數值，若生成失敗積分會自動退回。" },
        ],
        "minimax-h3": [
            { question: "海螺 AI（MiniMax H3）支援多張圖片生成影片嗎？", answer: "MiniMax H3 與 H3 Max 均只支援 1 張圖做首幀，不支援多圖、參考影片或參考音訊。" },
            { question: "MiniMax H3 在 DramaCanvas 提供哪些可用版本？", answer: "平台提供標準版與 H3 Max 兩個版本。模型按生成的影片秒數計費，不同版本與解像度價格不同，生成前在畫布卡片上可直接查看扣費數值。" },
            { question: "使用海螺 AI 生成影片是如何計費與扣費的？", answer: "MiniMax H3 按影片秒數計費。不同版本及解像度扣費不同，在生成前畫布會明確顯示應扣積分；若生成失敗，扣除的積分將全數退回。" },
            { question: "可以自備 API Key 調用 MiniMax H3 嗎？", answer: "可以。在設定中接入相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型費用由你的服務商直接收取，平台不加價、不扣除平台積分，僅另收工作空間服務費。" },
        ],
        "wan-3-0": [
            { question: "通義萬相 Wan 3.0 是由哪間公司研發的？", answer: "Wan 3.0 即通義萬相，是由阿里巴巴研發的影片生成模型。用戶可以在畫布右側與 AI 助手對話，或在卡片上直接選用該模型生成影片。" },
            { question: "通義萬相 Wan 3.0 有哪些可用版本？", answer: "平台目前提供標準版與 Prime 兩個版本。兩個版本均按影片秒數計費，因版本與解像度不同而價格有異，生成前畫布會直接顯示扣除積分。" },
            { question: "Wan 3.0 影片生成是如何計費的？", answer: "Wan 3.0 屬於影片模型，統一按秒數計費。不同版本與解像度的價格不同，生成前畫布會清楚標示本次所需扣除的準確積分，生成失敗積分退回。" },
            { question: "在畫布上撰寫劇本與排布分鏡需要付費嗎？", answer: "在畫布上手動撰寫劇本、編輯分鏡全流程完全免費。AI 劇本、AI 分鏡與 Wan 3.0 影片生成均按模型扣除積分，影片按秒扣除積分，生成前會有明確的扣費提示。" },
        ],
        "grok-imagine": [
            { question: "Grok Imagine 是哪間公司的模型？包含哪些規格？", answer: "Grok Imagine 由 xAI 開發。它包含用於生成圖片的 Grok Imagine Image 2.0，以及用於生成影片的 Grok Imagine Video 1.5。" },
            { question: "Grok Imagine 可以同時生成圖片與影片嗎？", answer: "可以同時生成圖片與影片。製作分鏡圖片可選用 Grok Imagine Image 2.0，生成動態影片可調用 Grok Imagine Video 1.5，兩者均可在畫布中直接使用。" },
            { question: "Grok Imagine 是如何計費的？", answer: "圖片模型 Image 2.0 按張數計費，影片模型 Video 1.5 則按秒數計費。解像度不同價格亦有異，生成前畫布均會清楚標示本次扣除的準確積分。" },
            { question: "調用 Grok Imagine 生成失敗會退回積分嗎？", answer: "生成失敗積分會自動退回帳戶。此外，畫布使用、手動劇本撰寫與分鏡編輯均為免費；AI 劇本、AI 分鏡、圖片與影片生成按模型扣費，生成前亦會明確顯示應扣積分。" },
        ],
        "nano-banana": [
            { question: "Nano Banana 是哪間公司的技術？主要有何功用？", answer: "Nano Banana 是 Google 旗下的圖片生成模型。創作者可以在卡片上選用它，或透過右側 AI 助手對話，生成短劇分鏡所需的角色與場景圖片素材。" },
            { question: "Nano Banana 在 DramaCanvas 提供哪些可用版本？", answer: "平台目前提供 Nano Banana、Nano Banana 2、Nano Banana 2.1 以及 Nano Banana Pro（1K）共四個版本供創作者自由選用。" },
            { question: "使用 Nano Banana 生成圖片如何計費？", answer: "Nano Banana 屬於圖片模型，統一按生成張數計費。不同版本與解像度價格不同，生成前畫布卡片會顯示扣除的準確積分，若生成失敗積分退回。" },
            { question: "可以自備 API Key 調用 Nano Banana 嗎？", answer: "可以。在設定中接入相容 OpenAI、Gemini 等介面的自備金鑰（BYOK）後，模型費用由你的服務商直接收取，平台不加價、不扣除平台積分，僅另收工作空間服務費。" },
        ],
        "gpt-image-2": [
            { question: "GPT Image 2 是由哪間公司開發的？支援哪些可用版本？", answer: "GPT Image 2 由 OpenAI 開發。平台目前同時支援 GPT Image 2、GPT Image 2.5 與 GPT Image 2.6 三個版本的圖片生成。" },
            { question: "GPT Image 2、2.5 與 2.6 是影片還是圖片模型？", answer: "三者均為圖片生成模型，統一按生成張數計費。創作者可直接在分鏡卡片上按需要自由切換不同版本與解像度。" },
            { question: "GPT Image 系列生成圖片如何收費？", answer: "該系列統一按生成張數計費。不同版本及解像度的價格不同，在點擊生成前，畫布會明確顯示本次扣除的準確積分，若生成失敗積分會自動退回。" },
            { question: "如何在 DramaCanvas 中調用 GPT Image 2 生成分鏡圖？", answer: "在畫布右側與 AI 助手對話，或在分鏡卡片上直接選用該模型即可生成。手動撰寫劇本與編輯分鏡完全免費；生成 GPT Image 2 圖片按張數扣費，AI 劇本與 AI 分鏡亦按積分計費。" },
        ],
        "midjourney-v7": [
            { question: "使用 Midjourney V7 必須登入或綁定 Discord 嗎？", answer: "完全毋須使用 Discord。在 DramaCanvas 內，用戶直接在網頁畫布上即可調用 Midjourney V7 生成圖片，毋須繁瑣設定。" },
            { question: "Midjourney V7 是按生成張數還是使用時長計費？", answer: "Midjourney V7 屬於圖片模型，按生成張數計費。不同解像度價格不同，每次生成圖片前，畫布均會清晰顯示本次需要扣除的準確積分。" },
            { question: "調用 Midjourney V7 生成圖片失敗會扣除積分嗎？", answer: "生成失敗積分會自動全數退回。每次生成前畫布均會清楚顯示本次需要扣除的積分數值。" },
            { question: "使用 Midjourney V7 生成的圖片可以用於商業用途嗎？", answer: "一般情況下可以，但須遵守 Midjourney 的使用條款，並確保你所上傳的參考素材擁有相關版權。開通平台會員並不代表自動獲得第三方內容的版權。" },
        ],
    },
};

export const publicFaqs = (locale: BlogLocale, page: string): PublicFaq[] | undefined => PUBLIC_FAQS[locale]?.[page];
