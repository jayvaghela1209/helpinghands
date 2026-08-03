import os
from enum import Enum
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Config
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:postgres@localhost:5432/sahayog"
)

# Supabase Config
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "placeholder-anon-key")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-key")

# Port config
PORT = int(os.getenv("PORT", "8000"))

# Role Definitions
class UserRole(str, Enum):
    volunteer = "volunteer"
    ngo = "ngo"
    corporate = "corporate"
    admin = "admin"
