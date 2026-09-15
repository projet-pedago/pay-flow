import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DocumentPack } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export function DocumentsPage() {
  const { user } = useAuth();
  const query = useApi<DocumentPack[]>("/api/documents");

  if (query.loading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message={query.error ?? "Erreur"} onRetry={query.reload} />;

  async function toggle(id: string) {
    await api(`/api/documents/${id}/toggle`, { method: "POST" });
    toast.success("Dossier mis à jour");
    await query.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl">
          {user?.role === "admin" ? "Dossiers RH" : "Mon dossier"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          Onboarding documentaire : CNI, RIB, contrat, carte Vitale. Les pièces manquantes bloquent un virement propre.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {query.data.map((pack) => (
          <Card key={pack.employeeId}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{pack.name}</h3>
                <span className={pack.complete ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-amber-800"}>
                  {pack.complete ? "Complet" : `${pack.missing} manquant(s)`}
                </span>
              </div>
              {pack.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-2xl bg-paper px-3 py-2 text-sm">
                  <span>{doc.label}</span>
                  <Button size="sm" variant={doc.status === "provided" ? "outline" : "default"} onClick={() => void toggle(doc.id)}>
                    {doc.status === "provided" ? "Fourni" : "Manquant"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
