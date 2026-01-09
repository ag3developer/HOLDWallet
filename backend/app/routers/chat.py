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
from app.core.security import get_current_user, verify_token

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
        # ✅ FIX: Decodificar o JWT token para extrair o user_id
        payload = verify_token(token)
        if not payload:
            logger.error("❌ Token JWT inválido ou expirado")
            await websocket.close(code=4001, reason="Token inválido")
            return
        
        # Extrair user_id do payload do token
        user_id = payload.get("user_id") or payload.get("sub")
        if not user_id:
            logger.error("❌ Token não contém user_id")
            await websocket.close(code=4002, reason="Token sem user_id")
            return
        
        # Se user_id for um email (sub), precisamos buscar o ID real
        # Verificar se é um UUID válido
        import uuid
        try:
            uuid.UUID(user_id)
        except ValueError:
            # user_id não é UUID, provavelmente é email
            # Tentar usar o campo user_id do payload
            user_id = payload.get("user_id")
            if not user_id:
                logger.error("❌ Não foi possível extrair user_id do token")
                await websocket.close(code=4003, reason="user_id não encontrado")
                return
        
        logger.info(f"✅ [WebSocket] Token validado, user_id: {user_id}")
        
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
    current_user = Depends(get_current_user)  # Retorna User object
):
    """Criar sala de chat para transação P2P"""
    try:
        # Verificar se usuário é parte da transação
        user_id = str(current_user.id)
        if user_id not in [buyer_id, seller_id]:
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


@router.get("/rooms")
async def get_user_chat_rooms(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
    active_only: bool = True
):
    """
    Listar todas as conversas do usuário.
    Retorna salas de chat com última mensagem e contagem de não lidas.
    """
    try:
        from app.models.chat import ChatRoom, ChatMessage
        from app.models.user import User
        from sqlalchemy import or_, func, desc
        
        user_id = str(current_user.id)
        
        # Query base - salas onde o usuário é comprador ou vendedor
        query = db.query(ChatRoom).filter(
            or_(
                ChatRoom.buyer_id == user_id,
                ChatRoom.seller_id == user_id
            )
        )
        
        # Filtrar apenas ativas se solicitado
        if active_only:
            query = query.filter(ChatRoom.is_active == True)
        
        # Ordenar por última atividade (mais recente primeiro)
        query = query.order_by(desc(ChatRoom.created_at))
        
        # Paginação
        total_count = query.count()
        rooms = query.offset(offset).limit(limit).all()
        
        # Montar resposta com informações adicionais
        rooms_data = []
        for room in rooms:
            # Determinar o outro participante
            other_user_id = room.seller_id if room.buyer_id == user_id else room.buyer_id
            
            # Buscar dados do outro usuário
            other_user = db.query(User).filter(User.id == other_user_id).first()
            other_user_name = other_user.name if other_user and other_user.name else f"Usuário {str(other_user_id)[:8]}"
            
            # Buscar última mensagem
            last_message = db.query(ChatMessage).filter(
                ChatMessage.chat_room_id == str(room.id)
            ).order_by(desc(ChatMessage.created_at)).first()
            
            # Contar mensagens não lidas (mensagens do outro usuário que não foram lidas)
            unread_count = db.query(func.count(ChatMessage.id)).filter(
                ChatMessage.chat_room_id == str(room.id),
                ChatMessage.sender_id == other_user_id,
                ChatMessage.is_read == False
            ).scalar() or 0
            
            rooms_data.append({
                "room_id": str(room.id),
                "match_id": str(room.match_id) if room.match_id else None,
                "is_active": room.is_active,
                "created_at": room.created_at.isoformat() if room.created_at else None,
                "closed_at": room.closed_at.isoformat() if room.closed_at else None,
                "other_user": {
                    "id": str(other_user_id),
                    "name": other_user_name,
                    "avatar": getattr(other_user, 'avatar', None),
                },
                "last_message": {
                    "content": last_message.content[:100] if last_message else None,
                    "sender_id": str(last_message.sender_id) if last_message else None,
                    "created_at": last_message.created_at.isoformat() if last_message else None,
                    "is_own": str(last_message.sender_id) == user_id if last_message else False,
                    "message_type": last_message.message_type.value if last_message else None,
                } if last_message else None,
                "unread_count": unread_count,
            })
        
        return {
            "success": True,
            "rooms": rooms_data,
            "total": total_count,
            "has_more": (offset + limit) < total_count
        }
        
    except Exception as e:
        logger.error(f"Failed to get user chat rooms: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-total")
