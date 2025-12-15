
import 'dotenv/config';
import express from 'express';
import { startBot } from './src/bot.js';
import { GameState } from './src/gameState.js';

// Estado por servidor para el bot
const games = new Map();

// Inicializa el bot con el token y el estado
startBot(process.env.DISCORD_TOKEN, { games, prefix: '!' });

// Servidor web para Render (health check + info)
const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Impostor Bot está activo ✅');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web Service escuchando en puerto ${PORT} (health: /health)`);
});
