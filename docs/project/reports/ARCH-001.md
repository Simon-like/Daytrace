# ARCH-001：Next/Nest 兼容与运行目标验证报告

日期：2026-10-30。基线：`203d20409b7537c369e7404eaca6e705299b51d5`。范围：固定 Next.js App Router + NestJS + TypeScript + pnpm workspace 的独立 PoC；未修改正式 apps/packages、根配置或中央台账，未重开 Astro 选型。

## 结论

可运行纵向切片已经建立并通过宿主生产模式验证：公开 Markdown 经 Nest API 和共享运行时契约，由 Next 动态 SSR 输出完整 HTML；合成私密 canary 的 API、页面和公开产物检查通过；standalone 能加载共享代码与静态资源运行。

**必要 JS 预算未达标。** 最终 Next 16.4.3 纯 Server Component 样本实测 174.18 KiB gzip，高于 80 KiB 目标 94.18 KiB；首屏必要传输 177.28 KiB，满足 800 KiB 预算。本报告不把功能通过等同于 NFR-01 全部通过。

## 版本矩阵

选择日期：2026-10-30。精确版本来自官方 npm registry，随后以 peer 检查、类型检查、构建和运行验证，而非仅凭“latest”。完整发布日期和 engines 证据见实验 `evidence/version-matrix.json`。

| 运行项 | 精确版本 | 结果 |
| --- | --- | --- |
| Node.js | 24.22.1 | darwin/arm64 实测；官方 LTS |
| Next.js | 16.4.3 | App Router、动态 SSR、standalone 通过 |
| React / React DOM | 19.3.1 / 19.3.1 | peer 与构建通过 |
| NestJS common/core/platform-express | 12.3.2 / 12.3.2 / 12.3.2 | 真实 API 与 peer 通过 |
| TypeScript | 7.0.2 | 双端通过；需 NodeNext 替代移除的 node10 |
| pnpm | 11.23.0 | workspace、allowBuilds、frozen 安装通过 |
| marked / gray-matter / sanitize-html | 18.1.2 / 4.0.3 / 2.18.1 | Markdown、frontmatter、安全负例通过 |

pnpm 12.16.1 在当前 registry 组合下不能形成可 frozen 的自身版本记录，因此最终推荐实测通过的 11.23.0，而非追逐更高 major。Node 24 是用户指定且仍受支持的宿主前提，不表示 Node 26 不存在。

官方查阅来源（2026-10-30）：[Node releases](https://nodejs.org/en/about/previous-releases)、[Next standalone/output tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)、[pnpm build permissions](https://pnpm.io/settings/build#allowbuilds)。

## 实测证据

运行方式：`experiments/ARCH-001/scripts/bootstrap.sh` 后执行 `scripts/pnpm.sh verify`。该流程完成 frozen 安装、peer 检查、TypeScript、6 个单测、双端生产构建和真实双进程端到端验证。

2026-10-30 追加复现性修复：旧锁含 103 个内网 HTTP tarball URL；`.npmrc` 改用官方 registry 不会自动重写既有 URL，已有依赖目录还会让删锁后的安装沿用旧状态。本次同时移除旧锁和 workspace 依赖目录，以固定 pnpm 11.23.0 从官方 HTTPS registry 全量重建 integrity-only 锁文件，再清除 pnpm、store、依赖和构建产物后完整复测。冻结安装重新下载 161 个包，供应链策略通过，未修改任何安全策略。

| 验证项 | 实际结果 | 证据 |
| --- | --- | --- |
| Markdown → Nest → Next SSR | HTML 含合成段落标记和实际 `<h2>`，不等待浏览器 Markdown 解析器 | `evidence/integration.json` |
| 共享契约 | API 与 Next 运行时校验 `1.0.0-arch.1`，不兼容响应负例通过 | 单测 + integration |
| standalone | 契约以 bundled server chunk 追踪，静态资源复制，真实 SSR 成功 | `evidence/standalone-manifest.json` |
| 公开/私密隔离 | 私密 API/SSR 均 404，无私密标题/正文；与不存在记录错误不可区分 | integration |
| 公共产物 canary | 扫描 12 个客户端文件、1241 个 standalone 文件，0 命中 | integration |
| 错误定位 | 422 `CONTENT_INVALID`；文件、`date` 字段、requestId 完整，无 stack | integration |
| 恶意 Markdown | TypeScript 合成输入中的 script 和 javascript URL 被清洗，安全正文保留 | 单测 |

### 传输预算

方法：对生产 standalone 返回的文章 HTML 提取 8 个 script 与 1 个 stylesheet，使用真实 HTTP `Accept-Encoding: gzip` 请求；保留响应线上字节并对实际响应体计算 gzip。不是构建器估算或性能承诺。

| 指标 | 实测 | 预算差异 |
| --- | ---: | --- |
| 必要 JavaScript | 178358 B = 174.18 KiB gzip | 超 80 KiB 目标 94.18 KiB，未通过 |
| 首屏必要传输 | 181537 B = 177.28 KiB | 低于 800 KiB 预算 622.72 KiB，通过 |
| HTML | 2627 B gzip 传输 | 计入首屏 |
| CSS | 552 B identity 传输 | 计入首屏 |
| 字体 / 图片 | 0 请求、0 B | 系统字体、无图样本；不代表真实素材已验证 |

相较修复前，必要 JS 减少 31 B（0.03 KiB），首屏必要传输减少 26 B（0.03 KiB）；预算通过/失败结论不变。

## 未验证与限制

Docker daemon 不可用，未构建镜像或运行 Compose；保留的 Dockerfile/compose 仅为待验证配置。未执行真实身份/会话、主人授权、私密附件、搜索/CDN 缓存、真机 Safari、真实字体/图片、Web Vitals、独立评审、CI 或生产发布。所有私密材料均为合成 canary，不能据此宣称完整安全验收。

## 对后续任务的影响

- ENGINE 可复用精确版本和命令模式，但必须遵守 CONTENT/SECURITY 的正式协议，不把 PoC 字段或 404 隔离当成最终身份方案。
- 保留纯服务端 Markdown 解析与固定内部 API 地址；Next 不扫描私密目录，不增加第二套业务权限。
- standalone 构建必须复制 `.next/static`/`public`，并验证 workspace 代码实际进入服务端 chunk；不要硬编码本次 chunk hash。
- JS 差距需要 ENGINE/QA 继续分解测量或形成明确预算例外，不能删除断言、隐瞒失败或默认 Next 必然满足 80 KiB。

完整文件清单、复现命令、风险和容器注意点见 `experiments/ARCH-001/handoff.md`。
