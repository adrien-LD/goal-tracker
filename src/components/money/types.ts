import type zh from "@/locales/zh.json";
import type {
  MoneyPlanMetrics,
  MoneyStageView,
} from "@/lib/money-plan";

export type DictKey = keyof typeof zh;
export type Translate = (key: DictKey) => string;

export type MoneyAmountLogView = {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  delta: number;
};

export type MoneyPlanDetail = {
  id: string;
  title: string;
  startAmount: number;
  finalAmount: number;
  deadline: string;
  currentAmount: number;
  stages: MoneyStageView[];
  metrics: MoneyPlanMetrics;
  logs: MoneyAmountLogView[];
};
