// ============================================================
//  PlannerPro Today Widget — Scriptable 小组件
//  将此脚本添加到 Scriptable App，然后在 iOS 主屏幕添加小组件
// ============================================================
//  使用方法：
//  1. 在 PlannerPro 网页中点击"复制小组件数据"
//  2. 打开 Scriptable App，运行此脚本一次（自动从剪贴板导入）
//  3. 长按主屏幕 → 添加小组件 → 选择 Scriptable → 选此脚本
// ============================================================

const FILE_NAME = "plannerpro_tasks.json";
const SITE_URL = "https://ib-plan-making.netlify.app/";

// ---- 文件管理 ----
const fm = FileManager.local();
const docDir = fm.documentsDirectory();
const filePath = fm.joinPath(docDir, FILE_NAME);

function readTasks() {
  if (!fm.fileExists(filePath)) return { date: "", tasks: [] };
  try {
    return JSON.parse(fm.readString(filePath));
  } catch (e) {
    return { date: "", tasks: [] };
  }
}

function writeTasks(data) {
  fm.writeString(filePath, JSON.stringify(data));
}

// ---- 从剪贴板导入 ----
function importFromClipboard() {
  const clip = Pasteboard.paste();
  if (!clip || typeof clip !== "string") {
    showNotice("导入失败", "剪贴板为空。\n请先在 PlannerPro 中点击「复制小组件数据」。");
    return;
  }
  try {
    const data = JSON.parse(clip);
    if (!data.tasks || !Array.isArray(data.tasks)) throw new Error("格式不对");
    writeTasks(data);
    showNotice(
      "导入成功 ✓",
      `已导入 ${data.tasks.length} 项今日任务。\n\n现在可以去主屏幕添加小组件了！`
    );
  } catch (e) {
    showNotice(
      "导入失败",
      "剪贴板中没有有效的任务数据。\n请先在 PlannerPro 中点击「复制小组件数据」。"
    );
  }
}

function showNotice(title, msg) {
  const a = new Alert();
  a.title = title;
  a.message = msg;
  a.addCancelAction("好的");
  a.present();
}

// ---- 颜色 ----
const C = {
  bg: new Color("#1a1a2e"),
  bgLight: new Color("#f6f9fc"),
  cardBg: new Color("#252547"),
  cardBgLight: new Color("#ffffff"),
  text: Color.white(),
  textLight: new Color("#1f2937"),
  subtext: new Color("#94a3b8"),
  subtextLight: new Color("#6b7280"),
  accent: new Color("#3b82f6"),
  green: new Color("#10b981"),
  red: new Color("#ef4444"),
  orange: new Color("#f59e0b"),
  progressBg: new Color("#334155"),
  progressBgLight: new Color("#e5e7eb"),
};

function isDark() {
  return !Device.isUsingDarkAppearance();
  // Scriptable 默认：深色外观用深色小组件
  // 实际上我们用 Device.isUsingDarkAppearance
}

// ---- 创建小组件 ----
function createWidget(data, widgetFamily) {
  const dark = Device.isUsingDarkAppearance();
  const w = new ListWidget();
  w.backgroundColor = dark ? C.bg : C.bgLight;
  w.setPadding(14, 14, 14, 14);
  w.cornerRadius = 16;

  // 点击打开网页
  w.url = SITE_URL + "?source=widget&view=today";

  const tasks = data.tasks || [];
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const dayStr = `周${weekDays[today.getDay()]}`;

  if (widgetFamily === "small") {
    buildSmallWidget(w, tasks, dateStr, dayStr, dark);
  } else if (widgetFamily === "medium") {
    buildMediumWidget(w, tasks, dateStr, dayStr, dark);
  } else {
    buildLargeWidget(w, tasks, dateStr, dayStr, dark);
  }

  return w;
}

