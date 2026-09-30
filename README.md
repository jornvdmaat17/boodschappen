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

## Deployment (AWS EC2 + Cloudflare Tunnel)

Met een Cloudflare Tunnel hoeft er **geen enkele inkomende poort** open op de EC2
(alleen 22 voor SSH). De tunnel-container maakt een uitgaande verbinding naar
Cloudflare en stuurt verkeer intern door naar de frontend.

1. **EC2:** Ubuntu 22.04, t3.micro/small. Security group: alleen poort 22 (SSH) open.
2. Installeer Docker: `sudo apt update && sudo apt install -y docker.io docker-compose-v2`
3. Clone de repo en maak `.env` aan met sterke wachtwoorden.
4. **Maak de tunnel aan** in het Cloudflare-dashboard:
   - [one.dash.cloudflare.com](https://one.dash.cloudflare.com) → **Networks → Tunnels → Create a tunnel**
   - Kies **Cloudflared**, geef een naam (bijv. `boodschappen`)
   - Kopieer het **token** (de lange string achter `--token` in het install-commando)
5. Zet in `.env`:
   ```env
   TUNNEL_TOKEN=<het token uit stap 4>
   CORS_ORIGIN=https://boodschappen.jouwdomein.nl
   ```
6. **Public hostname** instellen (zelfde tunnel-pagina, tab *Public Hostname*):
   - Subdomain: `boodschappen`, Domain: `jouwdomein.nl`
   - Service: **HTTP** → `frontend:80` (cloudflared zit in hetzelfde Docker-netwerk)
7. Start alles inclusief tunnel:
   ```bash
   docker compose --profile tunnel up -d --build
   ```
8. Klaar — de app draait op `https://boodschappen.jouwdomein.nl` met automatisch SSL.
   WebSockets (live sync) werken standaard door de tunnel heen.

> Zonder `--profile tunnel` start de stack lokaal zoals altijd, zonder tunnel.
> De poortmapping `8085:80` mag in productie weg (de tunnel gebruikt hem niet).

### Backups

```bash
docker compose exec -T postgres pg_dump -U boodschappen boodschappen > backup_$(date +%Y%m%d).sql
```

### Updaten

```bash
git pull
docker compose up -d --build
# breng een bestaande database op het nieuwste schema (idempotent, veilig om altijd te draaien):
docker exec -i boodschappen-db psql -U boodschappen -d boodschappen < db/migrate.sql
```

Een verse database krijgt het volledige schema automatisch uit `db/migrations/`;
`db/migrate.sql` is alleen nodig voor een database die al data bevat.
