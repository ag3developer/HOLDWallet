"""
💬 HOLD Wallet - Chat Router
===========================

Endpoints para chat em tempo real P2P com WebSocket,
upload de comprovantes e sistema de disputas.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import logging
import asyncio

from app.db.database import get_db
from app.services.chat_service import chat_service
from app.models.chat import MessageType

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["P2P Chat"])

@router.websocket("/ws/{chat_room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    chat_room_id: str,
    token: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint para chat em tempo real"""
    session_id = None
    user_id = None
    
    try:
        # Autenticar usuário pelo token (simplificado para demo)
        # Em produção, implementar verificação JWT adequada
        user_id = token  # Assumindo que token contém user_id para demo
        
        # Conectar WebSocket
        session_id = await chat_service.connect_websocket(
            websocket, user_id, chat_room_id, db
        )
        
        logger.info(f"💬 WebSocket connected: user {user_id} in room {chat_room_id}")
        
        # Loop de mensagens
        while True:
            try:
                # Receber mensagem do cliente
                data = await websocket.receive_json()
                message_type = data.get("type")
                
                if message_type == "message":
                    # Enviar mensagem
                    content = data.get("content", "")
                    attachments = data.get("attachments", [])
                    
                    await chat_service.send_message(
                        db,
                        chat_room_id,
                        user_id,
                        content,
                        MessageType.TEXT,
                        attachments
                    )
                
                elif message_type == "typing":
                    # Notificar que usuário está digitando
                    await chat_service.broadcast_to_room(
                        chat_room_id,
                        {
                            "type": "typing",
                            "user_id": user_id,
                            "is_typing": data.get("is_typing", False)
                        },
                        db
                    )
                
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            
    except WebSocketDisconnect:
        logger.info(f"💬 WebSocket disconnected: user {user_id}")
        
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()
        
    finally:
        if session_id and user_id:
            await chat_service.disconnect_websocket(session_id, user_id, chat_room_id, db)

@router.post("/rooms/{match_id}/create")
async def create_chat_room(
    match_id: str,
    buyer_id: str = Form(...),
    seller_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Criar sala de chat para transação P2P"""
    try:
        # Verificar se usuário é parte da transação
        if current_user["user_id"] not in [buyer_id, seller_id]:
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
    current_user: dict = Depends(get_current_user)
):
    """Upload de arquivo (comprovante de pagamento)"""
    try:
        result = await chat_service.upload_file(
            db,
            chat_room_id,
            current_user["user_id"],
            file,
            message_content
        )
        
        return {
            "success": True,
            "data": result,
            "message": "File uploaded successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to upload file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/{chat_room_id}/history")
async def get_chat_history(
    chat_room_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obter histórico do chat"""
    try:
        result = await chat_service.get_chat_history(
            db,
            chat_room_id,
            current_user["user_id"],
            limit
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disputes/create")
async def create_dispute(
    match_id: str = Form(...),
    reason: str = Form(...),
    evidence_messages: List[str] = Form(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Criar disputa com taxa (R$ 25) - Fonte de receita"""
    try:
        result = await chat_service.create_dispute_with_fee(
            db,
            match_id,
            current_user["user_id"],
            reason,
            evidence_messages
        )
        
        return {
            "success": True,
            "data": result,
            "message": f"Dispute created. Fee charged: R$ {result.get('fee_charged', 0):.2f}"
        }
        
    except Exception as e:
        logger.error(f"Failed to create dispute: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{file_id}/download")
async def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Download de arquivo do chat"""
    try:
        # Buscar arquivo no banco
        # Em produção, verificar permissões de acesso
        
        # Por enquanto, retornar erro informativo
        return {
            "error": "File download not implemented",
            "message": "Feature in development"
        }
        
    except Exception as e:
        logger.error(f"Failed to download file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rooms/{chat_room_id}/system-message")
async def send_system_message(
    chat_room_id: str,
    content: str = Form(...),
    message_type: str = Form("system"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Enviar mensagem do sistema (admin apenas)"""
    try:
        # Verificar se usuário é admin
        if not current_user.get("is_admin", False):
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
            "message": "System message sent"
        }
        
    except Exception as e:
        logger.error(f"Failed to send system message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/revenue")
async def get_chat_revenue_analytics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Analytics de receita gerada pelo chat"""
    try:
        # Verificar se usuário é admin
        if not current_user.get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Mock data - em produção buscar do banco
        analytics = {
            "dispute_fees": {
                "total_collected": 2750.00,  # R$ 2.750 em taxas de disputa
                "disputes_count": 110,
                "average_fee": 25.00
            },
            "premium_chat_fees": {
                "total_collected": 890.00,  # R$ 890 em chat premium
                "premium_messages": 445,
                "average_fee": 2.00
            },
            "monthly_totals": [
                {"month": "2024-01", "revenue": 450.00, "disputes": 18, "premium_msgs": 50},
                {"month": "2024-02", "revenue": 625.00, "disputes": 25, "premium_msgs": 75},
                {"month": "2024-03", "revenue": 920.00, "disputes": 35, "premium_msgs": 110}
            ],
            "total_chat_revenue": 3640.00  # R$ 3.640 total
        }
        
        return {
            "success": True,
            "data": analytics,
            "message": "Chat revenue analytics"
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
