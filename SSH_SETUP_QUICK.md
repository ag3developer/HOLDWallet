# 🔐 SSH SETUP - Digital Ocean

## Quick Start

### 1. Gerar SSH Key (No seu Mac)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/do_key -C "holdwallet"
```

Pressione Enter 3x (sem passphrase para facilitar)

### 2. Copiar Chave Pública

```bash
cat ~/.ssh/do_key.pub
```

**Resultado:** Algo como

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJ... holdwallet
```

### 3. No DigitalOcean

1. https://cloud.digitalocean.com → Settings → Security
2. SSH Keys → Add Key
3. Colar a chave pública
4. Nome: "holdwallet-macbook"
5. Add SSH Key

### 4. Conectar

```bash
ssh -i ~/.ssh/do_key root@seu-ip-do-droplet
```

**Exemplo:**

```bash
ssh -i ~/.ssh/do_key root@123.45.67.89
```

### 5. Permissões SSH Key (Segurança)

```bash
chmod 600 ~/.ssh/do_key
chmod 644 ~/.ssh/do_key.pub
```

---

## Atalhos Úteis

### Alias para Conectar Rápido

```bash
nano ~/.zshrc
```

Adicionar no final:

```bash
alias do-connect="ssh -i ~/.ssh/do_key holdwallet@123.45.67.89"
alias do-root="ssh -i ~/.ssh/do_key root@123.45.67.89"
```

Salvar: Ctrl+O → Enter → Ctrl+X

```bash
source ~/.zshrc
```

Agora pode conectar com:

```bash
do-connect
```

### Copy-Paste de Arquivo Local → Droplet

```bash
scp -i ~/.ssh/do_key ~/arquivo.txt holdwallet@123.45.67.89:~/
```

### Copy-Paste de Droplet → Local

```bash
scp -i ~/.ssh/do_key holdwallet@123.45.67.89:~/arquivo.txt ~/
```

---

## Troubleshooting

### Erro: "Permission denied (publickey)"

```bash
# Verificar se arquivo .pem existe
ls -la ~/.ssh/do_key

# Se não existir, regenerar
ssh-keygen -t ed25519 -f ~/.ssh/do_key -C "holdwallet"

# Copiar chave pública novamente para DigitalOcean
cat ~/.ssh/do_key.pub
```

### Erro: "Timeout"

```bash
# Pode ser firewall. Testar:
ping seu-ip-do-droplet

# Se não responder, verificar:
# 1. Droplet está ativa? (Dashboard → Droplets)
# 2. IP está correto?
# 3. Firewall do seu internet permite porta 22?
```

### Desconectar

```bash
exit
```

---

## Manter Conexão Viva

### Opção 1: Alias Útil

```bash
# Conectar sem desconectar (mesmo se ficar inativo)
ssh -i ~/.ssh/do_key -o ServerAliveInterval=60 holdwallet@seu-ip
```

### Opção 2: Tmux (Sessão Persistente)

```bash
# Instalar tmux (se não tiver)
brew install tmux

# Conectar e abrir tmux
ssh -i ~/.ssh/do_key holdwallet@seu-ip
tmux

# Agora pode fechar o terminal e reconectar depois
# Na próxima vez, fazer:
ssh -i ~/.ssh/do_key holdwallet@seu-ip
tmux attach
# Sua sessão continua!
```

---

## SSH Config File (Opcional - Mais Prático)

### Criar/Editar

```bash
nano ~/.ssh/config
```

### Adicionar

```
Host do-holdwallet
    HostName seu-ip-do-droplet
    User holdwallet
    IdentityFile ~/.ssh/do_key
    ServerAliveInterval 60
    ServerAliveCountMax 3

Host do-root
    HostName seu-ip-do-droplet
    User root
    IdentityFile ~/.ssh/do_key
```

### Usar

```bash
# Em vez de:
ssh -i ~/.ssh/do_key holdwallet@123.45.67.89

# Agora:
ssh do-holdwallet
```

---

## Security Checklist

- [ ] SSH key é ED25519 (mais seguro que RSA)
- [ ] Permissões corretas: `chmod 600 ~/.ssh/do_key`
- [ ] Key pública está em DigitalOcean SSH Keys
- [ ] Root login desabilitado após setup (fazer depois)
- [ ] Firewall UFW ativado no servidor

---

_Pronto? Agora pode usar `ssh do-holdwallet` para conectar!_ 🚀
