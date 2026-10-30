---
id: rec-arch-public-001
slug: public-arch-sample
title: ARCH 公开 SSR 合成样本
date: 2026-10-30
summary: 仅用于 ARCH-001 的公开合成文章。
visibility: public
status: published
---

## 从 Markdown 到完整 HTML

PUBLIC_SSR_PARAGRAPH_7F3A 是由 Nest 解析公开 Markdown、Next 服务端渲染的合成标记。

- 正文不等待浏览器解析器。
- **共享契约**在运行时校验响应。

```ts
const route = "markdown -> Nest API -> Next SSR";
```