// ---- Small 小组件 ----
function buildSmallWidget(w, tasks, dateStr, dayStr, dark) {
  // 标题行
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const icon = header.addText("📋");
  icon.font = Font.systemFont(16);

  header.addSpacer(4);

  const title = header.addText("今日任务");
  title.font = Font.boldSystemFont(14);
  title.textColor = dark ? C.text : C.textLight;

  w.addSpacer(8);

  if (tasks.length === 0) {
    const empty = w.addText("暂无任务");
    empty.font = Font.systemFont(12);
    empty.textColor = dark ? C.subtext : C.subtextLight;
    return;
  }

  // 进度
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = Math.round((done / total) * 100);

  const numStack = w.addStack();
  numStack.layoutHorizontally();
  numStack.centerAlignContent();

  const numText = numStack.addText(`${done}/${total}`);
  numText.font = Font.boldSystemFont(22);
  numText.textColor = dark ? C.accent : C.accent;

  numStack.addSpacer(4);

  const pctText = numStack.addText(`${pct}%`);
  pctText.font = Font.systemFont(14);
  pctText.textColor = dark ? C.subtext : C.subtextLight;

  w.addSpacer(6);

  // 进度条
  addProgressBar(w, pct, dark);

  w.addSpacer(8);

  // 最多显示 3 个任务名
  const show = tasks.slice(0, 3);
  for (const t of show) {
    const row = w.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.addSpacer(2);

    const bullet = row.addText(t.completed ? "✓" : "○");
    bullet.font = Font.systemFont(10);
    bullet.textColor = t.completed
      ? dark
        ? C.green
        : C.green
      : priorityColor(t.priority, dark);

    row.addSpacer(4);

    const name = row.addText(t.name);
    name.font = Font.systemFont(11);
    name.textColor = t.completed
      ? dark
        ? C.subtext
        : C.subtextLight
      : dark
      ? C.text
      : C.textLight;
    name.lineLimit = 1;

    w.addSpacer(2);
  }

  if (tasks.length > 3) {
    const more = w.addText(`+${tasks.length - 3} 项`);
    more.font = Font.systemFont(10);
    more.textColor = dark ? C.subtext : C.subtextLight;
  }
}

// ---- Medium 小组件 ----
function buildMediumWidget(w, tasks, dateStr, dayStr, dark) {
  // 标题行
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const icon = header.addText("📋");
  icon.font = Font.systemFont(18);

  header.addSpacer(6);

  const title = header.addText("今日任务");
  title.font = Font.boldSystemFont(16);
  title.textColor = dark ? C.text : C.textLight;

  header.addSpacer();

  const date = header.addText(`${dateStr} ${dayStr}`);
  date.font = Font.systemFont(12);
  date.textColor = dark ? C.subtext : C.subtextLight;

  w.addSpacer(10);

  if (tasks.length === 0) {
    const empty = w.addText("暂无任务，享受今天吧 🎉");
    empty.font = Font.systemFont(14);
    empty.textColor = dark ? C.subtext : C.subtextLight;
    return;
  }

  // 进度条
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = Math.round((done / total) * 100);

  addProgressBar(w, pct, dark);

  const progressLabel = w.addText(`${done} / ${total} 已完成 · ${pct}%`);
  progressLabel.font = Font.systemFont(11);
  progressLabel.textColor = dark ? C.subtext : C.subtextLight;

  w.addSpacer(8);

  // 最多显示 5 个任务
  const show = tasks.slice(0, 5);
  for (const t of show) {
    addTaskRow(w, t, dark);
    w.addSpacer(4);
  }

  if (tasks.length > 5) {
    const more = w.addText(`还有 ${tasks.length - 5} 项...`);
    more.font = Font.systemFont(11);
    more.textColor = dark ? C.subtext : C.subtextLight;
  }
}

// ---- Large 小组件 ----
function buildLargeWidget(w, tasks, dateStr, dayStr, dark) {
  // 标题行
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const icon = header.addText("📋");
  icon.font = Font.systemFont(22);

  header.addSpacer(6);

  const title = header.addText("PlannerPro 今日任务");
  title.font = Font.boldSystemFont(18);
  title.textColor = dark ? C.text : C.textLight;

  header.addSpacer();

  const date = header.addText(`${dateStr} ${dayStr}`);
  date.font = Font.systemFont(13);
  date.textColor = dark ? C.subtext : C.subtextLight;

  w.addSpacer(12);

  if (tasks.length === 0) {
    const empty = w.addText("暂无任务，享受今天吧 🎉\n在 PlannerPro 中生成计划后点击「复制小组件数据」");
    empty.font = Font.systemFont(14);
    empty.textColor = dark ? C.subtext : C.subtextLight;
    return;
  }

  // 进度条
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = Math.round((done / total) * 100);

  addProgressBar(w, pct, dark);

  const progressLabel = w.addText(`${done} / ${total} 已完成 · ${pct}%`);
  progressLabel.font = Font.systemFont(12);
  progressLabel.textColor = dark ? C.subtext : C.subtextLight;

  w.addSpacer(10);

  // 显示所有任务（大组件空间足够）
  for (const t of tasks) {
    addTaskRow(w, t, dark);
    w.addSpacer(4);
  }
}

