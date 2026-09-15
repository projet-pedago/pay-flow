import { Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export function NotificationBell({ variant = "admin" }: { variant?: "admin" | "employee" }) {
  const { data, reload } = useApi<{ items: AppNotification[]; unread: number }>("/api/notifications");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unread = data?.unread ?? 0;

  async function openItem(item: AppNotification) {
    if (!item.read) await api(`/api/notifications/${item.id}/read`, { method: "POST" });
    setOpen(false);
    await reload();
    navigate(item.link);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={
          variant === "admin"
            ? "relative rounded-full p-2 text-white/80 hover:bg-white/10"
            : "relative rounded-full p-2 text-[#16324f] hover:bg-white"
        }
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-ink/10 bg-white text-ink shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
            Notifications
            {unread ? (
              <button
                className="text-xs font-medium text-sage"
                onClick={async () => {
                  await api("/api/notifications/read-all", { method: "POST" });
                  await reload();
                }}
              >
                Tout lu
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(data?.items ?? []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink/50">Aucune alerte pour le moment.</p>
            ) : (
              data?.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-paper ${item.read ? "text-ink/60" : "bg-paper/70"}`}
                >
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-xs text-ink/55">{item.body}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
