/**
 * src/utils/game/ViewBoard.js
 * UI表示専用のボード状態管理クラス
 */

/**
 * UI表示専用のボード状態管理クラス
 * 8x8のセルの状態を管理し、アニメーション情報を保持する
 * - owner（表面の色）とtarget（裏面＝反転後の色）
 * - flipping（反転アニメーション中かどうか）
 */
export class ViewBoard {
  /**
   * ViewBoardを初期化
   */
  constructor() {
    /**
     * 8x8のボードを初期化
     * 各セルは以下のプロパティを持つ
     * - owner: 表面の色 ('black'|'white'|null)
     * - target: 裏面の色 ('black'|'white'|null) - 反転中のみ設定
     * - flipping: 反転アニメーション中かどうか
     */
    this.cells = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => ({
        owner: null,
        target: null,
        flipping: false
      }))
    );
  }

  /**
   * BitBoardから初期状態を同期
   * @param {import("@/utils/bitboard/BitBoardBridge").BitBoard} bitBoard ビットボード
   */
  syncFromBitBoard(bitBoard) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        /**
         * アニメーション中のセルは更新しない
         */
        if (!this.cells[row][col].flipping) {
          this.cells[row][col].owner = bitBoard.getPiece(row, col);
          this.cells[row][col].target = null;
        }
      }
    }
  }

  /**
   * 駒の反転アニメーションを開始
   * @param {number} row 行
   * @param {number} col 列
   * @param {string} toColor 反転後の色
   */
  startFlipping(row, col, toColor) {
    const cell = this.cells[row][col];
    cell.target = toColor;
    cell.flipping = true;
  }

  /**
   * 駒の反転アニメーションを完了
   * @param {number} row 行
   * @param {number} col 列
   */
  completeFlipping(row, col) {
    const cell = this.cells[row][col];
    if (cell.flipping && cell.target) {
      cell.owner = cell.target;
      cell.target = null;
      cell.flipping = false;
    }
  }

  /**
   * 新しい駒を配置
   * @param {number} row 行
   * @param {number} col 列
   * @param {string} color 駒の色
   */
  placePiece(row, col, color) {
    this.cells[row][col].owner = color;
  }

  /**
   * セルの状態を取得
   * @param {number} row 行
   * @param {number} col 列
   * @returns {{owner: string|null, target: string|null, flipping: boolean}} セルの状態
   */
  getCell(row, col) {
    return this.cells[row][col];
  }

  /**
   * セルの表面の色を取得
   * @param {number} row 行
   * @param {number} col 列
   * @returns {string|null} 色（"black"/"white"/null）
   */
  getOwner(row, col) {
    return this.cells[row][col].owner;
  }

  /**
   * セルが反転中かどうかを判定
   * @param {number} row 行
   * @param {number} col 列
   * @returns {boolean} 反転中の場合true
   */
  isFlipping(row, col) {
    return this.cells[row][col].flipping;
  }

  /**
   * ボードの状態をリセット
   * 全てのセルを初期状態に戻す
   */
  reset() {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        this.cells[row][col].owner = null;
        this.cells[row][col].target = null;
        this.cells[row][col].flipping = false;
      }
    }
  }
}
