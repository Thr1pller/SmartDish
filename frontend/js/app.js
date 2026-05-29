document.addEventListener('DOMContentLoaded', () => {

    // Допоміжна функція: Отримуємо токен, або показуємо помилку
    function getTokenOrShowError(showError = true) {
        const token = localStorage.getItem('access_token');
        if (!token && showError) {
            showToast("Увійдіть в акаунт для цієї дії!", "warning");
        }
        return token;
    }

    // --- Глобальна функція для Toast-сповіщень ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-message ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Плашка сама зникне через 3 секунди
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }

    // --- 1. ЛОГІКА ТЕМИ ---
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggleCheckbox');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // --- 2. ПЕРЕВІРКА АВТОРИЗАЦІЇ ---
    checkAuthState();

    // --- Словник ---
    const translations = {
        ua: {
            mainTitle: "SmartDish",
            testBtn: "Перевірити зв'язок з бекендом",
            aiTitle: "ШІ-Кухар",
            aiPlaceholder: "Наприклад: Напиши рецепт плова з куркою",
            generateBtn: "Згенерувати та зберегти",
            savedRecipesTitle: "Мої збережені рецепти",
            loadRecipesBtn: "Завантажити рецепти з бази",
            time: "Час приготування",
            ingredientsCount: "Кількість інгредієнтів",
            ingredientsTitle: "Інгредієнти",
            emptyDb: "Рецептів поки немає. База даних порожня.",
            errorLoad: "Не вдалося завантажити дані з сервера.",
            aiThinking: "ШІ думає... Це може зайняти пару секунд ⏳",
            aiEmptyPrompt: "Будь ласка, введи запит!",
            aiError: "Відбулася помилка при генерації.",
            plannerTitle: "Календар планування",
            planBtnText: "Запланувати",
            scheduleSubtitle: "Розклад на обраний день:",
            emptySchedule: "На цей день нічого не заплановано.",
            selectRecipe: "Оберіть рецепт...",
            manualTitle: "Додати рецепт вручну",
            saveManualBtn: "Зберегти рецепт",
            manualSuccess: "Рецепт успішно збережено в базу!",
            manualFieldsError: "Будь ласка, заповніть усі поля коректно!",
            labelNotificationTime: "Час нагадування:",
            pushTitle: "Час готувати! 🍳",
            pushBody: "Настав час для: {meal}. Страва: {recipe}!",
            categories: {
                first_dishes: "🥣 Перші страви",
                second_dishes: "🍝 Другі страви",
                sweets: "🍰 Десерти",
                drinks: "🍹 Напої"
            },
            mealTypes: {
                breakfast: "🍳 Сніданок",
                lunch: "🍲 Обід",
                dinner: "🥗 Вечеря"
            }
        },
        en: {
            mainTitle: "SmartDish",
            testBtn: "Check Connection with Backend",
            aiTitle: "AI Chef",
            aiPlaceholder: "E.g.: Write a recipe for chicken pilaf",
            generateBtn: "Generate and Save",
            savedRecipesTitle: "My Saved Recipes",
            loadRecipesBtn: "Load Recipes from Database",
            time: "Cooking time",
            ingredientsCount: "Ingredients count",
            ingredientsTitle: "Ingredients",
            emptyDb: "No recipes found. The database is empty.",
            errorLoad: "Failed to load data from server.",
            aiThinking: "AI is thinking... This might take a few seconds ⏳",
            aiEmptyPrompt: "Please enter a prompt!",
            aiError: "An error occurred during generation.",
            plannerTitle: "Meal Planner",
            planBtnText: "Schedule",
            scheduleSubtitle: "Schedule for selected day:",
            emptySchedule: "Nothing scheduled for this day.",
            selectRecipe: "Select a recipe...",
            manualTitle: "Add Recipe Manually",
            saveManualBtn: "Save Recipe",
            manualSuccess: "Recipe successfully saved to database!",
            manualFieldsError: "Please fill in all fields correctly!",
            labelNotificationTime: "Notification Time:",
            pushTitle: "Time to cook! 🍳",
            pushBody: "It's time for: {meal}. Dish: {recipe}!",
            categories: {
                first_dishes: "🥣 First Dishes",
                second_dishes: "🍝 Second Dishes",
                sweets: "🍰 Desserts",
                drinks: "🍹 Drinks"
            },
            mealTypes: {
                breakfast: "🍳 Breakfast",
                lunch: "🍲 Lunch",
                dinner: "🥗 Dinner"
            }
        }
    };

    let currentLang = 'ua';
    let globalRecipesCache = []; 
    let todaySchedules = []; // Кеш розкладу на сьогодні для пушів

    const uiElements = {
        mainTitle: document.getElementById('mainTitle'),
        mainTitleWave: document.getElementById('mainTitleWave'),
        aiTitle: document.getElementById('aiTitle'),
        aiPrompt: document.getElementById('aiPrompt'),
        generateBtn: document.getElementById('generateBtn'),
        savedRecipesTitle: document.getElementById('savedRecipesTitle'),
        loadRecipesBtn: document.getElementById('loadRecipesBtn'),
        plannerTitle: document.getElementById('plannerTitle'),
        addPlanBtn: document.getElementById('addPlanBtn'),
        scheduleSubtitle: document.getElementById('scheduleSubtitle'),
        manualTitle: document.getElementById('manualTitle'),
        saveManualBtn: document.getElementById('saveManualBtn'),
        labelNotificationTime: document.getElementById('labelNotificationTime')
    };

    // Запит дозволу на сповіщення при старті сайту
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    function applyLanguage(lang) {
        currentLang = lang;
        uiElements.mainTitle.textContent = translations[lang].mainTitle;
        if (uiElements.mainTitleWave) uiElements.mainTitleWave.textContent = translations[lang].mainTitle;
        uiElements.aiTitle.textContent = translations[lang].aiTitle;
        uiElements.aiPrompt.placeholder = translations[lang].aiPlaceholder;
        uiElements.generateBtn.textContent = translations[lang].generateBtn;
        uiElements.savedRecipesTitle.textContent = translations[lang].savedRecipesTitle;
        uiElements.loadRecipesBtn.textContent = translations[lang].loadRecipesBtn;
        uiElements.plannerTitle.textContent = translations[lang].plannerTitle;
        uiElements.addPlanBtn.textContent = translations[lang].planBtnText;
        uiElements.scheduleSubtitle.textContent = translations[lang].scheduleSubtitle;
        uiElements.manualTitle.textContent = translations[lang].manualTitle;
        uiElements.saveManualBtn.textContent = translations[lang].saveManualBtn;
        uiElements.labelNotificationTime.textContent = translations[lang].labelNotificationTime;

        const planMealType = document.getElementById('planMealType');
        planMealType.options[0].text = translations[lang].mealTypes.breakfast;
        planMealType.options[1].text = translations[lang].mealTypes.lunch;
        planMealType.options[2].text = translations[lang].mealTypes.dinner;

        const categoryFilter = document.getElementById('categoryFilter');
        categoryFilter.options[1].text = translations[lang].categories.first_dishes;
        categoryFilter.options[2].text = translations[lang].categories.second_dishes;
        categoryFilter.options[3].text = translations[lang].categories.sweets;
        categoryFilter.options[4].text = translations[lang].categories.drinks;

        const manualCategory = document.getElementById('manualCategory');
        manualCategory.options[0].text = translations[lang].categories.first_dishes;
        manualCategory.options[1].text = translations[lang].categories.second_dishes;
        manualCategory.options[2].text = translations[lang].categories.sweets;
        manualCategory.options[3].text = translations[lang].categories.drinks;

        if (globalRecipesCache.length > 0) filterAndRenderRecipes();
        loadSchedule(document.getElementById('planDate').value);
    }

// --- Логіка випадаючих меню (Мова та Профіль) ---
    const langSelector = document.getElementById('langSelector');
    const langBtn = document.getElementById('langBtn');
    const currentLangText = document.getElementById('currentLangText');
    const langOptions = document.querySelectorAll('.lang-option[data-lang]');

    const profileSelector = document.getElementById('profileSelector');
    const profileBtn = document.getElementById('profileBtn');

    // Клік по кнопці мови
    langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langSelector.classList.toggle('open');
        if (profileSelector) profileSelector.classList.remove('open'); // Ховаємо профіль
    });

    // Вибір мови зі списку
    langOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedLang = option.getAttribute('data-lang');
            currentLangText.textContent = selectedLang.toUpperCase();
            applyLanguage(selectedLang);
            langSelector.classList.remove('open');
        });
    });

    // Клік по кнопці профілю
    if (profileBtn && profileSelector) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileSelector.classList.toggle('open');
            if (langSelector) langSelector.classList.remove('open'); // Ховаємо мови
        });
    }

