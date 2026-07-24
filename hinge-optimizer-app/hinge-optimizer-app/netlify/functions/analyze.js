// Équivalent Netlify Functions de api/analyze.js — même logique, format
// d'entrée/sortie différent (event/response au lieu de req/res).
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { message: "Méthode non autorisée" } }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          message:
            "ANTHROPIC_API_KEY n'est pas configurée sur le serveur. Ajoute-la dans les variables d'environnement de ton hébergeur.",
        },
      }),
    };
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: event.body,
    });

    const data = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: { "Content-Type": "application/json" },
      body: data,
    };
  } catch (e) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: { message: "Impossible de joindre l'API Anthropic. Réessaie." } }),
    };
  }
}
