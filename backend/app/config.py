from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # Google Gemini
    google_api_key: str = ""
    default_llm_model: str = "gemini-3.6-flash" 

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"

    # RAG
    default_chunk_size: int = 1000
    default_chunk_overlap: int = 200
    default_top_k: int = 5
    default_temperature: float = 0.3

    # Storage
    upload_dir: str = "app/storage/uploads"
    faiss_dir: str = "app/storage/faiss_index"
    data_dir: str = "app/storage"

    # CORS
    frontend_origin: str = "http://localhost:3000"

    # Uploads
    max_upload_size_mb: int = 50

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
Path(settings.faiss_dir).mkdir(parents=True, exist_ok=True)
Path(settings.data_dir).mkdir(parents=True, exist_ok=True)