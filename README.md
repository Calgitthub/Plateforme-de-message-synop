# Plateforme SYNOP

Plateforme web de saisie, de supervision et d'historisation des messages météorologiques SYNOP pour les stations DMZ, avec gestion des utilisateurs et contrôle d'accès par rôles.

---

## Fonctionnalités principales

- **Configuration initiale sécurisée (`/setup`)** : Création du compte Administrateur racine avec question de sécurité pour la récupération de mot de passe.
- **Authentification et contrôle d'accès (`/login`, `/forgot-password`)** :
  - Connexion par jeton JWT (expiration 24h) et mots de passe chiffrés (`bcryptjs`).
  - Réinitialisation de mot de passe via question secrète.
  - Deux rôles : `ADMIN` (supervision globale) et `MEMBER` (observateur rattaché à une station DMZ).
- **Espace Observateur (`/member`)** :
  - Création et consultation des saisies SYNOP rattachées à la station DMZ de l'utilisateur.
  - Modification des saisies existantes avec journalisation automatique.
- **Espace Administrateur (`/admin`)** :
  - **Tableau de bord analytique** : Graphiques de ponctualité des transmissions sur les dernières 24 heures et les 7 derniers jours (avant / après H+15).
  - **Surveillance des retards** : Détection automatique des stations DMZ n'ayant pas transmis dans le créneau réglementaire (tolérance de 15 minutes par heure sur les 12 dernières heures).
  - **Gestion des stations DMZ** : Création, renommage et suppression (si aucune donnée/utilisateur lié).
  - **Gestion des utilisateurs** : Création, modification, attribution de rôle et de station DMZ, protection de l'administrateur racine.
  - **Supervision et historique des saisies** : Filtrage par date, heure, station DMZ et utilisateur, consultation de l'historique complet des modifications (`SaisieLog`), exports PDF (`jsPDF`) et sauvegarde complète au format JSON.

---

## Stack technique

- **Frontend** : React 19, TypeScript, Vite, React Router DOM, Tailwind CSS v4, Lucide React, Motion, Recharts, jsPDF, Axios.
- **Backend** : Node.js, Express, TypeScript (`tsx`).
- **Base de données & ORM** : Prisma ORM (`@prisma/client`) avec SQLite (`prisma/dev.db`) en développement local (compatible PostgreSQL pour la production).
- **Sécurité & Validation** : JWT (`jsonwebtoken`), `bcryptjs`, `zod`, `cors`.

---

## Structure du projet

```text
├── prisma/
│   ├── schema.prisma        # Modèles Prisma (Role, DMZ, User, Saisie, SaisieLog)
│   └── seed.ts              # Initialisation des rôles (ADMIN, MEMBER) et DMZ CENTRAL
├── src/
│   ├── components/          # Composants partagés (Layout, ToastNotification)
│   ├── pages/               # Pages (Login, SetupAdmin, ForgotPassword, AdminDashboard, MemberDashboard)
│   ├── App.tsx              # Routage React Router et protection des routes
│   ├── AuthContext.tsx      # Contexte d'authentification JWT
│   └── main.tsx             # Point d'entrée React
├── server.ts                # Serveur Express (API REST + middleware Vite en dev / static en prod)
├── vercel.json              # Règles de réécriture SPA pour Vercel
├── package.json             # Dépendances et scripts npm
└── .env.example             # Exemple de variables d'environnement
```

---

## Prérequis

- **Node.js** (v18 ou supérieur recommandé)
- **npm**

---

## Installation et lancement en local

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Configurer les variables d'environnement** :
   Créez un fichier `.env` à la racine du projet (vous pouvez vous baser sur `.env.example`) :
   ```env
   JWT_SECRET="votre-cle-secrete-jwt"
   ```

   > *Note sous Windows PowerShell* : Si l'exécution de scripts est bloquée (`PSSecurityException`), utilisez l'invite de commandes (`cmd`), Git Bash, ou autorisez les scripts dans votre terminal PowerShell avec :
   > ```powershell
   > Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   > ```

3. **Initialiser la base de données Prisma et les données de départ** :
   ```bash
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

4. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```
   L'application est accessible sur **http://localhost:3000**.

5. **Première utilisation** :
   Ouvrez **http://localhost:3000/setup** pour créer le compte Administrateur racine, puis connectez-vous sur `/login`.

---

## Scripts disponibles

| Script | Description |
|---|---|
| `npm run dev` | Démarre le serveur Express + Vite en mode développement sur le port 3000 |
| `npm run build` | Compile l'application frontend React dans le dossier `dist/` |
| `npm run start` | Démarre le serveur Express en production (`node server.ts`) |
| `npm run preview` | Prévisualise le build Vite |
| `npm run lint` | Vérifie le typage TypeScript (`tsc --noEmit`) |
| `npm run clean` | Supprime le dossier `dist/` |

---

## Routes principales

### Pages Frontend
- `/setup` : Initialisation du premier compte Administrateur
- `/login` : Connexion à la plateforme
- `/forgot-password` : Récupération de mot de passe par question secrète
- `/admin` : Tableau de bord Administrateur (`/admin/users`, `/admin/entries`, `/admin/dmz`)
- `/member` : Interface de saisie pour les observateurs DMZ

### API REST (`/api`)
- `GET /api/auth/setup-status` & `POST /api/auth/setup-root-admin` : Vérification et création de l'admin racine
- `POST /api/auth/login` : Authentification et génération du token JWT
- `POST /api/auth/recovery-question` & `POST /api/auth/reset-password` : Récupération de mot de passe
- `GET/POST/PUT/DELETE /api/users` : Gestion des utilisateurs (Admin)
- `GET/POST/PUT/DELETE /api/dmzs` : Gestion des stations DMZ
- `GET/POST/PUT/DELETE /api/saisies` & `GET /api/saisies/me` : Gestion des saisies SYNOP
- `GET /api/logs/:saisieId` : Historique des modifications d'une saisie (Admin)
- `GET /api/monitoring/late-stations` : Vérification des stations en retard de transmission
- `GET /api/backup/export` : Export complet de la base au format JSON (Admin)

---

## Déploiement en production

- **Base de données** : SQLite (`prisma/dev.db`) est adapté au développement local. Pour un déploiement cloud (Vercel, Render, Railway, etc.), configurez `prisma/schema.prisma` avec un fournisseur persistant tel que **PostgreSQL** (Neon, Supabase, etc.) via `DATABASE_URL` afin de ne pas perdre les comptes et saisies entre deux redémarrages.
- **Hébergement** :
  - Ce projet inclut un serveur Express complet (`server.ts`) servant l'API et le frontend. Il peut être déployé directement sur des plateformes Node.js persistantes comme **Render** ou **Railway** (`npm run build` puis `NODE_ENV=production npm start`).
  - Sur **Vercel**, `vercel.json` gère le routage SPA des pages React (`/setup`, `/login`, etc.), mais l'API Express et la base de données doivent être hébergées séparément ou adaptées en fonctions serverless avec une base de données distante.
