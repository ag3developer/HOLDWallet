# 🏗️ Arquitetura: Data Aggregator Service

## 📋 Visão Geral

O **Data Aggregator** é um serviço intermediário que centraliza todas as chamadas às APIs públicas de blockchain e preços. Ele funciona como uma camada de abstração entre o backend da HOLD Wallet e os provedores externos.

## 🎯 Objetivos

### 1. **Centralização de APIs**
- Um único ponto de entrada para todas as consultas blockchain
- Gerenciamento unificado de credenciais e API keys
- Facilita manutenção e atualizações

### 2. **Otimização de Rate Limits**
- Pool de requisições compartilhado
- Fila inteligente com priorização
- Retry automático com backoff exponencial

### 3. **Caching Avançado**
- Cache compartilhado entre todos os usuários
- Invalidação inteligente por tipo de dado
- Reduz custos de APIs pagas

### 4. **Redundância e Failover**
- Múltiplos provedores por blockchain
- Fallback automático em caso de falha
- Health check contínuo dos provedores

### 5. **Monitoramento e Métricas**
- Tracking de uso por rede/usuário
- Alertas de rate limit
- Dashboard de performance

## 🏛️ Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                     HOLD Wallet Backend                      │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Routers   │  │  Services   │  │   Models    │         │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘         │
│         │                 │                                   │
│         └────────┬────────┘                                  │
│                  │                                            │
└──────────────────┼────────────────────────────────────────────┘
                   │
                   │ HTTP/gRPC
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              🌐 Data Aggregator Service                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Gateway Layer                        │   │
│  │  - Rate Limiting                                      │   │
│  │  - Authentication                                     │   │
│  │  - Request Validation                                 │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                           │
│  ┌────────────────▼─────────────────────────────────────┐   │
│  │           Aggregator Core                             │   │
│  │                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ Request      │  │ Cache        │  │ Queue      │ │   │
│  │  │ Router       │  │ Manager      │  │ Manager    │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  │                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ Provider     │  │ Fallback     │  │ Metrics    │ │   │
│  │  │ Manager      │  │ Handler      │  │ Collector  │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                           │
│  ┌────────────────▼─────────────────────────────────────┐   │
│  │         Network Adapters Layer                        │   │
│  │                                                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │   │
│  │  │Bitcoin  │ │Ethereum │ │Polygon  │ │  Tron    │  │   │
│  │  │Adapter  │ │Adapter  │ │Adapter  │ │  Adapter │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────┘  │   │
│  │                                                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │   │
│  │  │Solana   │ │Cardano  │ │Price    │ │  ...     │  │   │
│  │  │Adapter  │ │Adapter  │ │Adapter  │ │          │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────────┘  │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                           │
└───────────────────┼───────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│  Redis Cache  │      │  PostgreSQL   │
│  (Hot Data)   │      │  (Metrics)    │
└───────────────┘      └───────────────┘
                    │
        ┌───────────┴──────────────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────────┐                  ┌──────────────────┐
│ External APIs     │                  │ Backup Providers │
│                   │                  │                  │
│ • Blockstream     │                  │ • Infura         │
│ • Polygon RPC     │                  │ • Alchemy        │
│ • CoinGecko       │                  │ • QuickNode      │
│ • TronGrid        │                  │ • Moralis        │
│ • Solana RPC      │                  │ • GetBlock       │
│ • BlockCypher     │                  │ • Chainstack     │
└───────────────────┘                  └──────────────────┘
```

## 📦 Componentes Principais

### 1. **API Gateway Layer**

```python
# backend/aggregator/gateway/api_gateway.py

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

app = FastAPI(title="HOLD Wallet Data Aggregator")
limiter = Limiter(key_func=get_remote_address)

# Rate limiting por endpoint
@app.get("/api/v1/balance/{network}/{address}")
@limiter.limit("100/minute")
async def get_balance(
    network: str, 
    address: str,
    api_key: str = Depends(verify_api_key)
):
    """Get balance from aggregator"""
    result = await aggregator_core.get_balance(network, address)
    return result
```

### 2. **Aggregator Core**

```python
# backend/aggregator/core/aggregator.py

