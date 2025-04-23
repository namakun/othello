// src/utils/game/GameState.js
import { BitBoard } from "@/utils/wasmBitBoard";
import { AnimationManager } from "@/utils/game/AnimationManager";
import { CPUManager } from "@/utils/game/CPUManager";

export class GameState {
  /**
   * @param {string} gameMode  - "cpu-weak" | "cpu-normal" | "cpu-strong" | "local"
   * @param {"black"|"white"} playerColor - プレイヤーの色
   * @param {BitBoard} bitBoard
   * @param {AnimationManager} animationManager
   * @param {CPUManager|null} cpuManager
   */
  constructor(gameMode, playerColor, bitBoard, animationManager, cpuManager) {
    this.gameMode        = gameMode;
    this.playerColor     = playerColor;
    this.activePlayer    = "black";
    this.isGameOver      = false;
    this.winner          = null;
    this.showPassMessage = false;
    this.isCpuThinking   = false;

    // 内部ロジック用ビットボード
    this.bitBoard         = bitBoard;
    // UIアニメ管理
    this.animationManager = animationManager;
    // CPU対戦用（localモード時は null）
    this.cpuManager       = cpuManager;

    // ──────────── 表示用ボード ────────────
    // null | "black" | "white"
    this.displayBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    // 初期配置をコピー
    this._syncDisplayFromBitBoard();
  }

  /** 表示用ボードを内部ビットボードから同期 */
  _syncDisplayFromBitBoard() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        this.displayBoard[r][c] = this.bitBoard.getPiece(r, c);
      }
    }
  }

  isCpuMode() {
    return this.gameMode.startsWith("cpu-");
  }
  isCpuTurn(playerColor) {
    return this.isCpuMode() && this.activePlayer !== playerColor;
  }

  /** 合法手判定（内部ビットボード参照） */
  isValidMove(r, c) {
    return this.bitBoard.isValidMove(r, c, this.activePlayer);
  }

  /**
   * 石を置く & アニメーション
   * UI は displayBoard を、ロジックは bitBoard を使い分ける
   */
  async placePiece(row, col) {
    if (!this.isValidMove(row, col)) return;

    const player    = this.activePlayer;
    const fromColor = player === "black" ? "white" : "black";

    // ────────────────────────────────────
    // (1) 反転対象だけ先に取得 (旧盤面ベース)
    const flipGroups = this.bitBoard.getFlipsByDirection(
      row,
      col,
      player
    );

    // (2) UI 用に「新駒だけ」即時表示
    this.displayBoard[row][col] = player;
    this.animationManager.setLastPlacedPiece(row, col);
    // ────────────────────────────────────

    // (3) アニメーションは UI 表示のみで完結
    const totalFlips = flipGroups.reduce((sum, g) => sum + g.length, 0);
    await new Promise((resolve) => {
      let done = 0;
      this.animationManager.startFlippingAnimation(
        flipGroups,
        fromColor,
        player,
        /** onComplete */ (piece) => {
          // UI 表示ボードをひっくり返す
          this.displayBoard[piece.row][piece.col] = player;
          if (++done >= totalFlips) resolve();
        }
      );
    });

    // (4) アニメ終了後に初めて内部ビットボードを一括更新
    this.bitBoard.applyMove(row, col, player);

    // (5) 次手番へ
    await this.switchToNextPlayer();
  }

  /* ───────────── 以降は既存ロジック ───────────── */

  async switchToNextPlayer() {
    const next = this.activePlayer === "black" ? "white" : "black";

    if (this.bitBoard.hasValidMoves(next)) {
      this.activePlayer = next;
    } else if (this.bitBoard.hasValidMoves(this.activePlayer)) {
      await this.handlePass(next);
    } else {
      this.endGame();
      return;
    }

    if (this.isCpuTurn(this.playerColor)) {
      await this.handleCpuTurn();
    }
  }

  async handlePass(skippedPlayer) {
    const keep = this.activePlayer;
    this.activePlayer = skippedPlayer;

    this.showPassMessage = true;
    await new Promise((r) => setTimeout(r, 2000));
    this.showPassMessage = false;

    this.activePlayer = keep;
  }

  async handleCpuTurn() {
    try {
      this.isCpuThinking = true;
      const move = await this.cpuManager.selectMove();
      if (move) {
        await this.placePiece(move.row, move.col);
      }
    } catch (e) {
      console.error("CPU turn error:", e);
    } finally {
      this.isCpuThinking = false;
    }
  }

  endGame() {
    this.isGameOver = true;
    const { black, white } = this.bitBoard.getScore();
    this.winner = black > white ? "Black" : white > black ? "White" : "Draw";
  }

  hasAvailableMoves() {
    return this.bitBoard.hasValidMoves(this.activePlayer);
  }

  reset() {
    this.activePlayer    = "black";
    this.isGameOver      = false;
    this.winner          = null;
    this.showPassMessage = false;
    this.isCpuThinking   = false;

    // 盤面も初期化
    this.bitBoard.initialize();
    this._syncDisplayFromBitBoard();
  }
}
