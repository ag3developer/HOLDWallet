# 🧠 WolkNow AI Portfolio Intelligence

## Análise da Página Atual

A página `/portfolio` atualmente possui:

- **Visão Geral**: Valor total, melhor ativo, diversificação, alertas
- **Ativos**: Lista de holdings com preço, variação 24h, alocação
- **Transações**: Histórico de compras/vendas/transferências
- **Analytics**: PLACEHOLDER - "Em Breve"

## 📊 Proposta: Sistema de IA Preditiva Premium

### Visão do Produto

**WolkNow Intelligence** - Um sistema de IA preditiva que analisa:

- 20+ indicadores técnicos
- Fluxo e volume real de mercado
- Matriz de correlação entre ativos
- Predições de 7, 15 e 30 dias
- Detecção de rompimento de ATH
- Análise histórica + presente + futuro

---

## 🏗️ Arquitetura Técnica

### Backend - Stack de IA

```
┌─────────────────────────────────────────────────────────────────┐
│                    WOLKNOW AI ENGINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Data       │  │  Technical   │  │  Prediction  │         │
│  │   Pipeline   │  │  Indicators  │  │  Engine      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                 │                 │
│         ▼                  ▼                 ▼                 │
│  ┌─────────────────────────────────────────────────┐          │
│  │           AI/ML Processing Layer                │          │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │          │
│  │  │ Prophet │ │ LSTM    │ │ XGBoost │          │          │
│  │  │ (Meta)  │ │ Neural  │ │ Gradient│          │          │
│  │  └─────────┘ └─────────┘ └─────────┘          │          │
│  └─────────────────────────────────────────────────┘          │
│                          │                                     │
│                          ▼                                     │
│  ┌─────────────────────────────────────────────────┐          │
│  │           Insights Generation                    │          │
│  │  • Swap Recommendations                         │          │
│  │  • Correlation Matrix                           │          │
│  │  • ATH Breakout Alerts                         │          │
│  │  • Risk Assessment                             │          │
│  └─────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fontes de Dados

| Fonte                  | Dados                      | Uso                        |
| ---------------------- | -------------------------- | -------------------------- |
| **Binance API**        | OHLCV, Volume, Order Book  | Dados primários de mercado |
| **CoinGecko**          | Preços, Market Cap, Social | Métricas de mercado        |
| **Glassnode**          | On-chain metrics           | Análise de fluxo           |
| **CryptoQuant**        | Exchange flows             | Volume real                |
| **TradingView**        | Indicadores técnicos       | Validação                  |
| **Fear & Greed Index** | Sentimento                 | Contexto de mercado        |

---

## 📈 20+ Indicadores Técnicos

### Tendência (Trend)

1. **SMA** (Simple Moving Average) - 20, 50, 200
2. **EMA** (Exponential Moving Average) - 9, 21, 55
3. **MACD** (Moving Average Convergence Divergence)
4. **ADX** (Average Directional Index)
5. **Ichimoku Cloud**
6. **Parabolic SAR**

### Momentum

7. **RSI** (Relative Strength Index)
8. **Stochastic Oscillator**
9. **Williams %R**
10. **CCI** (Commodity Channel Index)
11. **ROC** (Rate of Change)

### Volatilidade

12. **Bollinger Bands**
13. **ATR** (Average True Range)
14. **Keltner Channel**
15. **Standard Deviation**

### Volume

16. **OBV** (On-Balance Volume)
17. **VWAP** (Volume Weighted Average Price)
18. **CMF** (Chaikin Money Flow)
19. **Volume Profile**
20. **Accumulation/Distribution**

### On-Chain (Diferencial)

21. **MVRV Ratio** (Market Value to Realized Value)
22. **SOPR** (Spent Output Profit Ratio)
23. **Exchange Net Flow**
24. **Active Addresses**
25. **Hash Rate** (para PoW)

---

## 🤖 Modelos de IA

### 1. Prophet (Meta) - Séries Temporais

```python
# Excelente para:
# - Sazonalidade
# - Tendências de longo prazo
# - Eventos especiais (halving, etc)

