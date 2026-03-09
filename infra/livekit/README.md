# LiveKit Video Infrastructure Setup

This directory contains the Docker Compose configuration for LiveKit, the video calling backend for INSPIRE-LAB.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Client (Browser)                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    @livekit/components-react                           │ │
│  │                                                                        │ │
│  │  1. Request token from Next.js API                                     │ │
│  │  2. Connect to LiveKit server                                          │ │
│  │  3. If direct connection fails → use TURN relay                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │   Direct    │ │   TURN      │ │   TURN      │
            │   UDP/TCP   │ │   UDP       │ │   TCP       │
            └─────────────┘ └─────────────┘ └─────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LiveKit Server (SFU)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Room      │  │   Track     │  │  Participant │  │    Redis           │ │
│  │  Management │  │  Forwarding │  │   State      │  │  (multi-node)      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Coturn (TURN/STUN)                                 │
│                    NAT Traversal for restricted networks                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Docker and Docker Compose
- A domain name (for production)
- SSL certificates (for production)
- Open firewall ports (see below)

## Quick Start (Development)

### 1. Configure Environment

```bash
# From the infra directory
cp .env.example .env

# Generate API credentials
echo "LIVEKIT_API_KEY=API$(openssl rand -base64 9 | tr -d '=+/')" >> .env
echo "LIVEKIT_API_SECRET=$(openssl rand -base64 32)" >> .env
echo "TURN_SECRET=$(openssl rand -hex 32)" >> .env
```

### 2. Update TURN Configuration

Edit `turnserver.conf` and set your TURN secret:

```bash
# Get the secret from .env
TURN_SECRET=$(grep TURN_SECRET ../.env | cut -d= -f2)

# Update turnserver.conf
sed -i '' "s/your_turn_secret_here/$TURN_SECRET/g" turnserver.conf
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Verify Installation

```bash
# Check LiveKit is running
curl http://localhost:7880

# Check container status
docker-compose ps
```

## Required Ports

### Development (localhost)

| Port | Protocol | Service | Purpose |
|------|----------|---------|---------|
| 7880 | TCP | LiveKit | HTTP API / WebSocket |
| 7881 | TCP | LiveKit | RTC over TCP |
| 7882 | UDP | LiveKit | RTC over UDP |
| 3478 | UDP/TCP | TURN | STUN/TURN |
| 5349 | UDP/TCP | TURN | STUN/TURN TLS |
| 49152-49252 | UDP | TURN | Relay ports |
| 50000-50100 | UDP | LiveKit | WebRTC media |

### Production Firewall Rules

```bash
# LiveKit
sudo ufw allow 7880/tcp    # API/WebSocket
sudo ufw allow 7881/tcp    # RTC TCP
sudo ufw allow 7882/udp    # RTC UDP
sudo ufw allow 50000:50100/udp  # Media ports

# TURN
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:49252/udp

# HTTPS (for nginx)
sudo ufw allow 443/tcp
```

## Production Setup

### 1. DNS Configuration

Create these DNS records:

```
Type  Name                      Value
A     livekit.yourdomain.com    YOUR_SERVER_IP
A     turn.yourdomain.com       YOUR_SERVER_IP
```

### 2. Set External IP

Edit `turnserver.conf`:

```
# Set your server's public and private IPs
external-ip=YOUR_PUBLIC_IP/YOUR_PRIVATE_IP
```

Edit `config.yaml`:

```yaml
rtc:
  node_ip: "YOUR_PUBLIC_IP"
  use_external_ip: true
```

### 3. SSL/TLS with Nginx

Example nginx configuration for LiveKit:

```nginx
server {
    listen 443 ssl http2;
    server_name livekit.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/livekit.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/livekit.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

### 4. TURN TLS Certificates

```bash
# Copy certificates to coturn volume
docker cp /etc/letsencrypt/live/turn.yourdomain.com/fullchain.pem inspire-lab-coturn:/etc/coturn/cert.pem
docker cp /etc/letsencrypt/live/turn.yourdomain.com/privkey.pem inspire-lab-coturn:/etc/coturn/key.pem

# Update turnserver.conf
# Uncomment the TLS certificate lines
```

## Environment Variables for Your App

Add these to your Next.js `.env`:

```env
LIVEKIT_URL=ws://localhost:7880      # or wss://livekit.yourdomain.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

## Token Generation

Your app generates tokens server-side:

```typescript
import { AccessToken } from 'livekit-server-sdk';

const token = new AccessToken(
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET,
  {
    identity: userId,
    name: userName,
    ttl: 3600, // 1 hour
  }
);

token.addGrant({
  room: roomName,
  roomJoin: true,
  canPublish: true,
  canSubscribe: true,
});

const jwt = await token.toJwt();
```

## Time-Limited TURN Credentials

Coturn uses HMAC-SHA1 to generate time-limited credentials:

```typescript
import crypto from 'crypto';

function generateTurnCredentials(username: string, secret: string, ttl: number = 86400) {
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const turnUsername = `${timestamp}:${username}`;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(turnUsername);
  const turnPassword = hmac.digest('base64');

  return {
    username: turnUsername,
    password: turnPassword,
    ttl,
  };
}
```

LiveKit handles this automatically when configured with the same shared secret.

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f livekit
docker-compose logs -f coturn
```

### LiveKit CLI

Install the LiveKit CLI for debugging:

```bash
# Install
brew install livekit-cli
# or
curl -sSL https://get.livekit.io/cli | bash

# Test connection
livekit-cli room list \
  --url ws://localhost:7880 \
  --api-key YOUR_API_KEY \
  --api-secret YOUR_API_SECRET

# Join a test room
livekit-cli join-room \
  --url ws://localhost:7880 \
  --api-key YOUR_API_KEY \
  --api-secret YOUR_API_SECRET \
  --room test-room \
  --identity test-user
```

## Scaling

### Multi-Node Setup

For high availability, deploy multiple LiveKit nodes:

1. Use a shared Redis instance
2. Configure the same API keys on all nodes
3. Use a load balancer (nginx/HAProxy)
4. Enable node selection based on region

Update `config.yaml`:

```yaml
redis:
  address: redis.yourdomain.com:6379
  password: your_redis_password

region: us-west-2
```

### Bandwidth Estimation

Approximate bandwidth per participant:

| Quality | Video | Audio | Total |
|---------|-------|-------|-------|
| Low (360p) | 500 Kbps | 40 Kbps | ~540 Kbps |
| Medium (720p) | 1.5 Mbps | 40 Kbps | ~1.5 Mbps |
| High (1080p) | 3 Mbps | 40 Kbps | ~3 Mbps |

For an SFU, server bandwidth = (n-1) * quality per participant.

## Troubleshooting

### "Connection failed"

1. Check firewall ports are open
2. Verify external IP is set in `turnserver.conf`
3. Test TURN connectivity:

```bash
# Test STUN
turnutils_stunclient turn.yourdomain.com

# Test TURN
turnutils_uclient -t -u username -w password turn.yourdomain.com
```

### "No audio/video"

1. Check browser permissions
2. Verify WebRTC ports are open (50000-50100)
3. Test without TURN to isolate the issue

### "Token invalid"

1. Verify API key and secret match
2. Check server time is synchronized (NTP)
3. Ensure token TTL hasn't expired

### Redis Connection Issues

```bash
# Check Redis is running
docker exec inspire-lab-livekit-redis redis-cli ping

# Check LiveKit can reach Redis
docker exec inspire-lab-livekit wget -qO- http://redis:6379
```
