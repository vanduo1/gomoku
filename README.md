# 🎮 Caro Game

A browser-based Caro (Gomoku) game built with vanilla HTML, CSS, and JavaScript — no frameworks, no backend.

## Features

- **User Accounts** — Register and log in; data is persisted via `localStorage`.
- **Two Game Modes**
  - 🤖 **vs AI** — Three difficulty levels: Easy, Medium, Hard (Minimax algorithm with heuristic evaluation).
  - 👥 **2 Players** — Both players log in on the same device and take turns.
- **Flexible Board Sizes** — 3×3, 4×4, 5×5 (default), 6×6, 7×7, 9×9, 15×15.
- **Undo / Redo** — Step back and forward through moves.
- **Rating System** — Points awarded after each game based on result and AI difficulty.
  - Win: **+16 pts** · Draw: **+6 pts** · Loss: **−4 pts** (minimum 0)
  - Difficulty multiplier: Easy ×0.5 · Medium ×1.0 · Hard ×1.5
  - 2-Player mode: ×0.5 multiplier for both players
- **Leaderboard** — Sortable by rating or total games played.
- **Retro Pixel UI** — Styled with Press Start 2P & Road Rage fonts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom, no framework) |
| Logic | Vanilla JavaScript (ES6 classes) |
| Storage | Browser `localStorage` |
| Fonts | Google Fonts |

## Getting Started

No build step needed. Just open `index.html` in any modern browser.

```bash
# Clone the repo
git clone https://github.com/<your-username>/caro-game.git
cd caro-game

# Open in browser
start index.html   # Windows
open index.html    # macOS
```

## Project Structure

```
carofinal/
├── index.html   # UI structure & screens
├── script.js    # Game logic, AI, user management
└── style.css    # Retro styling & responsive layout
```

## AI Implementation

The AI uses a **Minimax algorithm** with alpha-beta pruning and a heuristic board evaluator. Search depth is automatically scaled based on board size to keep response times fast.


