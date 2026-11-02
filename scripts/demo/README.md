# 有迹全栈演示版

本机完整演示：Next生产构建 + Nest API，8篇公开Markdown、1篇私密记录和1篇私密草稿。示例文章与身份均为合成材料；麻婆豆腐照片来自项目已归档生成素材。没有读取真实content/private。

## 启动

```sh
nvm use
pnpm install --frozen-lockfile
pnpm demo
```

打开 `http://127.0.0.1:3000`。首次命令先构建Next/Nest，准备standalone，然后启动两服务；Ctrl+C同时停止。Node固定24.18.0、pnpm11.23.0，已在本机验证。原交接报告记录24.22.1，但当前环境没有此二进制，已统一nvm/CI/Docker建议版本为实际可用版本；不改写历史报告。

已有构建时可 `pnpm demo --skip-build`。指定其他端口：

```sh
pnpm demo --port 3010 --api-port 3011
```

## 可以演示什么

首页三个分类 → 归档类别/标签筛选 → 正文与目录 → 代码复制或菜谱图片查看 → 返回恢复筛选；查找“微前端”“豆腐”；查看随想与关于。窄屏通过顶部菜单导航。

“只留给自己” → “进入演示主人空间” → 私密记录/草稿 → 退出。演示身份只在显式DAYTRACE_DEMO、非production、回环监听和固定演示内容目录下启用；API使用test环境与隔离内存会话，站点本身为Next生产构建。普通开发/CI生产模式不会自动启用演示登录。重启演示会使演示会话失效。

不要把这种无需真实账号的演示身份接到真实数据或公网。真实OIDC接入仍是未完成项，不能把此命令用于正式生产发布。

## 校验

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm content:validate:demo
```

真实浏览器检查：另一个终端保持Demo运行，再执行：

```sh
pnpm exec playwright install chromium
pnpm test:browser
```

在已构建的干净CI环境，`DEMO_MANAGED_SERVER=1 pnpm test:browser`自动启动并关闭演示服务。无服务器时不会把静态源码截图冒充运行验证。端口已被使用会明确失败，不会停止未知进程。

检查结果与截图在[Demo验收报告](../../docs/project/reports/DEMO-001.md)和[浏览器记录](../../docs/project/evidence/DEMO-001/browser-results.json)。Chromium移动视口不是iPhone真机；首屏JS仍超出原80 KiB目标，真实身份/生产/恢复门槛尚未通过。
