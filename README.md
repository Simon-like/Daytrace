# 有迹 · Daytrace

让经历有迹可循。Next.js + NestJS 的个人知识与生活站点。

```sh
nvm use
pnpm install --frozen-lockfile
pnpm demo
```

打开 http://127.0.0.1:3000 。当前使用合成内容和演示身份；运行边界见[Demo手册](docs/development/demo.md)。

- **找文档**：[docs目录](docs/README.md)。
- **Kimi / Codex接手**：[AGENTS.md](AGENTS.md) → [当前工作](docs/context/当前工作上下文.md) → [协作协议](docs/collaboration/README.md)。
- **看进度与证据**：[项目进度](docs/project/项目进度.md)、[Demo验收](docs/project/reports/DEMO-001.md)。

源码在apps/packages，素材在design，可执行部署在ops，实验代码在experiments；所有项目说明、任务、知识和运行手册集中docs。站点Markdown及合成fixture是内容数据，不属于项目文档。

```sh
python3 scripts/task_claim.py status
pnpm docs:validate
```
