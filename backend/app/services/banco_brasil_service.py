"""
🏦 WOLK NOW - Banco do Brasil API Service
==========================================

Integração com APIs do Banco do Brasil:
- PIX Cobrança (Criar QR Code)
- Webhook de confirmação
- Consulta de cobranças

Documentação: https://developers.bb.com.br/

Author: GitHub Copilot para WOLK NOW
Date: Janeiro 2026
"""

import httpx
import ssl
import base64
import logging
import json
import os
import io
import tempfile
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)


class BancoBrasilAPIService:
    """
    Serviço de integração com APIs do Banco do Brasil.

    APIs utilizadas:
    - PIX Cobrança (cob.write, cob.read)
    - Webhook PIX
    - Consulta de pagamentos

    Fluxo de uso:
    1. get_access_token() - Obtém token OAuth 2.0
    2. criar_cobranca_pix() - Cria QR Code PIX
    3. consultar_cobranca() - Verifica status
    4. processar_webhook() - Processa notificação de pagamento
    """

    # URLs Base - Ambientes
    # Homologação (sandbox): api.hm.bb.com.br ou api-pix.hm.bb.com.br (com mTLS)
    # Produção: api-pix.bb.com.br (com mTLS obrigatório)
    OAUTH_URL_SANDBOX = "https://oauth.hm.bb.com.br/oauth/token"
    OAUTH_URL_PROD = "https://oauth.bb.com.br/oauth/token"

    API_URL_SANDBOX = "https://api.hm.bb.com.br/pix/v2"
    API_URL_PROD = "https://api-pix.bb.com.br/pix/v2"

    def __init__(self, db: Session = None):
        """
        Inicializa o serviço do Banco do Brasil.
        
        Args:
            db: Sessão do SQLAlchemy (opcional)
        """
        self.db = db
        
        # Determina ambiente
        self.is_production = getattr(settings, 'BB_ENVIRONMENT', 'sandbox') == "production"

        # URLs baseadas no ambiente
        self.oauth_url = self.OAUTH_URL_PROD if self.is_production else self.OAUTH_URL_SANDBOX
        self.api_url = self.API_URL_PROD if self.is_production else self.API_URL_SANDBOX

        # Credenciais (do .env)
        self.client_id = getattr(settings, 'BB_CLIENT_ID', '')
        self.client_secret = getattr(settings, 'BB_CLIENT_SECRET', '')
        self.gw_dev_app_key = getattr(settings, 'BB_GW_DEV_APP_KEY', '')
        self.pix_key = getattr(settings, 'BB_PIX_KEY', '')  # Chave PIX da empresa (CNPJ)

        # Certificados mTLS (obrigatório para produção)
        # Prioridade: 1) Arquivos locais, 2) Base64 do ambiente
        self.cert_path = getattr(settings, 'BB_CERT_PATH', None)
        self.key_path = getattr(settings, 'BB_KEY_PATH', None)
        
        # Suporte a certificados via Base64 (para cloud: Digital Ocean, Heroku, etc)
        self.cert_content_b64 = getattr(settings, 'BB_CERT_CONTENT', None)
        self.key_content_b64 = getattr(settings, 'BB_KEY_CONTENT', None)
        
        # Arquivos temporários para certificados base64
        self._temp_cert_file = None
        self._temp_key_file = None
        
        # Se temos base64 mas não temos arquivos, criar arquivos temporários
        if not self.cert_path and self.cert_content_b64:
            self._setup_certs_from_base64()

        # Token de acesso (cache em memória)
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

        # Log configuração
        env_mode = "PRODUÇÃO" if self.is_production else "SANDBOX"
        has_certs = "✅" if (self.cert_path and self.key_path) else "❌"
        cert_source = "base64" if self._temp_cert_file else "arquivo"
        logger.info(f"🏦 BancoBrasilAPIService inicializado em modo: {env_mode} | mTLS: {has_certs} ({cert_source})")

    def _setup_certs_from_base64(self):
        """
        Cria arquivos temporários a partir de certificados em base64.
        Útil para ambientes cloud onde não é possível ter arquivos estáticos.
        """
        try:
            if self.cert_content_b64:
                # Decodificar certificado
                cert_content = base64.b64decode(self.cert_content_b64)
                self._temp_cert_file = tempfile.NamedTemporaryFile(
                    mode='wb', 
                    suffix='.crt', 
                    delete=False
                )
                self._temp_cert_file.write(cert_content)
                self._temp_cert_file.flush()
                self.cert_path = self._temp_cert_file.name
                logger.info(f"✅ Certificado criado de base64: {self.cert_path}")
                
            if self.key_content_b64:
                # Decodificar chave privada
                key_content = base64.b64decode(self.key_content_b64)
                self._temp_key_file = tempfile.NamedTemporaryFile(
                    mode='wb', 
                    suffix='.key', 
                    delete=False
                )
                self._temp_key_file.write(key_content)
                self._temp_key_file.flush()
                self.key_path = self._temp_key_file.name
                # Proteger a chave
                os.chmod(self.key_path, 0o600)
                logger.info(f"✅ Chave privada criada de base64: {self.key_path}")
                
        except Exception as e:
            logger.error(f"❌ Erro ao criar certificados de base64: {e}")
            self.cert_path = None
            self.key_path = None
    
    def __del__(self):
        """Limpa arquivos temporários ao destruir o objeto."""
        try:
            if self._temp_cert_file:
                os.unlink(self._temp_cert_file.name)
            if self._temp_key_file:
                os.unlink(self._temp_key_file.name)
        except Exception:
            pass

    def _get_ssl_context(self) -> Optional[ssl.SSLContext]:
        """
        Cria contexto SSL com certificado mTLS para produção.
        
        Returns:
            SSLContext configurado ou None se não houver certificados
        """
        if not self.cert_path or not self.key_path:
            logger.warning("⚠️ Certificados mTLS não configurados (BB_CERT_PATH, BB_KEY_PATH)")
            return None
            
        if not os.path.exists(self.cert_path):
            logger.error(f"❌ Certificado não encontrado: {self.cert_path}")
            return None
            
        if not os.path.exists(self.key_path):
            logger.error(f"❌ Chave privada não encontrada: {self.key_path}")
            return None
        
        try:
            ctx = ssl.create_default_context()
            ctx.load_cert_chain(certfile=self.cert_path, keyfile=self.key_path)
            logger.info("✅ Contexto SSL/mTLS configurado com sucesso")
            return ctx
        except Exception as e:
            logger.error(f"❌ Erro ao carregar certificados mTLS: {e}")
            return None

    def _get_http_client(self, timeout: float = 30.0) -> httpx.AsyncClient:
        """
        Cria cliente HTTP com ou sem mTLS dependendo do ambiente.
        
        Args:
            timeout: Timeout em segundos
            
        Returns:
            AsyncClient configurado
        """
        ssl_context = self._get_ssl_context() if self.is_production else None
        
        if self.is_production and ssl_context:
            logger.debug("🔐 Usando conexão com mTLS")
            return httpx.AsyncClient(timeout=timeout, verify=ssl_context)
        else:
            logger.debug("🔓 Usando conexão sem mTLS")
            return httpx.AsyncClient(timeout=timeout)

    def _validate_credentials(self) -> bool:
        """Valida se todas as credenciais estão configuradas."""
        missing = []
        if not self.client_id:
            missing.append("BB_CLIENT_ID")
        if not self.client_secret:
            missing.append("BB_CLIENT_SECRET")
        if not self.gw_dev_app_key:
            missing.append("BB_GW_DEV_APP_KEY")
        if not self.pix_key:
            missing.append("BB_PIX_KEY")
        
        if missing:
            logger.error(f"❌ Credenciais BB faltando: {', '.join(missing)}")
            return False
        return True

    async def get_access_token(self) -> str:
        """
        Obtém token de acesso OAuth 2.0 do Banco do Brasil.

        O token é cacheado em memória e renovado automaticamente
        5 minutos antes de expirar.

        Returns:
            str: Token de acesso válido

        Raises:
            Exception: Se não conseguir obter o token
        """
        # Valida credenciais
        if not self._validate_credentials():
            raise Exception("Credenciais do Banco do Brasil não configuradas")

        # Verifica se token ainda é válido (com margem de 5 min)
        if self._access_token and self._token_expires_at:
            if datetime.now() < self._token_expires_at - timedelta(minutes=5):
                return self._access_token

        logger.info("🔐 Solicitando novo token OAuth do Banco do Brasil...")

        # Prepara credenciais Base64
        credentials = f"{self.client_id}:{self.client_secret}"
        credentials_b64 = base64.b64encode(credentials.encode()).decode()

        try:
            async with self._get_http_client() as client:
                response = await client.post(
                    self.oauth_url,
                    headers={
                        "Authorization": f"Basic {credentials_b64}",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data={
                        "grant_type": "client_credentials",
                        "scope": "cob.write cob.read pix.read pix.write webhook.read webhook.write"
                    }
                )

            if response.status_code != 200:
                logger.error(f"❌ Erro OAuth BB [{response.status_code}]: {response.text}")
                raise Exception(f"Erro ao obter token BB: {response.status_code} - {response.text}")

            data = response.json()
            self._access_token = data["access_token"]
            
            # Calcula expiração (default 10 minutos se não informado)
            expires_in = data.get("expires_in", 600)
            self._token_expires_at = datetime.now() + timedelta(seconds=expires_in)

            logger.info(f"✅ Token BB obtido com sucesso. Expira em {expires_in}s")
            return self._access_token

        except httpx.TimeoutException:
            logger.error("❌ Timeout ao obter token do Banco do Brasil")
            raise Exception("Timeout na conexão com Banco do Brasil")
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao obter token BB: {str(e)}")
            raise

    async def criar_cobranca_pix(
        self,
        txid: str,
        valor: Decimal,
        descricao: str,
        expiracao_segundos: int = 900,  # 15 minutos padrão
        devedor_cpf: Optional[str] = None,
        devedor_nome: Optional[str] = None,
        info_adicionais: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Cria uma cobrança PIX (QR Code) via API do Banco do Brasil.

        Args:
            txid: Identificador único da transação (max 35 chars, alfanumérico sem hífen)
            valor: Valor em BRL (Decimal)
            descricao: Descrição para o pagador (max 140 chars)
            expiracao_segundos: Tempo de expiração em segundos (default 15 min)
            devedor_cpf: CPF do pagador (opcional)
            devedor_nome: Nome do pagador (opcional)
            info_adicionais: Dict com informações extras para referência

        Returns:
            Dict contendo:
            - txid: Identificador da cobrança
            - status: "ATIVA", "CONCLUIDA", etc
            - qrcode: Payload EMV copia-e-cola
            - qrcode_base64: Imagem PNG em Base64
            - location: URL da cobrança
            - valor: Valor formatado
            - criacao: Data de criação
            - expiracao: Segundos para expirar

        Raises:
            Exception: Se falhar ao criar cobrança
        """
        token = await self.get_access_token()

        # Limpa TXID (apenas alfanumérico)
        txid_clean = ''.join(c for c in txid if c.isalnum())
        
        # BB exige TXID entre 26-35 caracteres
        # Se muito curto, adiciona timestamp para completar
        if len(txid_clean) < 26:
            import time
            timestamp = str(int(time.time() * 1000))[-12:]  # Last 12 digits of timestamp
            txid_clean = txid_clean + timestamp
        
        # Trunca se necessário (max 35 chars)
        txid_clean = txid_clean[:35]

        logger.info(f"📱 Criando cobrança PIX: txid={txid_clean} ({len(txid_clean)} chars), valor=R${valor:.2f}")

        # Monta payload da cobrança
        payload = {
            "calendario": {
                "expiracao": expiracao_segundos
            },
            "valor": {
                "original": f"{valor:.2f}"
            },
            "chave": self.pix_key,
            "solicitacaoPagador": descricao[:140],  # Max 140 chars
        }

        # Adiciona dados do devedor se fornecidos
        if devedor_cpf or devedor_nome:
            payload["devedor"] = {}
            if devedor_cpf:
                # Remove formatação do CPF
                cpf_clean = ''.join(c for c in devedor_cpf if c.isdigit())
                if len(cpf_clean) == 11:
                    payload["devedor"]["cpf"] = cpf_clean
                elif len(cpf_clean) == 14:
                    payload["devedor"]["cnpj"] = cpf_clean
            if devedor_nome:
                payload["devedor"]["nome"] = devedor_nome[:200]

        # Adiciona informações adicionais se fornecidas
        if info_adicionais:
            payload["infoAdicionais"] = [
                {"nome": str(k)[:50], "valor": str(v)[:200]}
                for k, v in list(info_adicionais.items())[:10]  # Max 10 itens
            ]

        try:
            async with self._get_http_client() as client:
                response = await client.put(
                    f"{self.api_url}/cob/{txid_clean}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                        "gw-dev-app-key": self.gw_dev_app_key
                    },
                    json=payload
                )

            if response.status_code not in [200, 201]:
                error_detail = response.text
                logger.error(f"❌ Erro criando cobrança PIX [{response.status_code}]: {error_detail}")
                raise Exception(f"Erro ao criar cobrança PIX: {response.status_code} - {error_detail}")

            data = response.json()
            logger.info(f"✅ Cobrança PIX criada: {data.get('txid')}")

            location = data.get("location", "")
            
            # O pixCopiaECola pode já vir na resposta do PUT ou precisamos consultar via GET
            pix_copia_cola = data.get("pixCopiaECola", "")
            
            # Se não veio no PUT, consulta a cobrança via GET para obter o pixCopiaECola
            if not pix_copia_cola:
                logger.info(f"📋 Consultando cobrança para obter pixCopiaECola...")
                pix_copia_cola = await self._obter_pix_copia_cola(txid_clean, token)

            # Gera QR Code localmente a partir do payload EMV
            qrcode_base64 = ""
            if pix_copia_cola:
                qrcode_base64 = self._gerar_qrcode_base64(pix_copia_cola)

            result = {
                "txid": data.get("txid", txid_clean),
                "status": data.get("status", "ATIVA"),
                "location": location,
                "valor": data.get("valor", {}).get("original", f"{valor:.2f}"),
                "criacao": data.get("calendario", {}).get("criacao"),
                "expiracao": expiracao_segundos,
                "chave": self.pix_key,
                "qrcode": pix_copia_cola,  # Payload EMV para copia-e-cola
                "qrcode_base64": qrcode_base64,  # Imagem PNG em base64
            }

            return result

        except httpx.TimeoutException:
            logger.error("❌ Timeout ao criar cobrança PIX")
            raise Exception("Timeout na criação da cobrança PIX")
        except Exception as e:
            logger.error(f"❌ Erro ao criar cobrança PIX: {str(e)}")
            raise

    def _gerar_qrcode_base64(self, payload_emv: str) -> str:
        """
        Gera imagem PNG do QR Code a partir do payload EMV (copia-e-cola).
        
        Args:
            payload_emv: String do PIX copia-e-cola (payload EMV)
            
        Returns:
            String base64 da imagem PNG com prefixo data:image/png;base64,
        """
        try:
            import qrcode
            
            # Cria o QR Code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(payload_emv)
            qr.make(fit=True)
            
            # Gera imagem PNG
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Converte para base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            # Retorna apenas o base64 (sem prefixo - frontend adiciona)
            return img_base64
            
        except Exception as e:
            logger.warning(f"⚠️ Erro ao gerar QR Code base64: {str(e)}")
            return ""

    async def _obter_pix_copia_cola(self, txid: str, token: str = None) -> str:
        """
        Consulta a cobrança via GET para obter o campo pixCopiaECola.
        
        O Banco do Brasil retorna o payload EMV (copia-e-cola) no campo
        'pixCopiaECola' quando consultamos uma cobrança via GET /cob/{txid}.
        
        Args:
            txid: ID da transação
            token: Token de acesso (opcional, obtém automaticamente)
            
        Returns:
            String com payload EMV do PIX (copia-e-cola)
        """
        if not token:
            token = await self.get_access_token()
            
        try:
            async with self._get_http_client(timeout=15.0) as client:
                response = await client.get(
                    f"{self.api_url}/cob/{txid}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "gw-dev-app-key": self.gw_dev_app_key
                    }
                )
            
            if response.status_code == 200:
                data = response.json()
                pix_copia_cola = data.get("pixCopiaECola", "")
                if pix_copia_cola:
                    logger.info(f"✅ pixCopiaECola obtido para {txid}")
                return pix_copia_cola
            else:
                logger.warning(f"⚠️ Erro ao consultar cobrança: {response.status_code}")
                return ""
                
        except Exception as e:
            logger.warning(f"⚠️ Erro ao obter pixCopiaECola: {str(e)}")
            return ""

    async def _obter_qrcode(self, location: str, token: str = None) -> Dict[str, str]:
        """
        Obtém QR Code a partir da location da cobrança.

        A location retornada pelo BB é no formato:
        qrcodepix.bb.com.br/pix/v2/{uuid}
        
        Para obter o QR Code EMV, usamos o endpoint da API:
        {api_url}/loc/{id}/qrcode

        Args:
            location: URL retornada na criação da cobrança
            token: Token de acesso (opcional, obtém automaticamente)

        Returns:
            Dict com:
            - qrcode: Payload EMV para copia-e-cola
            - qrcode_base64: Imagem PNG em Base64
        """
        if not location:
            return {"qrcode": "", "qrcode_base64": ""}

        if not token:
            token = await self.get_access_token()

        try:
            # Extrai o ID da location (UUID no final da URL)
            # Formato: qrcodepix.bb.com.br/pix/v2/{uuid}
            loc_id = location.split('/')[-1]
            if not loc_id:
                logger.warning(f"⚠️ Location inválida: {location}")
                return {"qrcode": "", "qrcode_base64": ""}
            
            # Monta URL do endpoint da API
            qrcode_url = f"{self.api_url}/loc/{loc_id}/qrcode"
            
            async with self._get_http_client(timeout=15.0) as client:
                response = await client.get(
                    qrcode_url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "gw-dev-app-key": self.gw_dev_app_key
                    }
                )

            if response.status_code != 200:
                logger.warning(f"⚠️ Erro ao obter QR Code [{response.status_code}]: {response.text[:200]}")
                return {"qrcode": "", "qrcode_base64": ""}

            data = response.json()
            return {
                "qrcode": data.get("qrcode", ""),
                "qrcode_base64": data.get("imagemQrcode", "")
            }

        except Exception as e:
            logger.warning(f"⚠️ Erro ao obter QR Code: {str(e)}")
            return {"qrcode": "", "qrcode_base64": ""}

    async def consultar_cobranca(self, txid: str) -> Dict[str, Any]:
        """
        Consulta status de uma cobrança PIX.

        Args:
            txid: Identificador da cobrança

        Returns:
            Dict contendo:
            - txid: Identificador
            - status: "ATIVA", "CONCLUIDA", "REMOVIDA_PELO_USUARIO_RECEBEDOR", etc
            - valor: Informações do valor
            - pix: Lista de pagamentos recebidos (se houver)
            - calendario: Informações de prazo
        """
        token = await self.get_access_token()
        txid_clean = ''.join(c for c in txid if c.isalnum())[:35]

        logger.info(f"🔍 Consultando cobrança PIX: {txid_clean}")

        try:
            async with self._get_http_client(timeout=15.0) as client:
                response = await client.get(
                    f"{self.api_url}/cob/{txid_clean}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "gw-dev-app-key": self.gw_dev_app_key
                    }
                )

            if response.status_code == 404:
                logger.warning(f"⚠️ Cobrança não encontrada: {txid_clean}")
                return {"status": "NOT_FOUND", "txid": txid_clean}

            if response.status_code != 200:
                logger.error(f"❌ Erro consultando cobrança: {response.status_code}")
                return {"status": "ERROR", "error": response.text}

            data = response.json()
            logger.info(f"✅ Cobrança consultada: status={data.get('status')}")
            return data

        except Exception as e:
            logger.error(f"❌ Erro ao consultar cobrança: {str(e)}")
            return {"status": "ERROR", "error": str(e)}

    async def verificar_pagamento(self, txid: str) -> Dict[str, Any]:
        """
        Verifica se uma cobrança foi paga e retorna detalhes.

        Args:
            txid: Identificador da cobrança

        Returns:
            Dict com:
            - pago: True se paga, False caso contrário
            - status: Status da cobrança
            - valor_pago: Valor efetivamente pago (se houver)
            - horario_pagamento: Quando foi pago
            - end_to_end_id: ID único da transação PIX
        """
        data = await self.consultar_cobranca(txid)

        result = {
            "pago": False,
            "status": data.get("status", "UNKNOWN"),
            "txid": txid,
            "valor_pago": None,
            "horario_pagamento": None,
            "end_to_end_id": None
        }

        # Verifica status CONCLUIDA
        if data.get("status") == "CONCLUIDA":
            result["pago"] = True

        # Verifica se há PIX recebidos
        pix_list = data.get("pix", [])
        if pix_list:
            result["pago"] = True
            # Pega o primeiro pagamento (geralmente só há um)
            pix = pix_list[0]
            result["valor_pago"] = Decimal(pix.get("valor", "0"))
            result["horario_pagamento"] = pix.get("horario")
            result["end_to_end_id"] = pix.get("endToEndId")

        return result

    async def processar_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa webhook de confirmação de pagamento do Banco do Brasil.

        O BB envia webhooks quando:
        - Pagamento PIX é recebido
        - Cobrança expira
        - Status da cobrança muda

        Args:
            webhook_data: Dados recebidos no corpo do webhook

        Returns:
            Dict com:
            - success: True se processou com sucesso
            - txid: Identificador da cobrança
            - valor_recebido: Valor pago
            - horario: Momento do pagamento
            - end_to_end_id: ID único do PIX
            - pago: True se é um pagamento
        """
        logger.info(f"📩 Processando webhook BB: {json.dumps(webhook_data, default=str)[:500]}")

        try:
            pix_list = webhook_data.get("pix", [])

            if not pix_list:
                logger.info("ℹ️ Webhook sem pagamentos PIX")
                return {"success": True, "pago": False, "message": "No payments"}

            results = []
            for pix in pix_list:
                txid = pix.get("txid")
                valor = Decimal(pix.get("valor", "0"))
                horario = pix.get("horario")
                end_to_end_id = pix.get("endToEndId")

                logger.info(f"💰 Pagamento PIX recebido: txid={txid}, valor=R${valor}, e2e={end_to_end_id}")

                results.append({
                    "success": True,
                    "txid": txid,
                    "valor_recebido": float(valor),
                    "horario": horario,
                    "end_to_end_id": end_to_end_id,
                    "pago": True
                })

            # Retorna primeiro resultado (caso mais comum é 1 pagamento por webhook)
            if len(results) == 1:
                return results[0]

            return {
                "success": True,
                "pago": True,
                "payments": results,
                "total_payments": len(results)
            }

        except Exception as e:
            logger.error(f"❌ Erro processando webhook: {str(e)}")
            return {"success": False, "pago": False, "error": str(e)}

    async def configurar_webhook(self, webhook_url: str) -> Dict[str, Any]:
        """
        Configura URL de webhook para receber notificações de pagamento.

        IMPORTANTE: A URL deve ser HTTPS com certificado válido.

        Args:
            webhook_url: URL completa (ex: https://api.wolknow.com/webhooks/bb/pix)

        Returns:
            Dict com status da configuração
        """
        token = await self.get_access_token()

        logger.info(f"⚙️ Configurando webhook BB: {webhook_url}")

        try:
            async with self._get_http_client() as client:
                response = await client.put(
                    f"{self.api_url}/webhook/{self.pix_key}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                        "gw-dev-app-key": self.gw_dev_app_key
                    },
                    json={"webhookUrl": webhook_url}
                )

            if response.status_code not in [200, 201]:
                logger.error(f"❌ Erro configurando webhook: {response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }

            logger.info(f"✅ Webhook configurado com sucesso: {webhook_url}")
            return {
                "success": True,
                "webhook_url": webhook_url,
                "chave": self.pix_key
            }

        except Exception as e:
            logger.error(f"❌ Erro ao configurar webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    async def consultar_webhook(self) -> Dict[str, Any]:
        """
        Consulta configuração atual do webhook.

        Returns:
            Dict com URL do webhook configurado
        """
        token = await self.get_access_token()

        try:
            async with self._get_http_client(timeout=15.0) as client:
                response = await client.get(
                    f"{self.api_url}/webhook/{self.pix_key}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "gw-dev-app-key": self.gw_dev_app_key
                    }
                )

            if response.status_code == 404:
                return {"configured": False, "message": "Webhook não configurado"}

            if response.status_code != 200:
                return {"configured": False, "error": response.text}

            data = response.json()
            return {
                "configured": True,
                "webhook_url": data.get("webhookUrl"),
                "chave": self.pix_key
            }

        except Exception as e:
            return {"configured": False, "error": str(e)}

    async def listar_cobrancas(
        self,
        inicio: datetime,
        fim: datetime,
        status: Optional[str] = None,
        pagina: int = 0,
        itens_por_pagina: int = 100
    ) -> Dict[str, Any]:
        """
        Lista cobranças PIX em um período.

        Args:
            inicio: Data/hora inicial (timezone aware)
            fim: Data/hora final
            status: Filtrar por status (opcional)
            pagina: Número da página (começando em 0)
            itens_por_pagina: Quantidade por página (max 100)

        Returns:
            Dict com lista de cobranças e paginação
        """
        token = await self.get_access_token()

        # Formata datas para ISO8601
        inicio_iso = inicio.strftime("%Y-%m-%dT%H:%M:%SZ")
        fim_iso = fim.strftime("%Y-%m-%dT%H:%M:%SZ")

        params = {
            "inicio": inicio_iso,
            "fim": fim_iso,
            "paginacao.paginaAtual": pagina,
            "paginacao.itensPorPagina": min(itens_por_pagina, 100)
        }

        if status:
            params["status"] = status

        try:
            async with self._get_http_client() as client:
                response = await client.get(
                    f"{self.api_url}/cob",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "gw-dev-app-key": self.gw_dev_app_key
                    },
                    params=params
                )

            if response.status_code != 200:
                return {"success": False, "error": response.text}

            data = response.json()
            return {
                "success": True,
                "cobrancas": data.get("cobs", []),
                "paginacao": data.get("parametros", {}).get("paginacao", {}),
                "total": len(data.get("cobs", []))
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    # ============================================================
    # PIX PAGAMENTO (ENVIO) - API Pix v2
    # ============================================================

    async def enviar_pix(
        self,
        valor: Decimal,
        chave_pix: str,
        tipo_chave: str = "cpf",
        descricao: str = "Pagamento WOLK NOW",
        identificador: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envia PIX para uma chave PIX (pagamento).
        
        Este método usa a API PIX v2 do Banco do Brasil para realizar
        transferências via PIX para qualquer chave válida.
        
        Args:
            valor: Valor em reais a ser enviado
            chave_pix: Chave PIX do destinatário (CPF, CNPJ, email, telefone, EVP)
            tipo_chave: Tipo da chave ("cpf", "cnpj", "email", "telefone", "evp")
            descricao: Descrição do pagamento (aparece no extrato)
            identificador: Identificador único (opcional, gerado automaticamente)
            
        Returns:
            Dict com resultado da operação:
            - success: True/False
            - end_to_end_id: ID da transação (se sucesso)
            - erro: Mensagem de erro (se falha)
        """
        token = await self.get_access_token()
        
        if not token:
            return {"success": False, "error": "Falha ao obter token de autenticação"}
        
        # Gera identificador único se não fornecido
        if not identificador:
            import uuid
            identificador = f"WOLK{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"
        
        # Formata valor (2 casas decimais, string)
        valor_str = f"{float(valor):.2f}"
        
        # Monta payload para iniciar PIX
        # Endpoint: PUT /pix (para iniciar pagamento)
        payload = {
            "valor": valor_str,
            "pagador": {
                "chave": self.pix_key  # Nossa chave PIX (origem)
            },
            "favorecido": {
                "chave": chave_pix  # Chave PIX do destinatário
            },
            "descricao": descricao[:140] if descricao else "Pagamento WOLK NOW"
        }
        
        logger.info(f"📤 Iniciando envio PIX: R$ {valor_str} para {tipo_chave}: {chave_pix[:4]}***")
        
        try:
            async with self._get_http_client(timeout=60.0) as client:
                # Endpoint para iniciar PIX pagamento
                # A API do BB usa POST /pix para pagamentos
                response = await client.post(
                    f"{self.api_url}/pix",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                        "gw-dev-app-key": self.gw_dev_app_key
                    },
                    json=payload
                )
                
                logger.info(f"📥 Resposta BB PIX Pagamento: {response.status_code}")
                
                if response.status_code in [200, 201, 202]:
                    data = response.json()
                    end_to_end_id = data.get("endToEndId") or data.get("e2eId")
                    
                    logger.info(f"✅ PIX enviado com sucesso! E2E: {end_to_end_id}")
                    
                    return {
                        "success": True,
                        "end_to_end_id": end_to_end_id,
                        "valor": valor_str,
                        "chave_destino": chave_pix,
                        "status": data.get("status", "ENVIADO"),
                        "data_hora": datetime.now().isoformat(),
                        "identificador": identificador,
                        "response": data
                    }
                else:
                    error_msg = response.text
                    try:
                        error_data = response.json()
                        error_msg = error_data.get("mensagem") or error_data.get("message") or str(error_data)
                    except:
                        pass
                    
                    logger.error(f"❌ Erro ao enviar PIX: {response.status_code} - {error_msg}")
                    
                    return {
                        "success": False,
                        "error": error_msg,
                        "status_code": response.status_code,
                        "identificador": identificador
                    }
                    
        except httpx.TimeoutException:
            logger.error("❌ Timeout ao enviar PIX")
            return {"success": False, "error": "Timeout na comunicação com o Banco do Brasil"}
        except Exception as e:
            logger.error(f"❌ Exceção ao enviar PIX: {str(e)}")
            return {"success": False, "error": str(e)}

    async def consultar_pix_enviado(self, end_to_end_id: str) -> Dict[str, Any]:
        """
        Consulta status de um PIX enviado pelo end_to_end_id.
        
        Args:
            end_to_end_id: ID da transação PIX
            
        Returns:
            Dict com status da transação
        """
        token = await self.get_access_token()
        
        if not token:
            return {"success": False, "error": "Falha ao obter token"}
        
        try:
            async with self._get_http_client() as client:
                response = await client.get(
                    f"{self.api_url}/pix/{end_to_end_id}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "gw-dev-app-key": self.gw_dev_app_key
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "end_to_end_id": end_to_end_id,
                        "status": data.get("status"),
                        "valor": data.get("valor"),
                        "horario": data.get("horario"),
                        "response": data
                    }
                else:
                    return {
                        "success": False,
                        "error": response.text,
                        "status_code": response.status_code
                    }
                    
        except Exception as e:
            return {"success": False, "error": str(e)}


# ============================================================
# FUNÇÕES DE FÁBRICA E SINGLETON
# ============================================================

_bb_service_instance: Optional[BancoBrasilAPIService] = None


def get_banco_brasil_service(db: Session = None) -> BancoBrasilAPIService:
    """
    Obtém instância do serviço do Banco do Brasil.
    
    Usa padrão singleton para reutilizar conexões e token cache.
    
    Args:
        db: Sessão do banco (opcional)
    
    Returns:
        Instância do BancoBrasilAPIService
    """
    global _bb_service_instance
    if _bb_service_instance is None:
        _bb_service_instance = BancoBrasilAPIService(db)
    elif db is not None:
        _bb_service_instance.db = db
    return _bb_service_instance


def reset_banco_brasil_service():
    """Reseta instância do singleton (útil para testes)."""
    global _bb_service_instance
    _bb_service_instance = None
