/**
 * ゲームのアニメーション状態を管理するクラス
 */
export class AnimationManager {
  constructor() {
    this.flippingPieces = [];
    this.lastPlacedPiece = null;
  }

  /**
   * 駒の反転アニメーションを開始
   * @param {Array<{row: number, col: number}>} pieces - 反転する駒のリスト
   * @param {string} fromColor - 反転前の色
   * @param {string} toColor - 反転後の色
   * @param {Function} onAnimationComplete - アニメーション完了時のコールバック
   */
  startFlippingAnimation(pieces, fromColor, toColor, onAnimationComplete) {
    pieces.forEach(piece => {
      this.flippingPieces.push({
        row: piece.row,
        col: piece.col,
        fromColor,
        toColor
      });

      // アニメーション終了後に反転フラグをクリア
      setTimeout(() => {
        this.flippingPieces = this.flippingPieces.filter(
          p => !(p.row === piece.row && p.col === piece.col)
        );
        if (onAnimationComplete) {
          onAnimationComplete(piece);
        }
      }, 500 + this.getPieceAnimationDelayValue(piece.row, piece.col));
    });
  }

  /**
   * 最後に置いた駒の位置を設定
   * @param {number} row - 行インデックス
   * @param {number} col - 列インデックス
   */
  setLastPlacedPiece(row, col) {
    this.lastPlacedPiece = { row, col };
  }

  /**
   * 駒が反転中かどうかを判定
   * @param {number} row - 行インデックス
   * @param {number} col - 列インデックス
   * @returns {boolean} 反転中かどうか
   */
  isPieceFlipping(row, col) {
    return this.flippingPieces && this.flippingPieces.some(
      p => p.row === row && p.col === col
    );
  }

  /**
   * 駒のアニメーション遅延時間の数値を取得
   * @param {number} row - 行インデックス
   * @param {number} col - 列インデックス
   * @returns {number} 遅延時間 (ms)
   */
  getPieceAnimationDelayValue(row, col) {
    if (!this.lastPlacedPiece) {
      return 0;
    }

    // 最後に置いた駒からのマンハッタン距離を計算
    const distance = Math.abs(row - this.lastPlacedPiece.row) +
                    Math.abs(col - this.lastPlacedPiece.col);

    // 距離に基づいて遅延時間を計算（80msごとに増加）
    return distance * 80;
  }

  /**
   * 駒のアニメーション遅延時間を計算（CSS用）
   * @param {number} row - 行インデックス
   * @param {number} col - 列インデックス
   * @returns {string} CSS用アニメーション遅延時間
   */
  getPieceAnimationDelay(row, col) {
    if (!this.lastPlacedPiece || !this.isPieceFlipping(row, col)) {
      return "0ms";
    }

    return `${this.getPieceAnimationDelayValue(row, col)}ms`;
  }

  /**
   * アニメーション状態をリセット
   */
  reset() {
    this.flippingPieces = [];
    this.lastPlacedPiece = null;
  }
}
