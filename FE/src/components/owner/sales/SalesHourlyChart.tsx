import { useMemo, useState } from "react";
import type { HourlySalesResponse } from "../../../types/api";

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}시`;
}

export function SalesHourlyChart({
  rows,
  loading,
  error,
}: {
  rows: HourlySalesResponse[];
  loading: boolean;
  error: string | null;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const peak = useMemo(() => {
    if (rows.length === 0) return null;
    return rows.reduce((best, row) =>
      row.orderCount > best.orderCount ? row : best,
    );
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-[25px] border border-black/50 bg-canvas px-[16px] py-[48px]">
        <p className={`text-center text-[15px] ${error ? "text-danger" : "text-black/50"}`}>
          {loading
            ? "매출 데이터를 불러오는 중..."
            : error ?? "해당 기간에 주문 데이터가 없습니다."}
        </p>
      </div>
    );
  }

  const width = 640;
  const height = 280;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const maxCount = Math.max(1, ...rows.map((row) => row.orderCount));
  const yMax = Math.ceil(maxCount / 2) * 2;
  const xAt = (index: number) =>
    padLeft + (rows.length === 1 ? plotW / 2 : (index / (rows.length - 1)) * plotW);
  const yAt = (count: number) => padTop + plotH - (count / yMax) * plotH;
  const line = rows
    .map((row, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(row.orderCount)}`)
    .join(" ");
  const yTicks = [0, yMax / 2, yMax];
  const hovered = hoverIndex === null ? null : rows[hoverIndex];

  return (
    <div className="overflow-x-auto rounded-[25px] border border-black/50 bg-canvas p-[16px] md:p-[20px]">
      {peak && peak.orderCount > 0 && (
        <p className="mb-[8px] text-[14px] text-black/70">
          피크 시간대: {hourLabel(peak.hour)} ({peak.orderCount.toLocaleString()}건)
        </p>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[240px] w-full min-w-[480px] text-black"
        role="img"
        aria-label="시간대별 주문건수"
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="currentColor"
              strokeOpacity="0.12"
            />
            <text
              x={padLeft - 8}
              y={yAt(tick) + 4}
              textAnchor="end"
              className="fill-black/50"
              fontSize="11"
            >
              {tick}
            </text>
          </g>
        ))}
        <text
          x={12}
          y={padTop - 4}
          className="fill-black/50"
          fontSize="11"
        >
          주문건수
        </text>
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" />
        {rows.map((row, index) => (
          <g key={row.hour}>
            <circle
              cx={xAt(index)}
              cy={yAt(row.orderCount)}
              r={hoverIndex === index ? 5 : 3.5}
              fill="currentColor"
            />
            <text
              x={xAt(index)}
              y={height - 12}
              textAnchor="middle"
              className="fill-black/70"
              fontSize="11"
            >
              {hourLabel(row.hour)}
            </text>
            <rect
              x={xAt(index) - plotW / Math.max(rows.length, 2) / 2}
              y={padTop}
              width={plotW / Math.max(rows.length, 2)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </g>
        ))}
      </svg>
      {hovered && (
        <p className="mt-[4px] text-center text-[14px] font-medium text-black">
          {hourLabel(hovered.hour)} {hovered.orderCount.toLocaleString()}건
        </p>
      )}
    </div>
  );
}
