# 🎮 Web Games

Коллекция браузерных мини-игр с лобби-меню: карточки игр, тёмная тема и ноль зависимостей - чистые HTML/CSS/JavaScript. Сестринский проект - [FinFocus](https://github.com/Folombas/FinFocus).

## 🌐 Играть онлайн

**https://folombas.github.io/web-games/**

## 🕹 Игры

| Игра | Папка | Что внутри |
|---|---|---|
| [Крестики-нолики](https://folombas.github.io/web-games/tic-tac-toe/) | `tic-tac-toe/` | PvP и непобедимый минимакс-ИИ, счёт, звуки, управление цифрами 1-9 |
| [Точки](https://folombas.github.io/web-games/dots/) | `dots/` | школьная классика, PvP и эвристический ИИ, захват клеток и бонусный ход |
| [Змейка](https://folombas.github.io/web-games/snake/) | `snake/` | canvas 20x20, стрелки/WASD, свайпы, пауза (Space), рестарт (R), рекорд |
| [2048](https://folombas.github.io/web-games/2048/) | `2048/` | классические правила слияния, стрелки и свайпы, счёт и рекорд сохраняются |
| [Тетрис](https://folombas.github.io/web-games/tetris/) | `tetris/` | 7 фигур, вращение, превью следующей, 100/300/500/800 за линии, скорость растёт |
| [Сапёр](https://folombas.github.io/web-games/minesweeper/) | `minesweeper/` | 9x9 и 10x10, безопасный первый клик, флажки (ПКМ/долгий тап/режим), таймер, рекорд |

## 🗂 Структура

```
/
├── index.html        # лобби с карточками игр
├── styles.css        # стили лобби
├── 404.html          # страница 404 (абсолютные пути, noindex)
├── js/
│   └── core.js       # общие утилиты: рандом, рекорды localStorage, свайпы
├── tic-tac-toe/      # крестики-нолики
│   ├── index.html
│   ├── styles.css
│   ├── game.js
│   └── ai.js         # минимакс
├── dots/             # точки
│   ├── index.html
│   ├── styles.css
│   ├── core.js       # геометрия и правила поля
│   ├── game.js       # интерфейс и логика партии
│   └── ai.js         # эвристический ИИ
├── snake/            # змейка (index.html, styles.css, game.js)
├── 2048/             # 2048 (index.html, styles.css, game.js)
├── tetris/           # тетрис (index.html, styles.css, game.js)
└── minesweeper/      # сапёр (index.html, styles.css, game.js)
```

Каждая игра лежит в своей папке и не зависит от других: никакой сборки, только ES-модули. Общие игровые утилиты вынесены в `js/core.js`.

## 🚀 Запуск локально

- склонировать репозиторий: `git clone https://github.com/Folombas/web-games.git`,
- и открыть `index.html` в браузере (ES-модули требуют запуска через сервер, например `npx serve .`).

## 🧰 Стек

- Ванильные ES-модули (JavaScript), ноль зависимостей
- CSS Custom Properties, Grid, backdrop-filter, keyframes-анимации, `prefers-reduced-motion`
- Собственные SVG-ассеты: карточки-превью, фишки, поле «Точек»
- Web Audio API для коротких звуков без внешних файлов
- localStorage для счёта и настроек
- Минимакс с оценкой глубины (крестики-нолики) и эвристический ИИ (точки)
- GitHub Pages: автодеплой из `main` (`deploy-pages.yml`)

## ✅ Проверки качества (CI)

Workflow `sanity` (`.github/workflows/ci.yml`) на каждый push и PR:

1. `node --check` для всех `.js` (модули проверяются через копию с расширением `.mjs`);
2. в каждом `.html` ровно один `<body>` и один `<header>`.

Это этап 1 гейта качества из [AI-CONVEYOR](https://github.com/Folombas/FinFocus/blob/main/AI-CONVEYOR.md) (§4, §5).

## 🗺 План

- [ ] Виселица с русскими словами

---

© Alex Folombas · [FinFocus](https://github.com/Folombas/FinFocus) — проект о деньгах, если игры утомили 😄
