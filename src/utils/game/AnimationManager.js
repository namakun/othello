// File: src/utils/game/AnimationManager.js
export class AnimationManager {
  constructor() {
    this.flippingPieces = [];
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
    flipGroups.forEach((group) => {
      group.forEach((p, idx) => {
        const delay = idx * 100;
        setTimeout(() => {
          // アニメーション用クラスを追加
          this.flippingPieces.push({ row: p.row, col: p.col, fromColor, toColor });
        }, delay);

        setTimeout(() => {
          // アニメクラスを削除
          this.flippingPieces = this.flippingPieces.filter((x) => !(x.row === p.row && x.col === p.col));
          // ボード反転（ここで確実に flipPiece を呼ぶ）
          if (onComplete) onComplete(p);
        }, delay + 500);
      });
    });
  }

  setLastPlacedPiece(row, col) {
    this.lastPlacedPiece = { row, col };
  }

  isPieceFlipping(row, col) {
    return this.flippingPieces.some((p) => p.row === row && p.col === col);
  }

  getFlippingPiece(row, col) {
    return this.flippingPieces.find((p) => p.row === row && p.col === col);
  }

  reset() {
    this.flippingPieces = [];
    this.lastPlacedPiece = null;
  }
}