class DataAggregator:
    def __init__(self):
        self.cache_manager = CacheManager()
        self.provider_manager = ProviderManager()
        self.queue_manager = QueueManager()
        self.metrics = MetricsCollector()
    
    async def get_balance(self, network: str, address: str):
        # 1. Check cache first
        cache_key = f"balance:{network}:{address}"
        cached = await self.cache_manager.get(cache_key)
        if cached:
            self.metrics.record_cache_hit(network)
            return cached
        
        # 2. Get from provider with fallback
        try:
            provider = self.provider_manager.get_best_provider(network)
            result = await provider.get_balance(address)
            
            # 3. Cache result
            await self.cache_manager.set(
                cache_key, 
                result, 
                ttl=self.get_cache_ttl(network)
            )
            
            self.metrics.record_api_call(network, provider.name)
            return result
            
        except ProviderError as e:
            # Fallback to secondary provider
            fallback = self.provider_manager.get_fallback_provider(network)
            result = await fallback.get_balance(address)
            return result
```

### 3. **Cache Manager**

```python
# backend/aggregator/core/cache_manager.py

class CacheManager:
    def __init__(self):
        self.redis_client = Redis.from_url(settings.REDIS_URL)
        self.local_cache = TTLCache(maxsize=1000, ttl=30)
    
    async def get(self, key: str):
        # L1: Local cache (in-memory)
        if key in self.local_cache:
            return self.local_cache[key]
        
        # L2: Redis cache (shared)
        value = await self.redis_client.get(key)
        if value:
            self.local_cache[key] = value
            return value
        
        return None
    
    async def set(self, key: str, value: Any, ttl: int):
        # Save to both caches
        self.local_cache[key] = value
        await self.redis_client.setex(key, ttl, value)
    
    def get_cache_ttl(self, data_type: str) -> int:
        """Dynamic TTL based on data type"""
        ttls = {
            "balance": 30,      # 30 seconds
            "price": 60,        # 1 minute
            "transaction": 300, # 5 minutes
            "block": 10,        # 10 seconds
        }
        return ttls.get(data_type, 60)
```

### 4. **Provider Manager**

```python
# backend/aggregator/providers/provider_manager.py

class ProviderManager:
    def __init__(self):
        self.providers = self.load_providers()
        self.health_checker = HealthChecker(self.providers)
    
    def load_providers(self):
        """Load all network providers with redundancy"""
        return {
            "bitcoin": [
                BlockstreamProvider(priority=1),
                BlockCypherProvider(priority=2),
                MempoolSpaceProvider(priority=3)
            ],
            "ethereum": [
                InfuraProvider(priority=1),
                AlchemyProvider(priority=2),
                PublicRPCProvider(priority=3)
            ],
            "polygon": [
                PolygonRPCProvider(priority=1),
                AlchemyProvider(priority=2),
                InfuraProvider(priority=3)
            ],
            # ... mais redes
        }
    
    def get_best_provider(self, network: str):
        """Get highest priority healthy provider"""
        providers = self.providers.get(network, [])
        
        for provider in sorted(providers, key=lambda p: p.priority):
            if self.health_checker.is_healthy(provider):
                return provider
        
        raise NoHealthyProviderError(f"No healthy provider for {network}")
    
    def get_fallback_provider(self, network: str):
        """Get next available provider"""
        providers = self.providers.get(network, [])
        
        # Get second best
        healthy = [p for p in providers if self.health_checker.is_healthy(p)]
        if len(healthy) > 1:
            return healthy[1]
        
        raise NoFallbackProviderError(f"No fallback for {network}")
```

### 5. **Network Adapters**

```python
# backend/aggregator/adapters/bitcoin_adapter.py

class BitcoinAdapter(BaseAdapter):
    def __init__(self):
        self.providers = [
            BlockstreamAPI(),
            BlockCypherAPI(),
            MempoolSpaceAPI()
        ]
    
    async def get_balance(self, address: str):
        """Get balance with automatic fallback"""
        for provider in self.providers:
            try:
                balance = await provider.get_balance(address)
                return {
                    "address": address,
                    "balance": balance,
                    "network": "bitcoin",
                    "provider": provider.name,
                    "timestamp": datetime.utcnow()
                }
            except Exception as e:
                logger.warning(f"Provider {provider.name} failed: {e}")
                continue
        
        raise AllProvidersFailed("All Bitcoin providers failed")
    
    async def get_transactions(self, address: str, limit: int = 50):
        """Get transactions with pagination"""
        # Implementation
        pass
```

### 6. **Metrics Collector**

```python
# backend/aggregator/monitoring/metrics.py

