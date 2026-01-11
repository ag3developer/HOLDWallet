"""
📄 AWS Textract Service - HOLD Wallet
=====================================

Serviço para OCR e extração de dados de documentos usando AWS Textract.

Funcionalidades:
- OCR de documentos (RG, CNH, Passaporte)
- Extração estruturada de dados
- Validação de documentos
- Detecção de adulteração

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
import boto3
from botocore.exceptions import ClientError
from typing import Optional, Dict, Any, List
import re
import os
from datetime import datetime

logger = logging.getLogger(__name__)


class AWSTextractService:
    """
    Serviço de OCR e extração de dados de documentos com AWS Textract
    """
    
    # Padrões de regex para validação
    CPF_PATTERN = r'\d{3}\.?\d{3}\.?\d{3}-?\d{2}'
    RG_PATTERN = r'\d{1,2}\.?\d{3}\.?\d{3}-?[0-9Xx]?'
    DATE_PATTERNS = [
        r'\d{2}/\d{2}/\d{4}',
        r'\d{2}-\d{2}-\d{4}',
        r'\d{2}\.\d{2}\.\d{4}'
    ]
    CNH_PATTERN = r'\d{11}'
    
    # Campos esperados por tipo de documento
    DOCUMENT_FIELDS = {
        'RG': ['nome', 'rg', 'cpf', 'data_nascimento', 'filiacao', 'naturalidade'],
        'CNH': ['nome', 'cpf', 'rg', 'data_nascimento', 'validade', 'categoria', 'registro'],
        'PASSPORT': ['nome', 'numero', 'nacionalidade', 'data_nascimento', 'validade'],
        'CPF': ['nome', 'cpf', 'data_nascimento']
    }
    
    def __init__(self):
        """Inicializa o cliente AWS Textract"""
        self.client = boto3.client(
            'textract',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'sa-east-1')
        )
        
    async def extract_document_text(self, image: bytes) -> Dict[str, Any]:
        """
        Extrai texto de um documento usando OCR
        
        Args:
            image: Imagem do documento em bytes
            
        Returns:
            Dict com texto extraído e blocos de texto
        """
        try:
            response = self.client.detect_document_text(
                Document={'Bytes': image}
            )
            
            blocks = response.get('Blocks', [])
            
            # Extrair linhas de texto
            lines = []
            words = []
            
            for block in blocks:
                if block['BlockType'] == 'LINE':
                    lines.append({
                        'text': block['Text'],
                        'confidence': round(float(block['Confidence']), 2),
                        'geometry': block.get('Geometry', {}).get('BoundingBox', {})
                    })
                elif block['BlockType'] == 'WORD':
                    words.append({
                        'text': block['Text'],
                        'confidence': round(float(block['Confidence']), 2)
                    })
            
            # Texto completo
            full_text = '\n'.join([line['text'] for line in lines])
            
            # Calcular confiança média
            avg_confidence = sum(l['confidence'] for l in lines) / len(lines) if lines else 0
            
            return {
                'success': True,
                'full_text': full_text,
                'lines': lines,
                'words': words,
                'line_count': len(lines),
                'word_count': len(words),
                'average_confidence': round(avg_confidence, 2),
                'quality_ok': avg_confidence >= 80.0
            }
            
        except ClientError as e:
            logger.error(f"AWS Textract error: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Erro ao extrair texto do documento'
            }
            
    async def analyze_document(
        self,
        image: bytes,
        document_type: str = 'RG'
    ) -> Dict[str, Any]:
        """
        Analisa documento e extrai campos estruturados
        
        Args:
            image: Imagem do documento em bytes
            document_type: Tipo do documento (RG, CNH, PASSPORT, CPF)
            
        Returns:
            Dict com campos extraídos e validação
        """
        try:
            # Primeiro extrair todo o texto
            text_result = await self.extract_document_text(image)
            
            if not text_result.get('success'):
                return text_result
            
            full_text = text_result['full_text'].upper()
            
            # Extrair campos específicos
            extracted_fields = {}
            validation_issues = []
            
            # CPF
            cpf_match = re.search(self.CPF_PATTERN, full_text)
            if cpf_match:
                cpf = re.sub(r'[^\d]', '', cpf_match.group())
                if self._validate_cpf(cpf):
                    extracted_fields['cpf'] = self._format_cpf(cpf)
                else:
                    validation_issues.append('CPF inválido detectado')
            else:
                if document_type in ['RG', 'CNH', 'CPF']:
                    validation_issues.append('CPF não encontrado no documento')
            
            # RG
            if document_type in ['RG', 'CNH']:
                rg_match = re.search(self.RG_PATTERN, full_text)
                if rg_match:
                    extracted_fields['rg'] = rg_match.group()
            
            # Datas
            for pattern in self.DATE_PATTERNS:
                dates = re.findall(pattern, full_text)
                if dates:
                    # Primeira data geralmente é nascimento, última é validade
                    if 'data_nascimento' not in extracted_fields:
                        extracted_fields['data_nascimento'] = dates[0]
                    if len(dates) > 1 and document_type in ['CNH', 'PASSPORT']:
                        extracted_fields['validade'] = dates[-1]
            
            # CNH específico
            if document_type == 'CNH':
                cnh_match = re.search(self.CNH_PATTERN, full_text)
                if cnh_match:
                    extracted_fields['registro'] = cnh_match.group()
                
                # Categoria
                cat_match = re.search(r'CAT[:\s]*([A-E]+)', full_text)
                if cat_match:
                    extracted_fields['categoria'] = cat_match.group(1)
            
            # Nome (heurística: linha mais longa em CAPS sem números)
            lines_text = [l['text'] for l in text_result['lines']]
            name_candidates = [
                line for line in lines_text
                if len(line) > 10 
                and not re.search(r'\d', line)
                and line.isupper()
            ]
            if name_candidates:
                # Pegar a mais longa como nome
                extracted_fields['nome'] = max(name_candidates, key=len)
            
            # Detectar tipo de documento
            detected_type = self._detect_document_type(full_text)
            
            # Verificar se tipo detectado corresponde ao esperado
            if detected_type and detected_type != document_type:
                validation_issues.append(
                    f'Tipo de documento detectado ({detected_type}) diferente do esperado ({document_type})'
                )
            
            # Calcular score de completude
            expected_fields = self.DOCUMENT_FIELDS.get(document_type, [])
            found_fields = [f for f in expected_fields if f in extracted_fields]
            completeness_score = len(found_fields) / len(expected_fields) * 100 if expected_fields else 0
            
            return {
                'success': True,
                'document_type_expected': document_type,
                'document_type_detected': detected_type,
                'extracted_fields': extracted_fields,
                'validation_issues': validation_issues,
                'completeness_score': round(completeness_score, 2),
                'is_complete': completeness_score >= 60,
                'is_valid': len(validation_issues) == 0 and completeness_score >= 60,
                'average_confidence': text_result['average_confidence'],
                'raw_text': full_text[:500]  # Primeiros 500 chars para debug
            }
            
        except Exception as e:
            logger.error(f"Document analysis error: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Erro ao analisar documento'
            }
            
    async def analyze_identity_document(self, image: bytes) -> Dict[str, Any]:
        """
        Usa AnalyzeID do Textract para documentos de identidade
        (Recurso mais avançado para RG/CNH)
        
        Args:
            image: Imagem do documento em bytes
            
        Returns:
            Dict com campos extraídos do documento de identidade
        """
        try:
            response = self.client.analyze_id(
                DocumentPages=[{'Bytes': image}]
            )
            
            identity_documents = response.get('IdentityDocuments', [])
            
            if not identity_documents:
                return {
                    'success': False,
                    'message': 'Documento de identidade não detectado'
                }
            
            doc = identity_documents[0]
            fields = doc.get('IdentityDocumentFields', [])
            
            extracted = {}
            confidence_scores = []
            
            for field in fields:
                field_type = field.get('Type', {}).get('Text', '')
                field_value = field.get('ValueDetection', {}).get('Text', '')
                confidence = float(field.get('ValueDetection', {}).get('Confidence', 0))
                
                if field_value:
                    extracted[field_type] = {
                        'value': field_value,
                        'confidence': round(confidence, 2)
                    }
                    confidence_scores.append(confidence)
            
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
            
            # Mapear campos para formato padronizado
            standardized = {}
            field_mapping = {
                'FIRST_NAME': 'primeiro_nome',
                'LAST_NAME': 'sobrenome',
                'MIDDLE_NAME': 'nome_meio',
                'DOCUMENT_NUMBER': 'numero_documento',
                'DATE_OF_BIRTH': 'data_nascimento',
                'DATE_OF_ISSUE': 'data_emissao',
                'EXPIRATION_DATE': 'data_validade',
                'PLACE_OF_BIRTH': 'local_nascimento',
                'ADDRESS': 'endereco',
                'ID_TYPE': 'tipo_documento',
                'STATE_NAME': 'estado',
                'COUNTY': 'cidade'
            }
            
            for aws_field, our_field in field_mapping.items():
                if aws_field in extracted:
                    standardized[our_field] = extracted[aws_field]['value']
            
            # Construir nome completo
            name_parts = []
            for part in ['FIRST_NAME', 'MIDDLE_NAME', 'LAST_NAME']:
                if part in extracted:
                    name_parts.append(extracted[part]['value'])
            if name_parts:
                standardized['nome_completo'] = ' '.join(name_parts)
            
            return {
                'success': True,
                'raw_fields': extracted,
                'standardized_fields': standardized,
                'average_confidence': round(avg_confidence, 2),
                'quality_ok': avg_confidence >= 80.0,
                'field_count': len(extracted)
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            if error_code == 'UnsupportedDocumentException':
                # Fallback para análise genérica
                logger.info("AnalyzeID não suportou documento, usando análise genérica")
                return await self.analyze_document(image)
            
            logger.error(f"AWS Textract AnalyzeID error: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Erro ao analisar documento de identidade'
            }
            
    def _detect_document_type(self, text: str) -> Optional[str]:
        """Detecta o tipo de documento baseado no texto"""
        text_upper = text.upper()
        
        if 'REGISTRO GERAL' in text_upper or 'SECRETARIA' in text_upper:
            return 'RG'
        elif 'CARTEIRA NACIONAL' in text_upper or 'HABILITACAO' in text_upper or 'CNH' in text_upper:
            return 'CNH'
        elif 'PASSPORT' in text_upper or 'PASSAPORTE' in text_upper:
            return 'PASSPORT'
        elif 'CADASTRO DE PESSOAS' in text_upper or 'CPF' in text_upper:
            return 'CPF'
        
        return None
        
    def _validate_cpf(self, cpf: str) -> bool:
        """Valida CPF usando algoritmo de dígitos verificadores"""
        cpf = re.sub(r'[^\d]', '', cpf)
        
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
        
    def _format_cpf(self, cpf: str) -> str:
        """Formata CPF no padrão XXX.XXX.XXX-XX"""
        cpf = re.sub(r'[^\d]', '', cpf)
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
        
    async def detect_document_fraud(self, image: bytes) -> Dict[str, Any]:
        """
        Analisa sinais de adulteração ou fraude em documento
        
        Args:
            image: Imagem do documento em bytes
            
        Returns:
            Dict com análise de fraude
        """
        try:
            # Extrair texto
            text_result = await self.extract_document_text(image)
            
            fraud_indicators = []
            risk_score = 0
            
            if text_result.get('success'):
                # Verificar confiança muito baixa (pode indicar documento adulterado)
                avg_confidence = text_result.get('average_confidence', 0)
                
                if avg_confidence < 50:
                    fraud_indicators.append('Qualidade muito baixa - possível adulteração')
                    risk_score += 30
                elif avg_confidence < 70:
                    fraud_indicators.append('Qualidade abaixo do esperado')
                    risk_score += 15
                
                # Verificar inconsistências no texto
                lines = text_result.get('lines', [])
                
                # Variação muito grande na confiança pode indicar partes coladas
                if lines:
                    confidences = [l['confidence'] for l in lines]
                    variance = max(confidences) - min(confidences)
                    
                    if variance > 40:
                        fraud_indicators.append('Grande variação na qualidade do texto - possível montagem')
                        risk_score += 25
                        
                # Verificar se há texto sobreposto ou duplicado
                text_set = set()
                for line in lines:
                    if line['text'] in text_set and len(line['text']) > 5:
                        fraud_indicators.append(f'Texto duplicado detectado: "{line["text"]}"')
                        risk_score += 10
                    text_set.add(line['text'])
            
            # Classificar risco
            if risk_score >= 50:
                risk_level = 'HIGH'
                recommendation = 'REJECT'
            elif risk_score >= 25:
                risk_level = 'MEDIUM'
                recommendation = 'MANUAL_REVIEW'
            else:
                risk_level = 'LOW'
                recommendation = 'APPROVE'
            
            return {
                'success': True,
                'risk_score': risk_score,
                'risk_level': risk_level,
                'fraud_indicators': fraud_indicators,
                'recommendation': recommendation,
                'confidence_score': text_result.get('average_confidence', 0),
                'is_suspicious': risk_score >= 25
            }
            
        except Exception as e:
            logger.error(f"Fraud detection error: {e}")
            return {
                'success': False,
                'error': str(e),
                'recommendation': 'MANUAL_REVIEW'
            }


# Instância singleton
textract_service = AWSTextractService()
