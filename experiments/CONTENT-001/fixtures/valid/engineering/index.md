---
schemaVersion: 1
id: rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111
type: engineering
title: 合成样本：微前端路由排查
slug: microfrontend-practice
oldSlugs: [micro-frontend-routing]
occurredOn: 2026-10-28
updatedAt: "2026-10-29T09:30:00+08:00"
revision: 2
tags: [微前端, 路由]
summary: 仅用于契约验证的合成技术记录，不代表真实经历。
status: published
visibility: public
attachments: []
---

## 问题入口

这是合成样本。主子应用切换后，需要分别确认 `registerMicroApps` 配置与实际路由。

## 验证路径

```ts
const verified = true;
```

只记录已验证路径，不把示例标记为真实生产经验。

### 后续补充

2026-10-29：补充一条用于目录与 HTML 同次解析检查的标题。