// 1. Універсальне закриття всіх меню та модалок при кліку будь-де на сторінці
    window.addEventListener('click', (e) => {
        // Ховаємо випадаючі списки
        if (langSelector && langSelector.classList.contains('open')) {
            langSelector.classList.remove('open');
        }
        if (profileSelector && profileSelector.classList.contains('open')) {
            profileSelector.classList.remove('open');
        }
        
        // Ховаємо модальне вікно, якщо клікнули на його темний фон (overlay)
        if (e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
        }
    });

    // 2. Закриття вікон по клавіші Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Шукаємо всі відкриті модалки і закриваємо їх
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (modal.style.display === 'flex') {
                    modal.style.display = 'none';
                }
            });
            // Також закриваємо менюшки
            if (langSelector) langSelector.classList.remove('open');
            if (profileSelector) profileSelector.classList.remove('open');
        }
    });

    // --- Перемикач теми ---
    document.getElementById('themeToggleCheckbox').addEventListener('change', (e) => {
        if (e.target.checked) document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    });

    // --- Логіка Планувальника ---
    const planDate = document.getElementById('planDate');
    const planMealType = document.getElementById('planMealType');
    const planRecipe = document.getElementById('planRecipe');
    const planTime = document.getElementById('planTime'); // Додано інпут часу
    const addPlanBtn = document.getElementById('addPlanBtn');
    const scheduleContainer = document.getElementById('scheduleContainer');

