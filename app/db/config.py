from pydantic import BaseSettings, AnyUrl

class DBSettings(BaseSettings):
    database_url: AnyUrl

    class Config:
        env_prefix = "DB_"

settings = DBSettings()