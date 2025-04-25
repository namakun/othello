// File: src/utils/game/GameCore.js
import { BitBoard } from "@/utils/bitboard/BitBoardBridge";
import { AnimationManager } from "./AnimationManager";
import { CPUManager } from "./CPUManager";
import { groupsToRowCols } from "@/utils/bitboard/bitView";

export class GameCore {
  /**
   * @param {"local"|"cpu-weak"|"cpu-normal"|"cpu-strong"} mode
   * @param {"black"|"white"}              playerColor
   */
  constructor(mode, playerColor) {
    this.mode         = mode;
    this.playerColor  = playerColor;
    this.activePlayer = "black";
    this.isGameOver   = false;
    this.winner       = null;

    this.bitBoard         = new BitBoard();
    this.animationManager = new AnimationManager();
    this.cpuManager       = mode.startsWith("cpu-")
      ? new CPUManager(this.bitBoard, mode, playerColor)
      : null;
  }

  // ────────────── ラッパ ──────────────

  isCpuMode()          { return this.mode.startsWith("cpu-"); }
  isCpuTurn()          { return this.isCpuMode() && this.activePlayer !== this.playerColor; }
  hasValidMoves(color) { return this.bitBoard.hasValidMoves(color); }
  score()              { return this.bitBoard.score(); }

  /** 合法手判定 */
  isValidMove(r, c) {
    const posMask = 1n << BigInt(r * 8 + c);
    return (this.bitBoard.legalMovesBitboard(this.activePlayer) & posMask) !== 0n;
  }

  /** (row,col)の駒色を返す */
  pieceAt(r, c) {
    return this.bitBoard.getPiece(r, c);
  }

  // ────────────── メイン処理 ──────────────

  /** 駒を置いてアニメーション→次手 */
  async placePiece(row, col) {
    if (!this.isValidMove(row, col) || this.isGameOver) return;

    const player    = this.activePlayer;
    const fromColor = player === "black" ? "white" : "black";

    // Rust→JSで得られる index[][] を {row,col}[][] に変換
    const rawGroups  = this.bitBoard.flipGroups(row, col, player);
    const flipGroups = groupsToRowCols(rawGroups);

    // UI アニメーション
    const total = flipGroups.reduce((sum, g) => sum + g.length, 0);
    await new Promise((resolve) => {
      let done = 0;
      this.animationManager.setLastPlacedPiece(row, col);
      this.animationManager.startFlippingAnimation(
        flipGroups,
        fromColor,
        player,
        () => { if (++done >= total) resolve(); }
      );
    });

    // 内部ビットボード更新 & 次手へ
    this.bitBoard.applyMove(row, col, player);
    await this._nextTurn();
  }

  /** ターン遷移 */
  async _nextTurn() {
    const next = this.activePlayer === "black" ? "white" : "black";

    if (this.hasValidMoves(next)) {
      this.activePlayer = next;
    } else if (this.hasValidMoves(this.activePlayer)) {
      // パス演出
      await new Promise((r) => setTimeout(r, 600));
    } else {
      this._finishGame();
      return;
    }

    if (this.isCpuTurn()) {
      const move = await this.cpuManager.selectMove();
      if (move) await this.placePiece(move.row, move.col);
    }
  }

  /** 終了処理 */
  _finishGame() {
    this.isGameOver = true;
    const { black, white } = this.score();
    this.winner = black > white ? "black" : white > black ? "white" : "draw";
  }

  /** リセット */
  reset(newColor = this.playerColor) {
    this.playerColor  = newColor;
    this.activePlayer = "black";
    this.isGameOver   = false;
    this.winner       = null;

    this.bitBoard.initialize();
    this.animationManager.reset();

    if (this.cpuManager) {
      this.cpuManager.updateBitBoard(this.bitBoard);
      this.cpuManager.updatePlayerColor(newColor);
    }
  }
}
