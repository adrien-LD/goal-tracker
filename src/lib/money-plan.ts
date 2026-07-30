export type StageStatus = "done" | "active" | "todo";

export type MoneyStageSeed = {
  order: number;
  title: string;
  targetAmount: number;
  windowStart: string;
  windowEnd: string;
  deltaLabel: string;
  failLine: string;
  actions: string[];
};

export type MoneyStageView = {
  id: string;
  order: number;
  title: string;
  targetAmount: number;
  windowStart: string;
  windowEnd: string;
  deltaLabel: string;
  failLine: string;
  status: StageStatus;
  need: number;
  progressPct: number;
  span: number;
  actions: Array<{
    id: string;
    order: number;
    text: string;
    done: boolean;
  }>;
};

export type MoneyPlanMetrics = {
  gapToFinal: number;
  daysLeft: number;
  dailyNeeded: number;
  totalProgressPct: number;
  netGain: number;
  doneCount: number;
};

export const AUGUST_MONEY_PLAN_SEED = {
  title: "八月赚钱阶段计划",
  startAmount: 79000,
  finalAmount: 148000,
  deadline: "2026-08-31",
  stages: [
    {
      order: 1,
      title: "S1 定基线",
      targetAmount: 79000,
      windowStart: "2026-07-28",
      windowEnd: "2026-08-03",
      deltaLabel: "起点锁定",
      failLine:
        "3 天内仍无明确可核验收入路径 → 砍掉全部低转化动作，只留主路径。",
      actions: [
        "盘点现有可变现资产 / 在途回款，记账到同一口径",
        "锁定八月主收入源（只留 1 条主路径 + 1 条备份）",
        "建立每日记账：收入、成本、净增三列",
      ],
    },
    {
      order: 2,
      title: "S2 首跳 +9,000",
      targetAmount: 88000,
      windowStart: "2026-08-04",
      windowEnd: "2026-08-08",
      deltaLabel: "+9,000",
      failLine:
        "窗口过半进度 < 50% → 启动加价 / 加时 / 二销补差，停止新实验。",
      actions: [
        "推进高转化交付 / 成交，优先本周能结算的单",
        "催收在途回款，列出到账日与责任人",
        "再拿 1 单可在 8/8 前结算的增量",
      ],
    },
    {
      order: 3,
      title: "S3 巩固 +6,000",
      targetAmount: 94000,
      windowStart: "2026-08-09",
      windowEnd: "2026-08-13",
      deltaLabel: "+6,000",
      failLine: "出现返工或坏账迹象 → 先修交付与收款，再谈增量。",
      actions: [
        "复用 S2 已验证路径，不新开未验证项目",
        "提高客单价或缩短回款周期",
        "砍掉低 ROI 事务，保护交付带宽",
      ],
    },
    {
      order: 4,
      title: "S4 陡坡 +14,000",
      targetAmount: 108000,
      windowStart: "2026-08-14",
      windowEnd: "2026-08-18",
      deltaLabel: "+14,000",
      failLine:
        "大单未落袋不算完成；只计已到账，或合同锁定且 8 月内必到账。",
      actions: [
        "集中大单 / 批量单，明确里程碑款节点",
        "尽量预收或拆分可本周到账的部分",
        "必要时并行 2 条已验证路径，禁止第 3 条",
      ],
    },
    {
      order: 5,
      title: "S5 稳态 +7,000",
      targetAmount: 115000,
      windowStart: "2026-08-19",
      windowEnd: "2026-08-23",
      deltaLabel: "+7,000",
      failLine: "净增停滞超过 2 天 → 当日只做收款与可当日变现动作。",
      actions: [
        "稳交付，防返工吞掉利润",
        "用小单 / 增购补齐差额",
        "清理尾款清单，逐笔对账关闭",
      ],
    },
    {
      order: 6,
      title: "S6 冲刺 +11,000",
      targetAmount: 126000,
      windowStart: "2026-08-24",
      windowEnd: "2026-08-27",
      deltaLabel: "+11,000",
      failLine: "只做 T+0～T+3 能变现的事；其余全部延后到 9 月。",
      actions: [
        "只追已报价 / 高意向客户",
        "加速结算，拒绝长账期新单",
        "限制新坑：只收现、短交付",
      ],
    },
    {
      order: 7,
      title: "S7 终局 +22,000",
      targetAmount: 148000,
      windowStart: "2026-08-28",
      windowEnd: "2026-08-31",
      deltaLabel: "+22,000",
      failLine:
        "8/30 仍差 > 8k 且无确定到账 → 启动备份变现（库存/债权/预售），禁止赌单。",
      actions: [
        "4 天净增 22k：优先大额尾款 + 可当日结算单",
        "每日早晚对账，缺口公开写进当日清单",
        "最后 48 小时：只收款、只交付已承诺项",
      ],
    },
  ] satisfies MoneyStageSeed[],
};

export function parseDeadlineEnd(deadline: string | Date): Date {
  if (deadline instanceof Date) {
    const d = new Date(deadline);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  const [y, m, day] = deadline.split("-").map(Number);
  return new Date(y, m - 1, day, 23, 59, 59, 999);
}

export function daysLeftUntil(deadline: Date, now = new Date()): number {
  const ms = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export function resolveStageStatuses(
  targets: readonly number[],
  currentAmount: number
): StageStatus[] {
  const firstOpen = targets.findIndex((target) => currentAmount < target);
  return targets.map((target, index) => {
    if (currentAmount >= target) return "done";
    if (index === firstOpen) return "active";
    return "todo";
  });
}

export function stageProgressPct(options: {
  prevTarget: number;
  target: number;
  currentAmount: number;
}): number {
  const span = options.target - options.prevTarget;
  if (span <= 0) {
    return options.currentAmount >= options.target ? 100 : 0;
  }
  if (options.currentAmount <= options.prevTarget) return 0;
  if (options.currentAmount >= options.target) return 100;
  return ((options.currentAmount - options.prevTarget) / span) * 100;
}

export function computePlanMetrics(options: {
  startAmount: number;
  finalAmount: number;
  currentAmount: number;
  deadline: Date;
  doneCount: number;
  now?: Date;
}): MoneyPlanMetrics {
  const gapToFinal = Math.max(0, options.finalAmount - options.currentAmount);
  const daysLeft = daysLeftUntil(options.deadline, options.now);
  const span = options.finalAmount - options.startAmount;
  const totalProgressPct =
    span <= 0
      ? options.currentAmount >= options.finalAmount
        ? 100
        : 0
      : Math.min(
          100,
          Math.max(
            0,
            ((options.currentAmount - options.startAmount) / span) * 100
          )
        );

  return {
    gapToFinal,
    daysLeft,
    dailyNeeded: daysLeft > 0 ? gapToFinal / daysLeft : gapToFinal,
    totalProgressPct,
    netGain: Math.max(0, options.currentAmount - options.startAmount),
    doneCount: options.doneCount,
  };
}

export function formatMoney(amount: number): string {
  return `¥${Math.round(amount).toLocaleString("zh-CN")}`;
}

export function shortAmount(amount: number): string {
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(amount);
}
