# AiAppsy WebStudio - Production Deployment Guide

This document provides comprehensive instructions for deploying AiAppsy WebStudio to production using Coolify.

## Prerequisites

1. **Coolify Instance**: A running Coolify server with admin access
2. **Domain**: A custom domain (optional but recommended)
3. **AI Provider API Keys**: OpenAI, Anthropic, and/or DeepSeek API keys
4. **Neon Database**: A Neon.tech PostgreSQL database (recommended)

## Environment Variables

Configure the following environment variables in Coolify:

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Security
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
PORT=3000
```

### AI Provider Keys (at least one required)
```bash
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
DEEPSEEK_API_KEY=sk-your-deepseek-key
```

### Optional Variables
```bash
# Default AI Model
DEFAULT_AI_MODEL=deepseek/deepseek-r1-0528:free

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Coolify Integration
COOLIFY_ENDPOINT=https://your-coolify-instance.com
COOLIFY_TOKEN=your-coolify-api-token

# Feature Flags
ENABLE_BETA_FEATURES=false
ENABLE_ANALYTICS=true
ENABLE_MULTI_USER=true
```

## Deployment Steps

### 1. Prepare Your Repository

Ensure your code is pushed to a Git repository with the following structure:
```
aiappsy-webstudio/
├── Dockerfile
├── docker-compose.yml (optional)
├── .env.example
├── drizzle.config.ts
├── next.config.js
├── package.json
├── src/
└── prisma/
```

### 2. Create Application in Coolify

1. Log in to your Coolify dashboard
2. Click "New Application"
3. Select "Git Repository"
4. Connect your repository
5. Configure the following:

**Build Settings:**
- Build Pack: `Dockerfile`
- Dockerfile Path: `./Dockerfile`
- Docker Compose Path: (leave empty)

**Environment Variables:**
- Add all the environment variables from the section above

**Deployment Settings:**
- Port: `3000`
- Health Check Path: `/`
- Restart Policy: `On Failure`

### 3. Configure Database

If using Neon PostgreSQL:

1. In Coolify, go to "Databases" → "New Database"
2. Select "PostgreSQL"
3. Choose "Neon" as the provider
4. Enter your Neon connection string
5. Add the `DATABASE_URL` to your application's environment variables

### 4. Configure Domain (Optional)

1. In your application settings, go to "Domains"
2. Add your custom domain
3. Configure DNS to point to Coolify
4. Enable SSL (automatic in Coolify)

### 5. Run Database Migrations

After first deployment, you may need to run database migrations:

1. Go to "Deployments" → "Latest Deployment"
2. Click "Console" or "SSH"
3. Run: `npm run db:push`

## Health Checks

The application includes built-in health checks:

- **HTTP Health Check**: `GET /` returns 200
- **Database Health Check**: Validates database connectivity
- **AI Service Health Check**: Validates AI provider connections

Monitor these in Coolify under "Logs" and "Metrics".

## Monitoring and Logging

### Application Logs

Access logs in Coolify:
1. Go to your application
2. Click "Logs" tab
3. Filter by level: `error`, `warn`, `info`

### AI Usage Analytics

Access AI usage analytics:
1. Visit: `https://your-domain.com/api/analytics`
2. View token usage, latency, and error rates

### Database Monitoring

Monitor your Neon database:
1. Go to Neon Console
2. Check connection pools and query performance
3. Set up alerts for high usage

## Security Configuration

### SSL/TLS

- Automatic SSL is enabled by default
- HSTS headers are included in production
- CSP headers prevent XSS attacks

### Rate Limiting

Configurable rate limits per endpoint:
- AI Generation: 5 requests per 15 minutes
- Exports: 10 requests per hour
- Deployments: 5 requests per hour

### Input Validation

All inputs are validated using Zod schemas:
- SQL injection prevention
- XSS protection
- Prompt injection filtering for AI inputs

## Scaling Configuration

### Horizontal Scaling

In Coolify, configure auto-scaling:
1. Go to application settings
2. Enable "Auto-scaling"
3. Set minimum/maximum containers
4. Configure CPU/memory thresholds

### Database Scaling

For Neon, configure connection pooling:
```bash
NEON_MAX_POOL_SIZE=20
NEON_CONNECTION_TIMEOUT_MS=5000
```

## Backup and Recovery

### Database Backups

Neon provides automatic backups:
1. Go to Neon Console
2. Configure backup retention
3. Test restore procedures

### Application Backups

Coolify maintains deployment history:
1. Rollback to previous deployments
2. Export application data
3. Disaster recovery procedures

## Performance Optimization

### Caching

Configure Redis caching (optional):
```bash
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

### CDN Configuration

Enable CDN in Coolify:
1. Go to application settings
2. Enable "Static Assets CDN"
3. Configure caching rules

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` format
   - Check Neon connection limits
   - Ensure SSL mode is enabled

2. **AI Provider Errors**
   - Validate API keys
   - Check rate limits
   - Verify model availability

3. **Build Failures**
   - Check Dockerfile syntax
   - Verify `next.config.js` settings
   - Review build logs in Coolify

4. **Deployment Timeouts**
   - Increase health check timeout
   - Optimize database queries
   - Check resource limits

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug
ENABLE_DEBUG_LOGGING=true
```

### Support Resources

- **Documentation**: Check inline code comments
- **Health Checks**: `/api/health` endpoint
- **Analytics**: `/api/analytics` dashboard
- **Logs**: Coolify application logs

## Production Checklist

Before going live, verify:

- [ ] All environment variables set
- [ ] Database connection working
- [ ] AI providers configured
- [ ] SSL certificates valid
- [ ] Rate limits appropriate
- [ ] Monitoring enabled
- [ ] Backup procedures tested
- [ ] Security headers present
- [ ] Error handling functional
- [ ] Performance acceptable (<2s load time)

## Post-Deployment

After successful deployment:

1. **Monitor**: Check all health metrics
2. **Test**: Verify all functionality works
3. **Optimize**: Tune based on real usage
4. **Secure**: Review security settings
5. **Document**: Update internal documentation

## Support

For deployment issues:
1. Check Coolify logs first
2. Review application health checks
3. Verify environment variables
4. Test individual components
5. Contact support with detailed logs