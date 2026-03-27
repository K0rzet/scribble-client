# 🎨 Scribble Client

Клиентская часть мультиплеерной игры Scribble (клон Skribbl.io) для Яндекс Игр.

## Технологии

- **React 19** + **TypeScript**
- **Vite** — сборка
- **Socket.io-client** — реалтайм коммуникация
- **React Router** — маршрутизация

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

Клиент запустится на `http://localhost:5174`

## Сборка для продакшн

```bash
npm run build
```

Готовые файлы в `dist/`.

## Переменные окружения

Создайте `.env`:

```env
VITE_SERVER_URL=https://your-server-url.com
```

## Яндекс Игры

Для загрузки в Яндекс Игры:

1. Соберите проект: `npm run build`
2. Заархивируйте содержимое `dist/`
3. Загрузите в [консоль разработчика](https://games.yandex.ru/console/)
