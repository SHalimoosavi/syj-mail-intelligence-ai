# VPS deployment (Docker Compose)

This is the "true 24/7" deployment path — a small Ubuntu VPS (Hetzner,
DigitalOcean, Railway, etc.), not a phone that sleeps.

## 1. Prerequisites on the VPS

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

## 2. Clone and configure

```bash
git clone https://github.com/SHalimoosavi/syj-mail-intelligence-ai.git
cd syj-mail-intelligence-ai
cp .env.example .env
```

Edit `.env` and set at minimum:
- `POSTGRES_PASSWORD` — a strong password (compose refuses to start without it)
- `API_KEY` — generate with `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
- `ENVIRONMENT=production`
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`
- `OLLAMA_HOST` — point at wherever Ollama actually runs (same VPS if it has
  enough RAM for your model, otherwise a separate GPU box over a private
  network/Tailscale)

## 3. Gmail OAuth2 (one-time, before starting containers)

The OAuth browser flow needs to run once, outside Docker, so you have
`credentials.json` and `token.json` ready to mount in:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.gmail.auth   # completes the OAuth2 flow, writes token.json
deactivate
```

`docker-compose.yml` mounts both files read-only into the backend container.

## 4. DNS + first certificate

Point your domain's A record at the VPS IP. Then, before nginx can serve
HTTPS, get an initial certificate:

```bash
# Temporarily comment out the "return 301 https" line in deploy/nginx.conf
# so certbot's HTTP challenge can be reached, then:
docker compose up -d nginx
docker run --rm \
  -v syj-mail-intelligence_certbot_www:/var/www/certbot \
  -v syj-mail-intelligence_certbot_conf:/etc/letsencrypt \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d mail.yourdomain.com --email you@yourdomain.com --agree-tos --no-eff-email
# Uncomment the redirect line back in deploy/nginx.conf afterward.
```

Renewal (add as a monthly cron job on the host):
```bash
docker run --rm \
  -v syj-mail-intelligence_certbot_www:/var/www/certbot \
  -v syj-mail-intelligence_certbot_conf:/etc/letsencrypt \
  certbot/certbot renew --webroot -w /var/www/certbot
docker compose exec nginx nginx -s reload
```

## 5. Bring everything up

```bash
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

Check it's healthy:
```bash
docker compose ps
curl https://mail.yourdomain.com/inbox
```

## 6. Updating after a `git pull`

```bash
git pull
docker compose up -d --build
docker compose exec backend alembic upgrade head   # if models.py changed
```

## Logs

```bash
docker compose logs -f backend
docker compose logs -f dashboard
```