class MetricsCollector:
    def __init__(self):
        self.db = MetricsDatabase()
        self.prometheus = PrometheusExporter()
    
    def record_api_call(self, network: str, provider: str):
        """Record API call for monitoring"""
        self.prometheus.increment_counter(
            "aggregator_api_calls_total",
            labels={"network": network, "provider": provider}
        )
        
        self.db.insert({
            "timestamp": datetime.utcnow(),
            "network": network,
            "provider": provider,
            "type": "api_call"
        })
    
    def record_cache_hit(self, network: str):
        """Record cache hit"""
        self.prometheus.increment_counter(
            "aggregator_cache_hits_total",
            labels={"network": network}
        )
    
    async def get_usage_stats(self, time_range: str = "24h"):
        """Get usage statistics"""
        return await self.db.query_stats(time_range)
```

## 🔧 Implementação por Fases

### **Fase 1: MVP (2 semanas)**
- ✅ API Gateway básico
- ✅ Cache Redis de 2 níveis
- ✅ Adapters para Bitcoin, Ethereum, Polygon
- ✅ Provider manager com 1 fallback
- ✅ Métricas básicas (logs)

### **Fase 2: Otimização (2 semanas)**
- ✅ Todos os 15 adapters
- ✅ Múltiplos providers por rede
- ✅ Health checks automáticos
- ✅ Queue manager para rate limiting
- ✅ Dashboard de métricas (Grafana)

### **Fase 3: Produção (2 semanas)**
- ✅ Auto-scaling
- ✅ Circuit breakers
- ✅ Distributed tracing (Jaeger)
- ✅ Alertas (PagerDuty/Slack)
- ✅ Documentação completa

### **Fase 4: Advanced (contínuo)**
- ✅ Machine learning para otimizar cache
- ✅ Previsão de rate limits
- ✅ Auto-negociação de API keys
- ✅ Cost optimization

## 📊 Estrutura de Diretórios

```
backend/
├── aggregator/                    # 🌐 Data Aggregator Service
│   ├── __init__.py
│   ├── main.py                   # FastAPI app principal
│   ├── config.py                 # Configurações
│   │
│   ├── gateway/                  # API Gateway Layer
│   │   ├── __init__.py
│   │   ├── api_gateway.py       # Endpoints REST
│   │   ├── rate_limiter.py      # Rate limiting
│   │   └── auth.py              # Autenticação
│   │
│   ├── core/                     # Aggregator Core
│   │   ├── __init__.py
│   │   ├── aggregator.py        # Lógica principal
│   │   ├── cache_manager.py     # Cache L1 + L2
│   │   ├── queue_manager.py     # Fila de requisições
│   │   └── circuit_breaker.py   # Circuit breaker pattern
│   │
│   ├── providers/                # Provider Management
│   │   ├── __init__.py
│   │   ├── provider_manager.py  # Gerenciador
│   │   ├── health_checker.py    # Health checks
│   │   └── fallback_handler.py  # Fallback logic
│   │
│   ├── adapters/                 # Network Adapters
│   │   ├── __init__.py
│   │   ├── base_adapter.py      # Base class
│   │   ├── bitcoin_adapter.py
│   │   ├── ethereum_adapter.py
│   │   ├── polygon_adapter.py
│   │   ├── solana_adapter.py
│   │   └── ...                   # Outros adapters
│   │
│   ├── external/                 # External API Clients
│   │   ├── __init__.py
│   │   ├── blockstream.py
│   │   ├── infura.py
│   │   ├── alchemy.py
│   │   ├── coingecko.py
│   │   └── ...
│   │
│   ├── monitoring/               # Monitoring & Metrics
│   │   ├── __init__.py
│   │   ├── metrics.py           # Prometheus metrics
│   │   ├── logger.py            # Logging
│   │   └── tracer.py            # Distributed tracing
│   │
│   ├── models/                   # Data Models
│   │   ├── __init__.py
│   │   ├── requests.py          # Request schemas
│   │   ├── responses.py         # Response schemas
│   │   └── metrics.py           # Metrics models
│   │
│   └── utils/                    # Utilities
│       ├── __init__.py
│       ├── retry.py             # Retry logic
│       ├── validators.py        # Input validation
│       └── helpers.py           # Helper functions
│
├── app/                          # 📱 HOLD Wallet Backend (existente)
│   ├── clients/
│   │   └── aggregator_client.py # Cliente para Data Aggregator
│   ├── services/
│   │   └── blockchain_service.py # Agora usa aggregator_client
│   └── ...
│
├── docker-compose.yml            # Adicionar aggregator service
├── requirements.txt              # Atualizar dependências
└── README.md
```

## 🔌 Integração com Backend Existente

### Antes (Direto):
```python
# app/services/blockchain_service.py (ANTIGO)

