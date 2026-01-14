-- ============================================
-- WolkNow AI Module - PostgreSQL Tables
-- ============================================
-- Run this script to create AI prediction tables
-- Execute in your PostgreSQL database
-- ============================================

-- 1. AI Predictions Table
CREATE TABLE IF NOT EXISTS ai_predictions (
    id VARCHAR(36) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    base_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    period VARCHAR(10) NOT NULL,
    predicted_price FLOAT NOT NULL,
    predicted_change_percent FLOAT NOT NULL,
    confidence_score FLOAT NOT NULL,
    range_low FLOAT NOT NULL,
    range_high FLOAT NOT NULL,
    price_at_prediction FLOAT NOT NULL,
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    model_weights JSONB,
    signal_direction VARCHAR(10) NOT NULL,
    signal_strength FLOAT NOT NULL,
    prediction_date TIMESTAMP NOT NULL DEFAULT NOW(),
    target_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    actual_price FLOAT,
    actual_change_percent FLOAT,
    accuracy_score FLOAT,
    validated_at TIMESTAMP,
    indicators_snapshot JSONB,
    raw_model_outputs JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_pred_symbol_date ON ai_predictions(symbol, prediction_date);
CREATE INDEX IF NOT EXISTS idx_ai_pred_status ON ai_predictions(status);
CREATE INDEX IF NOT EXISTS idx_ai_pred_target ON ai_predictions(target_date);

-- 2. AI Indicator Snapshots Table
CREATE TABLE IF NOT EXISTS ai_indicator_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    price FLOAT NOT NULL,
    volume_24h FLOAT,
    market_cap FLOAT,
    rsi_14 FLOAT,
    rsi_signal VARCHAR(20),
    macd_value FLOAT,
    macd_signal FLOAT,
    macd_histogram FLOAT,
    macd_crossover VARCHAR(20),
    stoch_k FLOAT,
    stoch_d FLOAT,
    williams_r FLOAT,
    sma_20 FLOAT,
    sma_50 FLOAT,
    sma_200 FLOAT,
    ema_9 FLOAT,
    ema_21 FLOAT,
    adx FLOAT,
    bb_upper FLOAT,
    bb_middle FLOAT,
    bb_lower FLOAT,
    bb_position FLOAT,
    atr_14 FLOAT,
    obv FLOAT,
    volume_sma_20 FLOAT,
    overall_signal VARCHAR(20),
    signal_strength FLOAT,
    bullish_count INTEGER,
    bearish_count INTEGER,
    snapshot_date TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_indicator_symbol_date ON ai_indicator_snapshots(symbol, snapshot_date);

-- 3. AI Model Performance Table
CREATE TABLE IF NOT EXISTS ai_model_performance (
    id VARCHAR(36) PRIMARY KEY,
    model_version VARCHAR(20) NOT NULL,
    period VARCHAR(10) NOT NULL,
    analysis_start TIMESTAMP NOT NULL,
    analysis_end TIMESTAMP NOT NULL,
    total_predictions INTEGER NOT NULL DEFAULT 0,
    validated_predictions INTEGER NOT NULL DEFAULT 0,
    accuracy_mean FLOAT,
    accuracy_median FLOAT,
    accuracy_std FLOAT,
    direction_accuracy FLOAT,
    mae FLOAT,
    mape FLOAT,
    rmse FLOAT,
    confidence_correlation FLOAT,
    performance_by_symbol JSONB,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_version_period ON ai_model_performance(model_version, period);

-- 4. AI Correlation Matrices Table
CREATE TABLE IF NOT EXISTS ai_correlation_matrices (
    id VARCHAR(36) PRIMARY KEY,
    symbols JSONB NOT NULL,
    correlation_matrix JSONB NOT NULL,
    lookback_days INTEGER NOT NULL DEFAULT 30,
    high_correlations JSONB,
    low_correlations JSONB,
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correlation_date ON ai_correlation_matrices(calculated_at);

-- 5. AI ATH Monitor Table
CREATE TABLE IF NOT EXISTS ai_ath_monitor (
    id VARCHAR(36) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    ath_price FLOAT NOT NULL,
    ath_date TIMESTAMP NOT NULL,
    current_price FLOAT NOT NULL,
    ath_percentage FLOAT NOT NULL,
    distance_to_ath FLOAT NOT NULL,
    breakout_prob_7d FLOAT,
    breakout_prob_30d FLOAT,
    alert_threshold FLOAT DEFAULT 95.0,
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_triggered_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ath_symbol ON ai_ath_monitor(symbol);

-- 6. AI Swap Recommendations Table
CREATE TABLE IF NOT EXISTS ai_swap_recommendations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    risk_level VARCHAR(20) NOT NULL,
    sell_symbol VARCHAR(20) NOT NULL,
    sell_percentage FLOAT NOT NULL,
    buy_symbol VARCHAR(20) NOT NULL,
    primary_reason TEXT NOT NULL,
    supporting_indicators JSONB,
    expected_return_percent FLOAT,
    risk_score FLOAT,
    confidence_score FLOAT,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP,
    actual_return_percent FLOAT,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_swap_user ON ai_swap_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_active ON ai_swap_recommendations(is_active, valid_until);

-- 7. AI User Prediction Access Table
CREATE TABLE IF NOT EXISTS ai_user_prediction_access (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    predictions_requested INTEGER DEFAULT 0,
    indicators_requested INTEGER DEFAULT 0,
    correlation_requested INTEGER DEFAULT 0,
    swap_recommendations_requested INTEGER DEFAULT 0,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    prediction_limit INTEGER DEFAULT 10,
    indicator_limit INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_access_user_period ON ai_user_prediction_access(user_id, period_start);

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE 'ai_%';

-- ============================================
-- Initial Performance Record (optional)
-- ============================================
INSERT INTO ai_model_performance (
    id, model_version, period, analysis_start, analysis_end, 
    total_predictions, validated_predictions, notes
) VALUES (
    'initial-setup-v1',
    'v1.0',
    '7d',
    NOW() - INTERVAL '30 days',
    NOW(),
    0,
    0,
    'Initial setup - no predictions yet'
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Done!
-- ============================================
SELECT 'AI Module tables created successfully!' AS status;
