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
    // 最後に置いた駒の位置を取得
    const lastPiece = this.lastPlacedPiece;
    if (!lastPiece) return;

    // 全ての駒を1つの配列にフラット化
    let allPieces = [];
    flipGroups.forEach(group => {
      allPieces = allPieces.concat(group);
    });

    // 最後に置いた駒からの距離でソート
    allPieces.sort((a, b) => {
      // ユークリッド距離の2乗を計算（平方根は不要）
      const distA = Math.pow(a.row - lastPiece.row, 2) + Math.pow(a.col - lastPiece.col, 2);
      const distB = Math.pow(b.row - lastPiece.row, 2) + Math.pow(b.col - lastPiece.col, 2);
      return distA - distB; // 近い順にソート
    });

    // 総駒数を記録
    const totalPieces = allPieces.length;
    let completedPieces = 0;

    // ソートされた駒を順番に処理
    allPieces.forEach((p, idx) => {
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
