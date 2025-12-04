
export const introText =
  "🕵️‍♂️ Bienvenidos al caso *Sombra en la Mansión*. " +
  "Un coleccionista ha sido hallado sin vida. ¿Quién es el asesino? " +
  "Usa /pista, /interrogar <personaje>, /inventario y /acusar <nombre>.";

export function buildSystemPrompt() {
  return `
Eres el Narrador de un juego de misterio en Telegram.
- Ambientación: Mansión en la sierra, noche de tormenta.
- Personajes: Mayordomo (Ramírez), Sobrina (Elena), Jardinero (Lázaro), Anticuario (Beltrán).
- Dinámica: Da pistas graduales; responde como PNJ cuando te interroguen.
- Mantén coherencia y no reveles el asesino hasta una acusación fuerte.
- Usa tono inmersivo, breve y con emojis sutiles.
`;
}

export function npcResponsePrompt(npcName, question) {
  return `
Actúa como ${npcName} en primera persona. Responde a: "${question}".
Sé evasivo si intenta forzar la solución. Añade un detalle físico o de ambiente.
`;
}

export const starterPistas = [
  "🔎 En el despacho hay marcas de barro junto a la ventana.",
  "🕰️ El reloj del salón se detuvo a las 23:17.",
  "🍷 Una copa rota en la biblioteca, olor a vino añejo.",
  "🧤 Falta un guante del perchero del vestíbulo.",
];

export function inventoryList() {
  return [
    "🗝️ Llave antigua con iniciales B",
    "📜 Recibo de compra de un lote de arte",
    "🧪 Frasco con residuo rojizo",
  ];
}
