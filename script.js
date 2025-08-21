// User Management System
class UserManager {
  constructor() {
    this.currentUser = null;
    this.player2 = null;
    this.users = this.loadUsers();
    this.initializeUserStats();
  }

  loadUsers() {
    const saved = JSON.parse(localStorage.getItem("caroUsers") || "[]");
    return saved.map((user) => ({
      username: user.username,
      password: user.password,
      stats: {
        wins: user.stats?.wins || 0,
        losses: user.stats?.losses || 0,
        draws: user.stats?.draws || 0,
        totalGames: user.stats?.totalGames || 0,
        rating: user.stats?.rating || 0,
        ...user.stats,
      },
    }));
  }

  saveUsers() {
    localStorage.setItem("caroUsers", JSON.stringify(this.users));
  }

  initializeUserStats() {
    let updated = false;
    this.users.forEach((user) => {
      if (typeof user.stats.rating !== "number") {
        user.stats.rating = 0;
        updated = true;
      }
    });

    if (updated) {
      this.saveUsers();
    }
  }

  register(username, password) {
    if (this.users.find((user) => user.username === username)) {
      throw new Error("Tên đăng nhập đã tồn tại!");
    }

    if (username.length < 3) {
      throw new Error("Tên đăng nhập phải có ít nhất 3 ký tự!");
    }

    if (password.length < 4) {
      throw new Error("Mật khẩu phải có ít nhất 4 ký tự!");
    }

    const newUser = {
      username,
      password,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        rating: 0,
      },
    };

    this.users.push(newUser);
    this.saveUsers();
    return newUser;
  }

  login(username, password) {
    const user = this.users.find(
      (u) => u.username === username && u.password === password
    );
    if (!user) {
      throw new Error("Tên đăng nhập hoặc mật khẩu không đúng!");
    }
    this.currentUser = user;
    return user;
  }

  loginPlayer2(username, password) {
    const user = this.users.find(
      (u) => u.username === username && u.password === password
    );
    if (!user) {
      throw new Error("Tên đăng nhập hoặc mật khẩu không đúng!");
    }
    if (this.currentUser && user.username === this.currentUser.username) {
      throw new Error("Người chơi 2 không thể trùng với người chơi 1!");
    }
    this.player2 = user;
    return user;
  }

  getUser(username) {
    return this.users.find((user) => user.username === username);
  }

  logout() {
    this.currentUser = null;
    this.player2 = null;
  }

  updateUserStats(
    result,
    gameMode = "ai",
    difficulty = "medium",
    winnerPlayer = null
  ) {
    if (gameMode === "two" && this.currentUser && this.player2) {
      this.updateTwoPlayerStats(result, winnerPlayer);
    } else if (this.currentUser) {
      this.updateSinglePlayerStats(result, gameMode, difficulty);
    }
  }

  updateSinglePlayerStats(result, gameMode, difficulty) {
    if (!this.currentUser) return;

    const stats = this.currentUser.stats;
    stats.totalGames++;

    let rating = 0;

    switch (result) {
      case "win":
        stats.wins++;
        rating = 16;
        break;
      case "loss":
        stats.losses++;
        rating = -4;
        break;
      case "draw":
        stats.draws++;
        rating = 6;
        break;
    }

    const difficultyMultiplier = {
      easy: 0.5,
      medium: 1.0,
      hard: 1.5,
    };

    if (result === "loss") {
      rating = -4;
    } else {
      const multiplier = difficultyMultiplier[difficulty] || 1.0;
      rating = rating * multiplier;

      if (multiplier === 0.5 || multiplier === 1.5) {
        rating = Math.round(rating);
      } else {
        rating = Math.round(rating);
        if (rating % 2 !== 0) {
          rating = rating > 0 ? rating + 1 : rating - 1;
        }
      }
    }

    stats.rating = Math.max(0, (stats.rating || 0) + rating);

    this.saveUsers();

    return {
      ratingChange: rating,
      newRating: stats.rating,
      gameMode,
      difficulty,
    };
  }

  updateTwoPlayerStats(result, winnerPlayer) {
    if (!this.currentUser || !this.player2) return;

    const player1Stats = this.currentUser.stats;
    const player2Stats = this.player2.stats;

    player1Stats.totalGames++;
    player2Stats.totalGames++;

    let player1Rating = 0;
    let player2Rating = 0;

    if (result === "draw") {
      player1Stats.draws++;
      player2Stats.draws++;
      player1Rating = 6;
      player2Rating = 6;
    } else if (winnerPlayer === 1) {
      player1Stats.wins++;
      player2Stats.losses++;
      player1Rating = 16;
      player2Rating = -4;
    } else if (winnerPlayer === 2) {
      player1Stats.losses++;
      player2Stats.wins++;
      player1Rating = -4;
      player2Rating = 16;
    }

    if (player1Rating > 0) {
      player1Rating = Math.round(player1Rating * 0.5);
    }

    if (player2Rating > 0) {
      player2Rating = Math.round(player2Rating * 0.5);
    }

    player1Stats.rating = Math.max(
      0,
      (player1Stats.rating || 0) + player1Rating
    );
    player2Stats.rating = Math.max(
      0,
      (player2Stats.rating || 0) + player2Rating
    );

    this.saveUsers();

    return {
      player1: {
        ratingChange: player1Rating,
        newRating: player1Stats.rating,
      },
      player2: {
        ratingChange: player2Rating,
        newRating: player2Stats.rating,
      },
      gameMode: "two",
    };
  }

  getLeaderboard(sortBy = "rating") {
    const leaderboard = this.users.map((user) => {
      const decisiveGames = user.stats.wins + user.stats.losses;
      const winRate =
        decisiveGames > 0
          ? ((user.stats.wins / decisiveGames) * 100).toFixed(1)
          : 0;

      const rating = user.stats.rating || 0;

      return {
        ...user,
        winRate: winRate,
        rating: rating,
      };
    });

    return leaderboard.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "totalGames":
          return b.stats.totalGames - a.stats.totalGames;
        default:
          return b.rating - a.rating;
      }
    });
  }
}

