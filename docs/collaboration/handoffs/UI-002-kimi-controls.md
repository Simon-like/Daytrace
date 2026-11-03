# UI-002 任务交接

| 项目 | 内容 |
| --- | --- |
| 任务ID / owner / 工具 | UI-002 / `kimi-UI-002-controls` / Kimi |
| 用户授权与范围 | 改善按钮、搜索框、下拉框与归档分割线间距，增加克制的淡入淡出和左右滑动；不改 API、内容权限或生产配置 |
| 基线 / 分支 / 提交或PR | main `1079863`，补丁带入 READER-002 及依赖；`agent/UI-002/control-refinement`；未 commit、未 push、未集成、未部署 |

## 改了什么

工作区：`.local/worktrees/UI-002`。首轮规整控件被用户认为变化不足后，第二轮已将输入与搜索按钮合成完整检索台，主按钮加入底部承托和滑动圆形箭头，Select 加入页片符号、独立箭头与分层弹出层，归档筛选改为 20px 圆角索引卡。保留键盘、减少动态效果、重复线移除与记录留白。调研见 `docs/research/2026-11-02-灵动检索控件调研.md`，无新增依赖。

完整变更与截图说明见工作区 `docs/project/reports/UI-002.md`，证据在 `docs/project/evidence/UI-002/`。

## 怎样验证

最终代码：lint 125 文件 0 问题，typecheck、build 通过；unit 43／43；integration 8＋13＋5 全通过；browser 18／18、56 视口通过；文档结构检查与 `git diff --check` 通过。已复核归档／搜索的桌面和移动截图。

性能脚本 5／6：只有 Select 在 4 倍 CPU 下出现一次 52ms observer long task，掉帧和非预期布局偏移均为 0。`forceMount` 预挂载实验导致 4 项功能失败，已回退并重新验证 18／18；不得把实验版本当成交付版本。

## 下一位怎么接

- 尚未完成或存在的风险：Select 4 倍 CPU 性能门槛未过；正文脚本 141627 gzip bytes 高于 81920 bytes；真机、跨浏览器与生产未验证。
- 下一步最具体的一件事：以 `select-cpu-4x-trace.json` 定位首次 pointerdown 的 Radix 挂载成本，保持 18 项功能测试全绿后再提交 complete。
- 当前任务保持 active，未 submit／complete。不要覆盖 UI-002、READER-002 或主 checkout 的未提交现场；回退已确认，不包含 `forceMount` 实验代码。