from prophet import Prophet
model = Prophet(
    changepoint_prior_scale=0.05,
    seasonality_mode='multiplicative'
)
```

### 2. LSTM (Long Short-Term Memory)

```python
# Excelente para:
# - Padrões sequenciais complexos
# - Dependências de longo prazo
# - Múltiplas features

from tensorflow.keras.layers import LSTM, Dense
model = Sequential([
    LSTM(100, return_sequences=True, input_shape=(60, n_features)),
    LSTM(50),
    Dense(1)
])
```

### 3. XGBoost - Gradient Boosting

```python
# Excelente para:
# - Feature importance
# - Classificação de sinais
# - Ensemble predictions

import xgboost as xgb
model = xgb.XGBRegressor(
    n_estimators=1000,
    learning_rate=0.01,
    max_depth=5
)
```

### 4. Ensemble Model

```python
# Combinação ponderada dos 3 modelos
# - Prophet: 30% (tendência)
# - LSTM: 40% (padrões)
# - XGBoost: 30% (classificação)
```

---

## 📊 Features do Produto

### 1. Dashboard de Insights

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 WolkNow Intelligence                    PRO ✨          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ 📈 Predição BTC │  │ 📈 Predição ETH │                  │
│  │                 │  │                 │                  │
│  │ 7d:  +4.2%     │  │ 7d:  +6.8%     │                  │
│  │ 15d: +8.5%     │  │ 15d: +12.3%    │                  │
│  │ 30d: +15.2%    │  │ 30d: +22.1%    │                  │
│  │                 │  │                 │                  │
│  │ Confiança: 78% │  │ Confiança: 72% │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  🔄 SWAP RECOMENDADO                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ VENDER: 30% do BTC → COMPRAR: ETH                   │   │
│  │ Motivo: ETH com maior potencial de alta (+7.4%)     │   │
│  │ Correlação atual: 0.85 (caindo)                     │   │
│  │ Timing: Agora (RSI BTC sobrecomprado)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Matriz de Correlação

```
        BTC    ETH    SOL    ADA    DOT
BTC     1.00   0.85   0.72   0.65   0.58
ETH     0.85   1.00   0.78   0.71   0.64
SOL     0.72   0.78   1.00   0.82   0.75
ADA     0.65   0.71   0.82   1.00   0.88
DOT     0.58   0.64   0.75   0.88   1.00

💡 Insight: ADA e DOT altamente correlacionadas (0.88)
   Considere diversificar para ativos não correlacionados
```

### 3. ATH Breakout Monitor

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 ATH BREAKOUT MONITOR                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BTC  ████████████████░░░░ 78% do ATH  ($69,000)           │
│       🔔 Alerta configurado: 95%                           │
│       📊 Probabilidade rompimento 30d: 45%                 │
│                                                             │
│  ETH  ██████████████░░░░░░ 68% do ATH  ($4,878)            │
│       🔔 Alerta configurado: 90%                           │
│       📊 Probabilidade rompimento 30d: 38%                 │
│                                                             │
│  SOL  ████████████████████ 95% do ATH  ($260)   🔥 QUENTE  │
│       🔔 ALERTA: Próximo do rompimento!                    │
│       📊 Probabilidade rompimento 7d: 72%                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Análise Histórica + Predição

```
┌─────────────────────────────────────────────────────────────┐
│  📊 ANÁLISE TEMPORAL - BTC                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PASSADO (Últimos 30 dias)                                 │
│  • Tendência: Alta (+18.5%)                                │
│  • Volatilidade: Média (ATR 2.3%)                          │
│  • Volume: Crescente (+45%)                                │
│  • Padrão identificado: Cup and Handle                     │
│                                                             │
│  PRESENTE (Agora)                                          │
│  • Preço: $65,420                                          │
│  • RSI: 68 (neutro-alto)                                   │
│  • MACD: Bullish crossover                                 │
│  • Volume: Acima da média                                  │
│                                                             │
│  FUTURO (Predições)                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     📅 7 dias   │  📅 15 dias  │  📅 30 dias        │   │
│  │─────────────────┼──────────────┼────────────────────│   │
│  │ 🎯 $68,200     │ 🎯 $71,500   │ 🎯 $78,300         │   │
│  │ 📈 +4.2%       │ 📈 +9.3%     │ 📈 +19.7%          │   │
│  │ 🎲 78% conf.   │ 🎲 72% conf. │ 🎲 65% conf.       │   │
│  │                 │              │                    │   │
│  │ Range:         │ Range:       │ Range:             │   │
│  │ $64k - $72k    │ $66k - $77k  │ $68k - $88k        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. Insights de Swap Inteligente

