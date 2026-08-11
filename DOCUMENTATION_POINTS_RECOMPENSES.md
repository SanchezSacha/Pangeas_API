# Points, recompenses et dons - Backend MVP

## Principes metier

- Une premiere visite validee d'un lieu rapporte 30 points.
- Un lieu ne rapporte les points de visite qu'une seule fois par utilisateur.
- Premiere visite Pangeas : 70 points bonus.
- Premiere visite d'une categorie : 30 points bonus.
- Paliers globaux : 10, 25, 50 et 100 lieux uniques.
- Paliers de categorie : 5, 10, 20 et 50 lieux uniques.
- Un lieu propose et approuve pourra rapporter 150 points lorsque le workflow de moderation l'appellera.
- Les points sont attribues et depenses uniquement par le serveur.
- Toutes les operations financieres utilisent une transaction Prisma serialisable.
- `totalPoints` represente les points gagnes depuis la creation du compte ; `availablePoints` est le solde depensable.

Les visites historiques anterieures au lancement ne sont pas creditees automatiquement. La premiere validation recompensee apres le lancement devient la reference unique du lieu.

## API utilisateur

Toutes les routes necessitent une session authentifiee.

### Points

- `GET /api/points/summary` : solde, total gagne, progression globale et par categorie.
- `GET /api/points/history?page=1&limit=20` : registre pagine des gains et depenses.
- `GET /api/points/visits/:placeId/preview` : estimation detaillee avant validation.
- `POST /api/visit/validate` : retourne maintenant un objet `points` avec le detail du gain reel.

### Coupons

- `GET /api/rewards` : catalogue actif et stock disponible.
- `GET /api/rewards/mine` : coupons deja recuperes par l'utilisateur.
- `GET /api/rewards/:id` : detail et conditions d'une offre.
- `POST /api/rewards/:id/redeem` : echange atomique de points contre un code.

L'echange exige un en-tete `Idempotency-Key` de 8 a 80 caracteres. Une meme cle renvoie le meme resultat et ne debite jamais deux fois le compte.

### Dons finances par les partenaires

- `GET /api/donations/campaigns` : campagnes actives, budget et progression.
- `GET /api/donations/mine` : historique personnel.
- `POST /api/donations/campaigns/:id/redeem` avec `{ "amount": 5 }` : declenche 5, 10 ou 25 euros.

Cette route exige egalement `Idempotency-Key`. Le cout par defaut est de 400 points par euro, soit 2 000 points pour 5 euros. Le don reste `pending` jusqu'a confirmation administrative.

## API administrateur

- `GET|POST /api/admin/partners`
- `PATCH|DELETE /api/admin/partners/:id` (suppression logique)
- `GET /api/admin/rewards` et `GET /api/admin/rewards/:id`
- `POST /api/admin/rewards`
- `PATCH /api/admin/rewards/:id`
- `DELETE /api/admin/rewards/:id` (suppression logique)
- `POST /api/admin/rewards/:id/codes`
- `PATCH /api/admin/coupon-codes/:id/status`
- `GET|POST /api/admin/donation-campaigns`
- `PATCH|DELETE /api/admin/donation-campaigns/:id` (suppression logique)
- `GET /api/admin/donations`
- `PATCH /api/admin/donations/:id/status` avec `confirmed` ou `cancelled`.

Une annulation de don rend automatiquement les points a l'utilisateur et diminue le montant engage dans la campagne.

## Securite et coherence

- Le registre `point_transactions` est conserve ; les remboursements ajoutent une nouvelle ligne.
- Les contraintes uniques bloquent les doubles visites, paliers et echanges.
- Les validations de visite, gains, debits, reservations de coupons et budgets sont transactionnels.
- Les transactions serialisables sont retentees trois fois lors d'un conflit de concurrence Prisma `P2034`.
- Les mutations restent protegees par la protection CSRF globale de l'application.
- Les codes ne doivent jamais etre places dans les journaux applicatifs.

Pour une version de production, les codes coupons devront aussi etre chiffres au repos et le controle anti-fraude GPS devra etre renforce.

## Migration

La migration `20260802090000_add_rewards_feature` ajoute les champs des offres, des campagnes et les cles d'idempotence. Elle a ete appliquee avec succes sur la base locale le 2 aout 2026.