// Enhanced TicTacToe AI Game with User Management
class TicTacToeAI {
  constructor() {
    this.board = [];
    this.size = 5;
    this.currentPlayer = "X";
    this.gameMode = "ai";
    this.gameOver = false;
    this.humanPlayer = "X";
    this.aiPlayer = "O";
    this.maxDepth = 3;
    this.isAITurn = false;
    this.difficulty = "medium";
    this.scores = { human: 0, ai: 0, tie: 0, x: 0, o: 0 };
    this.userManager = new UserManager();

    this.setupEventListeners();
    this.showLoginScreen();
  }

  setupEventListeners() {
    // Auth event listeners
    document.getElementById("loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById("registerForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    document.getElementById("showRegister").addEventListener("click", () => {
      this.showRegisterScreen();
    });

    document.getElementById("showLogin").addEventListener("click", () => {
      this.showLoginScreen();
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      this.handleLogout();
    });

    // Leaderboard event listeners
    document.getElementById("showLeaderboard").addEventListener("click", () => {
      this.showLeaderboardScreen();
    });

    document
      .getElementById("showLeaderboardFromLogin")
      .addEventListener("click", () => {
        this.showLeaderboardScreen();
      });

    document.getElementById("backToLogin").addEventListener("click", () => {
      this.showLoginScreen();
    });

    document.getElementById("backToGame").addEventListener("click", () => {
      this.showGameScreen();
    });

    document
      .getElementById("refreshLeaderboard")
      .addEventListener("click", () => {
        this.updateLeaderboard();
      });

    document.getElementById("sortBy").addEventListener("change", () => {
      this.updateLeaderboard();
    });

    // Game event listeners
    document.getElementById("newGame").addEventListener("click", () => {
      this.initializeGame();
    });

    document.getElementById("undoMove").addEventListener("click", () => {
      this.undoLastMove();
    });

    document.getElementById("redoMove").addEventListener("click", () => {
      this.redoMove();
    });

    document.getElementById("boardSize").addEventListener("change", () => {
      this.initializeGame();
    });

    // THÊM: lắng nghe thay đổi chế độ chơi
    const gameModeSel = document.getElementById("gameMode");
    if (gameModeSel) {
      gameModeSel.addEventListener("change", () => {
        const newGameMode = gameModeSel.value;

        if (newGameMode === "two" && !this.userManager.player2) {
          this.showPlayer2LoginScreen();
          return;
        }

        this.gameMode = newGameMode;
        this.updateFirstPlayerVisibility();
        this.updateDifficultyVisibility();
        this.updateAIInfoVisibility();
        this.updatePointsInfoVisibility();
        this.updatePlayerInfoDisplay();
        this.initializeGame();
      });
    }

    document.getElementById("firstPlayer").addEventListener("change", () => {
      this.initializeGame();
    });

    const difficultySel = document.getElementById("difficulty");
    if (difficultySel) {
      difficultySel.addEventListener("change", () => {
        this.difficulty = difficultySel.value;
        this.initializeGame();
      });
      this.difficulty = difficultySel.value;
      this.updateDifficultyVisibility();
    }

    // Event listeners cho đăng nhập 2 người
    const player2LoginForm = document.getElementById("player2LoginForm");
    const player2RegisterForm = document.getElementById("player2RegisterForm");
    const showPlayer2Register = document.getElementById("showPlayer2Register");
    const showPlayer2Login = document.getElementById("showPlayer2Login");
    const backToGameMode = document.getElementById("backToGameMode");
    const backToPlayer2Login = document.getElementById("backToPlayer2Login");

    if (player2LoginForm) {
      player2LoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handlePlayer2Login();
      });
    }

