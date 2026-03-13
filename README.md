# Сварочный шов — мини-игра

Небольшая браузерная игра ко Дню вахтовика. Игра полностью статическая (`index.html`, `styles.css`, `script.js`) и подходит для публикации на GitHub.

## Локальный запуск

```bash
python3 -m http.server 8080
```

Откройте: `http://localhost:8080`.

## Публикация на GitHub Pages (для проверки с телефона)

1. Загрузите репозиторий на GitHub.
2. Запушьте ветку `main`.
3. Во вкладке **Actions** дождитесь завершения workflow `Deploy static site to GitHub Pages`.
4. Откройте ссылку вида:
   - `https://<ваш-логин>.github.io/<имя-репозитория>/`

После этого игра будет доступна с любого телефона по публичной ссылке.

## Альтернатива: htmlpreview

Можно открыть и так (как в вашем примере):

`https://htmlpreview.github.io/?https://raw.githubusercontent.com/<ваш-логин>/<имя-репозитория>/main/index.html`
