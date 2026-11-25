<p align="center"><img src="public/brand/logo.png" width="76" alt="DramaCanvas Logo" /></p>

# DramaCanvas

**面向 AI 影视、短剧与视觉叙事的开源前端。**

[在线体验](https://dramacanva.com/) · [接口说明](docs/api.md) · [公开范围](docs/scope.md)

[English](README.md) · 简体中文 · [Français](README.fr.md) · [日本語](README.ja.md)

![DramaCanvas — 从故事到银幕](docs/assets/cover.png)

DramaCanvas 将故事创作、无限画布和可复用的创作技能放进同一个工作台。本仓库公开部分页面和组件，方便你了解实现、开发自己的创作工具，或接入自己的后端。

**这里是前端预览版，不包含完整线上服务。** 本地运行使用隔离的演示数据，不提供真实 AI 生成、云端账号、支付或服务端存储。完整产品请访问 [dramacanva.com](https://dramacanva.com/)。

## 网站能做什么？

在 [dramacanva.com](https://dramacanva.com/) 上，你可以从故事或剧本开始创建短剧项目，规划角色和分镜，调用 AI 模型生成图片与视频片段，并在无限画布中整理创作素材。技能库和视频模板帮助你复用创作流程，用于短剧、短片、音乐视频等视觉叙事。可用的生成选项取决于所选模型与账号。

**[进入在线创作工作台 →](https://dramacanva.com/)**

## 包含哪些内容

| 页面 | 可以查看的内容 |
| --- | --- |
| 首页 | 页面布局、创作入口与虚构展示案例 |
| 短剧创作 | 项目导航、故事创作界面 |
| 画布 | 可视化工作区、节点组件与编辑代码 |
| 技能库 | 多语言技能目录、详情页与相关组件 |
| AI 视频模板 | 模板浏览与生成参数界面 |
| 内容工具 | 工具箱、素材库界面与部分公开页面 |

原始素材、真实作品记录不随代码发布。依赖后端数据的部分页面保留空状态。商品生成和关于我们不在本次公开范围内。

## 本地运行

需要 Node.js 22.12+ 和 Bun 1.3+。

```bash
git clone https://github.com/echoD886/dramacanva.git
cd dramacanva
bun install
bun run dev
```

打开 **http://127.0.0.1:5173**。不需要账号、API Key 或后端配置。

```bash
bun run build
bun run preview
bun run typecheck
bun run test
bun run audit:public
```

构建预览地址为 **http://127.0.0.1:4173**。真实生成、支付等操作会明确提示需要后端，不会伪造生成成功。

## 接入自己的服务

仓库包含前端使用的 TypeScript 请求与响应类型。[接口说明](docs/api.md)介绍项目、技能、模板和生成任务的输入、统一响应格式，以及演示数据适配层的位置。

模型密钥应由你自己的服务端保管。账号鉴权、权限校验、资源存储和任务执行需要另行实现；本仓库不连接 DramaCanvas 的线上业务 API。

## 多语言与 SEO

默认语言为英文，README 提供英文、中文、法语、日语版本。现有公开页面内容涵盖英文、简体与繁体中文、日语、韩语、西班牙语和葡萄牙语，各页面覆盖程度不同；法语 README 不代表应用已完成全部法语翻译。

源码保留页面标题、描述、canonical、语言替代链接，以及技能页的 FAQ、HowTo 等结构化数据辅助代码。本地预览默认禁止索引，不包含线上站点的预渲染、站点地图提交和统计配置。部署自己的版本前，请阅读 [SEO 说明](docs/seo.md)。

## 目录结构

页面位于 `src/pages/`，共享组件位于 `src/components/`，公开内容和翻译分别位于 `src/content/`、`src/i18n/`。`src/services/api/` 保存前端接口类型与客户端，`src/demo/` 提供隔离的演示数据；`public/` 包含 Logo 和占位图，`docs/` 包含接入与 SEO 说明。

技术栈：React、TypeScript、Vite、Ant Design、Tailwind CSS、Zustand。

## 参与贡献

欢迎报告问题、改进文档和完善翻译。请说明页面路径、复现步骤和预期行为，并使用虚构案例。不要在 Issue 或 PR 中上传账号导出、私人提示词、密钥或个人素材。详见 [贡献说明](CONTRIBUTING.md)。

代码采用 [MIT 许可证](LICENSE)。项目基于 Open AI Canvas 与 Infinite Canvas，原有署名保留于 [NOTICE](NOTICE)。第三方依赖遵循各自许可证；DramaCanvas 名称与 Logo 用于识别本项目，不表示对衍生项目的背书。
