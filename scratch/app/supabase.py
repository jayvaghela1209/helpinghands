import httpx
from app.config import SUPABASE_URL, SUPABASE_ANON_KEY

class SupabaseConfig:
    def __init__(self, url: str, anon_key: str):
        self.url = url
        self.anon_key = anon_key
        self.headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}"
        }

    def get_client_headers(self):
        """Returns default headers for Supabase calls."""
        return self.headers

    def get_rest_url(self, path: str = "") -> str:
        """Returns the REST endpoint URL for a given path."""
        base = f"{self.url}/rest/v1"
        if path:
            return f"{base}/{path.lstrip('/')}"
        return base

    def get_async_client(self) -> httpx.AsyncClient:
        """Returns an async HTTP client configured for Supabase requests."""
        return httpx.AsyncClient(
            headers=self.headers,
            timeout=10.0
        )

# Initialize global configuration singleton
supabase_client_config = SupabaseConfig(SUPABASE_URL, SUPABASE_ANON_KEY)
