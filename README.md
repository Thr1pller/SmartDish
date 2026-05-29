# 📘 SmartDish (Кулінарний Асистент, FoodTech Web App)

> Інтерактивний вебзастосунок для генерації, збереження та розумного планування кулінарних рецептів з використанням штучного інтелекту.

---

## 👤 Автор

- **ПІБ**: Константінов Микита Сергійович
- **Група**: ФЕП-42
- **Керівник**: Мисюк Роман, PhD, доцент
- **Дата виконання**: [27.05.2026]

---

## 📌 Загальна інформація

- **Тип проєкту**: Веб-застосунок
- **Мова програмування**: Python (Backend), JavaScript (Frontend)
- **Фреймворки / Бібліотеки**: FastAPI, SQLAlchemy, Alembic, Pydantic, Passlib
- **База даних**: PostgreSQL

---

## 🧠 Опис функціоналу

- 🔐 Реєстрація та авторизація користувачів (JWT, OAuth 2.0 Google, 2FA/TOTP)
- 🗒️ Створення, редагування, перегляд та видалення рецептів
- 🤖 Інтелектуальна генерація нових страв за текстовим запитом (OpenAI API)
- 📅 Календар для планування розкладу прийомів їжі
- 🌐 Асинхронний REST API для взаємодії між клієнтом та сервером

---

## 🧱 Опис основних класів / файлів

| Клас / Файл     | Призначення |
|----------------|-------------|
| `backend/main.py` | Точка входу FastAPI сервера та налаштування роутів |
| `backend/app/services/ai_service.py` | Сервіс взаємодії з алгоритмами OpenAI API |
| `backend/app/models/models.py` | ORM-моделі структури бази даних PostgreSQL |
| `frontend/js/app.js` | Основна логіка клієнтської частини та HTTP-запити |
| `frontend/js/timeManager.js` | Логіка обробки календаря та планувальника |

---

## ▶️ Як запустити проєкт "з нуля"

### 1. Встановлення інструментів

- Python v3.12
- СУБД PostgreSQL (запущена локально)
- Розширення Live Server (у Visual Studio Code для фронтенду)

### 2. Клонування репозиторію

```bash
git clone [https://github.com/Thr1pller/SmartDish.git](https://github.com/Thr1pller/SmartDish.git)
cd recipe-web-app
```

### 3. Встановлення залежностей (Backend)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
alembic upgrade head
```

### 4. Створення `.env` файлів

Створіть файл `.env` у папці `backend/`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/recipes_db
OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=supersecretkey_for_tokens
```

### 5. Запуск

```bash
# Backend (з папки backend)
uvicorn app.main:app --reload

# Frontend
# Відкрийте папку frontend у VS Code та запустіть index.html за допомогою Live Server
```

---

## 🔌 API приклади

### 🔐 Авторизація

**POST /api/auth/login**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer"
}
```

---

### 📋 ШІ-Генерація рецепта

**POST /api/ai/generate**
*(Потребує Authorization: Bearer token)*

```json
{
  "prompt": "Зроби мені легкий сніданок з яєць та авокадо"
}
```

**Response:**

```json
{
  "title": "Авокадо-тост з яйцем пашот",
  "category": "Сніданок",
  "prep_time": "15 хвилин",
  "ingredients": ["Яйце - 2 шт.", "Авокадо - 1 шт.", "Хліб - 2 скибочки"]
}
```

---

## 🖱️ Інструкція для користувача

1. **Головна сторінка**:
   - `Увійти / Зареєструватись` — класична авторизація або вхід через Google акаунт.
2. **Після авторизації**:
   - Панель рецептів дозволяє переглядати власні страви або генерувати нові за допомогою ШІ.
   - Кнопка додавання у розклад дозволяє прив'язати рецепт до конкретної дати у календарі.
3. **Налаштування безпеки**:
   - У профілі доступна прив'язка акаунта до мобільного автентифікатора (2FA) за QR-кодом.
4. **Вихід**:
   - Кнопка `Вийти` безпечно очищує локальні дані та завершує сесію.

---

## 📷 Приклади / скриншоти

**Головний екран авторизації**
![Екран входу](screenshots/login.jpg)

**Панель згенерованих рецептів**
![Рецепти](screenshots/recipes_1.jpg)
![Рецепти](screenshots/recipes_2.jpg)

**Інтерактивний календар планування**
![Календар](screenshots/calendar.png)
*(Зображення збережено у репозиторії в директорії `/screenshots/`)*

---

## 🧪 Проблеми і рішення

| Проблема              | Рішення                            |
|----------------------|------------------------------------|
| CORS помилка         | Переконатися, що фронтенд запущено через Live Server, а у `main.py` налаштовано `CORSMiddleware` |
| Помилка підключення БД| Перевірити правильність логіна/пароля у змінній `DATABASE_URL` файлу `.env` |
| 401 Unauthorized     | Перевірити наявність та термін дії JWT-токена у заголовку запиту |
| OpenAI API Error     | Переконатися у правильності ключа `OPENAI_API_KEY` та наявності балансу на акаунті |

---

## 🧾 Використані джерела / література

- Офіційна документація FastAPI (https://fastapi.tiangolo.com/)
- Документація SQLAlchemy 2.0
- Документація OpenAI API
- MDN Web Docs (JavaScript, HTML, CSS)