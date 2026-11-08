# LOCAL-001 本地登录与持久化贯通

新增隔离 HTTP 集成测试：真实 Nest 应用使用合成 OIDC provider 与临时 SQLite，通过登录／回调取得会话和 CSRF，导入 Markdown 并保存私密草稿；关闭并重启应用后，同一会话可读取草稿，访客的公开与主人读取分别返回 404／401。测试结束删除临时目录。

Node 24.18.0 下新增测试通过；完整 `pnpm test:integration` 的公开 API／搜索 12、身份／SSR 16、Demo 5 项通过，`pnpm test:content` 11 项通过，lint 和项目文档检查通过。此证据覆盖同一 Nest HTTP 链路与本地磁盘重启恢复，不代表真实 Auth0 租户、浏览器登录、故障掉电耐久、备份恢复或生产验收。
