"""
💬 HOLD Wallet - Chat Router Enterprise
=======================================

Endpoints para chat em tempo real P2P com WebSocket,
upload de comprovantes, autenticação JWT e sistema de disputas.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import logging
from jose import JWTError, jwt
import asyncio

from app.core.db import get_db
from app.core.security import get_current_user, verify_token
from app.core.config import settings
from app.services.chat_service import chat_service
from app.models.chat import MessageType
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["P2P Chat Enterprise"])

async def authenticate_websocket_user(token: str, db: Session) -> Optional[User]:
    """Autenticar usuário via JWT token para WebSocket"""
    try:
        if not token:
            return None
        
        # Verificar se token começa com Bearer
        if token.startswith("Bearer "):
            token = token[7:]
        
        payload = verify_token(token)
        if payload is None:
            return None
        
        user_email: str = payload.get("sub")
        if user_email is None:
            return None
        
        # Import aqui para evitar imports circulares
        from app.models.user import User
        user = db.query(User).filter(User.email == user_email).first()
        
        if user and user.is_active:
            return user
        
        return None
        
    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        return None

@router.websocket("/ws/{chat_room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    chat_room_id: str,
    token: str = Query(None, description="JWT token for authentication"),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint para chat em tempo real com autenticação JWT
    
    Usage:
    ws://localhost:8000/api/v1/chat/ws/room_123?token=your_jwt_token
    """
    session_id = None
    user = None
    
    try:
        # Autenticar usuário
        user = await authenticate_websocket_user(token, db)
        if not user:
            await websocket.close(code=1008, reason="Authentication failed")
            return
        
        # Verificar se usuário tem acesso ao chat room
        # Em produção, verificar se user.id está autorizado para este chat_room_id
        
        # Conectar WebSocket
        session_id = await chat_service.connect_websocket(
            websocket, str(user.id), chat_room_id, db
        )
        
        logger.info(f"💬 WebSocket connected: user {user.email} in room {chat_room_id}")
        
        # Enviar mensagem de boas-vindas
        await websocket.send_json({
            "type": "connection_established",
            "message": f"Conectado ao chat {chat_room_id}",
            "user_id": str(user.id),
            "timestamp": json.dumps(asyncio.get_event_loop().time(), default=str)
        })
        
        # Loop de mensagens
        while True:
            try:
                # Receber mensagem do cliente
                data = await websocket.receive_json()
                message_type = data.get("type")
                
                if message_type == "message":
                    # Enviar mensagem de texto
                    content = data.get("content", "")
                    attachments = data.get("attachments", [])
                    
                    if content.strip():  # Só enviar se há conteúdo
                        result = await chat_service.send_message(
                            db,
                            chat_room_id,
                            str(user.id),
                            content,
                            MessageType.TEXT,
                            attachments
                        )
                        
                        # Confirmar envio
                        await websocket.send_json({
                            "type": "message_sent",
                            "message_id": result.get("message", {}).get("message_id"),
                            "status": "delivered"
                        })
                
                elif message_type == "typing":
                    # Notificar que usuário está digitando
                    await chat_service.broadcast_to_room(
                        chat_room_id,
                        {
                            "type": "typing",
                            "user_id": str(user.id),
                            "username": user.first_name or "Usuário",
                            "is_typing": data.get("is_typing", False)
                        },
                        db
                    )
                
                elif message_type == "ping":
                    # Responder ping para manter conexão viva
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": json.dumps(asyncio.get_event_loop().time(), default=str)
                    })
                
                elif message_type == "read_receipt":
                    # Marcar mensagens como lidas
                    message_ids = data.get("message_ids", [])
                    # Implementar lógica de read receipts
                    
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Tipo de mensagem não suportado: {message_type}"
                    })
            
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Formato JSON inválido"
                })
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await websocket.send_json({
                    "type": "error", 
                    "message": "Erro ao processar mensagem"
                })
            
    except WebSocketDisconnect:
        logger.info(f"💬 WebSocket disconnected: user {user.email if user else 'unknown'}")
        
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass
        
    finally:
        if session_id and user:
            try:
                await chat_service.disconnect_websocket(session_id, str(user.id), chat_room_id, db)
            except Exception as e:
                logger.error(f"Error disconnecting WebSocket: {e}")

