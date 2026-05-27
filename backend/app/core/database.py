import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Завантажуємо змінні з .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Створюємо асинхронний двигунець
engine = create_async_engine(DATABASE_URL, echo=True)

# Фабрика сесій для взаємодії з БД
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

# Базовий клас для наших майбутніх моделей
Base = declarative_base()

# Залежність (Dependency) для FastAPI, яка видає сесію на час запиту
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session