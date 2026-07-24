// Fonction serverless (Vercel). Reçoit le payload du front-end, y attache la
// clé API (jamais exposée au navigateur), l'envoie à l'API Anthropic, et
// retransmet la réponse telle quelle.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Méthode non autorisée" } });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: {
        message:
          "ANTHROPIC_API_KEY n'est pas configurée sur le serveur. Ajoute-la dans les variables d'environnement de ton hébergeur.",
      },
    });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(502).json({
      error: { message: "Impossible de joindre l'API Anthropic. Réessaie." },
    });
  }
}
