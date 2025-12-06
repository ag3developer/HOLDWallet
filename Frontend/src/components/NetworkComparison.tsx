import { AlertCircle, CheckCircle, Coins, TrendingDown, Network, Shield, Zap, DollarSign, Info, ArrowRight } from 'lucide-react'

interface NetworkInfo {
  network: string
  name: string
  standard: string
  addressFormat: string
  addressExample: string
  gasToken: string
  avgFee: string
  speed: string
  supported: string[]
  color: string
}

const networks: NetworkInfo[] = [
  {
    network: 'ethereum',
    name: 'Ethereum',
    standard: 'ERC-20',
    addressFormat: '0x... (42 caracteres)',
    addressExample: '0xa444dd83b3876bbf77e4ad45fdbcbb9c1b65bdb4',
    gasToken: 'ETH',
    avgFee: '$5 - $50',
    speed: '~15 segundos - 5 minutos',
    supported: ['ETH', 'USDT', 'USDC', 'DAI', 'LINK', 'UNI'],
    color: 'from-blue-400 to-purple-600'
  },
  {
    network: 'bsc',
    name: 'Binance Smart Chain',
    standard: 'BEP-20',
    addressFormat: '0x... (42 caracteres)',
    addressExample: '0xa444dd83b3876bbf77e4ad45fdbcbb9c1b65bdb4',
    gasToken: 'BNB',
    avgFee: '$0.10 - $1',
    speed: '~3 segundos',
    supported: ['BNB', 'USDT (BEP-20)', 'BUSD', 'CAKE'],
    color: 'from-yellow-400 to-yellow-600'
  },
  {
    network: 'polygon',
    name: 'Polygon',
    standard: 'Polygon/MATIC',
    addressFormat: '0x... (42 caracteres)',
    addressExample: '0xa444dd83b3876bbf77e4ad45fdbcbb9c1b65bdb4',
    gasToken: 'MATIC',
    avgFee: '$0.01 - $0.10',
    speed: '~2 segundos',
    supported: ['MATIC', 'USDT', 'USDC', 'WETH'],
    color: 'from-purple-400 to-purple-600'
  },
  {
    network: 'tron',
    name: 'Tron',
    standard: 'TRC-20',
    addressFormat: 'T... (34 caracteres Base58)',
    addressExample: 'TNPbJ4pkUgbWthRBUpcjQ4365MVTHtX9rr',
    gasToken: 'TRX (ou Energy/Bandwidth)',
    avgFee: '$0.01 - $2',
    speed: '~3 segundos',
    supported: ['TRX', 'USDT (TRC-20)', 'USDC'],
    color: 'from-red-400 to-red-600'
  },
  {
    network: 'base',
    name: 'Base (Coinbase L2)',
    standard: 'Base (EVM)',
    addressFormat: '0x... (42 caracteres)',
    addressExample: '0xa444dd83b3876bbf77e4ad45fdbcbb9c1b65bdb4',
    gasToken: 'ETH',
    avgFee: '$0.01 - $0.50',
    speed: '~2 segundos',
    supported: ['ETH', 'USDC', 'Base tokens'],
    color: 'from-blue-500 to-blue-700'
  },
  {
    network: 'bitcoin',
    name: 'Bitcoin',
    standard: 'Bitcoin Native',
    addressFormat: '1... ou 3... ou bc1... (26-62 caracteres)',
    addressExample: '1BnSh5izr7R45TEuAT5qMuy8cUeoBAywZ',
    gasToken: 'BTC (Satoshis)',
    avgFee: '$1 - $10',
    speed: '~10-60 minutos',
    supported: ['BTC apenas'],
    color: 'from-orange-400 to-orange-600'
  }
]

