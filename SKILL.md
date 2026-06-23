---
name: msh-exam-analysis
description: 模考错题分析（名师汇出国 / mingshihuichuguo.com）。用户必须提供 mingshihuichuguo.com/homework/student/<id> 网址（如 https://mingshihuichuguo.com/homework/student/10833），skill 按"手写版"人味风格产出阅读/听力错题分析 txt 到桌面。粘贴错题内容不触发。When the user mentions 错题分析 / 模考 / pastes a mingshihuichuguo URL, use this skill.
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


## 速度原则（压时间核心）

1. **少 dialog**：浏览器探测结果 / 重启确认都缓存到 `~/.msh-skill-state.json`，下次不重复问
2. **少 click**：用 `eval` 一次拿整段 innerText，不逐题 snapshot
3. **少 sleep**：sleep 2 改 sleep 1；能并行的 bash 命令并一行
4. **少 round trip**：section 切换后立刻一个 eval 拿全部，不分题 click

目标：10 分钟内完成（含浏览器重启等待 ≤ 8s）。


## 硬禁令（违反 = 重做）

- ❌ **不准用 `playwright-cli snapshot`**——会落盘 yml、跨进程 ref 失效、消耗 1-2s/次。**一律用 `eval`**
- ❌ **不准逐题 `playwright-cli click "e<NNN>"`**——逐题 click 是惯性陷阱，每个 click 1-2s + 等 DOM 1s = 3s/题，15 道题 45s 起步
- ❌ **不准用 `tab-select`**——跨进程 ref 不稳，**用 eval 找带 `/homework/student/` 的 a 标签 click**
- ❌ **不准 sleep 2/sleep 4**——sleep 1 足够；能并行的 bash 并一行

**怎么知道刚才走错路了**：
- 跑了 5 次以上 `playwright-cli --s=default click` → 走错路，回去重抓
- 跑了任何一次 `playwright-cli --s=default snapshot` → 立刻停，回去换 eval
- 写了 `playwright-cli tab-select` → 删掉，换 eval 找链接


## 抓取模板（直接复制，4 段就够）

下面 4 段 eval 代码覆盖 90% 工作流。**先复制，再按需改**。

### T1：找作业详情 tab 并点进去

```bash
playwright-cli --s=default eval "() => {
  const a = document.querySelector('a[href*=\"/homework/student/\"]');
  if (a) { a.click(); return 'clicked: ' + a.href; }
  return 'not found, current: ' + location.href;
}"
```

### T2：切 section 按钮

```bash
playwright-cli --s=default eval "() => {
  const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '阅读M1');
  if (b) { b.click(); return 'clicked 阅读M1'; }
  return 'not found';
}"
```

把 `'阅读M1'` 换 `'阅读M2' / '听力M1' / '听力M2' / '答题解析'` 都行。

### T3：拿当前 section 错题列表（无 click）

```bash
playwright-cli --s=default eval "() => {
  const items = Array.from(document.querySelectorAll('div'))
    .filter(d => /^\(\d+\)\s*[✓✗]$/.test(d.textContent.trim().replace(/\s+/g, '')))
    .filter(d => !d.querySelector('div'));
  const seen = new Set();
  return items.map(d => {
    const m = d.textContent.match(/\((\d+)\)\s*([✓✗])/);
    return m ? {n: +m[1], wrong: m[2] === '✗'} : null;
  }).filter(Boolean).filter(i => seen.has(i.n) ? false : (seen.add(i.n), true));
}"
```

返回 `[{n:1, wrong:true}, ...]`。**这次 eval 不点任何东西**，纯读。

### T4：一次性 click 全部错题 + 收集右栏 innerText

```bash
playwright-cli --s=default eval "(wrongNums) => new Promise(async resolve => {
  const results = {};
  const allItems = Array.from(document.querySelectorAll('div'))
    .filter(d => /^\(\d+\)\s*[✓✗]$/.test(d.textContent.trim().replace(/\s+/g, '')))
    .filter(d => !d.querySelector('div'));
  for (const n of wrongNums) {
    const item = allItems.find(d => d.textContent.includes('(' + n + ')'));
    if (!item) { results[n] = 'NOT FOUND'; continue; }
    item.click();
    await new Promise(r => setTimeout(r, 400));
    const detail = document.body.innerText;
    const start = detail.search(/(题目前引导|题干|得分)/);
    let end = detail.length;
    const nextMatch = detail.slice(start + 50).match(/\n\(\d+\)\s*[✓✗]/);
    if (nextMatch) end = start + 50 + nextMatch.index;
    results[n] = detail.slice(start, end);
  }
  resolve(results);
})" '[1,8,17]'
```

调用方式：`'<上面整段代码>' '[1,8,17]'` —— 外层引号包代码，第二个参数是 JSON 数组字符串。

### T5（听力专用）：一次性触发所有"原文" popover 拿 transcript

```bash
playwright-cli --s=default eval "(wrongNums) => new Promise(async resolve => {
  const tr = {};
  const allItems = Array.from(document.querySelectorAll('div'))
    .filter(d => /^\(\d+\)\s*[✓✗]$/.test(d.textContent.trim().replace(/\s+/g, '')))
    .filter(d => !d.querySelector('div'));
  for (const n of wrongNums) {
    const item = allItems.find(d => d.textContent.includes('(' + n + ')'));
    item.click();
    await new Promise(r => setTimeout(r, 400));
    const btn = Array.from(document.querySelectorAll('button, div, span'))
      .find(e => e.textContent.trim() === '原文' && e.children.length === 0);
    if (btn) {
      btn.scrollIntoView({block: 'center'});
      btn.click();
      await new Promise(r => setTimeout(r, 300));
      const pop = Array.from(document.querySelectorAll('.el-popover'))
        .find(p => getComputedStyle(p).display !== 'none' && p.offsetHeight > 0);
      tr[n] = pop ? pop.innerText : '(no popover)';
    } else {
      tr[n] = '(no 原文 btn)';
    }
  }
  resolve(tr);
})" '[5,14,26,27]'
```

