---
name: msh-exam-analysis
description: 模考错题分析（名师汇出国 / mingshihuichuguo.com）。用户必须提供 mingshihuichuguo.com/homework/student/<id> 网址（如 https://mingshihuichuguo.com/homework/student/10833），skill 按"手写版"人味风格产出阅读/听力错题分析 txt 到桌面。粘贴错题内容不触发。When the user mentions 错题分析 / 模考 / pastes a mingshihuichuguo URL, use this skill.
type: project
---

# MSH 模考错题分析

针对 **mingshihuichuguo.com/homework/student/<id>** 的模考作业，按学生
本人手写习惯输出**两份**错题分析 txt 到桌面：
- `阅读.txt`
- `听力.txt`

只写阅读和听力。写作 / 口语不在范围内（用户不要求）。


## 触发

- "做一下模考错题分析" + 给 URL
- "分析一下这次的错题" + 给 URL
- 直接粘贴 `https://mingshihuichuguo.com/homework/student/<id>` 网址

**注意：粘贴错题内容（不含 URL）不触发**，必须给完整 URL。


## 开始前必问

skill 触发后第一件事——**先问清楚再动手**，禁止直接抓数据。

### Step 1：环境探测（自动，**不要问用户 OS**）

#### OS 探测

跑：
```bash
uname -s
```

判定（包含匹配）：
- `MINGW*` / `MSYS*` / `*_NT-*` → `windows`
- `Darwin` → `macos`
- `Linux` → `linux`

`uname` 不可用（罕见）→ fallback `node -e "console.log(process.platform)"`，结果 `win32` / `darwin` / `linux` 直接用。

记下来，后续步骤按这个走分支。

#### 浏览器探测

按探测到的 OS 跑：

- **Windows**（MSYS bash / PowerShell）：
  ```bash
  command -v msedge   # Edge
  command -v chrome    # Chrome
  ```
  Edge / Chrome 在 Windows 一般不在 PATH，找不到时 fallback 探常见路径：
  ```bash
  ls "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" 2>/dev/null
  ls "C:/Program Files/Microsoft/Edge/Application/msedge.exe" 2>/dev/null
  ls "C:/Program Files/Google/Chrome/Application/chrome.exe" 2>/dev/null
  ```

- **macOS**：
  ```bash
  ls "/Applications/Microsoft Edge.app" 2>/dev/null
  ls "/Applications/Google Chrome.app" 2>/dev/null
  ```

- **Linux**：
  ```bash
  command -v msedge
  command -v microsoft-edge
  command -v microsoft-edge-stable
  command -v google-chrome
  command -v google-chrome-stable
  ```
  哪个返回非空就是装哪个。

#### 判定浏览器

- **两个都有** → 用 AskUserQuestion 单问题问用户用哪个
- **只有一个有** → 自动选那个，告知用户："检测到 Edge，已选用"
- **都没有** → 告知用户装一个，退出

只有"两个都有"才调 AskUserQuestion：
```json
{
  "questions": [
    {
      "question": "用哪个浏览器抓数据？两个都装好了。",
      "header": "Browser",
      "options": [
        {"label": "Edge",   "description": "系统已装"},
        {"label": "Chrome", "description": "系统已装"}
      ],
      "multiSelect": false
    }
  ]
}
```

### Step 2：URL 校验（自然语言追问，不用 AskUserQuestion）

用户消息里没有 mingshihuichuguo.com 网址，或网址不符合 `homework/student/<id>` 格式，**用自然语言追问一次**：

> "请粘贴完整的 mingshihuichuguo.com 作业链接，格式：`https://mingshihuichuguo.com/homework/student/<数字>`"

合法 URL：
- `https://mingshihuichuguo.com/homework/student/10833`
- `http://mingshihuichuguo.com/homework/student/10833`（http 也接受）

非法（追问一次，第二次还错 → 礼貌拒绝并退出 skill）：
- 域名不是 mingshihuichuguo.com
- 路径不是 `/homework/student/<纯数字>`
- 缺 student id

**Step 1 + Step 2 都完成后才进"流程"。**


## 环境检查与自动补装

进"流程"前先检查依赖，缺的自动补：

