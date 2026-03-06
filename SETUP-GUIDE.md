# P-Stream Local Setup Guide

A complete guide to run P-Stream locally on your machine.

## ⚡ Super Quick Start (Recommended)

### For Web App (Docker)

```bash
# Linux
./scripts/linux/install-web.sh

# Windows
scripts\windows\install-web.bat

# Mac
./scripts/mac/install-web.sh
```

### For Desktop App

```bash
# Linux
./scripts/linux/install-app.sh

# Windows
scripts\windows\install-app.bat

# Mac
./scripts/mac/install-app.sh
```

That's it! The scripts will handle everything for you.

---

## What's Included

| Service         | Port                  | Description                           |
| --------------- | --------------------- | ------------------------------------- |
| **Web App**     | http://localhost      | The main P-Stream streaming interface |
| **Backend API** | http://localhost:3001 | User accounts, watch history          |
| **Proxy**       | http://localhost:3000 | CORS bypass for streaming             |
| **PostgreSQL**  | localhost:5432        | Database for user data                |

---

## Manual Setup (If You Prefer)

### Prerequisites

Before starting, make sure you have these installed:

#### 1. Install Docker Desktop

- **Windows/Mac:** Download from https://www.docker.com/products/docker-desktop
- **Linux (Fedora):**
  ```bash
  sudo dnf install docker-compose
  sudo systemctl start docker
  sudo systemctl enable docker
  ```

#### 2. Install pnpm (for Desktop App only)

```bash
# On Fedora
sudo npm install -g pnpm

# Or via corepack
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Quick Start (Manual)

### Step 1: Open Terminal

Open your terminal/command prompt.

### Step 2: Navigate to Project

```bash
cd /path/to/p-stream
```

(Replace `/path/to/p-stream` with the actual folder path)

### Step 3: Run Everything

```bash
docker compose up --build -d
```

This will:

- ✅ Build the web app
- ✅ Start PostgreSQL database
- ✅ Start backend API server
- ✅ Start proxy server
- ✅ Start web server

### Step 4: Access P-Stream

Open your browser and go to:

| Service         | URL                   |
| --------------- | --------------------- |
| **Web App**     | http://localhost      |
| **Backend API** | http://localhost:3001 |
| **Proxy**       | http://localhost:3000 |

---

## How to Use

### Using the Web App

1. Open http://localhost in your browser
2. Search for a movie or TV show
3. Click on a result to start streaming!

### Using the Desktop App

```bash
# Go to desktop folder
cd p-stream-desktop

# Install dependencies
pnpm install

# Build the app
pnpm run build

# Run the app
pnpm start
```

The built app will be in `p-stream-desktop/dist/`

---

## Managing the Services

### Check Status

```bash
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs

# Specific service
docker compose logs web
docker compose logs backend
docker compose logs proxy
docker compose logs postgres
```

### Stop Everything

```bash
docker compose down
```

### Restart

```bash
docker compose restart
```

---

## Troubleshooting

### "Port already in use" Error

```bash
# Check what's using the port
lsof -i :80

# Or change port in docker-compose.yml
```

### Database Connection Error

```bash
# Restart postgres
docker compose restart postgres

# Wait 10 seconds, then
docker compose up -d
```

### Build Fails

```bash
# Clean and rebuild
docker compose build --no-cache
docker compose up --build -d
```

---

## For Portfolio/Demo

Show you've built a full-stack streaming platform:

1. **Show Docker containers running:**

   ```bash
   docker compose ps
   ```

2. **Show the web app:**
   - Open http://localhost in browser
   - Take screenshots

3. **Show backend is working:**
   - Visit http://localhost:3001/health

4. **Show architecture:**
   - Docker Compose orchestration
   - PostgreSQL database
   - REST API
   - Nginx reverse proxy

---

## Need Help?

- Check Docker is running: `docker info`
- Check containers: `docker compose ps`
- View logs: `docker compose logs`