async def get_total_unread_messages(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obter total de mensagens não lidas em todas as salas do usuário.
    Útil para exibir badge no ícone de chat.
    """
    try:
        from app.models.chat import ChatRoom, ChatMessage
        from app.models.user import User
        from sqlalchemy import func, or_
        
        user_id = str(current_user.id)
        
        # Subquery para encontrar todas as salas do usuário
        user_rooms = db.query(ChatRoom.id).filter(
            or_(
                ChatRoom.buyer_id == user_id,
                ChatRoom.seller_id == user_id
            ),
            ChatRoom.is_active == True
        ).subquery()
        
        # Para cada sala, contar mensagens não lidas do outro usuário
        # Precisamos fazer um join mais complexo para saber quem é o "outro" em cada sala
        
        # Alternativa mais simples: buscar todas as salas e calcular
        rooms = db.query(ChatRoom).filter(
            or_(
                ChatRoom.buyer_id == user_id,
                ChatRoom.seller_id == user_id
            ),
            ChatRoom.is_active == True
        ).all()
        
        total_unread = 0
        rooms_with_unread = []
        
        for room in rooms:
            other_user_id = str(room.seller_id) if str(room.buyer_id) == user_id else str(room.buyer_id)
            
            unread = db.query(func.count(ChatMessage.id)).filter(
                ChatMessage.chat_room_id == str(room.id),
                ChatMessage.sender_id == other_user_id,
                ChatMessage.is_read == False
            ).scalar() or 0
            
            if unread > 0:
                total_unread += unread
                rooms_with_unread.append({
                    "room_id": str(room.id),
                    "unread_count": unread
                })
        
        return {
            "success": True,
            "total_unread": total_unread,
            "rooms_with_unread": rooms_with_unread
        }
        
    except Exception as e:
        logger.error(f"Failed to get total unread messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/p2p/order/{order_id}/start-chat")
async def start_chat_from_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # Retorna objeto User, não dict
):
    """
    Iniciar chat P2P a partir de uma ordem.
    Cria o match e o chat room automaticamente se não existirem.
    """
    try:
        from app.models.p2p import P2POrder, P2PMatch  # Modelo corrigido com UUID e campos certos
        from app.models.chat import ChatRoom
        from uuid import UUID
        from datetime import datetime, timedelta
        import json as json_lib
        
        # current_user é um objeto User, acessar com .id
        user_id = str(current_user.id)
        logger.info(f"🔄 [Chat] Iniciando chat para ordem {order_id}, usuário {user_id}")
        
        # Buscar a ordem
        try:
            order_uuid = UUID(order_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid order ID format")
        
        order = db.query(P2POrder).filter(P2POrder.id == order_uuid).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_owner_id = str(order.user_id)
        current_user_id = str(user_id)
        
        # Verificar se o usuário não é o dono da ordem
        if order_owner_id == current_user_id:
            raise HTTPException(
                status_code=400, 
                detail="Você não pode conversar consigo mesmo. Aguarde outro usuário interessado."
            )
        
        # Determinar comprador e vendedor baseado no tipo da ordem
        order_type = order.order_type  # Usar order_type ao invés de type
        if order_type == "sell":
            # Dono vende, usuário atual compra
            seller_id = order_owner_id
            buyer_id = current_user_id
        else:
            # Dono compra, usuário atual vende
            buyer_id = order_owner_id
            seller_id = current_user_id
        
        logger.info(f"📊 [Chat] buyer_id={buyer_id}, seller_id={seller_id}")
        
        # Verificar se já existe um match para esta ordem com este usuário
        existing_match = db.query(P2PMatch).filter(
            P2PMatch.buyer_id == UUID(buyer_id),
            P2PMatch.seller_id == UUID(seller_id),
            (P2PMatch.buyer_order_id == order_uuid) | (P2PMatch.seller_order_id == order_uuid)
        ).first()
        
        if existing_match:
            logger.info(f"✅ [Chat] Match existente encontrado: {existing_match.id}")
            match_id = existing_match.id
        else:
            # Criar um novo match
            logger.info(f"🆕 [Chat] Criando novo match...")
            
            # Parsear payment_methods (é JSON string no banco)
            payment_methods_list = []
            if order.payment_methods:
                try:
                    payment_methods_list = json_lib.loads(order.payment_methods)
                except:
                    payment_methods_list = [order.payment_methods]
            
            # Calcular total (price * amount)
            order_price = float(order.price) if order.price else 0
            order_amount = float(order.total_amount) if order.total_amount else 0
            order_total = order_price * order_amount
            
            new_match = P2PMatch(
                buyer_order_id=order_uuid,
                seller_order_id=order_uuid,
                buyer_id=UUID(buyer_id),
                seller_id=UUID(seller_id),
                amount_crypto=order_amount,
                price_brl=order_price,
                total_brl=order_total,
                payment_method=payment_methods_list[0] if payment_methods_list else "pix",
                status="matched",
                expires_at=datetime.utcnow() + timedelta(minutes=order.time_limit or 30)
            )
            
            db.add(new_match)
            db.commit()
            db.refresh(new_match)
            match_id = new_match.id
            logger.info(f"✅ [Chat] Match criado: {match_id}")
        
        # Verificar se já existe chat room para este match
        existing_room = db.query(ChatRoom).filter(ChatRoom.match_id == match_id).first()
        
        if existing_room:
            logger.info(f"✅ [Chat] Chat room existente: {existing_room.id}")
            return {
                "success": True,
                "chat_room": {
                    "id": str(existing_room.id),
                    "match_id": str(match_id),
                    "buyer_id": buyer_id,
                    "seller_id": seller_id,
                    "is_active": existing_room.is_active
                },
                "message": "Chat room already exists"
            }
        
        # Criar o chat room
        result = await chat_service.create_chat_room(db, str(match_id), buyer_id, seller_id)
        
        logger.info(f"✅ [Chat] Chat room criado com sucesso")
        
        return {
            "success": True,
            "chat_room": result.get("chat_room"),
            "message": "Chat started successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [Chat] Erro ao iniciar chat: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rooms/{chat_room_id}/upload")
async def upload_file(
    chat_room_id: str,
    file: UploadFile = File(...),
    message_content: Optional[str] = Form(""),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # Retorna User object
):
    """Upload de arquivo (comprovante de pagamento)"""
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
    current_user = Depends(get_current_user)  # Retorna objeto User
):
    """Obter histórico do chat"""
    try:
        result = await chat_service.get_chat_history(
            db,
            chat_room_id,
            str(current_user.id),  # Usar .id ao invés de ["user_id"]
            limit
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to get chat history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rooms/{chat_room_id}/read")
async def mark_messages_as_read(
    chat_room_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Marcar todas as mensagens de uma sala como lidas.
    Marca apenas as mensagens enviadas pelo outro usuário.
    """
    try:
        from app.models.chat import ChatRoom, ChatMessage
        from sqlalchemy import and_
        
        user_id = str(current_user.id)
        
        # Verificar se a sala existe e o usuário tem acesso
        chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
        if not chat_room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        if user_id not in [str(chat_room.buyer_id), str(chat_room.seller_id)]:
            raise HTTPException(status_code=403, detail="Unauthorized access to chat room")
        
        # Determinar o ID do outro usuário
        other_user_id = str(chat_room.seller_id) if str(chat_room.buyer_id) == user_id else str(chat_room.buyer_id)
        
        # Atualizar mensagens não lidas do outro usuário
        updated_count = db.query(ChatMessage).filter(
            and_(
                ChatMessage.chat_room_id == chat_room_id,
                ChatMessage.sender_id == other_user_id,
                ChatMessage.is_read == False
            )
        ).update({"is_read": True})
        
        db.commit()
        
        logger.info(f"✅ Marked {updated_count} messages as read in room {chat_room_id}")
        
        return {
            "success": True,
            "messages_marked": updated_count,
            "room_id": chat_room_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark messages as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms/{chat_room_id}/unread-count")
async def get_unread_count(
    chat_room_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obter contagem de mensagens não lidas em uma sala.
    """
    try:
        from app.models.chat import ChatRoom, ChatMessage
        from sqlalchemy import func
        
        user_id = str(current_user.id)
        
        # Verificar acesso
        chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
        if not chat_room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        if user_id not in [str(chat_room.buyer_id), str(chat_room.seller_id)]:
            raise HTTPException(status_code=403, detail="Unauthorized access")
        
        # Contar mensagens não lidas do outro usuário
        other_user_id = str(chat_room.seller_id) if str(chat_room.buyer_id) == user_id else str(chat_room.buyer_id)
        
        unread_count = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.chat_room_id == chat_room_id,
            ChatMessage.sender_id == other_user_id,
            ChatMessage.is_read == False
        ).scalar() or 0
        
        return {
            "success": True,
            "unread_count": unread_count,
            "room_id": chat_room_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get unread count: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms/{chat_room_id}/search")
async def search_messages(
    chat_room_id: str,
    q: str,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Buscar mensagens no histórico de uma sala.
    Retorna mensagens que contêm o termo de busca.
    """
    try:
        from app.models.chat import ChatRoom, ChatMessage
        from app.models.user import User
        
        user_id = str(current_user.id)
        
        # Verificar acesso
        chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
        if not chat_room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        if user_id not in [str(chat_room.buyer_id), str(chat_room.seller_id)]:
            raise HTTPException(status_code=403, detail="Unauthorized access")
        
        # Buscar mensagens que contêm o termo
        messages = db.query(ChatMessage).filter(
            ChatMessage.chat_room_id == chat_room_id,
            ChatMessage.content.ilike(f"%{q}%")
        ).order_by(ChatMessage.created_at.desc()).limit(limit).all()
        
        # Formatar resultados
        results = []
        for msg in messages:
            # Buscar nome do sender
            sender = db.query(User).filter(User.id == msg.sender_id).first()
            sender_name = sender.name if sender else "Usuário"
            
            results.append({
                "id": str(msg.id),
                "content": msg.content,
                "sender_id": str(msg.sender_id),
                "sender_name": sender_name,
                "is_own": str(msg.sender_id) == user_id,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "message_type": msg.message_type.value if msg.message_type else "text",
            })
        
        logger.info(f"🔍 Search found {len(results)} messages for '{q}' in room {chat_room_id}")
        
        return {
            "success": True,
            "query": q,
            "results": results,
            "count": len(results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to search messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rooms/{chat_room_id}/messages/{message_id}")
async def edit_message(
    chat_room_id: str,
    message_id: str,
    content: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Editar uma mensagem própria.
    Só é possível editar mensagens enviadas pelo próprio usuário.
    """
    try:
        from app.models.chat import ChatRoom, ChatMessage
        from datetime import datetime
        
        user_id = str(current_user.id)
        
        # Verificar acesso à sala
        chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
        if not chat_room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        if user_id not in [str(chat_room.buyer_id), str(chat_room.seller_id)]:
            raise HTTPException(status_code=403, detail="Unauthorized access")
        
        # Buscar a mensagem
        message = db.query(ChatMessage).filter(
            ChatMessage.id == message_id,
            ChatMessage.chat_room_id == chat_room_id
        ).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Verificar se é o autor da mensagem
        if str(message.sender_id) != user_id:
            raise HTTPException(status_code=403, detail="You can only edit your own messages")
        
        # Verificar se é mensagem de sistema
        if message.is_system_message:
            raise HTTPException(status_code=400, detail="Cannot edit system messages")
        
        # Atualizar a mensagem
        old_content = message.content
        message.content = content
        message.edited_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"✏️ Message {message_id} edited by user {user_id}")
        
        # Notificar via WebSocket se o outro usuário estiver online
        # (implementar broadcast de edição)
        
        return {
            "success": True,
            "message": {
                "id": str(message.id),
                "content": message.content,
                "edited_at": message.edited_at.isoformat(),
                "old_content": old_content
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to edit message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rooms/{chat_room_id}/messages/{message_id}")
async def delete_message(
    chat_room_id: str,
    message_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Deletar uma mensagem própria.
    A mensagem não é removida do banco, apenas marcada como deletada.
    """
    try:
        from app.models.chat import ChatRoom, ChatMessage
        from datetime import datetime
        
        user_id = str(current_user.id)
        
        # Verificar acesso à sala
        chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
        if not chat_room:
            raise HTTPException(status_code=404, detail="Chat room not found")
        
        if user_id not in [str(chat_room.buyer_id), str(chat_room.seller_id)]:
            raise HTTPException(status_code=403, detail="Unauthorized access")
        
        # Buscar a mensagem
        message = db.query(ChatMessage).filter(
            ChatMessage.id == message_id,
            ChatMessage.chat_room_id == chat_room_id
        ).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Verificar se é o autor da mensagem
        if str(message.sender_id) != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own messages")
        
        # Verificar se é mensagem de sistema
        if message.is_system_message:
            raise HTTPException(status_code=400, detail="Cannot delete system messages")
        
        # Soft delete - substituir conteúdo
        message.content = "[Mensagem apagada]"
        message.edited_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"🗑️ Message {message_id} deleted by user {user_id}")
        
        return {
            "success": True,
            "message_id": message_id,
            "deleted": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disputes/create")
async def create_dispute(
    match_id: str = Form(...),
    reason: str = Form(...),
    evidence_messages: List[str] = Form(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # Retorna User object
):
    """Criar disputa com taxa (R$ 25) - Fonte de receita"""
    try:
        result = await chat_service.create_dispute_with_fee(
            db,
            match_id,
            str(current_user.id),
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
    current_user = Depends(get_current_user)  # Retorna User object
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
    current_user = Depends(get_current_user)  # Retorna User object
):
    """Enviar mensagem do sistema (admin apenas)"""
    try:
        # Verificar se usuário é admin
        if not getattr(current_user, 'is_admin', False):
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
    current_user = Depends(get_current_user)  # Retorna User object
):
    """Analytics de receita gerada pelo chat"""
    try:
        # Verificar se usuário é admin
        if not getattr(current_user, 'is_admin', False):
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
