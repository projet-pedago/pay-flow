import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { EmployeeStatus, PeriodStatus } from "@/lib/types";

const periodStyles: Record<PeriodStatus, string> = {
  draft: "bg-amber-100 text-amber-900",
  calculated: "bg-sky-100 text-sky-900",
  validated: "bg-violet-100 text-violet-900",
  paid: "bg-emerald-100 text-emerald-900",
};

const employeeStyles: Record<EmployeeStatus, string> = {
  active: "bg-emerald-100 text-emerald-900",
  on_leave: "bg-amber-100 text-amber-900",
  terminated: "bg-zinc-200 text-zinc-700",
};

const employeeLabels: Record<EmployeeStatus, string> = {
  active: "Actif",
  on_leave: "Congé",
  terminated: "Sorti",
};

export function PeriodBadge({ status }: { status: PeriodStatus }) {
  return <Badge className={periodStyles[status]}>{statusLabel(status)}</Badge>;
}

export function EmployeeBadge({ status }: { status: EmployeeStatus }) {
  return <Badge className={employeeStyles[status]}>{employeeLabels[status]}</Badge>;
}
