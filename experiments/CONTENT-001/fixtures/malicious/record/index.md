---
schemaVersion: 1
id: rec_7d0c0f2d-8f5b-4f0e-a3a6-bbbbbbbbbbbb
type: engineering
title: 恶意 Markdown 合成样本
slug: malicious-markdown
occurredOn: null
updatedAt: "2026-10-30T08:00:00+08:00"
revision: 1
status: published
visibility: private
tags: []
attachments: []
---

## 危险输入

<script>alert("xss")</script>

[危险链接][danger]

[danger]: javascript:alert(1)
