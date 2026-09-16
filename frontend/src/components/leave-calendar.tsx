import { useMemo, useState } from "react";
import type { LeaveRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

const typeColor: Record<string, string> = {
  cp: "bg-sage/80 text-white",
  rtt: "bg-sky-600 text-white",
  maladie: "bg-amber-600 text-white",
  sans_solde: "bg-zinc-500 text-white",
};

function ymd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function LeaveCalendar({ leaves }: { leaves: LeaveRequest[] }) {
  const [cursor, setCursor] = useState(() => new Date(2026, 8, 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(cursor);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slots: { date: string; day: number; empty?: boolean }[] = [];
    for (let i = 0; i < startWeekday; i += 1) slots.push({ date: `e-${i}`, day: 0, empty: true });
    for (let day = 1; day <= daysInMonth; day += 1) {
      slots.push({ date: ymd(new Date(year, month, day)), day });
    }
    return slots;
  }, [year, month]);

  function onDay(date: string) {
    return leaves.filter((leave) => leave.status !== "rejected" && leave.startDate <= date && date <= leave.endDate);
  }

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="text-sm text-sage" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          ←
        </button>
        <p className="font-display text-xl capitalize">{label}</p>
        <button type="button" className="text-sm text-sage" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold tracking-wide text-ink/40 uppercase">
        {["L", "M", "M", "J", "V", "S", "D"].map((item) => (
          <div key={item}>{item}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.empty) return <div key={cell.date} />;
          const hits = onDay(cell.date);
          const first = hits[0];
          return (
            <div
              key={cell.date}
              title={hits.map((item) => `${item.employeeName ?? ""} ${item.type}`).join(" · ")}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg text-xs",
                first ? typeColor[first.type] : "bg-paper text-ink/70",
                hits.some((item) => item.status === "pending") ? "ring-2 ring-amber-400" : "",
              )}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink/45">CP · RTT · maladie · sans solde. Un contour ambre = demande en attente.</p>
    </div>
  );
}
