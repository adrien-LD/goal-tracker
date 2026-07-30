import { shortAmount } from "@/lib/money-plan";
import type { MoneyPlanDetail } from "@/components/money/types";

/** X 轴按金额比例：起点在最左，终局在最右 */
function xAtAmount(
  amount: number,
  startAmount: number,
  finalAmount: number,
  padX: number,
  width: number
): number {
  const span = Math.max(1, finalAmount - startAmount);
  const t = Math.min(1, Math.max(0, (amount - startAmount) / span));
  return padX + t * (width - padX * 2);
}

export default function MoneyPlanCurve({ plan }: { plan: MoneyPlanDetail }) {
  const width = 1000;
  const height = 160;
  const padX = 36;
  const padY = 24;
  const minV = plan.startAmount;
  const maxV = plan.finalAmount;
  const range = Math.max(1, maxV - minV);

  const xOf = (amount: number) =>
    xAtAmount(amount, plan.startAmount, plan.finalAmount, padX, width);
  const yOf = (value: number) =>
    height - padY - ((value - minV) / range) * (height - padY * 2);

  const planPath = plan.stages
    .map(
      (stage, index) =>
        `${index === 0 ? "M" : "L"} ${xOf(stage.targetAmount)} ${yOf(stage.targetAmount)}`
    )
    .join(" ");

  const clampedAmount = Math.min(
    plan.finalAmount,
    Math.max(plan.startAmount, plan.currentAmount)
  );
  const progressX = xOf(clampedAmount);
  const progressY = yOf(clampedAmount);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-40 w-full"
      preserveAspectRatio="none"
    >
      <path
        d={planPath}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeDasharray="6 5"
      />
      {/* 当前金额：X/Y 都按金额比例，82k 会落在 79k 与 88k 之间 */}
      <circle
        cx={progressX}
        cy={progressY}
        r="7"
        fill="#f59e0b"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      {plan.stages.map((stage, index) => {
        const isOrigin = index === 0;
        return (
          <g key={stage.id}>
            <circle
              cx={xOf(stage.targetAmount)}
              cy={yOf(stage.targetAmount)}
              r={isOrigin ? 4 : 5}
              fill={
                isOrigin
                  ? "#cbd5e1"
                  : stage.status === "done"
                    ? "#0f172a"
                    : "#fff"
              }
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            <text
              x={xOf(stage.targetAmount)}
              y={yOf(stage.targetAmount) - 12}
              textAnchor={isOrigin ? "start" : "middle"}
              fontSize="11"
              fill="#64748b"
            >
              {shortAmount(stage.targetAmount)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
