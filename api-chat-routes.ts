import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, conversationsTable, messagesTable, apiConfigsTable } from "@workspace/db";
import { and, count, desc, eq } from "drizzle-orm";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { checkUsageLimit, incrementUsage } from "./usage";

const router = Router();

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  chat:      "Sen Ulug'bek AI — foydalanuvchining aqlli yordamchisi. Samimiy, qisqa, foydali javob ber. O'zbek tilida gapir.",
  code:      "Sen ekspert dasturchi. Kodlarni ```kod_tili\n...\n``` formatida yoz. O'zbek tilida tushuntir.",
  bank:      "Sen bank operatorisan. Hisob, karta, kredit, o'tkazma, foiz bo'yicha aniq ma'lumot ber. O'zbek tilida.",
  gov:       "Sen davlat xizmatlari ekspertisan. Hujjatlar, ariza berish, muddatlar, portallar haqida aniq gapir. O'zbek tilida.",
  doctor:    "Sen tibbiy ma'lumot beruvchi. Faqat umumiy ma'lumot ber, shifokorga murojaat qilishni tavsiya et. O'zbek tilida.",
  lawyer:    "Sen huquqiy maslahatchi. O'zbekiston qonunlari, huquqlar, jarayonlar haqida tushuntir. O'zbek tilida.",
  translate: "Sen tarjimonsan. Berilgan matnni so'ralgan tilga aniq tarjima qil. Kerakli izohlarni qo'sh.",
  social:    "Sen SMM mutaxassis. Viral, kreativ, O'zbek auditoriyasiga mos kontent yarat. O'zbek tilida.",
  money:     "Sen online pul ishlash ekspertisan. Amaliy, qadamba-qadam yo'l xaritasi ber. O'zbek tilida.",
  edu:       "Sen sabr-toqatli o'qituvchi. Har qanday mavzuni oddiy, misollar bilan tushuntir. O'zbek tilida.",
};

const DEFAULT_SYSTEM =
  "Sen Ulug'bek AI — O'zbekistonning aqlli yordamchisi. O'zbek tilida qisqa, foydali javob ber.";

router.get("/chat/conversations", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const clerkUser = auth.sessionClaims;
  const email = (clerkUser?.email as string) || "";
  const user = await getOrCreateUser(auth.userId!, email);

  const conversations = await db
    .select({
      id: conversationsTable.id,
      title: conversationsTable.title,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      messageCount: count(messagesTable.id),
    })
    .from(conversationsTable)
    .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(eq(conversationsTable.userId, user.id))
    .groupBy(conversationsTable.id)
    .orderBy(desc(conversationsTable.updatedAt));

  const withLastMessage = await Promise.all(
    conversations.map(async (conv) => {
      const [last] = await db
        .select({ content: messagesTable.content })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      return {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        messageCount: Number(conv.messageCount),
        lastMessage: last?.content?.slice(0, 100) ?? null,
      };
    }),
  );

  res.json(withLastMessage);
});

router.post("/chat/conversations", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const clerkUser = auth.sessionClaims;
  const email = (clerkUser?.email as string) || "";
  const user = await getOrCreateUser(auth.userId!, email);
  const { title } = req.body;

  const [conv] = await db
    .insert(conversationsTable)
    .values({ userId: user.id, title: title || "New Conversation" })
    .returning();

  res.status(201).json({
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messageCount: 0,
    lastMessage: null,
  });
});

router.delete("/chat/conversations/:id", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const clerkUser = auth.sessionClaims;
  const email = (clerkUser?.email as string) || "";
  const user = await getOrCreateUser(auth.userId!, email);
  const convId = parseInt(req.params.id as string);

  await db
    .delete(conversationsTable)
    .where(and(eq(conversationsTable.id, convId), eq(conversationsTable.userId, user.id)));

  res.status(204).send();
});

