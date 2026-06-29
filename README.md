<div align="center">

# msh-skill

### 名师汇出国 自动化工具集

**错题分析 + 单词听写自动化**

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#)
[![Browser](https://img.shields.io/badge/browser-Edge%20%7C%20Chrome-blue)](#)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-purple)](#)

</div>

---

## 两个功能

### 1. 模考错题分析（`SKILL.md`）

从 `mingshihuichuguo.com/homework/student/<id>` 抓模考错题，按"手写版"人味风格产出阅读/听力分析 txt。

### 2. 单词测试自动化（`run_v5.js`）

自动完成 `mingshihuichuguo.com/homework-submission-items?homework_id=<id>` 的单词"混合测试"（听音译中 + 看词译中）。

**使用**：
```bash
# 1. Edge 带调试端口启动
msedge --remote-debugging-port=9222

# 2. 登录 mingshihuichuguo.com

# 3. 连接 playwright-cli
playwright-cli attach --cdp=http://localhost:9222

# 4. 打开测试页面
playwright-cli goto "https://mingshihuichuguo.com/homework-submission-items?homework_id=<ID>"

# 5. 跑脚本
playwright-cli run-code --filename=run_v5.js

# 6. 跑完后点提交
playwright-cli snapshot  # 找提交按钮 ref
playwright-cli click eXX
```

**原理**：
- 注入 `window.Audio` 构造器 hook 抓音频题的英文单词
- 遍历 DOM 找文本题的英文单词
- 调用有道词典 API 获取中文翻译
- 通过 `getByRole('textbox').fill()` 填入答案

**踩过的坑**：
- 页面输入框是 `<textarea>` 不是 `<input>`，`querySelector('input')` 永远 null
- `addInitScript` + `page.reload()` 会触发反作弊弹窗，改用在当前页 `page.evaluate` 注入
- `page.evaluate` + `nativeInputValueSetter` 填值不会触发页面保存事件，必须用 `getByRole('textbox').fill()`

## 项目结构

```
msh-skill/
├── SKILL.md                       # skill 主入口（错题分析）
├── README.md                      # 本文件
├── run_v5.js                      # 单词测试自动化脚本
├── LICENSE                        # MIT
├── references/
│   ├── style-guide.md             # 人味 vs AI 味风格指南
│   ├── 数据获取.md                # playwright-cli 抓题流程
│   └── 模板对照.md                # 手写版 vs AI 版对照
├── scripts/                       # 辅助脚本
└── 手写错题分析/                  # 5 份手写样本
```

## License

[MIT](LICENSE)
