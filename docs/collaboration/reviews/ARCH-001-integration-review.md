# ARCH-001 集成评审

评审者：kimi-integration。日期：2026-10-30。范围：任务分支文件边界、交接证据及合并后的主工作区复测。

- 文件仅位于 `experiments/ARCH-001/` 与 `docs/project/reports/ARCH-001.md`。
- 首次集成复测发现 103 个混合 registry tarball 条目触发 pnpm 供应链校验，退回修复；未放宽安全策略。
- 修复合并后删除实验依赖与构建产物，执行 `./scripts/bootstrap.sh && ./scripts/pnpm.sh verify`：frozen 干净安装、peer、类型检查、6 项单测、双端构建、8 组集成检查全部通过。
- 公开 SSR、共享运行时契约、standalone、私密 404、错误定位和公开产物 canary 扫描均有真实进程证据。
- 必要 JS 174.18 KiB gzip，80 KiB 预算未达标；首屏总传输 177.28 KiB 达标。该差距显式保留给 ENGINE/QA，不静默提高预算。
- Docker、真实身份、iPhone、生产未验证；实验通过不冒充正式产品验收。

结论：ARCH-001 的固定路线验证与风险交接目标完成，可登记 done；JS 预算问题继续阻断对应正式 NFR 通过。
