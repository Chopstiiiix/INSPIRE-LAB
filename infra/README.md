# Infrastructure

This directory contains Docker Compose configurations for the communication services used by Kudo.

## Services

| Directory | Service | Purpose |
|-----------|---------|---------|
| `matrix/` | Matrix Synapse + PostgreSQL | End-to-end encrypted chat |
| `livekit/` | LiveKit SFU + Coturn | Video calls with NAT traversal |

## Quick Start

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Generate all secrets at once
cat >> .env << EOF
MATRIX_DB_PASSWORD=$(openssl rand -hex 16)
MATRIX_MACAROON_SECRET_KEY=$(openssl rand -hex 32)
MATRIX_FORM_SECRET=$(openssl rand -hex 32)
MATRIX_REGISTRATION_SHARED_SECRET=$(openssl rand -hex 32)
LIVEKIT_API_KEY=API$(openssl rand -base64 9 | tr -d '=+/')
LIVEKIT_API_SECRET=$(openssl rand -base64 32)
TURN_SECRET=$(openssl rand -hex 32)
EOF

echo "Secrets generated! Edit .env to set domain names and external IPs."
```

### 2. Start Matrix

```bash
cd matrix

# First time: generate config and signing key
docker run --rm \
  -v $(pwd)/synapse-data:/data \
  -e SYNAPSE_SERVER_NAME=localhost \
  matrixdotorg/synapse:latest generate

# Update homeserver.yaml with your secrets
# (see matrix/README.md for detailed steps)

# Start services
docker-compose up -d

# Create admin user
docker exec -it kudo-synapse register_new_matrix_user \
  -c /data/homeserver.yaml \
  -u admin \
  -p your_admin_password \
  -a \
  http://localhost:8008
```

### 3. Start LiveKit

```bash
cd livekit

# Update turnserver.conf with TURN_SECRET from .env
# (see livekit/README.md for detailed steps)

# Start services
docker-compose up -d
```

### 4. Update Your App's .env

Copy the generated credentials to your main `.env` file:

```bash
# From the kudo root directory
cat infra/.env >> .env

# Then add Matrix admin token after logging in
# See matrix/README.md "Getting Admin Token"
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Kudo Application                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Next.js Server                                  │ │
│  │                                                                        │ │
│  │  - Provisions Matrix users (shared secret registration)                │ │
│  │  - Creates Matrix rooms (admin API)                                    │ │
│  │  - Generates LiveKit tokens (server SDK)                               │ │
│  │  - Stores encrypted credentials (Prisma + PostgreSQL)                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                              │
          │ HTTP/WS                                      │ HTTP/WS
          ▼                                              ▼
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│       Matrix Synapse            │      │         LiveKit SFU             │
│                                 │      │                                 │
│  - Client-Server API (8008)     │      │  - Room management              │
│  - Federation API (8448)        │      │  - Track forwarding             │
│  - Media repository             │      │  - Participant state            │
│  - E2EE event storage           │      │                                 │
│           │                     │      │           │                     │
│           ▼                     │      │           ▼                     │
│     ┌──────────┐               │      │     ┌──────────┐               │
│     │ Postgres │               │      │     │  Redis   │               │
│     └──────────┘               │      │     └──────────┘               │
└─────────────────────────────────┘      └─────────────────────────────────┘
                                                   │
                                                   │ NAT Traversal
                                                   ▼
                                         ┌─────────────────────────────────┐
                                         │          Coturn                 │
                                         │                                 │
                                         │  - STUN (discover external IP)  │
                                         │  - TURN (relay for strict NATs) │
                                         └─────────────────────────────────┘
```

## Production Checklist

### DNS Records

```
Type  Name                    Value
A     matrix.yourdomain.com   YOUR_SERVER_IP
A     livekit.yourdomain.com  YOUR_SERVER_IP
A     turn.yourdomain.com     YOUR_SERVER_IP
```

### SSL Certificates

```bash
# Using Let's Encrypt
certbot certonly --standalone -d matrix.yourdomain.com
certbot certonly --standalone -d livekit.yourdomain.com
certbot certonly --standalone -d turn.yourdomain.com
```

### Firewall Ports

```bash
# Matrix
ufw allow 8008/tcp   # Client API (behind nginx)
ufw allow 8448/tcp   # Federation (optional)

# LiveKit
ufw allow 7880/tcp   # API/WebSocket
ufw allow 7881/tcp   # RTC TCP
ufw allow 7882/udp   # RTC UDP
ufw allow 50000:50100/udp  # Media ports

# TURN
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 5349/udp
ufw allow 49152:49252/udp

# HTTPS
ufw allow 443/tcp
ufw allow 80/tcp
```

### External IP Configuration

For NAT traversal to work, you must set your server's public IP:

1. **Coturn**: Edit `livekit/turnserver.conf`:
   ```
   external-ip=YOUR_PUBLIC_IP/YOUR_PRIVATE_IP
   ```

2. **LiveKit**: Edit `livekit/config.yaml`:
   ```yaml
   rtc:
     node_ip: "YOUR_PUBLIC_IP"
   ```

## Maintenance

### View All Logs

```bash
# Matrix
cd matrix && docker-compose logs -f

# LiveKit
cd livekit && docker-compose logs -f
```

### Backup

```bash
# Matrix database
docker exec kudo-matrix-postgres pg_dump -U synapse synapse > matrix-backup.sql

# Matrix media
docker cp kudo-synapse:/data/media_store ./matrix-media-backup

# Redis (LiveKit state is ephemeral, but backup if needed)
docker exec kudo-livekit-redis redis-cli BGSAVE
```

### Update Services

```bash
# Matrix
cd matrix && docker-compose pull && docker-compose up -d

# LiveKit
cd livekit && docker-compose pull && docker-compose up -d
```

### Health Checks

```bash
# Matrix
curl http://localhost:8008/health
curl http://localhost:8008/_matrix/client/versions

# LiveKit
curl http://localhost:7880

# Coturn (requires turnutils)
turnutils_stunclient localhost
```

## Troubleshooting

See individual README files:
- [Matrix Troubleshooting](matrix/README.md#troubleshooting)
- [LiveKit Troubleshooting](livekit/README.md#troubleshooting)
