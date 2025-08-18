// User Management System
class UserManager {
  constructor() {
    this.currentUser = null;
    this.users = this.loadUsers();
    this.recalculateAllLevels(); // Recalculate levels on initialization
  }

  loadUsers() {
    const saved = JSON.parse(localStorage.getItem("caroUsers") || "[]");
    // Ensure all users have required properties
    return saved.map((user) => ({
      username: user.username,
      password: user.password,
      stats: {
        wins: user.stats?.wins || 0,
        losses: user.stats?.losses || 0,
        draws: user.stats?.draws || 0,
        totalGames: user.stats?.totalGames || 0,
        rating: user.stats?.rating || 0, // Điểm Elo
        ...user.stats,
      },
    }));
  }

  saveUsers() {
    localStorage.setItem("caroUsers", JSON.stringify(this.users));
  }

  recalculateAllLevels() {
    // Đảm bảo tất cả user có rating
    let updated = false;
    this.users.forEach((user) => {
      if (typeof user.stats.rating !== "number") {
        user.stats.rating = 0;
        updated = true;
      }

      // Migration: nếu có điểm cũ thì chuyển đổi sang rating
      if (user.stats.points > 0 && user.stats.rating === 0) {
        user.stats.rating = Math.floor(user.stats.points / 2); // Chuyển đổi từ hệ thống cũ
        updated = true;
      }
    });

    if (updated) {
      this.saveUsers();
    }
  }

