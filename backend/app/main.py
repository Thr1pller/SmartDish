from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import select, delete, cast, Date, or_
from pydantic import BaseModel
from datetime import date, datetime, timezone, timedelta
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import Recipe, User
from app.models.schemas import RecipeCreate, RecipeResponse, UserCreate, UserResponse, Token, UserUpdate
from app.services.ai_service import generate_recipe_from_ai
from app.models.models import Schedule
from app.models.schemas import ScheduleCreate, ScheduleResponse

from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from app.core.security import get_password_hash, verify_password, create_access_token

from fastapi.responses import RedirectResponse
import httpx, os

from jose import JWTError, jwt
import pyotp
from app.services.auth_service import generate_2fa_secret, generate_qr_code

app = FastAPI(title="Кулінарний ШІ-Асистент API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ping")
async def ping():
    return {"message": "Бек воркает"}

# Авторизація
@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # 1. Перевіряємо, чи не зайнятий email
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalars().first()
    if db_user:
        raise HTTPException(status_code=400, detail="Користувач існує")
    
    hashed_pw = get_password_hash(user.password)
    
    new_user = User(email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

class Verify2FALogin(BaseModel):
    email: str
    code: str

@app.post("/api/auth/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Невірний email або пароль")
    
    # --- УЛЬТИМАТИВНАЯ ПРОВЕРКА: длина ключа > 10 символов ---
    if user.two_factor_secret and len(str(user.two_factor_secret).strip()) > 10:
        return {"access_token": "2fa_required", "token_type": "bearer", "email": user.email}
    
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=30))
    return {"access_token": access_token, "token_type": "bearer"}

# --- НОВИЙ ЕНДПОІНТ ДЛЯ ПЕРЕВІРКИ КОДУ ПРИ ВХОДІ ---
@app.post("/api/auth/login/2fa")
async def verify_login_2fa(data: Verify2FALogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    
    if not user or not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Помилка 2FA")
        
    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(data.code):
        access_token = create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    else:
        raise HTTPException(status_code=400, detail="Невірний код 2FA")

# --- GOOGLE OAUTH 2.0 ---
@app.get("/api/auth/google/login")
async def google_login():
    """1. Перенаправляє користувача на сторінку згоди Google"""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = "http://127.0.0.1:8000/api/auth/google/callback"
    scope = "openid email profile"
    
    google_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&client_id={client_id}&"
        f"redirect_uri={redirect_uri}&scope={scope}&prompt=select_account"
    )
    return RedirectResponse(google_url)

@app.get("/api/auth/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = "http://127.0.0.1:8000/api/auth/google/callback"

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
        )
        token_data = token_res.json()
        google_access_token = token_data.get("access_token")

        if not google_access_token:
            raise HTTPException(status_code=400, detail="Не вдалося отримати токен від Google")

        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"}
        )
        user_info = user_res.json()

    email = user_info.get("email")
    name = user_info.get("name")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user:
        user = User(email=email, nickname=name, hashed_password="google_oauth_dummy_pass")
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # --- УЛЬТИМАТИВНАЯ ПРОВЕРКА: длина ключа > 10 символов ---
    if user.two_factor_secret and len(str(user.two_factor_secret).strip()) > 10:
        frontend_redirect_url = f"http://127.0.0.1:5500/frontend/index.html?status=2fa_required&email={email}"
        return RedirectResponse(frontend_redirect_url)
    
    access_token_expires = timedelta(minutes=30)
    local_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)

    frontend_redirect_url = f"http://127.0.0.1:5500/frontend/index.html?token={local_token}&email={email}"
    return RedirectResponse(frontend_redirect_url)


# ==========================================
# --- РОБОТА З ПРОФІЛЕМ КОРИСТУВАЧА ---
# ==========================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = "mega_super_secret_diploma_key" 
ALGORITHM = "HS256"

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    """Функція, яка дістає email з токена і знаходить юзера в БД"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не вдалося перевірити токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/api/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Отримати дані поточного користувача"""
    return current_user

