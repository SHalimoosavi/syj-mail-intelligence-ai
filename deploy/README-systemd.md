# VPS deployment without Docker (systemd)

Prefer this over `deploy/README.md` (Docker) if you'd rather manage the
processes directly with systemd — same 24/7 reliability, one less layer.

## 1. Create a dedicated user and directory

```bash
sudo useradd --system --create-home --shell /bin/bash syjmail
sudo mkdir -p /opt/syj-mail-intelligence-ai
sudo chown syjmail:syjmail /opt/syj-mail-intelligence-ai
```

## 2. Clone and set up as that user

```bash
sudo -u syjmail -i
cd /opt/syj-mail-intelligence-ai
git clone https://github.com/SHalimoosavi/syj-mail-intelligence-ai.git .

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
nano .env   # set ENVIRONMENT=production, API_KEY, POSTGRES_PASSWORD/DATABASE_URL, Telegram, etc.

# Postgres (if not already installed):
sudo apt install postgresql
sudo -u postgres createuser syj
sudo -u postgres createdb -O syj syj_mail
sudo -u postgres psql -c "ALTER USER syj PASSWORD 'yourpassword';"
# then set DATABASE_URL=postgresql://syj:yourpassword@localhost/syj_mail in .env

alembic upgrade head

python -m app.gmail.auth   # one-time OAuth2 flow, needs credentials.json present
deactivate
exit   # back to your normal user
```

## 3. Dashboard setup

```bash
sudo -u syjmail -i
cd /opt/syj-mail-intelligence-ai/dashboard
npm install
npm run build
cp .env.local.example .env.local
nano .env.local   # BACKEND_API_URL=http://localhost:8000, BACKEND_API_KEY=<same as API_KEY above>
exit
```

## 4. Install the systemd units

```bash
sudo cp deploy/syj-mail-backend.service /etc/systemd/system/
sudo cp deploy/syj-mail-dashboard.service /etc/systemd/system/
sudo cp deploy/syj-mail-prune-logs.service /etc/systemd/system/
sudo cp deploy/syj-mail-prune-logs.timer /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now syj-mail-backend
sudo systemctl enable --now syj-mail-dashboard
sudo systemctl enable --now syj-mail-prune-logs.timer
```

## 5. Check status / logs

```bash
sudo systemctl status syj-mail-backend
sudo journalctl -u syj-mail-backend -f
sudo journalctl -u syj-mail-dashboard -f
```

## 6. Nginx + HTTPS

Same nginx config and certbot steps as `deploy/README.md` §4, except point
`proxy_pass` at `http://127.0.0.1:3000` (dashboard) and
`http://127.0.0.1:8000` (backend) instead of Docker service names.

## 7. Updating

```bash
sudo -u syjmail -i
cd /opt/syj-mail-intelligence-ai
git pull
source .venv/bin/activate && pip install -r requirements.txt && alembic upgrade head && deactivate
cd dashboard && npm install && npm run build
exit

sudo systemctl restart syj-mail-backend syj-mail-dashboard
```
