# Shorts Studio — backend

Генератор YouTube Shorts: подписи → анимация → MP4 (FFmpeg).

## Страница «Сделать ролик» (с телефона)

Открой адрес сервера в браузере (например `https://my-server.onrender.com/`): тема, язык, сцена,
музыка, свои фразы → кнопка «Сделать ролик». Готовый ролик можно посмотреть, скачать или на iPhone
нажать «Сохранить / Поделиться» → «Сохранить видео» (попадёт в Фото). Название, описание и
хэштеги копируются кнопками.

Если сервер открыт в интернете, задай `ACCESS_CODE`: страница попросит код, а без него сервер
не будет делать ролики.

## Запуск на хостинге Render (с телефона)

1. Зайди на **render.com** → **Get Started** → войди через **GitHub**.
2. **New +** → **Web Service** → выбери репозиторий `Shorts-backend` (если его нет в списке —
   **Configure account** и дай Render доступ к нему).
3. Render сам увидит `Dockerfile`. Заполни:
   - **Name** — любое, например `moneylearn-shorts` (будет в адресе);
   - **Region** — ближайший (например, Frankfurt);
   - **Instance Type** — **Free** (бесплатно, ролик ~2–5 минут) или **Starter** (платно, ~1 минута).
4. **Environment Variables** → **Add**:
   - `ACCESS_CODE` = любой код (например `7391`) — без него страницей сможет пользоваться кто угодно;
   - `VIDEO_SIZE` = `720` — только для Free: ролик в 720p собирается вдвое быстрее.
5. **Create Web Service**. Сборка займёт 3–6 минут; когда статус станет **Live**, открой адрес
   вида `https://moneylearn-shorts.onrender.com` в Safari и добавь его на экран «Домой».

Бесплатный сервер засыпает через 15 минут без дела: первое открытие после паузы — около минуты.
Ролик собирается в фоне: телефон можно заблокировать, страница продолжит с того же места.
После каждого Merge в `main` Render обновляет сервер сам.

## Длинные ролики «What if…» (9+ минут, 16:9, с диктором)

Формат канала Ifverse Tales в стиле канала (разбор — в [docs/competitor-analysis.md](docs/competitor-analysis.md)).
На странице: **Формат → «Видео · 9+ мин»**, тема (например, «what if you invested $10 a day from 18?»),
язык, музыка → «Сделать длинное видео». Результат: MP4 1920×1080 с озвучкой, обложка 1280×720,
название, описание с таймкодами глав и теги.

- Сценарий: ИИ пишет план глав, потом каждую главу (`lib/longform/script.js`); без ИИ —
  готовый эталон «What If You Invested $10 a Day Starting at 18?» (`lib/longform/library.js`).
- Озвучка: OpenAI `gpt-4o-mini-tts`, голос `onyx` (≈ $0,15 за 9-минутный ролик) — нужен
  `OPENAI_API_KEY` с положительным балансом. Голос и манера: `TTS_VOICE`, `TTS_MODEL`, `TTS_INSTRUCTIONS`.
- Сборка тяжёлая: ~600 секунд процессорного времени на 9 минут видео. На Render Free это
  около часа, и бесплатный сервер засыпает без запросов — для длинных роликов нужен
  платный тариф (Starter ≈ 20 мин, Standard ≈ 10 мин) или `VIDEO_SIZE=720`.

API: `POST /api/jobs` с `mode=long` (+ `topic`, `language`, `minutes` 6–15, `music`, `story=ten_dollars_a_day`) →
`GET /api/jobs/:id` (поле `stage` — этап), `GET /api/jobs/:id/video`, `GET /api/jobs/:id/thumb`.

## Без платных ключей

Сервер работает вообще без ключей: анимированные ролики про деньги собираются бесплатно, а подписи
берутся из встроенной библиотеки фраз (`lib/phrases.js`: 7 сцен × 8 историй, английский и русский).

Чтобы подписи писал ИИ, достаточно бесплатного ключа (добавь в `.env`):

| Ключ | Где взять | Стоимость |
|---|---|---|
| `GEMINI_API_KEY` | aistudio.google.com → Get API key | бесплатный тариф с дневным лимитом |
| `GROQ_API_KEY` | console.groq.com → API Keys | бесплатный план с лимитом |
| `OPENAI_API_KEY` | platform.openai.com | платно |

Если ИИ не ответил (например, закончился бесплатный лимит), ролик всё равно соберётся из библиотеки.
`OPENAI_API_KEY` нужен только для картинок (`engine=images`, `/api/generate-image`) и озвучки (`/api/tts`).
`GET /health` показывает, какой ИИ сейчас используется.

## Стиль `minimal` — ролики про деньги в формате Simply Animated

Разбор канала конкурента — в [docs/competitor-analysis.md](docs/competitor-analysis.md).
Коротко: топ-ролики длятся 31–38 секунд, в каждом одна мысль, 3–5 сцен-сравнений и вывод
в конце; чёрный фон, белые человечки, золото — успех, красный — проблемы; экран часто
делится на 2–3 панели с подписями.

Движок (`lib/anim`) рисует такие ролики сам, без внешних сервисов:

- `figure.js` — человечек с суставами, позы, ходьба, бег;
- `props.js`, `text.js` — реквизит (золотые монеты, кубок, гора, айсберг, банка, дерево…)
  и текст в кадре;
- `actions.js` + `scenes.js` — 21 анимированная метафора (лестница с подписями, биржевой
  график, столбики, валун «ДОЛГ», качели «доход/расходы», банка, айсберг, «ТРАТЬ × 7 → КОПИ»,
  прыжок через пропасть, денежное дерево, молот и камень, гора, колонны, шкалы и другие);
