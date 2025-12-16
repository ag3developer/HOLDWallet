"""
Schemas para User Activity
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List


class UserActivityBase(BaseModel):
    """Schema base para atividade"""
    activity_type: str = Field(..., description="Tipo de atividade (login, trade, security, etc)")
    description: str = Field(..., description="Descrição da atividade")
    status: str = Field(default="success", description="Status da atividade")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Metadados adicionais")
    ip_address: Optional[str] = Field(None, description="Endereço IP")
    user_agent: Optional[str] = Field(None, description="User agent do navegador")


class UserActivityCreate(UserActivityBase):
    """Schema para criar nova atividade"""
    pass


class UserActivityResponse(UserActivityBase):
    """Schema para resposta de atividade"""
    id: int
    user_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class UserActivityListResponse(BaseModel):
    """Schema para lista de atividades"""
    total: int = Field(..., description="Total de atividades")
    activities: List[UserActivityResponse] = Field(..., description="Lista de atividades")
    
    class Config:
        from_attributes = True