// Отримуємо правильну локальну дату користувача для відображення в календарі
    const today = TimeManager.getLocalDateString();
    planDate.value = today;

async function loadRecipesForPlanner() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            planRecipe.innerHTML = `<option value="">Увійдіть в акаунт</option>`;
            return;
        }

        try {
            const res = await fetch('http://127.0.0.1:8000/api/recipes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const recipes = await res.json();
            planRecipe.innerHTML = '';
            
            if (recipes.length === 0) {
                planRecipe.innerHTML = `<option value="">${translations[currentLang].emptyDb}</option>`;
                return;
            }
            
            planRecipe.innerHTML = `<option value="">-- ${translations[currentLang].selectRecipe} --</option>`;
            recipes.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = r.name;
                planRecipe.appendChild(opt);
            });
        } catch (e) {
            console.error(e);
        }
    }

    async function loadSchedule(dateStr) {
        if (!dateStr) return;
        const token = localStorage.getItem('access_token');
        if (!token) {
            scheduleContainer.innerHTML = `<p>Увійдіть, щоб бачити розклад.</p>`;
            return;
        }

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/schedule/${dateStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const schedules = await res.json();
            scheduleContainer.innerHTML = '';
            
            if (dateStr === today) {
                todaySchedules = schedules;
            }
            
            if (schedules.length === 0) {
                scheduleContainer.innerHTML = `<p>${translations[currentLang].emptySchedule}</p>`;
                return;
            }
            
            schedules.forEach(s => {
                const div = document.createElement('div');
                div.className = 'schedule-card';
                const mealName = translations[currentLang].mealTypes[s.meal_type] || s.meal_type;
                
                let displayTimeText = '';
                if (s.scheduled_at) {
                    displayTimeText = ` ⏰ [${TimeManager.convertToLocalTime(s.scheduled_at)}]`;
                }
                
                div.innerHTML = `
                    <span><strong>${mealName}:</strong> ${s.recipe_name}${displayTimeText}</span>
                    <button class="delete-schedule-btn" data-id="${s.id}" title="Видалити">✖</button>
                `;
                scheduleContainer.appendChild(div);
            });

            document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const scheduleId = e.target.getAttribute('data-id');
                    if (confirm("Видалити цю страву з розкладу?")) {
                        await fetch(`http://127.0.0.1:8000/api/schedule/${scheduleId}`, { 
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        loadSchedule(dateStr);
                        if (dateStr === today) loadTodaySchedulesForNotifications();
                    }
                });
            });
        } catch (e) {
            console.error(e);
        }
    }

// Окрема швидка функція для фонового завантаження сьогоднішнього розкладу
    async function loadTodaySchedulesForNotifications() {
        const token = localStorage.getItem('access_token');
        if (!token) return; // Якщо гість - ніяких пушів

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/schedule/${today}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            todaySchedules = await res.json();
        } catch (e) { console.error(e); }
    }

    planDate.addEventListener('change', (e) => loadSchedule(e.target.value));

addPlanBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showToast("Увійдіть в акаунт!", "warning");
            return;
        }

        const date = planDate.value;
        const meal_type = planMealType.value;
        const recipe_id = planRecipe.value;
        
        const scheduled_at = TimeManager.convertToUTCISO(date, planTime.value);

        if (!date || !recipe_id) {
            showToast("Будь ласка, оберіть дату та рецепт!", "warning");
            return;
        }

        addPlanBtn.disabled = true;
        try {
            await fetch('http://127.0.0.1:8000/api/schedule', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ meal_type, recipe_id: parseInt(recipe_id), scheduled_at })
            });
            planTime.value = ''; 
            loadSchedule(date);
        } catch (e) {
            console.error("Помилка планування:", e);
        } finally {
            addPlanBtn.disabled = false;
        }
    });

