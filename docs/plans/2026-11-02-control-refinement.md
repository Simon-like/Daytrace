# UI-002 控件与方向性动效实施计划

**目标：** 改善按钮、搜索框、下拉框的质感，消除归档连续分割线的拥挤感，并增加克制的淡入与左右滑动。

**架构：** 保持 React／Tailwind／Radix 与现有数据状态，不引入依赖。视觉在本地组件与归档／搜索样式内完成，动效复用全局 token 和单容器 CSS keyframes。

**技术栈：** Next.js 16、React 19、Tailwind CSS 4、Radix Select、Playwright。

## 设计基准

- 色彩沿用纸张 `#f4f4ed`、档案绿 `#243128`、正文 `#202720`、灰绿 `#667065`、鼠尾草 `#e7ebe1`、修订色 `#93634f`。
- 标题继续宋体，控件使用系统无衬线，日期和元数据使用等宽字体；不以换字体制造“设计感”。
- 签名元素是轻量“档案索引签”筛选区：浅纸面、10–12px 圆角、明确内部留白，取代第三条连续分割线。
- 控件保持 44–48px 触控高度；焦点用 2px 修订色外线，hover 不只依赖颜色。

### 1. 本地控件

- [ ] Button：primary／secondary／ghost 三层，10px 圆角，轻微静态投影、按压 `scale(.98)`、disabled 与焦点完整。
- [ ] Input：柔和纸面、清晰 hover／focus，搜索框左侧搜索图标与独立清除按钮，不出现浏览器原生装饰。
- [ ] Select：与 Input 同高同圆角；弹出层增加留白、圆角和轻阴影，选项高亮与选中指示更明确。
- [ ] 浏览器断言控件 radius／height／focus，以及 Select 键盘选择不回归。

### 2. 归档节奏

- [ ] 移除 caption 和 form 的重复 border-bottom；筛选区使用浅色索引签容器与稳定 padding。
- [ ] 记录列表保留每条记录一条分隔线，桌面 32px 左右行距、移动端 24px，不改变栅格和内容。
- [ ] 验证 320、390、768、1440 无整页横溢出并保存截图。

### 3. 方向性动效

- [ ] `.motion-region` 使用 `opacity + translateX(8px→0)`，标签展开使用 `motion-region-left` 的 `-8px→0`。
- [ ] Select 进入／退出保留 200／140ms，增加轻微水平方向；不逐项 stagger，不延迟内容和焦点。
- [ ] 减少动态效果继续由全局规则取消所有动画；浏览器检查 animationName、键盘和重复操作。

### 4. 验收与交付

- [ ] 执行 `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm build`。
- [ ] 执行完整浏览器验收、56 视口与动效性能脚本，复核归档和搜索桌面／移动截图。
- [ ] 据实记录正文脚本预算与真机边界，停止临时服务器，交付 `.local/worktrees/UI-002` 预览。

不自动 commit／push，不修改 API、内容、权限或生产配置。
