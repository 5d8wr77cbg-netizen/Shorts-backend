# Shorts Studio — backend

Генератор YouTube Shorts: сценарий (GPT) → картинки (gpt-image-1) → озвучка (TTS) → MP4 (FFmpeg).

## Стиль `minimal` — ролики про деньги

Формат по разбору канала Simply Animated: чёрный фон, белые 3D-человечки, одна идея = одна
визуальная метафора, одна короткая фраза сверху (печатается по буквам, ключевое слово жирным),
2–4 сцены, 10–20 секунд, без цифр и инфографики. Промпты — в `lib/minimal.js`.

### Ролик за один запрос

```bash
curl -X POST http://localhost:4000/api/minimal/render \
  -F topic="Why saving feels slow but wins" -F language=en -F scenes=3 \
  -F music=@music.mp3 -o short.mp4
```

Без `topic` GPT сам выберет тему. План ролика (заголовок, описание, хэштеги) приходит в
заголовке ответа `X-Short-Plan` (JSON, URI-encoded). Генерация занимает 1–3 минуты.

### По шагам (если нужно править сцены вручную)

1. `POST /api/minimal/ideas` `{ "language": "en", "count": 10 }` — идеи роликов.
2. `POST /api/minimal/plan` `{ "topic": "...", "language": "en", "scenes": 3 }` — сцены
   `{ caption, highlight, labels, imagePrompt, duration }`.
3. `POST /api/generate-image` `{ "prompt": imagePrompt, "style": "minimal" }` — картинка на сцену.
4. `POST /api/build-video` (multipart): `images`, `music` (опц.), `style=minimal`,
   `manifest` = массив сцен из шага 2.

## Переменные окружения

- `OPENAI_API_KEY` — обязательно
- `FRONTEND_ORIGIN` — домен фронтенда для CORS
- `CAPTION_FONT` — шрифт текста (по умолчанию `Inter`), `FONTS_DIR` — папка со своими шрифтами
