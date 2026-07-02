# План запуску AI Humanizer: мінімальний робочий цикл (MVP)

## Поточний стан

- Expo (React Native) застосунок вже збирається і запускається (`npm install && npm run start`).
- Усі 9 екранів, навігація, теми, компоненти зверстані й працюють на **мокових даних** (`src/data/content.ts`).
- Реальної гуманізації тексту, детекції ШІ, авторизації, кредитів чи оплат немає — це чиста фронтенд-верстка за прототипом.
- BRD (`design-handoff/uploads/BRD AI detect.txt`) описує повноцінну SaaS-платформу: 4-шаровий pipeline гуманізації, внутрішній цикл детекції з чанкінгом, Supabase (auth+Postgres+RLS), Stripe Sync Engine, OpenRouter, GPTZero. BRD прописує стек **Next.js + Tailwind + Shadcn**, тоді як репозиторій — **Expo мобільний**; це врахували при виборі підходу нижче.

## Рішення, прийняті з користувачем

- **Обсяг MVP:** мінімальний робочий цикл — один реальний LLM-виклик (гуманізація) + базова евристична детекція, без auth і без білінгу. Мета: щоб екрани Editor → Processing → Result → Detector реально працювали з живими даними.
- **Монетизація:** відкладена на потім. Не займаємось Stripe/RevenueCat/IAP у цій фазі.

## Свідомо відкладено (наступні фази, не MVP)

- Auth (Supabase Auth), профілі користувачів
- Кредити/біллінг, Stripe Sync Engine, RevenueCat/native IAP
- Реальні інтеграції GPTZero / Turnitin / Copyleaks / Originality.ai
- Layer 3 pipeline (multi-model chaining)
- Чанкінг текстів >2500 слів з ітеративним auto-refinement
- Веб-воронка / programmatic SEO сторінки з BRD (GTM-вимоги)
- Вибір остаточного стеку Next.js vs Expo для повної SaaS-версії

## Чекліст MVP

1. ~~**Backend-проксі для LLM-викликів**~~ ✅ Зроблено
   Реалізовано як Supabase Edge Functions (TS/Deno) у `supabase/functions/`: `POST /humanize` та `POST /alternatives`, обидва тримають `ANTHROPIC_API_KEY` виключно на сервері (`Deno.env.get`), ключ ніколи не потрапляє в клієнтський бандл Expo. Дивись розділ "Backend proxy" в `README.md` для локального запуску й деплою.
   *Примітка: функції ще без auth (`verify_jwt = false`, auth відкладено за планом) і без деплою на реальний Supabase-проєкт — це потребує `supabase link` з project ref користувача.*

2. **Layer 1 — LLM humanize endpoint**
   Ендпоінт приймає `{text, mode, tone, style}` (Light/Medium/Aggressive/Ninja; 13 тонів; 5–6 стилів) і викликає Claude із системним промптом, налаштованим на ін'єкцію перплексії/сплесковості під обраний режим. Повертає переписаний текст.

3. **Layer 2 — regex AI-slop post-processing**
   Чистий TS-модуль зі списком маркерів (delve, tapestry, crucial, vibrant, nestled, underscore, furthermore, in conclusion тощо) і таблицею синонімічних замін, застосовується до виходу LLM.

4. **Евристичний детектор ШІ**
   GPTZero/Turnitin потребують окремих платних ключів, яких поки немає — робимо власну евристичну sentence-level оцінку (red/yellow/green) за інтерфейсом, сумісним з майбутньою підміною на реальний GPTZero.

5. **Readability engine (FRE/FKGL)**
   Чиста TS-реалізація формул Flesch Reading Ease і Flesch-Kincaid Grade Level (підрахунок складів/речень/слів), без зовнішніх API. Спільний util для Metrics-екрана і бекенду.

6. **Wire Editor + Processing**
   `src/screens/Editor.tsx` — реальний виклик `/humanize` замість мок-сабміту. `src/screens/Processing.tsx` — прогрес по реальному життєвому циклу запиту (start/chunk/done/error), а не по фіксованому таймеру.

7. **Wire Result**
   `src/screens/Result.tsx` — реальний переписаний текст, підсвітка речень за реальними оцінками детектора, робоча функція "Альтернативи" (LLM-виклик при temperature 1.0, 3 варіанти на речення).

8. **Wire Detector + Metrics**
   `src/screens/Detector.tsx` — довільний вставлений текст проганяється через евристичний детектор. `src/screens/Metrics.tsx` — реальні числа FRE/FKGL з readability engine.

9. **Конфіг та обробка помилок**
   `EXPO_PUBLIC_*` змінна для URL бекенду (без секретів у клієнті), loading/error/timeout стани на Editor/Processing/Result/Detector замість припущення, що мок завжди успішний.

10. **Наскрізна ручна QA**
    Прогнати цикл Editor → Processing → Result → Metrics → Detector (web + Expo Go), перевірити відсутність API-ключів у клієнтському трафіку/бандлі.

## Наступний крок

Задача №1 блокує решту: потрібні від користувача Supabase-проєкт (або підтверджена альтернатива) і Anthropic API-ключ, виставлений як серверний секрет.
