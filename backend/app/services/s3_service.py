"""
📁 S3 Service - Document Storage
================================
Serviço para upload e gerenciamento de documentos KYC no AWS S3.
Bucket privado com criptografia AES-256.

Author: HOLD Wallet Team
"""

import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from typing import Optional, BinaryIO
from datetime import datetime
import mimetypes
import hashlib
import logging
import os

# Carrega .env explicitamente para garantir que as variáveis estejam disponíveis
from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    """
    Serviço para gerenciamento de arquivos no AWS S3.
    Usado para armazenar documentos KYC de forma segura.
    """
    
    # Bucket e região
    BUCKET_NAME = os.getenv("AWS_S3_KYC_BUCKET", "wolknow-kyc-documents")
    REGION = os.getenv("AWS_REGION", "ams3")
    
    # Endpoint customizado (para DigitalOcean Spaces ou MinIO)
    ENDPOINT_URL = os.getenv("DO_SPACES_ENDPOINT", None)
    
    # Limites de arquivo
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    ALLOWED_MIME_TYPES = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/pdf",
    ]
    
    def __init__(self):
        """Inicializa o cliente S3"""
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Configura o cliente boto3 para S3"""
        try:
            # Verifica se há credenciais configuradas
            aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
            aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
            
            # Se não houver credenciais, usar modo local
            if not aws_access_key or not aws_secret_key:
                logger.warning("⚠️ AWS credentials not configured. Using local file storage.")
                self.client = None
                return
            
            # Configuração com retry
            config = Config(
                region_name=self.REGION,
                retries={
                    'max_attempts': 3,
                    'mode': 'adaptive'
                },
                connect_timeout=5,
                read_timeout=30
            )
            
            # Credenciais do ambiente ou IAM Role
            # Suporta AWS S3 e DigitalOcean Spaces
            client_params = {
                'config': config,
                'aws_access_key_id': aws_access_key,
                'aws_secret_access_key': aws_secret_key,
            }
            
            # Se tiver endpoint customizado (DigitalOcean Spaces)
            if self.ENDPOINT_URL:
                client_params['endpoint_url'] = self.ENDPOINT_URL
            
            self.client = boto3.client('s3', **client_params)
            
            logger.info(f"✅ S3 client initialized for bucket: {self.BUCKET_NAME}")
        except Exception as e:
            logger.warning(f"⚠️ S3 client initialization failed: {e}. File operations will use local storage.")
            self.client = None
    
    def _get_s3_path(self, user_id: str, verification_id: str, filename: str) -> str:
        """
        Gera o caminho no S3 seguindo a estrutura:
        {user_id}/{verification_id}/{filename}
        """
        return f"{user_id}/{verification_id}/{filename}"
    
    async def upload_file(
        self,
        file: BinaryIO,
        user_id: str,
        verification_id: str,
        document_type: str,
        original_filename: str
    ) -> dict:
        """
        Faz upload de um arquivo para o S3.
        
        Args:
            file: Arquivo binário para upload
            user_id: ID do usuário
            verification_id: ID da verificação KYC
            document_type: Tipo do documento (identity_front, selfie, etc)
            original_filename: Nome original do arquivo
            
        Returns:
            dict com file_path, file_hash, file_size, mime_type
        """
        # Lê o conteúdo do arquivo
        file_content = file.read()
        file_size = len(file_content)
        
        # Validação de tamanho
        if file_size > self.MAX_FILE_SIZE:
            raise ValueError(f"Arquivo muito grande. Máximo permitido: {self.MAX_FILE_SIZE / 1024 / 1024:.1f} MB")
        
        if file_size == 0:
            raise ValueError("Arquivo vazio")
        
        # Detecta o MIME type
        mime_type, _ = mimetypes.guess_type(original_filename)
        if not mime_type:
            # Tenta detectar pelo conteúdo
            mime_type = self._detect_mime_type(file_content)
        
        # Validação de tipo
        if mime_type not in self.ALLOWED_MIME_TYPES:
            raise ValueError(f"Tipo de arquivo não permitido: {mime_type}. Permitidos: {', '.join(self.ALLOWED_MIME_TYPES)}")
        
        # Gera hash SHA-256
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        # Gera extensão baseada no MIME type
        extension = self._get_extension(mime_type)
        
        # Nome do arquivo no S3: {document_type}_{timestamp}.{ext}
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        s3_filename = f"{document_type}_{timestamp}{extension}"
        
        # Caminho completo no S3
        s3_path = self._get_s3_path(user_id, verification_id, s3_filename)
        
        if self.client:
            try:
                # Upload para o S3
                self.client.put_object(
                    Bucket=self.BUCKET_NAME,
                    Key=s3_path,
                    Body=file_content,
                    ContentType=mime_type,
                    ServerSideEncryption='AES256',  # Criptografia no servidor
                    Metadata={
                        'original_filename': original_filename,
                        'document_type': document_type,
                        'user_id': user_id,
                        'verification_id': verification_id,
                        'file_hash': file_hash,
                    }
                )
                
                logger.info(f"✅ File uploaded to S3: {s3_path}")
                
            except ClientError as e:
                logger.error(f"❌ S3 upload error: {e}")
                raise ValueError(f"Erro ao fazer upload do arquivo: {e}")
        else:
            # Modo simulado (desenvolvimento sem AWS)
            logger.warning(f"⚠️ S3 not configured. Simulating upload: {s3_path}")
            
            # Salva localmente para desenvolvimento
            local_path = os.path.join("uploads", "kyc", user_id, verification_id)
            os.makedirs(local_path, exist_ok=True)
            
            with open(os.path.join(local_path, s3_filename), 'wb') as f:
                f.write(file_content)
        
        return {
            "file_path": s3_path,
            "file_hash": file_hash,
            "file_size": file_size,
            "mime_type": mime_type,
            "original_name": original_filename,
        }
    
    async def delete_file(self, file_path: str) -> bool:
        """
        Remove um arquivo do S3.
        
        Args:
            file_path: Caminho do arquivo no S3
            
        Returns:
            True se deletado com sucesso
        """
        if not self.client:
            logger.warning(f"⚠️ S3 not configured. Simulating delete: {file_path}")
            return True
        
        try:
            self.client.delete_object(
                Bucket=self.BUCKET_NAME,
                Key=file_path
            )
            logger.info(f"✅ File deleted from S3: {file_path}")
            return True
        except ClientError as e:
            logger.error(f"❌ S3 delete error: {e}")
            return False
    
    async def download_file(self, file_path: str) -> Optional[bytes]:
        """
        Baixa um arquivo do S3.
        
        Args:
            file_path: Caminho do arquivo no S3
            
        Returns:
            Conteúdo do arquivo em bytes ou None se não encontrado
        """
        if not self.client:
            # Modo desenvolvimento - tenta ler local
            local_file = os.path.join("uploads", "kyc", file_path)
            if os.path.exists(local_file):
                with open(local_file, 'rb') as f:
                    return f.read()
            logger.warning(f"⚠️ S3 not configured and local file not found: {file_path}")
            return None
        
        try:
            response = self.client.get_object(
                Bucket=self.BUCKET_NAME,
                Key=file_path
            )
            content = response['Body'].read()
            logger.info(f"✅ File downloaded from S3: {file_path}")
            return content
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"⚠️ File not found in S3: {file_path}")
                return None
            logger.error(f"❌ S3 download error: {e}")
            return None
    
    async def get_presigned_url(
        self,
        file_path: str,
        expires_in: int = 3600,
        response_content_type: Optional[str] = None
    ) -> str:
        """
        Gera uma URL pré-assinada para acesso temporário ao arquivo.
        
        Args:
            file_path: Caminho do arquivo no S3
            expires_in: Tempo de expiração em segundos (padrão: 1 hora)
            response_content_type: Content-Type para a resposta
            
        Returns:
            URL pré-assinada
        """
        if not self.client:
            # Modo desenvolvimento - retorna URL local
            local_url = f"/uploads/kyc/{file_path}"
            logger.warning(f"⚠️ S3 not configured. Returning local URL: {local_url}")
            return local_url
        
        try:
            params = {
                'Bucket': self.BUCKET_NAME,
                'Key': file_path,
            }
            
            if response_content_type:
                params['ResponseContentType'] = response_content_type
            
            url = self.client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
            logger.info(f"✅ Presigned URL generated for: {file_path}")
            return url
            
        except ClientError as e:
            logger.error(f"❌ Error generating presigned URL: {e}")
            raise ValueError(f"Erro ao gerar URL do documento: {e}")
    
    async def file_exists(self, file_path: str) -> bool:
        """
        Verifica se um arquivo existe no S3.
        
        Args:
            file_path: Caminho do arquivo no S3
            
        Returns:
            True se existe
        """
        if not self.client:
            local_path = os.path.join("uploads", "kyc", file_path)
            return os.path.exists(local_path)
        
        try:
            self.client.head_object(Bucket=self.BUCKET_NAME, Key=file_path)
            return True
        except ClientError:
            return False
    
    def _detect_mime_type(self, content: bytes) -> str:
        """Detecta o MIME type pelo magic number do arquivo"""
        # Magic numbers comuns
        if content[:3] == b'\xff\xd8\xff':
            return 'image/jpeg'
        elif content[:8] == b'\x89PNG\r\n\x1a\n':
            return 'image/png'
        elif content[:4] == b'RIFF' and content[8:12] == b'WEBP':
            return 'image/webp'
        elif content[:4] == b'%PDF':
            return 'application/pdf'
        else:
            return 'application/octet-stream'
    
    def _get_extension(self, mime_type: str) -> str:
        """Retorna a extensão apropriada para o MIME type"""
        extensions = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'application/pdf': '.pdf',
        }
        return extensions.get(mime_type, '.bin')
    
    async def get_file_content(self, file_path: str) -> bytes:
        """
        Obtém o conteúdo de um arquivo do S3.
        
        Args:
            file_path: Caminho do arquivo no S3
            
        Returns:
            Conteúdo do arquivo em bytes
        """
        if not self.client:
            # Modo desenvolvimento - lê do local
            local_path = os.path.join("uploads", "kyc", file_path)
            if os.path.exists(local_path):
                with open(local_path, 'rb') as f:
                    return f.read()
            raise ValueError("Arquivo não encontrado")
        
        try:
            response = self.client.get_object(
                Bucket=self.BUCKET_NAME,
                Key=file_path
            )
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"❌ Error reading file from S3: {e}")
            raise ValueError(f"Erro ao ler arquivo: {e}")


# Instância global do serviço
s3_service = S3Service()
