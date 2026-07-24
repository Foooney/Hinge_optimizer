# Hinge Optimizer

App personnelle d'aide à la décision pour Hinge : résumé de profil, score de
compatibilité, recommandation, accroches. Toi seul décides de liker ou non.

Ceci est la version **autonome** de l'app (hors Claude.ai) : elle tourne sur
ton propre hébergement, avec ta propre clé API Anthropic. Ta clé reste
toujours côté serveur — jamais visible dans le navigateur.

**Aucune ligne de commande n'est nécessaire.** Tout se fait par clics, avec
GitHub Desktop, GitHub.com et Vercel.com.

---

## Étape 1 — Récupérer une clé API Anthropic

1. Va sur **[console.anthropic.com](https://console.anthropic.com)** et connecte-toi (ou crée un compte — c'est différent de ton compte Claude.ai, même si l'email peut être le même).
2. Dans le menu de gauche, clique **Settings**, puis **API Keys**.
3. Clique **Create Key**. Donne-lui un nom (ex : "hinge-optimizer"), valide.
4. Une clé apparaît, du genre `sk-ant-api03-xxxxxxxxx...`. **Copie-la tout de suite** dans une note sur ton téléphone ou ordinateur — elle ne sera plus jamais réaffichée en entier.
5. Toujours dans Settings, va dans **Billing**, ajoute une carte, et achète un crédit (5$ suffit pour commencer). Pas d'abonnement : tu paies uniquement ce que tu utilises.

## Étape 2 — Récupérer les fichiers du projet

1. Télécharge le fichier `hinge-optimizer-app.zip` que je t'ai donné (bouton de téléchargement dans la conversation).
2. Trouve-le dans ton dossier **Téléchargements**.
3. Fais un clic droit dessus → **Extraire tout** (Windows) ou double-clique dessus (Mac) pour le décompresser.
4. Tu obtiens un dossier `hinge-optimizer-app` contenant plusieurs fichiers et sous-dossiers (`src`, `api`, `public`...). Garde cet endroit en tête, tu en auras besoin à l'étape 4.

## Étape 3 — Installer GitHub Desktop et créer un compte GitHub

GitHub est là où le code va être rangé ; Vercel ira le chercher là pour le mettre en ligne.

1. Si tu n'as pas de compte GitHub, crée-en un gratuitement sur **[github.com](https://github.com)** (bouton "Sign up").
2. Télécharge **GitHub Desktop** : **[desktop.github.com](https://desktop.github.com)** → installe-le comme n'importe quel logiciel.
3. Ouvre GitHub Desktop, clique **Sign in to GitHub.com**, connecte-toi avec le compte créé à l'étape précédente.

## Étape 4 — Mettre le projet sur GitHub (toujours sans ligne de commande)

1. Dans GitHub Desktop, menu **File → Add local repository**.
2. Clique **Choose...** et sélectionne le dossier `hinge-optimizer-app` décompressé à l'étape 2.
3. GitHub Desktop va dire que ce dossier n'est pas encore un "repository" et proposer un bouton **create a repository**. Clique dessus.
4. Une fenêtre de création apparaît : laisse tout par défaut, clique **Create Repository**.
5. En haut à droite de GitHub Desktop, un bouton **Publish repository** apparaît. Clique dessus.
6. Décoche **"Keep this code private"** seulement si ça ne te dérange pas que le code soit public (le code ne contient aucune donnée personnelle ni ta clé API — celle-ci n'est jamais dans les fichiers). Sinon laisse coché pour rester privé. Clique **Publish Repository**.

Ton code est maintenant sur GitHub, dans un repository nommé `hinge-optimizer-app`.

## Étape 5 — Déployer sur Vercel

1. Va sur **[vercel.com](https://vercel.com)**, clique **Sign Up**, puis choisis **Continue with GitHub** (le plus simple, ça relie directement les deux comptes).
2. Une fois connecté, clique **Add New...** (en haut à droite) → **Project**.
3. Dans la liste des repositories GitHub, trouve **hinge-optimizer-app** et clique **Import** à côté.
   - S'il n'apparaît pas dans la liste, clique sur **"Adjust GitHub App Permissions"**, autorise Vercel à accéder à ce repository, puis reviens.
4. Vercel affiche un écran de configuration. Il détecte automatiquement **"Vite"** comme framework — ne touche à rien dans cette partie.
5. **Étape importante** : juste en dessous, clique pour déplier **Environment Variables**. Ajoute :
   - **Name** : `ANTHROPIC_API_KEY`
   - **Value** : colle la clé `sk-ant-...` récupérée à l'étape 1
   - Clique **Add**.
6. Clique le gros bouton **Deploy**.
7. Attends environ une minute. Un écran "Congratulations" apparaît avec une capture d'écran de ton app et un bouton pour visiter l'URL (du type `hinge-optimizer-app.vercel.app`).

## Étape 6 — Tester dans un navigateur

1. Clique **Visit** (ou copie l'URL affichée).
2. L'app doit s'afficher. Renseigne rapidement ton profil pour vérifier que "Enregistrer" fonctionne.

## Étape 7 — Installer sur ton S24 Ultra

1. Ouvre cette même URL Vercel dans **Chrome** sur ton téléphone.
2. Une bannière **"Ajouter à l'écran d'accueil" / "Installer l'application"** apparaît généralement en bas — accepte-la.
   - Sinon : menu **⋮** (trois points en haut à droite) → **Ajouter à l'écran d'accueil** → **Ajouter**.
3. Une icône apparaît sur ton écran d'accueil, comme une vraie app. Ouvre-la depuis là (pas depuis Chrome) : elle s'affiche en plein écran, sans barre d'adresse, et le bouton "+ Ajouter une image" fonctionne normalement.

---

## Mettre à jour l'app plus tard

Si je te redonne des fichiers modifiés :
1. Remplace les fichiers correspondants dans ton dossier `hinge-optimizer-app` local.
2. Dans GitHub Desktop, les changements apparaissent automatiquement dans la liste à gauche.
3. En bas à gauche, écris une courte description (ex : "mise à jour"), clique **Commit to main**.
4. Clique **Push origin** en haut.
5. Vercel redéploie tout seul en moins d'une minute — pas besoin de retoucher à Vercel.

## Notes

- **Coût** : facturé à l'usage sur ta clé API Anthropic (pas d'abonnement). Une
  analyse complète coûte quelques centimes. Suis ta consommation dans
  console.anthropic.com → **Usage**. Tarifs à jour sur [docs.claude.com](https://docs.claude.com/en/docs/about-claude/pricing).
- **Confidentialité** : tes données (profil, critères, historique) restent uniquement dans le stockage local de ton navigateur/téléphone, pas sur un serveur.
- Ce projet n'est ni affilié ni approuvé par Hinge ou Match Group.
