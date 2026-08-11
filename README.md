# Pangeas API

## Propositions de lieux

Les utilisateurs connectes et dont l'adresse e-mail est verifiee peuvent proposer un lieu avec 1 a 5 photos.
Les photos restent privees pendant la moderation puis sont publiees avec le lieu apres validation admin.

Recompenses lors de la publication :

- premiere proposition publiee : 300 points ;
- deuxieme : 250 points ;
- troisieme : 200 points ;
- suivantes : 150 points.

Routes utilisateur :

```text
GET    /api/place-submissions/reward-preview
POST   /api/place-submissions
GET    /api/place-submissions/me
GET    /api/place-submissions/:id
POST   /api/place-submissions/:id/resubmit
DELETE /api/place-submissions/:id
```

`POST /api/place-submissions` et `resubmit` utilisent `multipart/form-data`. Les photos sont envoyees dans le
champ `photos`. La creation exige aussi un en-tete `Idempotency-Key`.

Routes admin :

```text
GET  /api/admin/place-submissions
GET  /api/admin/place-submissions/:id
POST /api/admin/place-submissions/:id/request-changes
POST /api/admin/place-submissions/:id/reject
POST /api/admin/place-submissions/:id/publish
```

Notifications :

```text
GET  /api/notifications
POST /api/notifications/:id/read
```

Appliquer les migrations et regenerer le client apres avoir arrete les processus qui utilisent Prisma :

```text
npx prisma migrate dev
npx prisma generate
```

## Deploiement Ubuntu / Apache

Le script `scripts/deploy-production.sh` prepare un serveur Ubuntu avec Apache, Node.js, PM2,
MySQL et MongoDB sous Docker. Il compile le front Vite depuis la branche `v2`, applique les
migrations Prisma, conserve les fichiers televerses dans `/var/lib/pangeas` et configure le
reverse proxy pour `/api` et `/uploads`.

Premier lancement :

```bash
curl -fsSLo /tmp/pangeas-deploy.sh \
  https://raw.githubusercontent.com/SanchezSacha/Pangeas_API/v2/scripts/deploy-production.sh

sudo PANGEAS_DOMAIN=pangeas.example.fr bash /tmp/pangeas-deploy.sh
```

Le premier lancement cree `/etc/pangeas/pangeas.env` avec des secrets aleatoires puis
s'arrete. Seuls les identifiants SMTP doivent ensuite etre ajoutes manuellement. Relancer
la meme commande pour terminer. Si le domaine public pointe directement sur le serveur,
Certbot peut etre active :

```bash
sudo PANGEAS_DOMAIN=pangeas.example.fr \
  PANGEAS_ENABLE_CERTBOT=1 \
  PANGEAS_CERTBOT_EMAIL=administrateur@example.fr \
  PANGEAS_CONFIGURE_UFW=1 \
  bash /tmp/pangeas-deploy.sh
```

Si le HTTPS est termine par l'infrastructure de l'ecole, ne pas activer Certbot. Le site doit
malgre tout etre expose en HTTPS, car le cookie de session est `secure` en production.

Le script est relancable pour les mises a jour. Il utilise `git pull --ff-only`, `npm ci`,
`prisma migrate deploy`, puis recharge le processus PM2. Les sauvegardes et l'import des
donnees existantes restent des operations separees du deploiement.
