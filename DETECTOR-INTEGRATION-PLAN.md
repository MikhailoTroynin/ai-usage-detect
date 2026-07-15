# План: Інтеграція зі справжніми детекторами ШІ

> Мета: замінити евристичний `heuristicDetector` (`supabase/functions/_shared/aiDetector.ts`)
> на реальні зовнішні AI-детектори, зберігши поточний інтерфейс `AiDetector` і контракт
> `POST /detect`, і підключити реальні per-provider бали до картки "Detectors" на екрані Result.
> Це пункт "Реальні AI-детектори" з розділу «Наступні фази» у `PLAN.md`.

## Поточний стан (звідки стартуємо)

- **Backend:** Supabase Edge Functions (Deno/TS). `POST /detect` (`supabase/functions/detect/index.ts`)
  валідує вхідний `text` (≤ 20000 символів) і викликає `heuristicDetector.detect(text)`.
- **Детектор:** `supabase/functions/_shared/aiDetector.ts` — чиста евристика (stock-фрази,
  повторювані початки речень, лексична розмаїтість) за інтерфейсом
  `AiDetector { detect(text): Promise<DetectionResult> }`. `DetectionResult = { overallScore, risk, sentences }`.
- **Секрети:** тримаються виключно на сервері (`Deno.env.get`), у клієнт не потрапляють
  (перевірено в QA пункту 10). Auth-гард `requireUser` уже стоїть на `/detect`.
- **Клієнт:** `src/lib/api.ts::detect()` типізує відповідь як `DetectResult`.
  `src/screens/Detector.tsx` і `Result.tsx` рендерять sentence-level підсвітку.
- **Мок, який лишився:** картка "Detectors" на `Result.tsx` (`src/data/content.ts::DETECTORS`)
  — статичні `before/after` для GPTZero/Turnitin/Copyleaks/Originality.ai. Це головний
  видимий мок, який має стати реальним.

## Реальність провайдерів (важливо: приймаємо усвідомлено)

Не всі чотири мокові бренди інтегровні через публічний API. Рішення по кожному:

| Провайдер | Публічний REST API | Sentence-level | Придатність | Рішення |
|---|---|---|---|---|
| **GPTZero** | ✅ так (`/v2/predict/text`) | ✅ так (`sentences[]`) | Висока, є документація, sandbox-ключ | **Основний провайдер** |
| **Originality.ai** | ✅ так (`/api/v1/scan/ai`) | частково (per-blocks) | Висока, платний | **Другий провайдер** |
| **Copyleaks** | ✅ так (OAuth2 + AI Detector API) | ✅ так (`results[]`) | Середня (складніший OAuth-флоу) | Опційно, за прапорцем |
| **Winston AI / Sapling** | ✅ так | так/частково | Альтернатива | Резерв |
| **Turnitin** | ❌ немає публічного self-serve API (лише LMS/інституційні інтеграції) | — | Недоступний | **Прибрати з реальних**; або лишити як "N/A" |

