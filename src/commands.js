
import { GameState, dm, displayName } from './gameState.js';

export async function handlePrefixCommand(msg, games, PREFIX = '!') {
  const [cmd, ...args] = msg.content.slice(PREFIX.length).trim().split(/\s+/);

  if (cmd === 'impostor') {
    const hasPerm =
      msg.member.permissions.has('ManageGuild') ||
      msg.member.permissions.has('Administrator');

    if (!hasPerm) {
      return msg.reply('Necesitas permiso de gestionar servidor para iniciar partida.');
    }

    const role = msg.mentions.roles.first();
    if (!role) return msg.reply('Debes mencionar un rol. Ej: `!impostor @Jugadores volcan`');

    const keyword = args.slice(1).join(' ').trim();
    if (!keyword) return msg.reply('Debes indicar una palabra clave. Ej: `!impostor @Jugadores volcan`');

    const players = role.members.filter(m => !m.user.bot);
    if (players.size < 3) return msg.reply('Se necesitan al menos 3 jugadores en el rol.');

    if (games.has(msg.guild.id) && games.get(msg.guild.id).active) {
      return msg.reply('Ya hay una partida en curso en este servidor.');
    }

    const game = new GameState(msg.guild, msg.channel, keyword, [...players.values()]);
    games.set(msg.guild.id, game);

    await msg.channel.send(`🎲 **Juego del impostor** iniciado con ${players.size} jugadores en ${role.toString()}.`);
    await msg.channel.send('Cada jugador recibirá un DM con su palabra. Luego, enviad **una única pista** en este canal.');

    // Envío de DMs
    const failed = [];
    for (const p of game.players) {
      const text = (p.id === game.impostorId)
        ? '🤫 Tu palabra es: **impostor**.\nNo la digas; deja pistas convincentes.'
        : `🔑 Tu palabra clave es: **${game.keyword}**.\nNo digas la palabra directamente.`;
      const ok = await dm(p, text);
      if (!ok) failed.push(p);
    }

    if (failed.length) {
      await msg.channel.send(`⚠️ No pude enviar DM a: ${failed.map(m => m.toString()).join(', ')}. Revisad la privacidad (permitir DMs del servidor).`);
    }

    await msg.channel.send('⏱️ Tenéis **60s** para enviar vuestras pistas (una por jugador).');

    // Colección de pistas por 60s
    await collectHintsWithTimeout(msg.client, msg.guild.id, games, 60_000);

  } else if (cmd === 'votar') {
    const game = games.get(msg.guild.id);
    if (!game || !game.active || game.phase !== 'vote')
      return msg.reply('No estamos en fase de votación.');

    const target = msg.mentions.members.first();
    if (!target) return msg.reply('Debes mencionar a quién votas. Ej: `!votar @usuario`');

    if (!game.playerIds.has(msg.author.id))
      return msg.reply('No estás participando en esta partida.');

    if (!game.playerIds.has(target.id))
      return msg.reply('Sólo puedes votar a un jugador participante.');

    if (game.votes.has(msg.author.id))
      return msg.reply('Ya has votado.');

    game.votes.set(msg.author.id, target.id);
    await msg.react('🗳️');
    await msg.channel.send(`**${msg.member.displayName}** ha votado a **${target.displayName}**.`);
  }
}

async function collectHintsWithTimeout(client, guildId, games, timeoutMs) {
  const game = games.get(guildId);
  if (!game || !game.active) return;

  let finished = false;

  const listener = async (msg) => {
    if (finished) return;
    if (!msg.guild || msg.guild.id !== guildId) return;
    if (msg.author.bot) return;
    if (msg.channel.id !== game.channel.id) return;
    if (game.phase !== 'hints') return;

    if (!game.playerIds.has(msg.author.id)) {
      await msg.reply('Esta pista no cuenta (no estás en la lista de jugadores).');
      return;
    }
    if (game.hints.has(msg.author.id)) {
      await msg.reply('Ya has enviado tu pista.');
      return;
    }

    game.hints.set(msg.author.id, msg.content.trim());
    await msg.react('✅');

    if (game.hints.size === game.players.length) {
      finished = true;
      await game.channel.send('✅ Todas las pistas registradas.');
      await openVoting(game, games);
    }
  };

  client.on('messageCreate', listener);

  // Espera timeout de pistas
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  if (!finished) {
    finished = true;
    await openVoting(game, games);
  }

  client.off('messageCreate', listener);
}

async function openVoting(game, games) {
  if (!game.active) return;
  game.phase = 'vote';
  await game.channel.send('🗳️ **Fase de votación**: usad `!votar @usuario`. Tenéis **60s**.');
  await new Promise((resolve) => setTimeout(resolve, 60_000));
  await finishGame(game.guild.id, games);
}

async function finishGame(guildId, games) {
  const game = games.get(guildId);
  if (!game || !game.active) return;

  const tally = {};
  for (const voted of game.votes.values()) {
    tally[voted] = (tally[voted] || 0) + 1;
  }

  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  const lines = [];
  lines.push('📊 **Recuento de votos**:');
  if (sorted.length) {
    for (const [uid, n] of sorted) {
      lines.push(`- ${displayName(game.guild, uid)}: ${n}`);
    }
  } else {
    lines.push('- (Sin votos)');
  }

  const impostorName = displayName(game.guild, game.impostorId);
  lines.push(`\n🕵️ El impostor era: **${impostorName}**.`);

  if (sorted.length && String(sorted[0][0]) === String(game.impostorId)) {
    lines.push('🎉 ¡Bien jugado! Habéis descubierto al impostor.');
  } else {
    lines.push('🙈 El impostor ha sobrevivido. ¡La próxima será!');
  }

  lines.push('\n🧩 **Pistas registradas**:');
  for (const [uid, hint] of game.hints.entries()) {
    lines.push(`- ${displayName(game.guild, uid)}: ${hint}`);
  }

  await game.channel.send(lines.join('\n'));
   game.active = false;
