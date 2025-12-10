# 🔧 DEBUGGING - CallModal Não Abre

## ✅ Verificação Rápida

### **Passo 1: Abra o Dev Tools**
1. Abra `http://localhost:5173` (ou seu endereço)
2. Pressione `F12` para abrir DevTools
3. Vá para a aba **Console**

### **Passo 2: Reproduza o Problema**
1. Abra um chat com um trader
2. Clique no botão ☎️ (Phone) ou 📹 (Video)
3. **Verifique o console** - você deve ver:

```
📞 Iniciando chamada de voz com: João Silva
🎯 setCallType(audio), setIsCallActive(true)
📞 CallModal render check: {
  hasContact: true,
  isCallActive: true,
  callType: 'audio',
  shouldRender: true
}
```

### **Passo 3: Analise o Resultado**

Se você vê `shouldRender: true`, mas o modal não aparece:
- ✅ Estados estão corretos
- ❌ Problema está no render do CallModal

Se você vê `shouldRender: false`:
- ❌ Um dos estados não está sendo setado

---

## 🐛 Possíveis Problemas

### **Problema 1: `hasContact: false`**
**Causa:** Nenhum contato selecionado  
**Solução:** Clique em um contato antes de iniciar a chamada

### **Problema 2: `isCallActive: false`**
**Causa:** Estado não está sendo setado  
**Solução:** Verifique se há erro no console antes disso

### **Problema 3: `callType: null`**
**Causa:** Tipo de chamada não foi setado  
**Solução:** O erro pode estar em `webrtcService.initiateCall()`

### **Problema 4: `shouldRender: true` mas modal não aparece**
**Causa:** Problema no CallModal.tsx  
**Solução:** 
- Verifique se CallModal está importado no ChatPage
- Verifique se `isOpen={isCallActive}` está sendo passado
- Verifique se z-index está correto (z-50)

---

## 📋 Checklist de Verificação

- [ ] CallModal está importado em ChatPage.tsx?
  ```tsx
  import { CallModal } from '@/components/chat/CallModal'
  ```

- [ ] Estados estão inicializados?
  ```tsx
  const [isCallActive, setIsCallActive] = useState(false)
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  ```

- [ ] Handlers estão setando os estados?
  ```tsx
  setCallType('audio')
  setIsCallActive(true)
  ```

- [ ] CallModal está sendo renderizado?
  ```tsx
  {currentContact && isCallActive && callType && (
    <CallModal {...props} />
  )}
  ```

- [ ] Props estão corretas?
  ```tsx
  isOpen={isCallActive}
  callType={callType}
  contactName={currentContact.name}
  ```

---

## 🧪 Teste Manual

### **Teste 1: Verificar Estado**
Abra o DevTools → React DevTools (se tiver instalado)
- Procure pelo componente `ChatPage`
- Verifique os valores de `isCallActive`, `callType`
- Esperado: `isCallActive=true`, `callType='audio'`

### **Teste 2: Verificar Renderização**
No Console, execute:
```javascript
// Verificar se CallModal está no DOM
document.querySelector('[class*="z-50"]')
// Resultado esperado: <div class="fixed inset-0 z-50...">
```

### **Teste 3: Verificar CSS**
```javascript
// Verificar se modal tem display correto
const modal = document.querySelector('.fixed.inset-0.z-50')
console.log(window.getComputedStyle(modal).display)
// Resultado esperado: "flex"
```

---

## 🔍 Análise Detalhada

### **Se o modal aparece:**
✅ **Sucesso!** Passe para testes de funcionalidade:
- [ ] Testar audio toggle (mute/unmute)
- [ ] Testar video toggle (ligar/desligar câmera)
- [ ] Testar volume toggle
- [ ] Testar end call
- [ ] Verificar duração (timer)

### **Se o modal NÃO aparece:**

**1. Verifique o console por erros:**
```
Erro comum: "Cannot read property 'name' of undefined"
Solução: Selecione um contato antes de chamar
```

**2. Verifique se WebRTC está funcionando:**
```javascript
// No console
console.log(typeof webrtcService)
// Esperado: "object"

console.log(typeof webrtcService.initiateCall)
// Esperado: "function"
```

**3. Verifique se localStorage tem token:**
```javascript
console.log(localStorage.getItem('token'))
// Esperado: seu JWT token
// Se undefined: fazer login novamente
```

---

## 📱 Teste em Staging

### **Pré-requisitos:**
1. Backend rodando (FastAPI)
2. Frontend rodando (Vite/React)
3. Dois navegadores ou abas abertas
4. Ambos logados com usuários diferentes

### **Procedimento:**

**Usuário A:**
1. Abrir chat com Usuário B
2. Clicar ☎️ (Phone)
3. Verificar se modal abre
4. Verificar console (Debug logs)

**Usuário B:**
1. Receber notificação de chamada recebida
2. Aceitar chamada
3. Verificar se modal abre
4. Testar controles (mute, etc)

**Ambos:**
1. Falar e verificar áudio
2. Encerrar chamada com botão 📞
3. Verificar se modal fecha

---

## 🚀 Solução Rápida

Se ainda não funcionar, tente:

**1. Limpar cache:**
```bash
# No terminal
rm -rf ./Frontend/dist
npm run build
```

**2. Hard refresh no navegador:**
`Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)

**3. Verificar DevTools:**
- Network tab: Ver se todos os bundles carregaram
- Console: Ver se há erros em vermelho
- React tab: Ver se CallModal está no tree

**4. Reiniciar servidor:**
```bash
npm run dev
```

---

## ✅ Quando Funcionar

Após o modal abrir com sucesso:

1. **Teste audio:**
   - Clique botão 🎤 para mutar
   - Som deve desabilitar
   - Botão muda de cor (cinza → vermelho)

2. **Teste video (se chamada de vídeo):**
   - Clique botão 📹 para desligar câmera
   - Câmera deve desabilitar
   - Botão muda de cor (cinza → vermelho)

3. **Teste encerramento:**
   - Clique botão 📞 (vermelho) no final
   - Modal deve fechar
   - `isCallActive` deve voltar a `false`

4. **Verifique mensagens de sistema:**
   - Deve aparecer mensagem "☎️ Chamada de voz iniciada..."
   - Deve aparecer mensagem "🛑 Chamada encerrada"

---

## 📞 Precisa de Ajuda?

Se o problema persistir, forneça:

1. **Screenshots:**
   - Do console com erro
   - Do DevTools mostrando estados
   - Da página do chat

2. **Logs:**
   - Output do `npm run build`
   - Erros do console
   - Logs do backend

3. **Informações:**
   - Navegador (Chrome, Firefox, Safari)
   - URL que está testando
   - Se está em localhost ou staging

---

**Status:** Pronto para debug! 🔍
