# Communications Infrastructure Operations Guide

This document covers operational procedures for the Matrix Synapse and LiveKit infrastructure.

## Table of Contents

- [Matrix Admin Token Rotation](#matrix-admin-token-rotation)
- [User Management](#user-management)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Matrix Admin Token Rotation

The Matrix admin token (`MATRIX_ADMIN_TOKEN`) should be rotated periodically for security.

### When to Rotate

- After any suspected security incident
- When team members with access leave
- Quarterly as routine maintenance

### Rotation Procedure

1. **Generate a new admin user/token** on the Synapse server:

```bash
# SSH into the Synapse server or use docker exec
docker exec -it synapse bash

# Register a new admin user
register_new_matrix_user -c /data/homeserver.yaml http://localhost:8008

# Enter username (e.g., admin_2024_01)
# Enter password (save securely)
# Confirm admin: yes
```

2. **Get the access token** for the new admin:

```bash
curl -X POST "http://localhost:8008/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "m.login.password",
    "user": "admin_2024_01",
    "password": "YOUR_PASSWORD"
  }'
```

The response will contain `access_token`.

3. **Update environment variable**:

```bash
# In your deployment environment
MATRIX_ADMIN_TOKEN=syt_NEW_TOKEN_HERE
```

4. **Redeploy the application** to pick up the new token.

5. **Deactivate the old admin user** (optional but recommended):

```bash
curl -X POST "http://localhost:8008/_synapse/admin/v1/deactivate/@old_admin:your.domain" \
  -H "Authorization: Bearer $NEW_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"erase": false}'
```

---

## User Management

### Disabling a User

When you need to immediately revoke a user's access to chat and calls:

```typescript
import { disableUser } from "@/app/actions/admin";

// As an admin, disable the user
await disableUser("user_id_here", "Reason for suspension");
```

This will:
- Set user status to SUSPENDED
- Kick them from all Matrix rooms (projects and DMs)
- Delete their Matrix credentials (blocks new token issuance)
- Remove them from all project memberships

### Re-enabling a User

```typescript
import { enableUser } from "@/app/actions/admin";

await enableUser("user_id_here");
```

The user will need to complete onboarding again to get new Matrix credentials.

### Manual Matrix User Deactivation

If you need to deactivate a user directly on the Matrix server:

```bash
curl -X POST "http://localhost:8008/_synapse/admin/v1/deactivate/@username:your.domain" \
  -H "Authorization: Bearer $MATRIX_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"erase": false}'
```

Set `"erase": true` to also delete message history (GDPR compliance).

---

## Monitoring

### Key Metrics to Watch

#### Matrix Synapse

1. **Sync latency**: Time for clients to receive new messages
   - Monitor: `synapse_sync_processing_seconds`
   - Alert if > 5 seconds

2. **Database connection pool**:
   - Monitor: `synapse_database_connections`
   - Alert if near max connections

3. **Federation lag** (if federated):
   - Monitor: `synapse_federation_transaction_queue_length`

4. **Memory usage**:
   - Synapse can be memory-intensive with many rooms

#### LiveKit

1. **Room participant count**:
   - Monitor for unexpected spikes

2. **Bandwidth usage**:
   - Track upload/download per room

3. **Connection failures**:
   - Monitor client connection error rates

### Health Check Endpoints

```bash
# Matrix Synapse health
curl http://localhost:8008/health

# Matrix version/features
curl http://localhost:8008/_matrix/client/versions

# LiveKit health (if exposed)
curl http://localhost:7880/
```

### Log Locations

```bash
# Docker logs
docker logs synapse -f --tail 100
docker logs livekit -f --tail 100

# Or if using volumes
tail -f /path/to/synapse-data/homeserver.log
```

### Recommended Monitoring Stack

- **Prometheus**: Scrape metrics from Synapse and LiveKit
- **Grafana**: Dashboards for visualization
- **Alertmanager**: Alert on thresholds

Example Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: 'synapse'
    static_configs:
      - targets: ['synapse:9090']  # Metrics port

  - job_name: 'livekit'
    static_configs:
      - targets: ['livekit:6789']  # Prometheus metrics port
```

---

## Backup & Recovery

### Matrix PostgreSQL Backup

#### Automated Daily Backup

```bash
#!/bin/bash
# /opt/scripts/backup-matrix-db.sh

BACKUP_DIR="/backups/matrix"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="postgres-matrix"  # or your container name

# Create backup
docker exec $CONTAINER pg_dump -U synapse synapse | gzip > "$BACKUP_DIR/synapse_$DATE.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "synapse_*.sql.gz" -mtime +30 -delete

echo "Backup completed: synapse_$DATE.sql.gz"
```

Add to crontab:
```bash
0 2 * * * /opt/scripts/backup-matrix-db.sh >> /var/log/matrix-backup.log 2>&1
```

#### Manual Backup

```bash
# Full database dump
docker exec postgres-matrix pg_dump -U synapse synapse > synapse_backup.sql

# Compressed
docker exec postgres-matrix pg_dump -U synapse synapse | gzip > synapse_backup.sql.gz
```

#### Volume Backup

If using named volumes:

```bash
# Stop services first
docker-compose stop synapse postgres-matrix

# Backup volumes
docker run --rm \
  -v matrix-pg-data:/data \
  -v /backups:/backup \
  alpine tar czf /backup/matrix-pg-data.tar.gz /data

# Resume services
docker-compose start synapse postgres-matrix
```

### Restore Procedure

```bash
# Stop Synapse to prevent writes
docker-compose stop synapse

# Restore database
gunzip < synapse_backup.sql.gz | docker exec -i postgres-matrix psql -U synapse synapse

# Start Synapse
docker-compose start synapse
```

### Media Backup

Matrix stores uploaded media in the `media_store` directory:

```bash
# Backup media
tar czf matrix-media-backup.tar.gz /path/to/synapse-data/media_store

# Restore media
tar xzf matrix-media-backup.tar.gz -C /path/to/synapse-data/
```

### LiveKit Backup

LiveKit is stateless - room state exists only while participants are connected.
No backup needed for LiveKit itself. Just keep your `livekit.yaml` config backed up.

---

## Troubleshooting

### Common Issues

#### "User must be active to join calls"
- User's status is not ACTIVE
- Check: `SELECT status FROM "User" WHERE id = 'xxx'`
- Fix: User needs to complete onboarding or be enabled by admin

#### Matrix room sync failing
- Check Synapse logs for errors
- Verify database connectivity
- Check if room state is corrupted

#### "Failed to initialize crypto"
- Browser may not support IndexedDB
- Try clearing browser storage
- Check for browser extensions blocking storage

#### High memory usage on Synapse
- Tune worker configuration
- Consider running multiple workers
- Increase database connection pool

### Debug Commands

```bash
# Check room state
curl "http://localhost:8008/_synapse/admin/v1/rooms/!roomid:domain/state" \
  -H "Authorization: Bearer $MATRIX_ADMIN_TOKEN"

# List users in room
curl "http://localhost:8008/_synapse/admin/v1/rooms/!roomid:domain/members" \
  -H "Authorization: Bearer $MATRIX_ADMIN_TOKEN"

# Get user info
curl "http://localhost:8008/_synapse/admin/v2/users/@username:domain" \
  -H "Authorization: Bearer $MATRIX_ADMIN_TOKEN"
```

---

## Security Checklist

- [ ] Matrix admin token rotated within last 90 days
- [ ] Database backups verified (restore test)
- [ ] Rate limiting enabled on all endpoints
- [ ] All endpoints require ACTIVE user status
- [ ] Monitoring alerts configured
- [ ] Firewall rules restrict direct database access
- [ ] TLS/SSL certificates valid
- [ ] No plaintext secrets in logs
