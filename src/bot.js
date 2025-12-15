
import 'dotenv/config';
import {
  Client, GatewayIntentBits, Partials, Events
} from 'discord.js';
import { GameState } from './gameState.js';
import { handlePrefixCommand, PREFIX } from './commands.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // ver notas sobre intent privilegiado
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const games = new Map(); // guildId -> GameState

client.on(Events.MessageCreate, async (msg) => {
  if (!msg.guild || msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;
  await handlePrefixCommand(msg, games);
});

client.once(Events.ClientReady, (c) => {
  console.log(`Conectado como ${c.user.tag  console.log(`Conectado como ${c.user.tag}`);
});