// --- Роботизована перевірка часу нагадувань (Супер-надійна за таймстампами) ---
    setInterval(() => {
        if (todaySchedules.length === 0) return;
        
        const now = new Date(); // Поточний момент часу комп'ютера (включаючи дату і хвилину)
        let firedANotification = false;

        // Йдемо з кінця в початок для безпечного видалення з масиву перевірок
        for (let i = todaySchedules.length - 1; i >= 0; i--) {
            const sched = todaySchedules[i];
            const schedDate = new Date(sched.scheduled_at);

            // Якщо поточний час наздогнав або перегнав запланований таймстамп
            if (now >= schedDate) {
                // Показуємо пуш тільки якщо ця подія сталася щойно (в межах останньої хвилини)
                if ((now - schedDate) < 60000 && Notification.permission === "granted") {
                    const mealPretty = translations[currentLang].mealTypes[sched.meal_type] || sched.meal_type;
                    let bodyTemplate = translations[currentLang].pushBody;
                    bodyTemplate = bodyTemplate.replace('{meal}', mealPretty).replace('{recipe}', sched.recipe_name);

                    new Notification(translations[currentLang].pushTitle, {
                        body: bodyTemplate,
                        icon: '🌍' 
                    });
                }
                
                // Видаляємо з кешу, щоб більше не перевіряти
                todaySchedules.splice(i, 1);
                firedANotification = true;
            }
        }

        if (firedANotification && planDate.value === today) {
            loadSchedule(today);
        }
    }, 20000); // чек кожні 20 сек

    // --- Логіка відображення, сортування та Пошуку рецептів ---
    const loadRecipesBtn = document.getElementById('loadRecipesBtn');
    const recipesContainer = document.getElementById('recipesContainer');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resetSearchBtn = document.getElementById('resetSearchBtn');
    const categoryFilter = document.getElementById('categoryFilter');

    function renderRecipeCards(recipes) {
        recipesContainer.innerHTML = '';
        if (recipes.length === 0) {
            recipesContainer.innerHTML = `<p>${translations[currentLang].emptyDb}</p>`;
            return;
        }

        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            const prettyCategory = translations[currentLang].categories[recipe.category] || recipe.category;
            
            card.innerHTML = `
                <h3>${recipe.name}</h3>
                
                <select class="category-select-inline" data-id="${recipe.id}">
                    <option value="first_dishes" ${recipe.category === 'first_dishes' ? 'selected' : ''}>${translations[currentLang].categories.first_dishes}</option>
                    <option value="second_dishes" ${recipe.category === 'second_dishes' ? 'selected' : ''}>${translations[currentLang].categories.second_dishes}</option>
                    <option value="sweets" ${recipe.category === 'sweets' ? 'selected' : ''}>${translations[currentLang].categories.sweets}</option>
                    <option value="drinks" ${recipe.category === 'drinks' ? 'selected' : ''}>${translations[currentLang].categories.drinks}</option>
                </select>

                <p><strong>${translations[currentLang].time}:</strong> ${recipe.time_cooking}</p>
                <p><strong>${translations[currentLang].ingredientsCount}:</strong> ${recipe.quantity}</p>
                <hr>
                <h4>${translations[currentLang].ingredientsTitle}:</h4>
                <p class="ingredients-text">${recipe.ingredients}</p>
                <button class="delete-recipe-btn" data-id="${recipe.id}" title="Видалити рецепт">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            `;
            recipesContainer.appendChild(card);
        });

        document.querySelectorAll('.category-select-inline').forEach(selectEl => {
            selectEl.addEventListener('change', async (e) => {
                // ДОДАЛИ ПЕРЕВІРКУ ТОКЕНА
                const token = localStorage.getItem('access_token');
                if (!token) {
                    showToast("Увійдіть в акаунт!", "warning");
                    return;
                }

                const recipeId = e.target.getAttribute('data-id');
                const newCategory = e.target.value;

                try {
                    // ДОДАЛИ HEADERS
                    const response = await fetch(`http://127.0.0.1:8000/api/recipes/${recipeId}/category?category=${newCategory}`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error("Помилка при оновленні");

                    const recipeInCache = globalRecipesCache.find(r => r.id === parseInt(recipeId));
                    if (recipeInCache) recipeInCache.category = newCategory;

                    filterAndRenderRecipes();
                    loadRecipesForPlanner();

                } catch (error) {
                    console.error(error);
                    showToast("Не вдалося змінити категорію на сервері.", "error");
                }
            });
        });

        document.querySelectorAll('.delete-recipe-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    showToast("Увійдіть в акаунт!", "warning");
                    return;
                }
                
                const recipeId = e.currentTarget.getAttribute('data-id'); 
                if (confirm("Точно видалити цей рецепт? Він також зникне з розкладу!")) {
                    await fetch(`http://127.0.0.1:8000/api/recipes/${recipeId}`, { 
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    globalRecipesCache = globalRecipesCache.filter(r => r.id !== parseInt(recipeId));
                    filterAndRenderRecipes();
                    
                    loadRecipesForPlanner();
                    loadSchedule(planDate.value);
                }
            });
        });
    }

    function filterAndRenderRecipes() {
        const selectedCategory = categoryFilter.value;
        if (selectedCategory === 'all') {
            renderRecipeCards(globalRecipesCache);
        } else {
            const filtered = globalRecipesCache.filter(r => r.category === selectedCategory);
            renderRecipeCards(filtered);
        }
    }

    categoryFilter.addEventListener('change', filterAndRenderRecipes);

