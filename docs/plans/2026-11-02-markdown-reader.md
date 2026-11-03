# READER-002 实施计划：完整 Markdown 正文阅读

日期：2026-11-02
工作区：`.local/worktrees/READER-002`
依赖：继承 UI-001、MOTION-001、MOTION-002 的未集成交付。

## 已确认约束

- 使用仓库已安装的 marked 18.1.2，保留 GFM、单次 token 解析、服务端清洗、原始 HTML 拒绝和资产映射，不引入 MDX。
- marked 的 `code`、`table`、`image` renderer 均接收 token；子标题／表格单元格通过 `this.parser.parseInline(token.tokens)` 渲染。
- HTML 与目录来自同一 token 流。语义结构与 sanitizer 白名单变化时，`parseRevision` 必须递增，客户端契约同步使用共享常量。
- 客户端仅做渐进增强，不再包装、拆包或搬动服务端 DOM；Markdown 文本在 JavaScript 不可用时仍完整可读。

## 步骤

1. **服务端语义输出**
   - 代码：语言标签、复制按钮、可聚焦局部滚动区、溢出提示；代码正文只保留原始文本。
   - 表格：固定滚动容器与可访问名称，保留表头、对齐及行内格式。
   - 图片：按钮、尺寸、异步解码、可见 title caption、alt 和错误反馈容器；首图 eager，其余 lazy。
   - 扩展固定 sanitizer 白名单，只允许受控元素、类名和 data／ARIA 属性，保留 URL 与原始 HTML 负例。
2. **精简客户端增强**
   - 按稳定 data 属性绑定复制、ResizeObserver、图片错误与灯箱。
   - cleanup 只解绑监听和观察，不恢复原 DOM；复制失败选择纯代码文本。
3. **重排正文样式**
   - 统一中文段落、标题、嵌套列表、任务列表、删除线、引用、行内代码和长链接节奏。
   - 代码与表格仅局部横滑；移动端正文从 17–18px 方向起步；保留键盘焦点和减少动态效果。
4. **合成样例与测试**
   - 不增加记录数量，扩充现有三篇合成内容覆盖未知语言、长行、删除线、嵌套列表、长 URL 和图片 caption。
   - 增加服务端语义、安全、首图策略、无 DOM 搬动相关单元测试和真实浏览器正负例。
5. **验收与交付**
   - 执行 lint、typecheck、unit、integration、build、项目规范、浏览器和 56 视口检查。
   - 重跑正常／4× CPU 动效性能，保存 READER-002 截图与真实资源数据，正文脚本预算据实报告。
   - 停止本轮临时服务器，交付 `.local/worktrees/READER-002` 和逻辑预览链接。

## 验证边界

Chromium 视口与 CPU 节流失真是本地实验室证据，不冒充真实 iPhone、跨浏览器、生产或上线验收。不自动 commit／push，不修改真实私密内容。
