// File: src/utils/game/ViewBoard.js

/**
 * UI表示専用のボード状態管理クラス
 * - 8x8のセルをrefで保持
 * - owner（表面の色）とtarget（裏面＝反転後の色）＋ui状態（flipping/angle）を管理
 */
export class ViewBoard {
  constructor() {
    // 8x8のボードを初期化
    this.cells = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => ({
        owner: null,    // 表面の色 ('black'|'white'|null)
        target: null,   // 裏面の色 ('black'|'white'|null) - 反転中のみ設定
        flipping: false // 反転アニメーション中かどうか
      }))
    );
  }

  /**
   * BitBoardから初期状態を同期
   * @param {import("@/utils/bitboard/BitBoardBridge").BitBoard} bitBoard
   */
  syncFromBitBoard(bitBoard) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // アニメーション中のセルは更新しない
        if (!this.cells[row][col].flipping) {
          this.cells[row][col].owner = bitBoard.getPiece(row, col);
          this.cells[row][col].target = null;
        }
      }
    }
  }

  /**
   * 駒の反転アニメーションを開始
   * @param {number} row
   * @param {number} col
   * @param {string} toColor 反転後の色
   */
  startFlipping(row, col, toColor) {
    const cell = this.cells[row][col];
    cell.target = toColor;
    cell.flipping = true;
  }

  /**
   * 駒の反転アニメーションを完了
   * @param {number} row
   * @param {number} col
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
   * @param {number} row
   * @param {number} col
   * @param {string} color
   */
  placePiece(row, col, color) {
    this.cells[row][col].owner = color;
  }

  /**
   * セルの状態を取得
   * @param {number} row
   * @param {number} col
   * @returns {object} セルの状態
   */
  getCell(row, col) {
    return this.cells[row][col];
  }

  /**
   * セルの表面の色を取得
   * @param {number} row
   * @param {number} col
   * @returns {string|null} 色
   */
  getOwner(row, col) {
    return this.cells[row][col].owner;
  }

  /**
   * セルが反転中かどうか
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  isFlipping(row, col) {
    return this.cells[row][col].flipping;
  }

  /**
   * リセット
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
