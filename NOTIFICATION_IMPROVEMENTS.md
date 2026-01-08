# Melhorias no Sistema de Notificações

## Data: $(date)

## Resumo das Melhorias

### 1. Novo Serviço de Notificações (`notificationService.ts`)

Criado um serviço centralizado para notificações com:

- **Detecção automática de tipos de erro**
- **Mensagens amigáveis em português**
- **Sugestões de como resolver o problema**

#### Tipos de Erro Suportados:

| Tipo                 | Descrição                 | Sugestão                          |
| -------------------- | ------------------------- | --------------------------------- |
| `INSUFFICIENT_FUNDS` | Saldo insuficiente        | Reduza o valor ou adicione fundos |
| `INSUFFICIENT_GAS`   | Gas insuficiente          | Mantenha 0.01 MATIC para taxas    |
| `NONCE_TOO_LOW`      | Transação pendente        | Aguarde e tente novamente         |
| `INVALID_ADDRESS`    | Endereço inválido         | Verifique o endereço              |
| `NETWORK_ERROR`      | Erro de conexão           | Verifique a internet              |
| `TIMEOUT`            | Tempo esgotado            | Tente novamente                   |
| `AUTH_REQUIRED`      | Login necessário          | Faça login                        |
| `BIOMETRIC_EXPIRED`  | Token biométrico expirado | Autentique novamente              |
| `INVALID_2FA`        | Código 2FA inválido       | Verifique o código                |

#### Funções Disponíveis:

```typescript
import notificationService from "@/services/notificationService";

// Toast de erro (detecta tipo automaticamente)
notificationService.showError(error);

// Toast de sucesso
notificationService.showSuccess("Operação concluída!");

// Toast de aviso (amarelo)
notificationService.showWarning("Atenção!");

// Toast informativo (azul)
notificationService.showInfo("Informação");

// Loading com Promise
await notificationService.showLoadingPromise(promise, {
  loading: "Processando...",
  success: "Concluído!",
  error: "Falhou!",
});
```

### 2. Melhorias no Backend

#### `blockchain_signer.py`:

- Mensagens de erro detalhadas para cada tipo de falha
- Indica qual moeda nativa falta (MATIC, ETH, BNB, etc.)
- Inclui recomendações específicas por rede

#### `wallets.py`:

- Tratamento expandido de erros
- Mensagens com emojis para identificação visual
- Mantém mensagens formatadas do blockchain_signer

### 3. Melhorias no Frontend

#### `SendPage.tsx`:

- Integrado com `notificationService`
- Usa `showWarning` para validações
- Usa `showInfo` para informações
- Usa `showError` para erros técnicos

#### `main.tsx` (Toast Global):

- Design moderno com gradientes
- Duração aumentada para erros (7s)
- Suporte a quebras de linha
- Sombras e bordas elegantes

## Exemplos de Mensagens

### Antes:

```
❌ Erro: insufficient funds for gas
```

### Depois:

```
⛽ Saldo de MATIC insuficiente para pagar a taxa de rede (gas).
Reduza o valor da transação ou adicione mais MATIC à sua carteira.
Na rede Polygon, recomendamos manter pelo menos 0.01 MATIC para taxas.

💡 Reduza o valor ou adicione mais fundos à sua carteira.
```

## Arquivos Modificados

1. `/Frontend/src/services/notificationService.ts` (NOVO)
2. `/Frontend/src/pages/wallet/SendPage.tsx`
3. `/Frontend/src/main.tsx`
4. `/backend/app/services/blockchain_signer.py`
5. `/backend/app/routers/wallets.py`

## Como Usar em Outros Arquivos

```typescript
// Importar o serviço
import notificationService from "@/services/notificationService";

// Em catch blocks:
try {
  await someOperation();
  notificationService.showSuccess("Operação concluída!");
} catch (error) {
  notificationService.showError(error);
}

// Para validações:
if (!isValid) {
  notificationService.showWarning("Por favor, preencha todos os campos");
  return;
}
```

## Próximos Passos (Opcional)

1. Migrar outros arquivos para usar `notificationService`
2. Adicionar botão de "tentar novamente" em toasts de erro
3. Criar toasts com links para documentação/suporte
