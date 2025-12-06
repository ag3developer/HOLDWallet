#!/usr/bin/env python3
"""
💰 HOLD Wallet - Monetization Products Demo
==========================================

Demonstrates the revenue-generating products and services
implemented in HOLD Wallet.

Author: HOLD Wallet Team
"""

import sys
import os
import asyncio
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.billing import billing_service, SubscriptionTier, BillingCycle
from app.services.portfolio import portfolio_service
from app.services.exchange import exchange_service

async def demo_billing_service():
    """Demo billing and subscription features"""
    print("💳 BILLING & SUBSCRIPTION SERVICE")
    print("=" * 50)
    
    # Show subscription plans
    print("\n📋 Available Subscription Plans:")
    for tier in [SubscriptionTier.FREE, SubscriptionTier.BASIC, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE]:
        benefits = billing_service.get_subscription_benefits(tier)
        features = billing_service.FEATURE_LIMITS[tier]
        monthly_price = billing_service.PRICING[tier][BillingCycle.MONTHLY] / 100
        
        print(f"\n🎯 {tier.value.upper()} - R$ {monthly_price:.2f}/mês")
        print(f"   Max Wallets: {features['max_wallets'] if features['max_wallets'] != -1 else 'Unlimited'}")
        print(f"   Price Alerts: {features['max_price_alerts'] if features['max_price_alerts'] != -1 else 'Unlimited'}")
        print(f"   Portfolio Tracking: {'✅' if features['portfolio_tracking'] else '❌'}")
    
    # Demo subscription upgrade
    print(f"\n🚀 Upgrading User to PRO:")
    try:
        upgrade_result = await billing_service.upgrade_subscription(
            None, "user_123", SubscriptionTier.PRO, BillingCycle.MONTHLY
        )
        print(f"   Subscription ID: {upgrade_result['subscription_id']}")
        print(f"   Amount: R$ {upgrade_result['amount_reals']:.2f}")
        print(f"   Next Billing: {upgrade_result['current_period_end']}")
    except Exception as e:
        print(f"   Demo completed (no database): {e}")

async def demo_portfolio_service():
    """Demo portfolio tracking features"""
    print("\n\n📊 PORTFOLIO TRACKING SERVICE")
    print("=" * 50)
    
    try:
        # Mock portfolio overview
        print("\n📈 Portfolio Overview:")
        print("   Total Value: $23,450 USD (R$ 117,250)")
        print("   24h Change: +$1,245 (+5.6%)")
        print("   Assets: 4 cryptocurrencies")
        print("   Diversification Score: 85/100")
        
        print("\n🎯 Asset Allocation:")
        allocations = [
            ("Bitcoin", 45.2, "$10,599"),
            ("Ethereum", 28.5, "$6,683"), 
            ("Solana", 15.1, "$3,541"),
            ("USDC", 11.2, "$2,627")
        ]
        
        for asset, percentage, value in allocations:
            print(f"   {asset:<10}: {percentage:>5.1f}% ({value})")
        
        print("\n🔥 Top Performers (24h):")
        performers = [
            ("Solana", "+8.2%", "+$291"),
            ("Bitcoin", "+2.5%", "+$265"),
            ("Ethereum", "+1.8%", "+$120")
        ]
        
        for asset, change_pct, change_usd in performers:
            print(f"   {asset:<10}: {change_pct:>6} ({change_usd})")
        
        print("\n⚡ PRO Features Available:")
        print("   ✅ Advanced Analytics (Sharpe Ratio: 1.25)")
        print("   ✅ Risk Metrics (Risk Score: 7.2/10)")
        print("   ✅ Rebalance Suggestions")
        print("   ✅ Correlation Analysis")
        
    except Exception as e:
        print(f"   Portfolio demo: {e}")

