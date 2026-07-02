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

2. ~~**Layer 1 — LLM humanize endpoint**~~ ✅ Зроблено
   `POST /humanize` валідує `{text, mode, tone, style}` проти реальних значень з `src/data/content.ts` (`light/medium/aggressive/ninja`, 13 тонів, 5 стилів) і будує системний промпт у `supabase/functions/_shared/humanizePrompt.ts` — окремі інструкції під кожен режим (light → лише легкі правки; medium → баланс довжини речень; aggressive → високі перплексія/сплесковість; ninja → максимальна ентропія), плюс тон і стиль. Невалідні `mode`/`tone`/`style` повертають 400.

3. ~~**Layer 2 — regex AI-slop post-processing**~~ ✅ Зроблено
   `supabase/functions/_shared/aiSlopCleanup.ts` — чистий TS-модуль зі списком маркерів (delve, tapestry, crucial, vibrant, nestled, underscore, furthermore, moreover, in conclusion, boasts, testament to, realm, elevate, leverage, robust, seamless, unlock, unleash, game-changer, cutting-edge, ever-evolving тощо) і таблицею синонімічних замін (кілька варіантів на маркер, обирається випадково, щоб повтори маркера не схлопувались в один і той самий патерн). Заміна регістро-незалежна (`\b`-межі слів), зберігає регістр оригіналу (Title Case / UPPERCASE). `POST /humanize` тепер прогонює відповідь Claude через `cleanAiSlop()` перед поверненням клієнту. Юніт-тести в `aiSlopCleanup.test.ts` (Deno test runner).

4. ~~**Евристичний детектор ШІ**~~ ✅ Зроблено
   `supabase/functions/_shared/aiDetector.ts` — чиста TS-реалізація без зовнішніх API/ключів, схована за інтерфейсом `AiDetector` (`detect(text): Promise<DetectionResult>`), щоб пізніше підмінити на реальний GPTZero без зміни викликаючого коду. Оцінка sentence-level (`red`/`amber`/`green`) за трьома сигналами: збіги зі списком типових "AI"-фраз і слів (as an AI language model, delve, tapestry, furthermore, moreover, paradigm shift тощо), повторювані початки речень і низька лексична розмаїтість усередині речення — зважена сума (0.7/0.15/0.15, як у видаленому Python-прототипі за духом, але per-sentence і в TS, з вагою, підібраною так, щоб 2+ маркери в одному реченні самі по собі давали "red"). Новий `POST /detect` (`supabase/functions/detect/index.ts`) валідує вхідний `text` і повертає `{ overallScore, risk, sentences }`. Юніт-тести в `aiDetector.test.ts` (Deno test runner).

5. ~~**Readability engine (FRE/FKGL)**~~ ✅ Зроблено
   `src/utils/readability.ts` — чиста TS-реалізація формул Flesch Reading Ease і Flesch-Kincaid Grade Level: підрахунок слів (regex-токенізація з підтримкою апострофів), речень (split за кінцевою пунктуацією) і складів (евристичний voxel-group counter із спеціальним випадком для "-le" після приголосної, як у "apple"/"table"). Без зовнішніх API чи залежностей, тож `analyzeReadability(text)` можна викликати напряму з Metrics-екрана (Expo/RN). `supabase/functions/_shared/readability.ts` реекспортує той самий модуль (`export * from "../../../src/utils/readability.ts"`), щоб бекенд використовував те саме джерело правди без дублювання коду. Юніт-тести в `supabase/functions/_shared/readability.test.ts` (Deno test runner) покривають підрахунок складів і контрастні кейси (прості короткі речення → високий FRE/низький FKGL, довгі складні речення → навпаки).

6. ~~**Wire Editor + Processing**~~ ✅ Зроблено
   `RootNavigator.tsx` тепер володіє життєвим циклом запиту (`idle/pending/done/error`) через новий `src/lib/api.ts` (`humanize()` б'є в `POST {EXPO_PUBLIC_API_URL}/humanize`, дефолт — локальний `supabase functions serve`). Кнопка "Humanize" в `Editor.tsx` викликає `onSubmit`, який стартує реальний запит замість мок-переходу. `Processing.tsx` більше не покладається на фіксований `setTimeout` до `go('result')`: кроки пайплайну й гейдж підсвічуються косметичним таймером лише для проміжних кроків (немає гранулярного сигналу прогресу від одного `/humanize`-виклику), а останній крок і навігація на Result розблоковуються виключно реальною відповіддю сервера (`stage === 'done'`); при помилці (`stage === 'error'`) показується екран з причиною і кнопками Retry/Back замість мовчазного переходу далі. Перевірено вручну (Expo web export + Playwright): помилковий шлях (сервер недоступний) і успішний шлях (локальний мок `/humanize`) обидва працюють коректно.

   *Примітка: `Result.tsx` поки що показує мокові речення (`RESULT_SENTENCES`) — реальний текст з відповіді вже зберігається в стані `RootNavigator`, але підключення до Result-екрана заплановане в пункті 7.*

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
