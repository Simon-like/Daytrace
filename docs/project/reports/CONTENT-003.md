# CONTENT-003 Markdown 内容管理实现报告

日期：2026-11-03。性质：执行者自检与本地运行证据，非独立 QA、真机或生产验收。

## 交付结果

用户在 CONTENT-002 方案后要求实现，本轮在 dev 串行集成，没有新任务分支。后端基础提交 `953e770`，Unicode 附件修复 `ba00e51`；管理 UI 与双端接入为 `1f60e53`；手册与证据按独立文档提交收尾，最终哈希以 Git 日志为准。均推送 dev，不合并 main 或部署。

- unified/remark/rehype 替换 Marked 正文管线，保留原始 HTML 拒绝、声明附件与 URL 校验；增加 GFM 脚注、KaTeX、服务端有限语言 Shiki。未知语言/大代码块退回原文；复制、灯箱、表格横滑继续使用现有阅读增强。
- `daytrace-markdown-3` 与渲染配置参与快照哈希；目录和正文共用 AST，中文与重复标题使用去重语义 ID，保留 section-N 兼容锚点。参考式图片也必须受附件声明约束。
- 主人 `/owner/content` 提供文件/文件夹/ZIP、拖入文件、类型选择、校验定位、双宽度预览及更新时当前版本对照；默认私密草稿，显式保存/公开发布；刷新可恢复预览。
- 内容列表可筛选、改标题/别名/标签/公开范围，上传新版、看历史、恢复旧正文、导出单篇标准 Markdown 与附件 ZIP。整批事务、修订冲突与重复导入提示避免静默覆盖。
- `CONTENT_ROOT/.daytrace` 保存预览、不可变快照与当前指针；重启恢复，首次修改保留基线。原始 public/private 不被原地覆盖。管理接口复用会话、Origin+CSRF 和 no-store；未配置身份时不注册。
- 公开 slug/oldSlugs 通过 Nest 索引直接解析，私密/草稿/归档别名不可解析；桌面/H5 canonical 指向稳定 ID，H5 正文记录链接适配自己的阅读前缀。

使用入口：[内容库手册](../../development/content.md)。接口：[管理 API v1](../../architecture/contracts/content-management-v1.md)。本地 `pnpm dev -- --demo` → `/owner` → 内容库，使用隔离合成身份与合成资料。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| `pnpm typecheck` | API、桌面、H5 通过 |
| `pnpm lint` | 0 警告/错误 |
| `pnpm test:unit` | 46/46，包括新增公式/脚注/高亮、参考图安全与标题碰撞 |
| `pnpm test:content` | 10/10，真实 Nest HTTP/服务调用覆盖未登录、CSRF、路径越界/缺附件、预览隔离、发布幂等、更新冲突、导出往返、私密撤回、历史恢复、重启、批量互链、重复输入、错误签名、异常 multipart 和 Unicode 文件名 |
| `pnpm test:integration` | 8 + 13 + 5 全部通过，原公开读取/搜索、身份/附件负向与 Demo 回归 |
| `pnpm build` | API 及桌面/H5 生产构建通过；H5 链接适配追加后单独构建通过 |
| 已构建 SSR e2e | 1/1，通过旧 slug 308、公开正文/目录、私密 404、API 失败呈现 |
| `node tests/e2e/content/content.browser.mjs` | Chromium 5 组通过，隔离临时数据，实际二进制代理、上传/复制/恢复预览/发布/私密/历史/导出/筛选，以及独立 H5 新文章与 canonical；页面脚本错误 0 |

[浏览器结构化证据](../evidence/CONTENT-003/browser.json)与同目录桌面、手机管理预览和 H5 新文章截图保留合成材料。测试进程与临时内容根已清理，未停止用户既有开发服务。浏览器启动改用独立 standalone，避免占用已有 Next dev 锁。

[编译 API 渲染采样](../evidence/CONTENT-003/rendering.json)：Node 24.18.0 下，普通合成长文 30709/204795/2097150 字节单次分别约 23/84/780ms，超过 2MiB 拒绝。这不是多次跑分、Core Web Vitals 或另一解析器的对照性能结果。浏览器证据另记录桌面公开阅读页请求脚本 gzip 为 143742 bytes，高于 81920 bytes 预算；该次视口/采样与旧移动报告不同，不直接当作前后差值；原有性能问题不因新功能而自动通过。

## 真实限制与后续

- 真实 OIDC/Auth0 协议客户端、凭据与正式持久身份仍需 F1；此轮没有配置账户，也没有把合成登录当生产身份。提供 AuthRuntimeOptions 的应用接入点，不宣称 CLI 已接通真实提供方。
- 未做真实 iPhone/Safari、全量 AC/NFR、生产发布或托管存储。既有 UI-002 Select 长事件和阅读脚本预算仍有独立门槛。
- Mermaid 暂按代码显示，不支持执行 MDX/HTML，不承诺完整 Obsidian 方言；未做站内正文编辑器、RSS/sitemap 或无限别名。
- 单服务实例持久文件库，不做多副本读取同步。历史/未丢弃预览没有自动清理；掉电耐久未逐文件 fsync。备份必须包含整个内容根与隐藏状态目录，不能只复制初始 public/private。
- 本轮未跑完整库备份恢复演练；已验证单篇标准 ZIP 往返、当前指针重启读取、失败/冲突保留旧内容。真实恢复仍按运维退出门槛验证。
- 标题锚点不是永久段落 ID；旧 section-N 也保持顺序语义，不保证章节重排后的旧小节链接不变。

接手时已有的 next-env 生成声明、ARCH-001 evidence 修改和未跟踪设计目录未纳入交付。工程构建会切换 Next 生成声明的 dev/build 引用，收尾恢复到接手时的 dev 引用现场。
