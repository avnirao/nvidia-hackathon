import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # OpenAI/LLM Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "nvcf:nvidia/llama-3.3-nemotron-super-49b-v1:dep-30TsBb3KoVg58JQ8ecWCUnomgLN")
    
    # Attention Monitoring Thresholds
    ATTENTION_THRESHOLD_SECONDS: int = int(os.getenv("ATTENTION_THRESHOLD_SECONDS", "300"))  # 5 minutes
    DISTRACTION_THRESHOLD_SECONDS: int = int(os.getenv("DISTRACTION_THRESHOLD_SECONDS", "120"))  # 2 minutes
    
    # Model Parameters
    TEMPERATURE: float = 0.2
    TOP_P: float = 0.7
    MAX_TOKENS: int = 1024
    
    # Application Settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings() 