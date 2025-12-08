# 🎓 Guia Visual Studio Code - HOLDWallet

## ❓ O que são essas extensões?

### **Backend (`.py` - Python)**

```
.py = Arquivo Python (Backend)
```

**Onde estão:**

```
backend/
├── app/
│   ├── main.py ✅ API principal
│   ├── services/ (serviços da aplicação)
│   ├── clients/ (conexão com blockchain)
│   └── db/ (banco de dados)
├── test_*.py (testes)
└── demo_*.py (demos)
```

**O que fazem:**

- Processam dados
- Falam com banco de dados
- Validam transações
- Gerenciam carteiras
- Lógica de negócio

**Exemplo de arquivo Python:**

```python
@app.post("/api/users/login")
async def login(credentials: LoginRequest):
    # Valida usuário
    user = await db.authenticate(credentials)
    return {"token": generate_jwt(user)}
```

---

### **Frontend (`.tsx` - TypeScript + React)**

```
.tsx = Arquivo TypeScript + React (Frontend)
```

**Onde estão:**

```
Frontend/src/
├── pages/ (páginas inteiras)
│   ├── auth/
│   │   ├── LoginPage.tsx ✅ Página de login
│   │   └── RegisterPage.tsx ✅ Registro
│   ├── wallet/
│   │   ├── WalletPage.tsx ✅ Carteira
│   │   ├── SendPage.tsx ✅ Enviar moedas
│   │   └── ReceivePage.tsx ✅ Receber moedas
│   └── p2p/ (marketplace P2P)
├── components/ (partes reutilizáveis)
│   ├── layout/ (header, sidebar, footer)
│   └── ui/ (botões, modais, etc)
└── App.tsx ✅ Arquivo principal
```

**O que fazem:**

- Mostram a interface visual
- Recebem dados do usuário
- Chamam a API (backend)
- Exibem informações
- Interagem com usuário

**Exemplo de arquivo TSX:**

```tsx
export function LoginPage() {
  const [email, setEmail] = useState("");

  return (
    <div>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <button onClick={() => login(email)}>Entrar</button>
    </div>
  );
}
```

---

## 🖥️ Como abrir o Explorer no VS Code

### **Opção 1: Clique no ícone (MAIS FÁCIL)**

```
┌─────────────────┐
│  🔍 ← Aqui       │  Clique no primeiro ícone
│  📁             │  (ícone de pasta)
│  📊             │
│  ⚙️              │
└─────────────────┘
```

### **Opção 2: Atalho de teclado**

```
macOS:  ⌘ + B
Windows/Linux: Ctrl + B
```

### **Opção 3: Menu**

```
View → Explorer
```

---

## 📂 Estrutura de Pastas Explicada

```
HOLDWallet/
│
├── 📁 backend/
│   ├── app/
│   │   ├── main.py ← API FastAPI (começa aqui!)
│   │   ├── services/ ← Lógica da aplicação
│   │   ├── clients/ ← Conexão blockchain
│   │   └── db/ ← Banco de dados
│   ├── requirements.txt ← Dependências Python
│   └── holdwallet.db ← Banco de dados
│
├── 📁 Frontend/
│   ├── src/
│   │   ├── pages/ ← Páginas inteiras (.tsx)
│   │   ├── components/ ← Componentes reutilizáveis
│   │   ├── App.tsx ← Arquivo principal
│   │   └── main.tsx ← Ponto de entrada
│   ├── package.json ← Dependências npm
│   ├── vite.config.ts ← Configuração Vite
│   └── tailwind.config.js ← Estilos CSS
│
├── 📁 src/ ← Código adicional
├── 📁 logs/ ← Arquivos de log
├── 📁 uploads/ ← Arquivos enviados
│
├── 📄 package.json ← Arquivo raiz
├── 📄 .env ← Variáveis de ambiente (NÃO ENVIAR pro Git!)
└── 📄 HOLDWALLET_COMPLETE_CHECKLIST.md ← Nosso checklist!
```

---

## 🎯 Por que o VS Code mostra "py" e "tsx"?

VS Code mostra essas extensões porque:

1. **São linguagens diferentes**

   - `.py` = Python (lógica do servidor)
   - `.tsx` = TypeScript/React (interface visual)

2. **VS Code usa isso para:**

   - Aplicar "syntax highlighting" (cores corretas)
   - Usar o "formatter" apropriado
   - Fornecer autocomplete
   - Executar testes

3. **Você pode esconder se quiser:**
   - View → Explorer → ⋮ (menu) → "Hide File Extensions"

---

## 🚀 Quick Start - Como começar

### **Para trabalhar no BACKEND (Python):**

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend

# Abrir em um terminal
python -m uvicorn app.main:app --reload
```

**Arquivo para editar:**

```
backend/app/main.py ← Comece aqui!
```

### **Para trabalhar no FRONTEND (React):**

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/Frontend

# Abrir em outro terminal
npm run dev
```

**Arquivo para editar:**

```
Frontend/src/pages/ ← As páginas visíveis
Frontend/src/components/ ← Os componentes
```

---

## 💡 Dicas Práticas

### **1. Abrir múltiplas pastas**

```
File → Open Workspace from File
Selecione: HOLDWallet.code-workspace (se existir)
OU selecione a pasta HOLDWallet
```

### **2. Split View (Ver 2 arquivos lado a lado)**

```
Abra um arquivo
Pressione: ⌘ + \ (macOS) ou Ctrl + \ (Windows)
```

### **3. Terminal integrado**

```
View → Terminal (ou ⌘ + `)
Abre um terminal dentro do VS Code
```

### **4. Buscar arquivo rapidamente**

```
⌘ + P (macOS) ou Ctrl + P (Windows)
Digite o nome do arquivo
Ex: "LoginPage" para achar "LoginPage.tsx"
```

### **5. Buscar dentro do código**

```
⌘ + F (macOS) ou Ctrl + F (Windows)
Busca no arquivo atual
```

### **6. Buscar em TODOS os arquivos**

```
⌘ + Shift + F (macOS) ou Ctrl + Shift + F (Windows)
Busca em todo o projeto
```

---

## 🔧 Extensões Recomendadas

Para melhor experiência, instale:

1. **Python** (Microsoft)

   - Syntax highlighting para `.py`
   - Debugging
   - Linting

2. **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)

   - Atalhos para React

3. **Prettier** (esbenp.prettier-vscode)

   - Formatação automática
   - Funciona com `.tsx` e `.py`

4. **Thunder Client** ou **REST Client**
   - Testar API backend
   - Sem precisar de Postman

---

## 📊 Comparação: Backend vs Frontend

| Aspecto              | Backend (.py)       | Frontend (.tsx)        |
| -------------------- | ------------------- | ---------------------- |
| **Linguagem**        | Python              | TypeScript + React     |
| **Localização**      | `/backend`          | `/Frontend/src`        |
| **Visualização**     | Terminal/Logs       | Navegador web          |
| **Usuário vê?**      | ❌ Não              | ✅ Sim                 |
| **Acesso BD**        | ✅ Sim              | ❌ Não (via API)       |
| **Processamento**    | ✅ Pesado           | ❌ Leve                |
| **Responsabilidade** | Lógica negócio      | Interface visual       |
| **Exemplo**          | Processar transação | Mostrar botão "Enviar" |

---

## 🎓 Aprenda mais

### **Python (.py)**

- Documentação: [python.org](https://python.org)
- FastAPI: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)

### **TypeScript/React (.tsx)**

- Documentação: [react.dev](https://react.dev)
- TypeScript: [typescriptlang.org](https://typescriptlang.org)

---

## ✅ Resumo Rápido

```
┌─────────────────────────────────────────┐
│  .py = Backend (não vê)                 │
│  .tsx = Frontend (você vê)              │
│                                         │
│  Para abrir Explorer: ⌘ + B            │
│  Para buscar arquivo: ⌘ + P            │
│  Para ver lado a lado: ⌘ + \           │
└─────────────────────────────────────────┘
```

---

**Próximo passo?**
Abra o Explorer (⌘ + B) e explore a estrutura! 🚀