```
┌─────────────────────────────────────────────────────────────┐
│  🔄 SWAP INTELLIGENCE                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SEU PORTFOLIO ATUAL                                        │
│  BTC: 45% | ETH: 30% | SOL: 15% | USDT: 10%                │
│                                                             │
│  💡 RECOMENDAÇÕES BASEADAS EM IA                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1️⃣ SWAP AGRESSIVO (Alto retorno / Alto risco)       │   │
│  │    VENDER: 20% BTC ($7,104)                         │   │
│  │    COMPRAR: SOL                                     │   │
│  │    Retorno esperado 30d: +28%                       │   │
│  │    Risco: ⚠️⚠️⚠️ (Volatilidade alta)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 2️⃣ SWAP MODERADO (Balanceado)                       │   │
│  │    VENDER: 10% ETH ($4,164)                         │   │
│  │    COMPRAR: LINK                                    │   │
│  │    Retorno esperado 30d: +15%                       │   │
│  │    Risco: ⚠️⚠️ (Moderado)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 3️⃣ SWAP CONSERVADOR (Proteção)                      │   │
│  │    VENDER: 5% SOL ($533)                            │   │
│  │    COMPRAR: USDC (Stablecoin)                       │   │
│  │    Motivo: RSI SOL sobrecomprado                    │   │
│  │    Risco: ⚠️ (Baixo)                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [🔄 Executar Swap] [📊 Ver Análise Completa]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 Planos de Assinatura

### Estrutura de Pricing

| Plano          | Preço      | Features                                         |
| -------------- | ---------- | ------------------------------------------------ |
| **Free**       | R$ 0       | Dashboard básico, alertas limitados              |
| **Pro**        | R$ 49/mês  | 20+ indicadores, predições 7d, matriz correlação |
| **Premium**    | R$ 149/mês | Tudo do Pro + predições 30d, swap insights, API  |
| **Enterprise** | R$ 499/mês | Tudo + white-label, suporte dedicado             |

### Features por Plano

```
┌─────────────────────────────────────────────────────────────────┐
│ FEATURE                    │ FREE │ PRO  │ PREMIUM │ ENTERPRISE│
├─────────────────────────────────────────────────────────────────┤
│ Dashboard Básico           │  ✅  │  ✅  │   ✅    │    ✅     │
│ Indicadores Técnicos (5)   │  ✅  │  ✅  │   ✅    │    ✅     │
│ Indicadores Técnicos (20+) │  ❌  │  ✅  │   ✅    │    ✅     │
│ Predição 7 dias            │  ❌  │  ✅  │   ✅    │    ✅     │
│ Predição 15 dias           │  ❌  │  ❌  │   ✅    │    ✅     │
│ Predição 30 dias           │  ❌  │  ❌  │   ✅    │    ✅     │
│ Matriz de Correlação       │  ❌  │  ✅  │   ✅    │    ✅     │
│ ATH Breakout Monitor       │  ❌  │  ✅  │   ✅    │    ✅     │
│ Swap Insights              │  ❌  │  ❌  │   ✅    │    ✅     │
│ Alertas Personalizados     │  3   │  20  │   ∞     │    ∞      │
│ Histórico de Predições     │  ❌  │  30d │   1 ano │   Ilimitado│
│ API Access                 │  ❌  │  ❌  │   ✅    │    ✅     │
│ Export CSV/PDF             │  ❌  │  ❌  │   ✅    │    ✅     │
│ Suporte                    │ Email│ Chat │ Priority│  Dedicado │
│ White-label                │  ❌  │  ❌  │   ❌    │    ✅     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementação Backend