async def demo_exchange_service():
    """Demo exchange and swap features"""
    print("\n\n💱 EXCHANGE & SWAP SERVICE")
    print("=" * 50)
    
    try:
        # Demo swap quote
        print("\n💰 Swap Quote Example:")
        quote = await exchange_service.get_swap_quote(
            None, "user_123", "BTC", "ETH", 0.1, "standard"
        )
        
        print(f"   Swap: 0.1 BTC → ETH")
        print(f"   Output: {quote['output_amount']:.4f} ETH")
        print(f"   Rate: 1 BTC = {quote['exchange_rate']:.2f} ETH")
        print(f"   Our Fee: ${quote['our_fee_amount']:.2f} ({quote['our_fee_rate']:.2f}%)")
        print(f"   Revenue Generated: ${quote['our_fee_amount']:.2f}")
        
        # Demo fiat onramp
        print("\n💳 Fiat Onramp Example:")
        fiat_quote = await exchange_service.get_fiat_onramp_quote(
            None, "user_123", 1000, "BRL", "BTC", "pix"
        )
        
        print(f"   Buy: R$ 1,000 → BTC")
        print(f"   Output: {fiat_quote['crypto_amount']:.6f} BTC")
        print(f"   Rate: R$ {fiat_quote['exchange_rate']:,.2f} per BTC")
        print(f"   Our Fee: R$ {fiat_quote['our_fee']:.2f}")
        print(f"   PIX Fee: R$ {fiat_quote['payment_method_fee']:.2f}")
        print(f"   Total Revenue: R$ {fiat_quote['total_fees']:.2f}")
        
        # Show supported assets
        assets = await exchange_service.get_supported_assets()
        print(f"\n🪙 Supported Assets: {len(assets)} cryptocurrencies")
        for asset in assets[:5]:  # Show first 5
            fiat_support = "✅" if asset["supports_fiat"] else "❌"
            print(f"   {asset['symbol']:<6}: {asset['name']:<15} (Fiat: {fiat_support})")
        
        # Revenue stats
        stats = await exchange_service.get_exchange_stats(None)
        print(f"\n📊 Today's Exchange Stats:")
        print(f"   Volume: ${stats['daily_volume_usd']:,}")
        print(f"   Revenue: ${stats['daily_revenue']:,}")
        print(f"   Swaps: {stats['total_swaps']}")
        print(f"   Avg Size: ${stats['average_swap_size']:,}")
        
    except Exception as e:
        print(f"   Exchange demo: {e}")

def demo_revenue_projections():
    """Show revenue projections"""
    print("\n\n🚀 REVENUE PROJECTIONS")
    print("=" * 50)
    
    print("\n📅 Monthly Revenue Breakdown:")
    revenue_sources = [
        ("Premium Subscriptions", "R$ 45,000", "1,500 users × R$ 30 avg"),
        ("Exchange Fees (0.5%)", "R$ 25,000", "R$ 5M volume × 0.5%"),
        ("Fiat Onramp (2%)", "R$ 15,000", "R$ 750K volume × 2%"),
        ("Enterprise Services", "R$ 35,000", "5 clients × R$ 7K avg"),
        ("API/White-label", "R$ 8,000", "8 integrations × R$ 1K")
    ]
    
    total_monthly = 0
    for service, revenue, calculation in revenue_sources:
        amount = float(revenue.replace("R$ ", "").replace(",", ""))
        total_monthly += amount
        print(f"   {service:<22}: {revenue:>12} ({calculation})")
    
    print(f"\n💰 TOTAL MONTHLY: R$ {total_monthly:,.2f}")
    print(f"💰 TOTAL YEARLY:  R$ {total_monthly * 12:,.2f}")
    
    print("\n🎯 Growth Targets:")
    months = [("Month 3", 0.3), ("Month 6", 0.6), ("Month 12", 1.0)]
    for month, multiplier in months:
        projected = total_monthly * multiplier
        print(f"   {month}: R$ {projected:,.2f}")

def demo_competitive_advantages():
    """Show competitive advantages"""
    print("\n\n🏆 COMPETITIVE ADVANTAGES")
    print("=" * 50)
    
    advantages = [
        ("Multi-Chain Support", "15+ cryptocurrencies in one wallet"),
        ("Master Seed System", "One backup phrase for all networks"), 
        ("Premium Analytics", "Advanced portfolio tracking & insights"),
        ("Built-in Exchange", "No need for external exchanges"),
        ("Fiat Integration", "Direct BRL to crypto conversion"),
        ("Enterprise Ready", "White-label and API solutions"),
        ("Brazilian Focus", "PIX, local regulations, Portuguese"),
        ("Revenue Sharing", "Multiple income streams for sustainability")
    ]
    
    for advantage, description in advantages:
        print(f"   ✅ {advantage:<20}: {description}")
    
    print(f"\n🎯 Target Market:")
    print(f"   📊 Brazilian crypto users: 10M+ people")
    print(f"   💼 Businesses needing crypto: 50K+ companies")
    print(f"   🏦 Financial institutions: 1K+ banks/fintechs")
    print(f"   📱 Market opportunity: R$ 50B+ annually")

async def main():
    """Run the complete monetization demo"""
    print("🔥 HOLD WALLET - MONETIZATION PRODUCTS SHOWCASE")
    print("=" * 60)
    print(f"Demo Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    await demo_billing_service()
    await demo_portfolio_service() 
    await demo_exchange_service()
    demo_revenue_projections()
    demo_competitive_advantages()
    
    print(f"\n\n🚀 HOLD WALLET IS READY TO GENERATE REVENUE!")
    print("=" * 60)
    print("✅ Multi-chain wallet with 15 cryptocurrencies")
    print("✅ Premium subscription tiers with features")
    print("✅ Exchange service with fee revenue")
    print("✅ Portfolio analytics for premium users")
    print("✅ Fiat onramp with competitive rates")
    print("✅ Enterprise solutions for businesses")
    print(f"\n💰 Projected Annual Revenue: R$ 1.5M - R$ 3M")
    print("🎯 Ready for beta launch and user acquisition!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        sys.exit(1)
