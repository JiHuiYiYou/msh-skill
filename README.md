<div align="center">

# msh-skill

### 名师汇出国 自动化工具集

**错题分析 + 单词听写自动化**

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#)
[![Browser](https://img.shields.io/badge/browser-Edge%20%7C%20Chrome-blue)](#)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-purple)](#)

</div>

---

---

## 给 agent 装（最省事）

把仓库 URL 丢给任意 agent（Claude Code / Cursor / Codex / Cline 等），说一句 "装这个 skill"，agent 会自己识别 SKILL.md 格式并跑 `npx skills add`。

或者直接复制下面这段贴给 agent：

```
这个仓库 https://github.com/JiHuiYiYou/msh-skill 是一个 Claude Code skill，
仓库根目录的 SKILL.md 是 skill 入口（name: msh-exam-analysis）。
请用 `npx skills add JiHuiYiYou/msh-skill@msh-exam-analysis -g -y` 装上。
```

装完开新 session，说"错题分析"或"单词听写"即可触发。

### 手动安装

```bash
npm install -g @playwright/cli
cp -r msh-skill ~/.claude/skills/
```

## 更新

一行命令，自动从 GitHub 拉最新版：

```bash
npx skills update msh-exam-analysis -g -y
```

一键更新所有已装的 skill：

```bash
npx skills upgrade -g -y
```

只要当初用 `npx skills add ...` 装的，`skills` CLI 会自动记来源仓库，直接 `update` 就能升级，不用配 git / 代理。

## 两个功能

### 1. 模考错题分析（`SKILL.md`）

从 `mingshihuichuguo.com/homework/student/<id>` 抓模考错题，按"手写版"人味风格产出阅读/听力分析 txt。

### 2. 单词测试自动化（`run_v5.js`）

自动完成 `homework-submission-items?homework_id=<id>` 的单词"混合测试"（听音译中 + 看词译中）。用法见 `SKILL.md` 功能二。

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
