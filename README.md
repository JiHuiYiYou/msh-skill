<div align="center">

# msh-exam-analysis

### 名师汇出国模考错题分析 skill

**从 mingshihuichuguo.com 抓错题，按"手写版"人味风格产出分析报告**

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#)
[![Browser](https://img.shields.io/badge/browser-Edge%20%7C%20Chrome-blue)](#)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-skill-purple)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

[安装](#安装) · [使用](#使用) · [输出示例](#输出示例) · [项目结构](#项目结构) · [License](#license)

</div>

---

## 这是什么

一个 [Claude Code skill](https://docs.claude.com/en/docs/claude-code/skills)，针对 **mingshihuichuguo.com**（名师汇出国）的模考作业，自动抓阅读 / 听力错题数据，按"手写版"风格生成两份错题分析 txt 到桌面。

风格目标：**看起来像学生自己手抄的复习笔记，不是 AI 写的**。口语化错因、暴露思路过程、自嘲吐槽，只分析错的那个选项，不堆大段原文。

## 解决的问题

模考做完看错题时，逐题手写分析太慢；用通用 LLM 写又太"AI 味"——老师家长一眼能看出。本 skill 的目标是：**AI 抓数据 + 写，但风格像人写的**。

5 份手写样本在 `手写错题分析/` 目录，AI 输出对照样本风格生成。

## 适用场景

- 名师汇出国的模考（含阅读 M1/M2、听力 M1/M2 四个 section）
- 错题数量不限，但单次分析 ≥1 道才值得跑
- 写作 / 口语不在范围内（用户不要求）

## 安装

### 前置条件

- [Claude Code](https://claude.com/claude-code) (CLI)
- Edge 或 Chrome 浏览器
- Node.js（装 playwright-cli）
- `mingshihuichuguo.com` 账号（已登录到浏览器）

### 步骤

```bash
# 1. 装 playwright-cli
npm install -g @playwright/cli

# 2. 配置默认浏览器为 Edge
mkdir -p ~/.playwright
# Linux / macOS:
cat > ~/.playwright/cli.config.json <<'EOF'
{"browser": {"browserName": "msedge"}}
EOF
# Windows (PowerShell):
@'
{"browser": {"browserName": "msedge"}}
'@ | Out-File -Encoding utf8 ~/.playwright/cli.config.json

# 3. 复制 skill 到 Claude Code 目录
cp -r msh-skill ~/.claude/skills/
# Windows:
# xcopy /E /I msh-skill %USERPROFILE%\.claude\skills\msh-skill
```

### 验证

打开 Claude Code，说"做一下模考错题分析"，如果 skill 触发（描述里看到 `homework/student/ URL from mingshihuichuguo` 相关的判断），就装好了。

## 使用

### 触发

在 Claude Code 里说：

- "做一下模考错题分析，<URL>"
- "分析一下这次的错题，<URL>"
- 直接粘贴错题相关内容

`<URL>` 形如：`https://mingshihuichuguo.com/homework/student/11671`

### 数据获取流程

详细见 [`references/数据获取.md`](references/数据获取.md)。简单说：

1. skill 启动一个 playwright-cli 进程，attach 到用户已登录的 Edge（CDP 9222）
2. 自动切到"答题解析"标签，按 section 切到 4 个 part（阅读 M1 / M2、听力 M1 / M2）
3. 逐题抓题号、题干、4 选项、学生答案、正确答案、原文
4. 听力题点"原文"按钮抓 transcript，阅读题如果是图片则下载到 study 目录

如果用户没登录 Edge，skill 会提示先登录，或者把内容粘贴成文件。

### 风格控制

完整规范见 [`references/style-guide.md`](references/style-guide.md)。最关键的 5 条：

1. **不要大段原文**。最多贴 1-2 句关键引文。
2. **只分析错的那一项**。其它选项不写。
3. **表述口语化**。"脑子一抽就想到..."、"被 X 带跑了"。
4. **生词随便一点**。一行一个 `word 中文`，不写音标不写三栏。
5. **不用 AI 符号**。避开 → ✔ ✘ ─ 【】 ■。

## 输出示例

输出两份 txt 到 `~/Desktop/`（Windows = `C:\Users\<你>\Desktop\`）：

### `阅读.txt`

```
M1
填词

1）9/10. 错了第一个, "A vib____ period" 我没反应过来, 看到 vib 想到
diabolic/symbolic 这类 -olic 结尾的词, 就填了 olic, 整个是 vibolic 完全
不是单词. 应该是 vibrant, 词根 vibr- 是震动, 引申活泼鲜明.

翻译:
文艺复兴是欧洲14到17世纪的文化复兴时期, 文化、艺术和智识上全面复苏,
强调人文主义和个人成就.

生词:
Renaissance 文艺复兴
vibrant 充满活力的
intellectual 智识的
humanism 人本主义


M1
学术阅读
(材料: 太阳与双星系统, 4 段)

13）题: 关于太阳"此前被广泛接受的结论"最有可能是哪个.
我选 B (The Sun is part of a binary system).

错因: 我把"surprising implications for..."理解成"新发现说明太阳属于双星".
但题干锁定的就是"previously accepted"旧观点, 原文既然"新发现"是恒星普遍成对,
那"旧观点"必然是反过来的"太阳是单星". 正确答案 A 就是这个.

主旨: 新观测发现年轻恒星几乎全是双星, 挑战了"太阳是单星"的旧共识.
```

### `听力.txt`

```
M1
听并回应

3）原文: I hear that the local gym has new equipment.
我选A
听到器材脑子就想到"被放哪", 完全没意识到这是社交分享. 人家说"听说有"期待
的是"我也有兴趣要去看"那种承接. A 跑题了.


M2
讲座

14）讲座主题: tardigrade（缓步动物）的生存能力, 分三块——极端环境耐受、
cryptobiosis 机制、研究意义.

我选A
被"tardigrades were sent to the harsh realms of space"吸住, 看到"first
discovered"就套到 space 那段. 但题干问 radiation 的应用, 应该回到"radiation
therapy for cancer patients". space 那段是顺带提的另一条线.
```

## 项目结构

```
msh-skill/
├── SKILL.md                       # skill 主入口（Claude Code 读这个）
├── README.md                      # 本文件
├── LICENSE                        # MIT
├── references/
│   ├── style-guide.md             # 人味 vs AI 味详细对照 + 自检清单
│   ├── 数据获取.md                # playwright-cli 抓题流程
│   └── 模板对照.md                # 手写版 vs AI 版 vs 目标版
└── 手写错题分析/                  # 5 份原始手写样本
    ├── README.md
    ├── 听力1.txt
    ├── 听力2.txt
    ├── 阅读1.txt
    ├── 阅读2.txt
    └── 阅读3.txt
```

## 贡献

改风格前先读 `references/style-guide.md` 的"人味 vs AI 味"对照表。手写样本在 `手写错题分析/`，AI 输出对照样本风格生成。

新题型加在 `SKILL.md` 的"题型处理"小节 + `references/模板对照.md` 的"小结"表格里。

## License

[MIT](LICENSE)
# msh-skill
