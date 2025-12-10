# 🤖 Bot Testing Guide - Simulação de Chamadas P2P

## 🎯 Visão Geral

O sistema inclui **3 bots simulados** que podem ser encontrados no chat. Eles aparecem como contatos reais e você pode fazer chamadas de voz/vídeo com eles para testar a funcionalidade P2P sem precisar de outro usuário real.

---

## 👥 Bots Disponíveis

### 1. 🤖 **Bot Trader**
- **ID:** `bot-1`
- **Função:** Simula um trader regular
- **Status:** Online (sempre)
- **Resposta:** 500ms de delay
- **Avatar:** Bot Trader customizado

### 2. 🎧 **Bot Support**
- **ID:** `bot-2`
- **Função:** Simula um agente de suporte
- **Status:** Online (sempre)
- **Resposta:** 800ms de delay
- **Avatar:** Bot Support customizado

### 3. 💼 **Bot Manager**
- **ID:** `bot-3`
- **Função:** Simula um gerenciador/admin
- **Status:** Online (sempre)
- **Resposta:** 600ms de delay
- **Avatar:** Bot Manager customizado

---

## 🚀 Como Testar

### Passo 1: Iniciar a Aplicação

```bash
# Terminal 1: Frontend
cd Frontend
npm run dev

# Terminal 2: Backend (se necessário)
cd Backend
python -m uvicorn main:app --reload
```

Acesse: `http://localhost:5173`

---

### Passo 2: Encontrar os Bots

**Localização:** Na sidebar do chat, role para baixo até encontrar a seção:

```
🤖 Bot Traders
├─ 🤖 Bot Trader
├─ 🎧 Bot Support
└─ 💼 Bot Manager
```

**Ou busque diretamente:**
1. Use o campo de busca de contatos
2. Digite "Bot" ou "bot"
3. Os bots aparecerão na lista

---

### Passo 3: Iniciar uma Chamada

#### **Fazer uma Chamada com um Bot**

1. Clique no bot desejado na lista (ex: "🤖 Bot Trader")
2. No header do chat, você verá dois botões:
   - ☎️ **Chamada de Voz** - Audio call
   - 📹 **Chamada de Vídeo** - Video call
3. Clique em um dos botões

**Exemplo:**
```
Chat Page > 🤖 Bot Trader > [☎️ ou 📹]
```

---

### Passo 4: Modal de Chamada Recebida

Assim que você clica para fazer uma chamada:

1. **Modal aparece:** "Bot Trader está tentando fazer contato"
2. **Dois botões:**
   - 🔴 **Rejeitar** - Encerra a chamada
   - 🟢 **Aceitar** - Inicia a chamada

3. **Auto-aceitar (50% de chance):** O bot pode aceitar automaticamente após ~2 segundos

---

### Passo 5: Modal de Chamada Ativa

Depois que aceita (ou o bot aceita):

1. **CallModal abre** com:
   - Nome do contato (Bot Trader)
   - Avatar do bot
   - Timer de duração
   - Áudio: Visualizador com barras animadas
   - Vídeo: Área para vídeo remoto + vídeo local

2. **Controles disponíveis:**
   - 🎤 **Mute/Unmute** - Desabilitar áudio
   - 📹 **Camera** (vídeo only) - Ligar/desligar câmera
   - 🔊 **Volume** - Controlar volume
   - 📞 **End Call** (vermelho) - Encerrar chamada

3. **Duração:** Timer incrementa a cada segundo (00:00 → 00:01 → ...)

---

### Passo 6: Encerrar a Chamada

**Opções:**

1. **Botão vermelho 📞 (End Call)**
   - Clique no botão de encerramento
   - Modal fecha automaticamente
   - Volta para o chat normal

2. **Botão X no header**
   - Fecha o modal
   - Encerra a chamada

3. **Timeout automático:**
   - Bot encerra após 10-30 segundos
   - Você recebe mensagem de sistema: "🛑 Chamada encerrada"

---

## 🧪 Cenários de Teste

### Cenário 1: Teste Completo de Audio Call

```
1. Clique em "🤖 Bot Trader"
2. Clique em ☎️ (Phone button)
3. Aguarde modal aparecer
4. Clique "Aceitar"
5. Teste controles:
   - Clique em 🎤 para mutar
   - Observe cor mudar (vermelho)
   - Clique novamente para desmutar
6. Observe timer incrementar
7. Clique 📞 (vermelho) para encerrar
8. Verifique mensagem de sistema
```

**Resultado Esperado:** ✅
- Modal abre
- Duração incrementa
- Botão responde ao click
- Modal fecha ao encerrar

---

### Cenário 2: Teste Completo de Video Call

```
1. Clique em "🎧 Bot Support"
2. Clique em 📹 (Video button)
3. Aguarde modal aparecer
4. Clique "Aceitar"
5. Teste controles:
   - Observe área de vídeo
   - Clique em 🎤 para mutar áudio
   - Clique em 📹 para desligar câmera (vermelho)
   - Clique em 🔊 para controlar volume
6. Observe timer incrementar
7. Clique 📞 (vermelho) para encerrar
```

**Resultado Esperado:** ✅
- Modal abre com área de vídeo
- Todos os 4 botões funcionam
- Botão de vídeo fica vermelho quando desativado
- Modal fecha ao encerrar

---

### Cenário 3: Teste de Rejeição

