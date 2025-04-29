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
    this.mode           = mode;
    this.playerColor    = playerColor;
    this.activePlayer   = "black";
    this.isGameOver     = false;
    this.winner         = null;
    this.showPassMessage = false;  // パス表示用のフラグを追加
    this.passPlayer     = null;    // パスするプレイヤーの色

    this.bitBoard         = new BitBoard();
    this.animationManager = new AnimationManager();
    this.cpuManager       = mode.startsWith("cpu-")
      ? new CPUManager(this.bitBoard, mode, playerColor)
      : null;

    // ViewBoardを初期化
    this.animationManager.syncViewBoard(this.bitBoard);
  }

  // ────────────── ラッパ ──────────────

  isCpuMode()          { return this.mode.startsWith("cpu-"); }
  isCpuTurn()          {
    // CPUモードで、かつ現在の手番がプレイヤーの色と異なる場合にCPUの手番
    return this.isCpuMode() && this.activePlayer !== this.playerColor;
  }
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
    await new Promise((resolve) => {
      this.animationManager.setLastPlacedPiece(row, col);

      // クリックした場所に新しい駒を配置
      this.animationManager.viewBoard.placePiece(row, col, player);

      this.animationManager.startFlippingAnimation(
        flipGroups,
        fromColor,
        player,
        () => resolve()
      );
    });

    // 内部ビットボード更新
    this.bitBoard.applyMove(row, col, player);

    // 次手へ
    await this._nextTurn();
  }

  /** ターン遷移 */
  async _nextTurn() {
    const next = this.activePlayer === "black" ? "white" : "black";

    // パスメッセージをリセット
    this.showPassMessage = false;
    this.passPlayer = null;

    if (this.hasValidMoves(next)) {
      this.activePlayer = next;
    } else if (this.hasValidMoves(this.activePlayer)) {
      // パス演出
      this.passPlayer = next;  // パスするプレイヤーの色を設定（次の手番の色）
      this.showPassMessage = true;  // パス表示フラグを設定

      // パスメッセージを表示するために十分な時間待機（1.5秒に増加）
      await new Promise((r) => setTimeout(r, 1500));

      // 手番は変わらないが、パスメッセージは消す
      this.showPassMessage = false;
      this.passPlayer = null;
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
    this.playerColor     = newColor;
    // オセロのルールでは常に黒が先手
    this.activePlayer    = "black";
    this.isGameOver      = false;
    this.winner          = null;
    this.showPassMessage = false;  // パス表示フラグもリセット
    this.passPlayer      = null;   // パスするプレイヤーの色もリセット

    this.bitBoard.initialize();
    this.animationManager.reset();

    // ViewBoardを同期
    this.animationManager.syncViewBoard(this.bitBoard);

    if (this.cpuManager) {
      this.cpuManager.updateBitBoard(this.bitBoard);
      this.cpuManager.updatePlayerColor(newColor);
    }
  }
}
