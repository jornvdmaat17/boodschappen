# Boodschappen

Gedeelde boodschappenlijst-app: producten, recepten, vaste items en lijsten die automatisch gesorteerd worden op de looproute van de winkel. Live sync tussen apparaten via WebSockets.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind (nginx in productie)
- **Backend:** Node.js + Express + Socket.io
- **Database:** PostgreSQL (Docker)

## Lokaal draaien (Docker)

```bash
cp .env.example .env   # pas wachtwoorden aan
docker compose up -d --build
```

App: http://localhost:8085 — inloggen met `ADMIN_EMAIL` / `ADMIN_PASSWORD` uit `.env`
(default: `jorn.vandermaat@blueprintautomation.nl` / `boodschappen`).

Het account wordt bij de eerste start automatisch aangemaakt. Sessies blijven 30 dagen geldig.

## Lokaal ontwikkelen (zonder Docker voor de app)

```bash
# database
docker compose up -d postgres

# backend (poort 5000)
cd backend && npm install && npm run dev

# frontend (poort 3000, proxied naar backend)
cd frontend && npm install && npm run dev
```

## Eerste gebruik

1. **Winkels** → voeg een winkel toe (bijv. Lidl) en stel de categorie-volgorde in (= looproute).
2. **Producten** → voeg producten toe met een categorie.
3. **Vaste items** → markeer producten die je (bijna) elke week koopt.
4. **Recepten** → maak recepten van producten.
5. **Weeklijst** → kies per dag een recept, genereer de lijst. Vaste items komen er automatisch bij.

## Deployment (AWS EC2 + Cloudflare)

1. **EC2:** Ubuntu 22.04, t3.micro/small. Security group: poort 22 (SSH) en 80 (of 8080) open.
2. Installeer Docker: `sudo apt update && sudo apt install -y docker.io docker-compose-v2`
3. Clone de repo, maak `.env` aan met sterke wachtwoorden en zet `CORS_ORIGIN` op je domein.
4. `docker compose up -d --build`
5. **Cloudflare:** A-record naar het EC2 IP, proxy aan (oranje wolkje), SSL-modus "Flexible" (of zet zelf een certificaat op de EC2 en gebruik "Full").
6. Poort 8085 → wil je poort 80, wijzig in `docker-compose.yml` bij frontend `"80:80"`.

### Backups

```bash
docker compose exec -T postgres pg_dump -U boodschappen boodschappen > backup_$(date +%Y%m%d).sql
```

### Updaten

```bash
git pull && docker compose up -d --build
```