**Висновок:** реалізуємо GPTZero (обов'язково) + Originality.ai + Copyleaks (за прапорцями).
Turnitin позначаємо як недоступний у продукті (не вводимо в оману користувача фейковими цифрами).

## Архітектурні рішення

1. **Зберігаємо інтерфейс `AiDetector`** як контракт для одного провайдера. Кожен реальний
   провайдер — окремий модуль, що реалізує `AiDetector` і нормалізує свою відповідь у
   спільний `DetectionResult` (0–100, `red/amber/green`, `sentences[]`).
2. **Нормалізація** — кожен провайдер повертає свій формат (ймовірність 0–1, класи, per-block).
   Пишемо adapter-функції, що зводять усе до нашого `DetectionResult`. Мапінг ризику —
   спільний `scoreToRisk` (уже є).
3. **Агрегація** — новий `MultiDetector`, що паралельно (`Promise.allSettled`) опитує ввімкнені
   провайдери й повертає розширений результат: `{ overall, providers: ProviderResult[] }`, де
   `overall` — це або консенсус (медіана/зважене середнє доступних), або результат основного
   провайдера. Це дає дані і для sentence-підсвітки, і для per-provider картки.
4. **Graceful degradation** — якщо у провайдера немає ключа або він упав/протаймаутив,
   він просто відсутній у `providers[]`; якщо жоден зовнішній не доступний — фолбек на
   `heuristicDetector`, з полем `source: "heuristic"`, щоб клієнт міг чесно позначити «оцінка приблизна».
5. **Секрети й прапорці** — кожен провайдер вмикається наявністю свого ключа в `Deno.env`
   (`GPTZERO_API_KEY`, `ORIGINALITY_API_KEY`, `COPYLEAKS_API_KEY`+`COPYLEAKS_EMAIL`). Нема ключа —
   провайдер вимкнено, без падінь. Жодного ключа в клієнтському бандлі.
6. **Вартість/квоти** — реальні детектори платні. Захисти: обмеження довжини (вже є 20000),
   короткочасне кешування за хешем тексту (щоб повторний `/detect` того самого тексту не платив
   двічі), і rate-limit (перетинається з пунктом 14 у `PLAN.md`).

## Розширення контракту `/detect`

Зворотньо-сумісно: додаємо нові поля, старі лишаємо.

```ts
interface DetectionResult {          // без змін — для sentence-підсвітки
  overallScore: number;
  risk: DetectionRisk;
  sentences: SentenceDetection[];
}

interface ProviderResult {           // нове
  id: string;                        // "gptzero" | "originality" | "copyleaks" | "heuristic"
  name: string;                      // "GPTZero", ...
  score: number;                     // 0–100, ймовірність ШІ
  risk: DetectionRisk;
  available: boolean;                // false → показати "N/A" / помилку
  error?: string;
}

interface DetectResponse extends DetectionResult {
  source: "providers" | "heuristic"; // звідки overall/sentences
  providers: ProviderResult[];       // нове — для картки Detectors
}
```

## Покроковий чекліст реалізації

Кожен пункт — окремий коміт; після кожного `deno check` (де можливо) + клієнтський `tsc --noEmit`.

1. **Каркас провайдерної абстракції**
   - `_shared/detectors/types.ts` — `AiDetectorProvider`, `ProviderResult`, `DetectResponse`,
     спільні хелпери (`scoreToRisk`, нормалізатор ймовірності 0–1 → 0–100).
   - Винести `heuristicDetector` під цей інтерфейс як провайдер `id: "heuristic"` (адаптер,
     без зміни самої логіки — reuse `analyzeText`).

2. **GPTZero-провайдер** (`_shared/detectors/gptzero.ts`)
   - `POST https://api.gptzero.me/v2/predict/text`, заголовок `x-api-key: GPTZERO_API_KEY`,
     тіло `{ document, version }`.
   - Нормалізувати: `documents[0].completely_generated_prob`/`class_probabilities.ai` → overall;
     `documents[0].sentences[]` (`generated_prob`, `sentence`) → наш `sentences[]`.
   - Таймаут через `AbortController`; помилки не кидати назовні, повертати `available:false`.
   - Юніт-тест з мок-`fetch` (реальний ключ у CI не потрібен).

3. **Originality.ai-провайдер** (`_shared/detectors/originality.ts`)
   - `POST https://api.originality.ai/api/v1/scan/ai`, заголовок `X-OAI-API-KEY`.
   - Нормалізувати `score.ai` (0–1) → overall; per-block → sentences, якщо є, інакше лишити overall.
   - Мок-тест.

4. **Copyleaks-провайдер** (за прапорцем) (`_shared/detectors/copyleaks.ts`)
   - OAuth2: `POST /v3/account/login/api` (email+key) → Bearer-токен (кешувати токен у пам'яті
     функції до `expires`), далі `POST /v2/writer-detector/{scanId}/check`.
   - Нормалізувати `results.summary.ai`/`results[]` → overall + sentences.
   - Мок-тест. Якщо флоу виявиться надто важким — лишити за прапорцем вимкненим за замовчуванням.

5. **Агрегатор `MultiDetector`** (`_shared/detectors/index.ts`)
   - Збирає ввімкнені провайдери (за наявністю ключів), опитує `Promise.allSettled`.
   - `overall`/`sentences` беремо від основного (GPTZero, якщо доступний), інакше консенсус,
     інакше — фолбек `heuristic` з `source:"heuristic"`.
   - `providers[]` — по одному запису на кожен сконфігурований провайдер (доступний чи ні).

6. **Кеш за хешем тексту** (`_shared/detectors/cache.ts`)
   - In-memory LRU (Map з TTL) за SHA-256 тексту+набору провайдерів. Захист від повторної оплати
     в межах теплого інстансу функції. (Postgres-кеш — опційно, поза цим планом.)

7. **Оновити `POST /detect`** (`supabase/functions/detect/index.ts`)
   - Викликати `multiDetector.detect(text)` замість `heuristicDetector`.
   - Повертати розширений `DetectResponse`. Валідацію входу лишити.

8. **Клієнт: типи й API** (`src/lib/api.ts`)
   - Розширити `DetectResult` полями `source` і `providers: ProviderResult[]`.
   - Валідацію відповіді доповнити; лишити зворотню сумісність (поля опційні на клієнті).

9. **Клієнт: картка Detectors на Result** (`src/screens/Result.tsx`, `src/data/content.ts`)
   - Рендерити реальні `providers[]` замість статичного `DETECTORS`.
   - `before` — детект оригіналу, `after` — детект гуманізованого (обидва вже рахуються в
     `RootNavigator` через `/detect`, треба протягнути per-provider розбивку).
   - Провайдери з `available:false` показувати як "N/A" (сюди ж Turnitin), а не як 0.
   - `DETECTORS` лишити лише як демо-фолбек для Home→History-переходу.

10. **Конфіг, секрети, деплой**
    - README: перелік `*_API_KEY` серверних змінних (наголос — це секрети, не `EXPO_PUBLIC_*`).
    - `supabase/deploy.sh` і `.github/workflows/deploy-supabase.yml`: додати нові секрети
      (`supabase secrets set`) — опційні, деплой не має падати без них.
    - `supabase/.env.example` — задокументувати нові ключі.

11. **Резильєнтність і ліміти**
    - Спільний таймаут на зовнішні виклики (коротший за загальний 45s клієнта).
    - Мінімальний rate-limit per-user на `/detect` (перетин з пунктом 14 `PLAN.md`) — щоб дорогі
      детект-виклики не зловживались.

12. **Наскрізна QA**
    - З реальними ключами (коли надасть користувач): звіряння балів провайдерів до/після гуманізації.
    - Без ключів: фолбек на heuristic працює, `source:"heuristic"`, клієнт коректно показує "приблизно".
    - `tsc --noEmit` + `expo export --platform web` чисті; у бандлі немає жодного detector-ключа.
    - `deno test` для нових провайдерних тестів (де доступний бінарник Deno).

## Свідомо поза цим планом

- **Білінг/кредитна модель** під платні виклики детекторів (окрема фаза `PLAN.md`).
- **Постійний Postgres-кеш** результатів (зараз лише in-memory).
- **Turnitin** — немає self-serve API; лишаємо як "N/A".
- **Асинхронні/довгі скани** великих документів з polling (Copyleaks callback-флоу) — поза MVP цієї інтеграції.

## Ризики й застереження

- **Вартість:** кожен `/detect` тепер може коштувати грошей на кожного провайдера — тому кеш і
  rate-limit не опційні, а частина плану.
- **Немає ключів у цьому середовищі:** живий прогін проти реальних API виконає користувач;
  код пишемо так, щоб він тестувався мок-`fetch`-ом і безпечно деградував без ключів.
- **Розбіжність форматів провайдерів:** найбільша частина роботи — акуратні adapter-и й нормалізація;
  кожен провайдер покриваємо юніт-тестом на реальному прикладі його відповіді.
- **Rate limits провайдерів:** обробляти 429 як `available:false` з поясненням, не як фатальну помилку.
