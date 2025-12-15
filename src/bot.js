
import {
  Client, GatewayIntentBits, Partials, Events, PermissionsBitField
} from 'discord.js';

export function startBot(token, options = {}) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,     // listar miembros de un rol
      GatewayIntentBits.GuildMessages,    // escuchar mensajes
      GatewayIntentBits.MessageContent,   // leer contenido (ver nota abajo)
      GatewayIntentBits.DirectMessages    // DMs
    ],
    partials: [Partials.Channel]          // necesario para DMs
  });

  const { games, prefix = '!' } = options;

  client.on(Events.MessageCreate, async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    if (!msg.content.startsWith(prefix)) return;

    // Permiso recomendado para iniciar partida
    if (msg.content.startsWith(`${prefix}impostor`)) {
      const canManage =
        msg.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
        msg.member.permissions.has(PermissionsBitField.Flags.Administrator);
      if (!canManage) {
        return msg.reply('Necesitas permiso de gestionar servidor para iniciar partida.');
      }
    }

    // Carga dinámica de comandos para evitar import circular
    const { handlePrefixCommand } = await import('./commands.js');
    await handlePrefixCommand(msg, games, prefix);
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`Conectado como ${c.user.tag} (id=${c.user.id})`);
  });

  client.login(token).catch(err => {
    console.error('Error al iniciar sesión en Discord:', err);
    process.exit(1);
  });

  return client;
}

/*
NOTA SOBRE MESSAGE CONTENT INTENT:
- Bots NO verificados y en <100 servidores pueden leer message.content si habilitas el intent en el portal y en el cliente.
- Bots verificados y en ≥100 servidores deben solicitar el intent privilegiado.


