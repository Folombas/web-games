# 🎮 Web Games

Коллекция браузерных мини-игр с лобби-меню: карточки игр, тёмная тема и ноль зависимостей - чистые HTML/CSS/JavaScript. Сестринский проект - [FinFocus](https://github.com/Folombas/FinFocus).

## 🌐 Играть онлайн

**https://folombas.github.io/web-games/**

## 🕹 Игры (6)

| Игра | Папка | Что внутри |
|---|---|---|
| [Крестики-нолики](https://folombas.github.io/web-games/tic-tac-toe/) | `tic-tac-toe/` | PvP и непобедимый минимакс-ИИ, счёт, звуки, управление цифрами 1-9 |
| [Точки](https://folombas.github.io/web-games/dots/) | `dots/` | школьная классика, PvP и эвристический ИИ, захват клеток и бонусный ход |
| [Змейка](https://folombas.github.io/web-games/snake/) | `snake/` | canvas 20x20, стрелки/WASD, свайпы, пауза (Space), рестарт (R), рекорд |
| [Тетрис](https://folombas.github.io/web-games/tetris/) | `tetris/` | 7 фигур, вращение, превью, 100/300/500/800 за линии, скорость растёт |
| [Судоку](https://folombas.github.io/web-games/sudoku/) | `sudoku/` | генератор с единственным решением, 3 уровня, подсветка конфликтов |

## 🗂 Структура

```
/
├── index.html        # лобби с карточками игр
├── styles.css        # стили лобби
├── 404.html          # страница 404 (абсолютные пути, noindex)
├── sitemap.xml       # SEO: все страницы коллекции
├── robots.txt        # SEO: пускаем всех, ведём к sitemap
├── favicon.svg       # общая иконка всех страниц
├── js/
│   └── core.js       # общие утилиты: рандом, рекорды localStorage, свайпы
├── tic-tac-toe/      # крестики-нолики (game.js + ai.js — минимакс)
├── dots/             # точки (core.js — правила поля, ai.js — ИИ)
├── snake/            # змейка (index.html, styles.css, game.js)
├── tetris/           # тетрис
├── uno/              # Uno (core.js — движок и ИИ, assets/cards — карты)
└── sudoku/           # судоку (core.js — генератор и валидатор)
```

Каждая игра лежит в своей папке, не зависит от других и собирается без сборки: ES-модули напрямую. Чистая игровая логика выделена в `core.js` внутри папки игры, общие утилиты - в `js/core.js`.

## 🚀 Запуск локально

- склонировать репозиторий: `git clone https://github.com/Folombas/web-games.git`,
- и открыть `index.html` в браузере (ES-модули требуют запуска через сервер, например `npx serve .`).

## ✅ Проверки качества (CI)

Workflow `sanity` (`.github/workflows/ci.yml`) на каждый push и PR, с защитой от пустого прогона (checked>0):

1. `node --check` для всех `.js` (модули проверяются через копии с расширением `.mjs`);
2. в каждом `.html` ровно один `<body>` и один `<header>`.

Это этап 1 гейта качества из [AI-CONVEYOR](https://github.com/Folombas/FinFocus/blob/main/AI-CONVEYOR.md) (§4, §5).

## 🧰 Стек

- Ванильные ES-модули (JavaScript), ноль зависимостей и ноль сборки
- CSS Custom Properties, Grid, backdrop-filter, `prefers-reduced-motion`
- Собственные SVG-ассеты: карточки-превью, фишки, поле «Точек»
- Web Audio API (крестики-нолики и точки) - короткие звуки без внешних файлов
- Canvas: змейка, тетрис
- localStorage: счёт и рекорды
- ИИ: минимакс (крестики-нолики), эвристика (точки, Uno)
- GitHub Pages: автодеплой из `main` (`deploy-pages.yml`)

## 🗺 План

Пусто: все игры из предыдущих ТЗ реализованы. Следующие итерации - новые ТЗ от Qwen/Алексана.

---

© Alex Folombas · [FinFocus](https://github.com/Folombas/FinFocus) - проект о деньгах, если игры утомили 😄
