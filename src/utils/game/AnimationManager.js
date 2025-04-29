// File: src/utils/game/AnimationManager.js
import { ViewBoard } from "./ViewBoard";

export class AnimationManager {
  constructor() {
    this.viewBoard = new ViewBoard();
    this.lastPlacedPiece = null;
  }

  /**
   * 駒の反転アニメーションを開始
   * @param {Array<Array<{row:number, col:number}>>} flipGroups
   * @param {string} fromColor
   * @param {string} toColor
   * @param {(piece:{row, col})=>void} onComplete
   */
  startFlippingAnimation(flipGroups, fromColor, toColor, onComplete) {
    let totalPieces = 0;
    let completedPieces = 0;

    // 総駒数を計算
    flipGroups.forEach(group => {
      totalPieces += group.length;
    });

    // 各グループの駒を処理
    flipGroups.forEach((group) => {
      group.forEach((p, idx) => {
        const delay = idx * 100;

        // 反転開始
        setTimeout(() => {
          // ViewBoardに反転開始を通知
          this.viewBoard.startFlipping(p.row, p.col, toColor);

          // 反転完了（500ms後）
          setTimeout(() => {
            // ViewBoardに反転完了を通知
            this.viewBoard.completeFlipping(p.row, p.col);

            // カウントアップして全て完了したらコールバック
            completedPieces++;
            if (completedPieces >= totalPieces && onComplete) {
              onComplete(p);
            }
          }, 500);
        }, delay);
      });
    });
  }

  setLastPlacedPiece(row, col) {
    this.lastPlacedPiece = { row, col };
  }

  /**
   * BitBoardから初期状態を同期
   * @param {import("@/utils/bitboard/BitBoardBridge").BitBoard} bitBoard
   */
  syncViewBoard(bitBoard) {
    this.viewBoard.syncFromBitBoard(bitBoard);
  }

  /**
   * 駒が反転中かどうか
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  isPieceFlipping(row, col) {
    return this.viewBoard.isFlipping(row, col);
  }

  /**
   * セルの状態を取得
   * @param {number} row
   * @param {number} col
   * @returns {object} セルの状態
   */
  getCellState(row, col) {
    return this.viewBoard.getCell(row, col);
  }

  reset() {
    this.viewBoard.reset();
    this.lastPlacedPiece = null;
  }
}
