import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_recipe_from_ai(prompt: str) -> dict:
    # Додаємо жорсткі кулінарні правила в системний промпт
    system_prompt = """Ти професійний кулінарний помічник. 
    Згенеруй рецепт за запитом користувача.
    Ти ПОВИНЕН повернути відповідь виключно у форматі JSON з такими ключами:
    "name" (назва страви, рядок),
    "category" (одна з категорій: first_dishes, second_dishes, sweets, drinks),
    "time_cooking" (орієнтовний час, рядок, наприклад "45 хв"),
    "ingredients" (всі інгредієнти одним текстом, розділені переносом рядка \n),
    "quantity" (кількість інгредієнтів загалом, ціле число).

    СУВОРІ ПРАВИЛА КАТЕГОРИЗАЦІЇ:
    1. "first_dishes" — це ТІЛЬКИ рідкі гарячі або холодні перші страви (борщ, суп, солянка, крем-суп, бульйон, окрошка).
    2. "second_dishes" — це будь-які основні страви, гарніри та салати (паста, макарони, плов, салати, стейки, пюре, рагу). Якщо страва не є супом — це друга страва!
    3. "sweets" — десерти, випічка, торти.
    4. "drinks" — гарячі та холодні напої."""

    response = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        response_format={ "type": "json_object" }
    )
    
    result_str = response.choices[0].message.content
    return json.loads(result_str)