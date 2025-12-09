
export const introText =
  "🕵️‍♂️ *Bienvenidos al caso.*\n\n" +
  "Escribe ahora los *nombres de los personajes* separados por comas.\n" +
  "Ejemplos:\n" +
  "• `Ramírez, Elena, Lázaro, Beltrán`\n" +
  "• `Ana, Bruno, Carla`";

export function buildSystemPrompt(characters = []) {
  const elenco = characters.length ? characters.join(", ") : "—";
  return `
    Eres el Narrador de un juego de misterio en un grupo de Telegram.
    - Ambientación: Mansión en la sierra, noche de tormenta.
    - Personajes de esta partida: ${elenco}.
    - Dinámica: ofrece pistas graduales; responde como PNJ cuando te interroguen.
    - No reveles el asesino hasta que haya acusaciones con pruebas.
    - Estilo inmersivo, conciso y con detalles sensoriales.
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

export function personajesText(unique) {
  return `✅ Personajes configurados (${unique.length}):\n- ${unique.join("\n- ")}\n\n` +
    "🎲 ¡Comienza el misterio!\n" +
    "• `/pista` → una pista\n" +
    "• `/personajes` → ver elenco\n" +
    "• `/interrogar <nombre>` → hablar con un PNJ\n" +
    "• `/acusar <nombre>` → registrar una acusación\n" +
    "• `/reset` → reiniciar la partida";
}