class BlockchainService:
    async def get_address_balance(self, address: str, network: str):
        # Chamada direta à API pública
        if network == "bitcoin":
            response = await httpx.get(
                f"https://blockstream.info/api/address/{address}/utxo"
            )
            # ...
```

### Depois (Via Aggregator):
```python
# app/services/blockchain_service.py (NOVO)

from app.clients.aggregator_client import AggregatorClient

class BlockchainService:
    def __init__(self):
        self.aggregator = AggregatorClient(
            base_url=settings.AGGREGATOR_URL,
            api_key=settings.AGGREGATOR_API_KEY
        )
    
    async def get_address_balance(self, address: str, network: str):
        # Chamada ao aggregator (com cache, fallback, etc)
        result = await self.aggregator.get_balance(network, address)
        return result
```

### Cliente do Aggregator:
```python
# app/clients/aggregator_client.py

class AggregatorClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def get_balance(self, network: str, address: str):
        """Get balance from aggregator"""
        response = await self.client.get(
            f"{self.base_url}/api/v1/balance/{network}/{address}",
            headers={"X-API-Key": self.api_key}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_price(self, symbol: str, vs_currency: str = "usd"):
        """Get price from aggregator"""
        response = await self.client.get(
            f"{self.base_url}/api/v1/price/{symbol}",
            params={"vs_currency": vs_currency},
            headers={"X-API-Key": self.api_key}
        )
        response.raise_for_status()
        return response.json()
```

## 🐳 Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  # Serviço existente
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - AGGREGATOR_URL=http://aggregator:8001
      - AGGREGATOR_API_KEY=${AGGREGATOR_API_KEY}
    depends_on:
      - aggregator
      - postgres
      - redis
  
  # 🆕 Data Aggregator Service
  aggregator:
    build: ./backend/aggregator
    ports:
      - "8001:8001"
    environment:
      - REDIS_URL=redis://redis:6379/1
      - POSTGRES_URL=postgresql://user:pass@postgres:5432/aggregator_db
      - BLOCKSTREAM_API_URL=https://blockstream.info/api
      - INFURA_API_KEY=${INFURA_API_KEY}
      - ALCHEMY_API_KEY=${ALCHEMY_API_KEY}
      - COINGECKO_API_KEY=${COINGECKO_API_KEY}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
  
  # Redis (cache compartilhado)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  # PostgreSQL (métricas)
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=holdwallet
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=holdwallet
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  # 🆕 Prometheus (métricas)
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./aggregator/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
  
  # 🆕 Grafana (dashboard)
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  redis_data:
  postgres_data:
  prometheus_data:
  grafana_data:
```

## 📈 Métricas e Monitoramento

### Dashboard Grafana
- **Requests/sec** por rede
- **Cache hit rate** global e por rede
- **Latência média** por provider
- **Rate limit usage** em tempo real
- **Error rate** por provider
- **Cost tracking** (APIs pagas)

### Alertas
```yaml
# aggregator/monitoring/alerts.yml

alerts:
  - name: high_rate_limit_usage
    condition: rate_limit_usage > 80%
    action: slack_notification
    
  - name: provider_down
    condition: health_check_failed > 3
    action: switch_to_fallback
    
  - name: cache_hit_rate_low
    condition: cache_hit_rate < 60%
    action: increase_cache_ttl
```

## 💰 Estimativa de Custos

### Sem Aggregator (Atual)
- 1000 usuários × 100 req/dia = 100k req/dia
- CoinGecko API: $0.01/req = **$1000/dia** = **$30k/mês**

### Com Aggregator
- Cache hit rate 80% = 20k req/dia às APIs
- CoinGecko API: 20k × $0.01 = **$200/dia** = **$6k/mês**
- **Economia: $24k/mês (80%)**

## 🚀 Benefícios Esperados

1. **Performance**: 80% menos latência (cache)
2. **Confiabilidade**: 99.9% uptime (fallback)
3. **Custos**: 80% redução em APIs pagas
4. **Escalabilidade**: Suporta 10x+ usuários
5. **Manutenibilidade**: Código desacoplado
6. **Observabilidade**: Métricas completas

## 📝 Próximos Passos

1. **Criar branch**: `feat/data-aggregator`
2. **Implementar Fase 1** (MVP em 2 semanas)
3. **Testar em staging**
4. **Migração gradual** (canary deployment)
5. **Monitorar métricas**
6. **Iterar e melhorar**

---

**Status**: 📋 Planejado  
**Prioridade**: 🔴 Alta  
**Estimativa**: 6 semanas (MVP + Prod)  
**ROI**: 80% redução de custos + melhor UX
