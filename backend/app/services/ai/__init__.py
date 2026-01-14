"""
WolkNow AI Module
=================

AI-powered prediction and analysis services for portfolio intelligence.

Services:
- PredictionEngine: Generate price predictions using Prophet
- TechnicalIndicators: Calculate 20+ technical indicators and trading signals
- CorrelationService: Calculate correlation matrices for diversification
- ATHService: Track All-Time High analysis and opportunities
- SwapSuggestionService: AI-powered swap and rebalancing suggestions
- AccuracyTracker: Track and validate prediction accuracy

Author: WolkNow AI Team
Created: January 2026
"""

from .prediction_engine import PredictionEngine, prediction_engine
from .technical_indicators import TechnicalIndicators
from .correlation_service import CorrelationService, correlation_service
from .ath_service import ATHService, ath_service
from .swap_suggestion_service import SwapSuggestionService, swap_suggestion_service
from .accuracy_tracker import AccuracyTracker, accuracy_tracker

__all__ = [
    "PredictionEngine",
    "prediction_engine",
    "TechnicalIndicators",
    "CorrelationService",
    "correlation_service",
    "ATHService",
    "ath_service",
    "SwapSuggestionService",
    "swap_suggestion_service",
    "AccuracyTracker",
    "accuracy_tracker"
]
