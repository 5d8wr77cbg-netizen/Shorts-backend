# Shorts Studio — backend

Генератор YouTube Shorts: сценарий (GPT) → картинки (gpt-image-1) → озвучка (TTS) → MP4 (FFmpeg).

## Стиль `minimal` — анимированные ролики про деньги

Формат по разбору канала Simply Animated: чёрный фон, белые 3D-человечки, одна идея = одна
визуальная метафора, одна короткая фраза сверху (печатается по буквам, ключевое слово жирным),
10–20 секунд, без цифр и инфографики.

Анимация рисуется своим движком (`lib/anim`), без внешних сервисов и без генерации картинок:
персонаж с суставами (`figure.js`), реквизит (`props.js`) и готовые сцены (`scenes.js`):

| Сцена | Что происходит | Про что |
|---|---|---|
| `saver_vs_spender` | один складывает монеты в стопку, другой выбрасывает свои | копить vs тратить |
| `compound_stairs` | столбики монет растут всё быстрее, герой поднимается наверх | сложный процент |
| `crowd_follow` | толпа с пакетами идёт к обрыву, герой разворачивается | потребительство, толпа |
| `debt_ball` | герой тащит гирю на цепи, гиря растёт | долги, кредиты |
| `ladder_climb` | герой лезет по лестнице к свету | путь к богатству |
| `door_light` | герой стучит, дверь открывается, свет | возможности, действие |
| `paycheck_treadmill` | бег на дорожке, зарплата приходит и уезжает | крысиные бега |

### Ролик за один запрос (GPT пишет подписи и выбирает сцену)

```bash
curl -X POST http://localhost:4000/api/minimal/render \
  -F topic="Why saving feels slow but wins" -F language=en \
  -F music=@music.mp3 -o short.mp4
```

Без `topic` GPT сам выберет тему. План ролика (заголовок, описание, хэштеги) приходит в
заголовке ответа `X-Short-Plan` (JSON, URI-encoded). Режим со статичными картинками
gpt-image-1 вместо анимации: `-F engine=images`.

### Свой сценарий без GPT

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

Список сцен: `GET /api/anim/templates`. Музыка — файлом `music` в multipart-запросе
(тогда `scenes` передаётся строкой JSON).

### По шагам

1. `POST /api/minimal/ideas` `{ "language": "en", "count": 10 }` — идеи роликов.
2. `POST /api/minimal/plan` `{ "topic": "...", "language": "en" }` — сцены и подписи.
3. `POST /api/anim/render` `{ "scenes": plan.scenes }` — сборка (можно поправить подписи).

## Переменные окружения

- `OPENAI_API_KEY` — обязательно
- `FRONTEND_ORIGIN` — домен фронтенда для CORS
- `CAPTION_FONT` — шрифт текста (по умолчанию `Inter`), `FONTS_DIR` — папка со своими шрифтами
