"""
💬 HOLD Wallet - Chat Models para P2P
===================================

Modelos de dados para chat em tempo real entre traders P2P,
incluindo envio de comprovantes e histórico de conversas.

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from enum import Enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from app.core.db import Base
from app.core.uuid_type import UUID

if TYPE_CHECKING:
    from app.models.p2p import P2PMatch

class MessageType(str, Enum):
    """Tipos de mensagem no chat P2P"""
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"
    PAYMENT_PROOF = "payment_proof"
    SYSTEM = "system"
    ESCROW_NOTIFICATION = "escrow_notification"

class ChatRoom(Base):
    """Sala de chat para transações P2P"""
    __tablename__ = "p2p_chat_rooms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("p2p_matches.id"), unique=True, nullable=False)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Status da sala de chat
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    
    # Auto-destruição após conclusão da transação
    auto_delete_at = Column(DateTime, nullable=True)
    
    # Relacionamentos
    messages = relationship("ChatMessage", back_populates="chat_room", cascade="all, delete-orphan")
    match = relationship("P2PMatch", back_populates="chat_room")
    
    def __repr__(self):
        return f"<ChatRoom(match_id={self.match_id})>"

class ChatMessage(Base):
    """Mensagens do chat P2P"""
    __tablename__ = "p2p_chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_room_id = Column(UUID(as_uuid=True), ForeignKey("p2p_chat_rooms.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Conteúdo da mensagem
    message_type = Column(SQLEnum(MessageType), nullable=False, default=MessageType.TEXT)
    content = Column(Text, nullable=True)  # Texto da mensagem
    
    # Arquivos anexados
    attachments = Column(JSON, nullable=True)  # Lista de arquivos
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False)
    is_system_message = Column(Boolean, default=False)
    
    # Relacionamentos
    chat_room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User")
    
    def __repr__(self):
        return f"<ChatMessage(sender_id={self.sender_id}, type={self.message_type})>"

class FileUpload(Base):
    """Arquivos enviados no chat (comprovantes, documentos)"""
    __tablename__ = "p2p_file_uploads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("p2p_chat_messages.id"), nullable=False)
    uploader_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Dados do arquivo
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Verificação de segurança
    is_verified = Column(Boolean, default=False)
    virus_scan_status = Column(String(50), default="pending")
    
    # Metadados
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # Auto-delete após tempo
    
    def __repr__(self):
        return f"<FileUpload(filename={self.filename})>"

class ChatSession(Base):
    """Sessões WebSocket ativas para chat"""
    __tablename__ = "p2p_chat_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    chat_room_id = Column(UUID(as_uuid=True), ForeignKey("p2p_chat_rooms.id"), nullable=False)
    
    # Dados da sessão WebSocket
    session_id = Column(String(100), unique=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Status da conexão
    is_online = Column(Boolean, default=True)
    last_seen = Column(DateTime, default=datetime.utcnow)
    connected_at = Column(DateTime, default=datetime.utcnow)
    disconnected_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<ChatSession(user_id={self.user_id}, online={self.is_online})>"
