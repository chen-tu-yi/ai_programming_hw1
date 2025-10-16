(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const backgroundCanvas = document.createElement('canvas');
  backgroundCanvas.width = canvas.width;
  backgroundCanvas.height = canvas.height;
  const backgroundCtx = backgroundCanvas.getContext('2d');

  const CARD_WIDTH = 90;
  const CARD_HEIGHT = 132;
  const CARD_RADIUS = 12;
  const PLAYER_Y = canvas.height - CARD_HEIGHT - 32;
  const COMPUTER_Y = 32;
  const MESSAGE_DISPLAY_DURATION = 1500;

  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = [
    { symbol: '\u2660', name: 'spades', color: '#0e1726' },
    { symbol: '\u2665', name: 'hearts', color: '#d7263d' },
    { symbol: '\u2666', name: 'diamonds', color: '#f46036' },
    { symbol: '\u2663', name: 'clubs', color: '#2ec4b6' }
  ];

  const game = {
    deck: [],
    playerHand: [],
    computerHand: [],
    playerBooks: [],
    computerBooks: [],
    turn: 'player',
    over: false,
    messageQueue: [],
    activeMessage: null,
    selectedRank: null,
    hoverRank: null
  };

  const playerCardAreas = [];

  function drawRoundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function paintBackgroundTexture() {
    const gradient = backgroundCtx.createLinearGradient(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    gradient.addColorStop(0, 'rgba(19, 34, 58, 0.95)');
    gradient.addColorStop(1, 'rgba(8, 15, 26, 0.9)');
    backgroundCtx.fillStyle = gradient;
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

    const sparkleCount = 60;
    const rng = Math.random;
    backgroundCtx.save();
    backgroundCtx.globalAlpha = 0.08;
    for (let i = 0; i < sparkleCount; i += 1) {
      const size = rng() * 120 + 40;
      backgroundCtx.beginPath();
      backgroundCtx.arc(rng() * backgroundCanvas.width, rng() * backgroundCanvas.height, size, 0, Math.PI * 2);
      backgroundCtx.fillStyle = '#ffffff';
      backgroundCtx.fill();
    }
    backgroundCtx.restore();
  }

  function createDeck() {
    const deck = [];
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function pushMessage(text, options = {}) {
    const { persistent = false } = options;
    game.messageQueue.push({ text, persistent, expiresAt: null });
  }

  function startGame() {
    game.deck = createDeck();
    shuffle(game.deck);
    game.playerHand = game.deck.splice(-7);
    game.computerHand = game.deck.splice(-7);
    game.playerBooks = [];
    game.computerBooks = [];
    game.over = false;
    game.messageQueue = [];
    game.activeMessage = null;
    game.turn = 'player';
    game.selectedRank = null;
    pushMessage('Welcome to Go Fish! Click on a card to ask for that rank.');
    ensureHandHasCards('player');
  }

  function ensureHandHasCards(player) {
    const hand = player === 'player' ? game.playerHand : game.computerHand;
    if (hand.length === 0 && game.deck.length > 0) {
      const drawn = game.deck.pop();
      hand.push(drawn);
      if (player === 'player') {
        pushMessage('You drew a card to replenish your hand.');
      } else {
        pushMessage('The computer drew a card to keep playing.');
      }
      checkForBooks(player);
    }
  }

  function cardCountByRank(hand) {
    return hand.reduce((acc, card) => {
      acc[card.rank] = (acc[card.rank] || 0) + 1;
      return acc;
    }, {});
  }

  function removeCardsOfRank(hand, rank) {
    for (let i = hand.length - 1; i >= 0; i -= 1) {
      if (hand[i].rank === rank) {
        hand.splice(i, 1);
      }
    }
  }

  function transferCards(source, target, rank) {
    let count = 0;
    for (let i = source.length - 1; i >= 0; i -= 1) {
      if (source[i].rank === rank) {
        target.push(source[i]);
        source.splice(i, 1);
        count += 1;
      }
    }
    return count;
  }

  function checkForBooks(player) {
    const hand = player === 'player' ? game.playerHand : game.computerHand;
    const books = player === 'player' ? game.playerBooks : game.computerBooks;
    const counts = {};

    for (const card of hand) {
      counts[card.rank] = counts[card.rank] ? counts[card.rank].concat(card) : [card];
    }

    let madeBook = false;
    for (const rank of Object.keys(counts)) {
      if (counts[rank].length === 4) {
        removeCardsOfRank(hand, rank);
        books.push(rank);
        pushMessage(`${player === 'player' ? 'You' : 'The computer'} completed a book of ${rank}s!`);
        madeBook = true;
      }
    }

    if (madeBook) {
      checkGameOver();
    }
    return madeBook;
  }

  function checkGameOver() {
    const totalBooks = game.playerBooks.length + game.computerBooks.length;
    if (totalBooks === 13 || (game.deck.length === 0 && game.playerHand.length === 0 && game.computerHand.length === 0)) {
      game.over = true;
      const playerScore = game.playerBooks.length;
      const computerScore = game.computerBooks.length;
      game.messageQueue = [];
      game.activeMessage = null;
      if (playerScore > computerScore) {
        pushMessage('You win!', { persistent: true });
      } else if (playerScore < computerScore) {
        pushMessage('The computer wins. Better luck next time!', { persistent: true });
      } else {
        pushMessage("It's a tie!", { persistent: true });
      }
    }
  }

  function switchTurn() {
    if (game.over) {
      return;
    }
      game.selectedRank = null;
      game.hoverRank = null;
    if (game.turn === 'player') {
      game.turn = 'computer';
      ensureHandHasCards('computer');
      if (game.over) {
        return;
      }
      if (game.computerHand.length === 0) {
        if (game.deck.length === 0) {
          checkGameOver();
        }
        if (!game.over) {
          pushMessage('The computer has no cards to ask with, passing back to you.');
          switchTurn();
        }
        return;
      }
      pushMessage('Computer\'s turn.');
      setTimeout(computerTurn, 900);
    } else {
      game.turn = 'player';
      ensureHandHasCards('player');
      if (game.over) {
        return;
      }
      if (game.playerHand.length === 0) {
        if (game.deck.length === 0) {
          checkGameOver();
        }
        if (!game.over) {
          pushMessage('You have no cards to ask with, so the turn returns to the computer.');
          switchTurn();
        }
        return;
      }
      pushMessage('Your turn. Click a rank to ask for it.');
    }
  }

  function handleRequest(requester, rank) {
    if (game.over) {
      return;
    }
    const opponent = requester === 'player' ? 'computer' : 'player';
    const requesterHand = requester === 'player' ? game.playerHand : game.computerHand;
    const opponentHand = opponent === 'player' ? game.playerHand : game.computerHand;

    if (!requesterHand.some(card => card.rank === rank)) {
      if (requester === 'player') {
        pushMessage("You need to hold at least one card of that rank to ask for it.");
      }
      return;
    }

    pushMessage(`${requester === 'player' ? 'You' : 'The computer'} asked for ${rank}s.`);
    const received = transferCards(opponentHand, requesterHand, rank);

    if (received > 0) {
      pushMessage(`${requester === 'player' ? 'You' : 'The computer'} received ${received} card${received > 1 ? 's' : ''}.`);
      const madeBook = checkForBooks(requester);
      if (!game.over) {
        if (opponentHand.length === 0) {
          ensureHandHasCards(opponent);
        }
        if (!madeBook) {
          pushMessage(`${requester === 'player' ? 'You' : 'The computer'} get another turn.`);
        }
        if (requester === 'computer') {
          setTimeout(computerTurn, 900);
        }
      }
      return;
    }

    pushMessage('Go fish!');
    if (game.deck.length > 0) {
      const drawn = game.deck.pop();
      requesterHand.push(drawn);
      pushMessage(`${requester === 'player' ? 'You' : 'The computer'} drew a card.`);
      const madeBook = checkForBooks(requester);
      if (drawn.rank === rank && !game.over) {
        pushMessage(`${requester === 'player' ? 'You' : 'The computer'} drew the rank asked for and go again!`);
        if (requester === 'computer') {
          setTimeout(computerTurn, 900);
        }
        return;
      }
      if (!madeBook) {
        switchTurn();
      }
    } else {
      pushMessage('The pond is empty.');
      switchTurn();
    }
  }

  function computerTurn() {
    if (game.over || game.turn !== 'computer') {
      return;
    }

    if (game.computerHand.length === 0) {
      if (game.deck.length === 0) {
        switchTurn();
        return;
      }
      ensureHandHasCards('computer');
      if (game.over) {
        return;
      }
    }

    const counts = cardCountByRank(game.computerHand);
    const ranks = Object.keys(counts);
    const topCount = Math.max(...ranks.map(rank => counts[rank]));
    const bestRanks = ranks.filter(rank => counts[rank] === topCount);
    const choice = bestRanks[Math.floor(Math.random() * bestRanks.length)];

    handleRequest('computer', choice);
  }

  function handleCanvasClick(event) {
    if (game.over) {
      startGame();
      return;
    }
    if (game.turn !== 'player') {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (const area of playerCardAreas) {
      if (
        x >= area.x &&
        x <= area.x + CARD_WIDTH &&
        y >= area.y &&
        y <= area.y + CARD_HEIGHT
      ) {
        game.selectedRank = area.card.rank;
        handleRequest('player', area.card.rank);
        return;
      }
    }
  }

  function handleCanvasMove(event) {
    if (game.turn !== 'player' || game.over) {
      game.hoverRank = null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let hover = null;
    for (const area of playerCardAreas) {
      if (
        x >= area.x &&
        x <= area.x + CARD_WIDTH &&
        y >= area.y &&
        y <= area.y + CARD_HEIGHT
      ) {
        hover = area.card.rank;
        break;
      }
    }
    game.hoverRank = hover;
  }

  function drawCard(x, y, card, options = {}) {
    const { faceDown = false, highlight = false, hover = false } = options;

    ctx.save();
    drawRoundedRect(ctx, x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.fillStyle = faceDown
      ? ctx.createLinearGradient(x, y, x + CARD_WIDTH, y + CARD_HEIGHT)
      : '#f8f9ff';
    if (faceDown) {
      const gradient = ctx.fillStyle;
      gradient.addColorStop(0, '#21385f');
      gradient.addColorStop(1, '#0f1c33');
    }
    ctx.fill();

    if (highlight) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.85)';
      ctx.stroke();
    } else if (hover) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.stroke();
    }

    if (!faceDown) {
      ctx.fillStyle = card.suit.symbol === '\u2665' || card.suit.symbol === '\u2666' ? '#d7263d' : '#1d2540';
      ctx.font = '24px "Fira Sans", "Segoe UI", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(card.rank, x + 12, y + 12);
      ctx.fillText(card.suit.symbol, x + 12, y + 42);

      ctx.font = '48px "Playfair Display", "Times New Roman", serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(card.suit.symbol, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2 + 12);
    } else {
      drawRoundedRect(ctx, x + 16, y + 16, CARD_WIDTH - 32, CARD_HEIGHT - 32, 10);
      const inner = ctx.createLinearGradient(x, y, x + CARD_WIDTH, y + CARD_HEIGHT);
      inner.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      inner.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = inner;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBooks(books, x, y, label) {
    ctx.save();
    ctx.font = '18px "Fira Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(`${label}: ${books.length}`, x, y);

    const size = 36;
    for (let i = 0; i < books.length; i += 1) {
      const rank = books[i];
      const offsetX = x + i * (size + 6);
      drawRoundedRect(ctx, offsetX, y + 24, size, size, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fill();
      ctx.font = '20px "Fira Sans", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd166';
      ctx.fillText(rank, offsetX + size / 2, y + 24 + size / 2 + 1);
    }
    ctx.restore();
  }

  function drawDeck() {
    const x = canvas.width / 2 - CARD_WIDTH - 20;
    const y = canvas.height / 2 - CARD_HEIGHT / 2;
    const depth = Math.min(game.deck.length, 4);
    for (let i = 0; i < depth; i += 1) {
      drawCard(x + i * 3, y + i * 2, null, { faceDown: true });
    }
    ctx.save();
    ctx.font = '18px "Fira Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`${game.deck.length} card${game.deck.length === 1 ? '' : 's'} in deck`, x + CARD_WIDTH / 2 + 20, y + CARD_HEIGHT + 24);
    ctx.restore();
  }

  function drawMessages() {
    const baseY = canvas.height / 2 + CARD_HEIGHT / 2 + 50;
    ctx.save();
    ctx.font = '20px "Fira Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    const message = game.activeMessage;
    if (message) {
      ctx.fillText(message.text, canvas.width / 2, baseY);
    }
    if (game.over) {
      ctx.font = '22px "Fira Sans", "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffd166';
      const offset = game.activeMessage ? 40 : 16;
      ctx.fillText('Click anywhere to play again.', canvas.width / 2, baseY + offset);
    }
    ctx.restore();
  }

  function drawHands() {
    playerCardAreas.length = 0;
    if (game.playerHand.length > 0) {
      const playerSpacing = Math.min(68, (canvas.width - CARD_WIDTH) / Math.max(1, game.playerHand.length - 1));
      const playerStartX =
        (canvas.width - CARD_WIDTH - (game.playerHand.length - 1) * playerSpacing) / 2;

      game.playerHand
        .slice()
        .sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank))
        .forEach((card, index) => {
          const x = playerStartX + index * playerSpacing;
          const area = { x, y: PLAYER_Y, card };
          playerCardAreas.push(area);
          const highlight = game.selectedRank === card.rank && game.turn === 'player';
          const hover = game.hoverRank === card.rank && game.turn === 'player';
          drawCard(x, PLAYER_Y, card, { highlight, hover });
        });
    }

    if (game.computerHand.length > 0) {
      const computerSpacing = Math.min(
        60,
        (canvas.width - CARD_WIDTH) / Math.max(1, game.computerHand.length - 1)
      );
      const computerStartX =
        (canvas.width - CARD_WIDTH - (game.computerHand.length - 1) * computerSpacing) / 2;
      for (let i = 0; i < game.computerHand.length; i += 1) {
        const x = computerStartX + i * computerSpacing;
        drawCard(x, COMPUTER_Y, game.computerHand[i], { faceDown: true });
      }
    }
  }

  function drawScores() {
    ctx.save();
    ctx.font = '22px "Fira Sans", "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'left';
    ctx.fillText(`Your books: ${game.playerBooks.length}`, 30, canvas.height / 2 - 16);
    ctx.fillText(`Computer books: ${game.computerBooks.length}`, canvas.width - 300, canvas.height / 2 - 16);
    ctx.restore();
    drawBooks(game.playerBooks, 30, canvas.height / 2 + 16, 'Player books');
    drawBooks(game.computerBooks, canvas.width - 280, canvas.height / 2 + 16, 'Computer books');
  }

  function drawTurnIndicator() {
    ctx.save();
    ctx.font = '24px "Fira Sans", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = game.turn === 'player' ? '#ffd166' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Your Hand', canvas.width / 2, PLAYER_Y - 16);
    ctx.fillStyle = game.turn === 'computer' ? '#ffd166' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Computer Hand', canvas.width / 2, COMPUTER_Y + CARD_HEIGHT + 28);
    ctx.restore();
  }

  function drawBackground() {
    ctx.drawImage(backgroundCanvas, 0, 0);
  }

  function draw() {
    drawBackground();
    drawTurnIndicator();
    drawHands();
    drawDeck();
    drawScores();
    drawMessages();
  }

  function updateMessageState() {
    const now = Date.now();
    const active = game.activeMessage;
    if (active) {
      if (!active.persistent && now >= active.expiresAt) {
        game.activeMessage = null;
      }
    }
    if (!game.activeMessage && game.messageQueue.length > 0) {
      const next = game.messageQueue.shift();
      next.expiresAt = next.persistent ? Infinity : now + MESSAGE_DISPLAY_DURATION;
      game.activeMessage = next;
    }
  }

  function update() {
    updateMessageState();
    draw();
    requestAnimationFrame(update);
  }

  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleCanvasMove);

  paintBackgroundTexture();
  startGame();
  update();
})();
