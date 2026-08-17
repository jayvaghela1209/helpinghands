from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID
import re

from app.config import UserRole

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
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

    @field_validator('password', mode='before')
    @classmethod
    def validate_password(cls, v):
        if v is None:
            return v
        v = str(v)
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters and contain at least one uppercase letter and one special character.')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must be at least 8 characters and contain at least one uppercase letter and one special character.')
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', v):
            raise ValueError('Password must be at least 8 characters and contain at least one uppercase letter and one special character.')
        return v

    @field_validator('name', mode='before')
    @classmethod
    def validate_name(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if not v:
            raise ValueError('Name cannot be empty or whitespace only.')
        if re.search(r'\d', v):
            raise ValueError('Name must not contain digits.')
        if re.fullmatch(r'[^\w\s\'-]', v, re.UNICODE):
            raise ValueError('Name must not be only special characters.')
        return v

    @field_validator('city', mode='before')
    @classmethod
    def validate_city(cls, v):
        if v is None or v == '':
            return v
        allowed_cities = [
            'Ahmedabad', 'Bengaluru', 'Bhopal', 'Bhubaneswar', 'Chandigarh',
            'Chennai', 'Delhi', 'Hyderabad', 'Indore', 'Jaipur',
            'Kochi', 'Kolkata', 'Lucknow', 'Mumbai', 'Nagpur',
            'Patna', 'Pune', 'Surat', 'Vadodara', 'Visakhapatnam'
        ]
        if v not in allowed_cities:
            raise ValueError(f'Please select a valid city.')
        return v

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == '':
            return v
        v = str(v).strip()
        if v and not re.fullmatch(r'^[6-9][0-9]{9}$', v):
            raise ValueError('Phone number must be exactly 10 digits starting with 6, 7, 8, or 9.')
        return v

    @field_validator('registration_number', mode='before')
    @classmethod
    def validate_registration_number(cls, v):
        if v is None or v == '':
            return v
        v = str(v).strip()
        if v and not re.fullmatch(r'\d{1,9}', v):
            raise ValueError('Registration number must contain maximum 9 numeric digits only.')
        return v

    @field_validator('darpan_id', mode='before')
    @classmethod
    def validate_darpan_id(cls, v):
        if v is None or v == '':
            return v
        v = str(v).strip().upper()
        if v and not re.fullmatch(r'^[A-Z]{2}/[0-9]{4}/[0-9]{7}$', v):
            raise ValueError('Enter a valid NGO DARPAN ID, e.g. GJ/2017/0168501.')
        return v

    @field_validator('pan_number', mode='before')
    @classmethod
    def validate_pan_number(cls, v):
        if v is None or v == '':
            return v
        v = str(v).strip().upper()
        if v and not re.fullmatch(r'^[A-Z]{5}[0-9]{4}[A-Z]$', v):
            raise ValueError('PAN number must be 10 characters in format like AACTS0036Q.')
        return v

    @field_validator('cin_number', mode='before')
    @classmethod
    def validate_cin_number(cls, v):
        if v is None or v == '':
            return v
        v = str(v).strip().upper()
        if v and not re.fullmatch(r'^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$', v):
            raise ValueError('Enter a valid 21-character CIN, e.g. U74999MH2000PTC123456.')
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
