# SHARE-001：公开分享与双端阅读偏好报告

日期：2026-11-04。范围：F4 公开 RSS／sitemap、规范分享元数据、本地中文分享卡与双端正文偏好；不包含暗色模式、真实社交爬虫、真实 iPhone/Safari、生产发布或性能预算验收。

## 交付结果

- `beb4f2d`：公开读取按每页最多 50 条沿 `nextCursor` 遍历，重复游标按契约错误失败。新增 RSS 2.0、sitemap、robots 和双端 canonical／Open Graph／Twitter 元数据；8 篇公开示例全部出现，私密、草稿、主人页和 H5 别名不进入公开聚合。
- `634eeaf`：新增 1200×630 本地 PNG 分享卡，复用公开详情，采用纸张／档案绿风格和完整 Noto Sans SC 静态 400 字重实例。私密、草稿和未知 ID 返回完全相同的通用卡及通用 OG 标题，不泄露私密标题或记录存在性。字体许可证随资产保存。
- `80b069b`：桌面与 H5 增加标准／较大／特大三档正文偏好，同源 `localStorage` 键为 `daytrace.readingFontSize.v1`。刷新和跨端恢复、非法值回退、存储禁用回退、键盘及 `aria-pressed` 均有覆盖；桌面为 17.2／19.2／21.2px，H5 为 17／19／21px。

以上提交均已推送 `dev`，未合并 `main`、未部署。范围计划与认领文档为 `db9758b`。F1—F4 的功能开发范围至此闭合，但这不等于 QA-001、RELEASE-001 或生产验收完成。

## 实际验证

| 验证 | 结果 |
| --- | --- |
| 单元测试 | 62／62，通过；含公开游标、XML 转义、偏好解析与存储异常 |
| HTTP 与 Demo 集成 | 12＋14＋5，通过；既有权限、会话与公开投影不回归 |
| 内容管理 | 11／11，通过 |
| 桌面 Chromium | 22 条用户路径、56 组视口通过，脚本错误 0；含 RSS／sitemap 负例、PNG 和偏好恢复；[证据](../evidence/SHARE-001/browser-results.json) |
| H5 Chromium | 6 组检查、28 组布局通过，脚本错误 0；含同源跨端偏好、17／19／21px 和 390／430px 特大字号；[证据](../evidence/SHARE-001/h5/browser-results.json) |
| 分享图视觉检查 | 实际读取 1200×630 PNG，中文标题、类型、日期与品牌完整可读；[证据](../evidence/SHARE-001/share-public.png) |
| lint / typecheck / build / docs | 全部通过；桌面、H5 与 API 生产构建成功，文档检查 212 份无错误 |
| GitHub Actions | 最新功能提交 `80b069b33a8f80c0ad0b44699a95a4961ed7621d` 的 CI 运行 `41687143244` 已完成且结论为 success；[运行证据](../evidence/SHARE-001/ci-run.json) |

本机执行使用 Node 24.22.1，对项目声明的 24.18.0 仅有 pnpm engine warning。Chromium 视口不是 iPhone 或 Safari；演示记录和主人身份均为合成数据。

## 开发中发现并修复的问题

- robots 初版被静态化，运行时 `PUBLIC_ORIGIN` 不正确；改为动态路由后通过实际端口验证。
- 详情页自己的 canonical 会覆盖根布局 RSS alternate；在双端详情元数据中显式保留 RSS 后通过。
- 可变 Noto Sans SC 在当前图片渲染管线失败；用 fontTools 实例化完整 400 字重静态字体，保留 30890 个 cmap 映射，未按示例标题裁剪，PNG 复测成功。
- 根 UI 入口初版让阅读页必要脚本升至 175363 gzip bytes；改为精确的控件／偏好子路径导入后降至 142838，功能仍通过。

## 尚未通过的外部门槛

- 真实 Auth0 账户、真实 iPhone／Safari、真实社交爬虫、生产 HTTPS／CDN、备份恢复和生产回滚仍无验收证据。
- 桌面阅读页必要脚本 gzip 为 142838 bytes，仍高于 81920 bytes 初始预算；功能与 CI 通过不等于性能预算通过。UI-002 的 Select 52ms 长事件也继续 blocked。

下一步进入独立 QA-001：按完整 PRD 的 18 组 AC／NFR 和真实设备清单逐项验收，再决定 RELEASE-001 的部署、备份恢复与回滚工作。
