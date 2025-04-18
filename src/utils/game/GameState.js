/**
 * GameState – ゲーム進行管理
 */

export class GameState {
  constructor(gameMode, playerColor, bitBoard, animationManager, cpuManager) {
    this.gameMode = gameMode;
    this.playerColor = playerColor || "black";
    this.activePlayer = "black";
    this.isGameOver = false;
    this.winner = null;
    this.showPassMessage = false;
    this.isCpuThinking = false;
    this.bitBoard = bitBoard;
    this.animationManager = animationManager;
    this.cpuManager = cpuManager;
  }

  /* ---------- モード判定 ---------- */
  isCpuMode() {
    return this.gameMode && this.gameMode.startsWith("cpu-");
  }

  isCpuTurn(playerColorInGame) {
    return this.isCpuMode() && this.activePlayer !== playerColorInGame;
  }

  isValidMove(row, col) {
    return this.bitBoard.isValidMove(row, col, this.activePlayer);
  }

  getModeName() {
    const map = {
      offline: "オフラインマッチ",
      "cpu-weak": "CPU (弱)",
      "cpu-normal": "CPU (普通)",
      "cpu-strong": "CPU (強)",
    };
    return map[this.gameMode] || "オフラインマッチ";
  }

  /* ---------- 手番交替 ---------- */
  async switchToNextPlayer() {
    const next = this.activePlayer === "black" ? "white" : "black";

    if (this.bitBoard.hasValidMoves(next)) {
      /* 普通に交替 */
      this.activePlayer = next;
    } else if (this.bitBoard.hasValidMoves(this.activePlayer)) {
      /* 相手だけ打てない → パス */
      await this.handlePass(next); // ← 変更
      // 手番はそのまま
    } else {
      /* 双方打てない → 終了 */
      this.endGame();
      return;
    }

    /* CPU なら自動着手 */
    if (this.isCpuTurn(this.playerColor)) {
      await this.handleCpuTurn();
    }
  }
  /* ---------- パス処理 ---------- */
  async handlePass(skippedPlayer) {
    const keep = this.activePlayer;
    this.activePlayer = skippedPlayer;

    this.showPassMessage = true;
    await new Promise((r) => setTimeout(r, 2000));
    this.showPassMessage = false;

    this.activePlayer = keep; // 元に戻す
  }

  /* ---------- CPU 手番 ---------- */
  async handleCpuTurn() {
    try {
      this.isCpuThinking = true;
      const move = await this.cpuManager.selectMove();
      if (move) {
        await this.placePiece(move.row, move.col);
      }
    } catch (e) {
      /* eslint-disable no-console */
      console.error("CPU turn error:", e);
    } finally {
      this.isCpuThinking = false;
    }
  }

  /* ---------- 石を置く ---------- */
  async placePiece(row, col) {
    if (!this.bitBoard.isValidMove(row, col, this.activePlayer)) return;

    this.animationManager.setLastPlacedPiece(row, col);
    const flipped = this.bitBoard.placePiece(row, col, this.activePlayer);

    // アニメーション
    this.animationManager.startFlippingAnimation(flipped, this.activePlayer === "black" ? "white" : "black", this.activePlayer);

    await new Promise((r) => setTimeout(r, 500));
    await this.switchToNextPlayer();
  }

  /* ---------- ゲーム終了判定 ---------- */
  endGame() {
    this.isGameOver = true;
    const { black, white } = this.bitBoard.getScore();
    this.winner = black > white ? "Black" : white > black ? "White" : "Draw";
  }

  /* ---------- 盤面合法手ヘルパ ---------- */
  hasAvailableMoves() {
    return this.bitBoard.hasValidMoves(this.activePlayer);
  }

  /* ---------- リセット ---------- */
  reset() {
    this.activePlayer = "black";
    this.isGameOver = false;
    this.winner = null;
    this.showPassMessage = false;
    this.isCpuThinking = false;
  }
}
