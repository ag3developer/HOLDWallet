import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  WalletIcon,
  PlusIcon,
  RotateCcwIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  AlertTriangleIcon,
  ShieldIcon,
  InfoIcon,
  X
} from 'lucide-react'
import { useWallets } from '@/hooks/useWallets'
import { WalletCreate, WalletRestore, WalletWithMnemonic } from '@/services/walletService'

interface CreateWalletModalProps {
  isOpen: boolean
  onClose: () => void
  onWalletCreated?: (wallet: WalletWithMnemonic) => void
}

export const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  isOpen,
  onClose,
  onWalletCreated
}) => {
  const { t } = useTranslation()
  const { createWallet, restoreWallet, isCreating, getSupportedNetworks } = useWallets()
  
  const [activeTab, setActiveTab] = useState('create')
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showRestoreMnemonic, setShowRestoreMnemonic] = useState(false)
  const [copiedMnemonic, setCopiedMnemonic] = useState(false)
  const [createdWallet, setCreatedWallet] = useState<WalletWithMnemonic | null>(null)
  
  // Formulário para criar carteira
  const [createForm, setCreateForm] = useState<WalletCreate>({
    name: '',
    network: '',
    passphrase: ''
  })
  
  // Formulário para restaurar carteira
  const [restoreForm, setRestoreForm] = useState<WalletRestore>({
    name: '',
    network: '',
    mnemonic: '',
    passphrase: ''
  })

  const supportedNetworks = getSupportedNetworks()

  // Reset formulários quando modal fecha
  const handleClose = () => {
    setCreateForm({ name: '', network: '', passphrase: '' })
    setRestoreForm({ name: '', network: '', mnemonic: '', passphrase: '' })
    setCreatedWallet(null)
    setShowMnemonic(false)
    setShowRestoreMnemonic(false)
    setCopiedMnemonic(false)
    setActiveTab('create')
    onClose()
  }

  // Criar nova carteira
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createForm.name || !createForm.network) {
      toast({
        title: 'Erro',
        description: 'Nome e rede são obrigatórios',
        variant: 'destructive'
      })
      return
    }

    try {
      const wallet = await createWallet(createForm)
      setCreatedWallet(wallet)
      
      if (onWalletCreated) {
        onWalletCreated(wallet)
      }
      
      toast({
        title: 'Sucesso',
        description: 'Carteira criada com sucesso!',
        variant: 'default'
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao criar carteira',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Restaurar carteira existente
  const handleRestoreWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!restoreForm.name || !restoreForm.network || !restoreForm.mnemonic) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive'
      })
      return
    }

    try {
      await restoreWallet(restoreForm)
      
      toast({
        title: 'Sucesso',
        description: 'Carteira restaurada com sucesso!',
        variant: 'default'
      })
      
      handleClose()
    } catch (error: any) {
      toast({
        title: 'Erro ao restaurar carteira',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Copiar frase mnemônica
  const copyMnemonic = async () => {
    if (!createdWallet?.mnemonic) return
    
    try {
      await navigator.clipboard.writeText(createdWallet.mnemonic)
      setCopiedMnemonic(true)
      
      toast({
        title: 'Copiado',
        description: 'Frase de recuperação copiada para área de transferência',
        variant: 'default'
      })
      
      setTimeout(() => setCopiedMnemonic(false), 2000)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar a frase de recuperação',
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5" />
            {createdWallet ? 'Carteira Criada' : 'Nova Carteira'}
          </DialogTitle>
          <DialogDescription>
            {createdWallet 
              ? 'Sua carteira foi criada com sucesso. Salve a frase de recuperação em local seguro.'
              : 'Crie uma nova carteira ou restaure uma carteira existente'
            }
          </DialogDescription>
        </DialogHeader>

        {createdWallet ? (
          // Exibir frase mnemônica da carteira criada
          <div className="space-y-6">
            <Alert>
              <ShieldIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Esta é sua frase de recuperação. Guarde-a em local seguro e nunca a compartilhe.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Carteira</Label>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <strong>{createdWallet.name}</strong>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Rede: {supportedNetworks.find(n => n.id === createdWallet.network)?.name}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Frase de Recuperação</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMnemonic(!showMnemonic)}
                  >
                    {showMnemonic ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="relative">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border min-h-[100px] font-mono text-sm">
                    {showMnemonic ? (
                      <div className="grid grid-cols-3 gap-2">
                        {createdWallet.mnemonic?.split(' ').map((word, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-gray-500 text-xs">{index + 1}.</span>
                            <span>{word}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        Clique no olho para revelar a frase de recuperação
                      </div>
                    )}
                  </div>
                  
                  {showMnemonic && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={copyMnemonic}
                    >
                      {copiedMnemonic ? (
                        <CheckIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <CopyIcon className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Anote estas palavras na ordem exata</li>
                  <li>Mantenha em local seguro, longe de olhares curiosos</li>
                  <li>Nunca digite em sites ou aplicativos suspeitos</li>
                  <li>Use para recuperar sua carteira em caso de perda</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Fechar
              </Button>
              <Button 
                onClick={() => copyMnemonic()}
                disabled={!showMnemonic}
                className="flex-1"
              >
                <CopyIcon className="w-4 h-4 mr-2" />
                Copiar Frase
              </Button>
            </div>
          </div>
        ) : (
          // Formulários para criar/restaurar carteira
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTarget value="create">
                <PlusIcon className="w-4 h-4 mr-2" />
                Criar Nova
              </TabsTarget>
              <TabsTarget value="restore">
                <RotateCcwIcon className="w-4 h-4 mr-2" />
                Restaurar
              </TabsTarget>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreateWallet} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Nome da Carteira</Label>
                  <Input
                    id="create-name"
                    placeholder="Ex: Minha Carteira Bitcoin"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-network">Rede</Label>
                  <Select
                    value={createForm.network}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, network: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma rede" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedNetworks.map((network) => (
                        <SelectItem key={network.id} value={network.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{network.icon}</span>
                            <span>{network.name}</span>
                            <span className="text-xs text-gray-500">({network.symbol})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-passphrase">Passphrase (Opcional)</Label>
                  <Input
                    id="create-passphrase"
                    type="password"
                    placeholder="Frase secreta adicional"
                    value={createForm.passphrase}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, passphrase: e.target.value }))}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Adiciona uma camada extra de segurança (BIP39 passphrase)
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating} className="flex-1">
                    {isCreating ? 'Criando...' : 'Criar Carteira'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="restore">
              <form onSubmit={handleRestoreWallet} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restore-name">Nome da Carteira</Label>
                  <Input
                    id="restore-name"
                    placeholder="Ex: Carteira Restaurada"
                    value={restoreForm.name}
                    onChange={(e) => setRestoreForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restore-network">Rede</Label>
                  <Select
                    value={restoreForm.network}
                    onValueChange={(value) => setRestoreForm(prev => ({ ...prev, network: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma rede" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedNetworks.map((network) => (
                        <SelectItem key={network.id} value={network.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{network.icon}</span>
                            <span>{network.name}</span>
                            <span className="text-xs text-gray-500">({network.symbol})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="restore-mnemonic">Frase de Recuperação</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRestoreMnemonic(!showRestoreMnemonic)}
                    >
                      {showRestoreMnemonic ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </Button>
                  </div>
                  <textarea
                    id="restore-mnemonic"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Digite as 12 ou 24 palavras da frase de recuperação separadas por espaços"
                    value={restoreForm.mnemonic}
                    onChange={(e) => setRestoreForm(prev => ({ ...prev, mnemonic: e.target.value }))}
                    style={{ 
                      fontFamily: showRestoreMnemonic ? 'inherit' : 'monospace',
                      WebkitTextSecurity: showRestoreMnemonic ? 'none' : 'disc'
                    }}
                    required
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    12 ou 24 palavras separadas por espaços
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restore-passphrase">Passphrase (se usada)</Label>
                  <Input
                    id="restore-passphrase"
                    type="password"
                    placeholder="Frase secreta adicional (se definida)"
                    value={restoreForm.passphrase}
                    onChange={(e) => setRestoreForm(prev => ({ ...prev, passphrase: e.target.value }))}
                  />
                </div>

                <Alert>
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertDescription>
                    Certifique-se de que está inserindo a frase de recuperação correta. 
                    Frases incorretas não conseguirão restaurar sua carteira.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating} className="flex-1">
                    {isCreating ? 'Restaurando...' : 'Restaurar Carteira'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
