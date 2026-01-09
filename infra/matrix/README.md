# Matrix Synapse Setup

This directory contains the Docker Compose configuration for Matrix Synapse, the chat backend for Kudo.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js Server                          │    │
│  │  - Creates users via shared secret registration      │    │
│  │  - Creates rooms via admin API                       │    │
│  │  - Stores encrypted access tokens                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Matrix Synapse                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Client    │  │   Media     │  │    E2EE Keys        │  │
│  │    API      │  │   Storage   │  │  (client-managed)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                              │                               │
│                              ▼                               │
│                    ┌─────────────┐                          │
│                    │ PostgreSQL  │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Docker and Docker Compose
- A domain name (for production)
- SSL certificates (for production)

## Quick Start (Development)

### 1. Configure Environment

```bash
# From the infra directory
cp .env.example .env

# Generate secrets
echo "MATRIX_DB_PASSWORD=$(openssl rand -hex 16)" >> .env
echo "MATRIX_MACAROON_SECRET_KEY=$(openssl rand -hex 32)" >> .env
echo "MATRIX_FORM_SECRET=$(openssl rand -hex 32)" >> .env
echo "MATRIX_REGISTRATION_SHARED_SECRET=$(openssl rand -hex 32)" >> .env
```

### 2. Update Configuration

Edit `homeserver.yaml` and replace the placeholders:

```bash
# For local development
sed -i '' 's/MATRIX_SERVER_NAME_PLACEHOLDER/localhost/g' homeserver.yaml
sed -i '' 's/MATRIX_PUBLIC_BASEURL_PLACEHOLDER/http:\/\/localhost:8008/g' homeserver.yaml
sed -i '' "s/MATRIX_DB_PASSWORD_PLACEHOLDER/$(grep MATRIX_DB_PASSWORD ../.env | cut -d= -f2)/g" homeserver.yaml
sed -i '' "s/MATRIX_REGISTRATION_SHARED_SECRET_PLACEHOLDER/$(grep MATRIX_REGISTRATION_SHARED_SECRET ../.env | cut -d= -f2)/g" homeserver.yaml
sed -i '' "s/MATRIX_MACAROON_SECRET_KEY_PLACEHOLDER/$(grep MATRIX_MACAROON_SECRET_KEY ../.env | cut -d= -f2)/g" homeserver.yaml
sed -i '' "s/MATRIX_FORM_SECRET_PLACEHOLDER/$(grep MATRIX_FORM_SECRET ../.env | cut -d= -f2)/g" homeserver.yaml
```

### 3. Generate Signing Key

```bash
# Create data directory
mkdir -p synapse-data

# Generate signing key (first time only)
docker run --rm \
  -v $(pwd)/synapse-data:/data \
  -e SYNAPSE_SERVER_NAME=localhost \
  matrixdotorg/synapse:latest generate
```

### 4. Start Services

```bash
docker-compose up -d
```

### 5. Create Admin User

```bash
# Register an admin user for manual testing
docker exec -it kudo-synapse register_new_matrix_user \
  -c /data/homeserver.yaml \
  -u admin \
  -p your_admin_password \
  -a \
  http://localhost:8008
```

### 6. Verify Installation

```bash
# Check health
curl http://localhost:8008/health

# Check versions
curl http://localhost:8008/_matrix/client/versions
```

## Element Web (Debug Client)

To enable Element Web for debugging:

```bash
# Start with debug profile
docker-compose --profile debug up -d

# Access at http://localhost:8080
```

## Production Setup

### 1. DNS Configuration

Create these DNS records:

```
Type  Name                    Value
A     matrix.yourdomain.com   YOUR_SERVER_IP
```

### 2. Update Configuration

Edit `homeserver.yaml`:

```yaml
server_name: "matrix.yourdomain.com"
public_baseurl: "https://matrix.yourdomain.com"
```

### 3. SSL/TLS with Nginx

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name matrix.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/matrix.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/matrix.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Increase timeouts for long-polling
        proxy_read_timeout 600s;
    }

    # Federation (optional)
    location /.well-known/matrix/server {
        return 200 '{"m.server": "matrix.yourdomain.com:443"}';
        add_header Content-Type application/json;
    }

    location /.well-known/matrix/client {
        return 200 '{"m.homeserver": {"base_url": "https://matrix.yourdomain.com"}}';
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }
}
```

### 4. Firewall Rules

```bash
# Required ports
ufw allow 8008/tcp   # Synapse API (behind nginx)
ufw allow 8448/tcp   # Federation (optional)
ufw allow 443/tcp    # HTTPS
ufw allow 80/tcp     # HTTP (for Let's Encrypt)
```

## Environment Variables for Your App

Add these to your Next.js `.env`:

```env
MATRIX_HOMESERVER_URL=http://localhost:8008  # or https://matrix.yourdomain.com
MATRIX_SERVER_NAME=localhost                  # or matrix.yourdomain.com
MATRIX_SHARED_SECRET=your_registration_shared_secret
MATRIX_ADMIN_TOKEN=                           # See "Getting Admin Token" below
```

## Getting Admin Token

After creating an admin user, get their access token:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"admin","password":"your_admin_password"}' \
  http://localhost:8008/_matrix/client/v3/login

# Response includes access_token
```

Store this as `MATRIX_ADMIN_TOKEN` in your app's `.env`.

## Maintenance

### Backup

```bash
# Backup database
docker exec kudo-matrix-postgres pg_dump -U synapse synapse > backup.sql

# Backup media
docker cp kudo-synapse:/data/media_store ./media_backup
```

### Restore

```bash
# Restore database
cat backup.sql | docker exec -i kudo-matrix-postgres psql -U synapse synapse

# Restore media
docker cp ./media_backup/. kudo-synapse:/data/media_store/
```

### Logs

```bash
# View logs
docker-compose logs -f synapse

# View specific log file
docker exec kudo-synapse cat /data/homeserver.log
```

### Update

```bash
docker-compose pull
docker-compose up -d
```

## Troubleshooting

### "Database connection failed"

```bash
# Check postgres is running
docker-compose ps

# Check postgres logs
docker-compose logs postgres
```

### "Registration failed"

Verify the shared secret matches between `homeserver.yaml` and your app's `.env`.

### "Room creation failed"

Ensure the admin token is valid and the user has admin privileges.

### Check Synapse Status

```bash
# Health check
curl http://localhost:8008/health

# Server info
curl http://localhost:8008/_matrix/client/versions
```
