# 🎨 Como Ativar Ícones de Arquivos no VS Code

## O que está acontecendo?

Todos os arquivos aparecem com o **mesmo ícone** (📄) porque o **tema de ícones** não está ativado ou a extensão não está instalada.

---

## ✅ Solução Rápida

### **Opção 1: Ativar o Tema de Ícones Padrão (RECOMENDADO)**

1. **Abra a Paleta de Comandos:**

   - Mac: `⌘ + Shift + P`
   - Windows/Linux: `Ctrl + Shift + P`

2. **Digite:** `Preferences: File Icon Theme`

3. **Selecione:** `Seti (Visual Studio Code)`
   - ✅ Mostra ícones com cores

Pronto! Agora você verá:

- 🐍 `.py` = Python
- ⚛️ `.tsx` = React/TypeScript
- 📘 `.ts` = TypeScript
- 📦 `.json` = JSON
- 📝 `.md` = Markdown

---

### **Opção 2: Instalar Extensão (Material Icon Theme)**

Se o Seti não funcionar bem, instale a extensão **Material Icon Theme**:

1. **Vá para:** Extensions (⇧⌘X no Mac, Ctrl+Shift+X no Windows)
2. **Busque:** `Material Icon Theme`
3. **Clique em Install** (publicada por Philipp Kief)
4. **Ative:** Clique em "Set as File Icon Theme"

---

## 🎯 Ícones que você verá

| Extensão | Ícone | Linguagem        |
| -------- | ----- | ---------------- |
| `.py`    | 🐍    | Python           |
| `.tsx`   | ⚛️    | React/TypeScript |
| `.ts`    | 📘    | TypeScript       |
| `.jsx`   | ⚛️    | React            |
| `.js`    | 🟨    | JavaScript       |
| `.json`  | 📦    | JSON             |
| `.md`    | 📝    | Markdown         |
| `.html`  | 🌐    | HTML             |
| `.css`   | 🎨    | CSS              |
| `.env`   | ⚙️    | Ambiente         |

---

## 🔧 Configuração já adicionada

Atualizei seu `settings.json` com:

```jsonc
"workbench.iconTheme": "vs-seti",
"file-icons.associations": {
  "*.py": "python",
  "*.tsx": "typescript",
  "*.ts": "typescript",
  "*.jsx": "react",
  "*.json": "json",
  "*.md": "markdown"
}
```

Isso já deve ajudar! Mas se não funcionar, siga a **Opção 1** acima.

---

## 🐛 Se ainda não funcionar

1. **Reinicie o VS Code:**

   - `⌘ + Shift + P` → "Developer: Reload Window"

2. **Verifique a extensão:**

   - Extensões → Procure por "icon"
   - Veja quais estão instaladas

3. **Limpe o cache:**
   - Quit VS Code
   - Delete: `~/.vscode/extensions/` (temporariamente)
   - Reabra o VS Code

---

## 💡 Dica Extra: Cores Diferentes por Tipo

O tema **Seti** já faz isso automaticamente:

- 🐍 Python = `Amarelo`
- ⚛️ React = `Azul`
- 📦 JSON = `Verde`
- 📝 Markdown = `Laranja`

---

**Pronto? Agora seus arquivos têm ícones bonitinhos!** 🎉
