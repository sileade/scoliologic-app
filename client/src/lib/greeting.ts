// Dynamic greeting based on time of day

export interface GreetingData {
  greeting: {
    ru: string;
    en: string;
  };
  emoji: string;
}

export function getTimeBasedGreeting(): GreetingData {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    // Morning: 5:00 - 11:59
    return {
      greeting: {
        ru: "Доброе утро",
        en: "Good morning"
      },
      emoji: "👋"
    };
  } else if (hour >= 12 && hour < 17) {
    // Afternoon: 12:00 - 16:59
    return {
      greeting: {
        ru: "Добрый день",
        en: "Good afternoon"
      },
      emoji: "☀️"
    };
  } else if (hour >= 17 && hour < 22) {
    // Evening: 17:00 - 21:59
    return {
      greeting: {
        ru: "Добрый вечер",
        en: "Good evening"
      },
      emoji: "🌆"
    };
  } else {
    // Night: 22:00 - 4:59
    return {
      greeting: {
        ru: "Доброй ночи",
        en: "Good night"
      },
      emoji: "🌙"
    };
  }
}

export function getMotivationalMessage(dayNumber: number, language: 'ru' | 'en'): string {
  const messages = {
    ru: [
      "Так держать!",
      "Отличный прогресс!",
      "Вы на верном пути!",
      "Продолжайте в том же духе!",
      "Каждый день — шаг к цели!"
    ],
    en: [
      "Keep it up!",
      "Great progress!",
      "You're on the right track!",
      "Keep up the good work!",
      "Every day is a step towards your goal!"
    ]
  };
  
  const index = dayNumber % messages[language].length;
  return messages[language][index];
}
