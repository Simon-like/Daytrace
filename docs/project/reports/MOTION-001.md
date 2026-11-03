# MOTION-001：阅读优先的动效系统实施准备报告

日期：2026-11-02
分支：`agent/MOTION-001/motion-system`
基线：`1079863`
性质：官方资料调研、设计基线与执行者自检；未提交、未集成、未部署，未修改应用代码。

## 1. 交付与边界

本轮将优秀产品团队与平台的方法转化为 Daytrace 的动效设计准则，交付：

- [阅读型产品动效调研](../../research/2026-11-02-阅读型产品动效调研.md)：Vercel、Chrome/web.dev、Motion、Stripe 的一手来源、可采用方法与证据边界。
- [动效系统基线 v1.0](../../design/动效系统基线-v1.0.md)：职责、技术分层、令牌、组件矩阵、减少动态效果、性能证据和后续推广顺序。
- 文档目录已收录基线与调研，设计入口可直接进入动效基线。

没有修改 React／CSS 组件、Markdown 渲染、应用依赖、锁文件、PRD、生产配置或部署状态。本轮“系统”是可实施的设计与工程准则，不表示参考组件已经落地。

## 2. 核心决定

1. **CSS 优先**：普通控件和弹出层使用 CSS transitions／keyframes 与 Radix `data-state`；WAAPI 按需；Motion 只在未来直接操控、可中断弹簧等场景单独评估。
2. **阅读优先**：正文和路由主要内容立即可见，不做长列表 stagger、滚动劫持、持续噪点、视差或大面积滤镜动画。
3. **小动作与可中断**：项目起始档位为 120／160／200／140／240ms，普通位移以 4／8／16px 为主，退出短于进入，快速反向不排队。
4. **静态等价**：减少动态效果取消非必要位移、缩放、弹簧和平滑滚动，保留完整功能、焦点、文本和 ARIA 状态；JS 响应运行中偏好变化。
5. **性能实测**：首批 Select、移动导航、图片灯箱必须提交正常与 4× CPU trace，检查长任务、forced reflow、绘制、掉帧、CLS 和体积，而非只凭感觉验收。

所有具体数值均标为 Daytrace 项目建议值，不冒充 Apple、Material、Linear、Vercel 或其他团队的官方参数。Apple／Material 页面未获得足够正文、Linear 未形成可靠一手证据，因此没有引用其具体条款。

## 3. 与现有工程的关系

UI-001 已有本地 Tailwind／Radix 组件和部分 transitions／减少动态效果处理，可作为后续实现基础。但其工作区改动仍未 commit／push／集成主分支；本任务只读取其报告和实现作为设计输入，没有修改或验收该工作区。

UI-001 报告记录正文必要脚本为 142121 gzip bytes，高于原 81920 bytes 预算。本基线因此明确：该缺口未解决前，不得为简单动效扩大正文依赖；新增 Motion 等依赖必须另有 ADR 与体积评估。

Markdown 正文专项、真实身份、生产发布均不在本轮范围。

## 4. 验证

在 `.local/worktrees/MOTION-001` 执行：

- `python3 scripts/project_check.py --write-index`：成功更新生成索引。
- `python3 scripts/project_check.py`：通过，检查 141 份 Markdown、36 个目录条目，无错误。
- `git diff --check`：通过，无空白错误。

机器检查只证明文档结构、链接和格式，不证明动效体验或性能。本轮未运行应用测试、浏览器动画、Performance trace、WebKit 或真实 iPhone；这些属于后续参考实现验收。

## 5. 后续

按 Select → 移动导航 → 图片灯箱顺序实现三个参考组件，再推广到微反馈和状态组件。每个实现填写 purpose、trigger、duration、easing、properties、interruptible、accessibility、reduced-motion 和 performance 证据。

集成者需在保留 UI-001 和其他未提交现场的前提下，将本分支文档与后续前端实施串行整合；本报告不代表已经集成、发布或通过真实设备验收。