export const NetworkComparison = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Network className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Comparação de Redes Blockchain</h2>
        </div>
        <p className="text-blue-100">
          Entenda as diferenças entre as redes suportadas pela HOLDWallet
        </p>
      </div>

      {/* Critical Warning */}
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              ATENÇÃO: Escolher a rede errada = PERDA PERMANENTE DE FUNDOS
            </h3>
            <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
              <p>
                <strong>Exemplo comum de erro:</strong> Você quer enviar <strong>USDT</strong>, mas existem 4 versões:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>USDT (ERC-20) na Ethereum</li>
                <li>USDT (BEP-20) na BSC</li>
                <li>USDT (TRC-20) na Tron</li>
                <li>USDT (Polygon) na Polygon</li>
              </ul>
              <p className="mt-3 font-semibold">
                Se você enviar USDT (TRC-20) para um endereço que só aceita USDT (ERC-20), 
                <span className="text-red-600 dark:text-red-400"> os fundos serão perdidos para sempre!</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Network Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {networks.map((network) => (
          <div 
            key={network.network}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${network.color} p-4`}>
              <div className="flex items-center gap-3">
                <Coins className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">{network.name}</h3>
                  <p className="text-sm text-white/90">{network.standard}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Address Format */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Formato de Endereço
                </label>
                <p className="text-sm text-gray-900 dark:text-white font-mono">
                  {network.addressFormat}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                  Ex: {network.addressExample}
                </p>
              </div>

              {/* Gas Token */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Token de Gas (Taxa)
                </label>
                <p className="text-sm text-gray-900 dark:text-white">{network.gasToken}</p>
              </div>

              {/* Fee Range */}
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Taxa Média
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{network.avgFee}</p>
                </div>
                <div className="text-right">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 justify-end">
                    <ArrowRight className="w-3 h-3" />
                    Velocidade
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{network.speed}</p>
                </div>
              </div>

              {/* Supported Tokens */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                  Tokens Suportados
                </label>
                <div className="flex flex-wrap gap-2">
                  {network.supported.map((token) => (
                    <span 
                      key={token}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Best Practices */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Boas Práticas para Evitar Erros
            </h3>
            <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">1.</span>
                <span><strong>Confirme a rede com o destinatário</strong> - Pergunte qual rede ele aceita (ERC-20, BEP-20, TRC-20, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">2.</span>
                <span><strong>Verifique o formato do endereço</strong> - Endereços Tron começam com "T", endereços EVM com "0x", Bitcoin com "1", "3" ou "bc1"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">3.</span>
                <span><strong>Teste com valor pequeno primeiro</strong> - Envie $1-5 primeiro para confirmar que chegou corretamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">4.</span>
                <span><strong>Atenção às exchanges</strong> - Verifique qual rede a exchange aceita para depósito. Muitas aceitam múltiplas redes para USDT</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">5.</span>
                <span><strong>Use a rede mais barata</strong> - Para USDT: Tron (TRC-20) costuma ser mais barato que Ethereum (ERC-20)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Fee Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-blue-600" />
          Comparação de Taxas (Gas Fees)
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Tron (TRC-20)</span>
            </div>
            <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
              $0.01 - $2 <CheckCircle className="w-4 h-4" /> Mais Barato
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Base (L2)</span>
            </div>
            <span className="text-blue-600 dark:text-blue-400 font-bold">$0.01 - $0.50</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Polygon</span>
            </div>
            <span className="text-purple-600 dark:text-purple-400 font-bold">$0.01 - $0.10</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">BSC (BEP-20)</span>
            </div>
            <span className="text-yellow-600 dark:text-yellow-400 font-bold">$0.10 - $1</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Bitcoin</span>
            </div>
            <span className="text-orange-600 dark:text-orange-400 font-bold">$1 - $10</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Ethereum (ERC-20)</span>
            </div>
            <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
              $5 - $50 <AlertCircle className="w-4 h-4" /> Mais Caro
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Valores aproximados. As taxas variam de acordo com a congestão da rede.
        </p>
      </div>
    </div>
  )
}