router.get("/chat/conversations/:id/messages", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const clerkUser = auth.sessionClaims;
  const email = (clerkUser?.email as string) || "";
  const user = await getOrCreateUser(auth.userId!, email);
  const convId = parseInt(req.params.id as string);

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, convId), eq(conversationsTable.userId, user.id)))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt);

  res.json(
    messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      fileUrl: m.fileUrl,
      fileType: m.fileType,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

router.post("/chat/conversations/:id/messages", requireAuth, async (req, res) => {
  const auth = getAuth(req);
  const clerkUser = auth.sessionClaims;
  const email = (clerkUser?.email as string) || "";
  const user = await getOrCreateUser(auth.userId!, email);
  const convId = parseInt(req.params.id as string);

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, convId), eq(conversationsTable.userId, user.id)))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const canChat = await checkUsageLimit(user.id, "chat", user.tier);
  if (!canChat) {
    res.status(403).json({ error: "Chat usage limit exceeded. Upgrade to Pro." });
    return;
  }

  const { content, fileUrl, fileType, agentType } = req.body;
  const systemPrompt = (agentType && AGENT_SYSTEM_PROMPTS[agentType]) || DEFAULT_SYSTEM;

  const [userMsg] = await db
    .insert(messagesTable)
    .values({ conversationId: convId, role: "user", content, fileUrl, fileType })
    .returning();

  await incrementUsage(user.id, "chat");

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, convId));

  const [activeConfig] = await db
    .select()
    .from(apiConfigsTable)
    .where(and(eq(apiConfigsTable.feature, "chat"), eq(apiConfigsTable.isActive, true)))
    .limit(1);

  let aiContent = "";

  if (activeConfig?.apiKey) {
    try {
      aiContent = await callAIProvider(activeConfig, content, systemPrompt, fileUrl, fileType);
    } catch {
      aiContent = "Sorry, I encountered an error processing your request. Please try again.";
    }
  } else {
    aiContent = generateFallbackResponse(content);
  }

  const [aiMsg] = await db
    .insert(messagesTable)
    .values({ conversationId: convId, role: "assistant", content: aiContent })
    .returning();

  // suppress unused warning
  void userMsg;

  res.json({
    id: aiMsg.id,
    conversationId: aiMsg.conversationId,
    role: aiMsg.role,
    content: aiMsg.content,
    fileUrl: aiMsg.fileUrl,
    fileType: aiMsg.fileType,
    createdAt: aiMsg.createdAt.toISOString(),
  });
});

router.post("/ai/complete", requireAuth, async (req, res) => {
  const { prompt, systemPrompt, maxTokens } = req.body as {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
  };

  const [activeConfig] = await db
    .select()
    .from(apiConfigsTable)
    .where(and(eq(apiConfigsTable.feature, "chat"), eq(apiConfigsTable.isActive, true)))
    .limit(1);

  if (!activeConfig?.apiKey) {
    res.json({ text: "" });
    return;
  }

  try {
    const text = await callAIProvider(
      activeConfig,
      prompt,
      systemPrompt || "Faqat toza JSON qaytargin. Hech qanday qo'shimcha matn yo'q.",
      undefined,
      undefined,
      maxTokens || 400,
    );
    res.json({ text });
  } catch {
    res.json({ text: "" });
  }
});

async function callAIProvider(
  config: typeof apiConfigsTable.$inferSelect,
  content: string,
  systemPrompt: string,
  fileUrl?: string,
  fileType?: string,
  maxTokens = 1024,
): Promise<string> {
  if (config.provider === "groq") {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ];
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "llama-3.3-70b-versatile",
        messages,
        max_tokens: maxTokens,
      }),
    });
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content || "No response from AI.";
  }

  if (config.provider === "openai") {
    const messages: { role: string; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[] = [
      { role: "system", content: systemPrompt },
    ];
    if (fileUrl && fileType?.startsWith("image/")) {
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: fileUrl } },
          { type: "text", text: content },
        ],
      });
    } else {
      messages.push({ role: "user", content });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages,
        max_tokens: maxTokens,
      }),
    });
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content || "No response from AI.";
  }

  if (config.provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-3-haiku-20240307",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      }),
    });
    const data = await response.json() as { content?: { text?: string }[] };
    return data.content?.[0]?.text || "No response from AI.";
  }

  return generateFallbackResponse(content);
}

function generateFallbackResponse(content: string): string {
  return `Salom! Xabaringizni qabul qildim: "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}". AI javoblarini yoqish uchun admin paneldan Groq, OpenAI yoki Anthropic API kalitini sozlang.`;
}

export default router;
