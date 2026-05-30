const TimeManager = {
    // 1. Повертає локальну дату користувача (YYYY-MM-DD) для ініціалізації календаря
    getLocalDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // 2. Бере локальну дату з календаря та локальний час з інпуту і зліплює в один ISO-рядок UTC для бекенду
    convertToUTCISO(dateStr, timeStr) {
        if (!timeStr) {
            // Якщо час не вказано, ставимо на кінець дня за локальним часом
            timeStr = "23:59"; 
        }
        const [year, month, day] = dateStr.split('-');
        const [hours, minutes] = timeStr.split(':');
        
        // Створюється об'єкт суворо у часовому поясі користувача
        const localDate = new Date(year, month - 1, day, hours, minutes);
        return localDate.toISOString(); // Перетворює в чистий UTC рядок: "2026-05-24T22:39:00.000Z"
    },

    // 3. Бере UTC рядок з бази даних і витягує з нього локальний час
    convertToLocalTime(isoStr) {
        if (!isoStr) return '';
        const date = new Date(isoStr);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
};