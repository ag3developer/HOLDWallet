import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  Target,
  AlertTriangle,
  Bell,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star,
  Zap
} from 'lucide-react'

interface Asset {
  symbol: string
  name: string
  balance: number
  value: number
  price: number
  change24h: number
  allocation: number
}

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'transfer'
  asset: string
  amount: number
  value: number
  date: string
  status: 'completed' | 'pending' | 'failed'
}

interface Alert {
  id: string
  type: 'price' | 'portfolio' | 'news'
  title: string
  message: string
  timestamp: string
  read: boolean
}

const mockAssets: Asset[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    balance: 0.5432,
    value: 35520.45,
    price: 65420.50,
    change24h: 2.45,
    allocation: 45.2
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    balance: 12.8456,
    value: 41644.19,
    price: 3240.80,
    change24h: -1.20,
    allocation: 30.8
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    balance: 15420.50,
    value: 15420.50,
    price: 1.00,
    change24h: 0.01,
    allocation: 15.5
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    balance: 8950.25,
    value: 4654.13,
    price: 0.52,
    change24h: 3.85,
    allocation: 5.8
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    balance: 285.75,
    value: 2121.17,
    price: 7.42,
    change24h: -0.85,
    allocation: 2.7
  }
]

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'buy',
    asset: 'BTC',
    amount: 0.1,
    value: 6542.05,
    date: '2024-11-25',
    status: 'completed'
  },
  {
    id: '2',
    type: 'sell',
    asset: 'ETH',
    amount: 2.5,
    value: 8102.00,
    date: '2024-11-24',
    status: 'completed'
  },
  {
    id: '3',
    type: 'transfer',
    asset: 'USDT',
    amount: 5000,
    value: 5000,
    date: '2024-11-23',
    status: 'pending'
  }
]

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'price',
    title: 'Meta de Preço Atingida',
    message: 'Bitcoin atingiu $65,000',
    timestamp: '2024-11-25T10:30:00Z',
    read: false
  },
  {
    id: '2',
    type: 'portfolio',
    title: 'Rebalanceamento Sugerido',
    message: 'Considere rebalancear seu portfólio',
    timestamp: '2024-11-25T09:15:00Z',
    read: false
  }
]

export const PortfolioPage = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'transactions' | 'analytics'>('overview')
  const [timeframe, setTimeframe] = useState<'1d' | '1w' | '1m' | '3m' | '1y'>('1m')
  const [showBalance, setShowBalance] = useState(true)
  const [alerts, setAlerts] = useState(mockAlerts)

  const totalPortfolioValue = mockAssets.reduce((sum, asset) => sum + asset.value, 0)
  const portfolioChange24h = 2.15 // Mock data
  const portfolioChange = (totalPortfolioValue * portfolioChange24h) / 100

  const markAlertAsRead = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Gestão de Portfólio
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitore e analise seus investimentos em tempo real
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showBalance ? 'Ocultar' : 'Mostrar'}
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Valor Total
              </h3>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-2">
              {showBalance ? (
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${totalPortfolioValue.toLocaleString()}
                </div>
              ) : (
                <div className="text-2xl font-bold text-gray-400">
                  ••••••
                </div>
              )}
              <div className={`flex items-center text-sm ${
                portfolioChange24h >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolioChange24h >= 0 ? 
                  <ArrowUpRight className="w-4 h-4 mr-1" /> : 
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                }
                {Math.abs(portfolioChange24h)}% (${Math.abs(portfolioChange).toLocaleString()})
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Melhor Ativo
              </h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                ADA
              </div>
              <div className="text-sm text-green-600">
                +3.85% hoje
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Diversificação
              </h3>
              <PieChart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {mockAssets.length} Ativos
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Bem diversificado
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Alertas
              </h3>
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {alerts.filter(a => !a.read).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Não lidos
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {[
                { id: 'overview' as const, label: 'Visão Geral', icon: BarChart3 },
                { id: 'assets' as const, label: 'Ativos', icon: DollarSign },
                { id: 'transactions' as const, label: 'Transações', icon: Activity },
                { id: 'analytics' as const, label: 'Análises', icon: Target }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Asset Allocation */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Distribuição de Ativos
                  </h3>
                  <div className="space-y-4">
                    {mockAssets.map((asset) => (
                      <div key={asset.symbol} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {asset.symbol}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {asset.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {asset.balance.toLocaleString()} {asset.symbol}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {showBalance ? `$${asset.value.toLocaleString()}` : '••••'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {asset.allocation}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Alerts */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Alertas Recentes
                  </h3>
                  <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                      <div 
                        key={alert.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          alert.read 
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                            : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                        }`}
                        onClick={() => markAlertAsRead(alert.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {alert.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {alert.message}
                            </p>
                          </div>
                          {!alert.read && (
                            <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'assets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Meus Ativos
                  </h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    Adicionar Ativo
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Ativo</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Saldo</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Preço</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">24h</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockAssets.map((asset) => (
                        <tr key={asset.symbol} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {asset.symbol}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {asset.symbol}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {asset.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {asset.balance.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                              ${asset.price.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className={`font-medium ${
                              asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {showBalance ? `$${asset.value.toLocaleString()}` : '••••'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Histórico de Transações
                  </h3>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <Filter className="w-4 h-4" />
                      Filtrar
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Download className="w-4 h-4" />
                      Exportar
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {mockTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          tx.type === 'buy' ? 'bg-green-100 dark:bg-green-900/20' :
                          tx.type === 'sell' ? 'bg-red-100 dark:bg-red-900/20' :
                          'bg-blue-100 dark:bg-blue-900/20'
                        }`}>
                          {tx.type === 'buy' ? 
                            <Plus className="w-5 h-5 text-green-600" /> :
                            tx.type === 'sell' ?
                            <Minus className="w-5 h-5 text-red-600" /> :
                            <ArrowUpRight className="w-5 h-5 text-blue-600" />
                          }
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {tx.type === 'buy' ? 'Compra' : tx.type === 'sell' ? 'Venda' : 'Transferência'} {tx.asset}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(tx.date).toLocaleDateString()} • {tx.amount} {tx.asset}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white">
                          ${tx.value.toLocaleString()}
                        </div>
                        <div className={`text-sm ${
                          tx.status === 'completed' ? 'text-green-600' :
                          tx.status === 'pending' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {tx.status === 'completed' ? 'Concluído' :
                           tx.status === 'pending' ? 'Pendente' : 'Falhou'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Análises Avançadas
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Ferramentas avançadas de análise em desenvolvimento
                  </p>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm px-4 py-2 rounded-full inline-block mb-4">
                    Em Breve
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Análise de correlação, backtesting, e métricas avançadas
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Rebalancear Portfólio
              </h3>
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-200 mb-4">
              Otimize a distribuição dos seus ativos
            </p>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Analisar Portfólio
            </button>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Configurar Alertas
              </h3>
              <Bell className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-green-700 dark:text-green-200 mb-4">
              Receba notificações de preços e eventos
            </p>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
              Gerenciar Alertas
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                Relatório Completo
              </h3>
              <Download className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-200 mb-4">
              Gere relatórios detalhados para análise
            </p>
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