// ---- 辅助函数 ----

function addProgressBar(widget, pct, dark) {
  const barBg = widget.addStack();
  barBg.layoutHorizontally();
  barBg.cornerRadius = 4;
  barBg.size = new Size(0, 6);
  barBg.backgroundColor = dark ? C.progressBg : C.progressBgLight;

  const barFill = barBg.addStack();
  barFill.layoutHorizontally();
  barFill.cornerRadius = 4;
  const fillWidth = Math.max(pct, 2);
  barFill.size = new Size(0, 6);
  // 用渐变色：蓝→绿
  const gradient = new LinearGradient();
  gradient.colors = [C.accent, C.green];
  gradient.locations = [0, 1];
  barBg.setPadding(0, 0, 0, 0);
  // 简单实现：用单色
  barFill.backgroundColor = pct >= 100 ? C.green : C.accent;
  barFill.url = "";

  // 用文字模拟进度条（Scriptable 原生进度条实现较复杂）
  // 实际上用容器宽度比来实现
  const pctStr = "█".repeat(Math.round(pct / 5)) + "░".repeat(Math.round((100 - pct) / 5));
  // 不，我们用更好的方式
}

// 更好的进度条实现
function addProgressBarV2(parent, pct, dark) {
  const container = parent.addStack();
  container.layoutHorizontally();
  container.cornerRadius = 3;
  container.size = new Size(0, 5);
  container.backgroundColor = dark ? C.progressBg : C.progressBgLight;
  container.setPadding(0, 0, 0, 0);

  // 左侧填充
  const fill = container.addStack();
  fill.layoutHorizontally();
  fill.cornerRadius = 3;
  fill.size = new Size(0, 5);
  fill.backgroundColor = pct >= 100 ? C.green : C.accent;

  // 右侧空白 - 按比例
  if (pct < 100) {
    const empty = container.addStack();
    empty.layoutHorizontally();
    empty.backgroundColor = new Color("transparent", 0);
  }
}

function addTaskRow(parent, task, dark) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.setPadding(6, 8, 6, 8);
  row.cornerRadius = 8;
  row.backgroundColor = dark ? C.cardBg : C.cardBgLight;

  // 优先级圆点
  const dot = row.addText("●");
  dot.font = Font.systemFont(8);
  dot.textColor = priorityColor(task.priority, dark);

  row.addSpacer(6);

  // 完成勾
  const check = row.addText(task.completed ? "✓" : "○");
  check.font = Font.systemFont(12);
  check.textColor = task.completed
    ? dark
      ? C.green
      : C.green
    : dark
      ? C.subtext
      : C.subtextLight;

  row.addSpacer(6);

  // 任务名
  const name = row.addText(task.name);
  name.font = Font.systemFont(13);
  name.textColor = task.completed
    ? dark
      ? C.subtext
      : C.subtextLight
    : dark
      ? C.text
      : C.textLight;
  name.lineLimit = 1;

  row.addSpacer();

  // 时间
  if (task.time) {
    const time = row.addText(task.time);
    time.font = Font.systemFont(11);
    time.textColor = dark ? C.subtext : C.subtextLight;
  }
}

function priorityColor(priority, dark) {
  switch (priority) {
    case "high":
      return C.red;
    case "medium":
      return C.orange;
    case "low":
      return C.green;
    default:
      return dark ? C.subtext : C.subtextLight;
  }
}

// ---- 主逻辑 ----

if (config.runsInWidget) {
  // 小组件模式：读取本地文件并渲染
  const data = readTasks();
  const widget = createWidget(data, config.widgetFamily);
  Script.setWidget(widget);
} else {
  // App 模式：从剪贴板导入数据
  importFromClipboard();
}

Script.complete();
