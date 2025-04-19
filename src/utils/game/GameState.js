// File: src/utils/game/GameState.js
import { BitBoard }         from "@/utils/BitBoard";
import { AnimationManager } from "@/utils/game/AnimationManager";
import { CPUManager }       from "@/utils/game/CPUManager";

export class GameState {
  constructor(gameMode, playerColor, bitBoard, animationManager, cpuManager) {
    this.gameMode         = gameMode;
    this.playerColor      = playerColor;
    this.activePlayer     = "black";
    this.isGameOver       = false;
    this.winner           = null;
    this.showPassMessage  = false;
    this.isCpuThinking    = false;
    this.bitBoard         = bitBoard;
    this.animationManager = animationManager;
    this.cpuManager       = cpuManager;
  }

  isCpuMode() {
    return this.gameMode.startsWith("cpu-");
  }
  isCpuTurn(pc) {
    return this.isCpuMode() && this.activePlayer !== pc;
  }

  isValidMove(r, c) {
    return this.bitBoard.isValidMove(r, c, this.activePlayer);
  }

  /** 石を置いて反転アニメーションを実行 */
  async placePiece(row, col) {
    if (!this.bitBoard.isValidMove(row, col, this.activePlayer)) return;

    // 1) 新駒だけ即時反映
    const oldPlayer = this.activePlayer === "black" ? "white" : "black";
    this.bitBoard.setPiece(row, col, this.activePlayer);
    this.animationManager.setLastPlacedPiece(row, col);

    // 2) 方向ごとに反転すべき駒をグループ取得
    const flipGroups = this.bitBoard.getFlipsByDirection(
      row,
      col,
      this.activePlayer
    );

    // 3) アニメ開始 & 完了コールバックで flipPiece → カウント
    const totalFlips = flipGroups.reduce((sum, g) => sum + g.length, 0);
    await new Promise((resolve) => {
      let done = 0;
      this.animationManager.startFlippingAnimation(
        flipGroups,
        oldPlayer,
        this.activePlayer,
        (piece) => {
          // 各コマ反転完了時にボードを更新
          this.bitBoard.flipPiece(piece.row, piece.col, this.activePlayer);
          // カウントアップ
          done += 1;
          // 最後のコールバックが来たら即座に次へ
          if (done >= totalFlips) {
            resolve();
          }
        }
      );
    });

    // 4) 次手番へ
    await this.switchToNextPlayer();
  }

  /* ─── 以下は既存のまま ──────────────────────────────────────────── */

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
  }
}