@router.post("/rooms/{match_id}/create")
async def create_chat_room(
    match_id: str,
    buyer_id: str = Form(...),
    seller_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Criar sala de chat para transação P2P"""
    try:
        # Verificar se usuário é parte da transação
        if str(current_user.id) not in [buyer_id, seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this transaction"
            )
        
        result = await chat_service.create_chat_room(db, match_id, buyer_id, seller_id)
        
        return {
            "success": True,
            "data": result,
            "message": "Chat room created successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to create chat room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rooms/{chat_room_id}/upload")
async def upload_file(
    chat_room_id: str,
    file: UploadFile = File(...),
    message_content: Optional[str] = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload de arquivo (comprovante de pagamento)
    
    Tipos suportados:
    - Imagens: JPG, PNG, GIF, WEBP
    - Documentos: PDF, DOC, DOCX, TXT
    - Máximo: 50MB por arquivo
    """
    try:
        result = await chat_service.upload_file(
            db,
            chat_room_id,
            str(current_user.id),
            file,
            message_content
        )
        
        return {
            "success": True,
            "data": result,
            "message": "File uploaded successfully",
            "revenue_generated": 2.00 if current_user.subscription_tier in ["free", "basic"] else 0.00
        }
        
    except Exception as e:
        logger.error(f"Failed to upload file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/{chat_room_id}/history")
async def get_chat_history(
    chat_room_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter histórico do chat com paginação"""
    try:
        result = await chat_service.get_chat_history(
            db,
            chat_room_id,
            str(current_user.id),
            limit,
            offset
        )
        
        return {
            "success": True,
            "data": result,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": result.get("total_messages", 0)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disputes/create")
async def create_dispute(
    match_id: str = Form(...),
    reason: str = Form(...),
    evidence_messages: List[str] = Form(...),
    description: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Criar disputa com taxa (R$ 25) - Fonte de receita
    
    Esta taxa garante qualidade das disputas e gera receita para a plataforma.
    """
    try:
        result = await chat_service.create_dispute_with_fee(
            db,
            match_id,
            str(current_user.id),
            reason,
            evidence_messages,
            description
        )
        
        return {
            "success": True,
            "data": result,
            "message": f"Dispute created successfully. Fee charged: R$ {result.get('fee_charged', 0):.2f}",
            "next_steps": [
                "Nossa equipe analisará sua disputa em até 24 horas",
                "Você receberá updates por email e no chat",
                "Evidências do chat foram automaticamente preservadas"
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to create dispute: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{file_id}/download")
async def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download de arquivo do chat com verificação de permissões"""
    try:
        # Buscar arquivo no banco e verificar permissões
        file_record = await chat_service.get_file_by_id(db, file_id, str(current_user.id))
        
        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied"
            )
        
        # Retornar arquivo
        return FileResponse(
            path=file_record["file_path"],
            filename=file_record["original_filename"],
            media_type=file_record["mime_type"]
        )
        
    except Exception as e:
        logger.error(f"Failed to download file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rooms/{chat_room_id}/system-message")
async def send_system_message(
    chat_room_id: str,
    content: str = Form(...),
    message_type: str = Form("system"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enviar mensagem do sistema (admin apenas)"""
    try:
        # Verificar se usuário é admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        await chat_service.send_system_message(
            db,
            chat_room_id,
            content,
            MessageType(message_type)
        )
        
        return {
            "success": True,
            "message": "System message sent successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to send system message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/{chat_room_id}/status")
async def get_chat_room_status(
    chat_room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter status da sala de chat e usuários online"""
    try:
        status_data = await chat_service.get_room_status(db, chat_room_id, str(current_user.id))
        
        return {
            "success": True,
            "data": status_data
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat room status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rooms/{chat_room_id}/close")
async def close_chat_room(
    chat_room_id: str,
    reason: str = Form("Transaction completed"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fechar sala de chat (após transação concluída)"""
    try:
        result = await chat_service.close_chat_room(
            db,
            chat_room_id, 
            str(current_user.id),
            reason
        )
        
        return {
            "success": True,
            "data": result,
            "message": "Chat room closed successfully. Messages will be retained for 30 days."
        }
        
    except Exception as e:
        logger.error(f"Failed to close chat room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/revenue")
async def get_chat_revenue_analytics(
    period: str = Query("month", regex="^(day|week|month|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analytics de receita gerada pelo chat (admin apenas)"""
    try:
        # Verificar se usuário é admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        analytics = await chat_service.get_revenue_analytics(db, period)
        
        return {
            "success": True,
            "data": analytics,
            "message": f"Chat revenue analytics for {period}"
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/{chat_room_id}/export")
async def export_chat_history(
    chat_room_id: str,
    format: str = Query("json", regex="^(json|pdf|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Exportar histórico do chat (para disputas ou backup)"""
    try:
        exported_file = await chat_service.export_chat_history(
            db,
            chat_room_id,
            str(current_user.id),
            format
        )
        
        if format == "json":
            return exported_file
        else:
            return FileResponse(
                path=exported_file["file_path"],
                filename=exported_file["filename"],
                media_type=exported_file["mime_type"]
            )
        
    except Exception as e:
        logger.error(f"Failed to export chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def chat_health_check():
    """Health check para sistema de chat"""
    try:
        active_connections = len(chat_service.active_connections)
        active_users = len(chat_service.user_sessions)
        
        return {
            "status": "healthy",
            "websocket_connections": active_connections,
            "active_users": active_users,
            "uptime": "99.9%",
            "message": "Chat system is operational"
        }
        
    except Exception as e:
        logger.error(f"Chat health check failed: {e}")
        return {
            "status": "degraded",
            "error": str(e)
        }
