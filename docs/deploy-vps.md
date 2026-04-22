# Деплой MoviePlatform на VPS (Docker Compose)

Ниже — самый прямой путь поднять проект на VPS через готовые прод-конфиги: docker-compose и скрипт деплоя.

## 0) Что потребуется

- VPS (рекомендовано: 2–4 vCPU, 4+ GB RAM, 30+ GB SSD). Если RAM мало — добавьте swap.
- Домен (или хотя бы публичный IP).
- Доступ по SSH.

## 1) DNS и порты

1. В DNS заведите `A`-запись домена на IP VPS (например `example.com -> 1.2.3.4`).
2. Откройте порты на сервере:
   - обязательно: `22` (SSH), `80` (HTTP)
   - желательно: `443` (HTTPS)
   - если поднимаете вторую версию параллельно: откройте выбранный порт, например `8080`

## 2) Подготовка VPS (Ubuntu/Debian)

Подключитесь по SSH и выполните:

```bash
sudo apt-get update
sudo apt-get -y upgrade

# Базовые утилиты
sudo apt-get install -y ca-certificates curl git

# Docker + compose plugin (официальный репозиторий Docker)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# (опционально) запуск docker без sudo
sudo usermod -aG docker $USER
# перелогиньтесь, чтобы группа применилась
```

Проверка:

```bash
docker --version
docker compose version
```

## 3) Загрузка проекта на сервер

Самый удобный способ — через Git.

```bash
# выберите директорию, где будет лежать проект
mkdir -p ~/apps
cd ~/apps

# если репозиторий приватный — используйте SSH-ключи или токен
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> movieplatform
cd movieplatform
```

Если вы **уже создали папку** под новую версию и **уже находитесь внутри неё** (и папка пустая), можно клонировать прямо в текущую директорию:

```bash
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> .
```

Если Git недоступен — альтернатива: залить архив/rsync, но Git обычно проще.

## 4) Настройка переменных окружения для production

Проект в production ожидает env-файл, который читает скрипт `scripts/deploy.sh`.

1. На сервере создайте env-файл на основе шаблона:

```bash
cp .env.example .env.production
```

2. Откройте и заполните значения:

```bash
nano .env.production
```

Минимально важные поля (самые частые причины, почему не стартует):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `JWT_SECRET` (должен быть длинным и случайным)
- `APP_URL` (публичный URL сайта, например `https://example.com`)
- `CORS_ORIGINS` (минимум ваш публичный домен)
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- `MINIO_PUBLIC_ENDPOINT` (должен быть доступен из браузера)
- `NEXT_PUBLIC_API_URL` (публичный API URL)
- `NEXT_PUBLIC_APP_URL` (публичный URL фронта)
- `NEXT_PUBLIC_MINIO_URL` (если хотите раздавать MinIO через reverse proxy)

Рекомендованные production-значения для URL при использовании встроенного Nginx из compose:

- `NEXT_PUBLIC_APP_URL=https://example.com`
- `NEXT_PUBLIC_API_URL=https://example.com/api/v1`
- `MINIO_PUBLIC_ENDPOINT=https://example.com/minio`
- `NEXT_PUBLIC_MINIO_URL=https://example.com/minio`

Секреты:

- Сгенерируйте `JWT_SECRET`, например:

```bash
openssl rand -hex 32
```

Почта (SMTP): в prod-compose по умолчанию поднимается Mailpit (как «ловушка писем»). Для реальной отправки замените `SMTP_HOST/PORT/USER/PASSWORD` на реальный SMTP.

## 5) Первый запуск (production)

В репозитории уже есть готовый скрипт деплоя.

```bash
chmod +x ./scripts/deploy.sh
./scripts/deploy.sh
```

Скрипт:
- подтянет последние изменения (git pull)
- соберёт Docker-образы
- поднимет сервисы
- выполнит `prisma migrate deploy`

Проверка статуса:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Проверка health:

- `http://<ваш-домен>/nginx-health`
- `http://<ваш-домен>/api/v1/health`

## 5.1) Параллельный деплой второй версии (v2) рядом со старой

Если на сервере уже крутится старая версия на `http://89.108.66.37` (порт 80) и вы не хотите её трогать, поднимайте новую **в другой папке** и на **другом внешнем порту**.

Почему так: в старом [docker-compose.prod.yml](docker-compose.prod.yml) зафиксированы `container_name` и имя сети — из‑за этого второй стек будет конфликтовать. Для параллельного запуска в репозитории добавлен отдельный compose: [docker-compose.prod.v2.yml](docker-compose.prod.v2.yml).

