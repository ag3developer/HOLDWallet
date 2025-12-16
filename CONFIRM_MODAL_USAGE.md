# 🎨 ConfirmModal - Modal de Confirmação Personalizado

Modal bonito e animado com ícones do React (Lucide) para confirmações de ações importantes.

## ✨ Características

- 🎨 **Design moderno** com animações suaves (Framer Motion)
- 🌙 **Dark mode** compatível
- 🎭 **3 tipos** de modal: danger, warning, info
- 🔄 **Loading state** integrado
- ♿ **Acessível** com aria-labels
- 📱 **Responsivo** e mobile-friendly

## 📦 Instalação

O modal já está criado em:

```
Frontend/src/components/ui/ConfirmModal.tsx
```

## 🚀 Uso Básico

### 1. Importar o componente

```tsx
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Trash2 } from "lucide-react";
```

### 2. Adicionar estado para controlar o modal

```tsx
const [modalState, setModalState] = useState({
  isOpen: false,
  itemId: null, // ou qualquer dado que você precise
});
```

### 3. Função para abrir o modal

```tsx
const handleDeleteClick = (itemId: string) => {
  setModalState({ isOpen: true, itemId });
};
```

### 4. Função de confirmação

```tsx
const confirmDelete = async () => {
  if (!modalState.itemId) return;

  try {
    await deleteItem(modalState.itemId);
    toast.success("Item deletado com sucesso!");
  } catch (error) {
    toast.error("Erro ao deletar item");
  }
};
```

### 5. Renderizar o modal

```tsx
<ConfirmModal
  isOpen={modalState.isOpen}
  onClose={() => setModalState({ isOpen: false, itemId: null })}
  onConfirm={confirmDelete}
  title="Deletar Item"
  message="Tem certeza que deseja deletar este item? Esta ação não pode ser desfeita."
  confirmText="Sim, deletar"
  cancelText="Cancelar"
  type="danger"
  icon={<Trash2 className="w-6 h-6" />}
  isLoading={deleteMutation.isPending}
/>
```

## 🎨 Tipos de Modal

### 1. Danger (Vermelho) - Para ações destrutivas

```tsx
<ConfirmModal
  type="danger"
  title="Deletar Conta"
  message="Esta ação é permanente e não pode ser revertida."
  icon={<Trash2 className="w-6 h-6" />}
  // ... outras props
/>
```

### 2. Warning (Amarelo) - Para avisos importantes

```tsx
<ConfirmModal
  type="warning"
  title="Atenção"
  message="Você tem certeza que deseja continuar com esta ação?"
  icon={<AlertTriangle className="w-6 h-6" />}
  // ... outras props
/>
```

### 3. Info (Azul) - Para informações

```tsx
<ConfirmModal
  type="info"
  title="Confirmar Ação"
  message="Deseja prosseguir com esta operação?"
  icon={<Info className="w-6 h-6" />}
  // ... outras props
/>
```

## 🎯 Props do ConfirmModal

| Prop          | Tipo                              | Obrigatório | Default     | Descrição                        |
| ------------- | --------------------------------- | ----------- | ----------- | -------------------------------- |
| `isOpen`      | `boolean`                         | ✅          | -           | Controla se o modal está aberto  |
| `onClose`     | `() => void`                      | ✅          | -           | Função chamada ao fechar o modal |
| `onConfirm`   | `() => void`                      | ✅          | -           | Função chamada ao confirmar      |
| `title`       | `string`                          | ✅          | -           | Título do modal                  |
| `message`     | `string`                          | ✅          | -           | Mensagem de confirmação          |
| `confirmText` | `string`                          | ❌          | 'Confirmar' | Texto do botão de confirmação    |
| `cancelText`  | `string`                          | ❌          | 'Cancelar'  | Texto do botão de cancelar       |
| `type`        | `'danger' \| 'warning' \| 'info'` | ❌          | 'danger'    | Tipo visual do modal             |
| `icon`        | `React.ReactNode`                 | ❌          | Auto        | Ícone customizado (opcional)     |
| `isLoading`   | `boolean`                         | ❌          | `false`     | Mostra loading no botão          |

## 📚 Exemplos Completos

### Exemplo 1: Deletar Ordem P2P (Implementado)

```tsx
import { useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Trash2 } from "lucide-react";
import { useCancelP2POrder } from "@/hooks/useP2POrders";

export const MyOrdersPage = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    orderId: null,
  });

  const cancelOrderMutation = useCancelP2POrder();

  const handleCancelOrder = (orderId: string) => {
    setModalState({ isOpen: true, orderId });
  };

  const confirmCancelOrder = async () => {
    if (!modalState.orderId) return;

    try {
      await cancelOrderMutation.mutateAsync(modalState.orderId);
      toast.success("Ordem cancelada com sucesso");
    } catch (error) {
      toast.error("Erro ao cancelar ordem");
    }
  };

  return (
    <>
      {/* Seu conteúdo */}
      <button onClick={() => handleCancelOrder(order.id)}>
        <Trash2 />
      </button>

      {/* Modal */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, orderId: null })}
        onConfirm={confirmCancelOrder}
        title="Cancelar Ordem"
        message="Tem certeza que deseja cancelar esta ordem? Esta ação não pode ser desfeita."
        confirmText="Sim, cancelar"
        cancelText="Não, manter"
        type="danger"
        icon={<Trash2 className="w-6 h-6" />}
        isLoading={cancelOrderMutation.isPending}
      />
    </>
  );
};
```

### Exemplo 2: Sair da Conta

