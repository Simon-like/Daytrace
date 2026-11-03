# 有迹 · Daytrace

让经历有迹可循。Next.js + NestJS 的个人知识与生活站点。

```sh
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

一键启动桌面、独立 H5 和 API：

- 桌面：http://127.0.0.1:3000
- H5：http://127.0.0.1:3002/h5/
- 主站 H5 代理：http://127.0.0.1:3000/h5/

按 `Ctrl+C` 同时停止三个服务。自定义端口使用 `pnpm dev -- --port 7100 --h5-port 7102`；只启动 H5 使用 `pnpm dev:h5`。完整命令表见[本地开发手册](docs/development/local-dev.md)。

只需要桌面生产构建 Demo 时运行 `pnpm demo`。当前使用合成内容和演示身份，运行边界见[Demo手册](docs/development/demo.md)。

- **找文档**：[docs目录](docs/README.md)。
- **Kimi / Codex接手**：[AGENTS.md](AGENTS.md) → [当前工作](docs/context/当前工作上下文.md) → [协作协议](docs/collaboration/README.md)。
- **看进度与证据**：[项目进度](docs/project/项目进度.md)、[Demo验收](docs/project/reports/DEMO-001.md)。

源码在apps/packages，素材在design，可执行部署在ops，实验代码在experiments；所有项目说明、任务、知识和运行手册集中docs。站点Markdown及合成fixture是内容数据，不属于项目文档。

```sh
python3 scripts/task_claim.py status
pnpm docs:validate
```
