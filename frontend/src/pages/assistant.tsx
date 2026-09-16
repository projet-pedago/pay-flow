import { Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AssistantReply } from "@/lib/types";

type Message = { role: "user" | "assistant"; text: string; citations?: AssistantReply["citations"] };

export function AssistantPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Je m’appuie sur les soldes, bulletins et contrats de PayRollFlow. Aucune invention : si je n’ai pas la donnée, je le dis.",
    },
  ]);
  const seeds =
    user?.role === "admin"
      ? ["Quelle est la masse salariale du dernier cycle ?", "Quels contrats arrivent à échéance ?", "Simule une prime de 400 € pour Yao Lassidan"]
      : ["Combien de jours de congés me reste-t-il ?", "Comment est calculé mon salaire ?", "Explique la ligne CSG de ma fiche de paie"];

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
      setMessages((current) => [...current, { role: "assistant", text: reply.answer, citations: reply.citations }]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: err instanceof Error ? err.message : "Assistant indisponible" },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl">Assistant RH</h2>
        <p className="mt-2 text-sm text-ink/60">
          Chat métier : congés, lecture de bulletin, simulation d’augmentation, alertes contrats. Les réponses citent l’écran correspondant.
        </p>
      </div>
      <div className="min-h-[24rem] space-y-3 rounded-3xl border border-ink/10 bg-white p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === "user" ? "ml-12 rounded-2xl bg-sage-dark px-4 py-3 text-sm text-white" : "mr-8 rounded-2xl bg-paper px-4 py-3 text-sm whitespace-pre-wrap"}
          >
            {message.text}
            {message.citations?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.citations.map((item) => (
                  <Link key={item.link} to={item.link} className="text-xs text-sage underline">
                    {item.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {seeds.map((item) => (
          <button key={item} type="button" className="rounded-full bg-white px-3 py-1 text-xs ring-1 ring-ink/10" onClick={() => void ask(item)}>
            {item}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <input
          className="h-11 flex-1 rounded-2xl border border-ink/10 bg-white px-4 text-sm"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Écrivez votre question…"
        />
        <Button type="submit" disabled={pending}>
          <Send className="h-4 w-4" />
          Envoyer
        </Button>
      </form>
    </div>
  );
}