  register(username, password) {
    // Check if username already exists
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
        rating: 0, // Điểm Elo bắt đầu từ 0
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

  getUser(username) {
    return this.users.find((user) => user.username === username);
  }

  logout() {
    this.currentUser = null;
  }

  updateUserStats(result, gameMode = "ai", difficulty = "medium") {
    if (!this.currentUser) return;

    const stats = this.currentUser.stats;
    stats.totalGames++;

    // Hệ thống rating đơn giản
    let rating = 0;

    // Điểm cơ bản theo kết quả
    switch (result) {
      case "win":
        stats.wins++;
        rating = 15; // Thắng: +15 điểm
        break;
      case "loss":
        stats.losses++;
        rating = -5; // Thua: -5 điểm
        break;
      case "draw":
        stats.draws++;
        rating = 5; // Hòa: +5 điểm
        break;
    }

    // Bonus theo độ khó
    const difficultyMultiplier = {
      easy: 0.5, // AI Dễ: x0.5
      medium: 1.0, // AI Trung bình: x1
      hard: 1.5, // AI Khó: x1.5
    };

    if (gameMode === "two") {
      rating *= 2; // Chơi với người: x2
    } else {
      const multiplier = difficultyMultiplier[difficulty] || 1.0;
      rating = Math.round(rating * multiplier);
    }

    // Cập nhật rating (không cho phép âm)
    stats.rating = Math.max(0, (stats.rating || 0) + rating);

    this.saveUsers();

    return {
      ratingChange: rating,
      newRating: stats.rating,
      gameMode,
      difficulty,
    };
  }

  // Lấy hạng bậc theo điểm Elo
  getRankFromRating(rating) {
    if (rating >= 800) return "Kim Cương";
    if (rating >= 600) return "Bạch Kim";
    if (rating >= 400) return "Vàng";
    if (rating >= 200) return "Bạc";
    return "Đồng";
  }

  // Lấy màu sắc cho hạng bậc
  getRankColor(rank) {
    const colors = {
      "Kim Cương": "#00d4ff",
      "Bạch Kim": "#e5e5e5",
      Vàng: "#ffd700",
      Bạc: "#c0c0c0",
      Đồng: "#cd7f32",
    };
    return colors[rank] || "#666";
  }

  calculateLevel(stats) {
    // CÁCH TÍNH LEVEL ĐƠN GIẢN:
    // Level = Điểm chia cho 100, tối thiểu level 1

    let level = Math.floor(stats.points / 100) + 1;

    // Đảm bảo pointsBreakdown tồn tại
    if (!stats.pointsBreakdown) {
      stats.pointsBreakdown = {
        aiEasy: { wins: 0, losses: 0, draws: 0, points: 0 },
        aiMedium: { wins: 0, losses: 0, draws: 0, points: 0 },
        aiHard: { wins: 0, losses: 0, draws: 0, points: 0 },
        human: { wins: 0, losses: 0, draws: 0, points: 0 },
      };
    }

    // Thưởng theo tỷ lệ thắng riêng cho từng độ khó
    let difficultyBonus = 0;

    // Tỷ lệ thắng AI Hard ≥50%: +2 level
    const hardTotal =
      stats.pointsBreakdown.aiHard.wins + stats.pointsBreakdown.aiHard.losses;
    if (hardTotal >= 5) {
      // Tối thiểu 5 trận
      const hardWinRate = stats.pointsBreakdown.aiHard.wins / hardTotal;
      if (hardWinRate >= 0.5) {
        difficultyBonus += 2;
      }
    }

    // Tỷ lệ thắng AI Medium ≥70%: +1 level
    const mediumTotal =
      stats.pointsBreakdown.aiMedium.wins +
      stats.pointsBreakdown.aiMedium.losses;
    if (mediumTotal >= 10) {
      // Tối thiểu 10 trận
      const mediumWinRate = stats.pointsBreakdown.aiMedium.wins / mediumTotal;
      if (mediumWinRate >= 0.7) {
        difficultyBonus += 1;
      }
    }

    // Tỷ lệ thắng người thật ≥60%: +2 level
    const humanTotal =
      stats.pointsBreakdown.human.wins + stats.pointsBreakdown.human.losses;
    if (humanTotal >= 5) {
      // Tối thiểu 5 trận
      const humanWinRate = stats.pointsBreakdown.human.wins / humanTotal;
      if (humanWinRate >= 0.6) {
        difficultyBonus += 2;
      }
    }

    level += difficultyBonus;

    // Thưởng thêm cho người chơi nhiều (kinh nghiệm)
    const experienceBonus = Math.floor(stats.totalGames / 50); // 1 level per 50 games
    level += experienceBonus;

    // Đảm bảo level từ 1 đến 50
    level = Math.max(1, level);
    level = Math.min(50, level);

    return level;
  }

  showLevelUpNotification(level) {
    document.getElementById("newLevelText").textContent = level;
    document.getElementById("levelUpNotification").classList.remove("hidden");
  }

  // Phương thức mới để hiển thị thông tin chi tiết về bonus level
  getLevelBonusInfo(stats) {
    if (!stats.pointsBreakdown) {
      return "Chưa có dữ liệu chi tiết.";
    }

    let info = "📊 Thông tin bonus level:\n\n";

    // AI Hard bonus
    const hardTotal =
      stats.pointsBreakdown.aiHard.wins + stats.pointsBreakdown.aiHard.losses;
    const hardWinRate =
      hardTotal > 0
        ? ((stats.pointsBreakdown.aiHard.wins / hardTotal) * 100).toFixed(1)
        : 0;
    const hardBonus =
      hardTotal >= 5 && hardWinRate >= 50 ? "✅ +2 level" : "❌ Chưa đạt";
    info += `🔥 AI Hard: ${stats.pointsBreakdown.aiHard.wins}/${hardTotal} (${hardWinRate}%) - ${hardBonus}\n`;
    info += `   Yêu cầu: ≥50% trong ít nhất 5 trận\n\n`;

    // AI Medium bonus
    const mediumTotal =
      stats.pointsBreakdown.aiMedium.wins +
      stats.pointsBreakdown.aiMedium.losses;
    const mediumWinRate =
      mediumTotal > 0
        ? ((stats.pointsBreakdown.aiMedium.wins / mediumTotal) * 100).toFixed(1)
        : 0;
    const mediumBonus =
      mediumTotal >= 10 && mediumWinRate >= 70 ? "✅ +1 level" : "❌ Chưa đạt";
    info += `⚡ AI Medium: ${stats.pointsBreakdown.aiMedium.wins}/${mediumTotal} (${mediumWinRate}%) - ${mediumBonus}\n`;
    info += `   Yêu cầu: ≥70% trong ít nhất 10 trận\n\n`;

    // Human bonus
    const humanTotal =
      stats.pointsBreakdown.human.wins + stats.pointsBreakdown.human.losses;
    const humanWinRate =
      humanTotal > 0
        ? ((stats.pointsBreakdown.human.wins / humanTotal) * 100).toFixed(1)
        : 0;
    const humanBonus =
      humanTotal >= 5 && humanWinRate >= 60 ? "✅ +2 level" : "❌ Chưa đạt";
    info += `👥 Vs Human: ${stats.pointsBreakdown.human.wins}/${humanTotal} (${humanWinRate}%) - ${humanBonus}\n`;
    info += `   Yêu cầu: ≥60% trong ít nhất 5 trận\n\n`;

    // Experience bonus
    const expBonus = Math.floor(stats.totalGames / 50);
    info += `🎯 Kinh nghiệm: ${stats.totalGames} trận - +${expBonus} level\n`;
    info += `   (1 level mỗi 50 trận)\n`;

    return info;
  }

  getUserLevel(points) {
    // Use the same calculation method for consistency
    const dummyStats = {
      points: points,
      wins: 0,
      losses: 0,
      totalGames: 0,
    };
    const level = this.calculateLevel(dummyStats);

    // Return level titles based on calculated level
    if (level >= 80) return "Grandmaster";
    if (level >= 60) return "Master";
    if (level >= 40) return "Expert";
    if (level >= 25) return "Advanced";
    if (level >= 15) return "Intermediate";
    if (level >= 8) return "Amateur";
    if (level >= 3) return "Novice";
    return "Beginner";
  }

  getLevelBreakdown(stats) {
    const pointsLevel = Math.floor(stats.points / 30) + 1;

    // Cập nhật tính tỷ lệ thắng: chỉ tính thắng/(thắng+thua), không tính hòa
    const decisiveGames = stats.wins + stats.losses;
    const winRate = decisiveGames > 0 ? stats.wins / decisiveGames : 0;

    const winRateBonus = decisiveGames >= 10 ? Math.floor(winRate * 20) : 0;
    const experienceBonus = Math.floor(stats.totalGames / 25);
    const lossRate = decisiveGames > 0 ? stats.losses / decisiveGames : 0;
    const consistencyBonus =
      decisiveGames >= 20 ? Math.floor((1 - lossRate) * 10) : 0;

    return {
      baseLevel: pointsLevel,
      winRateBonus: winRateBonus,
      experienceBonus: experienceBonus,
      consistencyBonus: consistencyBonus,
      finalLevel: this.calculateLevel(stats),
      winRate: (winRate * 100).toFixed(1),
      totalGames: stats.totalGames,
    };
  }

  getPointsBreakdown(stats) {
    if (!stats.pointsBreakdown) {
      return {
        aiEasy: { wins: 0, losses: 0, draws: 0, points: 0 },
        aiMedium: { wins: 0, losses: 0, draws: 0, points: 0 },
        aiHard: { wins: 0, losses: 0, draws: 0, points: 0 },
        human: { wins: 0, losses: 0, draws: 0, points: 0 },
      };
    }
    return stats.pointsBreakdown;
  }

  getLeaderboard(sortBy = "rating") {
    const leaderboard = this.users.map((user) => {
      // Tính tỷ lệ thắng: thắng / (thắng + thua), không tính hòa
      const decisiveGames = user.stats.wins + user.stats.losses;
      const winRate =
        decisiveGames > 0
          ? ((user.stats.wins / decisiveGames) * 100).toFixed(1)
          : 0;

      const rating = user.stats.rating || 0;
      const rank = this.getRankFromRating(rating);

      return {
        ...user,
        winRate: winRate,
        rating: rating,
        rank: rank,
      };
    });

    return leaderboard.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          // Sắp xếp theo điểm
          return b.rating - a.rating;
        case "totalGames":
          return b.stats.totalGames - a.stats.totalGames;
        default:
          return b.rating - a.rating; // Mặc định sắp xếp theo điểm
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
    this.gameMode = "ai"; // NEW: chế độ chơi (ai | two)
    this.gameOver = false;
    this.humanPlayer = "X";
    this.aiPlayer = "O";
    this.maxDepth = 3;
    this.isAITurn = false;
    this.difficulty = "medium"; // thêm thuộc tính độ khó
    // Mở rộng điểm số để hỗ trợ 2 chế độ
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

    // Level up notification
    document.getElementById("closeLevelUp").addEventListener("click", () => {
      document.getElementById("levelUpNotification").classList.add("hidden");
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
        this.gameMode = gameModeSel.value; // Cập nhật chế độ chơi hiện tại
        this.updateFirstPlayerVisibility(); // Ẩn/hiện tuỳ chọn người chơi đầu
        this.updatePointsInfoVisibility(); // Cập nhật thông tin điểm
        this.initializeGame();
      });
    }

    document.getElementById("firstPlayer").addEventListener("change", () => {
      this.initializeGame();
    });

    // Lắng nghe thay đổi độ khó
    const difficultySel = document.getElementById("difficulty");
    if (difficultySel) {
      difficultySel.addEventListener("change", () => {
        this.difficulty = difficultySel.value;
        this.initializeGame();
      });
      this.difficulty = difficultySel.value; // Khởi tạo giá trị độ khó
      // Ẩn/hiện độ khó theo chế độ chơi
      const difficultyGroup = difficultySel.parentElement;
      const updateDifficultyVisibility = () => {
        if (this.gameMode === "two") {
          difficultyGroup.classList.add("hidden");
        } else {
          difficultyGroup.classList.remove("hidden");
        }
      };
      const gameModeSel = document.getElementById("gameMode");
      if (gameModeSel) {
        gameModeSel.addEventListener("change", updateDifficultyVisibility);
        updateDifficultyVisibility();
      }
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

  // Cập nhật hiển thị thông tin điểm dựa trên chế độ chơi và độ khó
  updatePointsInfoVisibility() {
    const pointsInfo = document.getElementById("pointsInfo");
    if (!pointsInfo) return;

    // Luôn hiển thị thông tin điểm để người chơi biết cách tính
    pointsInfo.style.display = "block";
  }

  // Screen Management
  hideAllScreens() {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("registerScreen").classList.add("hidden");
    document.getElementById("leaderboardScreen").classList.add("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
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
    this.updatePointsInfoVisibility(); // Cập nhật thông tin điểm
    this.initializeGame();
  }

  showLeaderboardScreen() {
    this.hideAllScreens();
    document.getElementById("leaderboardScreen").classList.remove("hidden");
    this.updateLeaderboard();

    // Show/hide back to game button based on login status
    const backToGameBtn = document.getElementById("backToGame");
    if (this.userManager.currentUser) {
      backToGameBtn.classList.remove("hidden");
    } else {
      backToGameBtn.classList.add("hidden");
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

  updateUserInfo() {
    const user = this.userManager.currentUser;
    if (!user) return;

    const rating = user.stats.rating || 0;

    document.getElementById("currentUser").textContent = user.username;
    document.getElementById("userRating").textContent = rating;
  }

  updateLeaderboard() {
    const sortBy = document.getElementById("sortBy").value;
    const leaderboard = this.userManager.getLeaderboard(sortBy);
    const tbody = document.getElementById("leaderboardBody");

    tbody.innerHTML = "";

    leaderboard.forEach((user, index) => {
      const row = document.createElement("tr");
      const rank = index + 1;

      // Add rank styling
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

  // Game Logic Methods (keeping existing methods and adding integration)
  initializeGame() {
    this.size = parseInt(document.getElementById("boardSize").value);
    this.gameMode = document.getElementById("gameMode")
      ? document.getElementById("gameMode").value
      : "ai";

    // Lấy difficulty một cách an toàn
    const difficultyElement = document.getElementById("difficulty");
    this.difficulty = difficultyElement ? difficultyElement.value : "medium";

    this.maxDepth = this.getOptimalDepth(this.size);
    this.board = Array(this.size)
      .fill()
      .map(() => Array(this.size).fill(""));
    this.gameOver = false;
    this.moveHistory = []; // Thêm lịch sử nước đi
    this.redoHistory = []; // Thêm lịch sử nước đi đã lùi lại

    // Cập nhật hiển thị lựa chọn người chơi đầu (ẩn khi chế độ 2 người)
    this.updateFirstPlayerVisibility();

    if (this.gameMode === "ai") {
      // AI mode (giữ logic cũ)
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
      // Two-player mode
      this.currentPlayer = "X"; // người đăng nhập luôn là X
      this.humanPlayer = "X"; // để tái sử dụng updateUserStats
      this.aiPlayer = ""; // không dùng
      this.isAITurn = false;
    }

    this.createBoard();
    this.updateStatus();
    this.updateScore();
    this.updateUndoButton(); // Cập nhật trạng thái nút lùi lại
    this.updateRedoButton(); // Cập nhật trạng thái nút làm lại

    // Nếu AI đi trước, thực hiện nước đi
    if (this.gameMode === "ai" && this.isAITurn) {
      setTimeout(() => this.makeAIMove(), 500);
    }
  }

  // Tối ưu độ sâu dựa trên kích thước bàn chơi
  getOptimalDepth(size) {
    if (size <= 3) return 9; // Bàn nhỏ có thể tìm kiếm sâu
    if (size <= 5) return 4;
    if (size <= 7) return 3;
    if (size <= 9) return 2;
    return 1; // Bàn rất lớn chỉ dùng độ sâu 1
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
    // Xóa lịch sử redo khi có nước đi mới
    this.redoHistory = [];

    // Lưu trạng thái trước khi thực hiện nước đi
    this.moveHistory.push({
      row,
      col,
      player,
      previousPlayer: this.currentPlayer,
      boardState: this.board.map((row) => [...row]), // Deep copy của board
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

    this.updateUndoButton(); // Cập nhật trạng thái nút lùi lại
    this.updateRedoButton(); // Cập nhật trạng thái nút làm lại
  }

  makeAIMove() {
    if (this.gameOver) return;

    document.getElementById("aiThinking").classList.remove("hidden");

    // Sử dụng setTimeout để UI có thể cập nhật
    setTimeout(() => {
      const startTime = Date.now();
      let move;
      if (this.difficulty === "easy") {
        // EASY: AI chọn nước đi ngẫu nhiên
        const candidates = this.getCandidateMoves();
        move = candidates[Math.floor(Math.random() * candidates.length)];
        move.score = 0;
      } else {
        // MEDIUM & HARD: AI dùng minimax
        move = this.findBestMove();
      }
      const endTime = Date.now();

      if (move) {
        this.makeMove(move.row, move.col, this.aiPlayer);

        // Hiển thị thông tin đánh giá
        const evalInfo = document.getElementById("evaluationInfo");
        evalInfo.textContent = `AI đã suy nghĩ trong ${
          endTime - startTime
        }ms, đánh giá: ${move.score}`;
      }

      document.getElementById("aiThinking").classList.add("hidden");
      this.isAITurn = false;
      this.updateUndoButton(); // Cập nhật nút lùi lại sau khi AI đi
      this.updateRedoButton(); // Cập nhật nút làm lại sau khi AI đi
    }, 100);
  }

  //Lấy danh sách nước đi tiềm năng xung quanh các ô đã đánh để giảm không gian tìm kiếm
  getCandidateMoves(radius = 2) {
    const moves = [];
    const added = new Set();

    // Duyệt qua toàn bộ bàn cờ để tìm các ô đã đánh
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.board[i][j] !== "") {
          // Xét các ô xung quanh trong phạm vi radius
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
              if (dx === 0 && dy === 0) continue; // bỏ qua chính ô đang xét
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
                  moves.push({ row, col });
                }
              }
            }
          }
        }
      }
    }

    // Nếu bàn cờ trống, chọn ô trung tâm
    if (moves.length === 0) {
      const center = Math.floor(this.size / 2);
      moves.push({ row: center, col: center });
    }

    return moves;
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
        // Nếu đi nước này thắng ngay, chọn luôn
        return { row, col, score: 100000 };
      }
    }

    // Nếu không có nước thắng ngay, dùng minimax như cũ
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

    // Sử dụng các nước đi tiềm năng để giảm số lượng nhánh
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
        if (beta <= alpha) break; // cắt tỉa alpha-beta
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
        if (beta <= alpha) break; // cắt tỉa alpha-beta
      }
      return minScore;
    }
  }

  evaluateBoard() {
    let score = 0;

    // Đánh giá theo hàng, cột và đường chéo
    score +=
      this.evaluateLines(this.aiPlayer) - this.evaluateLines(this.humanPlayer);

    // Thêm điểm cho vị trí trung tâm
    const center = Math.floor(this.size / 2);
    if (this.board[center][center] === this.aiPlayer) score += 3;
    if (this.board[center][center] === this.humanPlayer) score -= 3;

    return score;
  }

  evaluateLines(player) {
    let score = 0;
    const winLength = this.getWinLength();

    // Đánh giá tất cả các đường có thể thắng
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        // Kiểm tra 4 hướng: ngang, dọc, chéo chính, chéo phụ
        const directions = [
          [0, 1], // ngang
          [1, 0], // dọc
          [1, 1], // chéo chính
          [1, -1], // chéo phụ
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
    let count = 0; // số quân của player trong đoạn
    let empty = 0; // số ô trống trong đoạn
    let blocked = 0; // số đầu bị chặn bởi quân đối phương hoặc biên

    // Kiểm tra đường thẳng có độ dài winLength
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

    // Không xét đoạn không có quân của player
    if (count === 0) return 0;

    // Công thức chấm điểm heuristic
    if (blocked === 0) {
      // Cả hai đầu đều mở
      if (count === winLength - 1 && empty === 1) {
        score += 100000; // sắp thắng
      } else {
        score += Math.pow(10, count); // 10, 100, 1000, ...
      }
    } else if (blocked === 1) {
      // Một đầu bị chặn
      if (count === winLength - 1 && empty === 1) {
        score += 5000;
      } else {
        score += Math.pow(10, count - 1); // 1, 10, 100, ...
      }
    } else {
      // Hai đầu đều bị chặn: giá trị thấp
      if (count === winLength - 1 && empty === 0) {
        // Đối thủ có thể thắng, vẫn nên quan tâm
        score += 100;
      }
    }

    return score;
  }

  checkWinner() {
    const winLength = this.getWinLength();

    // Kiểm tra hàng ngang
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

    // Kiểm tra hàng dọc
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

    // Kiểm tra đường chéo chính
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

    // Kiểm tra đường chéo phụ
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
    // Độ dài cần thiết để thắng dựa trên kích thước bàn chơi
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
      status.textContent = `Lượt của ${this.currentPlayer}`;
    }
  }

  endGame(winner) {
    this.gameOver = true;
    const status = document.getElementById("status");
    let statsResult;

    if (winner === "tie") {
      status.textContent = "Hòa!";
      this.scores.tie++;
      statsResult = this.userManager.updateUserStats(
        "draw",
        this.gameMode,
        this.difficulty
      );
    } else if (this.gameMode === "ai") {
      // AI mode
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
      // Two player mode
      if (winner === "X") {
        status.textContent = "X thắng!";
        this.scores.x++;
        statsResult = this.userManager.updateUserStats(
          "win",
          this.gameMode,
          this.difficulty
        );
      } else {
        status.textContent = "O thắng!";
        this.scores.o++;
        statsResult = this.userManager.updateUserStats(
          "loss",
          this.gameMode,
          this.difficulty
        );
      }
    }

    // Hiển thị thông tin điểm đã nhận
    if (statsResult && statsResult.pointsEarned > 0) {
      const difficultyText =
        statsResult.gameMode === "ai"
          ? ` (độ khó: ${statsResult.difficulty})`
          : " (vs người chơi)";
      status.textContent += ` +${statsResult.pointsEarned} điểm${difficultyText}`;
    }

    this.updateScore();
    this.updateUserInfo(); // Update user info after game ends
    this.updateUndoButton(); // Vô hiệu hóa nút lùi lại
    this.updateRedoButton(); // Vô hiệu hóa nút làm lại

    // Vô hiệu hóa tất cả các ô
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
      document.getElementById("playerXLabel").textContent = "X";
      document.getElementById("playerOLabel").textContent = "O";
      document.getElementById("playerXScore").textContent = this.scores.x;
      document.getElementById("playerOScore").textContent = this.scores.o;
    }

    document.getElementById("tieScore").textContent = this.scores.tie;
  }

  // Chức năng lùi lại bước đã đi
  undoLastMove() {
    if (this.moveHistory.length === 0 || this.gameOver) {
      return; // Không có nước đi nào để lùi lại hoặc game đã kết thúc
    }

    // Trong chế độ AI, cần lùi lại 2 nước đi (người chơi và AI)
    if (this.gameMode === "ai" && this.moveHistory.length >= 2) {
      // Lùi lại nước đi của AI
      const aiMove = this.moveHistory.pop();
      this.board[aiMove.row][aiMove.col] = "";

      // Lùi lại nước đi của người chơi
      const humanMove = this.moveHistory.pop();
      this.board[humanMove.row][humanMove.col] = "";

      // Lưu các nước đi đã lùi vào redoHistory
      this.redoHistory.push(humanMove, aiMove);

      // Khôi phục trạng thái
      this.currentPlayer = humanMove.previousPlayer;
      this.isAITurn = false;
    } else if (this.gameMode === "two" && this.moveHistory.length >= 1) {
      // Trong chế độ 2 người, chỉ lùi lại 1 nước đi
      const lastMove = this.moveHistory.pop();
      this.board[lastMove.row][lastMove.col] = "";

      // Lưu nước đi đã lùi vào redoHistory
      this.redoHistory.push(lastMove);

      this.currentPlayer = lastMove.previousPlayer;
    } else {
      return; // Không đủ nước đi để lùi lại
    }

    // Cập nhật giao diện
    this.updateBoard();
    this.updateStatus();
    this.updateUndoButton();
    this.updateRedoButton(); // Cập nhật trạng thái nút làm lại

    // Xóa highlight thắng nếu có
    const winningCells = document.querySelectorAll(".winning");
    winningCells.forEach((cell) => cell.classList.remove("winning"));
  }

  // Cập nhật trạng thái nút lùi lại
  updateUndoButton() {
    const undoButton = document.getElementById("undoMove");

    if (this.gameOver) {
      undoButton.disabled = true;
      return;
    }

    if (this.gameMode === "ai") {
      // Trong chế độ AI, cần ít nhất 2 nước đi và không phải lượt AI
      undoButton.disabled = this.moveHistory.length < 2 || this.isAITurn;
    } else {
      // Trong chế độ 2 người, cần ít nhất 1 nước đi
      undoButton.disabled = this.moveHistory.length < 1;
    }
  }

  // Chức năng khôi phục lại bước đã lùi
  redoMove() {
    if (this.redoHistory.length === 0 || this.gameOver) {
      return; // Không có nước đi nào để khôi phục hoặc game đã kết thúc
    }

    // Trong chế độ AI, cần khôi phục 2 nước đi (người chơi và AI)
    if (this.gameMode === "ai" && this.redoHistory.length >= 2) {
      // Khôi phục nước đi của người chơi
      const humanMove = this.redoHistory.shift();
      this.board[humanMove.row][humanMove.col] = humanMove.player;
      this.moveHistory.push(humanMove);

      // Khôi phục nước đi của AI
      const aiMove = this.redoHistory.shift();
      this.board[aiMove.row][aiMove.col] = aiMove.player;
      this.moveHistory.push(aiMove);

      // Khôi phục trạng thái
      this.currentPlayer = aiMove.player === "X" ? "O" : "X";
      this.isAITurn = false;
    } else if (this.gameMode === "two" && this.redoHistory.length >= 1) {
      // Trong chế độ 2 người, chỉ khôi phục 1 nước đi
      const move = this.redoHistory.shift();
      this.board[move.row][move.col] = move.player;
      this.moveHistory.push(move);

      this.currentPlayer = move.player === "X" ? "O" : "X";
    } else {
      return; // Không đủ nước đi để khôi phục
    }

    // Cập nhật giao diện
    this.updateBoard();
    this.updateStatus();
    this.updateUndoButton();
    this.updateRedoButton();
  }

  // Cập nhật trạng thái nút làm lại
  updateRedoButton() {
    const redoButton = document.getElementById("redoMove");

    if (this.gameOver) {
      redoButton.disabled = true;
      return;
    }

    if (this.gameMode === "ai") {
      // Trong chế độ AI, cần ít nhất 2 nước đi trong redoHistory và không phải lượt AI
      redoButton.disabled = this.redoHistory.length < 2 || this.isAITurn;
    } else {
      // Trong chế độ 2 người, cần ít nhất 1 nước đi trong redoHistory
      redoButton.disabled = this.redoHistory.length < 1;
    }
  }
}

// Khởi tạo game khi trang được load
let gameInstance = null;
document.addEventListener("DOMContentLoaded", () => {
  gameInstance = new TicTacToeAI();
  window.game = gameInstance; // Make it globally accessible
});

// ----------------
