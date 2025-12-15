import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  PermissionsBitField
} from 'discord.js';

export function startBot(token, options = {}) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
  });

  const { games, prefix = '!' } = options;

  client.on(Events.MessageCreate, async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    if (!msg.content.startsWith(prefix)) return;

    if (msg.content.startsWith(`${prefix}impostor`)) {
      const canManage =
        msg.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
        msg.member.permissions.has(PermissionsBitField.Flags.Administrator);
      if (!canManage) {
        return msg.reply('Necesitas permiso de gestionar servidor para iniciar partida.');
      }
    }

    const { handlePrefixCommand } = await import('./commands.js');
    await handlePrefixCommand(msg, games, prefix);
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`Conectado como ${c.user.tag} (id=${c.user.id})`);
  });

  client.login(token).catch((err) => {
    console.error('Error al iniciar sesión en Discord:', err);
       process.exit(1);
  });

  return client;
  
