# Monitoring & Alerting Configuration

Este documento descreve como configurar monitoramento e alertas para o Sentinel RFP em produção.

## Health Check Endpoint

### Endpoint

```
GET /health
```

### Response (Healthy)

```json
{
  "status": "healthy",
  "timestamp": "2024-01-14T15:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 15
    }
  }
}
```

### Response (Unhealthy)

```json
HTTP 503 Service Unavailable
{
  "status": "unhealthy",
  "timestamp": "2024-01-14T15:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "checks": {
    "database": {
      "status": "down",
      "responseTime": 5000
    }
  }
}
```

## Railway Health Check Configuration

### Setup Instructions

1. **Acesse o Dashboard do Railway**
   - Navegue até o projeto Sentinel RFP
   - Selecione o serviço `api`

2. **Configure Health Check**
   - Vá em **Settings** → **Health Check**
   - Configure os seguintes valores:
     ```
     Path: /health
     Interval: 30 (segundos)
     Timeout: 5 (segundos)
     Retries: 3
     ```

3. **Verificar Configuração**
   - Railway irá chamar `/health` a cada 30 segundos
   - Se 3 tentativas falharem consecutivamente, Railway marca o serviço como unhealthy
   - Railway pode reiniciar automaticamente o serviço se configurado

### Railway CLI Configuration

```bash
# railway.json (na raiz do projeto)
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 5,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

## Sentry Alert Rules Configuration

### Prerequisites

- Sentry DSN configurado em `.env`:
  ```
  SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
  ```
- Sentry integration instalada (issue #119)

### Alert Rules

#### 1. Critical Errors Alert (High Frequency)

**Quando:** > 10 errors/minute
**Ação:** Slack + Email

**Setup:**

1. Acesse Sentry Dashboard → Alerts → Create Alert Rule
2. Configure:
   ```
   When: An event is seen
   If: count() > 10
   in: 1 minute
   Environment: production
   Level: error, fatal
   ```
3. Actions:
   - Send a Slack notification to #alerts-critical
   - Send an email to team@sentinel-rfp.com

#### 2. 5xx Errors Alert

**Quando:** Qualquer erro 500+
**Ação:** Slack

**Setup:**

1. Sentry Dashboard → Alerts → Create Alert Rule
2. Configure:
   ```
   When: An event is seen
   If: http.status_code >= 500
   Environment: production
   ```
3. Actions:
   - Send a Slack notification to #alerts-errors

#### 3. Database Connection Failures

**Quando:** Database health check falha
**Ação:** Slack + Email (Alta prioridade)

**Setup:**

1. Sentry Dashboard → Alerts → Create Alert Rule
2. Configure:
   ```
   When: An event is seen
   If: message contains "Database health check failed"
   Environment: production
   ```
3. Actions:
   - Send a Slack notification to #alerts-critical
   - Send an email to infra@sentinel-rfp.com

### Slack Webhook Configuration

1. **Create Slack App:**
   - Vá em https://api.slack.com/apps
   - Create New App → From scratch
   - Nome: "Sentinel Alerts"
   - Workspace: Seu workspace

2. **Enable Incoming Webhooks:**
   - Incoming Webhooks → Activate
   - Add New Webhook to Workspace
   - Select channel: #alerts-critical
   - Copy webhook URL

3. **Configure in Sentry:**
   - Sentry → Settings → Integrations → Slack
   - Add Workspace
   - Configure webhook URL

4. **Test:**
   ```typescript
   // Forçar erro para testar
   throw new Error('Test alert - ignore');
   ```

### Dead Letter Queue Monitoring (BullMQ)

**Nota:** Redis/BullMQ não estão instalados ainda. Quando implementados, seguir:

```typescript
// apps/api/src/agents/jobs/dead-letter.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import * as Sentry from '@sentry/node';

@Processor('dead-letter')
export class DeadLetterProcessor {
  @Process()
  async handleDeadLetter(job: Job) {
    // Log to Sentry
    Sentry.captureException(new Error('Job failed permanently'), {
      extra: {
        jobId: job.id,
        jobName: job.name,
        attempts: job.attemptsMade,
        data: job.data,
        failedReason: job.failedReason,
      },
    });

    // Send alert if > 5 jobs in DLQ
    const dlqCount = await this.getDeadLetterQueueCount();
    if (dlqCount > 5) {
      // Trigger Sentry alert
      Sentry.captureMessage('Dead Letter Queue threshold exceeded', {
        level: 'error',
        extra: { count: dlqCount },
      });
    }
  }
}
```

## Testing Alerts

### 1. Test Health Check

```bash
# Healthy
curl https://api.sentinel-rfp.com/health

# Simulate unhealthy (stop database)
docker stop sentinel-postgres
curl https://api.sentinel-rfp.com/health
# Should return 503
docker start sentinel-postgres
```

### 2. Test Sentry Alerts

```typescript
// Add temporary route
@Get('test-error')
testError() {
  throw new Error('Test Sentry alert - DELETE THIS ROUTE');
}
```

```bash
# Trigger alert
curl https://api.sentinel-rfp.com/test-error

# Check Sentry Dashboard
# Check Slack #alerts-critical
# Check email
```

### 3. Test High Frequency Alert

```bash
# Generate 15 errors in 30 seconds
for i in {1..15}; do
  curl https://api.sentinel-rfp.com/test-error &
  sleep 2
done

# Should trigger "Critical Errors Alert"
```

## Monitoring Best Practices

1. **Health Check Frequency:**
   - Production: 30s (configurado)
   - Staging: 60s
   - Development: Desabilitado

2. **Alert Fatigue:**
   - Não configure alertas para erros esperados (4xx user errors)
   - Use rate limiting para alertas repetidos
   - Configure silencing rules para manutenção programada

3. **Escalation:**
   - P0 (Critical): Slack + Email + SMS (se disponível)
   - P1 (High): Slack + Email
   - P2 (Medium): Slack apenas
   - P3 (Low): Email diário resumido

4. **Runbooks:**
   - Documentar procedimentos de resposta para cada alerta
   - Link para runbook no corpo do alerta
   - Exemplos:
     - Database down → Check Railway logs, restart service
     - High error rate → Check recent deploys, rollback if needed

## Metrics to Monitor (Future)

Quando implementar observabilidade completa (issue #86):

- **Performance:**
  - API latency P50, P95, P99
  - Database query time
  - Response time distribution

- **Business:**
  - Proposals created/hour
  - Active users
  - AI response generation time
  - Trust score distribution

- **Infrastructure:**
  - CPU/Memory usage
  - Database connections
  - Queue size (when BullMQ is added)

## Related Issues

- #119 - Sentry Integration (✅ Completed)
- #120 - Error Alerting & Monitoring Rules (Current)
- #86 - Observability (Future: Tracing, APM)
- #85 - Testing Infrastructure (E2E health check tests)

## References

- [Railway Health Checks](https://docs.railway.app/deploy/healthchecks)
- [Sentry Alerts](https://docs.sentry.io/product/alerts/)
- [NestJS Health Checks](https://docs.nestjs.com/recipes/terminus)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
