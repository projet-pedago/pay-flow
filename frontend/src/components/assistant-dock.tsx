import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AssistantReply } from "@/lib/types";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; text: string; citations?: AssistantReply["citations"] };

export function AssistantDock() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Je lis vos soldes, bulletins et contrats. Posez une question en français.",
    },
  ]);

  if (!user || location.pathname === "/login") return null;

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setPending(true);
    try {
      const reply = await api<AssistantReply>("/api/assistant/ask", {
        method: "POST",
        body: JSON.stringify({ question: trimmed }),
      });
      setMessages((current) => [
        ...current,
        { role: "assistant", text: reply.answer, citations: reply.citations },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: err instanceof Error ? err.message : "Assistant indisponible" },
      ]);
    } finally {
      setPending(false);
    }
  }

  const seeds =
    user.role === "admin"
      ? ["Masse salariale du dernier cycle ?", "Quels contrats expirent ?", "Simule une prime de 400 € pour Yao Lassidan"]
      : ["Combien de congés me reste-t-il ?", "Comment est calculé mon salaire ?", "Simule une augmentation de 5 %"];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sage-dark text-white shadow-lg print:hidden"
        aria-label="Assistant RH"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
      {open ? (
        <div className="fixed right-4 bottom-20 z-40 flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-2xl print:hidden">
          <div className="flex items-center gap-2 bg-sage-dark px-4 py-3 text-white">
            <MessageCircle className="h-4 w-4" />
            <div>
              <p className="text-sm font-semibold">Assistant RH</p>
              <p className="text-[11px] text-white/70">Réponses ancrées dans vos données</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[95%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user" ? "ml-auto bg-sage-dark text-white" : "bg-paper text-ink",
                )}
              >
                {message.text}
                {message.citations?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.citations.map((item) => (
                      <Link key={item.link} to={item.link} className="text-xs text-sage underline" onClick={() => setOpen(false)}>
                        {item.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {pending ? <p className="text-xs text-ink/45">Lecture des dossiers…</p> : null}
          </div>
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            {seeds.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full bg-paper px-2 py-1 text-[11px] text-ink/70 hover:bg-sage/10"
                onClick={() => void ask(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-ink/8 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
            }}
          >
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Votre question…"
              className="h-10 flex-1 rounded-xl border border-ink/10 px-3 text-sm"
            />
            <Button type="submit" size="icon" disabled={pending} aria-label="Envoyer">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