### Estrutura de Arquivos

```
backend/
├── app/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── data_pipeline.py      # Coleta de dados
│   │   │   ├── indicators.py         # 20+ indicadores técnicos
│   │   │   ├── prophet_model.py      # Facebook Prophet
│   │   │   ├── lstm_model.py         # LSTM Neural Network
│   │   │   ├── xgboost_model.py      # XGBoost
│   │   │   ├── ensemble.py           # Modelo ensemble
│   │   │   ├── correlation.py        # Matriz de correlação
│   │   │   ├── ath_detector.py       # Detecção de ATH
│   │   │   ├── swap_advisor.py       # Recomendações de swap
│   │   │   └── insights_generator.py # Geração de insights
│   │   │
│   │   └── subscription/
│   │       ├── __init__.py
│   │       ├── plans.py              # Definição dos planos
│   │       ├── payment.py            # Integração pagamentos
│   │       └── access_control.py     # Controle de acesso
│   │
│   ├── routers/
│   │   ├── ai_predictions.py         # Endpoints de predição
│   │   ├── ai_indicators.py          # Endpoints de indicadores
│   │   ├── ai_insights.py            # Endpoints de insights
│   │   └── subscription.py           # Endpoints de assinatura
│   │
│   └── models/
│       ├── prediction.py
│       ├── indicator.py
│       └── subscription.py
│
├── ml_models/                         # Modelos treinados salvos
│   ├── prophet/
│   ├── lstm/
│   └── xgboost/
│
└── data/
    ├── historical/                    # Dados históricos
    └── cache/                         # Cache de predições
```

### Exemplo de Código - Indicadores

