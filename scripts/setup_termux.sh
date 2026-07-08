#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "== SYJ Mail Intelligence AI - Termux setup =="

pkg install -y python git build-essential libffi openssl clang

pip install --upgrade pip
pip install -r requirements.txt

mkdir -p data

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from template — edit it now with your Telegram token, Ollama host, etc."
fi

echo ""
echo "Next steps:"
echo "1. Place your Gmail OAuth2 credentials.json in this directory"
echo "2. Edit .env"
echo "3. Run: python -m app.gmail.auth        (one-time Gmail login)"
echo "4. Run: python -m app.ai.style_learner   (learns your writing style)"
echo "5. Run: bash scripts/run.sh              (starts the assistant)"
