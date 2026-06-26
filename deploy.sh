#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  InvoiceAI — Ubuntu Deployment Script
# ═══════════════════════════════════════════════════════════════════════════
#  This script sets up everything on a fresh Ubuntu server.
#  
#  Usage:
#    chmod +x deploy.sh
#    sudo ./deploy.sh
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  InvoiceAI — Deployment Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Install Docker if not present ─────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "[1/5] Installing Docker..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed successfully."
else
    echo "[1/5] Docker already installed. Skipping."
fi

# ── Step 2: Create production env file ────────────────────────────────────
echo ""
if [ ! -f .env.production ]; then
    echo "[2/5] Creating .env.production from template..."
    cp .env.production.example .env.production
    # Generate a random secret key
    SECRET=$(openssl rand -hex 32)
    sed -i "s/CHANGE_ME_TO_A_RANDOM_SECRET_KEY/$SECRET/" .env.production
    echo "✅ .env.production created with a random SECRET_KEY."
    echo "   Review it:  nano .env.production"
else
    echo "[2/5] .env.production already exists. Skipping."
fi

# ── Step 3: Build and start containers ────────────────────────────────────
echo ""
echo "[3/5] Building and starting Docker containers..."
docker compose up -d --build
echo "✅ Containers started."

# ── Step 4: Wait for Ollama to be ready and pull models ───────────────────
echo ""
echo "[4/5] Waiting for Ollama to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until docker exec invoiceai-ollama curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "⚠️  Ollama did not start in time. You may need to pull models manually."
        break
    fi
    echo "   Waiting for Ollama... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Pulling AI models (this may take a while on first run)..."
    docker exec invoiceai-ollama ollama pull qwen2.5:3b
    echo "✅ Text model (qwen2.5:3b) pulled."
    docker exec invoiceai-ollama ollama pull moondream
    echo "✅ Vision model (moondream) pulled."
fi

# ── Step 5: Show status ──────────────────────────────────────────────────
echo ""
echo "[5/5] Checking service status..."
docker compose ps
echo ""

# Get the server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ InvoiceAI is deployed!"
echo ""
echo "  🌐 Web UI:    http://$SERVER_IP"
echo "  📡 API:       http://$SERVER_IP/api"
echo "  📖 API Docs:  http://$SERVER_IP/api/docs"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f          # View logs"
echo "    docker compose restart          # Restart all services"
echo "    docker compose down             # Stop all services"
echo "    docker compose up -d --build    # Rebuild and restart"
echo "═══════════════════════════════════════════════════════════════"
