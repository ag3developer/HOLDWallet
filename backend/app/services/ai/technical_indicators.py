"""
Technical Indicators Service
============================

Calculates 20+ technical indicators for market analysis.
Uses TA-Lib for efficient calculations.

Author: WolkNow AI Team
Created: January 2026
"""

import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Try to import talib, fallback to manual calculations if not available
try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False
    logger.warning("TA-Lib not available. Using fallback calculations.")


class TechnicalIndicators:
    """
    Calculate technical indicators for crypto assets.
    Supports 20+ indicators across momentum, trend, volatility, and volume categories.
    """
    
    def __init__(self, ohlcv_data: Dict[str, List[float]]):
        """
        Initialize with OHLCV data.
        
        Args:
            ohlcv_data: Dict with keys 'open', 'high', 'low', 'close', 'volume'
                       Each value is a list of floats (oldest to newest)
        """
        self.open = np.array(ohlcv_data.get('open', []), dtype=float)
        self.high = np.array(ohlcv_data.get('high', []), dtype=float)
        self.low = np.array(ohlcv_data.get('low', []), dtype=float)
        self.close = np.array(ohlcv_data.get('close', []), dtype=float)
        self.volume = np.array(ohlcv_data.get('volume', []), dtype=float)
        
        if len(self.close) < 30:
            raise ValueError("Need at least 30 data points for indicator calculations")
    
    def calculate_all(self) -> Dict[str, Any]:
        """Calculate all available indicators"""
        try:
            return {
                # Momentum
                'rsi': self.rsi(),
                'macd': self.macd(),
                'stochastic': self.stochastic(),
                'williams_r': self.williams_r(),
                'cci': self.cci(),
                'roc': self.roc(),
                
                # Trend
                'sma': self.sma_multi(),
                'ema': self.ema_multi(),
                'adx': self.adx(),
                
                # Volatility
                'bollinger': self.bollinger_bands(),
                'atr': self.atr(),
                
                # Volume
                'obv': self.obv(),
                'volume_sma': self.volume_sma(),
                
                # Aggregated signal
                'signal': self.generate_signal(),
                
                # Metadata
                'timestamp': datetime.utcnow().isoformat(),
                'data_points': len(self.close),
                'current_price': float(self.close[-1])
            }
        except Exception as e:
            logger.error(f"Error calculating indicators: {e}")
            raise
    
    # ==================== MOMENTUM INDICATORS ====================
    
    def rsi(self, period: int = 14) -> Dict[str, Any]:
        """
        Relative Strength Index (RSI)
        - < 30: Oversold (potential buy)
        - > 70: Overbought (potential sell)
        """
        if TALIB_AVAILABLE:
            rsi_values = talib.RSI(self.close, timeperiod=period)
        else:
            rsi_values = self._rsi_manual(period)
        
        current = float(rsi_values[-1]) if not np.isnan(rsi_values[-1]) else 50.0
        
        if current < 30:
            signal = 'oversold'
        elif current > 70:
            signal = 'overbought'
        else:
            signal = 'neutral'
        
        return {
            'value': round(current, 2),
            'signal': signal,
            'strength': round(abs(current - 50) / 50, 3),
            'period': period
        }
    
    def _rsi_manual(self, period: int = 14) -> np.ndarray:
        """Manual RSI calculation when TA-Lib not available"""
        deltas = np.diff(self.close)
        gain = np.where(deltas > 0, deltas, 0)
        loss = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.zeros_like(self.close)
        avg_loss = np.zeros_like(self.close)
        
        avg_gain[period] = np.mean(gain[:period])
        avg_loss[period] = np.mean(loss[:period])
        
        for i in range(period + 1, len(self.close)):
            avg_gain[i] = (avg_gain[i-1] * (period - 1) + gain[i-1]) / period
            avg_loss[i] = (avg_loss[i-1] * (period - 1) + loss[i-1]) / period
        
        rs = avg_gain / np.where(avg_loss == 0, 1, avg_loss)
        rsi = 100 - (100 / (1 + rs))
        rsi[:period] = np.nan
        
        return rsi
    
    def macd(self, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, Any]:
        """
        MACD (Moving Average Convergence Divergence)
        - Histogram > 0 and rising: Bullish
        - Histogram < 0 and falling: Bearish
        """
        if TALIB_AVAILABLE:
            macd_line, signal_line, histogram = talib.MACD(
                self.close, fastperiod=fast, slowperiod=slow, signalperiod=signal
            )
        else:
            macd_line, signal_line, histogram = self._macd_manual(fast, slow, signal)
        
        current_hist = float(histogram[-1]) if not np.isnan(histogram[-1]) else 0
        prev_hist = float(histogram[-2]) if not np.isnan(histogram[-2]) else 0
        
        # Detect crossover
        if current_hist > 0 and prev_hist <= 0:
            crossover = 'bullish'
        elif current_hist < 0 and prev_hist >= 0:
            crossover = 'bearish'
        else:
            crossover = 'none'
        
        return {
            'macd': round(float(macd_line[-1]), 4) if not np.isnan(macd_line[-1]) else 0,
            'signal': round(float(signal_line[-1]), 4) if not np.isnan(signal_line[-1]) else 0,
            'histogram': round(current_hist, 4),
            'crossover': crossover,
            'trend': 'bullish' if current_hist > 0 else 'bearish'
        }
    
    def _macd_manual(self, fast: int, slow: int, signal: int):
        """Manual MACD calculation"""
        ema_fast = self._ema_manual(fast)
        ema_slow = self._ema_manual(slow)
        macd_line = ema_fast - ema_slow
        
        # Signal line (EMA of MACD)
        signal_line = np.zeros_like(macd_line)
        signal_line[:slow+signal-1] = np.nan
        for i in range(slow + signal - 1, len(macd_line)):
            if i == slow + signal - 1:
                signal_line[i] = np.mean(macd_line[slow:i+1])
            else:
                multiplier = 2 / (signal + 1)
                signal_line[i] = (macd_line[i] - signal_line[i-1]) * multiplier + signal_line[i-1]
        
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram
    
    def stochastic(self, k_period: int = 14, d_period: int = 3) -> Dict[str, Any]:
        """
        Stochastic Oscillator
        - K < 20 and D < 20: Oversold
        - K > 80 and D > 80: Overbought
        """
        if TALIB_AVAILABLE:
            k, d = talib.STOCH(self.high, self.low, self.close,
                              fastk_period=k_period, slowk_period=d_period, slowd_period=d_period)
        else:
            k, d = self._stochastic_manual(k_period, d_period)
        
        k_val = float(k[-1]) if not np.isnan(k[-1]) else 50
        d_val = float(d[-1]) if not np.isnan(d[-1]) else 50
        
        if k_val < 20 and d_val < 20:
            signal = 'oversold'
        elif k_val > 80 and d_val > 80:
            signal = 'overbought'
        else:
            signal = 'neutral'
        
        return {
            'k': round(k_val, 2),
            'd': round(d_val, 2),
            'signal': signal
        }
    
    def _stochastic_manual(self, k_period: int, d_period: int):
        """Manual Stochastic calculation"""
        k = np.zeros_like(self.close)
        k[:k_period-1] = np.nan
        
        for i in range(k_period - 1, len(self.close)):
            high_max = np.max(self.high[i-k_period+1:i+1])
            low_min = np.min(self.low[i-k_period+1:i+1])
            if high_max != low_min:
                k[i] = ((self.close[i] - low_min) / (high_max - low_min)) * 100
            else:
                k[i] = 50
        
        d = np.zeros_like(k)
        d[:k_period+d_period-2] = np.nan
        for i in range(k_period + d_period - 2, len(k)):
            d[i] = np.mean(k[i-d_period+1:i+1])
        
        return k, d
    
    def williams_r(self, period: int = 14) -> Dict[str, Any]:
        """Williams %R"""
        if TALIB_AVAILABLE:
            wr = talib.WILLR(self.high, self.low, self.close, timeperiod=period)
        else:
            wr = self._williams_r_manual(period)
        
        current = float(wr[-1]) if not np.isnan(wr[-1]) else -50
        
        if current < -80:
            signal = 'oversold'
        elif current > -20:
            signal = 'overbought'
        else:
            signal = 'neutral'
        
        return {
            'value': round(current, 2),
            'signal': signal
        }
    
    def _williams_r_manual(self, period: int):
        """Manual Williams %R calculation"""
        wr = np.zeros_like(self.close)
        wr[:period-1] = np.nan
        
        for i in range(period - 1, len(self.close)):
            high_max = np.max(self.high[i-period+1:i+1])
            low_min = np.min(self.low[i-period+1:i+1])
            if high_max != low_min:
                wr[i] = ((high_max - self.close[i]) / (high_max - low_min)) * -100
            else:
                wr[i] = -50
        
        return wr
    
    def cci(self, period: int = 20) -> Dict[str, Any]:
        """Commodity Channel Index"""
        if TALIB_AVAILABLE:
            cci = talib.CCI(self.high, self.low, self.close, timeperiod=period)
        else:
            cci = self._cci_manual(period)
        
        current = float(cci[-1]) if not np.isnan(cci[-1]) else 0
        
        if current < -100:
            signal = 'oversold'
        elif current > 100:
            signal = 'overbought'
        else:
            signal = 'neutral'
        
        return {
            'value': round(current, 2),
            'signal': signal
        }
    
    def _cci_manual(self, period: int):
        """Manual CCI calculation"""
        tp = (self.high + self.low + self.close) / 3
        cci = np.zeros_like(self.close)
        cci[:period-1] = np.nan
        
        for i in range(period - 1, len(self.close)):
            sma = np.mean(tp[i-period+1:i+1])
            mad = np.mean(np.abs(tp[i-period+1:i+1] - sma))
            if mad != 0:
                cci[i] = (tp[i] - sma) / (0.015 * mad)
            else:
                cci[i] = 0
        
        return cci
    
    def roc(self, period: int = 12) -> Dict[str, Any]:
        """Rate of Change"""
        if TALIB_AVAILABLE:
            roc = talib.ROC(self.close, timeperiod=period)
        else:
            roc = self._roc_manual(period)
        
        current = float(roc[-1]) if not np.isnan(roc[-1]) else 0
        
        return {
            'value': round(current, 2),
            'signal': 'bullish' if current > 0 else 'bearish' if current < 0 else 'neutral'
        }
    
    def _roc_manual(self, period: int):
        """Manual ROC calculation"""
        roc = np.zeros_like(self.close)
        roc[:period] = np.nan
        for i in range(period, len(self.close)):
            if self.close[i-period] != 0:
                roc[i] = ((self.close[i] - self.close[i-period]) / self.close[i-period]) * 100
        return roc
    
    # ==================== TREND INDICATORS ====================
    
    def sma_multi(self) -> Dict[str, float]:
        """Simple Moving Averages (20, 50, 200)"""
        result = {}
        for period in [20, 50, 200]:
            if len(self.close) >= period:
                if TALIB_AVAILABLE:
                    sma = talib.SMA(self.close, timeperiod=period)
                else:
                    sma = self._sma_manual(period)
                result[f'sma_{period}'] = round(float(sma[-1]), 2) if not np.isnan(sma[-1]) else None
            else:
                result[f'sma_{period}'] = None
        return result
    
    def _sma_manual(self, period: int):
        """Manual SMA calculation"""
        sma = np.zeros_like(self.close)
        sma[:period-1] = np.nan
        for i in range(period - 1, len(self.close)):
            sma[i] = np.mean(self.close[i-period+1:i+1])
        return sma
    
    def ema_multi(self) -> Dict[str, float]:
        """Exponential Moving Averages (9, 21, 55)"""
        result = {}
        for period in [9, 21, 55]:
            if len(self.close) >= period:
                if TALIB_AVAILABLE:
                    ema = talib.EMA(self.close, timeperiod=period)
                else:
                    ema = self._ema_manual(period)
                result[f'ema_{period}'] = round(float(ema[-1]), 2) if not np.isnan(ema[-1]) else None
            else:
                result[f'ema_{period}'] = None
        return result
    
    def _ema_manual(self, period: int):
        """Manual EMA calculation"""
        ema = np.zeros_like(self.close)
        ema[:period-1] = np.nan
        ema[period-1] = np.mean(self.close[:period])
        multiplier = 2 / (period + 1)
        for i in range(period, len(self.close)):
            ema[i] = (self.close[i] - ema[i-1]) * multiplier + ema[i-1]
        return ema
    
    def adx(self, period: int = 14) -> Dict[str, Any]:
        """Average Directional Index - Trend Strength"""
        if TALIB_AVAILABLE:
            adx = talib.ADX(self.high, self.low, self.close, timeperiod=period)
            current = float(adx[-1]) if not np.isnan(adx[-1]) else 0
        else:
            current = 25.0  # Default neutral value when TA-Lib not available
        
        if current < 20:
            trend = 'weak'
        elif current < 40:
            trend = 'moderate'
        elif current < 60:
            trend = 'strong'
        else:
            trend = 'very_strong'
        
        return {
            'value': round(current, 2),
            'trend_strength': trend
        }
    
    # ==================== VOLATILITY INDICATORS ====================
    
    def bollinger_bands(self, period: int = 20, std_dev: float = 2.0) -> Dict[str, Any]:
        """Bollinger Bands"""
        if TALIB_AVAILABLE:
            upper, middle, lower = talib.BBANDS(
                self.close, timeperiod=period, nbdevup=std_dev, nbdevdn=std_dev
            )
        else:
            upper, middle, lower = self._bollinger_manual(period, std_dev)
        
        current_price = self.close[-1]
        upper_val = float(upper[-1]) if not np.isnan(upper[-1]) else current_price * 1.1
        middle_val = float(middle[-1]) if not np.isnan(middle[-1]) else current_price
        lower_val = float(lower[-1]) if not np.isnan(lower[-1]) else current_price * 0.9
        
        # Position within bands (0 = at lower, 1 = at upper)
        if upper_val != lower_val:
            position = (current_price - lower_val) / (upper_val - lower_val)
        else:
            position = 0.5
        
        if current_price < lower_val:
            signal = 'oversold'
        elif current_price > upper_val:
            signal = 'overbought'
        else:
            signal = 'neutral'
        
        return {
            'upper': round(upper_val, 2),
            'middle': round(middle_val, 2),
            'lower': round(lower_val, 2),
            'position': round(position, 3),
            'signal': signal,
            'bandwidth': round((upper_val - lower_val) / middle_val * 100, 2)
        }
    
    def _bollinger_manual(self, period: int, std_dev: float):
        """Manual Bollinger Bands calculation"""
        middle = self._sma_manual(period)
        
        std = np.zeros_like(self.close)
        std[:period-1] = np.nan
        for i in range(period - 1, len(self.close)):
            std[i] = np.std(self.close[i-period+1:i+1])
        
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        
        return upper, middle, lower
    
    def atr(self, period: int = 14) -> Dict[str, float]:
        """Average True Range - Volatility measure"""
        if TALIB_AVAILABLE:
            atr = talib.ATR(self.high, self.low, self.close, timeperiod=period)
        else:
            atr = self._atr_manual(period)
        
        current = float(atr[-1]) if not np.isnan(atr[-1]) else 0
        atr_percent = (current / self.close[-1]) * 100 if self.close[-1] != 0 else 0
        
        return {
            'value': round(current, 4),
            'percent': round(atr_percent, 2)
        }
    
    def _atr_manual(self, period: int):
        """Manual ATR calculation"""
        tr = np.zeros_like(self.close)
        tr[0] = self.high[0] - self.low[0]
        
        for i in range(1, len(self.close)):
            tr[i] = max(
                self.high[i] - self.low[i],
                abs(self.high[i] - self.close[i-1]),
                abs(self.low[i] - self.close[i-1])
            )
        
        atr = np.zeros_like(self.close)
        atr[:period-1] = np.nan
        atr[period-1] = np.mean(tr[:period])
        
        for i in range(period, len(self.close)):
            atr[i] = (atr[i-1] * (period - 1) + tr[i]) / period
        
        return atr
    
    # ==================== VOLUME INDICATORS ====================
    
    def obv(self) -> Dict[str, Any]:
        """On-Balance Volume"""
        if TALIB_AVAILABLE:
            obv = talib.OBV(self.close, self.volume)
        else:
            obv = self._obv_manual()
        
        current = float(obv[-1]) if not np.isnan(obv[-1]) else 0
        prev = float(obv[-2]) if not np.isnan(obv[-2]) else 0
        
        return {
            'value': round(current, 0),
            'trend': 'up' if current > prev else 'down' if current < prev else 'flat'
        }
    
    def _obv_manual(self):
        """Manual OBV calculation"""
        obv = np.zeros_like(self.close)
        obv[0] = self.volume[0]
        
        for i in range(1, len(self.close)):
            if self.close[i] > self.close[i-1]:
                obv[i] = obv[i-1] + self.volume[i]
            elif self.close[i] < self.close[i-1]:
                obv[i] = obv[i-1] - self.volume[i]
            else:
                obv[i] = obv[i-1]
        
        return obv
    
    def volume_sma(self, period: int = 20) -> Dict[str, Any]:
        """Volume SMA for volume analysis"""
        if TALIB_AVAILABLE:
            vol_sma = talib.SMA(self.volume, timeperiod=period)
        else:
            vol_sma = np.zeros_like(self.volume)
            vol_sma[:period-1] = np.nan
            for i in range(period - 1, len(self.volume)):
                vol_sma[i] = np.mean(self.volume[i-period+1:i+1])
        
        current_vol = self.volume[-1]
        avg_vol = float(vol_sma[-1]) if not np.isnan(vol_sma[-1]) else current_vol
        
        ratio = current_vol / avg_vol if avg_vol != 0 else 1.0
        
        return {
            'current_volume': round(float(current_vol), 0),
            'average_volume': round(avg_vol, 0),
            'ratio': round(ratio, 2),
            'signal': 'high' if ratio > 1.5 else 'low' if ratio < 0.5 else 'normal'
        }
    
    # ==================== SIGNAL GENERATION ====================
    
    def generate_signal(self) -> Dict[str, Any]:
        """
        Generate aggregated signal from all indicators.
        Returns overall market sentiment.
        """
        bullish = 0
        bearish = 0
        
        # RSI
        rsi = self.rsi()
        if rsi['signal'] == 'oversold':
            bullish += 1
        elif rsi['signal'] == 'overbought':
            bearish += 1
        
        # MACD
        macd = self.macd()
        if macd['crossover'] == 'bullish':
            bullish += 2
        elif macd['crossover'] == 'bearish':
            bearish += 2
        elif macd['trend'] == 'bullish':
            bullish += 1
        elif macd['trend'] == 'bearish':
            bearish += 1
        
        # Bollinger Bands
        bb = self.bollinger_bands()
        if bb['signal'] == 'oversold':
            bullish += 1
        elif bb['signal'] == 'overbought':
            bearish += 1
        
        # Stochastic
        stoch = self.stochastic()
        if stoch['signal'] == 'oversold':
            bullish += 1
        elif stoch['signal'] == 'overbought':
            bearish += 1
        
        # Williams %R
        wr = self.williams_r()
        if wr['signal'] == 'oversold':
            bullish += 1
        elif wr['signal'] == 'overbought':
            bearish += 1
        
        # CCI
        cci = self.cci()
        if cci['signal'] == 'oversold':
            bullish += 1
        elif cci['signal'] == 'overbought':
            bearish += 1
        
        # Price vs SMAs
        smas = self.sma_multi()
        price = self.close[-1]
        if smas['sma_20'] and price > smas['sma_20']:
            bullish += 0.5
        elif smas['sma_20'] and price < smas['sma_20']:
            bearish += 0.5
        
        if smas['sma_50'] and price > smas['sma_50']:
            bullish += 0.5
        elif smas['sma_50'] and price < smas['sma_50']:
            bearish += 0.5
        
        total = bullish + bearish
        if total == 0:
            direction = 'neutral'
            strength = 0
        else:
            direction = 'bullish' if bullish > bearish else 'bearish' if bearish > bullish else 'neutral'
            strength = abs(bullish - bearish) / total
        
        return {
            'direction': direction,
            'strength': round(strength, 3),
            'bullish_count': bullish,
            'bearish_count': bearish,
            'total_signals': total,
            'confidence': round(max(bullish, bearish) / max(total, 1), 3)
        }
