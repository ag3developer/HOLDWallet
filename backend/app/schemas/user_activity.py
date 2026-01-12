"""
Schemas para User Activity
"""
from pydantic import BaseModel, Field, field_serializer
from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from uuid import UUID


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
    user_id: Union[str, UUID]  # Aceita tanto string quanto UUID
    timestamp: datetime
    
    @field_serializer('user_id')
    def serialize_user_id(self, v):
        """Serializa UUID para string na resposta"""
        if isinstance(v, UUID):
            return str(v)
        return str(v) if v else v
    
    class Config:
        from_attributes = True


class UserActivityListResponse(BaseModel):
    """Schema para lista de atividades"""
    total: int = Field(..., description="Total de atividades")
    activities: List[UserActivityResponse] = Field(..., description="Lista de atividades")
    
    class Config:
        from_attributes = True
