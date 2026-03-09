# INSPIRE-LAB Database Commands Reference

Quick reference for all database-related commands.

## 🚀 Quick Start

```bash
# Fresh database setup (complete reset)
npm run db:reset

# Or step by step:
npm run db:push    # Apply schema
npm run db:seed    # Add test data
```

## 📦 Schema Management

### Development Workflow
```bash
# Apply schema changes (no migration files)
npm run db:push

# Generate Prisma Client
npm run db:generate

# Format schema file
npx prisma format
```

### Production Workflow
```bash
# Create a migration
npx prisma migrate dev --name add_user_roles

# Apply pending migrations
npx prisma migrate deploy

# View migration status
npx prisma migrate status

# Resolve failed migration
npx prisma migrate resolve --applied <migration_name>
```

## 🌱 Seeding

```bash
# Run seed script
npm run db:seed

# Reset database and reseed
npm run db:reset
```

## 🗄️ Database Operations

### PostgreSQL Commands
```bash
# Connect to database
psql inspire_lab

# List all tables
psql inspire_lab -c "\dt"

# List all enums
psql inspire_lab -c "\dT+"

# View table structure
psql inspire_lab -c "\d User"

# Count records
psql inspire_lab -c "SELECT COUNT(*) FROM \"User\";"

# Drop database (DANGER!)
dropdb inspire_lab

# Create database
createdb inspire_lab
```

### Prisma Commands
```bash
# Open Prisma Studio (visual editor)
npx prisma studio

# Pull schema from existing database
npx prisma db pull

# Validate schema
npx prisma validate

# View connection info
npx prisma db seed --help
```

## 🔍 Useful Queries

### Check User Count
```bash
psql inspire_lab -c "SELECT COUNT(*), status FROM \"User\" GROUP BY status;"
```

### View All Skill Tags
```bash
psql inspire_lab -c "SELECT name, category FROM \"SkillTag\" ORDER BY category, name;"
```

### View Invite Codes
```bash
psql inspire_lab -c "SELECT code, \"maxUses\", \"usesCount\", enabled FROM \"InviteCode\";"
```

### Check Follow Relationships
```bash
psql inspire_lab -c "SELECT COUNT(*) FROM \"Follow\";"
```

## 🛠️ Troubleshooting

### Reset Everything
```bash
# Complete database reset
dropdb inspire_lab
createdb inspire_lab
npm run db:push
npm run db:seed
```

### Fix Prisma Client Issues
```bash
# Regenerate client
npm run db:generate

# Clear Prisma cache
rm -rf node_modules/.prisma
npm run db:generate
```

### Migration Conflicts
```bash
# Reset migrations (DANGER - use in development only)
rm -rf prisma/migrations
npm run db:push
```

## 📊 Monitoring

### View Database Size
```bash
psql inspire_lab -c "SELECT pg_size_pretty(pg_database_size('inspire_lab'));"
```

### Table Sizes
```bash
psql inspire_lab -c "
  SELECT
    relname as table,
    pg_size_pretty(pg_total_relation_size(relid)) as size
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC;
"
```

### Active Connections
```bash
psql inspire_lab -c "
  SELECT count(*) as connections
  FROM pg_stat_activity
  WHERE datname = 'inspire_lab';
"
```

## 🔐 Security

### Backup Database
```bash
# Create backup
pg_dump inspire_lab > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql inspire_lab < backup_20240115_120000.sql
```

### Create Read-Only User
```bash
psql inspire_lab -c "
  CREATE USER readonly WITH PASSWORD 'password';
  GRANT CONNECT ON DATABASE inspire_lab TO readonly;
  GRANT USAGE ON SCHEMA public TO readonly;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
"
```

## 🧪 Testing

### Seed with Custom Data
```bash
# Edit prisma/seed.ts then run:
npm run db:seed
```

### Verify Seed Data
```bash
# Check admin user
psql inspire_lab -c "SELECT email, role, status FROM \"User\" WHERE role = 'ADMIN';"

# Check test users
psql inspire_lab -c "SELECT email, handle, \"roleTitle\" FROM \"User\" WHERE role = 'USER';"

# Check skill tags count
psql inspire_lab -c "SELECT COUNT(*) as total FROM \"SkillTag\";"

# Check tool tags count
psql inspire_lab -c "SELECT COUNT(*) as total FROM \"ToolTag\";"
```

## 📝 Package.json Scripts

All available npm scripts:

```json
{
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts",
  "db:reset": "prisma migrate reset --skip-generate && npm run db:seed"
}
```

## 🌐 Environment Setup

Required environment variables in `.env`:

```env
DATABASE_URL="postgresql://username@localhost:5432/inspire_lab"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

## 💡 Pro Tips

1. **Use Prisma Studio** for visual data editing: `npx prisma studio`
2. **Always backup before migrations** in production
3. **Use transactions** for multi-table operations
4. **Index frequently queried fields** (already done in schema)
5. **Use `upsert`** in seed scripts for idempotency
6. **Test migrations** on staging before production

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Full setup guide
- [PRISMA_SCHEMA_SUMMARY.md](./PRISMA_SCHEMA_SUMMARY.md) - Schema details