```
1. Clique em "💼 Bot Manager"
2. Clique em ☎️ (Phone)
3. Na modal de chamada recebida, clique "Rejeitar"
4. Modal fecha
5. Verifique se não há CallModal ativa
```

**Resultado Esperado:** ✅
- Modal fecha
- Nenhuma chamada ativa
- Volta para chat normal

---

### Cenário 4: Teste de Auto-Resposta

```
1. Clique em "🤖 Bot Trader"
2. Clique em 📹 (Video)
3. NÃO clique em aceitar ou rejeitar
4. Aguarde 2-3 segundos
5. Bot pode aceitar automaticamente
6. CallModal pode abrir automaticamente
```

**Resultado Esperado:** ✅
- 50% de chance: Bot aceita e CallModal abre
- 50% de chance: Você precisa aceitar manualmente

---

## 🔍 Verificações de Debug

### Console do Navegador (F12 → Console)

Você deve ver logs como:

```javascript
// Ao iniciar chamada
📞 Iniciando chamada de voz com: Bot Trader
🎯 setCallType(audio), setIsCallActive(true)

// Verificação de render
📞 CallModal render check: {
  hasContact: true,
  isCallActive: true,
  callType: 'audio',
  shouldRender: true
}

// Eventos do bot
🤖 Bot Event: {
  type: 'incoming_call',
  botId: 'bot-1',
  botName: '🤖 Bot Trader',
  callType: 'audio',
  timestamp: 1702200000000
}

// Aceitar chamada
🎯 Aceitando chamada...
```

### React DevTools (se instalado)

1. Abra React DevTools
2. Procure pelo componente `ChatPage`
3. Inspecione estados:
   - `isCallActive` (deve ser `true` durante chamada)
   - `callType` (deve ser `'audio'` ou `'video'`)
   - `callDuration` (incrementa cada segundo)
   - `incomingCall.isOpen` (deve ser `true` quando esperando aceitar)

---

## 🛠️ Troubleshooting

### ❌ Bots não aparecem na lista

**Solução:**
1. Limpe cache: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
2. Feche DevTools (F12)
3. Recarregue a página
4. Procure por "Bot" no campo de busca

---

### ❌ Modal não abre ao clicar no bot

**Solução:**
1. Abra Console (F12)
2. Clique no bot
3. Procure por erros em vermelho
4. Verifique se o contato está selecionado
5. Tente outra chamada (áudio vs vídeo)

---

### ❌ Controles não respondem

**Solução:**
1. Clique fora do modal e volte
2. Verifique se CallModal está renderizado (DevTools → React)
3. Verifique console por erros
4. Tente encerrar e fazer nova chamada

---

### ❌ Timer não incrementa

**Solução:**
1. Verifique console por erros
2. Abra DevTools e veja `callDuration` incrementando
3. Pode ser que a chamada foi rejeitada
4. Aceite a chamada corretamente

---

## 📱 Teste em Múltiplos Navegadores

Para simular um cenário mais realista:

1. **Navegador 1 (User A):**
   - Abrir `http://localhost:5173`
   - Login com usuário A
   - Iniciar chamada com Bot

2. **Navegador 2 (User B):**
   - Abrir `http://localhost:5173` em nova janela
   - Login com usuário B
   - Receber chamada do usuário A (quando implementado)

---

## 🎯 Checklist de Teste Completo

- [ ] Encontrar bots na lista de contatos
- [ ] Iniciar audio call com Bot Trader
- [ ] Aceitar chamada recebida
- [ ] Mute/unmute funciona
- [ ] Timer incrementa
- [ ] Encerrar chamada funciona
- [ ] Modal fecha após encerrar
- [ ] Iniciar video call com Bot Support
- [ ] Botão de câmera funciona (vídeo only)
- [ ] Volume funciona
- [ ] Rejeitar chamada funciona
- [ ] Mensagens de sistema aparecem
- [ ] Nenhum erro no console
- [ ] Chamar 3 bots diferentes

---

## 📊 Métricas de Sucesso

| Métrica | Esperado | Status |
|---------|----------|--------|
| Bots aparecem na lista | 3 bots visíveis | ✅ |
| Chamada audio funciona | Modal abre | ✅ |
| Chamada video funciona | Modal abre com vídeo | ✅ |
| Controles funcionam | Respondem ao click | ✅ |
| Timer funciona | Incrementa por segundo | ✅ |
| Encerramento funciona | Modal fecha | ✅ |
| Console sem erros | 0 erros | ✅ |
| Performance | Build < 10s | ✅ |

---

## 🚀 Próximos Passos

Após confirmar que os bots funcionam:

1. **Testar com usuários reais:**
   - Abrir 2 navegadores
   - User A chama User B
   - User B recebe e aceita

2. **Testar WebRTC real:**
   - Verificar se streams de áudio/vídeo fluem
   - Testar em rede diferente (não localhost)

3. **Testar integração com backend:**
   - Verificar se signaling funciona
   - Testar ICE candidates
   - Verificar SDP offers/answers

4. **Teste de carga:**
   - Múltiplas chamadas simultâneas
   - Longa duração (30+ minutos)
   - Perda de conexão / reconexão

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique console (F12)
2. Copie logs relevantes
3. Abra issue no GitHub
4. Inclua informações:
   - Navegador e versão
   - Erro específico
   - Passos para reproduzir
   - Screenshot/video

---

**Status:** Pronto para teste! 🚀

Build: ✅ Passed (8.52s)
Bots: ✅ Integrados
UI: ✅ Completa
Funcionalidade: ✅ Testável
