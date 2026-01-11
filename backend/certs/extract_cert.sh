#!/bin/bash
# ============================================================
# Script para extrair certificado e chave do arquivo .pfx/.p12
# Para uso com mTLS no Banco do Brasil
# ============================================================

echo "============================================================"
echo "🔐 Extração de Certificado para mTLS - Banco do Brasil"
echo "============================================================"
echo ""

# Verificar se openssl está instalado
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL não encontrado. Instale com: brew install openssl"
    exit 1
fi

# Verificar argumentos
if [ -z "$1" ]; then
    echo "Uso: ./extract_cert.sh <arquivo.pfx> [senha]"
    echo ""
    echo "Exemplo:"
    echo "  ./extract_cert.sh certificado.pfx minhasenha"
    echo ""
    exit 1
fi

PFX_FILE="$1"
PASSWORD="$2"

# Verificar se arquivo existe
if [ ! -f "$PFX_FILE" ]; then
    echo "❌ Arquivo não encontrado: $PFX_FILE"
    exit 1
fi

echo "📂 Arquivo: $PFX_FILE"
echo ""

# Se senha não foi fornecida, pedir
if [ -z "$PASSWORD" ]; then
    echo -n "🔑 Digite a senha do certificado: "
    read -s PASSWORD
    echo ""
fi

# Nomes dos arquivos de saída
CERT_FILE="bb_certificate.crt"
KEY_FILE="bb_private_key.key"
CHAIN_FILE="bb_chain.crt"

echo ""
echo "📝 Extraindo certificado..."

# Extrair certificado (sem a cadeia)
openssl pkcs12 -in "$PFX_FILE" -clcerts -nokeys -out "$CERT_FILE" -passin pass:"$PASSWORD" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Certificado extraído: $CERT_FILE"
else
    echo "   ❌ Erro ao extrair certificado. Verifique a senha."
    exit 1
fi

# Extrair chave privada
echo "📝 Extraindo chave privada..."
openssl pkcs12 -in "$PFX_FILE" -nocerts -nodes -out "$KEY_FILE" -passin pass:"$PASSWORD" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Chave privada extraída: $KEY_FILE"
    chmod 600 "$KEY_FILE"  # Proteger a chave
else
    echo "   ❌ Erro ao extrair chave privada."
    exit 1
fi

# Extrair cadeia de certificados (CA intermediários)
echo "📝 Extraindo cadeia de certificados..."
openssl pkcs12 -in "$PFX_FILE" -cacerts -nokeys -out "$CHAIN_FILE" -passin pass:"$PASSWORD" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Cadeia extraída: $CHAIN_FILE"
else
    echo "   ⚠️ Cadeia de certificados não encontrada (pode não ser necessária)"
fi

echo ""
echo "============================================================"
echo "✅ EXTRAÇÃO CONCLUÍDA!"
echo "============================================================"
echo ""
echo "📋 Arquivos gerados:"
echo "   • $CERT_FILE  - Certificado público"
echo "   • $KEY_FILE   - Chave privada (PROTEGIDA!)"
echo "   • $CHAIN_FILE - Cadeia de CAs (se existir)"
echo ""
echo "📝 Informações do certificado:"
openssl x509 -in "$CERT_FILE" -noout -subject -dates 2>/dev/null
echo ""
echo "============================================================"
echo ""
echo "🔧 Próximo passo: Adicione ao .env:"
echo ""
echo "   BB_CERT_PATH=$(pwd)/$CERT_FILE"
echo "   BB_KEY_PATH=$(pwd)/$KEY_FILE"
echo ""
echo "============================================================"
