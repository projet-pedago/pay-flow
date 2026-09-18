import { useParams } from "react-router-dom";
import { ErrorState, LoadingState, UnlinkedEmployeeState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { moneyExact } from "@/lib/format";
import type { Attestation, Employee } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export function AttestationPage() {
  const { user } = useAuth();
  const params = useParams();
  const kind = (params.kind === "salaire" ? "salaire" : "travail") as "travail" | "salaire";
  const profile = useApi<{ employee: Employee | null }>(params.employeeId ? null : "/api/me/profile");
  const employeeId = params.employeeId ?? profile.data?.employee?.id ?? user?.employeeId ?? undefined;
  const { data, error, loading, reload } = useApi<Attestation>(
    employeeId ? `/api/attestations/${employeeId}/${kind}` : null,
  );

  if (!params.employeeId && profile.loading) return <LoadingState label="Préparation de l’attestation…" />;
  if (!employeeId) return <UnlinkedEmployeeState />;
  if (loading) return <LoadingState label="Préparation de l’attestation…" />;
  if (error || !data) return <ErrorState message={error ?? "Document introuvable"} onRetry={reload} />;

  const issued = new Date(data.issuedAt).toLocaleDateString("fr-FR");
  const person = `${data.employee.civility} ${data.employee.lastName.toUpperCase()} ${data.employee.firstName}`;

  return (
    <div className="bg-[#e8e8e8] px-3 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end">
        <Button variant="outline" onClick={() => window.print()}>
          Imprimer / PDF
        </Button>
      </div>
      <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-12 shadow-sm">
        <p className="text-xs tracking-[0.2em] text-ink/50 uppercase">{data.company.companyName}</p>
        <p className="mt-1 text-sm text-ink/60">
          {data.company.companyAddress} · {data.company.companyPostalCode} {data.company.companyCity}
        </p>
        <p className="text-sm text-ink/60">SIRET {data.company.siret} · APE {data.company.ape}</p>
        <h1 className="font-display mt-10 text-4xl">{data.title}</h1>
        <p className="mt-8 leading-7">
          Je soussigné(e), représentant de <strong>{data.company.companyName}</strong>, certifie que{" "}
          <strong>{person}</strong>, matricule {data.employee.matricule}, est {data.employee.status === "terminated" ? "était" : "est"} employé(e) en qualité de{" "}
          <strong>{data.employee.jobTitle}</strong> ({data.departmentName || "—"}) sous contrat{" "}
          <strong>{data.employee.contractType}</strong> depuis le {new Date(data.employee.hireDate).toLocaleDateString("fr-FR")}
          {data.employee.contractEndDate ? ` jusqu’au ${new Date(data.employee.contractEndDate).toLocaleDateString("fr-FR")}` : ""}.
        </p>
        {kind === "salaire" && data.lastPayslip ? (
          <p className="mt-6 leading-7">
            Pour la période <strong className="capitalize">{data.lastPayslip.periodLabel}</strong>, le salaire brut s’élève à{" "}
            {moneyExact(data.lastPayslip.gross)} et le net à payer à {moneyExact(data.lastPayslip.net)}.
          </p>
        ) : null}
        {kind === "salaire" && !data.lastPayslip ? (
          <p className="mt-6 text-sm text-ink/55">Aucun bulletin calculé n’est encore disponible pour ce certificat.</p>
        ) : null}
        <p className="mt-8">Fait à {data.company.companyCity}, le {issued}.</p>
        <p className="mt-16 text-sm">Cachet et signature de l’employeur</p>
        <p className="mt-24 text-xs text-ink/40">Document généré par PayRollFlow — à remettre aux organismes qui le demandent.</p>
      </article>
    </div>
  );
}
