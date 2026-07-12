from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime
from uuid import UUID

class UserRole(str, Enum):
    volunteer = "volunteer"
    ngo = "ngo"
    corporate = "corporate"
    admin = "admin"

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
    org_name: Optional[str] = Field(None, max_length=200)
    registration_no: Optional[str] = Field(None, max_length=100)
    darpan_id: Optional[str] = Field(None, max_length=100)
    pan_number: Optional[str] = Field(None, max_length=20)
    focus_areas: Optional[List[str]] = []
    
    # Corporate specific fields
    company_name: Optional[str] = Field(None, max_length=200)
    cin_number: Optional[str] = Field(None, max_length=50)
    csr_focus_areas: Optional[List[str]] = []

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

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    user: UserResponse
    profile: Optional[dict] = None