### 模板使用顺序（每个 section 都走这一遍）

```
T2 切 section →  T3 拿错题列表 →  T4 拿右栏 innerText →  T5 拿 transcript（仅听力）
```

4 个 section 一共 4 × (1 T2 + 1 T3 + 1 T4 + 0/1 T5) = 12-16 次 eval，**0 次 click，0 次 snapshot**。


## 准备工作（快进模式）

### Step 0：URL 校验（一次正则）

从用户消息里抽 `homework/student/(\d+)`，抽不到就**自然语言追问一次**：

> "请粘贴完整的 mingshihuichuguo.com 作业链接，格式：`https://mingshihuichuguo.com/homework/student/<数字>`"

合法：https / http 都行，纯数字 id。追问第二次还错就退出。

### Step 1：读缓存 `~/.msh-skill-state.json`

文件不存在就跳过这一步。文件存在则读 `{browser, lastRestartAck}`：
- 缓存的浏览器二进制还在 → 直接用，**不探测不询问**
- 缓存的浏览器二进制不在了 → 走 Step 2 探测

### Step 2：环境探测（仅缓存缺失时跑）

OS：`uname -s`（失败 fallback `node -e "console.log(process.platform)"`）。

浏览器探测按 OS 走（只跑**第一个找到的**两个就停）：
- Windows：依次 `ls` Edge/Chrome 常见安装路径
  ```bash
  ls "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" 2>/dev/null
  ls "C:/Program Files/Microsoft/Edge/Application/msedge.exe" 2>/dev/null
  ls "C:/Program Files/Google/Chrome/Application/chrome.exe" 2>/dev/null
  ```
- macOS：`ls /Applications/Microsoft Edge.app /Applications/Google Chrome.app`
- Linux：`which msedge microsoft-edge google-chrome google-chrome-stable`

判定：
- **两个都有** → 一次 AskUserQuestion 问；回答后写缓存
- **只有一个** → 自动选，写缓存
- **都没有** → 退出，引导用户装

### Step 3：依赖 & CDP 端口检查（一次性 bash）

```bash
npx playwright-cli --version
ls "$USERPROFILE/.playwright/cli.config.json" 2>/dev/null
curl -s --max-time 2 http://127.0.0.1:9222/json/version
```

- playwright-cli 不在 → `npm install -g @playwright/cli`（**只这一次**）
- cli.config.json 不在 → 按浏览器写一份（已存在不覆盖）
- 9222 端口不活 → 见 `references/数据获取.md` 重启浏览器

### Step 4：写缓存

跑完跑一次：
```bash
node -e "require('fs').writeFileSync(require('os').homedir()+'/.msh-skill-state.json', JSON.stringify({browser:'msedge',lastRestartAck:new Date().toISOString()},null,2))"
```

替换 `msedge` 为实际浏览器名。

### 重启浏览器的确认

只在**第一次**（缓存里没 `lastRestartAck`）问一次：

> "要附加到 Edge 抓数据，需要带 --remote-debugging-port=9222 重启 Edge。会杀掉所有 Edge 进程（未保存 tab/表单会丢），重启后会恢复 tab 和登录态。"

确认后跑一次；**之后同会话内不重复问**。下次有缓存直接跳过。


## 流程

### 1. 拿数据（核心优化点）

参考 `references/数据获取.md` 的"快进抓取"小节：
- attach playwright-cli 一次
- 每个 section 切进去后，**一发 eval 拿整段右栏 innerText**
- 听力题的 transcript **一次性循环触发所有 "原文" popover** 再 innerText 拿全
- 错题列表 / 题干 / 选项 / 学生答案 / 正确答案 都在 innerText 里

### 2. 写报告

**输出位置**（用户桌面）：
```
~/Desktop/阅读.txt
~/Desktop/听力.txt
```

**只分析错的题**。对的题不写，不总结"对了几道/错了哪几道"。

### 3. 收尾

告诉用户两个文件路径（**仅此一句**，别复述做了什么）。


## Self-check（写报告前必过）

写报告前**先 bash 数一次**这次跑的 playwright-cli 命令分布：

```bash
# bash 历史可能没用，改用：scan 之前所有调用的命令记录
# 简化：自己数一下
echo "playwright-cli click count: <自己数>"
echo "playwright-cli snapshot count: <自己数>"
echo "playwright-cli tab-select count: <自己数>"
```

**过线标准**：
- `playwright-cli --s=default click` 调用次数 ≤ 4（最多 4 个 section 各 1 次 T2 切 section）
- `playwright-cli --s=default snapshot` = 0
- `playwright-cli --s=default tab-select` = 0

**任意一项超线 = 回去重抓**。问自己：
- click 超过 4 次 → 用了 T4 模板没？没用回去用
- snapshot > 0 → 立刻删 snapshot 那次，回去换 eval
- tab-select > 0 → 改 T1 eval 找链接

写完报告再 grep 一次桌面文件长度（`wc -l` 两份），过短说明数据没抓全。


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
- `references/数据获取.md` — 拿 URL → 抓数据的流程（含快进抓取代码段）
- `references/模板对照.md` — 同一道题，手写版 vs AI 版的对比
- `手写错题分析/` — 5 份原始手写样本
