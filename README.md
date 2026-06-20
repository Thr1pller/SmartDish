# 📘 SmartDish (Кулінарний Асистент, FoodTech Web App)

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-009485?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge)
![Alembic](https://img.shields.io/badge/Alembic-5C5C5C?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/postgresql-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)

> Інтерактивний вебзастосунок для генерації, збереження та розумного планування кулінарних рецептів з використанням штучного інтелекту.

---

## 👤 Автор

- **ПІБ**: Константінов Микита Сергійович
- **Група**: ФЕП-42
- **Керівник**: Мисюк Роман, PhD, доцент
- **Дата виконання**: 27.05.2026

---

## 📌 Загальна інформація

- **Тип проєкту**: Вебзастосунок (SPA)
- **Мова програмування**: Python (Backend), JavaScript (Frontend)
- **Фреймворки / Бібліотеки**: FastAPI, SQLAlchemy, Alembic, Pydantic, Passlib, PyOTP, Pytest
- **База даних**: PostgreSQL

---

## 🧠 Опис функціоналу

- 🔐 Реєстрація та багаторівнева авторизація користувачів (JWT, OAuth 2.0 Google, 2FA/TOTP).
- 🗒️ Створення, редагування, фільтрація за категоріями та видалення рецептів.
- 🤖 Інтелектуальна генерація нових страв за текстовим запитом з автоматичною структуризацією у JSON (OpenAI API).
- 📅 Інтерактивний календар для планування розкладу прийомів їжі.
- ⏰ Фонова клієнтська система автоматичних нагадувань про заплановані страви.
- 🌐 Асинхронний REST API для миттєвої взаємодії між клієнтом та сервером.

---

## 🧱 Опис основних класів / файлів

| Клас / Файл      | Призначення |
|----------------|-------------|
| `backend/main.py` | Точка входу FastAPI сервера, налаштування роутів та бізнес-логіки API |
| `backend/app/services/ai_service.py` | Асинхронний сервіс взаємодії з алгоритмами OpenAI API |
| `backend/app/models/models.py` | ORM-моделі реляційної структури бази даних PostgreSQL |
| `backend/tests/test_api.py` | Набір модульних тестів для перевірки безпеки та 2FA алгоритмів |
| `frontend/js/app.js` | Основна логіка клієнтської частини та HTTP-запити (Fetch API) |
| `frontend/js/timeManager.js` | Логіка обробки календаря, планувальника та системи нагадувань |

---

## ▶️ Як запустити проєкт "з нуля"

### 1. Встановлення інструментів

- Python v3.12+
- СУБД PostgreSQL (запущена локально або на VPS)
- Розширення Live Server (у Visual Studio Code для запуску фронтенду)

### 2. Клонування репозиторію

```bash
git clone [https://github.com/Thr1pller/SmartDish.git](https://github.com/Thr1pller/SmartDish.git)
cd recipe-web-app
```

### 3. Встановлення залежностей (Backend)

```bash
cd backend
python -m venv venv
# Активація віртуального середовища (Windows)
venv\Scripts\activate
# Встановлення пакетів
pip install -r requirements.txt
# Застосування міграцій бази даних
alembic upgrade head
```

### 4. Створення `.env` файлів

Створіть файл `.env` у корені папки `backend/`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/recipes_db
OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=supersecretkey_for_tokens
```

### 5. Запуск серверів

```bash
# Backend (з папки backend)
uvicorn app.main:app --reload

# Frontend
# Відкрийте папку frontend у VS Code та запустіть index.html за допомогою Live Server (Порт 5500)
```

### 6. Запуск модульних тестів

Для перевірки працездатності алгоритмів захисту та авторизації виконайте команду:

```bash
cd backend
python -m pytest -v
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

**Response (Успіх):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "token_type": "bearer"
}
```

---

### 📋 ШІ-Генерація рецепта

**POST /api/ai/generate**
*(Потребує Header: Authorization: Bearer <token>)*

```json
{
  "prompt": "Зроби мені легкий сніданок з яєць та авокадо"
}
```

**Response:**

```json
{
  "name": "Авокадо-тост з яйцем пашот",
  "category": "second_dishes",
  "time_cooking": "15 хв",
  "ingredients": "Яйце - 2 шт.\nАвокадо - 1 шт.\nХліб - 2 скибочки",
  "quantity": 1,
  "id": 15,
  "user_id": 2
}
```

---

## 🖱️ Інструкція для користувача

1. **Головна сторінка**:
   - `Увійти / Зареєструватись` — класична авторизація або швидкий вхід через обліковий запис Google.
2. **Після авторизації**:
   - Панель рецептів дозволяє переглядати власні страви, додавати їх вручну або генерувати нові за допомогою ШІ.
   - Кнопка додавання у розклад дозволяє прив'язати рецепт до конкретної дати у календарі (Сніданок, Обід, Вечеря).
3. **Налаштування безпеки**:
   - У профілі доступна прив'язка акаунта до мобільного автентифікатора (наприклад, Google Authenticator) для активації 2FA за допомогою QR-коду.
4. **Вихід**:
   - Кнопка `Вийти` безпечно очищує локальні дані (JWT-токени) та завершує сесію.

---

## 📷 Приклади / скриншоти

**Головний екран авторизації**
![Екран входу](screenshots/login.jpg)

**Налаштування користувача (2FA)**
![Налаштування](screenshots/settings.jpg)

**Панель згенерованих рецептів**
![Рецепти](screenshots/recipes_1.jpg)
![Рецепти](screenshots/recipes_2.jpg)

**Створення/додавання рецептів**
![Створення рецептів](screenshots/create_recipes.jpg)

**Інтерактивний календар планування**
![Календар](screenshots/calendar.jpg)

*(Зображення збережено у репозиторії в директорії `/screenshots/`)*

---

## 🧪 Вирішення типових проблем

| Проблема              | Рішення                                    |
|----------------------|------------------------------------|
| **CORS помилка** | Переконатися, що фронтенд запущено через Live Server, а у `main.py` налаштовано `CORSMiddleware` |
| **Помилка підключення БД**| Перевірити правильність логіна/пароля у змінній `DATABASE_URL` файлу `.env` |
| **401 Unauthorized** | Перевірити наявність та термін дії JWT-токена у заголовку запиту, або правильність введення 2FA коду |
| **OpenAI API Error** | Переконатися у правильності ключа `OPENAI_API_KEY` та наявності коштів на балансі платформи |

---

## 🧾 Використані джерела / технологічний стек

- [Офіційна документація FastAPI](https://fastapi.tiangolo.com/)
- [Документація SQLAlchemy 2.0 (ORM)](https://docs.sqlalchemy.org/)
- [API Documentation OpenAI](https://platform.openai.com/docs/)
- [MDN Web Docs (JavaScript, HTML5, CSS3)](https://developer.mozilla.org/)
- [Pytest Documentation (Модульне тестування)](https://docs.pytest.org/)