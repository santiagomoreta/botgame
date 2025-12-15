
export class GameState {
  constructor(guild, channel, keyword, players) {
    this.guild = guild;
    this.channel = channel;
    this.keyword = keyword;
    this.players = players;                  // Array<GuildMember>
    this.playerIds = new Set(players.map(p => p.id));
    this.impostorId = players[Math.floor(Math.random() * players.length)].id;
    this.hints = new Map();                  // userId -> texto
    this.votes = new Map();                  // voterId -> votedUserId
    this.active = true;
    this.phase = 'hints';                    // 'hints' | 'vote'
  }
}

export async function dm(member, content) {
  try {
    await member.send(content);
    return true;
  } catch {
    return false;
  }
}

export function displayName(guild, userId) {
  const m = guild.members.cache.get(userId);
   return m ? m.displayName : `ID:${userId}`;
}
