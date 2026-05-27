import asyncio
from app.core.database import engine, Base
from app.models.models import Recipe

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("База даних успішно ініціалізована!")

if __name__ == "__main__":
    asyncio.run(init_models())