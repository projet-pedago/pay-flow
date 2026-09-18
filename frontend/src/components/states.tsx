import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex h-64 items-center justify-center gap-3 text-ink/50">
      <LoaderCircle className="h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-700" />
        <div>
          <p className="font-semibold text-red-900">Impossible de charger les données</p>
          <p className="mt-1 text-sm text-red-800">{message}</p>
          {onRetry ? (
            <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
              Réessayer
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-ink/15 px-6 py-16 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-2 text-sm text-ink/55">{hint}</p>
    </div>
  );
}

export function UnlinkedEmployeeState() {
  return (
    <EmptyState
      title="Fiche en cours de création"
      hint="PayRollFlow crée votre fiche à la première connexion Microsoft. Actualisez la page si elle n’apparaît pas encore."
    />
  );
}
