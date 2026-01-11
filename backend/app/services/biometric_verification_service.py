"""
🔐 Biometric Verification Service - HOLD Wallet
================================================

Serviço integrado de verificação biométrica que combina:
- AWS Rekognition (comparação facial)
- AWS Textract (OCR de documentos)

Fluxo de verificação automática:
1. Análise do documento (OCR + extração de dados)
2. Detecção facial no documento
3. Comparação facial (documento vs selfie)
4. Liveness detection (prova de vida)
5. Validação anti-fraude

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import hashlib

from sqlalchemy.orm import Session

from app.services.aws_rekognition_service import rekognition_service
from app.services.aws_textract_service import textract_service
from app.services.s3_service import s3_service
from app.models.kyc import (
    KYCVerification, 
    KYCDocument, 
    KYCAuditLog,
    KYCStatus,
    KYCLevel,
    DocumentType
)

logger = logging.getLogger(__name__)


class BiometricVerificationService:
    """
    Serviço integrado de verificação biométrica automatizada
    """
    
    # Scores mínimos para aprovação automática
    MIN_FACE_SIMILARITY = 90.0
    MIN_OCR_CONFIDENCE = 75.0
    MIN_LIVENESS_CONFIDENCE = 90.0
    MIN_DOCUMENT_COMPLETENESS = 60.0
    
    def __init__(self, db: Session):
        self.db = db
        
    async def verify_document(
        self,
        verification_id: str,
        document: KYCDocument,
        document_image: bytes
    ) -> Dict[str, Any]:
        """
        Verifica um documento usando OCR e análise de fraude
        
        Args:
            verification_id: ID da verificação KYC
            document: Objeto KYCDocument
            document_image: Imagem do documento em bytes
            
        Returns:
            Dict com resultado da verificação
        """
        results = {
            'document_id': str(document.id),
            'document_type': document.document_type.value,
            'checks': {},
            'overall_status': 'PENDING'
        }
        
        try:
            # 1. Análise OCR do documento
            logger.info(f"Iniciando OCR do documento {document.id}")
            
            doc_type_mapping = {
                DocumentType.RG_FRONT: 'RG',
                DocumentType.RG_BACK: 'RG',
                DocumentType.CNH_FRONT: 'CNH',
                DocumentType.CNH_BACK: 'CNH',
                DocumentType.PASSPORT: 'PASSPORT',
                DocumentType.CPF: 'CPF'
            }
            
            doc_type = doc_type_mapping.get(document.document_type, 'RG')
            
            # Tentar AnalyzeID primeiro, fallback para análise genérica
            ocr_result = await textract_service.analyze_identity_document(document_image)
            
            if not ocr_result.get('success'):
                ocr_result = await textract_service.analyze_document(
                    document_image, 
                    document_type=doc_type
                )
            
            results['checks']['ocr'] = {
                'success': ocr_result.get('success', False),
                'confidence': ocr_result.get('average_confidence', 0),
                'extracted_fields': ocr_result.get('standardized_fields') or ocr_result.get('extracted_fields', {}),
                'completeness': ocr_result.get('completeness_score', 0),
                'is_valid': ocr_result.get('is_valid', False)
            }
            
            # 2. Análise de fraude
            logger.info(f"Analisando fraude no documento {document.id}")
            fraud_result = await textract_service.detect_document_fraud(document_image)
            
            results['checks']['fraud'] = {
                'success': fraud_result.get('success', False),
                'risk_score': fraud_result.get('risk_score', 0),
                'risk_level': fraud_result.get('risk_level', 'UNKNOWN'),
                'indicators': fraud_result.get('fraud_indicators', []),
                'recommendation': fraud_result.get('recommendation', 'MANUAL_REVIEW')
            }
            
            # 3. Detecção facial no documento (para frente de RG/CNH)
            if document.document_type in [DocumentType.RG_FRONT, DocumentType.CNH_FRONT, DocumentType.PASSPORT]:
                logger.info(f"Detectando face no documento {document.id}")
                face_result = await rekognition_service.detect_faces(document_image)
                
                results['checks']['face_detection'] = {
                    'success': face_result.get('face_count', 0) == 1,
                    'face_count': face_result.get('face_count', 0),
                    'quality_ok': face_result.get('quality_ok', False),
                    'issues': face_result.get('quality_issues', []),
                    'attributes': face_result.get('attributes', {})
                }
            
            # Determinar status geral
            ocr_ok = results['checks']['ocr'].get('confidence', 0) >= self.MIN_OCR_CONFIDENCE
            fraud_ok = results['checks']['fraud'].get('risk_level') == 'LOW'
            face_ok = results['checks'].get('face_detection', {}).get('success', True)
            
            if ocr_ok and fraud_ok and face_ok:
                results['overall_status'] = 'APPROVED'
            elif results['checks']['fraud'].get('risk_level') == 'HIGH':
                results['overall_status'] = 'REJECTED'
            else:
                results['overall_status'] = 'MANUAL_REVIEW'
            
            # Registrar no audit log
            await self._log_verification_step(
                verification_id=verification_id,
                step='document_verification',
                status=results['overall_status'],
                details=results
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Erro na verificação de documento: {e}")
            results['overall_status'] = 'ERROR'
            results['error'] = str(e)
            return results
            
    async def verify_selfie(
        self,
        verification_id: str,
        selfie_image: bytes,
        document_image: bytes
    ) -> Dict[str, Any]:
        """
        Verifica selfie comparando com documento
        
        Args:
            verification_id: ID da verificação KYC
            selfie_image: Imagem da selfie em bytes
            document_image: Imagem do documento com foto em bytes
            
        Returns:
            Dict com resultado da verificação
        """
        results = {
            'checks': {},
            'overall_status': 'PENDING'
        }
        
        try:
            # 1. Verificar qualidade da selfie
            logger.info("Analisando qualidade da selfie")
            selfie_quality = await rekognition_service.detect_faces(selfie_image)
            
            results['checks']['selfie_quality'] = {
                'success': selfie_quality.get('quality_ok', False),
                'face_count': selfie_quality.get('face_count', 0),
                'confidence': selfie_quality.get('confidence', 0),
                'issues': selfie_quality.get('quality_issues', []),
                'attributes': selfie_quality.get('attributes', {})
            }
            
            if not selfie_quality.get('quality_ok'):
                results['overall_status'] = 'REJECTED'
                results['message'] = '; '.join(selfie_quality.get('quality_issues', ['Qualidade insuficiente']))
                return results
            
            # 2. Comparar faces (documento vs selfie)
            logger.info("Comparando faces (documento vs selfie)")
            comparison = await rekognition_service.compare_faces(
                document_image=document_image,
                selfie_image=selfie_image
            )
            
            results['checks']['face_comparison'] = {
                'match': comparison.get('match', False),
                'similarity': comparison.get('similarity', 0),
                'confidence': comparison.get('confidence', 0),
                'decision': comparison.get('decision', 'ERROR'),
                'reason': comparison.get('reason', 'UNKNOWN')
            }
            
            # Determinar status
            if comparison.get('decision') == 'APPROVED':
                results['overall_status'] = 'APPROVED'
            elif comparison.get('decision') == 'REJECTED':
                results['overall_status'] = 'REJECTED'
            else:
                results['overall_status'] = 'MANUAL_REVIEW'
            
            results['message'] = comparison.get('message', '')
            
            # Registrar no audit log
            await self._log_verification_step(
                verification_id=verification_id,
                step='selfie_verification',
                status=results['overall_status'],
                details=results
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Erro na verificação de selfie: {e}")
            results['overall_status'] = 'ERROR'
            results['error'] = str(e)
            return results
            
    async def verify_liveness(
        self,
        verification_id: str,
        session_id: str,
        document_image: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Verifica liveness (prova de vida)
        
        Args:
            verification_id: ID da verificação KYC
            session_id: ID da sessão de liveness do Rekognition
            document_image: Imagem do documento para comparação (opcional)
            
        Returns:
            Dict com resultado da verificação
        """
        results = {
            'checks': {},
            'overall_status': 'PENDING'
        }
        
        try:
            # Obter resultado do liveness
            logger.info(f"Verificando liveness session {session_id}")
            liveness_result = await rekognition_service.detect_liveness(
                session_id=session_id,
                reference_image=document_image
            )
            
            results['checks']['liveness'] = {
                'is_live': liveness_result.get('is_live', False),
                'confidence': liveness_result.get('confidence', 0),
                'status': liveness_result.get('status', 'UNKNOWN'),
                'decision': liveness_result.get('decision', 'ERROR')
            }
            
            # Se tiver comparação facial no resultado
            if 'face_comparison' in liveness_result:
                results['checks']['face_comparison'] = liveness_result['face_comparison']
            
            # Determinar status
            if liveness_result.get('is_live') and liveness_result.get('confidence', 0) >= self.MIN_LIVENESS_CONFIDENCE:
                results['overall_status'] = 'APPROVED'
            else:
                results['overall_status'] = 'REJECTED'
            
            results['message'] = liveness_result.get('message', '')
            
            # Registrar no audit log
            await self._log_verification_step(
                verification_id=verification_id,
                step='liveness_verification',
                status=results['overall_status'],
                details=results
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Erro na verificação de liveness: {e}")
            results['overall_status'] = 'ERROR'
            results['error'] = str(e)
            return results
            
    async def run_full_verification(
        self,
        verification_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Executa verificação completa de KYC
        
        Args:
            verification_id: ID da verificação KYC
            user_id: ID do usuário
            
        Returns:
            Dict com resultado completo da verificação
        """
        results = {
            'verification_id': verification_id,
            'user_id': user_id,
            'started_at': datetime.utcnow().isoformat(),
            'steps': {},
            'overall_decision': 'PENDING',
            'recommended_level': KYCLevel.NONE.value
        }
        
        try:
            # Buscar verificação
            verification = self.db.query(KYCVerification).filter(
                KYCVerification.id == verification_id
            ).first()
            
            if not verification:
                results['overall_decision'] = 'ERROR'
                results['message'] = 'Verificação não encontrada'
                return results
            
            # Buscar documentos
            documents = self.db.query(KYCDocument).filter(
                KYCDocument.verification_id == verification_id
            ).all()
            
            if not documents:
                results['overall_decision'] = 'ERROR'
                results['message'] = 'Nenhum documento encontrado'
                return results
            
            # Separar documentos por tipo
            doc_front = None
            doc_selfie = None
            
            for doc in documents:
                if doc.document_type in [DocumentType.RG_FRONT, DocumentType.CNH_FRONT]:
                    doc_front = doc
                elif doc.document_type == DocumentType.SELFIE:
                    doc_selfie = doc
            
            # 1. Verificar documento principal
            if doc_front:
                logger.info(f"Verificando documento {doc_front.id}")
                doc_image = await s3_service.download_file(doc_front.s3_key)
                
                if doc_image:
                    doc_result = await self.verify_document(
                        verification_id=verification_id,
                        document=doc_front,
                        document_image=doc_image
                    )
                    results['steps']['document'] = doc_result
                    
                    # Salvar dados extraídos
                    extracted = doc_result.get('checks', {}).get('ocr', {}).get('extracted_fields', {})
                    if extracted:
                        results['extracted_data'] = extracted
            
            # 2. Verificar selfie
            if doc_selfie and doc_front:
                logger.info(f"Verificando selfie {doc_selfie.id}")
                selfie_image = await s3_service.download_file(doc_selfie.s3_key)
                doc_image = await s3_service.download_file(doc_front.s3_key)
                
                if selfie_image and doc_image:
                    selfie_result = await self.verify_selfie(
                        verification_id=verification_id,
                        selfie_image=selfie_image,
                        document_image=doc_image
                    )
                    results['steps']['selfie'] = selfie_result
            
            # Calcular decisão final
            doc_status = results.get('steps', {}).get('document', {}).get('overall_status', 'PENDING')
            selfie_status = results.get('steps', {}).get('selfie', {}).get('overall_status', 'PENDING')
            
            if doc_status == 'APPROVED' and selfie_status == 'APPROVED':
                results['overall_decision'] = 'APPROVED'
                results['recommended_level'] = KYCLevel.BASIC.value
                
                # Atualizar verificação
                verification.status = KYCStatus.VERIFIED
                verification.verified_at = datetime.utcnow()
                verification.current_level = KYCLevel.BASIC
                
            elif 'REJECTED' in [doc_status, selfie_status]:
                results['overall_decision'] = 'REJECTED'
                verification.status = KYCStatus.REJECTED
                
            else:
                results['overall_decision'] = 'MANUAL_REVIEW'
                verification.status = KYCStatus.PENDING_REVIEW
            
            self.db.commit()
            
            results['completed_at'] = datetime.utcnow().isoformat()
            
            # Log final
            await self._log_verification_step(
                verification_id=verification_id,
                step='full_verification_complete',
                status=results['overall_decision'],
                details={'summary': results}
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Erro na verificação completa: {e}")
            results['overall_decision'] = 'ERROR'
            results['error'] = str(e)
            return results
            
    async def create_liveness_session(self, verification_id: str) -> Dict[str, Any]:
        """
        Cria sessão de liveness para o frontend
        
        Args:
            verification_id: ID da verificação KYC
            
        Returns:
            Dict com session_id para usar no frontend
        """
        try:
            result = await rekognition_service.create_liveness_session()
            
            # Log
            await self._log_verification_step(
                verification_id=verification_id,
                step='liveness_session_created',
                status='INITIATED',
                details={'session_id': result.get('session_id')}
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Erro ao criar sessão de liveness: {e}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def _log_verification_step(
        self,
        verification_id: str,
        step: str,
        status: str,
        details: Dict[str, Any]
    ):
        """Registra passo de verificação no audit log"""
        try:
            audit_log = KYCAuditLog(
                verification_id=verification_id,
                action=f'biometric_{step}',
                performed_by='system_auto',
                details={
                    'step': step,
                    'status': status,
                    'timestamp': datetime.utcnow().isoformat(),
                    **details
                }
            )
            self.db.add(audit_log)
            self.db.commit()
        except Exception as e:
            logger.error(f"Erro ao registrar audit log: {e}")


def get_biometric_service(db: Session) -> BiometricVerificationService:
    """Factory function para criar instância do serviço"""
    return BiometricVerificationService(db)