```tsx
import { LogOut } from "lucide-react";

const handleLogout = () => {
  setModalState({ isOpen: true, action: "logout" });
};

const confirmLogout = async () => {
  await logout();
  navigate("/login");
};

<ConfirmModal
  isOpen={modalState.isOpen && modalState.action === "logout"}
  onClose={() => setModalState({ isOpen: false, action: null })}
  onConfirm={confirmLogout}
  title="Sair da Conta"
  message="Você será desconectado da sua conta. Deseja continuar?"
  confirmText="Sim, sair"
  cancelText="Cancelar"
  type="warning"
  icon={<LogOut className="w-6 h-6" />}
/>;
```

### Exemplo 3: Confirmar Transferência

```tsx
import { Send } from "lucide-react";

const handleTransfer = (amount, recipient) => {
  setModalState({ isOpen: true, amount, recipient });
};

const confirmTransfer = async () => {
  await sendTransaction(modalState.amount, modalState.recipient);
};

<ConfirmModal
  isOpen={modalState.isOpen}
  onClose={() =>
    setModalState({ isOpen: false, amount: null, recipient: null })
  }
  onConfirm={confirmTransfer}
  title="Confirmar Transferência"
  message={`Você está prestes a enviar ${modalState.amount} para ${modalState.recipient}. Deseja continuar?`}
  confirmText="Confirmar Transferência"
  cancelText="Cancelar"
  type="info"
  icon={<Send className="w-6 h-6" />}
  isLoading={transferMutation.isPending}
/>;
```

### Exemplo 4: Deletar Wallet

```tsx
import { Wallet, Trash2 } from 'lucide-react'

const [confirmText, setConfirmText] = useState('')
const isConfirmValid = confirmText === 'DELETE'

<ConfirmModal
  isOpen={modalState.isOpen}
  onClose={() => {
    setModalState({ isOpen: false, walletId: null })
    setConfirmText('')
  }}
  onConfirm={confirmDeleteWallet}
  title='Deletar Carteira'
  message={
    <>
      <p>Esta ação é PERMANENTE e não pode ser desfeita!</p>
      <p className='mt-4'>Digite <strong>DELETE</strong> para confirmar:</p>
      <input
        type='text'
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className='mt-2 w-full px-4 py-2 border rounded-lg'
        placeholder='Digite DELETE'
      />
    </>
  }
  confirmText='Deletar Permanentemente'
  cancelText='Cancelar'
  type='danger'
  icon={<Trash2 className='w-6 h-6' />}
  isLoading={deleteWalletMutation.isPending}
  // Desabilitar botão se não digitou DELETE
  // (você pode adicionar esta prop ao componente se quiser)
/>
```

## 🎭 Ícones Disponíveis (Lucide React)

```tsx
import {
  Trash2, // Deletar
  AlertTriangle, // Aviso
  Info, // Informação
  LogOut, // Sair
  Send, // Enviar
  Check, // Confirmar
  X, // Fechar
  Lock, // Bloquear
  Unlock, // Desbloquear
  Shield, // Segurança
  AlertCircle, // Alerta
  HelpCircle, // Ajuda
  Archive, // Arquivar
  Download, // Download
  Upload, // Upload
  RefreshCw, // Atualizar
  // E muitos mais em lucide.dev/icons
} from "lucide-react";
```

## 🎨 Customização Avançada

### Alterar cores do modal

O componente já tem 3 tipos (danger, warning, info), mas você pode adicionar mais editando o `typeConfig` em `ConfirmModal.tsx`:

```tsx
const typeConfig = {
  danger: { ... },
  warning: { ... },
  info: { ... },
  success: {
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
    buttonColor: 'bg-green-600 hover:bg-green-700 text-white',
    defaultIcon: <Check className='w-6 h-6' />,
  },
}
```

### Adicionar animação customizada

O modal usa Framer Motion. Você pode customizar as animações:

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
  animate={{ opacity: 1, scale: 1, rotate: 0 }}
  exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
  transition={{ duration: 0.3, type: "spring" }}
>
  {/* conteúdo */}
</motion.div>
```

## ✅ Implementação Completa

✅ **Componente criado**: `Frontend/src/components/ui/ConfirmModal.tsx`
✅ **Implementado em**: `Frontend/src/pages/p2p/MyOrdersPage.tsx`
✅ **Dark mode**: Suportado
✅ **Animações**: Framer Motion
✅ **Ícones**: Lucide React
✅ **Loading state**: Implementado
✅ **Acessibilidade**: aria-labels e keyboard navigation

## 🧪 Como Testar

1. Refresh da página (Cmd+R ou F5)
2. Vá para "Minhas Ordens P2P"
3. Clique no ícone de lixeira (🗑️) em qualquer ordem ativa
4. Veja o modal bonito aparecer com animação!
5. Teste:
   - Clicar fora do modal para fechar
   - Clicar no X para fechar
   - Clicar em "Não, manter" para cancelar
   - Clicar em "Sim, cancelar" para confirmar

## 🎉 Resultado

Agora você tem um modal profissional e bonito que substitui o `confirm()` nativo do browser!

**Antes:**

```
Browser: [ ] Tem certeza que deseja cancelar esta ordem?
         [ Cancelar ]  [ OK ]
```

**Depois:**

```
Modal animado com:
- 🎨 Design moderno e colorido
- 🌙 Dark mode
- 📱 Responsivo
- ✨ Animações suaves
- 🔄 Loading state
- 🎭 Ícones bonitos
```

## 🚀 Próximos Passos

Você pode usar este modal em outros lugares:

- ✅ Deletar ordem P2P (implementado)
- ⏳ Sair da conta (logout)
- ⏳ Deletar wallet
- ⏳ Confirmar transferências
- ⏳ Cancelar trades
- ⏳ Remover payment methods
- ⏳ Qualquer ação destrutiva!

**Divirta-se usando o modal!** 🎉✨
