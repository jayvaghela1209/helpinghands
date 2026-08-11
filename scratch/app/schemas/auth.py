from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID
import re

from app.config import UserRole

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole
    name: str = Field(..., max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    city: Optional[str] = Field(None, max_length=100)
    
    # Volunteer specific fields
    skill_tags: Optional[List[str]] = []
    
    # NGO specific fields
    organization_name: Optional[str] = Field(None, max_length=200)
    registration_number: Optional[str] = Field(None, max_length=9)
    darpan_id: Optional[str] = Field(None, max_length=16)
    pan_number: Optional[str] = Field(None, max_length=10)
    focus_areas: Optional[List[str]] = []
    
    # Corporate specific fields
    company_name: Optional[str] = Field(None, max_length=200)
    cin_number: Optional[str] = Field(None, max_length=21)
    csr_focus_areas: Optional[List[str]] = []

    @field_validator('registration_number')
    @classmethod
    def validate_registration_number(cls, v):
        if v and not re.fullmatch(r'\d{1,9}', v):
            raise ValueError('Registration number must contain maximum 9 numeric digits only.')
        return v

    @field_validator('darpan_id')
    @classmethod
    def validate_darpan_id(cls, v):
        if v and (len(v) < 14 or len(v) > 16):
            raise ValueError('NGO Darpan ID must be between 14 and 16 characters.')
        return v

    @field_validator('pan_number')
    @classmethod
    def validate_pan_number(cls, v):
        if v and len(v) != 10:
            raise ValueError('PAN number must be exactly 10 characters.')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    role: UserRole
    name: str
    email: EmailStr
    phone: Optional[str]
    city: Optional[str]
    created_at: datetime
    organization_name: Optional[str] = None
    company_name: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    user: UserResponse
    profile: Optional[dict] = None
