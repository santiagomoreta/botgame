
// src/index.js
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
  personajesText,
} from "./gameLogic.js";

dotenv.config();

// ======== Config y utilidades ========
const {
  TELEGRAM_TOKEN,
  OPENAI_API_KEY,
  RENDER_EXTERNAL_URL, // Render la rellena automáticamente
  PUBLIC_URL,          // alternativa manual si quieres forzar URL pública
  BOT_SECRET = "secret-" + Math.random().toString(36).slice(2)
} = process.env;

if (!TELEGRAM_TOKEN) {
  console.error("❌ Falta TELEGRAM_TOKEN");
  process.exit(1);
}

// Log diagnóstico no sensible (no imprime la clave)
if (!OPENAI_API_KEY) {
  console.warn("ℹ️ OPENAI_API_KEY no definido: el bot funcionará en modo 'fallback' sin IA.");
} else {
  console.log("✅ OPENAI_API_KEY detectada (longitud):", OPENAI_API_KEY.trim().length);
}

function getOpenAI() {
  const key = OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    return new OpenAI({ apiKey: key });
  } catch (e) {
    console.error("Error inicializando OpenAI:", e);
    return null;
  }
}

// ======== Estado por chat (en memoria) ========
// Estructura: sessions.get(chatId) => { phase: 'idle'|'await_names'|'active', characters: string[] }
const sessions = new Map();
function session(chatId) {
  if (!sessions.has(chatId)) sessions.set(chatId, { phase: "idle", characters: [] });
  return sessions.get(chatId);
}


// ======== Webhook (Express) ========
const app = express();
app.use(express.json());

const bot = new TelegramBot(TELEGRAM_TOKEN, { webHook: true });

const baseUrl = RENDER_EXTERNAL_URL || PUBLIC_URL || "";
const webhookPath = `/telegram/${BOT_SECRET}`;
const webhookUrl = `${baseUrl}${webhookPath}`;

// Endpoint del webhook para Telegram
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health y diagnóstico opcional
app.get("/", (_, res) => res.send("Mystery Bot vivo ✅"));
app.get("/env", (_, res) =>
  res.json({
    hasOpenAIKey: Boolean(OPENAI_API_KEY),
    keyLength: OPENAI_API_KEY?.trim().length || 0,
    webhookUrlConfigured: Boolean(baseUrl),
    webhookPath
  })
);

// Arrancar servidor y registrar webhook
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  try {
    await bot.deleteWebHook();
    if (!baseUrl) {
      console.warn("⚠️ No hay URL pública detectada (RENDER_EXTERNAL_URL/PUBLIC_URL). Tras el primer deploy, Render suele rellenarla. Si el webhook no se registra, vuelve a desplegar o define PUBLIC_URL.");
    }
    if (baseUrl) {
      await bot.setWebHook(webhookUrl, {
        drop_pending_updates: true,
        allowed_updates: ["message"] // suficiente para este flujo
      });
      console.log("🔗 Webhook registrado en:", webhookUrl);
    }
  } catch (e) {
    console.error("Error configurando webhook:", e?.response || e);
  }
});

// ======== Comandos ========

// /start → pide los nombres (sin preguntar cantidad)
bot.onText(/\/start(@.+)?/, async (msg) => {
  const chatId = msg.chat.id;
  const s = session(chatId);
  s.phase = "await_names";
  s.characters = [];

  await bot.sendMessage(
    chatId,
    introText,
    { parse_mode: "Markdown" }
  );
});

// Handler de mensajes durante la configuración de nombres
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const s = session(chatId);

  // Ignora comandos u otros tipos de mensajes
  if (!text || text.startsWith("/")) return;

  if (s.phase === "await_names") {
    // Aceptamos nombres separados por comas o saltos de línea
    const names = text
      .split(/[,|\n]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Validaciones suaves
    if (names.length < 2) {
      return bot.sendMessage(chatId, "Necesito al menos *2 nombres*. Escríbelos separados por comas.", { parse_mode: "Markdown" });
    }
    if (names.length > 20) {
      return bot.sendMessage(chatId, "Demasiados nombres a la vez 😅. Prueba con un máximo de 20.");
    }

    // Elimina duplicados (case-insensitive)
    const unique = [];
    const seen = new Set();
    for (const n of names) {
      const k = n.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(n);
      }
    }

    s.characters = unique;
    s.phase = "active";

    await bot.sendMessage(
      chatId,
      personajesText(unique),
      { parse_mode: "Markdown" }
    );
  }
});

// /personajes → lista actual
bot.onText(/\/personajes(@.+)?/, async (msg) => {
  const chatId = msg.chat.id;
  const s = session(chatId);
  if (!s.characters.length) {
    return bot.sendMessage(chatId, "Aún no hay personajes. Usa /start para configurarlos.");
  }
  await bot.sendMessage(chatId, `Elenco (${s.characters.length}):\n- ${s.characters.join("\n- ")}`);
});

// /pista → pista aleatoria
bot.onText(/\/pista(@.+)?/, async (msg) => {
  const chatId = msg.chat.id;
  const idx = Math.floor(Math.random() * starterPistas.length);
  await bot.sendMessage(chatId, starterPistas[idx]);
});

// /interrogar <nombre> → PNJ responde (con IA si está disponible)
bot.onText(/\/interrogar (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const s = session(chatId);
  const nombre = match?.[1]?.trim();

  if (!s.characters.length) {
    return bot.sendMessage(chatId, "Primero configura los personajes con /start.");
  }
  // Busca exacto case-insensitive
  const found = s.characters.find(c => c.toLowerCase() === nombre.toLowerCase());
  if (!found) {
    return bot.sendMessage(chatId, `No encuentro al personaje "${nombre}". Usa /personajes para ver la lista.`);
  }

  const openai = getOpenAI();
  if (!openai) {
    return bot.sendMessage(chatId, `(${found}) Se aclara la garganta: "Yo estaba en el invernadero cuando escuché un golpe."`);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(s.characters) },
        { role: "user", content: npcResponsePrompt(found, "El grupo te interroga.") }
      ],
      temperature: 0.7,
      max_tokens: 250
    });
    const text = completion.choices[0]?.message?.content?.trim();
    await bot.sendMessage(chatId, text || `(${found}) mira hacia la ventana y evita responder…`);
  } catch (e) {
    console.error("Error OpenAI:", e?.response || e);
    await bot.sendMessage(chatId, "No pude generar la respuesta del interrogatorio. Intenta de nuevo.");
  }
});

// /acusar <nombre> → registra la acusación
bot.onText(/\/acusar (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const acusado = match?.[1]?.trim();
  if (!acusado) return bot.sendMessage(chatId, "Uso: /acusar <nombre>");
  await bot.sendMessage(chatId, `⚖️ Acusación registrada: *${acusado}*. El Narrador evaluará las pruebas…`, {
    parse_mode: "Markdown"
  });
});

// /reset → reinicia la partida para ese chat
bot.onText(/\/reset(@.+)?/, async (msg) => {
  const chatId = msg.chat.id;
  sessions.set(chatId, { phase: "idle", characters: [] });
  await bot.sendMessage(chatId, "🔄 Partida reiniciada. Usa /start para configurar nuevos nombres.");
});