### Шаги на VPS

1) Создайте отдельную папку и склонируйте репозиторий:

```bash
mkdir -p ~/apps
cd ~/apps
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> movieplatform-v2
cd movieplatform-v2
```

Откройте порт для v2 (если используете UFW):

```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

Если UFW выключен/не установлен — порт может блокироваться на уровне провайдера (Security Group). Тогда откройте `8080/tcp` в панели VPS.

2) Создайте production env:

```bash
cp .env.example .env.production
nano .env.production
```

3) Для теста по IP на порту 8080 выставьте минимум такие URL:

- `APP_URL=http://89.108.66.37:8080`
- `NEXT_PUBLIC_APP_URL=http://89.108.66.37:8080`
- `NEXT_PUBLIC_API_URL=http://89.108.66.37:8080/api/v1`
- `MINIO_PUBLIC_ENDPOINT=http://89.108.66.37:8080/minio`
- `NEXT_PUBLIC_MINIO_URL=http://89.108.66.37:8080/minio`

И обязательно:

- `JWT_SECRET` — уникальный секрет (не как в dev)
- `CORS_ORIGINS=http://89.108.66.37:8080` (и/или другие разрешённые origin)

4) Запустите v2-деплой:

```bash
chmod +x ./scripts/deploy-v2.sh
./scripts/deploy-v2.sh
```

По умолчанию [docker-compose.prod.v2.yml](docker-compose.prod.v2.yml) публикует Nginx на `8080:80`. Если порт 8080 занят — можно изменить переменной окружения при запуске:

```bash
MP_V2_HTTP_PORT=8082 ./scripts/deploy-v2.sh
```

5) Проверка:

- `http://89.108.66.37:8080/nginx-health`
- `http://89.108.66.37:8080/api/v1/health`

### Вход в админку / тестовые пользователи

В v2-стеке поднимается **новая база** (новый docker volume), поэтому “старые” логины/пароли из предыдущей версии обычно не работают.

Если нужно быстро получить тестовые аккаунты (включая ADMIN), можно один раз выполнить seed:

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production exec -T api node prisma/seed.js
```

Seed создаёт пользователей:
- `admin@movieplatform.local / admin123` (ADMIN)
- `moderator@movieplatform.local / mod123` (MODERATOR)
- `user@movieplatform.local / user123` (BUYER)

Используйте это только для теста на VPS. Для реального продакшена — создайте свои учётки и смените пароли.

### Перенос данных из первой версии (v1 → v2)

Да, можно забрать данные со старого проекта. Самый безопасный вариант — **скопировать базу** (и при необходимости файлы MinIO) в новый стек. Старый стек при этом можно не трогать.

#### Вариант A (рекомендовано): клонировать PostgreSQL из v1 в v2

1) На всякий случай остановите API нового стека (v2), чтобы он не писал в БД во время восстановления:

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production stop api web nginx
```

2) Скопируйте БД из v1 в v2 одной командой (дамп → restore по пайпу):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
   pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges \
| docker compose -f docker-compose.prod.v2.yml --env-file .env.production exec -T postgres \
   pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges
```

3) После восстановления примените миграции новой версии (v2), если они есть:

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.v2.yml --env-file .env.production exec -T api \
   npx prisma migrate deploy --schema=prisma/schema.prisma
```

Это перенесёт пользователей/пароли (bcrypt-хеши) и данные приложения, поэтому логины из v1 начнут работать в v2.

Важно: команда выше **перезапишет данные** в v2 базе (используется `--clean`).

#### Вариант B (опционально): перенести файлы MinIO (видео/превью/аватары)

Если вы хотите, чтобы в v2 были доступны уже загруженные файлы, нужно перенести данные MinIO.

1) Узнайте имена docker-volume’ов MinIO (обычно что-то вроде `movieplatform_minio_data` и `movieplatform-v2_minio_data`):

```bash
docker volume ls | grep -i minio_data
```

2) Для консистентности остановите оба MinIO на время копирования (короткая пауза):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production stop minio
docker compose -f docker-compose.prod.v2.yml --env-file .env.production stop minio
```

3) Скопируйте данные из volume v1 в volume v2 (замените имена volume’ов на ваши):

```bash
docker run --rm \
   -v movieplatform_minio_data:/from \
   -v movieplatform-v2_minio_data:/to \
   alpine sh -lc 'cd /from; cp -a . /to'
```

4) Запустите MinIO обратно:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d minio
docker compose -f docker-compose.prod.v2.yml --env-file .env.production up -d minio
```

