# 🧪 Scripts de Teste - HOLD Wallet Backend

Esta pasta contém scripts de teste completos para validar todas as funcionalidades do HOLD Wallet Backend.

## 📋 Scripts Disponíveis

### 1. `test_user_flow.py` - Teste Completo do Sistema
**Simula um usuário real (devuser) utilizando todas as funcionalidades**

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend
python app/tests/test_user_flow.py
```

**Funcionalidades testadas:**
- ✅ Health checks do sistema
- ✅ Registro e login de usuário
- ✅ Criação de carteira HD com mnemônico
- ✅ Geração de endereços multi-chain (Bitcoin, Ethereum, Polygon, BSC)
- ✅ Listagem de endereços e carteiras
- ✅ Integração com blockchain (fees, validação)
- ✅ Sistema de transações (criar, estimar, listar)
- ✅ Integração com preços de mercado
- ✅ Estatísticas do usuário

### 2. `quick_test.py` - Teste Rápido
**Verificação rápida se o sistema está funcionando**

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend
python app/tests/quick_test.py
```

**Verifica:**
- ✅ Sistema online
- ✅ Database conectado
- ✅ API endpoints disponíveis
- ✅ Serviços básicos funcionando

### 3. `demo_transaction.py` - Demo de Transações
**Demonstra o fluxo completo de transação (sem broadcast real)**

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend
python app/tests/demo_transaction.py
```

**Demonstra:**
- ✅ Autenticação de usuário
- ✅ Estimativa de taxas
- ✅ Criação de transação
- ✅ Assinatura de transação
- ✅ Simulação de broadcast
- ✅ Gerenciamento de transações
- ✅ Estatísticas e cancelamento

## 🚀 Como Executar

### Pré-requisitos
1. **Servidor rodando**: Certifique-se que o backend está rodando em `http://localhost:8001`
   ```bash
   cd /Users/josecarlosmartins/Documents/HOLDWallet/backend
   uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

2. **Dependências instaladas**: httpx deve estar disponível
   ```bash
   pip install httpx
   ```

### Execução dos Testes

#### Teste Completo (Recomendado para primeira execução)
```bash
# Executa todos os testes e cria dados de teste
python app/tests/test_user_flow.py
```

#### Teste Rápido (Para verificações posteriores)
```bash
# Verificação rápida do sistema
python app/tests/quick_test.py
```

#### Demo de Transação (Requer teste completo executado primeiro)
```bash
# Demonstra fluxo de transação
python app/tests/demo_transaction.py
```

## 📊 Saída Esperada

### Teste Completo - Sucesso Total
```
🚀 INICIANDO TESTE COMPLETO DO HOLD WALLET BACKEND
============================================================

📋 TESTE: Health Check
----------------------------------------
[22:45:12] ℹ️ 🏥 Testando Health Check do Sistema
    ✅ Status: 200
[22:45:12] ✅ Sistema está saudável e operacional

📋 TESTE: Registro de Usuário
----------------------------------------
[22:45:12] ℹ️ 👤 Registrando usuário: devuser
    ✅ Status: 201
[22:45:12] ✅ Usuário registrado com sucesso

... (mais testes) ...

============================================================
📊 RESUMO DOS TESTES
============================================================
✅ Health Check
✅ Registro de Usuário
✅ Login
✅ Perfil do Usuário
✅ Criação de Carteira HD
✅ Geração de Endereços
✅ Listagem de Endereços
✅ Integração Blockchain
✅ Sistema de Transações
✅ Integração com Preços
✅ Estatísticas do Usuário

🎯 RESULTADO FINAL: 11/11 testes passaram
🎉 TODOS OS TESTES PASSARAM! HOLD Wallet Backend está 100% funcional!
```

## 🔍 Dados de Teste Criados

### Usuário de Teste
- **Username**: `devuser`
- **Email**: `devuser@holdwallet.com`
- **Password**: `DevUser123!`

### Carteira Criada
- **Nome**: "DevUser Main Wallet"
- **Tipo**: HD Wallet
- **Redes**: Bitcoin, Ethereum, Polygon, BSC
- **Endereços**: Gerados automaticamente para cada rede

## 🛠️ Troubleshooting

### ❌ "Não foi possível conectar"
- Verifique se o servidor está rodando em `http://localhost:8001`
- Execute: `uvicorn app.main:app --host 0.0.0.0 --port 8001`

### ❌ "Usuário já existe"
- Normal - o script tentará fazer login automaticamente
- Ou delete o database para recomeçar

### ❌ "Database com problemas"
- Verifique se as tabelas foram criadas corretamente
- Verifique logs do servidor para erros de database

### ⚠️ "Alguns testes falharam"
- Verifique logs detalhados no output
- Testes de blockchain podem falhar sem RPC configurado (normal)
- Sistema ainda funcional para a maioria dos casos

## 📝 Personalizando Testes

### Modificar Dados de Teste
Edite as constantes no início de `test_user_flow.py`:
```python
TEST_USER = {
    "username": "seu_usuario",
    "email": "seu_email@exemplo.com", 
    "password": "SuaSenha123!"
}
```

### Adicionar Novos Testes
Adicione métodos à classe `HOLDWalletTester`:
```python
def test_nova_funcionalidade(self) -> bool:
    """Teste para nova funcionalidade"""
    self.print_step("Testando nova funcionalidade")
    # Sua lógica aqui
    return True
```

## 🎯 Objetivo dos Testes

Estes scripts validam que:
- ✅ **Backend está 100% funcional**
- ✅ **Database está integrado corretamente**
- ✅ **Todas as APIs funcionam**
- ✅ **Fluxo do usuário está completo**
- ✅ **Sistema está pronto para produção**

Execute regularmente para garantir que mudanças no código não quebrem funcionalidades existentes.
