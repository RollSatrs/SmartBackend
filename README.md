# Backend Template

Стартовый шаблон бэкенда на [NestJS](https://nestjs.com) с авторизацией, Postgres/Drizzle ORM,
почтой и заготовкой под AI (OpenAI). Используется как база для новых проектов.

## Стек

- **NestJS 11** (Express)
- **Drizzle ORM** + PostgreSQL
- **JWT-авторизация** через httpOnly-cookie (`@nestjs/jwt`)
- **class-validator / class-transformer** — валидация DTO
- **@nestjs/throttler** — rate-limiting
- **@nestjs/swagger** — автогенерируемая документация API
- **Nodemailer** — отправка писем (сброс пароля)
- **OpenAI SDK** — заготовка AI-модуля

## Быстрый старт

### 1. Переменные окружения

Скопируйте `.env.example` в `.env` и заполните значения:

```bash
cp .env.example .env
```

| Переменная      | Описание                                              |
| --------------- | ------------------------------------------------------ |
| `PORT`          | Порт, на котором слушает сервер (по умолчанию `3001`)  |
| `DATABASE_URL`  | Строка подключения к PostgreSQL                        |
| `FRONT_URL`     | URL фронтенда (CORS + ссылки в письмах)                 |
| `SECRET_KEY`    | Секрет для подписи JWT                                 |
| `OPENAI_API`    | Ключ OpenAI (опционально, авто-классификация идей по категориям) |
| `NOMINATIM_URL` | URL Nominatim для forward/reverse geocoding             |
| `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | Настройки почты для сброса пароля      |
| `NODE_ENV`      | `development` / `production` / `test`                  |

Переменные валидируются при старте (`src/config/env.validation.ts`) — приложение не запустится
с некорректным `.env`.

### 2. Установка и запуск (локально)

```bash
pnpm install
pnpm db:push       # применить схему к БД (или db:migrate, если используете миграции)
pnpm start:dev
```

### 3. Запуск через Docker

Поднимает Postgres и бэкенд одной командой:

```bash
docker compose up --build
```

## Скрипты

| Команда            | Назначение                                  |
| ------------------ | -------------------------------------------- |
| `pnpm start:dev`   | Запуск в watch-режиме                        |
| `pnpm build`       | Сборка в `dist/`                             |
| `pnpm start:prod`  | Запуск собранного приложения                 |
| `pnpm lint`        | ESLint с автофиксом                          |
| `pnpm test`        | Юнит-тесты (Jest)                            |
| `pnpm test:e2e`    | E2E-тесты                                    |
| `pnpm db:generate` | Сгенерировать миграцию из схемы Drizzle      |
| `pnpm db:migrate`  | Применить миграции                           |
| `pnpm db:push`     | Синхронизировать схему с БД напрямую (dev)   |
| `pnpm db:studio`   | Drizzle Studio — просмотр БД в браузере      |

## API-документация

После запуска в режиме, отличном от `production`, Swagger доступен по адресу
[http://localhost:3001/docs](http://localhost:3001/docs).

## Геокодирование

Район идеи определяется через [Nominatim OpenStreetMap](https://nominatim.org/).
Клиенты должны отображать атрибуцию `© OpenStreetMap contributors` рядом с картой.

## AI-классификация идей

При создании идеи (`POST /ideas`) `ClassificationService` отправляет заголовок и
описание в OpenAI (`gpt-4o-mini`) и просит вернуть JSON `{ categorySlug, confidence }`
из уже засеянных категорий (`pnpm db:seed`). Категория подставляется автоматически, если
`OPENAI_API` задан и модель уверена в ответе (`categorySlug` совпадает с одним из
известных slug); иначе идея остаётся без категории (`category: null`), и госорган
выбирает её вручную. Без `OPENAI_API` шаг классификации пропускается — создание идеи
не блокируется и не падает.

Вместе с текстом модели передаётся и `photoUrl` — она также оценивает, правдоподобно
ли фото показывает заявленную проблему, и возвращает `photoFlag`
(`consistent` / `inconsistent` / `uncertain`) и `photoFlagReason`. Это не блокирует
отправку идеи — только помечает её для госоргана как требующую проверки, если фото,
похоже, не относится к описанию (защита от недобросовестных обращений).

## Структура проекта

```
src/
  auth/       # регистрация, логин, сброс пароля, JWT-guard
  ai/         # обёртка над OpenAI
  mail/       # отправка писем
  db/         # схема Drizzle
  config/     # валидация переменных окружения
  common/     # общие фильтры/утилиты (глобальный exception filter)
  health/     # health-check эндпоинт
shared/       # константы/типы, общие для нескольких модулей
```

## Безопасность

- Пароли хешируются, JWT хранится в httpOnly-cookie (`secure` включается автоматически в `production`).
- Rate-limiting на `/auth/login`, `/auth/register`, `/auth/forgot-password`.
- `helmet` для базовых security-заголовков.
- Глобальный exception filter скрывает внутренние детали ошибок от клиента.

## CI/CD

В `.github/workflows/ci.yml` настроен пайплайн: установка зависимостей → lint → test → build,
запускается на push/PR в `main`.

## Лицензия

Приватный шаблон, см. [LICENSE](./LICENSE).
