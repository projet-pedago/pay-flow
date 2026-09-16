import { Router } from "express";
import { z } from "zod";
import { getUser, requireAuth } from "../auth.js";
import { answerAssistant, ASSISTANT_SUGGESTIONS_ADMIN, ASSISTANT_SUGGESTIONS_EMPLOYEE } from "../lib/assistant.js";
import { loadStore } from "../lib/store.js";

export const assistantRouter = Router();
assistantRouter.use(requireAuth);

assistantRouter.get("/suggestions", (req, res) => {
  const user = getUser(req);
  res.json({
    suggestions: user.role === "admin" ? ASSISTANT_SUGGESTIONS_ADMIN : ASSISTANT_SUGGESTIONS_EMPLOYEE,
  });
});

assistantRouter.post("/ask", (req, res) => {
  const parsed = z.object({ question: z.string().min(3).max(500) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Question trop courte" });
    return;
  }
  const user = getUser(req);
  const store = loadStore();
  res.json(answerAssistant(store, user, parsed.data.question.trim()));
});
