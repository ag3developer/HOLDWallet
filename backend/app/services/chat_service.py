"""
💬 HOLD Wallet - Chat Service
============================

Serviço de chat em tempo real para transações P2P com:
- WebSocket para mensagens instantâneas
- Upload de comprovantes de pagamento
- Sistema de notificações
- Moderação automática
- Receita através de taxa de disputa

Author: HOLD Wallet Team
"""

from fastapi import WebSocket, UploadFile
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import json
import uuid
import logging
import asyncio
import aiofiles
import os
from pathlib import Path

from app.core.exceptions import ValidationError
from app.models.chat import ChatRoom, ChatMessage, FileUpload, ChatSession, MessageType
from app.services.billing import billing_service

logger = logging.getLogger(__name__)

class ChatService:
    """Serviço de chat em tempo real para P2P"""
    
    def __init__(self):
        # Conexões WebSocket ativas
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, List[str]] = {}  # user_id -> [session_ids]
        
        # Configurações de upload
        self.UPLOAD_DIR = Path("uploads/p2p_chat")
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        self.MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
        self.ALLOWED_EXTENSIONS = {
            "image": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
            "document": [".pdf", ".doc", ".docx", ".txt"],
            "proof": [".jpg", ".jpeg", ".png", ".pdf"]
        }
        
        # Taxa de disputa para receita
        self.DISPUTE_FEE = Decimal("25.00")  # R$ 25 por disputa
        self.PREMIUM_CHAT_FEE = Decimal("2.00")  # R$ 2 para chat premium
    
    async def create_chat_room(
        self,
        db: Session,
        match_id: str,
        buyer_id: str,
        seller_id: str
    ) -> Dict[str, Any]:
        """Criar sala de chat para transação P2P"""
        try:
            # Verificar se já existe chat para esta transação
            existing_room = db.query(ChatRoom).filter(
                ChatRoom.match_id == match_id
            ).first()
            
            if existing_room:
                return {
                    "success": True,
                    "chat_room": {
                        "room_id": str(existing_room.id),
                        "match_id": match_id,
                        "is_active": existing_room.is_active
                    },
                    "message": "Chat room already exists"
                }
            
            # Criar nova sala de chat
            chat_room = ChatRoom(
                match_id=match_id,
                buyer_id=buyer_id,
                seller_id=seller_id,
                auto_delete_at=datetime.utcnow() + timedelta(days=30)  # 30 dias de retenção
            )
            
            db.add(chat_room)
            db.commit()
            db.refresh(chat_room)
            
            # Enviar mensagem de boas-vindas do sistema
            await self.send_system_message(
                db, 
                str(chat_room.id),
                "💬 Chat iniciado! Use este espaço para coordenar sua transação P2P de forma segura."
            )
            
            return {
                "success": True,
                "chat_room": {
                    "room_id": str(chat_room.id),
                    "match_id": match_id,
                    "buyer_id": buyer_id,
                    "seller_id": seller_id,
                    "created_at": chat_room.created_at.isoformat()
                },
                "message": "Chat room created successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to create chat room: {e}")
            raise ValidationError(f"Failed to create chat room: {str(e)}")
    
    async def connect_websocket(
        self,
        websocket: WebSocket,
        user_id: str,
        chat_room_id: str,
        db: Session
    ):
        """Conectar usuário ao WebSocket do chat"""
        try:
            await websocket.accept()
            
            # Gerar ID único para esta sessão
            session_id = str(uuid.uuid4())
            
            # Salvar conexão
            self.active_connections[session_id] = websocket
            
            if user_id not in self.user_sessions:
                self.user_sessions[user_id] = []
            self.user_sessions[user_id].append(session_id)
            
            # Salvar sessão no banco
            chat_session = ChatSession(
                user_id=user_id,
                chat_room_id=chat_room_id,
                session_id=session_id,
                ip_address=websocket.client.host if websocket.client else None
            )
            db.add(chat_session)
            db.commit()
            
            # Notificar outros usuários que este usuário está online
            await self.broadcast_user_status(chat_room_id, user_id, "online", db)
            
            logger.info(f"👤 User {user_id} connected to chat room {chat_room_id}")
            
            return session_id
            
        except Exception as e:
            logger.error(f"Failed to connect websocket: {e}")
            await websocket.close()
            raise
    
    async def disconnect_websocket(
        self,
        session_id: str,
        user_id: str,
        chat_room_id: str,
        db: Session
    ):
        """Desconectar usuário do WebSocket"""
        try:
            # Remover conexão
            if session_id in self.active_connections:
                del self.active_connections[session_id]
            
            if user_id in self.user_sessions:
                self.user_sessions[user_id] = [
                    s for s in self.user_sessions[user_id] if s != session_id
                ]
                if not self.user_sessions[user_id]:
                    del self.user_sessions[user_id]
            
            # Atualizar sessão no banco
            chat_session = db.query(ChatSession).filter(
                ChatSession.session_id == session_id
            ).first()
            
            if chat_session:
                chat_session.is_online = False
                chat_session.disconnected_at = datetime.utcnow()
                db.commit()
            
            # Notificar outros usuários
            await self.broadcast_user_status(chat_room_id, user_id, "offline", db)
            
            logger.info(f"👤 User {user_id} disconnected from chat room {chat_room_id}")
            
        except Exception as e:
            logger.error(f"Failed to disconnect websocket: {e}")
    
    async def send_message(
        self,
        db: Session,
        chat_room_id: str,
        sender_id: str,
        content: str,
        message_type: MessageType = MessageType.TEXT,
        attachments: List[Dict] = None
    ) -> Dict[str, Any]:
        """Enviar mensagem no chat"""
        try:
            # Verificar se sala existe e usuário tem permissão
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            if not chat_room:
                raise ValidationError("Chat room not found")
            
            if sender_id not in [chat_room.buyer_id, chat_room.seller_id]:
                raise ValidationError("User not authorized for this chat")
            
            # Verificar limites de mensagem por tier
            user_subscription = await billing_service.get_user_subscription(db, sender_id)
            await self._check_message_limits(db, sender_id, user_subscription["tier"])
            
            # Criar mensagem
            message = ChatMessage(
                chat_room_id=chat_room_id,
                sender_id=sender_id,
                message_type=message_type,
                content=content,
                attachments=attachments or []
            )
            
            db.add(message)
            db.commit()
            db.refresh(message)
            
            # Preparar dados da mensagem para broadcast
            message_data = {
                "message_id": str(message.id),
                "chat_room_id": chat_room_id,
                "sender_id": sender_id,
                "message_type": message_type.value,
                "content": content,
                "attachments": attachments or [],
                "created_at": message.created_at.isoformat(),
                "is_system": message.is_system_message
            }
            
            # Enviar para todos na sala via WebSocket
            await self.broadcast_to_room(chat_room_id, message_data, db)
            
            # ✅ NOVO: Enviar Push Notification para usuário offline
            await self._send_offline_notification(
                db=db,
                chat_room=chat_room,
                sender_id=sender_id,
                content=content,
                chat_room_id=chat_room_id
            )
            
            # Coletar taxa se for mensagem premium (com anexos)
            revenue = 0
            if attachments and user_subscription["tier"] in ["basic", "pro"]:
                revenue = float(self.PREMIUM_CHAT_FEE)
                logger.info(f"💰 Premium chat revenue: R$ {revenue:.2f}")
            
            return {
                "success": True,
                "message": message_data,
                "revenue_generated": revenue
            }
            
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            raise ValidationError(f"Failed to send message: {str(e)}")
    
    async def upload_file(
        self,
        db: Session,
        chat_room_id: str,
        uploader_id: str,
        file: UploadFile,
        message_content: str = ""
    ) -> Dict[str, Any]:
        """Upload de arquivo (comprovante de pagamento, documento)"""
        try:
            # Verificar permissões
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            if not chat_room or uploader_id not in [chat_room.buyer_id, chat_room.seller_id]:
                raise ValidationError("Unauthorized file upload")
            
            # Verificar tamanho do arquivo
            if file.size > self.MAX_FILE_SIZE:
                raise ValidationError(f"File too large. Max size: {self.MAX_FILE_SIZE // 1024 // 1024}MB")
            
            # Verificar extensão
            file_ext = Path(file.filename).suffix.lower()
            if not self._is_allowed_extension(file_ext):
                raise ValidationError(f"File type not allowed: {file_ext}")
            
            # Gerar nome único
            unique_filename = f"{uuid.uuid4().hex}{file_ext}"
            file_path = self.UPLOAD_DIR / chat_room_id / unique_filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Salvar arquivo
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Criar mensagem com arquivo
            message = ChatMessage(
                chat_room_id=chat_room_id,
                sender_id=uploader_id,
                message_type=MessageType.PAYMENT_PROOF if "comprovante" in file.filename.lower() else MessageType.DOCUMENT,
                content=message_content or f"📎 Arquivo enviado: {file.filename}",
                attachments=[{
                    "filename": file.filename,
                    "file_path": str(file_path),
                    "file_size": file.size,
                    "mime_type": file.content_type
                }]
            )
            
            db.add(message)
            db.commit()
            db.refresh(message)
            
            # Criar registro do arquivo
            file_upload = FileUpload(
                message_id=message.id,
                uploader_id=uploader_id,
                filename=unique_filename,
                original_filename=file.filename,
                file_path=str(file_path),
                file_size=file.size,
                mime_type=file.content_type,
                expires_at=datetime.utcnow() + timedelta(days=90)  # 90 dias de retenção
            )
            
            db.add(file_upload)
            db.commit()
            
            # Broadcast da mensagem
            message_data = {
                "message_id": str(message.id),
                "chat_room_id": chat_room_id,
                "sender_id": uploader_id,
                "message_type": message.message_type.value,
                "content": message.content,
                "attachments": message.attachments,
                "created_at": message.created_at.isoformat()
            }
            
            await self.broadcast_to_room(chat_room_id, message_data, db)
            
            return {
                "success": True,
                "message": message_data,
                "file_id": str(file_upload.id)
            }
            
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise ValidationError(f"Failed to upload file: {str(e)}")
    
    async def send_system_message(
        self,
        db: Session,
        chat_room_id: str,
        content: str,
        message_type: MessageType = MessageType.SYSTEM
    ):
        """Enviar mensagem do sistema"""
        try:
            # UUID especial para mensagens do sistema (todos zeros)
            # Este é um UUID válido que representa "sistema"
            SYSTEM_UUID = "00000000-0000-0000-0000-000000000000"
            
            message = ChatMessage(
                chat_room_id=chat_room_id,
                sender_id=SYSTEM_UUID,  # UUID válido para sistema
                message_type=message_type,
                content=content,
                is_system_message=True
            )
            
            db.add(message)
            db.commit()
            db.refresh(message)
            
            message_data = {
                "message_id": str(message.id),
                "chat_room_id": chat_room_id,
                "sender_id": SYSTEM_UUID,
                "message_type": message_type.value,
                "content": content,
                "created_at": message.created_at.isoformat(),
                "is_system": True
            }
            
            await self.broadcast_to_room(chat_room_id, message_data, db)
            
        except Exception as e:
            logger.error(f"Failed to send system message: {e}")
    
    async def broadcast_to_room(
        self,
        chat_room_id: str,
        message_data: Dict,
        db: Session
    ):
        """Enviar mensagem para todos os usuários da sala"""
        try:
            # Buscar usuários da sala
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            if not chat_room:
                return
            
            room_users = [chat_room.buyer_id, chat_room.seller_id]
            
            # Enviar para todas as sessões ativas desses usuários
            for user_id in room_users:
                if user_id in self.user_sessions:
                    for session_id in self.user_sessions[user_id]:
                        if session_id in self.active_connections:
                            try:
                                websocket = self.active_connections[session_id]
                                await websocket.send_json({
                                    "type": "message",
                                    "data": message_data
                                })
                            except Exception as e:
                                logger.error(f"Failed to send to session {session_id}: {e}")
                                # Remover conexão problemática
                                del self.active_connections[session_id]
            
        except Exception as e:
            logger.error(f"Failed to broadcast to room: {e}")
    
    async def broadcast_user_status(
        self,
        chat_room_id: str,
        user_id: str,
        status: str,
        db: Session
    ):
        """Notificar status do usuário (online/offline)"""
        status_data = {
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast_to_room(chat_room_id, {
            "type": "user_status",
            "data": status_data
        }, db)
    
    async def create_dispute_with_fee(
        self,
        db: Session,
        match_id: str,
        complainant_id: str,
        reason: str,
        chat_evidence: List[str]
    ) -> Dict[str, Any]:
        """Criar disputa e coletar taxa (fonte de receita)"""
        try:
            # Verificar se usuário pode pagar taxa de disputa
            user_subscription = await billing_service.get_user_subscription(db, complainant_id)
            
            # Coletar taxa de disputa
            fee_result = await billing_service.charge_fee(
                db, 
                complainant_id, 
                float(self.DISPUTE_FEE), 
                "P2P Dispute Fee"
            )
            
            if not fee_result["success"]:
                return {
                    "error": "Insufficient balance for dispute fee",
                    "required_fee": float(self.DISPUTE_FEE),
                    "message": "Taxa de R$ 25,00 necessária para abrir disputa"
                }
            
            # Log da receita gerada
            logger.info(f"💰 Dispute fee collected: R$ {self.DISPUTE_FEE}")
            
            return {
                "success": True,
                "dispute_id": str(uuid.uuid4()),
                "fee_charged": float(self.DISPUTE_FEE),
                "message": "Disputa criada com sucesso. Taxa de R$ 25,00 coletada.",
                "revenue_generated": float(self.DISPUTE_FEE)
            }
            
        except Exception as e:
            logger.error(f"Failed to create dispute: {e}")
            raise ValidationError(f"Failed to create dispute: {str(e)}")
    
    async def get_chat_history(
        self,
        db: Session,
        chat_room_id: str,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Obter histórico do chat com paginação"""
        try:
            # Verificar permissões
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            # Converter UUIDs para strings para comparação correta
            if not chat_room or user_id not in [str(chat_room.buyer_id), str(chat_room.seller_id)]:
                raise ValidationError("Unauthorized access to chat history")
            
            # Buscar mensagens com paginação
            messages = db.query(ChatMessage).filter(
                ChatMessage.chat_room_id == chat_room_id
            ).order_by(ChatMessage.created_at.desc()).offset(offset).limit(limit).all()
            
            # Contar total de mensagens
            total_messages = db.query(ChatMessage).filter(
                ChatMessage.chat_room_id == chat_room_id
            ).count()
            
            messages_data = []
            for msg in reversed(messages):
                messages_data.append({
                    "message_id": str(msg.id),
                    "sender_id": str(msg.sender_id),
                    "message_type": msg.message_type.value,
                    "content": msg.content,
                    "attachments": msg.attachments,
                    "created_at": msg.created_at.isoformat(),
                    "is_system": msg.is_system_message
                })
            
            return {
                "success": True,
                "messages": messages_data,
                "total_messages": total_messages,
                "has_more": (offset + limit) < total_messages
            }
            
        except Exception as e:
            logger.error(f"Failed to get chat history: {e}")
            raise ValidationError(f"Failed to get chat history: {str(e)}")
    
    async def get_file_by_id(
        self,
        db: Session,
        file_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Buscar arquivo por ID com verificação de permissões"""
        try:
            file_upload = db.query(FileUpload).filter(FileUpload.id == file_id).first()
            if not file_upload:
                return None
            
            # Verificar se usuário tem acesso ao arquivo
            message = db.query(ChatMessage).filter(ChatMessage.id == file_upload.message_id).first()
            if not message:
                return None
            
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == message.chat_room_id).first()
            if not chat_room or user_id not in [chat_room.buyer_id, chat_room.seller_id]:
                return None
            
            return {
                "file_path": file_upload.file_path,
                "original_filename": file_upload.original_filename,
                "mime_type": file_upload.mime_type,
                "file_size": file_upload.file_size
            }
            
        except Exception as e:
            logger.error(f"Failed to get file: {e}")
            return None
    
    async def get_room_status(
        self,
        db: Session,
        chat_room_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Obter status da sala de chat"""
        try:
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            if not chat_room or user_id not in [chat_room.buyer_id, chat_room.seller_id]:
                raise ValidationError("Unauthorized access to chat room")
            
            # Verificar usuários online
            online_users = []
            for room_user_id in [chat_room.buyer_id, chat_room.seller_id]:
                if room_user_id in self.user_sessions:
                    online_users.append(room_user_id)
            
            return {
                "room_id": chat_room_id,
                "is_active": chat_room.is_active,
                "created_at": chat_room.created_at.isoformat(),
                "participants": [chat_room.buyer_id, chat_room.seller_id],
                "online_users": online_users,
                "total_messages": db.query(ChatMessage).filter(
                    ChatMessage.chat_room_id == chat_room_id
                ).count()
            }
            
        except Exception as e:
            logger.error(f"Failed to get room status: {e}")
            raise ValidationError(f"Failed to get room status: {str(e)}")
    
    async def close_chat_room(
        self,
        db: Session,
        chat_room_id: str,
        user_id: str,
        reason: str = "Transaction completed"
    ) -> Dict[str, Any]:
        """Fechar sala de chat"""
        try:
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            if not chat_room:
                raise ValidationError("Chat room not found")
            
            # Apenas participantes podem fechar o chat
            if user_id not in [chat_room.buyer_id, chat_room.seller_id]:
                raise ValidationError("Unauthorized to close chat room")
            
            # Atualizar status
            chat_room.is_active = False
            chat_room.closed_at = datetime.utcnow()
            db.commit()
            
            # Enviar mensagem de sistema
            await self.send_system_message(
                db,
                chat_room_id,
                f"💬 Chat fechado: {reason}. Mensagens preservadas por 30 dias."
            )
            
            return {
                "success": True,
                "room_id": chat_room_id,
                "closed_at": chat_room.closed_at.isoformat(),
                "reason": reason
            }
            
        except Exception as e:
            logger.error(f"Failed to close chat room: {e}")
            raise ValidationError(f"Failed to close chat room: {str(e)}")
    
    async def get_revenue_analytics(
        self,
        db: Session,
        period: str = "month"
    ) -> Dict[str, Any]:
        """Analytics de receita do chat"""
        # Mock analytics - em produção buscar do banco
        mock_analytics = {
            "dispute_fees": {
                "total_collected": 3750.00,  # R$ 3.750 em taxas de disputa
                "disputes_count": 150,
                "average_fee": 25.00,
                "period": period
            },
            "premium_chat_fees": {
                "total_collected": 1240.00,  # R$ 1.240 em chat premium
                "premium_messages": 620,
                "average_fee": 2.00,
                "period": period
            },
            "file_uploads": {
                "total_uploads": 2340,
                "premium_uploads": 620,
                "revenue_per_upload": 2.00
            },
            "top_revenue_days": [
                {"date": "2024-11-20", "revenue": 145.00, "disputes": 3, "uploads": 25},
                {"date": "2024-11-19", "revenue": 198.00, "disputes": 5, "uploads": 32},
                {"date": "2024-11-18", "revenue": 167.00, "disputes": 4, "uploads": 28}
            ],
            "total_chat_revenue": 4990.00  # Total: R$ 4.990
        }
        
        return mock_analytics
    
    async def export_chat_history(
        self,
        db: Session,
        chat_room_id: str,
        user_id: str,
        format: str = "json"
    ) -> Dict[str, Any]:
        """Exportar histórico do chat"""
        try:
            # Verificar permissões
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            if not chat_room or user_id not in [chat_room.buyer_id, chat_room.seller_id]:
                raise ValidationError("Unauthorized access to chat room")
            
            # Buscar todas as mensagens
            messages = db.query(ChatMessage).filter(
                ChatMessage.chat_room_id == chat_room_id
            ).order_by(ChatMessage.created_at.asc()).all()
            
            export_data = {
                "chat_room_id": chat_room_id,
                "export_timestamp": datetime.utcnow().isoformat(),
                "total_messages": len(messages),
                "participants": [chat_room.buyer_id, chat_room.seller_id],
                "messages": []
            }
            
            for msg in messages:
                export_data["messages"].append({
                    "message_id": str(msg.id),
                    "sender_id": str(msg.sender_id),
                    "content": msg.content,
                    "message_type": msg.message_type.value,
                    "created_at": msg.created_at.isoformat(),
                    "is_system": msg.is_system_message,
                    "attachments": msg.attachments
                })
            
            if format == "json":
                return export_data
            else:
                # Para PDF/CSV, seria necessário implementar geração de arquivo
                return {
                    "error": "PDF/CSV export not implemented",
                    "data": export_data
                }
            
        except Exception as e:
            logger.error(f"Failed to export chat: {e}")
            raise ValidationError(f"Failed to export chat: {str(e)}")
    
    async def create_dispute_with_fee(
        self,
        db: Session,
        match_id: str,
        complainant_id: str,
        reason: str,
        chat_evidence: List[str],
        description: str = ""
    ) -> Dict[str, Any]:
        """Criar disputa e coletar taxa (fonte de receita)"""
        try:
            # Verificar se usuário pode pagar taxa de disputa
            user_subscription = await billing_service.get_user_subscription(db, complainant_id)
            
            # Coletar taxa de disputa
            fee_result = await billing_service.charge_fee(
                db, 
                complainant_id, 
                float(self.DISPUTE_FEE), 
                "P2P Dispute Fee",
                description or f"Dispute for match {match_id}"
            )
            
            if not fee_result["success"]:
                return {
                    "error": "Insufficient balance for dispute fee",
                    "required_fee": float(self.DISPUTE_FEE),
                    "message": "Taxa de R$ 25,00 necessária para abrir disputa",
                    "success": False
                }
            
            # Criar disputa
            dispute_data = {
                "dispute_id": str(uuid.uuid4()),
                "match_id": match_id,
                "complainant_id": complainant_id,
                "reason": reason,
                "description": description,
                "evidence": chat_evidence,
                "fee_charged": float(self.DISPUTE_FEE),
                "created_at": datetime.utcnow().isoformat(),
                "status": "open",
                "estimated_resolution": (datetime.utcnow() + timedelta(hours=24)).isoformat()
            }
            
            # Log da receita gerada
            logger.info(f"💰 Dispute fee collected: R$ {self.DISPUTE_FEE} from user {complainant_id}")
            
            return {
                "success": True,
                "dispute": dispute_data,
                "fee_charged": float(self.DISPUTE_FEE),
                "message": "Disputa criada com sucesso. Taxa de R$ 25,00 coletada.",
                "revenue_generated": float(self.DISPUTE_FEE)
            }
            
        except Exception as e:
            logger.error(f"Failed to create dispute: {e}")
            raise ValidationError(f"Failed to create dispute: {str(e)}")
    
    def _is_allowed_extension(self, file_ext: str) -> bool:
        """Verificar se extensão do arquivo é permitida"""
        for file_type, extensions in self.ALLOWED_EXTENSIONS.items():
            if file_ext in extensions:
                return True
        return False
    
    async def _check_message_limits(self, db: Session, user_id: str, tier: str):
        """Verificar limites de mensagem por tier"""
        # Implementar limites se necessário
        # Por exemplo: usuários free têm limite de mensagens por dia
        pass
    
    def _is_user_online(self, user_id: str) -> bool:
        """Verifica se usuário tem conexão WebSocket ativa"""
        return user_id in self.user_sessions and len(self.user_sessions.get(user_id, [])) > 0
    
    async def _send_offline_notification(
        self,
        db: Session,
        chat_room: ChatRoom,
        sender_id: str,
        content: str,
        chat_room_id: str
    ):
        """Envia push notification para usuário offline quando recebe mensagem"""
        try:
            # Importar aqui para evitar circular import
            from app.services.push_notification_service import push_notification_service
            from app.models.user import User
            
            # Determinar quem é o destinatário
            recipient_id = chat_room.seller_id if sender_id == chat_room.buyer_id else chat_room.buyer_id
            
            # Verificar se destinatário está offline (não tem WebSocket ativo)
            if self._is_user_online(str(recipient_id)):
                logger.debug(f"👤 User {recipient_id} is online, skipping push notification")
                return
            
            # Buscar nome do remetente
            sender = db.query(User).filter(User.id == sender_id).first()
            sender_name = sender.name if sender and sender.name else "Usuário"
            
            # Criar preview da mensagem (máx 100 caracteres)
            message_preview = content[:100] + ("..." if len(content) > 100 else "")
            
            # Enviar push notification
            result = push_notification_service.notify_new_chat_message(
                db=db,
                user_id=str(recipient_id),
                sender_name=sender_name,
                message_preview=message_preview,
                chat_id=chat_room_id
            )
            
            if result.get("success"):
                logger.info(f"📱 Push notification sent to offline user {recipient_id}")
            else:
                logger.warning(f"⚠️ Failed to send push: {result.get('reason', 'unknown')}")
                
        except Exception as e:
            # Não falhar a mensagem por causa de erro na notificação
            logger.error(f"❌ Error sending offline notification: {e}")

# Instância global
chat_service = ChatService()