@app.patch("/api/users/me", response_model=UserResponse)
async def update_user_me(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Оновити налаштування профілю"""
    if user_update.nickname:
        current_user.nickname = user_update.nickname
        
    if user_update.email and user_update.email != current_user.email:
        # Перевіряємо, чи не зайнятий новий email кимось іншим
        result = await db.execute(select(User).where(User.email == user_update.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Цей Email вже зайнятий іншим користувачем")
        current_user.email = user_update.email
        
    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)
        
    await db.commit()
    await db.refresh(current_user)
    return current_user
# ==========================================


# Схема для запиту до ШІ
class AIPrompt(BaseModel):
    prompt: str

# 1. Ендпоінт для генерації та збереження рецепта через ШІ
@app.post("/api/ai/generate", response_model=RecipeResponse)
async def generate_and_save_recipe(request: AIPrompt, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        ai_data = await generate_recipe_from_ai(request.prompt)
        new_recipe = Recipe(
            name=ai_data.get("name", "Невідома страва"),
            category=ai_data.get("category", "second_dishes"),
            time_cooking=ai_data.get("time_cooking", "30 хв"),
            ingredients=ai_data.get("ingredients", ""),
            quantity=ai_data.get("quantity", 1),
            user_id=current_user.id
        )
        db.add(new_recipe)
        await db.commit()
        await db.refresh(new_recipe)
        return new_recipe
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка генерації: {str(e)}")

# 2. Створення рецепта вручну
@app.post("/api/recipes", response_model=RecipeResponse)
async def create_manual_recipe(recipe: RecipeCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_recipe = Recipe(**recipe.model_dump(), user_id=current_user.id)
    db.add(new_recipe)
    await db.commit()
    await db.refresh(new_recipe)
    return new_recipe

# 3. Отримання тільки своїх рецептів
@app.get("/api/recipes", response_model=list[RecipeResponse])
async def get_all_recipes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recipe).where(Recipe.user_id == current_user.id))
    return result.scalars().all()

# --- Логіка Планувальника (Календаря) ---
# 1. Запланувати страву
@app.post("/api/schedule", response_model=ScheduleResponse)
async def create_schedule(schedule: ScheduleCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_schedule = Schedule(
        meal_type=schedule.meal_type,
        recipe_id=schedule.recipe_id,
        scheduled_at=schedule.scheduled_at,
        user_id=current_user.id
    )
    db.add(new_schedule)
    await db.commit()
    await db.refresh(new_schedule)
    return new_schedule

# 2. Отримати план на конкретну дату
@app.get("/api/schedule/{target_date}", response_model=list[ScheduleResponse])
async def get_schedule_by_date(target_date: date, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        now_utc = datetime.now(timezone.utc)
        await db.execute(delete(Schedule).where(Schedule.scheduled_at < now_utc))
        await db.commit()
    except Exception as e:
        print(f"Фонове очищення бази пропущено: {e}")

    result = await db.execute(
        select(Schedule)
        .where(cast(Schedule.scheduled_at, Date) == target_date, Schedule.user_id == current_user.id)
        .options(selectinload(Schedule.recipe))
    )
    schedules = result.scalars().all()
    
    response_data = []
    for sched in schedules:
        response_data.append(ScheduleResponse(
            id=sched.id,
            meal_type=sched.meal_type,
            recipe_id=sched.recipe_id,
            scheduled_at=sched.scheduled_at,
            recipe_name=sched.recipe.name if sched.recipe else "Невідомий рецепт"
        ))
    return response_data

# --- Логіка Пошуку та Видалення ---
# 1. Пошук рецептів
@app.get("/api/recipes/search", response_model=list[RecipeResponse])
async def search_recipes(keyword: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Recipe).where(
        Recipe.user_id == current_user.id,
        or_(
            Recipe.name.ilike(f"%{keyword}%"),
            Recipe.ingredients.ilike(f"%{keyword}%")
        )
    )
    result = await db.execute(query)
    return result.scalars().all()

# 2. Видалення рецепта
@app.delete("/api/recipes/{recipe_id}")
async def delete_recipe(recipe_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == current_user.id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Рецепт не знайдено або він не ваш")
    await db.delete(recipe)
    await db.commit()
    return {"message": "Рецепт видалено"}

# 3. Видалення запланованої страви з розкладу
@app.delete("/api/schedule/{schedule_id}")
async def delete_schedule(schedule_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id, Schedule.user_id == current_user.id))
    schedule = result.scalars().first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Розклад не знайдено")
    await db.delete(schedule)
    await db.commit()
    return {"message": "Заплановану страву видалено"}

# 4. Оновлення категорії рецепта
@app.patch("/api/recipes/{recipe_id}/category")
async def update_recipe_category(recipe_id: int, category: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id, Recipe.user_id == current_user.id))
    recipe = result.scalars().first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Рецепт не знайдено")
    if category not in ["first_dishes", "second_dishes", "sweets", "drinks"]:
        raise HTTPException(status_code=400, detail="Некоректна категорія")
    recipe.category = category
    await db.commit()
    return {"message": "Категорію успішно оновлено", "new_category": category}

class Verify2FASetup(BaseModel):
    code: str
    secret: str

@app.post("/api/users/me/2fa/enable")
async def enable_2fa(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Генеруємо ключ, не зберігаємо його в базу
    temp_secret = generate_2fa_secret()
    qr_code = generate_qr_code(current_user.email, temp_secret)
    
    # Віддаємо тимчасовий ключ фронтенду
    return {"secret": temp_secret, "qr_code": qr_code}

@app.post("/api/users/me/2fa/verify")
async def verify_2fa(data: Verify2FASetup, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Перевіряємо, чи підходить код до цього тимчасового ключа
    totp = pyotp.TOTP(data.secret)
    if totp.verify(data.code):
        # Зберігаємо ключ у базу назавжди
        current_user.two_factor_secret = data.secret
        await db.commit()
        return {"message": "2FA успішно активовано!"}
    else:
        raise HTTPException(status_code=400, detail="Неправильний код")

@app.get("/api/users/me/2fa/status")
async def check_2fa_status(current_user: User = Depends(get_current_user)):
    secret = current_user.two_factor_secret
    # Повертає True якщо це real key
    is_enabled = bool(secret and len(str(secret).strip()) > 10)
    return {"is_enabled": is_enabled}

# 2. РЯТУВАЛЬНИЙ ЕНДПОІНТ
@app.get("/api/dev/reset-2fa/{email}")
async def reset_2fa_dev(email: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user:
        user.two_factor_secret = None  # Видаляємо зламаний ключ
        await db.commit()
        return {"message": f"2FA для {email} успішно скинуто! Можна заходити без коду."}
    return {"message": "Користувача не знайдено."}