    if (player2RegisterForm) {
      player2RegisterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handlePlayer2Register();
      });
    }

    if (showPlayer2Register) {
      showPlayer2Register.addEventListener("click", () => {
        this.showPlayer2RegisterScreen();
      });
    }

    if (showPlayer2Login) {
      showPlayer2Login.addEventListener("click", () => {
        this.showPlayer2LoginScreen();
      });
    }

    if (backToGameMode) {
      backToGameMode.addEventListener("click", () => {
        this.showGameScreen();
      });
    }

    if (backToPlayer2Login) {
      backToPlayer2Login.addEventListener("click", () => {
        this.showPlayer2LoginScreen();
      });
    }
  }

  // Hiển thị/ẩn lựa chọn người chơi đầu dựa trên chế độ chơi
  updateFirstPlayerVisibility() {
    const firstPlayerGroup =
      document.getElementById("firstPlayer")?.parentElement;
    if (!firstPlayerGroup) return;
    if (this.gameMode === "two") {
      firstPlayerGroup.classList.add("hidden");
    } else {
      firstPlayerGroup.classList.remove("hidden");
    }
  }

  updateDifficultyVisibility() {
    const difficultyGroup =
      document.getElementById("difficulty")?.parentElement;
    if (!difficultyGroup) return;
    if (this.gameMode === "two") {
      difficultyGroup.classList.add("hidden");
    } else {
      difficultyGroup.classList.remove("hidden");
    }
  }

  updatePointsInfoVisibility() {
    const pointsInfo = document.getElementById("pointsInfo");
    if (!pointsInfo) return;

    pointsInfo.style.display = "block";
  }

  updateAIInfoVisibility() {
    const aiInfo = document.querySelector(".ai-info");
    const evaluationInfo = document.getElementById("evaluationInfo");
    if (!aiInfo) return;

    if (this.gameMode === "two") {
      aiInfo.classList.add("hidden");
      if (evaluationInfo) {
        evaluationInfo.textContent = "";
      }
    } else {
      aiInfo.classList.remove("hidden");
    }
  }

  hideAllScreens() {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("registerScreen").classList.add("hidden");
    document.getElementById("leaderboardScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.add("hidden");

    const player2LoginScreen = document.getElementById("player2LoginScreen");
    const player2RegisterScreen = document.getElementById(
      "player2RegisterScreen"
    );

    if (player2LoginScreen) player2LoginScreen.classList.add("hidden");
    if (player2RegisterScreen) player2RegisterScreen.classList.add("hidden");
  }

  showLoginScreen() {
    this.hideAllScreens();
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("loginError").textContent = "";
    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";
  }

  showRegisterScreen() {
    this.hideAllScreens();
    document.getElementById("registerScreen").classList.remove("hidden");
    document.getElementById("registerError").textContent = "";
    document.getElementById("registerUsername").value = "";
    document.getElementById("registerPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  }

  showGameScreen() {
    this.hideAllScreens();
    document.getElementById("gameScreen").classList.remove("hidden");
    this.updateUserInfo();
    this.updatePointsInfoVisibility();
    this.initializeGame();
  }

  showLeaderboardScreen() {
    this.hideAllScreens();
    document.getElementById("leaderboardScreen").classList.remove("hidden");
    this.updateLeaderboard();

    const backToGameBtn = document.getElementById("backToGame");
    if (this.userManager.currentUser) {
      backToGameBtn.classList.remove("hidden");
    } else {
      backToGameBtn.classList.add("hidden");
    }
  }

  showPlayer2LoginScreen() {
    this.hideAllScreens();
    const player2LoginScreen = document.getElementById("player2LoginScreen");
    if (!player2LoginScreen) return;

    player2LoginScreen.classList.remove("hidden");

    const player2LoginError = document.getElementById("player2LoginError");
    const player2Username = document.getElementById("player2Username");
    const player2Password = document.getElementById("player2Password");
    const player1Name = document.getElementById("player1Name");

    if (player2LoginError) player2LoginError.textContent = "";
    if (player2Username) player2Username.value = "";
    if (player2Password) player2Password.value = "";

    if (player1Name) {
      const player1NameText =
        this.userManager.currentUser?.username || "Unknown";
      player1Name.textContent = player1NameText;
    }
  }

  showPlayer2RegisterScreen() {
    this.hideAllScreens();
    const player2RegisterScreen = document.getElementById(
      "player2RegisterScreen"
    );
    if (!player2RegisterScreen) return;

    player2RegisterScreen.classList.remove("hidden");

    const player2RegisterError = document.getElementById(
      "player2RegisterError"
    );
    const player2RegUsername = document.getElementById("player2RegUsername");
    const player2RegPassword = document.getElementById("player2RegPassword");
    const player2ConfirmPassword = document.getElementById(
      "player2ConfirmPassword"
    );
    const player1Name2 = document.getElementById("player1Name2");

    if (player2RegisterError) player2RegisterError.textContent = "";
    if (player2RegUsername) player2RegUsername.value = "";
    if (player2RegPassword) player2RegPassword.value = "";
    if (player2ConfirmPassword) player2ConfirmPassword.value = "";

    if (player1Name2) {
      const player1NameText =
        this.userManager.currentUser?.username || "Unknown";
      player1Name2.textContent = player1NameText;
    }
  }

  // Authentication Methods
  handleLogin() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorElement = document.getElementById("loginError");

    try {
      this.userManager.login(username, password);
      this.showGameScreen();
    } catch (error) {
      errorElement.textContent = error.message;
    }
  }

  handleRegister() {
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const errorElement = document.getElementById("registerError");

    if (password !== confirmPassword) {
      errorElement.textContent = "Mật khẩu xác nhận không khớp!";
      return;
    }

    try {
      this.userManager.register(username, password);
      this.userManager.login(username, password);
      this.showGameScreen();
    } catch (error) {
      errorElement.textContent = error.message;
    }
  }

  handleLogout() {
    this.userManager.logout();
    this.showLoginScreen();
  }

  // Authentication Methods cho người chơi thứ 2
  handlePlayer2Login() {
    const username = document.getElementById("player2Username").value.trim();
    const password = document.getElementById("player2Password").value;
    const errorElement = document.getElementById("player2LoginError");

    try {
      this.userManager.loginPlayer2(username, password);
      this.gameMode = "two";
      document.getElementById("gameMode").value = "two";
      this.updatePlayerInfoDisplay();
      this.showGameScreen();
    } catch (error) {
      errorElement.textContent = error.message;
    }
  }

  handlePlayer2Register() {
    const username = document.getElementById("player2RegUsername").value.trim();
    const password = document.getElementById("player2RegPassword").value;
    const confirmPassword = document.getElementById(
      "player2ConfirmPassword"
    ).value;
    const errorElement = document.getElementById("player2RegisterError");

    if (password !== confirmPassword) {
      errorElement.textContent = "Mật khẩu xác nhận không khớp!";
      return;
    }

    try {
      this.userManager.register(username, password);
      this.userManager.loginPlayer2(username, password);
      this.gameMode = "two";
      document.getElementById("gameMode").value = "two";
      this.updatePlayerInfoDisplay();
      this.showGameScreen();
    } catch (error) {
      errorElement.textContent = error.message;
    }
  }

  updateUserInfo() {
    const user = this.userManager.currentUser;
    if (!user) return;

    const rating = user.stats.rating || 0;

    document.getElementById("currentUser").textContent = user.username;
    document.getElementById("userRating").textContent = rating;

    // Cập nhật hiển thị thông tin người chơi
    this.updatePlayerInfoDisplay();
  }

  updatePlayerInfoDisplay() {
    const singlePlayerInfo = document.getElementById("singlePlayerInfo");
    const twoPlayerInfo = document.getElementById("twoPlayerInfo");

    if (!singlePlayerInfo || !twoPlayerInfo) {
      return;
    }

    if (
      this.gameMode === "two" &&
      this.userManager.currentUser &&
      this.userManager.player2
    ) {
      singlePlayerInfo.classList.add("hidden");
      twoPlayerInfo.classList.remove("hidden");

      const player1Display = document.getElementById("player1Display");
      const player1Rating = document.getElementById("player1Rating");
      const player2Display = document.getElementById("player2Display");
      const player2Rating = document.getElementById("player2Rating");

      if (player1Display)
        player1Display.textContent = this.userManager.currentUser.username;
      if (player1Rating)
        player1Rating.textContent =
          this.userManager.currentUser.stats.rating || 0;

      if (player2Display)
        player2Display.textContent = this.userManager.player2.username;
      if (player2Rating)
        player2Rating.textContent = this.userManager.player2.stats.rating || 0;
    } else {
      singlePlayerInfo.classList.remove("hidden");
      twoPlayerInfo.classList.add("hidden");
    }
  }

  updateLeaderboard() {
    const sortBy = document.getElementById("sortBy").value;
    const leaderboard = this.userManager.getLeaderboard(sortBy);
    const tbody = document.getElementById("leaderboardBody");

    tbody.innerHTML = "";

    leaderboard.forEach((user, index) => {
      const row = document.createElement("tr");
      const rank = index + 1;

      if (rank === 1) row.classList.add("rank-1");
      else if (rank === 2) row.classList.add("rank-2");
      else if (rank === 3) row.classList.add("rank-3");

      row.innerHTML = `
        <td>${rank}</td>
        <td class="player-name">${user.username}</td>
        <td class="rating-cell">
          <span class="rating-number">${user.rating}</span>
        </td>
        <td>${user.stats.totalGames}</td>
      `;

      tbody.appendChild(row);
    });
  }

  // Game Logic Methods
  initializeGame() {
    this.size = parseInt(document.getElementById("boardSize").value);
    this.gameMode = document.getElementById("gameMode")
      ? document.getElementById("gameMode").value
      : "ai";

    const difficultyElement = document.getElementById("difficulty");
    this.difficulty = difficultyElement ? difficultyElement.value : "medium";

    this.maxDepth = this.getOptimalDepth(this.size);
    this.board = Array(this.size)
      .fill()
      .map(() => Array(this.size).fill(""));
    this.gameOver = false;
    this.moveHistory = [];
    this.redoHistory = [];

    this.updateFirstPlayerVisibility();
    this.updateDifficultyVisibility();
    this.updateAIInfoVisibility();

    if (this.gameMode === "ai") {
      const firstPlayer = document.getElementById("firstPlayer").value;
      if (firstPlayer === "human") {
        this.currentPlayer = "X";
        this.humanPlayer = "X";
        this.aiPlayer = "O";
        this.isAITurn = false;
      } else {
        this.currentPlayer = "O";
        this.humanPlayer = "O";
        this.aiPlayer = "X";
        this.isAITurn = true;
      }
    } else {
      this.currentPlayer = "X";
      this.humanPlayer = "X";
      this.aiPlayer = "";
      this.isAITurn = false;
    }

    this.createBoard();
    this.updateStatus();
    this.updateScore();
    this.updateUndoButton();
    this.updateRedoButton();

    if (this.gameMode === "ai" && this.isAITurn) {
      setTimeout(() => this.makeAIMove(), 500);
    }
  }

  getOptimalDepth(size) {
    if (size <= 3) return 9;
    if (size <= 5) return 4;
    if (size <= 7) return 3;
    if (size <= 9) return 2;
    return 1;
  }

  createBoard() {
    const boardElement = document.getElementById("gameBoard");
    boardElement.innerHTML = "";
    boardElement.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
    let boarSize = 0;
    switch (this.size) {
      case 3:
        boarSize = 240;
        break;
      case 4:
        boarSize = 300;
        break;
      case 5:
        boarSize = 360;
        break;
      case 6:
        boarSize = 420;
        break;
      case 7:
        boarSize = 480;
        break;

      case 9:
        boarSize = 600;
        break;
      case 15:
        boarSize = 840;
        break;
    }

    boardElement.style.maxWidth = `${boarSize}px`;

    // Tính toán kích thước cell dựa trên kích thước board
    const cellSize = Math.max(30, Math.min(60, 600 / this.size));

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = document.createElement("button");
        cell.className = "cell";
        cell.dataset.row = i;
        cell.dataset.col = j;
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        cell.addEventListener("click", (e) => this.handleCellClick(e));
        boardElement.appendChild(cell);
      }
    }
  }

  handleCellClick(e) {
    if (this.gameOver) return;

    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);

    if (this.board[row][col] !== "") return;

    if (this.gameMode === "ai") {
      if (this.isAITurn) return;
      this.makeMove(row, col, this.humanPlayer);

      if (!this.gameOver) {
        this.isAITurn = true;
        setTimeout(() => this.makeAIMove(), 300);
      }
    } else {
      // two player
      this.makeMove(row, col, this.currentPlayer);
    }
  }

  makeMove(row, col, player) {
    this.redoHistory = [];

    this.moveHistory.push({
      row,
      col,
      player,
      previousPlayer: this.currentPlayer,
      boardState: this.board.map((row) => [...row]),
    });

    this.board[row][col] = player;
    this.updateBoard();

    const winner = this.checkWinner();
    if (winner) {
      this.endGame(winner);
    } else if (this.isBoardFull()) {
      this.endGame("tie");
    } else {
      this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
      this.updateStatus();
    }

    this.updateUndoButton();
    this.updateRedoButton();
  }

  makeAIMove() {
    if (this.gameOver) return;

    document.getElementById("aiThinking").classList.remove("hidden");

    setTimeout(() => {
      const startTime = Date.now();
      let move;
      if (this.difficulty === "easy") {
        move = this.findEasyMove();
      } else {
        move = this.findBestMove();
      }
      const endTime = Date.now();

      if (move) {
        this.makeMove(move.row, move.col, this.aiPlayer);

        if (this.gameMode === "ai") {
          const evalInfo = document.getElementById("evaluationInfo");
          evalInfo.textContent = `AI đã suy nghĩ trong ${
            endTime - startTime
          }ms, đánh giá: ${move.score}`;
        }
      }

      document.getElementById("aiThinking").classList.add("hidden");
      this.isAITurn = false;
      this.updateUndoButton();
      this.updateRedoButton();
    }, 100);
  }

  getCandidateMoves(radius = 2) {
    const moves = [];
    const added = new Set();
    const priorityMoves = [];

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== "") {
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
              if (dx === 0 && dy === 0) continue;
              const row = i + dx;
              const col = j + dy;
              if (
                row >= 0 &&
                row < this.size &&
                col >= 0 &&
                col < this.size &&
                this.board[row][col] === ""
              ) {
                const key = `${row},${col}`;
                if (!added.has(key)) {
                  added.add(key);

                  const isPriority = this.isPriorityMove(row, col);
                  const move = { row, col };

                  if (isPriority) {
                    priorityMoves.push(move);
                  } else {
                    moves.push(move);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (moves.length === 0 && priorityMoves.length === 0) {
      const center = Math.floor(this.size / 2);
      moves.push({ row: center, col: center });
    }

    return [...priorityMoves, ...moves];
  }

  isPriorityMove(row, col) {
    this.board[row][col] = this.aiPlayer;
    const aiWins = this.checkWinner() === this.aiPlayer;
    this.board[row][col] = "";

    if (aiWins) return true;

    this.board[row][col] = this.humanPlayer;
    const humanWins = this.checkWinner() === this.humanPlayer;
    this.board[row][col] = "";

    if (humanWins) return true;

    this.board[row][col] = this.aiPlayer;
    const aiStrength = this.evaluatePosition(row, col, this.aiPlayer);
    this.board[row][col] = "";

    this.board[row][col] = this.humanPlayer;
    const humanStrength = this.evaluatePosition(row, col, this.humanPlayer);
    this.board[row][col] = "";

    return aiStrength >= 50 || humanStrength >= 50;
  }

  evaluatePosition(row, col, player) {
    let maxValue = 0;
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dx, dy] of directions) {
      let count = 1;

      let r = row + dx,
        c = col + dy;
      while (
        r >= 0 &&
        r < this.size &&
        c >= 0 &&
        c < this.size &&
        this.board[r][c] === player
      ) {
        count++;
        r += dx;
        c += dy;
      }

      r = row - dx;
      c = col - dy;
      while (
        r >= 0 &&
        r < this.size &&
        c >= 0 &&
        c < this.size &&
        this.board[r][c] === player
      ) {
        count++;
        r -= dx;
        c -= dy;
      }

      let value = 0;
      if (count >= 4) value = 1000;
      else if (count === 3) value = 100;
      else if (count === 2) value = 10;
      else value = 1;

      maxValue = Math.max(maxValue, value);
    }

    return maxValue;
  }

  // Logic cải tiến cho AI dễ
  findEasyMove() {
    const candidateMoves = this.getCandidateMoves();

    // 1. Ưu tiên thắng ngay nếu có
    for (const move of candidateMoves) {
      const { row, col } = move;
      this.board[row][col] = this.aiPlayer;
      const winner = this.checkWinner();
      this.board[row][col] = "";
      if (winner === this.aiPlayer) {
        return { row, col, score: 100 };
      }
    }

    // 2. Chặn người chơi thắng
    for (const move of candidateMoves) {
      const { row, col } = move;
      this.board[row][col] = this.humanPlayer;
      const winner = this.checkWinner();
      this.board[row][col] = "";
      if (winner === this.humanPlayer) {
        return { row, col, score: 50 };
      }
    }

    // 3. Ưu tiên vị trí trung tâm
    const center = Math.floor(this.size / 2);
    if (this.board[center] && this.board[center][center] === "") {
      const centerMove = candidateMoves.find(
        (m) => m.row === center && m.col === center
      );
      if (centerMove) {
        return { row: center, col: center, score: 10 };
      }
    }

    // 4. Tìm vị trí tạo được nhiều quân liên tiếp nhất
    let bestMove = null;
    let bestCount = 0;

    for (const move of candidateMoves) {
      const { row, col } = move;
      this.board[row][col] = this.aiPlayer;
      const count = this.countConsecutive(row, col, this.aiPlayer);
      this.board[row][col] = "";

      if (count > bestCount) {
        bestCount = count;
        bestMove = { row, col, score: count };
      }
    }

    if (bestMove && bestCount > 1) {
      return bestMove;
    }

    // 5. Chọn ngẫu nhiên
    const randomMove =
      candidateMoves[Math.floor(Math.random() * candidateMoves.length)];
    return { row: randomMove.row, col: randomMove.col, score: 0 };
  }

  countConsecutive(row, col, player) {
    let maxCount = 1;
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dx, dy] of directions) {
      let count = 1;

      let r = row + dx,
        c = col + dy;
      while (
        r >= 0 &&
        r < this.size &&
        c >= 0 &&
        c < this.size &&
        this.board[r][c] === player
      ) {
        count++;
        r += dx;
        c += dy;
      }

      r = row - dx;
      c = col - dy;
      while (
        r >= 0 &&
        r < this.size &&
        c >= 0 &&
        c < this.size &&
        this.board[r][c] === player
      ) {
        count++;
        r -= dx;
        c -= dy;
      }

      maxCount = Math.max(maxCount, count);
    }

    return maxCount;
  }

  findBestMove() {
    let bestScore = -Infinity;
    let bestMove = null;
    const candidateMoves = this.getCandidateMoves();

    // Ưu tiên nước thắng ngay nếu có
    for (const move of candidateMoves) {
      const { row, col } = move;
      this.board[row][col] = this.aiPlayer;
      const winner = this.checkWinner();
      this.board[row][col] = "";
      if (winner === this.aiPlayer) {
        return { row, col, score: 100000 };
      }
    }

    // Ưu tiên chặn đối thủ thắng ngay
    for (const move of candidateMoves) {
      const { row, col } = move;
      this.board[row][col] = this.humanPlayer;
      const winner = this.checkWinner();
      this.board[row][col] = "";
      if (winner === this.humanPlayer) {
        return { row, col, score: 50000 };
      }
    }

    // Sử dụng minimax với hàm đánh giá dựa trên độ khó
    for (const move of candidateMoves) {
      const { row, col } = move;
      this.board[row][col] = this.aiPlayer;
      const score = this.minimax(0, false, -Infinity, Infinity);
      this.board[row][col] = "";
      if (score > bestScore) {
        bestScore = score;
        bestMove = { row, col, score };
      }
    }
    return bestMove;
  }

  minimax(depth, isMaximizing, alpha, beta) {
    const winner = this.checkWinner();
    if (winner === this.aiPlayer) return 100 - depth;
    if (winner === this.humanPlayer) return -100 + depth;
    if (this.isBoardFull() || depth >= this.maxDepth) {
      return this.evaluateBoard();
    }

    const moves = this.getCandidateMoves();

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of moves) {
        const { row, col } = move;
        this.board[row][col] = this.aiPlayer;
        const score = this.minimax(depth + 1, false, alpha, beta);
        this.board[row][col] = "";
        maxScore = Math.max(score, maxScore);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        const { row, col } = move;
        this.board[row][col] = this.humanPlayer;
        const score = this.minimax(depth + 1, true, alpha, beta);
        this.board[row][col] = "";
        minScore = Math.min(score, minScore);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return minScore;
    }
  }

  evaluateBoard() {
    let score = 0;

    // Đánh giá theo hàng, cột và đường chéo
    if (this.difficulty === "medium") {
      // Medium: đánh giá đơn giản hơn
      score +=
        this.evaluateLinesSimple(this.aiPlayer) -
        this.evaluateLinesSimple(this.humanPlayer);
    } else {
      // Hard: đánh giá phức tạp
      score +=
        this.evaluateLines(this.aiPlayer) -
        this.evaluateLines(this.humanPlayer);
    }

    // Thêm điểm cho vị trí trung tâm
    const center = Math.floor(this.size / 2);
    if (this.board[center][center] === this.aiPlayer) score += 3;
    if (this.board[center][center] === this.humanPlayer) score -= 3;

    return score;
  }

  evaluateLinesSimple(player) {
    let score = 0;
    const winLength = this.getWinLength();

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const directions = [
          [0, 1],
          [1, 0],
          [1, 1],
          [1, -1],
        ];
        for (const [dx, dy] of directions) {
          let count = 0;
          let empty = 0;
          let blocked = 0;

          for (let k = 0; k < winLength; k++) {
            const row = i + k * dx;
            const col = j + k * dy;

            if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
              blocked++;
              continue;
            }

            if (this.board[row][col] === player) {
              count++;
            } else if (this.board[row][col] === "") {
              empty++;
            } else {
              blocked++;
            }
          }

          if (count === 0) continue;

          if (count >= winLength - 1 && empty >= 1 && blocked < 2) {
            score += 1000;
          } else if (count >= winLength - 2 && empty >= 2 && blocked < 2) {
            score += 100;
          } else if (count >= 2 && empty >= 1 && blocked < 2) {
            score += 10;
          } else if (count >= 1 && empty >= 1) {
            score += 1;
          }
        }
      }
    }

    return score;
  }

  evaluateLines(player) {
    let score = 0;
    const winLength = this.getWinLength();

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const directions = [
          [0, 1],
          [1, 0],
          [1, 1],
          [1, -1],
        ];

        for (const [dx, dy] of directions) {
          score += this.evaluateLine(i, j, dx, dy, player, winLength);
        }
      }
    }

    return score;
  }

  evaluateLine(startRow, startCol, dx, dy, player, winLength) {
    let score = 0;
    let count = 0;
    let empty = 0;
    let blocked = 0;

    for (let k = 0; k < winLength; k++) {
      const row = startRow + k * dx;
      const col = startCol + k * dy;

      if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
        blocked++;
        continue;
      }

      if (this.board[row][col] === player) {
        count++;
      } else if (this.board[row][col] === "") {
        empty++;
      } else {
        blocked++;
      }
    }

    if (count === 0) return 0;

    if (blocked === 0) {
      if (count === winLength - 1 && empty === 1) {
        score += 100000;
      } else {
        score += Math.pow(10, count);
      }
    } else if (blocked === 1) {
      if (count === winLength - 1 && empty === 1) {
        score += 5000;
      } else {
        score += Math.pow(10, count - 1);
      }
    } else {
      if (count === winLength - 1 && empty === 0) {
        score += 100;
      }
    }

    return score;
  }

  checkWinner() {
    const winLength = this.getWinLength();

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j <= this.size - winLength; j++) {
        const line = [];
        for (let k = 0; k < winLength; k++) {
          line.push({ row: i, col: j + k });
        }
        const winner = this.checkLine(line);
        if (winner) {
          this.highlightWinningLine(line);
          return winner;
        }
      }
    }

    for (let i = 0; i <= this.size - winLength; i++) {
      for (let j = 0; j < this.size; j++) {
        const line = [];
        for (let k = 0; k < winLength; k++) {
          line.push({ row: i + k, col: j });
        }
        const winner = this.checkLine(line);
        if (winner) {
          this.highlightWinningLine(line);
          return winner;
        }
      }
    }

    for (let i = 0; i <= this.size - winLength; i++) {
      for (let j = 0; j <= this.size - winLength; j++) {
        const line = [];
        for (let k = 0; k < winLength; k++) {
          line.push({ row: i + k, col: j + k });
        }
        const winner = this.checkLine(line);
        if (winner) {
          this.highlightWinningLine(line);
          return winner;
        }
      }
    }

    for (let i = 0; i <= this.size - winLength; i++) {
      for (let j = winLength - 1; j < this.size; j++) {
        const line = [];
        for (let k = 0; k < winLength; k++) {
          line.push({ row: i + k, col: j - k });
        }
        const winner = this.checkLine(line);
        if (winner) {
          this.highlightWinningLine(line);
          return winner;
        }
      }
    }

    return null;
  }

  checkLine(line) {
    const firstCell = this.board[line[0].row][line[0].col];
    if (firstCell === "") return null;

    for (const cell of line) {
      if (this.board[cell.row][cell.col] !== firstCell) {
        return null;
      }
    }

    return firstCell;
  }

  highlightWinningLine(line) {
    for (const cell of line) {
      const cellElement = document.querySelector(
        `[data-row="${cell.row}"][data-col="${cell.col}"]`
      );
      cellElement.classList.add("winning");
    }
  }

  getWinLength() {
    if (this.size <= 3) return 3;
    if (this.size <= 5) return 4;
    return 5;
  }

  isBoardFull() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] === "") return false;
      }
    }
    return true;
  }

  updateBoard() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = document.querySelector(
          `[data-row="${i}"][data-col="${j}"]`
        );
        const value = this.board[i][j];
        cell.textContent = value;
        cell.className = "cell";
        if (value === "X") cell.classList.add("x");
        if (value === "O") cell.classList.add("o");
      }
    }
  }

  updateStatus() {
    const status = document.getElementById("status");
    if (this.gameOver) return;

    if (this.gameMode === "ai") {
      if (this.isAITurn) {
        status.textContent = "Lượt của AI";
      } else {
        status.textContent = `Lượt của bạn (${this.humanPlayer})`;
      }
    } else {
      // Chế độ 2 người
      const playerName = this.getPlayerName(this.currentPlayer);
      status.textContent = `Lượt của ${playerName} (${this.currentPlayer})`;
    }
  }

  getPlayerName(symbol) {
    if (this.gameMode === "two") {
      if (symbol === "X") {
        return this.userManager.currentUser?.username || "Người chơi 1";
      } else {
        return this.userManager.player2?.username || "Người chơi 2";
      }
    }
    return symbol;
  }

  endGame(winner) {
    this.gameOver = true;
    const status = document.getElementById("status");
    let statsResult;

    if (winner === "tie") {
      status.textContent = "Hòa!";
      this.scores.tie++;
      if (this.gameMode === "two") {
        statsResult = this.userManager.updateUserStats(
          "draw",
          this.gameMode,
          this.difficulty
        );
      } else {
        statsResult = this.userManager.updateUserStats(
          "draw",
          this.gameMode,
          this.difficulty
        );
      }
    } else if (this.gameMode === "ai") {
      if (winner === this.humanPlayer) {
        status.textContent = "Bạn thắng!";
        this.scores.human++;
        statsResult = this.userManager.updateUserStats(
          "win",
          this.gameMode,
          this.difficulty
        );
      } else {
        status.textContent = "AI thắng!";
        this.scores.ai++;
        statsResult = this.userManager.updateUserStats(
          "loss",
          this.gameMode,
          this.difficulty
        );
      }
    } else {
      const winnerName = this.getPlayerName(winner);
      status.textContent = `${winnerName} thắng!`;
      this.scores[winner.toLowerCase()]++;

      const winnerPlayer = winner === "X" ? 1 : 2;
      statsResult = this.userManager.updateUserStats(
        "win",
        this.gameMode,
        this.difficulty,
        winnerPlayer
      );
    }

    if (statsResult) {
      if (
        this.gameMode === "two" &&
        statsResult.player1 &&
        statsResult.player2
      ) {
        const player1Name =
          this.userManager.currentUser?.username || "Người chơi 1";
        const player2Name =
          this.userManager.player2?.username || "Người chơi 2";

        status.textContent += ` | ${player1Name}: ${
          statsResult.player1.ratingChange > 0 ? "+" : ""
        }${statsResult.player1.ratingChange} điểm`;
        status.textContent += ` | ${player2Name}: ${
          statsResult.player2.ratingChange > 0 ? "+" : ""
        }${statsResult.player2.ratingChange} điểm`;
      } else if (statsResult.ratingChange !== undefined) {
        const difficultyText =
          statsResult.gameMode === "ai"
            ? ` (độ khó: ${statsResult.difficulty})`
            : " (vs người chơi)";
        status.textContent += ` ${statsResult.ratingChange > 0 ? "+" : ""}${
          statsResult.ratingChange
        } điểm${difficultyText}`;
      }
    }

    this.updateScore();
    this.updateUserInfo();
    this.updateUndoButton();
    this.updateRedoButton();

    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell) => cell.classList.add("disabled"));
  }

  updateScore() {
    if (this.gameMode === "ai") {
      document.getElementById("playerXLabel").textContent = "Người";
      document.getElementById("playerOLabel").textContent = "AI";
      document.getElementById("playerXScore").textContent = this.scores.human;
      document.getElementById("playerOScore").textContent = this.scores.ai;
    } else {
      const player1Name =
        this.userManager.currentUser?.username || "Người chơi 1";
      const player2Name = this.userManager.player2?.username || "Người chơi 2";

      document.getElementById(
        "playerXLabel"
      ).textContent = `${player1Name} (X)`;
      document.getElementById(
        "playerOLabel"
      ).textContent = `${player2Name} (O)`;
      document.getElementById("playerXScore").textContent = this.scores.x;
      document.getElementById("playerOScore").textContent = this.scores.o;
    }

    document.getElementById("tieScore").textContent = this.scores.tie;
  }

  undoLastMove() {
    if (this.moveHistory.length === 0 || this.gameOver) {
      return;
    }

    if (this.gameMode === "ai" && this.moveHistory.length >= 2) {
      const aiMove = this.moveHistory.pop();
      this.board[aiMove.row][aiMove.col] = "";

      const humanMove = this.moveHistory.pop();
      this.board[humanMove.row][humanMove.col] = "";

      this.redoHistory.push(humanMove, aiMove);

      this.currentPlayer = humanMove.previousPlayer;
      this.isAITurn = false;
    } else if (this.gameMode === "two" && this.moveHistory.length >= 1) {
      const lastMove = this.moveHistory.pop();
      this.board[lastMove.row][lastMove.col] = "";

      this.redoHistory.push(lastMove);

      this.currentPlayer = lastMove.previousPlayer;
    } else {
      return;
    }

    this.updateBoard();
    this.updateStatus();
    this.updateUndoButton();
    this.updateRedoButton();

    const winningCells = document.querySelectorAll(".winning");
    winningCells.forEach((cell) => cell.classList.remove("winning"));
  }

  updateUndoButton() {
    const undoButton = document.getElementById("undoMove");

    if (this.gameOver) {
      undoButton.disabled = true;
      return;
    }

    if (this.gameMode === "ai") {
      undoButton.disabled = this.moveHistory.length < 2 || this.isAITurn;
    } else {
      undoButton.disabled = this.moveHistory.length < 1;
    }
  }

  redoMove() {
    if (this.redoHistory.length === 0 || this.gameOver) {
      return;
    }

    if (this.gameMode === "ai" && this.redoHistory.length >= 2) {
      const humanMove = this.redoHistory.shift();
      this.board[humanMove.row][humanMove.col] = humanMove.player;
      this.moveHistory.push(humanMove);

      const aiMove = this.redoHistory.shift();
      this.board[aiMove.row][aiMove.col] = aiMove.player;
      this.moveHistory.push(aiMove);

      this.currentPlayer = aiMove.player === "X" ? "O" : "X";
      this.isAITurn = false;
    } else if (this.gameMode === "two" && this.redoHistory.length >= 1) {
      const move = this.redoHistory.shift();
      this.board[move.row][move.col] = move.player;
      this.moveHistory.push(move);

      this.currentPlayer = move.player === "X" ? "O" : "X";
    } else {
      return;
    }

    this.updateBoard();
    this.updateStatus();
    this.updateUndoButton();
    this.updateRedoButton();
  }

  updateRedoButton() {
    const redoButton = document.getElementById("redoMove");

    if (this.gameOver) {
      redoButton.disabled = true;
      return;
    }

    if (this.gameMode === "ai") {
      redoButton.disabled = this.redoHistory.length < 2 || this.isAITurn;
    } else {
      redoButton.disabled = this.redoHistory.length < 1;
    }
  }
}

let gameInstance = null;
document.addEventListener("DOMContentLoaded", () => {
  gameInstance = new TicTacToeAI();
  window.game = gameInstance;
});
