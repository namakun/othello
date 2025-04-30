/**
 * src/utils/game/AnimationManager.js
 * 駒の反転アニメーションを管理するクラス
 */
import { ViewBoard } from "./ViewBoard";

/**
 * 駒の反転アニメーションを管理するクラス
 * ViewBoardと連携して、駒の反転アニメーションを制御する
 */
export class AnimationManager {
  /**
   * アニメーションマネージャーを初期化
   */
  constructor() {
    this.viewBoard = new ViewBoard();
    this.lastPlacedPiece = null;
  }

  /**
   * 駒の反転アニメーションを開始
   * @param {Array<Array<{row:number, col:number}>>} flipGroups 反転する駒のグループ配列
   * @param {string} fromColor 元の色
   * @param {string} toColor 反転後の色
   * @param {(piece:{row, col})=>void} onComplete アニメーション完了時のコールバック
   */
  startFlippingAnimation(flipGroups, fromColor, toColor, onComplete) {
    /**
     * 最後に置いた駒の位置を取得
     */
    const lastPiece = this.lastPlacedPiece;
    if (!lastPiece) return;

    /**
     * 全ての駒を1つの配列にフラット化
     */
    let allPieces = [];
    flipGroups.forEach(group => {
      allPieces = allPieces.concat(group);
    });

    /**
     * 駒を距離ごとにグループ化
     * 同じ距離の駒は同時にひっくり返すため
     */
    const distanceGroups = new Map();

    allPieces.forEach(p => {
      // チェビシェフ距離を計算（縦横の移動量の最大値）
      // これにより、縦・横・斜めの距離1の駒が同じグループとして扱われる
      const distance = Math.max(
        Math.abs(p.row - lastPiece.row),
        Math.abs(p.col - lastPiece.col)
      );

      if (!distanceGroups.has(distance)) {
        distanceGroups.set(distance, []);
      }

      distanceGroups.get(distance).push(p);
    });

    // 距離でソートされたグループの配列を作成
    const sortedDistances = Array.from(distanceGroups.keys()).sort((a, b) => a - b);

    /**
     * 総駒数を記録
     */
    const totalPieces = allPieces.length;
    let completedPieces = 0;

    /**
     * 距離グループごとに処理
     */
    sortedDistances.forEach((distance, groupIdx) => {
      const pieces = distanceGroups.get(distance);
      const delay = groupIdx * 100; // グループごとに遅延を設定

      /**
       * 同じ距離の駒は同時に反転開始
       */
      pieces.forEach(p => {
        setTimeout(() => {
          // ViewBoardに反転開始を通知
          this.viewBoard.startFlipping(p.row, p.col, toColor);

          /**
           * 反転完了（500ms後）
           */
          setTimeout(() => {
            // ViewBoardに反転完了を通知
            this.viewBoard.completeFlipping(p.row, p.col);

            /**
             * カウントアップして全て完了したらコールバック
             */
            completedPieces++;
            if (completedPieces >= totalPieces && onComplete) {
              onComplete(p);
            }
          }, 500);
        }, delay);
      });
    });
  }

  /**
   * 最後に置いた駒の位置を設定
   * @param {number} row 行
   * @param {number} col 列
   */
  setLastPlacedPiece(row, col) {
    this.lastPlacedPiece = { row, col };
  }

  /**
   * BitBoardから初期状態を同期
   * @param {import("@/utils/bitboard/BitBoardBridge").BitBoard} bitBoard ビットボード
   */
  syncViewBoard(bitBoard) {
    this.viewBoard.syncFromBitBoard(bitBoard);
  }

  /**
   * 駒が反転中かどうかを判定
   * @param {number} row 行
   * @param {number} col 列
   * @returns {boolean} 反転中の場合true
   */
  isPieceFlipping(row, col) {
    return this.viewBoard.isFlipping(row, col);
  }

  /**
   * セルの状態を取得
   * @param {number} row 行
   * @param {number} col 列
   * @returns {object} セルの状態
   */
  getCellState(row, col) {
    return this.viewBoard.getCell(row, col);
  }

  /**
   * アニメーション状態をリセット
   */
  reset() {
    this.viewBoard.reset();
    this.lastPlacedPiece = null;
  }
}
