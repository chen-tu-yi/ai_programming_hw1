# Go Fish Canvas Game

This repository contains a single-page implementation of the classic card game **Go Fish** that you can play against the computer. The entire experience is rendered to an HTML5 canvas so it works in any modern browser without extra dependencies.

## Getting Started

1. Open `index.html` directly in your browser, or launch a lightweight development server such as:
   ```bash
   python -m http.server 8000
   ```
   and visit <http://localhost:8000>.
2. Click on any of your cards to request that rank from the computer. If the opponent has one or more cards of that rank you will receive them; otherwise you will be prompted to “Go Fish!” from the deck.
3. The scoreboard in the center shows how many completed books (sets of four) each player has collected. When all 13 books have been made the game announces the winner. Click the canvas to start a new game.

## Controls & Tips

- Hovering over your cards highlights the rank that will be requested.
- If either player runs out of cards they automatically draw from the pond (deck) when possible.
- The computer uses a simple strategy that favors requesting ranks it already holds the most copies of.

Enjoy the game!
