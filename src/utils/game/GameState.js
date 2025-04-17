/**
 * ゲームの状態を管理するクラス
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

  /**
   * ゲームモードがCPUモードかどうかを判定
   * @returns {boolean} CPUモードかどうか
   */
  isCpuMode() {
    return this.gameMode && this.gameMode.startsWith("cpu-");
  }

  /**
   * 現在のターンがCPUのターンかどうかを判定
   * @param {string} playerColorInGame - プレイヤーの色
   * @returns {boolean} CPUのターンかどうか
   */
  isCpuTurn(playerColorInGame) {
    return this.isCpuMode() && this.activePlayer !== playerColorInGame;
  }

  /**
   * モード名を取得
   * @returns {string} モード名
   */
  getModeName() {
    const modeNames = {
      "offline": "オフラインマッチ",
      "cpu-weak": "CPU (弱)",
      "cpu-normal": "CPU (普通)",
      "cpu-strong": "CPU (強)"
    };
    return modeNames[this.gameMode] || "オフラインマッチ";
  }
  /**
   * 次のプレイヤーに切り替える
   * @returns {Promise<void>}
   */
  async switchToNextPlayer() {
    const currentPlayer = this.activePlayer;
    this.activePlayer = this.activePlayer === "black" ? "white" : "black";

    // 次のプレイヤーが手を打てるかチェック
    if (!this.hasAvailableMoves()) {
      // 現在のプレイヤーも手が打てない場合はゲーム終了
      this.activePlayer = currentPlayer;
      if (!this.hasAvailableMoves()) {
        this.endGame();
        return;
      }
      // パスが必要
      await this.handlePass();
    }

    // CPUの手番の場合
    if (this.isCpuTurn(this.playerColor)) {
      await this.handleCpuTurn();
    }
  }

  /**
   * パス処理を実行
   * @returns {Promise<void>}
   */
  async handlePass() {
    this.showPassMessage = true;
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.showPassMessage = false;
    this.activePlayer = this.activePlayer === "black" ? "white" : "black";
  }

  /**
   * CPUの手を実行
   * @returns {Promise<void>}
   */
  async handleCpuTurn() {
    try {
      this.isCpuThinking = true;
      const move = await this.cpuManager.selectMove();
      if (move) {
        await this.placePiece(move.row, move.col);
      }
    } catch (error) {
      console.error('Error during CPU turn:', error);
    } finally {
      this.isCpuThinking = false;
    }
  }

  /**
   * 駒を配置
   * @param {number} row - 行
   * @param {number} col - 列
   * @returns {Promise<void>}
   */
  async placePiece(row, col) {
    if (!this.isValidMove(row, col)) return;

    this.animationManager.setLastPlacedPiece(row, col);
    const flippedPieces = this.bitBoard.placePiece(row, col, this.activePlayer);

    // アニメーション処理
    this.animationManager.startFlippingAnimation(
      flippedPieces,
      this.activePlayer === "black" ? "white" : "black",
      this.activePlayer
    );

    await new Promise(resolve => setTimeout(resolve, 500));
    await this.switchToNextPlayer();
  }

  /**
   * 現在のプレイヤーが有効な手を持っているかチェック
   * @returns {boolean} 有効な手があるかどうか
   */
  hasAvailableMoves() {
    return this.bitBoard && this.bitBoard.hasValidMoves(this.activePlayer);
  }

  /**
   * 指定した位置に駒を置けるかチェック
   * @param {number} row - 行
   * @param {number} col - 列
   * @returns {boolean} 置けるかどうか
   */
  isValidMove(row, col) {
    return this.bitBoard && this.bitBoard.isValidMove(row, col, this.activePlayer);
  }

  /**
   * ゲームを終了する
   */
  endGame() {
    this.isGameOver = true;
    const score = this.bitBoard.getScore();

    if (score.black > score.white) {
      this.winner = "Black";
    } else if (score.white > score.black) {
      this.winner = "White";
    } else {
      this.winner = "Draw";
    }
  }

  /**
   * ゲーム状態をリセット
   */
  reset() {
    this.activePlayer = "black";
    this.isGameOver = false;
    this.winner = null;
    this.showPassMessage = false;
    this.isCpuThinking = false;
  }
}