```python
# backend/app/services/ai/indicators.py

import pandas as pd
import numpy as np
import talib
from typing import Dict, List

class TechnicalIndicators:
    """
    20+ indicadores técnicos para análise de mercado
    """

    def __init__(self, ohlcv_data: pd.DataFrame):
        self.df = ohlcv_data
        self.close = self.df['close'].values
        self.high = self.df['high'].values
        self.low = self.df['low'].values
        self.volume = self.df['volume'].values

    def calculate_all(self) -> Dict:
        """Calcula todos os indicadores"""
        return {
            # Tendência
            'sma_20': self._sma(20),
            'sma_50': self._sma(50),
            'sma_200': self._sma(200),
            'ema_9': self._ema(9),
            'ema_21': self._ema(21),
            'macd': self._macd(),
            'adx': self._adx(),
            'ichimoku': self._ichimoku(),

            # Momentum
            'rsi': self._rsi(),
            'stoch': self._stochastic(),
            'williams_r': self._williams_r(),
            'cci': self._cci(),
            'roc': self._roc(),

            # Volatilidade
            'bollinger': self._bollinger(),
            'atr': self._atr(),
            'keltner': self._keltner(),

            # Volume
            'obv': self._obv(),
            'vwap': self._vwap(),
            'cmf': self._cmf(),
            'ad': self._ad(),

            # Sinais agregados
            'signal': self._generate_signal()
        }

    def _rsi(self, period: int = 14) -> Dict:
        rsi = talib.RSI(self.close, timeperiod=period)
        current = rsi[-1]
        return {
            'value': current,
            'signal': 'oversold' if current < 30 else 'overbought' if current > 70 else 'neutral',
            'strength': abs(current - 50) / 50
        }

    def _macd(self) -> Dict:
        macd, signal, hist = talib.MACD(self.close)
        return {
            'macd': macd[-1],
            'signal': signal[-1],
            'histogram': hist[-1],
            'crossover': 'bullish' if hist[-1] > 0 and hist[-2] < 0 else
                        'bearish' if hist[-1] < 0 and hist[-2] > 0 else 'none'
        }

    def _bollinger(self, period: int = 20) -> Dict:
        upper, middle, lower = talib.BBANDS(self.close, timeperiod=period)
        current = self.close[-1]
        return {
            'upper': upper[-1],
            'middle': middle[-1],
            'lower': lower[-1],
            'position': (current - lower[-1]) / (upper[-1] - lower[-1]),
            'signal': 'oversold' if current < lower[-1] else
                     'overbought' if current > upper[-1] else 'neutral'
        }

    def _generate_signal(self) -> Dict:
        """Gera sinal agregado de todos os indicadores"""
        bullish = 0
        bearish = 0

        # RSI
        rsi = self._rsi()
        if rsi['signal'] == 'oversold':
            bullish += 1
        elif rsi['signal'] == 'overbought':
            bearish += 1

        # MACD
        macd = self._macd()
        if macd['crossover'] == 'bullish':
            bullish += 2
        elif macd['crossover'] == 'bearish':
            bearish += 2

        # Bollinger
        bb = self._bollinger()
        if bb['signal'] == 'oversold':
            bullish += 1
        elif bb['signal'] == 'overbought':
            bearish += 1

        total = bullish + bearish
        if total == 0:
            return {'direction': 'neutral', 'strength': 0}

        return {
            'direction': 'bullish' if bullish > bearish else 'bearish',
            'strength': abs(bullish - bearish) / total,
            'bullish_count': bullish,
            'bearish_count': bearish
        }
```

### Exemplo de Código - Predição

```python
# backend/app/services/ai/ensemble.py

from prophet import Prophet
from tensorflow.keras.models import load_model
import xgboost as xgb
import numpy as np
from typing import Dict, List

class EnsemblePredictionEngine:
    """
    Motor de predição usando ensemble de 3 modelos:
    - Prophet (tendência e sazonalidade)
    - LSTM (padrões sequenciais)
    - XGBoost (classificação de sinais)
    """

    def __init__(self):
        self.prophet_weight = 0.30
        self.lstm_weight = 0.40
        self.xgboost_weight = 0.30

    def predict(
        self,
        symbol: str,
        periods: List[int] = [7, 15, 30]
    ) -> Dict:
        """
        Gera predições para múltiplos períodos
        """
        results = {}

        for period in periods:
            # Prophet - Tendência
            prophet_pred = self._prophet_predict(symbol, period)

            # LSTM - Padrões
            lstm_pred = self._lstm_predict(symbol, period)

            # XGBoost - Classificação
            xgb_pred = self._xgboost_predict(symbol, period)

            # Ensemble
            ensemble_pred = (
                prophet_pred['price'] * self.prophet_weight +
                lstm_pred['price'] * self.lstm_weight +
                xgb_pred['price'] * self.xgboost_weight
            )

            # Confiança baseada na concordância dos modelos
            predictions = [prophet_pred['price'], lstm_pred['price'], xgb_pred['price']]
            std_dev = np.std(predictions)
            mean_pred = np.mean(predictions)
            confidence = max(0.5, 1 - (std_dev / mean_pred))

            results[f'{period}d'] = {
                'price': ensemble_pred,
                'change_percent': ((ensemble_pred - self.current_price) / self.current_price) * 100,
                'confidence': confidence,
                'range': {
                    'low': ensemble_pred * (1 - std_dev / mean_pred),
                    'high': ensemble_pred * (1 + std_dev / mean_pred)
                },
                'models': {
                    'prophet': prophet_pred,
                    'lstm': lstm_pred,
                    'xgboost': xgb_pred
                }
            }

        return results
```