### 检查 1：playwright-cli

- 跑 `npx playwright-cli --version` 或 `which playwright-cli` 检测
- 不在 → **自动跑** `npm install -g @playwright/cli`，跑完再 --version 一次确认
- 装失败 → npm 报错多半是 Node.js 没装或 PATH 不对，提示用户：
  > "playwright-cli 装失败，大概率是 Node.js 没装或版本太旧。去 https://nodejs.org/ 下个 18+ 的 LTS 装上再来。"

### 检查 2：cli.config.json

按 Step 1 选的浏览器，写默认配置（OS 感知路径）：

- Windows: `%USERPROFILE%\.playwright\cli.config.json`
- macOS / Linux: `~/.playwright/cli.config.json`

内容（按用户选的浏览器二选一）：

```json
{"browser": {"browserName": "msedge"}}   // Edge
{"browser": {"browserName": "chrome"}}   // Chrome
```

文件已存在 → **不覆盖**（保留用户已有配置）。

### 检查 3：浏览器本身

Edge / Chrome 必须系统装了才能 attach CDP。skill 不自动装（要用户授权）：
- 缺 Edge: 引导去 https://www.microsoft.com/edge
- 缺 Chrome: 引导去 https://www.google.com/chrome
- 装哪 / 怎么启 → 见 `references/数据获取.md` step 1

**全部检查通过才进"流程"。**


## 流程

### 1. 拿数据

参考 `references/数据获取.md`：
- 用户已登录的情况下：用 playwright-cli attach 用户的浏览器（CDP 9222）
- 用户没登录：让用户先登录，或者把内容粘贴成文件
- 拿到每道错题的：题号 / 类型 / 题干 / 4 选项 / 学生答案 / 正确答案 / 原文

### 2. 写报告

**输出位置**（用户桌面）：
```
~/Desktop/阅读.txt
~/Desktop/听力.txt
```

**只分析错的题**。对的题不写，不总结"对了几道/错了哪几道"。

### 3. 收尾

告诉用户两个文件路径。


## 风格硬要求（不达标 = 重写）

完整对照见 `references/style-guide.md`。最关键的几条：

1. **不要大段原文**。最多贴 1-2 句关键引文，长文只写一句摘要。
2. **只分析错的那一项**。不写 A→B→C→D 全覆盖。
3. **表述口语化**。"脑子一抽就想到..."、"被 X 带跑了"、"只听到 X 后面没注意"。
4. **生词随便一点**。一行一个，词 + 中文意思就行，不写音标不写三栏。
5. **不用人类打不出的符号**。避开 → ✔ ✘ ─ 【】 ■ 这种。空行和标点就够了。
6. **少用 `/`**。除了写网络短语可以接受，其它地方别堆 `/`。
7. **填词题只要简短中文翻译**，不需要完整答案，不需要抄题目。
8. **不写正确率 / 错了几个**。
9. **文件名越简单越好**（`阅读.txt`，别带"第五次模考-真题16-"这种长前缀）。
10. **不抄题**。题干用自己话说出来，不复制粘贴原题文字。

## 题型处理

### 词汇填空

- 一句错因（怎么填错的 / 应该是哪个）
- 简短中文翻译（每段一两句意译，不用逐句雕琢）
- 生词一行一个：词 + 中文

**不要**：完整答案列表、抄题目、原文整段贴、生词三栏字典。

### 阅读（生活类 / 学术类）

- 一句错因（口语化）
- 只写错的那个选项的判断 + 1-2 句为什么
- 学术类可以加一句"主旨"和"框架"，但要短
- 不写长段引文

### 听并回应

- 原文只写 prompt 那一行
- 一句错因
- 只写错的那个选项的判断

### 对话 / 讲座 / 公告

- 原文只写一句中文摘要 + 1-2 句关键引文（不贴整段 transcript）
- 题干自己说一遍，不抄
- 一句错因
- 只写错的那个选项


## 关联资源

- `references/style-guide.md` — 风格正反例
- `references/数据获取.md` — 拿 URL → 抓数据的流程
- `references/模板对照.md` — 同一道题，手写版 vs AI 版的对比
- `手写错题分析/` — 5 份原始手写样本
