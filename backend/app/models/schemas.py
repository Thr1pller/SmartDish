from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class RecipeBase(BaseModel):
    name: str
    time_cooking: str
    ingredients: str
    quantity: int
    category: str

# Схема для створення рецепта - отримуємо від клієнта
class RecipeCreate(RecipeBase):
    pass

# Схема для відповіді - повертаємо клієнту
class RecipeResponse(RecipeBase):
    id: int

# --- Схеми для Планувальника (Календаря) ---
class ScheduleBase(BaseModel):
    meal_type: str
    recipe_id: int
    scheduled_at: datetime

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleResponse(ScheduleBase):
    id: int
    recipe_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- СХЕМИ ДЛЯ АВТОРИЗАЦІЇ ---

class UserCreate(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    nickname: Optional[str] = None # Додали сюди

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None