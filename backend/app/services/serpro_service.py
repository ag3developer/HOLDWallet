"""
🏛️ SERPRO Service - CPF Validation
===================================

Serviço para validação de CPF em tempo real usando APIs do SERPRO/BigData.

APIs suportadas:
- SERPRO Datavalid (oficial do governo)
- BigDataCorp (alternativa privada)
- Receita Federal (consulta básica)

Funcionalidades:
- Validação de CPF em tempo real
- Consulta de situação cadastral
- Verificação de nome associado ao CPF
- Detecção de CPF irregular/suspenso

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
import httpx
from typing import Dict, Any, Optional
import re
import os
from datetime import datetime, timezone
from enum import Enum

logger = logging.getLogger(__name__)


class CPFStatus(str, Enum):
    """Status do CPF na Receita Federal"""
    REGULAR = "regular"
    SUSPENDED = "suspended"  # Suspenso
    CANCELED = "canceled"    # Cancelado
    DECEASED = "deceased"    # Titular falecido
    PENDING = "pending"      # Pendente de regularização
    NULL = "null"           # Nulo
    UNKNOWN = "unknown"      # Não encontrado


class SerproService:
    """
    Serviço de validação de CPF via SERPRO Datavalid e alternativas.
    """
    
    # URLs das APIs
    SERPRO_BASE_URL = os.getenv("SERPRO_API_URL", "https://gateway.apiserpro.serpro.gov.br")
    BIGDATA_BASE_URL = os.getenv("BIGDATA_API_URL", "https://api.bigdatacorp.com.br")
    
    # Timeout para requisições
    REQUEST_TIMEOUT = 10.0
    
    def __init__(self):
        """Inicializa credenciais das APIs"""
        # SERPRO
        self.serpro_client_id = os.getenv("SERPRO_CLIENT_ID")
        self.serpro_client_secret = os.getenv("SERPRO_CLIENT_SECRET")
        self.serpro_token = None
        self.serpro_token_expires = None
        
        # BigDataCorp (alternativa)
        self.bigdata_token = os.getenv("BIGDATA_API_TOKEN")
        
        # Cliente HTTP
        self.http_client = httpx.AsyncClient(timeout=self.REQUEST_TIMEOUT)
        
    async def validate_cpf(
        self,
        cpf: str,
        name: Optional[str] = None,
        birth_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Valida CPF em tempo real.
        
        Tenta na ordem:
        1. SERPRO Datavalid (se configurado)
        2. BigDataCorp (se configurado)
        3. Validação local (fallback)
        
        Args:
            cpf: Número do CPF (com ou sem formatação)
            name: Nome para validação cruzada (opcional)
            birth_date: Data de nascimento YYYY-MM-DD (opcional)
            
        Returns:
            Dict com resultado da validação
        """
        # Limpa o CPF
        cpf_clean = self._clean_cpf(cpf)
        
        # Validação local primeiro
        if not self._validate_cpf_locally(cpf_clean):
            return {
                'valid': False,
                'cpf': self._format_cpf(cpf_clean),
                'status': CPFStatus.NULL.value,
                'reason': 'CPF inválido (dígitos verificadores incorretos)',
                'source': 'local_validation'
            }
        
        # Tenta SERPRO
        if self.serpro_client_id and self.serpro_client_secret:
            try:
                result = await self._validate_serpro(cpf_clean, name, birth_date)
                if result.get('success'):
                    return result
            except Exception as e:
                logger.warning(f"SERPRO validation failed: {e}")
        
        # Tenta BigDataCorp
        if self.bigdata_token:
            try:
                result = await self._validate_bigdata(cpf_clean, name, birth_date)
                if result.get('success'):
                    return result
            except Exception as e:
                logger.warning(f"BigData validation failed: {e}")
        
        # Fallback: apenas validação local
        return {
            'valid': True,
            'cpf': self._format_cpf(cpf_clean),
            'status': CPFStatus.UNKNOWN.value,
            'reason': 'CPF válido localmente (APIs externas indisponíveis)',
            'source': 'local_validation',
            'name_match': None,
            'birth_date_match': None
        }
        
    async def _get_serpro_token(self) -> Optional[str]:
        """Obtém token de acesso do SERPRO via OAuth2"""
        # Verifica se token ainda é válido
        if self.serpro_token and self.serpro_token_expires:
            if datetime.now(timezone.utc) < self.serpro_token_expires:
                return self.serpro_token
        
        try:
            response = await self.http_client.post(
                f"{self.SERPRO_BASE_URL}/token",
                data={
                    'grant_type': 'client_credentials'
                },
                auth=(self.serpro_client_id, self.serpro_client_secret),
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.serpro_token = data.get('access_token')
                expires_in = data.get('expires_in', 3600)
                self.serpro_token_expires = datetime.now(timezone.utc).replace(
                    second=datetime.now(timezone.utc).second + expires_in - 60
                )
                return self.serpro_token
            else:
                logger.error(f"SERPRO token error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"SERPRO token error: {e}")
            return None
            
    async def _validate_serpro(
        self,
        cpf: str,
        name: Optional[str] = None,
        birth_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Valida CPF via SERPRO Datavalid.
        
        API oficial do governo para validação de dados cadastrais.
        """
        token = await self._get_serpro_token()
        if not token:
            return {'success': False, 'error': 'Token SERPRO não disponível'}
        
        try:
            # Monta payload
            payload = {
                'key': {
                    'cpf': cpf
                }
            }
            
            # Adiciona dados para validação cruzada
            answer = {}
            if name:
                answer['nome'] = name.upper()
            if birth_date:
                # Converte para formato DD/MM/YYYY
                dt = datetime.strptime(birth_date, '%Y-%m-%d')
                answer['data_nascimento'] = dt.strftime('%d/%m/%Y')
            
            if answer:
                payload['answer'] = answer
            
            # Chama API Datavalid
            response = await self.http_client.post(
                f"{self.SERPRO_BASE_URL}/datavalid/vbeta1/validate/pf-facial",
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Interpreta resposta
                cpf_available = data.get('cpf_disponivel', False)
                name_match = data.get('nome_similaridade', 0) >= 0.8 if name else None
                birth_match = data.get('data_nascimento', False) if birth_date else None
                situation = data.get('situacao_cpf', {})
                
                # Mapeia situação
                status_code = situation.get('codigo', '0')
                status_map = {
                    '0': CPFStatus.REGULAR,
                    '2': CPFStatus.SUSPENDED,
                    '3': CPFStatus.DECEASED,
                    '4': CPFStatus.PENDING,
                    '5': CPFStatus.CANCELED,
                    '9': CPFStatus.NULL
                }
                status = status_map.get(status_code, CPFStatus.UNKNOWN)
                
                return {
                    'success': True,
                    'valid': cpf_available and status == CPFStatus.REGULAR,
                    'cpf': self._format_cpf(cpf),
                    'status': status.value,
                    'status_description': situation.get('descricao', ''),
                    'name_match': name_match,
                    'name_similarity': data.get('nome_similaridade'),
                    'birth_date_match': birth_match,
                    'source': 'serpro_datavalid',
                    'raw_response': data
                }
                
            elif response.status_code == 400:
                return {
                    'success': True,
                    'valid': False,
                    'cpf': self._format_cpf(cpf),
                    'status': CPFStatus.NULL.value,
                    'reason': 'CPF não encontrado na base da Receita Federal',
                    'source': 'serpro_datavalid'
                }
            else:
                logger.error(f"SERPRO API error: {response.status_code} - {response.text}")
                return {'success': False, 'error': f'Erro SERPRO: {response.status_code}'}
                
        except Exception as e:
            logger.error(f"SERPRO validation error: {e}")
            return {'success': False, 'error': str(e)}
            
    async def _validate_bigdata(
        self,
        cpf: str,
        name: Optional[str] = None,
        birth_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Valida CPF via BigDataCorp (alternativa privada).
        
        Oferece dados enriquecidos além da validação.
        """
        try:
            # Monta request
            payload = {
                'Datasets': 'basic_data',
                'q': f'doc{{{cpf}}}'
            }
            
            response = await self.http_client.get(
                f"{self.BIGDATA_BASE_URL}/pessoas",
                params=payload,
                headers={
                    'Authorization': f'Bearer {self.bigdata_token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extrai dados
                result = data.get('Result', [{}])[0] if data.get('Result') else {}
                basic_data = result.get('BasicData', {})
                
                # Nome cadastrado
                registered_name = basic_data.get('Name', '')
                
                # Valida nome se fornecido
                name_match = None
                if name and registered_name:
                    name_match = self._compare_names(name, registered_name)
                
                # Valida data de nascimento se fornecida
                birth_match = None
                if birth_date and basic_data.get('BirthDate'):
                    registered_birth = basic_data.get('BirthDate', '')[:10]
                    birth_match = birth_date == registered_birth
                
                # Status
                tax_status = basic_data.get('TaxIdStatus', '')
                status_map = {
                    'Regular': CPFStatus.REGULAR,
                    'Suspensa': CPFStatus.SUSPENDED,
                    'Cancelada': CPFStatus.CANCELED,
                    'Titular Falecido': CPFStatus.DECEASED,
                    'Pendente de Regularização': CPFStatus.PENDING,
                    'Nula': CPFStatus.NULL
                }
                status = status_map.get(tax_status, CPFStatus.UNKNOWN)
                
                return {
                    'success': True,
                    'valid': status == CPFStatus.REGULAR,
                    'cpf': self._format_cpf(cpf),
                    'status': status.value,
                    'status_description': tax_status,
                    'registered_name': registered_name,
                    'name_match': name_match,
                    'birth_date_match': birth_match,
                    'source': 'bigdatacorp',
                    'enriched_data': {
                        'gender': basic_data.get('Gender'),
                        'age': basic_data.get('Age'),
                        'mother_name': basic_data.get('MotherName'),
                        'has_obit_indication': basic_data.get('HasObitIndication', False)
                    }
                }
                
            else:
                logger.error(f"BigData API error: {response.status_code}")
                return {'success': False, 'error': f'Erro BigData: {response.status_code}'}
                
        except Exception as e:
            logger.error(f"BigData validation error: {e}")
            return {'success': False, 'error': str(e)}
            
    def _clean_cpf(self, cpf: str) -> str:
        """Remove formatação do CPF"""
        return re.sub(r'[^\d]', '', cpf)
        
    def _format_cpf(self, cpf: str) -> str:
        """Formata CPF no padrão XXX.XXX.XXX-XX"""
        cpf = self._clean_cpf(cpf)
        if len(cpf) == 11:
            return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
        return cpf
        
    def _validate_cpf_locally(self, cpf: str) -> bool:
        """
        Valida CPF usando algoritmo de dígitos verificadores.
        
        Não consulta APIs externas, apenas valida a estrutura matemática.
        """
        cpf = self._clean_cpf(cpf)
        
        if len(cpf) != 11:
            return False
        
        # CPFs inválidos conhecidos
        if cpf in [str(i) * 11 for i in range(10)]:
            return False
        
        # Validar dígitos verificadores
        def calc_digit(cpf_part, weights):
            total = sum(int(d) * w for d, w in zip(cpf_part, weights))
            remainder = total % 11
            return '0' if remainder < 2 else str(11 - remainder)
        
        # Primeiro dígito
        weights1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
        digit1 = calc_digit(cpf[:9], weights1)
        
        # Segundo dígito
        weights2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
        digit2 = calc_digit(cpf[:9] + digit1, weights2)
        
        return cpf[-2:] == digit1 + digit2
        
    def _compare_names(self, name1: str, name2: str) -> bool:
        """
        Compara dois nomes considerando variações comuns.
        
        Retorna True se os nomes são suficientemente similares.
        """
        # Normaliza
        def normalize(name):
            name = name.upper().strip()
            # Remove acentos
            replacements = {
                'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A',
                'É': 'E', 'È': 'E', 'Ê': 'E',
                'Í': 'I', 'Ì': 'I', 'Î': 'I',
                'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O',
                'Ú': 'U', 'Ù': 'U', 'Û': 'U',
                'Ç': 'C'
            }
            for old, new in replacements.items():
                name = name.replace(old, new)
            return name
        
        n1 = normalize(name1)
        n2 = normalize(name2)
        
        # Comparação exata
        if n1 == n2:
            return True
        
        # Compara primeiro e último nome
        parts1 = n1.split()
        parts2 = n2.split()
        
        if len(parts1) >= 2 and len(parts2) >= 2:
            # Primeiro nome igual e último nome igual
            if parts1[0] == parts2[0] and parts1[-1] == parts2[-1]:
                return True
        
        # Calcula similaridade (Jaccard)
        set1 = set(parts1)
        set2 = set(parts2)
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        
        similarity = intersection / union if union > 0 else 0
        
        return similarity >= 0.7
        
    async def get_cpf_situation(self, cpf: str) -> Dict[str, Any]:
        """
        Consulta apenas a situação cadastral do CPF (mais barato).
        
        Args:
            cpf: Número do CPF
            
        Returns:
            Dict com situação cadastral
        """
        cpf_clean = self._clean_cpf(cpf)
        
        if not self._validate_cpf_locally(cpf_clean):
            return {
                'valid': False,
                'cpf': self._format_cpf(cpf_clean),
                'status': CPFStatus.NULL.value,
                'reason': 'CPF inválido'
            }
        
        # Tenta consulta simplificada
        if self.serpro_client_id:
            token = await self._get_serpro_token()
            if token:
                try:
                    response = await self.http_client.get(
                        f"{self.SERPRO_BASE_URL}/consulta-cpf/v1/cpf/{cpf_clean}",
                        headers={
                            'Authorization': f'Bearer {token}'
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        return {
                            'valid': True,
                            'cpf': self._format_cpf(cpf_clean),
                            'name': data.get('nome', ''),
                            'status': CPFStatus.REGULAR.value if data.get('situacao', {}).get('codigo') == '0' else CPFStatus.SUSPENDED.value,
                            'status_description': data.get('situacao', {}).get('descricao', ''),
                            'source': 'serpro'
                        }
                except Exception as e:
                    logger.warning(f"SERPRO situation query failed: {e}")
        
        return {
            'valid': True,
            'cpf': self._format_cpf(cpf_clean),
            'status': CPFStatus.UNKNOWN.value,
            'reason': 'Situação não verificada (API indisponível)',
            'source': 'local'
        }
        
    async def validate_cpf_with_face(
        self,
        cpf: str,
        face_image: bytes,
        name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Valida CPF com verificação facial (SERPRO Datavalid Facial).
        
        Compara a selfie com a foto do CPF na base da Receita Federal.
        
        Args:
            cpf: Número do CPF
            face_image: Imagem facial em bytes (base64)
            name: Nome para validação cruzada
            
        Returns:
            Dict com resultado da validação facial
        """
        import base64
        
        cpf_clean = self._clean_cpf(cpf)
        
        if not self._validate_cpf_locally(cpf_clean):
            return {
                'valid': False,
                'face_match': False,
                'reason': 'CPF inválido'
            }
        
        if not self.serpro_client_id:
            return {
                'valid': None,
                'face_match': None,
                'reason': 'SERPRO não configurado'
            }
        
        token = await self._get_serpro_token()
        if not token:
            return {
                'valid': None,
                'face_match': None,
                'reason': 'Token SERPRO indisponível'
            }
        
        try:
            # Converte imagem para base64
            face_b64 = base64.b64encode(face_image).decode('utf-8')
            
            payload = {
                'key': {
                    'cpf': cpf_clean
                },
                'answer': {
                    'biometria_face': face_b64
                }
            }
            
            if name:
                payload['answer']['nome'] = name.upper()
            
            response = await self.http_client.post(
                f"{self.SERPRO_BASE_URL}/datavalid/vbeta1/validate/pf-facial",
                json=payload,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                face_match = data.get('biometria_face', False)
                face_similarity = data.get('biometria_face_similaridade', 0)
                
                return {
                    'success': True,
                    'valid': data.get('cpf_disponivel', False),
                    'face_match': face_match,
                    'face_similarity': face_similarity,
                    'name_match': data.get('nome_similaridade', 0) >= 0.8 if name else None,
                    'cpf': self._format_cpf(cpf_clean),
                    'source': 'serpro_datavalid_facial'
                }
            else:
                return {
                    'success': False,
                    'valid': None,
                    'face_match': None,
                    'reason': f'Erro SERPRO: {response.status_code}'
                }
                
        except Exception as e:
            logger.error(f"SERPRO facial validation error: {e}")
            return {
                'success': False,
                'valid': None,
                'face_match': None,
                'reason': str(e)
            }
            
    async def close(self):
        """Fecha cliente HTTP"""
        await self.http_client.aclose()


# Instância singleton
serpro_service = SerproService()