---

## 🎨 Frontend - Componentes React

### Estrutura de Componentes

```
Frontend/src/
├── pages/
│   └── portfolio/
│       ├── PortfolioPage.tsx           # Página principal (existente)
│       └── components/
│           ├── AIInsightsDashboard.tsx # Dashboard de IA
│           ├── PredictionCard.tsx      # Card de predição
│           ├── CorrelationMatrix.tsx   # Matriz de correlação
│           ├── ATHMonitor.tsx          # Monitor de ATH
│           ├── SwapAdvisor.tsx         # Conselheiro de swap
│           ├── IndicatorPanel.tsx      # Painel de indicadores
│           ├── TimelineAnalysis.tsx    # Análise temporal
│           └── SubscriptionBanner.tsx  # Banner de assinatura
│
├── services/
│   ├── ai-prediction-service.ts        # Serviço de predições
│   ├── indicator-service.ts            # Serviço de indicadores
│   └── subscription-service.ts         # Serviço de assinatura
│
└── stores/
    ├── useAIStore.ts                   # Store de IA
    └── useSubscriptionStore.ts         # Store de assinatura
```

---

## 📅 Roadmap de Implementação

### Fase 1 - MVP (4 semanas)

- [x] Análise da página existente
- [ ] Setup de infraestrutura de dados
- [ ] Implementar 10 indicadores técnicos básicos
- [ ] Modelo Prophet para predição básica
- [ ] Dashboard de indicadores no frontend
- [ ] Sistema de planos básico

### Fase 2 - Core AI (6 semanas)

- [ ] LSTM para predições avançadas
- [ ] XGBoost para classificação
- [ ] Ensemble model
- [ ] Matriz de correlação
- [ ] ATH detector
- [ ] Swap advisor básico

### Fase 3 - Premium Features (4 semanas)

- [ ] 20+ indicadores completos
- [ ] Predições 7/15/30 dias
- [ ] Insights automáticos
- [ ] Alertas inteligentes
- [ ] Histórico de predições
- [ ] Backtesting básico

### Fase 4 - Enterprise (4 semanas)

- [ ] API pública
- [ ] White-label
- [ ] Relatórios avançados
- [ ] Integração com exchange
- [ ] Machine learning contínuo

---

## 📊 Métricas de Sucesso

### KPIs do Produto

- **Precisão de Predições**: > 65% em 7 dias
- **Satisfação do Usuário**: NPS > 40
- **Conversão Free → Pro**: > 8%
- **Conversão Pro → Premium**: > 25%
- **Churn Rate**: < 5% mensal

### Métricas Técnicas

- **Latência de Predição**: < 2s
- **Uptime**: > 99.9%
- **Atualização de Dados**: < 1 minuto
- **Cache Hit Rate**: > 80%

---

## 🔐 Considerações de Segurança

1. **Rate Limiting** por plano de assinatura
2. **Criptografia** de dados sensíveis
3. **Audit Logs** de todas as predições
4. **GDPR Compliance** para dados de usuário
5. **Disclaimer** sobre não ser recomendação financeira

---

## ⚠️ Disclaimer Legal

> **AVISO IMPORTANTE**: As predições e insights gerados pelo WolkNow Intelligence são baseados em análise técnica e modelos de machine learning. Elas NÃO constituem recomendação de investimento. O mercado de criptomoedas é altamente volátil e você pode perder todo o seu investimento. Sempre faça sua própria pesquisa (DYOR) antes de tomar decisões de investimento.

---

## 🚀 Próximos Passos

1. **Validar** este documento com stakeholders
2. **Priorizar** features para MVP
3. **Definir** stack de ML final
4. **Iniciar** desenvolvimento do data pipeline
5. **Criar** protótipos de UI no Figma

---

_Documento criado em: Janeiro 2026_
_Versão: 1.0_
_Autor: WolkNow AI Team_
