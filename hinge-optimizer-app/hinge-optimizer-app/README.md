# Hinge Optimizer

App personnelle d'aide à la décision pour Hinge : résumé de profil, score de
compatibilité, recommandation, accroches. Toi seul décides de liker ou non.

Ceci est la version **autonome** de l'app (hors Claude.ai) : elle tourne sur
ton propre hébergement, avec ta propre clé API Anthropic. Ta clé reste
toujours côté serveur (dans `api/analyze.js`) — jamais visible dans le
navigateur.

---

## 1. Récupérer une clé API Anthropic

1. Va sur **[console.anthropic.com](https://console.anthropic.com)** et connecte-toi (ou crée un compte — distinct de ton compte Claude.ai).
2. **Settings → API Keys → Create Key**. Copie la clé (elle commence par `sk-ant-...`), tu ne pourras plus la revoir ensuite. nnement, tu paies uniquement les tokens utilisés.

Garde cette clé pour l'étape 3. Ne la mets jamais dans un fichier commité sur GitHub.

## 2. Mettre le code sur GitHub

```bash
cd hinge-optimizer-app
git init
git add .
git commit -m "Hinge Optimizer"
```

Crée un nouveau repo (vide) sur GitHub, puis :

```bash
git remote add origin https://github.com/TON_COMPTE/hinge-optimizer.git
git branch -M main
git push -u origin main
```

## 3. Déployer

### Option A — Vercel (recommandé)

1. Sur [vercel.com](https://vercel.com) → **Add New → Project** → importe ton repo GitHub.
2. Vercel détecte Vite automatiquement. Ne change rien aux réglages de build.
3. Avant de cliquer "Deploy", ouvre **Environment Variables** et ajoute :
   - `ANTHROPIC_API_KEY` = ta clé de l'étape 1
4. Clique **Deploy**. Au bout d'une minute, tu as une URL du type `hinge-optimizer.vercel.app`.

### Option B — Netlify

1. Sur [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → ton repo GitHub.
2. Build command et publish directory sont déjà définis dans `netlify.toml`, rien à changer.
3. **Site settings → Environment variables** → ajoute `ANTHROPIC_API_KEY`.
4. Déploie.

Les deux options fonctionnent avec le même code — `netlify.toml` redirige `/api/analyze` vers l'équivalent Netlify Functions.

## 4. Installer l'app sur ton S24 Ultra

1. Ouvre l'URL de ton déploiement dans **Chrome** sur ton téléphone.
2. Menu (⋮) → **Ajouter à l'écran d'accueil** (ou une bannière d'installation apparaît automatiquement après quelques secondes).
3. L'icône s'installe comme une vraie app : elle s'ouvre en plein écran, sans barre d'adresse Chrome, et le sélecteur de photos fonctionne normalement (plus de restriction WebView, puisque ce n'est plus un artifact intégré).

## Développement local (optionnel)

```bash
npm install
npm run dev
```

La fonction serveur (`/api/analyze`) n'est pas servie par `vite dev` seul. Pour tester en local avec la fonction serveur incluse, utilise la CLI de ton hébergeur :

```bash
npm install -g vercel
vercel dev
```

ou pour Netlify :

```bash
npm install -g netlify-cli
netlify dev
```

Crée un fichier `.env` (copie de `.env.example`) avec ta clé pour ces commandes.

## Mettre à jour l'app plus tard

Toute modification → `git add . && git commit -m "..." && git push`. Vercel et
Netlify redéploient automatiquement à chaque push sur `main`.

## Notes

- **Coût** : facturé à l'usage sur ta clé API Anthropic (pas d'abonnement). Une
  analyse complète coûte quelques centimes. Voir [la page tarifs Anthropic](https://docs.claude.com/en/docs/about-claude/pricing) pour les tarifs à jour.
- **Confidentialité** : tes données (profil, critères, historique) sont stockées uniquement dans le stockage local de ton navigateur/téléphone (`localStorage`), pas sur un serveur.
- Ce projet n'est ni affilié ni approuvé par Hinge ou Match Group.
