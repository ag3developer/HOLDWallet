# 🔧 SOLUÇÃO: Reiniciar Frontend com Configuração Correta

## ❌ Problema Atual

```
POST http://127.0.0.1:8000/api/v1/auth/login 404
```

O axios está adicionando `/api/v1` mesmo depois das correções.

---

## ✅ Solução

### **Passo 1: Para o Frontend**

```bash
# No terminal onde o frontend está rodando
Ctrl+C
```

### **Passo 2: Limpar Cache**

```bash
cd Frontend
rm -rf node_modules/.vite
rm -rf dist
```

### **Passo 3: Verificar .env.local**

```bash
cat .env.local
# Deve ter: VITE_API_URL=http://localhost:8000
```

### **Passo 4: Reiniciar Frontend**

```bash
npm run dev
```

### **Passo 5: Verificar no Console do Navegador**

Abra `http://localhost:3000` e veja no console:

```
🌍 API Environment: {
  mode: 'development',
  apiUrl: 'http://localhost:8000',  ← SEM /api/v1
  isDevelopment: true
}

[CONFIG] 🔧 Development Mode
[CONFIG] API Base URL: http://localhost:8000  ← SEM /api/v1
```

### **Passo 6: Limpar LocalStorage do Navegador**

```javascript
// No console do navegador (F12):
localStorage.clear();
location.reload();
```

---

## 🧪 Teste de Login

Depois de reiniciar:

1. Acesse: `http://localhost:3000/login`
2. Usuário: `dev@wolknow.com`
3. Senha: `Abc123@@`
4. Clique em "Entrar"

**Requisição esperada:**

```
POST http://localhost:8000/auth/login
```

**NÃO deve ter `/api/v1`!**

---

## 📝 Checklist de Verificação

- [ ] Frontend parado (Ctrl+C)
- [ ] Cache limpo (rm -rf node_modules/.vite)
- [ ] .env.local tem: `VITE_API_URL=http://localhost:8000`
- [ ] Frontend reiniciado (npm run dev)
- [ ] Console mostra URL correta (sem /api/v1)
- [ ] LocalStorage limpo (localStorage.clear())
- [ ] Teste de login funciona

---

## 🔍 Se Ainda Não Funcionar

Verificar se o backend está rodando:

```bash
# Testar direto
curl http://localhost:8000/health
# Deve retornar: {"status":"healthy"}

curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@wolknow.com","password":"Abc123@@"}'
# Deve retornar: {"access_token":"..."}
```

---

## 💡 Por Que Isso Aconteceu?

Vite cacheia as variáveis de ambiente (`import.meta.env.VITE_*`) durante o build. Quando você muda `.env.local`, precisa:

1. **Parar** o servidor (`Ctrl+C`)
2. **Reiniciar** (`npm run dev`)

Apenas salvar o arquivo `.env.local` **não atualiza** as variáveis em tempo real.

---

**Última atualização:** 15 de dezembro de 2025
