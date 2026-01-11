"""
🔍 AWS Rekognition Service - HOLD Wallet
=========================================

Serviço para verificação biométrica facial usando AWS Rekognition.

Funcionalidades:
- Comparação facial (documento vs selfie)
- Detecção de liveness (prova de vida)
- Detecção de qualidade da imagem
- Análise de atributos faciais

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
import boto3
from botocore.exceptions import ClientError
from typing import Optional, Dict, Any, Tuple
from decimal import Decimal
import os
import base64

logger = logging.getLogger(__name__)


class AWSRekognitionService:
    """
    Serviço de verificação biométrica facial com AWS Rekognition
    """
    
    # Thresholds de similaridade
    SIMILARITY_THRESHOLD_HIGH = 95.0  # Aprovação automática
    SIMILARITY_THRESHOLD_MEDIUM = 80.0  # Revisão manual
    SIMILARITY_THRESHOLD_LOW = 70.0  # Rejeição automática
    
    # Thresholds de qualidade
    MIN_BRIGHTNESS = 40.0
    MAX_BRIGHTNESS = 90.0
    MIN_SHARPNESS = 50.0
    MIN_CONFIDENCE = 90.0
    
    def __init__(self):
        """Inicializa o cliente AWS Rekognition"""
        self.client = boto3.client(
            'rekognition',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'sa-east-1')
        )
        self.collection_id = os.getenv('AWS_REKOGNITION_COLLECTION_ID', 'hold-faces')
        
    async def compare_faces(
        self,
        document_image: bytes,
        selfie_image: bytes
    ) -> Dict[str, Any]:
        """
        Compara o rosto do documento com a selfie
        
        Args:
            document_image: Imagem do documento em bytes
            selfie_image: Imagem da selfie em bytes
            
        Returns:
            Dict com resultado da comparação
        """
        try:
            response = self.client.compare_faces(
                SourceImage={'Bytes': document_image},
                TargetImage={'Bytes': selfie_image},
                SimilarityThreshold=self.SIMILARITY_THRESHOLD_LOW,
                QualityFilter='AUTO'
            )
            
            if not response.get('FaceMatches'):
                return {
                    'match': False,
                    'similarity': 0.0,
                    'confidence': 0.0,
                    'decision': 'REJECTED',
                    'reason': 'NO_FACE_MATCH',
                    'message': 'Não foi possível encontrar correspondência facial'
                }
            
            # Pegar a melhor correspondência
            best_match = max(response['FaceMatches'], key=lambda x: x['Similarity'])
            similarity = float(best_match['Similarity'])
            confidence = float(best_match['Face']['Confidence'])
            
            # Determinar decisão
            if similarity >= self.SIMILARITY_THRESHOLD_HIGH:
                decision = 'APPROVED'
                reason = 'HIGH_SIMILARITY'
                message = 'Verificação facial aprovada automaticamente'
            elif similarity >= self.SIMILARITY_THRESHOLD_MEDIUM:
                decision = 'MANUAL_REVIEW'
                reason = 'MEDIUM_SIMILARITY'
                message = 'Similaridade média - requer revisão manual'
            else:
                decision = 'REJECTED'
                reason = 'LOW_SIMILARITY'
                message = 'Similaridade muito baixa entre documento e selfie'
            
            # Verificar rostos não correspondentes
            unmatched_faces = len(response.get('UnmatchedFaces', []))
            
            return {
                'match': similarity >= self.SIMILARITY_THRESHOLD_MEDIUM,
                'similarity': round(similarity, 2),
                'confidence': round(confidence, 2),
                'decision': decision,
                'reason': reason,
                'message': message,
                'unmatched_faces': unmatched_faces,
                'source_bounding_box': response.get('SourceImageFace', {}).get('BoundingBox'),
                'raw_response': response
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"AWS Rekognition error: {error_code} - {e}")
            
            if error_code == 'InvalidParameterException':
                return {
                    'match': False,
                    'similarity': 0.0,
                    'confidence': 0.0,
                    'decision': 'ERROR',
                    'reason': 'INVALID_IMAGE',
                    'message': 'Imagem inválida ou sem rosto detectável'
                }
            
            raise
            
    async def detect_faces(self, image: bytes) -> Dict[str, Any]:
        """
        Detecta rostos e atributos em uma imagem
        
        Args:
            image: Imagem em bytes
            
        Returns:
            Dict com detalhes dos rostos detectados
        """
        try:
            response = self.client.detect_faces(
                Image={'Bytes': image},
                Attributes=['ALL']
            )
            
            faces = response.get('FaceDetails', [])
            
            if not faces:
                return {
                    'face_count': 0,
                    'quality_ok': False,
                    'reason': 'NO_FACE_DETECTED',
                    'message': 'Nenhum rosto detectado na imagem'
                }
            
            if len(faces) > 1:
                return {
                    'face_count': len(faces),
                    'quality_ok': False,
                    'reason': 'MULTIPLE_FACES',
                    'message': f'Detectados {len(faces)} rostos. A imagem deve conter apenas um rosto.'
                }
            
            face = faces[0]
            
            # Analisar qualidade
            quality = face.get('Quality', {})
            brightness = float(quality.get('Brightness', 0))
            sharpness = float(quality.get('Sharpness', 0))
            confidence = float(face.get('Confidence', 0))
            
            quality_issues = []
            
            if brightness < self.MIN_BRIGHTNESS:
                quality_issues.append('Imagem muito escura')
            elif brightness > self.MAX_BRIGHTNESS:
                quality_issues.append('Imagem muito clara/estourada')
                
            if sharpness < self.MIN_SHARPNESS:
                quality_issues.append('Imagem desfocada')
                
            if confidence < self.MIN_CONFIDENCE:
                quality_issues.append('Baixa confiança na detecção facial')
            
            # Verificar pose (rosto muito inclinado)
            pose = face.get('Pose', {})
            if abs(float(pose.get('Yaw', 0))) > 25:
                quality_issues.append('Rosto muito virado para o lado')
            if abs(float(pose.get('Pitch', 0))) > 25:
                quality_issues.append('Rosto muito inclinado')
            if abs(float(pose.get('Roll', 0))) > 25:
                quality_issues.append('Rosto muito rotacionado')
            
            # Verificar oclusões
            if face.get('Sunglasses', {}).get('Value', False):
                quality_issues.append('Remova os óculos de sol')
            
            # Verificar olhos abertos
            eyes_open = face.get('EyesOpen', {})
            if not eyes_open.get('Value', True) and eyes_open.get('Confidence', 0) > 80:
                quality_issues.append('Mantenha os olhos abertos')
            
            quality_ok = len(quality_issues) == 0
            
            # Extrair atributos
            age_range = face.get('AgeRange', {})
            gender = face.get('Gender', {})
            emotions = face.get('Emotions', [])
            dominant_emotion = max(emotions, key=lambda x: x['Confidence']) if emotions else None
            
            return {
                'face_count': 1,
                'quality_ok': quality_ok,
                'quality_issues': quality_issues,
                'confidence': round(confidence, 2),
                'brightness': round(brightness, 2),
                'sharpness': round(sharpness, 2),
                'bounding_box': face.get('BoundingBox'),
                'pose': {
                    'yaw': round(float(pose.get('Yaw', 0)), 2),
                    'pitch': round(float(pose.get('Pitch', 0)), 2),
                    'roll': round(float(pose.get('Roll', 0)), 2)
                },
                'attributes': {
                    'age_range': {
                        'low': age_range.get('Low'),
                        'high': age_range.get('High')
                    },
                    'gender': {
                        'value': gender.get('Value'),
                        'confidence': round(float(gender.get('Confidence', 0)), 2)
                    },
                    'dominant_emotion': {
                        'type': dominant_emotion['Type'] if dominant_emotion else None,
                        'confidence': round(float(dominant_emotion['Confidence']), 2) if dominant_emotion else 0
                    },
                    'smile': face.get('Smile', {}).get('Value', False),
                    'eyeglasses': face.get('Eyeglasses', {}).get('Value', False),
                    'sunglasses': face.get('Sunglasses', {}).get('Value', False),
                    'beard': face.get('Beard', {}).get('Value', False),
                    'mustache': face.get('Mustache', {}).get('Value', False)
                },
                'reason': 'SUCCESS' if quality_ok else 'QUALITY_ISSUES',
                'message': 'Rosto detectado com sucesso' if quality_ok else '; '.join(quality_issues)
            }
            
        except ClientError as e:
            logger.error(f"AWS Rekognition detect_faces error: {e}")
            raise
            
    async def detect_liveness(
        self,
        session_id: str,
        reference_image: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Verifica liveness (prova de vida) usando sessão do Rekognition
        
        Nota: Requer integração com Face Liveness do Rekognition no frontend
        
        Args:
            session_id: ID da sessão de liveness criada no frontend
            reference_image: Imagem de referência (opcional)
            
        Returns:
            Dict com resultado da verificação de liveness
        """
        try:
            # Obter resultados da sessão de liveness
            response = self.client.get_face_liveness_session_results(
                SessionId=session_id
            )
            
            status = response.get('Status')
            confidence = float(response.get('Confidence', 0))
            
            if status == 'SUCCEEDED':
                is_live = confidence >= 90.0
                
                result = {
                    'status': status,
                    'is_live': is_live,
                    'confidence': round(confidence, 2),
                    'decision': 'APPROVED' if is_live else 'REJECTED',
                    'reason': 'LIVENESS_CONFIRMED' if is_live else 'LOW_LIVENESS_CONFIDENCE',
                    'message': 'Prova de vida confirmada' if is_live else 'Não foi possível confirmar prova de vida'
                }
                
                # Se tiver imagem de referência, fazer comparação
                if reference_image and response.get('ReferenceImage'):
                    audit_images = response.get('AuditImages', [])
                    if audit_images:
                        liveness_image = audit_images[0].get('Bytes')
                        if liveness_image:
                            comparison = await self.compare_faces(reference_image, liveness_image)
                            result['face_comparison'] = comparison
                
                return result
            else:
                return {
                    'status': status,
                    'is_live': False,
                    'confidence': 0.0,
                    'decision': 'ERROR',
                    'reason': 'LIVENESS_FAILED',
                    'message': f'Sessão de liveness falhou: {status}'
                }
                
        except ClientError as e:
            logger.error(f"AWS Rekognition liveness error: {e}")
            raise
            
    async def create_liveness_session(self) -> Dict[str, str]:
        """
        Cria uma nova sessão de liveness detection
        
        Returns:
            Dict com session_id para usar no frontend
        """
        try:
            response = self.client.create_face_liveness_session(
                Settings={
                    'OutputConfig': {
                        'S3Bucket': os.getenv('AWS_S3_BUCKET_KYC', 'hold-kyc-documents')
                    },
                    'AuditImagesLimit': 4
                }
            )
            
            return {
                'session_id': response['SessionId'],
                'message': 'Sessão de liveness criada com sucesso'
            }
            
        except ClientError as e:
            logger.error(f"AWS Rekognition create liveness session error: {e}")
            raise
            
    async def index_face(
        self,
        user_id: str,
        image: bytes
    ) -> Dict[str, Any]:
        """
        Indexa um rosto na coleção para buscas futuras
        
        Args:
            user_id: ID do usuário
            image: Imagem com o rosto
            
        Returns:
            Dict com face_id indexado
        """
        try:
            # Garantir que a coleção existe
            await self._ensure_collection_exists()
            
            response = self.client.index_faces(
                CollectionId=self.collection_id,
                Image={'Bytes': image},
                ExternalImageId=user_id,
                MaxFaces=1,
                QualityFilter='AUTO',
                DetectionAttributes=['ALL']
            )
            
            face_records = response.get('FaceRecords', [])
            
            if not face_records:
                return {
                    'success': False,
                    'reason': 'NO_FACE_INDEXED',
                    'message': 'Nenhum rosto foi indexado'
                }
            
            face = face_records[0]['Face']
            
            return {
                'success': True,
                'face_id': face['FaceId'],
                'image_id': face['ImageId'],
                'external_image_id': face['ExternalImageId'],
                'confidence': round(float(face['Confidence']), 2),
                'bounding_box': face['BoundingBox']
            }
            
        except ClientError as e:
            logger.error(f"AWS Rekognition index_faces error: {e}")
            raise
            
    async def search_face(self, image: bytes) -> Dict[str, Any]:
        """
        Busca um rosto na coleção indexada
        
        Args:
            image: Imagem com o rosto a buscar
            
        Returns:
            Dict com resultados da busca
        """
        try:
            response = self.client.search_faces_by_image(
                CollectionId=self.collection_id,
                Image={'Bytes': image},
                MaxFaces=5,
                FaceMatchThreshold=self.SIMILARITY_THRESHOLD_LOW
            )
            
            matches = response.get('FaceMatches', [])
            
            if not matches:
                return {
                    'found': False,
                    'matches': [],
                    'message': 'Nenhuma correspondência encontrada'
                }
            
            return {
                'found': True,
                'matches': [
                    {
                        'user_id': m['Face'].get('ExternalImageId'),
                        'face_id': m['Face']['FaceId'],
                        'similarity': round(float(m['Similarity']), 2),
                        'confidence': round(float(m['Face']['Confidence']), 2)
                    }
                    for m in matches
                ],
                'message': f'{len(matches)} correspondência(s) encontrada(s)'
            }
            
        except ClientError as e:
            logger.error(f"AWS Rekognition search_faces error: {e}")
            raise
            
    async def delete_face(self, user_id: str) -> Dict[str, Any]:
        """
        Remove rostos indexados de um usuário
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Dict com resultado da remoção
        """
        try:
            # Primeiro buscar os face_ids do usuário
            response = self.client.list_faces(
                CollectionId=self.collection_id
            )
            
            face_ids_to_delete = [
                face['FaceId']
                for face in response.get('Faces', [])
                if face.get('ExternalImageId') == user_id
            ]
            
            if not face_ids_to_delete:
                return {
                    'success': True,
                    'deleted_count': 0,
                    'message': 'Nenhum rosto encontrado para remover'
                }
            
            # Deletar os rostos
            delete_response = self.client.delete_faces(
                CollectionId=self.collection_id,
                FaceIds=face_ids_to_delete
            )
            
            deleted = delete_response.get('DeletedFaces', [])
            
            return {
                'success': True,
                'deleted_count': len(deleted),
                'deleted_face_ids': deleted,
                'message': f'{len(deleted)} rosto(s) removido(s)'
            }
            
        except ClientError as e:
            logger.error(f"AWS Rekognition delete_faces error: {e}")
            raise
            
    async def _ensure_collection_exists(self):
        """Garante que a coleção de rostos existe"""
        try:
            self.client.describe_collection(CollectionId=self.collection_id)
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                self.client.create_collection(CollectionId=self.collection_id)
                logger.info(f"Coleção {self.collection_id} criada com sucesso")
            else:
                raise


# Instância singleton
rekognition_service = AWSRekognitionService()
