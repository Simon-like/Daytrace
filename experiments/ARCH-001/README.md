# ARCH-001：Next.js / NestJS 可运行验证样本

日期：2026-10-30。性质：独立 PoC，不是正式站点、生产身份方案或真实个人内容。

## 运行

前提：Node.js `24.22.1`、npm。无需全局 pnpm 或 Corepack；依赖和 pnpm store 均留在本目录。

```bash
cd experiments/ARCH-001
./scripts/bootstrap.sh
./scripts/pnpm.sh verify
./scripts/pnpm.sh start
```

打开 `http://127.0.0.1:4100/records/public-arch-sample`，用 `Ctrl+C` 同时停止两个服务。`bootstrap.sh` 在项目私有 `.tools` 安装 pnpm `11.23.0`，随后执行 frozen lockfile 安装；`.tools`、`.pnpm-store`、`node_modules` 和构建目录不提交。

`.npmrc` 固定使用官方 HTTPS registry，锁文件仅保存 integrity 解析记录，不再硬编码旧内网 HTTP tarball URL。若需重建锁文件，必须同时移除旧锁和各 workspace `node_modules`，再用 `./scripts/pnpm.sh install --registry=https://registry.npmjs.org/ --store-dir .pnpm-store` 全量解析；只改 registry 或只删锁文件可能沿用旧状态。

单步命令：

```bash
./scripts/pnpm.sh typecheck
./scripts/pnpm.sh test:unit
./scripts/pnpm.sh build
./scripts/pnpm.sh test:integration
./scripts/pnpm.sh peers check
node scripts/capture-versions.mjs
```

## 验证范围

- Nest 只从 `content/public` 读取公开文章；Markdown 在服务端解析并清洗。
- Next App Router 以固定内部 API 地址做运行时 SSR，响应经共享运行时契约校验。
- 合成私密 canary 对 API、SSR、客户端静态产物和 standalone 均做负向检查。
- 非法日期返回 `CONTENT_INVALID`，含文件、字段和 `requestId`，不返回内部堆栈。
- standalone 启动真实页面，共享契约以 `bundled-server-chunk` 形式进入服务端产物；静态资源由脚本复制。
- 预算通过生产 standalone 的真实 HTTP 响应测量，脚本同时记录 gzip 与线上传输字节。

## 最终结果

- 6 个单元测试通过；8 组端到端检查通过；peer 依赖无冲突；清空 pnpm、store、依赖和构建产物后的 frozen 安装与供应链策略检查通过。
- 必要 JS：`178358 B = 174.18 KiB gzip`，**未达到** 80 KiB 目标，超出 94.18 KiB。
- 首屏传输：`181537 B = 177.28 KiB`，达到 800 KiB 预算，余量 622.72 KiB。
- 样本使用系统字体且无正文图片，因此字体/图片均为 0 请求、0 B；这不等于真实字体和图片优化已验收。

原始结果见 `evidence/integration.json`、`evidence/standalone-manifest.json`、`evidence/version-matrix.json`。完整风险与后续注意点见 `handoff.md`。

## 容器

`Dockerfile.site`、`Dockerfile.api`、`compose.yaml` 是待验证配置。本机 Docker daemon 不可用，未构建镜像、未运行 Compose，不能声称容器通过。
