
import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import {
  introText,
  buildSystemPrompt,
  npcResponsePrompt,
  starterPistas,
  inventoryList,
} from "./gameLogic.js";

dotenv.config();

const {
  TELEGRAM_TOKEN,
  RENDER_EXTERNAL_URL, // Render la inyecta en Web Services; si no, usa tu propia URL
  OPENAI_API_KEY,
  BOT_SECRET = "secret-" + Math.random().toString(36).slice(2),
} = process.env;

if (!TELEGRAM_TOKEN) {
  console.error("Falta TELEGRAM_TOKEN en variables de entorno");
  process.exit(1);
}

const app = express();
app.use(express.json());

// Bot en modo webhook (no polling)
const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });

// Construye la URL pública (Render define RENDER_EXTERNAL_URL)
const baseUrl =
  RENDER_EXTERNAL_URL ||
  process.env.PUBLIC_URL || // por si desplegas en otro sitio
  "";
const webhookPath = `/telegram/${BOT_SECRET}`;
const webhookUrl = `${baseUrl}${webhookPath}`;

// Configura webhook en Telegram
async function setupWebhook() {
  try {
    // Desactiva potenciales webhooks previos y establece el nuevo
    await bot.deleteWebHook();
    await bot.setWebHook(webhookUrl, { drop_pending_updates: true });
    console.log("Webhook establecido en:", webhookUrl);
  } catch (err) {
    console.error("Error al configurar webhook:", err?.response || err);
  }
}

// Endpoint que recibe updates de Telegram
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Salud
app.get("/", (_, res) => {
  res.send("Mystery Bot activo ✅");
});

// Comandos
bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(msg.chat.id, introText, { parse_mode: "Markdown" });
});

bot.onText(/\/pista/, async (msg) => {
  const idx = Math.floor(Math.random() * starterPistas.length);
  await bot.sendMessage(msg.chat.id, starterPistas[idx]);
});

bot.onText(/\/inventario/, async (msg) => {
  const items = inventoryList().join("\n");
  await bot.sendMessage(msg.chat.id, `Inventario:\n${items}`);
});

bot.onText(/\/interrogar (.+)/, async (msg, match) => {
  const personaje = match?.[1]?.trim();
  if (!personaje) {
    return bot.sendMessage(msg.chat.id, "Uso: /interrogar <personaje>");
  }

  const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
  const userText = `El jugador interroga a ${personaje}. Responde como PNJ.`;

  try {
    if (!openai) {
      // Modo sin IA (respuesta fija)
      return bot.sendMessage(
        msg.chat.id,
        `(${personaje}) Suspira: 'No sé de qué me habla… estaba en el invernadero cuando oí un golpe.'`
      );
    }

    const system = buildSystemPrompt();
    const prompt = npcResponsePrompt(personaje, userText);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    await bot.sendMessage(msg.chat.id, text || "El PNJ guarda silencio…");
  } catch (err) {
    console.error("Error OpenAI:", err?.response || err);
    await bot.sendMessage(
      msg.chat.id,
      "No pude generar la respuesta del interrogatorio. Intenta de nuevo."
    );
  }
});

bot.onText(/\/acusar (.+)/, async (msg, match) => {
  const acusado = match?.[1]?.trim();
  if (!acusado) {
    return bot.sendMessage(msg.chat.id, "Uso: /acusar <nombre>");
  }
  await bot.sendMessage(
    msg.chat.id,
    `⚖️ Acusación registrada: *${acusado}*. El Narrador evaluará las pruebas…`,
    { parse_mode: "Markdown" }
  );
});

// Arranca servidor y configura webhook
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
  if (!baseUrl) {
    console.warn(
      "⚠️ No se detectó URL pública. En Render, RENDER_EXTERNAL_URL se rellena automáticamente tras el primer deploy. Vuelve a desplegar si el webhook no se establece."
    );
  }
  await setupWebhook();
});