// --- ЗАВАНТАЖЕННЯ РЕЦЕПТІВ ---
    loadRecipesBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            recipesContainer.innerHTML = `<p style="color: red;">Увійдіть в акаунт!</p>`;
            return;
        }
        
        try {
            // Виправлено синтаксичну помилку (дужка тепер в самому кінці)
            const response = await fetch('http://127.0.0.1:8000/api/recipes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error("Network response was not ok");
            
            globalRecipesCache = await response.json();
            categoryFilter.value = 'all'; 
            renderRecipeCards(globalRecipesCache);
            loadRecipesForPlanner();
            searchInput.value = '';
            resetSearchBtn.style.display = 'none';
        } catch (error) {
            recipesContainer.innerHTML = `<p style="color: red;">${translations[currentLang].errorLoad}</p>`;
        }
    });

    // --- ПОШУК РЕЦЕПТІВ ---
    searchBtn.addEventListener('click', async () => {
        const keyword = searchInput.value.trim();
        if (!keyword) return;
        
        // ДОДАЛИ перевірку токена для пошуку!
        const token = localStorage.getItem('access_token');
        if (!token) {
            showToast("Увійдіть в акаунт для пошуку!", "warning");
            return;
        }

        try {
            // ДОДАЛИ headers з токеном у fetch
            const response = await fetch(`http://127.0.0.1:8000/api/recipes/search?keyword=${encodeURIComponent(keyword)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error("Search failed");
            
            globalRecipesCache = await response.json(); 
            categoryFilter.value = 'all';
            renderRecipeCards(globalRecipesCache);
            resetSearchBtn.style.display = 'inline-block';
        } catch (error) {
            console.error("Помилка пошуку", error);
        }
    });

    resetSearchBtn.addEventListener('click', () => loadRecipesBtn.click());

// --- Логіка додавання рецепта ВРУЧНУ ---
    const saveManualBtn = document.getElementById('saveManualBtn');
    const manualStatus = document.getElementById('manualStatus');

    saveManualBtn.addEventListener('click', async () => {
        // 1. ПЕРЕВІРКА ТОКЕНА
        const token = localStorage.getItem('access_token');
        if (!token) {
            showToast("Увійдіть в акаунт для збереження!", "warning");
            return;
        }

        const name = document.getElementById('manualName').value.trim();
        const category = document.getElementById('manualCategory').value;
        const time_cooking = document.getElementById('manualTime').value.trim();
        const ingredients = document.getElementById('manualIngredients').value.trim();
        const quantity = document.getElementById('manualQuantity').value;

        if (!name || !time_cooking || !ingredients || !quantity) {
            manualStatus.textContent = translations[currentLang].manualFieldsError;
            manualStatus.style.color = "red";
            return;
        }

        try {
            // 2. ДОДАНО HEADERS
            const response = await fetch('http://127.0.0.1:8000/api/recipes', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, category, time_cooking, ingredients, quantity: parseInt(quantity) })
            });

            if (!response.ok) throw new Error();

            manualStatus.textContent = translations[currentLang].manualSuccess;
            manualStatus.style.color = "green";

            document.getElementById('manualName').value = '';
            document.getElementById('manualTime').value = '';
            document.getElementById('manualIngredients').value = '';
            document.getElementById('manualQuantity').value = '';

            if(loadRecipesBtn) loadRecipesBtn.click();
        } catch (e) {
            manualStatus.textContent = translations[currentLang].aiError;
            manualStatus.style.color = "red";
        }
    });

    // --- Логіка генерації через ШІ ---
    const generateBtn = document.getElementById('generateBtn');
    const aiPrompt = document.getElementById('aiPrompt');
    const aiStatus = document.getElementById('aiStatus');

// --- Логіка генерації через ШІ ---
    generateBtn.addEventListener('click', async () => {
        // 1. ПЕРЕВІРКА ТОКЕНА
        const token = localStorage.getItem('access_token');
        if (!token) {
            showToast("Увійдіть в акаунт для генерації!", "warning");
            return;
        }

        const promptText = aiPrompt.value.trim();
        if (!promptText) {
            aiStatus.textContent = translations[currentLang].aiEmptyPrompt;
            aiStatus.style.color = "red";
            return;
        }

        aiStatus.textContent = translations[currentLang].aiThinking;
        aiStatus.style.color = "var(--primary-color)";
        generateBtn.disabled = true;

        try {
            const response = await fetch('http://127.0.0.1:8000/api/ai/generate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ prompt: promptText })
            });

            if (!response.ok) throw new Error();

            const newRecipe = await response.json();
            aiStatus.textContent = currentLang === 'ua' 
                ? `Успіх! Рецепт "${newRecipe.name}" згенеровано.` 
                : `Success! Recipe "${newRecipe.name}" generated.`;
            aiStatus.style.color = "green";
            aiPrompt.value = '';
            
            // Якщо є кнопка завантаження - оновлюємо список
            if(loadRecipesBtn) loadRecipesBtn.click();
        } catch (error) {
            aiStatus.textContent = translations[currentLang].aiError;
            aiStatus.style.color = "red";
        } finally {
            generateBtn.disabled = false;
        }
    });

    // Ініціалізація
    loadRecipesForPlanner();
    loadSchedule(today);
    loadTodaySchedulesForNotifications(); // Окремо кешуємо сьогоднішні пуші при старті

    // --- ЛОГІКА АВТОРИЗАЦІЇ (JWT TOKEN & GOOGLE) ---
    const authModal = document.getElementById('authModal');
    const menuLogin = document.getElementById('menuLogin');
    const menuLogout = document.getElementById('menuLogout');
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const authError = document.getElementById('authError');

    // 1. Перевірка, чи ми вже залогінені (Звичайний вхід АБО повернення від Google)
    async function checkAuthState() {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const emailFromUrl = urlParams.get('email');
        const statusFromUrl = urlParams.get('status'); // Читаємо статус від Google!

        // ЯКЩО GOOGLE ВИМАГАЄ 2FA
        if (statusFromUrl === "2fa_required" && emailFromUrl) {
            pendingLoginEmail = emailFromUrl;
            window.history.replaceState({}, document.title, window.location.pathname); // Чистимо URL
            document.getElementById('login2faModal').style.display = 'flex'; // Відкриваємо код
            return;
        }

        if (tokenFromUrl && emailFromUrl) {
            localStorage.setItem('access_token', tokenFromUrl);
            localStorage.setItem('user_email', emailFromUrl);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const token = localStorage.getItem('access_token');
        
        if (token) {
            try {
                const res = await fetch('http://127.0.0.1:8000/api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const userData = await res.json();
                    profileName.textContent = userData.nickname || userData.email.split('@')[0];
                    profileRole.textContent = "Користувач";
                    if (menuLogout) menuLogout.style.display = 'block';
                    if (menuLogin) menuLogin.style.display = 'none';
                    if (document.getElementById('navRecipesWave')) document.getElementById('navRecipesWave').style.backgroundColor = '#4CAF50';
                    return;
                    
                } else {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user_email');
                }
            } catch (e) { console.error("Помилка", e); }
        }
        
        profileName.textContent = "Гість";
        profileRole.textContent = "Не авторизовано";
        if (menuLogout) menuLogout.style.display = 'none';
        if (menuLogin) menuLogin.style.display = 'block';

        profileName.textContent = "Гість";
        profileRole.textContent = "Не авторизовано";
        if (menuLogout) menuLogout.style.display = 'none';
        if (menuLogin) menuLogin.style.display = 'block';
        if (document.getElementById('navRecipesWave')) document.getElementById('navRecipesWave').style.backgroundColor = '#F44336';
    }

    // 2. Відкриття / Закриття модалки
    if (menuLogin) {
        menuLogin.addEventListener('click', () => {
            authModal.style.display = 'flex';
            authError.textContent = ''; // очищаємо старі помилки
            document.getElementById('profileSelector').classList.remove('open');
        });
    }

    document.getElementById('closeAuthBtn').addEventListener('click', () => {
        authModal.style.display = 'none';
    });

    // 3. Логіка ВИХОДУ (Logout)
    if (menuLogout) {
        menuLogout.addEventListener('click', () => {
            // Просто видаляємо токен з пам'яті браузера
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_email');
            checkAuthState();
            document.getElementById('profileSelector').classList.remove('open');
            showToast("Ви успішно вийшли з системи!", "info");
        });
    }

    // 4. Логіка РЕЄСТРАЦІЇ (Звичайна)
    document.getElementById('registerSubmitBtn').addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        
        if (!email.includes('@') || !email.includes('.')) {
            authError.style.color = "red";
            authError.textContent = "Будь ласка, введіть коректний email!";
            return;
        }
        if (password.length < 6) {
            authError.style.color = "red";
            authError.textContent = "Пароль має бути не менше 6 символів!";
            return;
        }

        try {
            const res = await fetch('http://127.0.0.1:8000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Помилка реєстрації");
            }
            
            authError.style.color = "green";
            authError.textContent = "Реєстрація успішна! Тепер натисніть Увійти.";
        } catch (e) {
            authError.style.color = "red";
            authError.textContent = e.message;
        }
    });

    let pendingLoginEmail = "";

    // 5. Логіка ЛОГІНУ (Звичайна)
    document.getElementById('loginSubmitBtn').addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        
        if (!email.includes('@') || !email.includes('.')) {
            authError.style.color = "red";
            authError.textContent = "Будь ласка, введіть коректний email!";
            return;
        }

        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!res.ok) throw new Error("Невірний email або пароль");
            
            const data = await res.json();
            
            if (data.access_token === "2fa_required") {
                pendingLoginEmail = data.email;
                document.getElementById('authModal').style.display = 'none';
                document.getElementById('login2faModal').style.display = 'flex';
                return;
            }

            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user_email', email);
            
            authModal.style.display = 'none';
            checkAuthState();
            showToast("Успішний вхід!", "success");
        } catch (e) {
            authError.style.color = "red";
            authError.textContent = e.message;
        }
    });

// --- ЛОГІКА ПІДТВЕРДЖЕННЯ 2FA ПРИ ВХОДІ ---
    const login2faSubmitBtn = document.getElementById('login2faSubmitBtn');
    if (login2faSubmitBtn) login2faSubmitBtn.addEventListener('click', async () => {
        const code = document.getElementById('login2faCode').value.trim();
        const errorEl = document.getElementById('login2faError');
        
        if (!code) return;
        
        try {
            const res = await fetch('http://127.0.0.1:8000/api/auth/login/2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: pendingLoginEmail, code: code })
            });
            
            if (!res.ok) throw new Error("Невірний код 2FA");
            
            const data = await res.json();
            
            // Тепер ми отримали реальний токен!
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user_email', pendingLoginEmail);
            
            document.getElementById('login2faModal').style.display = 'none';
            document.getElementById('login2faCode').value = '';
            checkAuthState();
            showToast("Ви успішно увійшли з 2FA!", "success");
        } catch (e) {
            errorEl.textContent = e.message;
        }
    });

    const login2faCancelBtn = document.getElementById('login2faCancelBtn');
    if (login2faCancelBtn) login2faCancelBtn.addEventListener('click', () => {
        document.getElementById('login2faModal').style.display = 'none';
        document.getElementById('login2faCode').value = '';
        document.getElementById('authModal').style.display = 'flex'; // Повертаємо на форму логіну
        pendingLoginEmail = "";
    });

// 6. Логіка ВХОДУ ЧЕРЕЗ GOOGLE
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', () => {
            window.location.href = 'http://127.0.0.1:8000/api/auth/google/login';
        });
    }

    checkAuthState();

// --- ЛОГІКА НАЛАШТУВАНЬ ПРОФІЛЮ ---
    const settingsModal = document.getElementById('settingsModal');
    const menuSettings = document.getElementById('menuSettings');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    if (menuSettings) {
        menuSettings.addEventListener('click', async () => {
            const token = localStorage.getItem('access_token');
            if (!token) { showToast("Спочатку увійдіть у систему!", "error"); return; }
            
            settingsModal.style.display = 'flex';
            document.getElementById('profileSelector').classList.remove('open');
            document.getElementById('settingsEmail').value = localStorage.getItem('user_email');
            document.getElementById('settingsNickname').value = profileName.textContent !== "Гість" ? profileName.textContent : "";
            
            const btn = document.getElementById('enable2FABtn');
            if (btn) {
                btn.textContent = "Налаштувати 2FA";
                btn.disabled = false;
                btn.style.backgroundColor = "#ff9800";
            }
            
            try {
                const res = await fetch('http://127.0.0.1:8000/api/users/me/2fa/status', {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store' // ВАЖЛИВО! Забороняємо браузеру брати старий статус з кешу
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.is_enabled && btn) {
                        btn.textContent = "✅ 2FA Активовано";
                        btn.disabled = true;
                        btn.style.backgroundColor = "#6c757d";
                    }
                }
            } catch (e) { console.error("Помилка", e); }
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

// Логіка збереження Налаштувань
    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
        const nickname = document.getElementById('settingsNickname').value.trim();
        const email = document.getElementById('settingsEmail').value.trim();
        const password = document.getElementById('settingsPassword').value.trim();
        const errorEl = document.getElementById('settingsError');
        const token = localStorage.getItem('access_token');

        errorEl.textContent = "";

        // Збираємо тільки ті дані, які користувач заповнив
        const payload = {};
        if (nickname) payload.nickname = nickname;
        if (email) payload.email = email;
        if (password) {
            if (password.length < 6) {
                errorEl.style.color = "red";
                errorEl.textContent = "Пароль має бути не менше 6 символів!";
                return;
            }
            payload.password = password;
        }

        try {
            const res = await fetch('http://127.0.0.1:8000/api/users/me', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Прикріплюємо перепустку!
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Помилка оновлення даних");
            }

            const data = await res.json();
            
            // Якщо юзер змінив пошту, оновлюємо її в браузері
            if (data.email) localStorage.setItem('user_email', data.email);
            
            errorEl.style.color = "green";
            errorEl.textContent = "Налаштування успішно збережено!";
            
            // Закриваємо вікно і оновлюємо ім'я в меню через 1 секунду
            setTimeout(() => {
                document.getElementById('settingsModal').style.display = 'none';
                checkAuthState(); 
            }, 1000);

        } catch (e) {
            errorEl.style.color = "red";
            errorEl.textContent = e.message;
        }
    });

// --- Логіка 2FA ---
    let temp2FASecret = ""; // Змінна для тимчасового ключа

    const enable2FABtn = document.getElementById('enable2FABtn');
    const modal2FA = document.getElementById('2faModal');
    const close2FABtn = document.getElementById('close2FABtn');

    if (enable2FABtn) {
        enable2FABtn.addEventListener('click', async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch('http://127.0.0.1:8000/api/users/me/2fa/enable', {
                    method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                
                temp2FASecret = data.secret; // Фронтенд запам'ятовує ключ
                document.getElementById('qrImg').src = "data:image/png;base64," + data.qr_code;
                modal2FA.style.display = 'flex'; settingsModal.style.display = 'none';
            } catch (e) { console.error(e); }
        });
    }

    if (close2FABtn) close2FABtn.addEventListener('click', () => { modal2FA.style.display = 'none'; });

    const submitVerify = document.getElementById('submitVerify');
    if(submitVerify) submitVerify.addEventListener('click', async () => {
        const code = document.getElementById('verifyCode').value.trim();
        if(!code) return;
        
        const token = localStorage.getItem('access_token'); 
        const msg = document.getElementById('msg');
        
        try {
            // Тепер ми відправляємо і код, і секрет на бекенд для фінальної перевірки
            const res = await fetch(`http://127.0.0.1:8000/api/users/me/2fa/verify`, {
                method: 'POST', 
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' // Змінили на JSON
                },
                body: JSON.stringify({ code: code, secret: temp2FASecret })
            });
            
            if (res.ok) {
                msg.textContent = "Успішно!"; msg.style.color = "green";
                const btn = document.getElementById('enable2FABtn');
                if (btn) { btn.textContent = "✅ 2FA Активовано"; btn.disabled = true; btn.style.backgroundColor = "#6c757d"; }
                setTimeout(() => { modal2FA.style.display = 'none'; document.getElementById('verifyCode').value = ''; msg.textContent = ''; }, 1500);
            } else { 
                msg.textContent = "Невірний код."; msg.style.color = "red"; 
            }
        } catch (e) { console.error(e); }
    });

    // --- ЛОГІКА ПЕРЕМИКАННЯ ЕКРАНІВ (SPA) ---
    const navRecipesBtn = document.getElementById('navRecipesBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const homeView = document.getElementById('homeView');
    const recipesView = document.getElementById('recipesView');

    if (navRecipesBtn && backToHomeBtn && homeView && recipesView) {
        // Клік по кнопці "Мої рецепти"
        navRecipesBtn.addEventListener('click', () => {
            const token = localStorage.getItem('access_token');
            
            if (!token) {
                showToast("Спочатку увійдіть в акаунт!", "warning");
                return;
            }
            
            homeView.style.display = 'none';
            recipesView.style.display = 'block';
            
            if (loadRecipesBtn) {
                loadRecipesBtn.click();
            }
        });

        backToHomeBtn.addEventListener('click', () => {
            recipesView.style.display = 'none';
            homeView.style.display = 'block';
        });
    }
    
    const logoHomeBtn = document.getElementById('logoHomeBtn');

    if (logoHomeBtn) {
        // --- 1. МАГІЯ КОЛЬОРОВОЇ ХВИЛІ ВІД КУРСОРА ---
        logoHomeBtn.addEventListener('mousemove', (e) => {
            const rect = logoHomeBtn.getBoundingClientRect();
            // Рахуємо координати курсора відносно самого тексту
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Передаємо ці координати в CSS (вони рухають центр нашого кола)
            logoHomeBtn.style.setProperty('--x', `${x}px`);
            logoHomeBtn.style.setProperty('--y', `${y}px`);
        });

        logoHomeBtn.addEventListener('mouseenter', () => {
            logoHomeBtn.style.setProperty('--radius', '150%'); 
        });

        logoHomeBtn.addEventListener('mouseleave', () => {
            logoHomeBtn.style.setProperty('--radius', '0%'); 
        });

        // --- 2. КЛІК ПО ЛОГОТИПУ (ПОВЕРНЕННЯ НА ГОЛОВНУ) ---
        logoHomeBtn.addEventListener('click', () => {
            if (recipesView) recipesView.style.display = 'none';
            if (homeView) homeView.style.display = 'block';
        });
    }

    // --- 3. КНОПКА "МОЇ РЕЦЕПТИ" ---
    const navRecipesWave = document.getElementById('navRecipesWave');
    const navRecipesText = document.getElementById('navRecipesText');
    const authTooltip = document.getElementById('authTooltip'); // Додали змінну підказки

    if (navRecipesBtn && navRecipesWave) {
        navRecipesBtn.addEventListener('mousemove', (e) => {
            const rect = navRecipesBtn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            navRecipesWave.style.setProperty('--x', `${x}px`);
            navRecipesWave.style.setProperty('--y', `${y}px`);
        });

        navRecipesBtn.addEventListener('mouseenter', () => {
            navRecipesWave.style.setProperty('--radius', '150%');
            if (navRecipesText) navRecipesText.style.color = '#fff'; 
            
            // ПЕРЕВІРЯЄМО ЧИ ГІСТЬ
            const token = localStorage.getItem('access_token');
            if (!token && authTooltip) {
                // Показуємо червону підказку, вона плавно виїжджає
                authTooltip.style.opacity = '1';
                authTooltip.style.transform = 'translateX(-50%) translateY(0)';
            }
        });

        navRecipesBtn.addEventListener('mouseleave', () => {
            navRecipesWave.style.setProperty('--radius', '0%');
            if (navRecipesText) navRecipesText.style.color = ''; 
            
            // ХОВАЄМО ПІДКАЗКУ
            if (authTooltip) {
                authTooltip.style.opacity = '0';
                authTooltip.style.transform = 'translateX(-50%) translateY(-5px)';
            }
        });
    }
});