Если не уверены, нужны ли файлы — начните с переноса PostgreSQL (Вариант A): чаще всего это решает проблему с логином и данными.

Быстрая проверка на сервере, что порт слушается:

```bash
ss -lntp | grep ':8080'
```

### Если фронт работает, а API отдаёт `502 Bad Gateway`

Иногда `api` контейнер пересоздаётся (меняется его IP в docker-сети), а `nginx` остаётся работать со старым upstream. Симптом: команда из `nginx` контейнера до `api:4000` работает, но запросы через `http://<ip>:8080/api/...` дают 502.

Фикс:

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production restart nginx
```

Когда убедитесь, что всё ок, дальше обычно делают нормальный домен + HTTPS и уже переключают трафик на новую версию.

### Если при загрузке/транскодинге видео ошибка `NoSuchBucket`

Симптом в логах `api`:

- `Transcode failed ... — The specified bucket does not exist`

Это значит, что в MinIO не созданы бакеты (обычно `videos`, `thumbnails`, ...). В наших compose-файлах это делает сервис `minio-setup`.

Починка на VPS (для v2-стека):

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production run --rm -T minio-setup
```

Если команда внезапно просит `Enter Access Key/Enter Secret Key`, значит у вас на VPS запущен старый compose (без проброса переменных в `minio-setup`) или не подхватился `.env.production`.

### Если в браузере видео запрашивается как `http://localhost:9000/...`

Если при просмотре (например, Shorts) в DevTools видно запросы вида:

- `http://localhost:9000/videos/<contentId>/master.m3u8`

то это означает, что ссылки на файлы **уже сохранены в базе** (колонки `video_files.file_url`, `content.thumbnail_url`, `content.preview_url`) с dev-адресом.

1) Сначала убедитесь, что в `.env.production` (v2) стоит правильный публичный MinIO endpoint (через nginx v2):

- `MINIO_PUBLIC_ENDPOINT=http://89.108.66.37:8080/minio`

2) Пересоздайте `api` (чтобы он работал с новым endpoint для новых загрузок):

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production up -d api
```

3) Исправьте уже сохранённые ссылки в Postgres (замените IP/порт на свои):

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production exec -T postgres sh -lc '
   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<"SQL"
UPDATE video_files
SET file_url = replace(file_url, "http://localhost:9000", "http://89.108.66.37:8080/minio")
WHERE file_url LIKE "http://localhost:9000/%";

UPDATE content
SET thumbnail_url = replace(thumbnail_url, "http://localhost:9000", "http://89.108.66.37:8080/minio")
WHERE thumbnail_url LIKE "http://localhost:9000/%";

UPDATE content
SET preview_url = replace(preview_url, "http://localhost:9000", "http://89.108.66.37:8080/minio")
WHERE preview_url LIKE "http://localhost:9000/%";
SQL
'
```

После этого перезайдите на страницу и обновите кэш (Ctrl+F5).

Проверка, что бакеты появились:

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production exec -T minio sh -lc 'ls -la /data'
```

После этого повторите загрузку видео.

Важно: `minio-setup` использует `MINIO_ROOT_USER/MINIO_ROOT_PASSWORD` из `.env.production`. Если там пусто/не совпадает с MinIO — создание бакетов не сработает.

### Если в логах EmailProcessor `ECONNREFUSED 127.0.0.1:1025`

Это не про видео, но будет спамить логи. В Docker-контейнере `127.0.0.1` — это сам контейнер, а SMTP у нас отдельным сервисом (`mailpit`).

В `.env.production` для v2 оставьте пустым или выставьте:

- `SMTP_HOST=mailpit`
- `SMTP_PORT=1025`

И перезапустите API:

```bash
docker compose -f docker-compose.prod.v2.yml --env-file .env.production restart api
```

## 6) Про HTTPS (важно)

Текущий production compose публикует только порт 80. Для нормального продакшена обычно нужен HTTPS.

Простые варианты:

1) **Быстро для теста:** оставить HTTP на 80.

2) **Рекомендовано:** поставить Nginx/Caddy на хосте для TLS (certbot/Let’s Encrypt) и проксировать на Docker.
   - Для этого удобно изменить публикацию порта контейнерного Nginx на `127.0.0.1:8080:80`, а хостовый Nginx слушает `80/443`.

Если хотите — скажите, какой у вас домен/ОС на VPS и хотите ли HTTPS через Let’s Encrypt, я дам точный конфиг (Nginx или Caddy) под ваш случай.