- `beats.js` — сцена-«бит»: раскладка кадра (`single`, `stack2`, `stack3`, `side2`, `grid4`)
  и действие с параметрами в каждой панели;
- `lib/stories.js` — 12 готовых сюжетов по ~32 секунды на английском и русском.

| Сюжет (`story`) | О чём |
|---|---|
| `money_works` | Пусть деньги работают на тебя |
| `small_amounts` | Маленькие суммы дают большой результат |
| `debt_trap` | Долг всегда давит в ответ |
| `what_people_see` | Никто не видит, что внизу |
| `crowd` | Не трать как все |
| `market_crash` | Посмотри шире (обвал рынка) |
| `nine_to_five` | Построй свою дверь (работа → своё дело) |
| `lifestyle_inflation` | Повышай сбережения, а не расходы |
| `today_year` | Один год может изменить всё |
| `first_step` | А что, если получится? |
| `income_expenses` | Дело не в том, сколько ты зарабатываешь |
| `discipline_boring` | Дисциплина скучна, пока не окупится |

С ключом ИИ сценарий из таких же битов пишет ИИ под твою тему; без ключа (или если ИИ не
ответил) сюжет подбирается из библиотеки по ключевым словам темы.

### Ролик за один запрос (сцену и подписи выбирает ИИ или библиотека фраз)

```bash
curl -X POST http://localhost:4000/api/minimal/render \
  -F topic="Why saving feels slow but wins" -F language=en \
  -F music=@music.mp3 -o short.mp4
```

Без `topic` тема выбирается сама. `-F story=debt_trap` — конкретный сюжет,
`-F lines=$'Фраза 1\nФраза 2\nФраза 3\nФраза 4'` — свои фразы по одной на сцену,
`-F engine=library` — всегда без ИИ, `-F template=debt_ball` — старый короткий ролик из одной сцены. План ролика (заголовок, описание, хэштеги) приходит в
заголовке ответа `X-Short-Plan` (JSON, URI-encoded). Режим со статичными картинками
gpt-image-1 вместо анимации: `-F engine=images`.

### Свой сценарий из битов

```bash
curl -X POST http://localhost:4000/api/anim/render -H 'Content-Type: application/json' -d '{
  "beats": [
    { "layout": "stack3",
      "panels": [
        { "action": "jar_fill", "label": "Сегодня", "params": { "level": 0.1 } },
        { "action": "jar_fill", "label": "Через месяц", "params": { "from": 0.1, "level": 0.35 } },
        { "action": "jar_fill", "label": "Через год", "labelColor": "gold", "params": { "from": 0.35, "level": 1 } }
      ],
      "captions": [{ "text": "Откладывать понемногу кажется бесполезным.", "highlight": "бесполезным" }] },
    { "layout": "single",
      "panels": [{ "action": "mountain_climb", "params": { "top": "СВОБОДА" } }],
      "captions": [{ "text": "Продолжай подниматься.", "highlight": "подниматься" }] }
  ]
}' -o short.mp4
```

Все действия, их параметры, раскладки и сюжеты: `GET /api/anim/templates`.

Старый формат (одна сцена) тоже работает:

```bash
curl -X POST http://localhost:4000/api/anim/render -H 'Content-Type: application/json' -d '{
  "scenes": [{
    "template": "saver_vs_spender",
    "captions": [
      { "text": "Same paycheck. Different habits.", "highlight": "habits" },
      { "text": "The other wonders where it went.", "highlight": "went" }
    ]
  }]
}' -o short.mp4
```

Список сцен: `GET /api/anim/templates`.

Фоновый режим (его использует страница): `POST /api/jobs` с теми же полями, что у
`/api/minimal/render` (или `scenes`) → `{ id }`; статус — `GET /api/jobs/:id`,
готовый ролик — `GET /api/jobs/:id/video`. Музыка — файлом `music` в multipart-запросе
(тогда `scenes` передаётся строкой JSON).

### По шагам

1. `POST /api/minimal/ideas` `{ "language": "en", "count": 10 }` — идеи роликов.
2. `POST /api/minimal/plan` `{ "topic": "...", "language": "en" }` — сцены и подписи.
3. `POST /api/anim/render` `{ "scenes": plan.scenes }` — сборка (можно поправить подписи).

## Переменные окружения

Все необязательные.

- `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY` — ключи ИИ (см. выше)
- `LLM_PROVIDER` — `gemini` | `groq` | `openai`, если ключей несколько (по умолчанию первый найденный в этом порядке)
- `GEMINI_MODEL` (по умолчанию `gemini-3.5-flash-lite`), `GROQ_MODEL` (`openai/gpt-oss-20b`), `OPENAI_MODEL` (`gpt-4o-mini`)
- `ACCESS_CODE` — код доступа к странице и API (рекомендуется для сервера в интернете)
- `FRONTEND_ORIGIN` — домен фронтенда для CORS
- `CAPTION_FONT` — шрифт текста (по умолчанию `Inter`), `FONTS_DIR` — папка со своими шрифтами
- `PORT` — порт (по умолчанию 4000; хостинги задают его сами)
- `VIDEO_SIZE` — `1080` (по умолчанию) или `720`: на слабом сервере 720 вдвое быстрее
- `RENDER_CONCURRENCY` — сколько роликов собирать одновременно (по умолчанию 1; на 512 МБ больше нельзя)
- `JOB_TTL_MIN` — сколько минут хранить готовый ролик на сервере (по умолчанию 60)
- `FFMPEG_THREADS` — потоки кодировщика (по умолчанию 2)
- `TTS_MODEL` (`gpt-4o-mini-tts`), `TTS_VOICE` (`onyx`), `TTS_INSTRUCTIONS` — озвучка длинных роликов
