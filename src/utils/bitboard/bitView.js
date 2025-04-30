/**
 * src/utils/bitboard/bitView.js
 * ビットボードのインデックスと座標変換を担当するヘルパー関数群
 */

/**
 * ビットボードのインデックスを行列座標に変換
 * @param {number} idx ビットボードのインデックス（0-63）
 * @returns {{row: number, col: number}} 行列座標
 */
export function toRowCol(idx) {
  return { row: idx >> 3, col: idx & 7 };
}

/**
 * インデックス配列を行列座標配列に変換
 * @param {number[]} idxs インデックス配列
 * @returns {Array<{row: number, col: number}>} 行列座標配列
 */
export function indicesToRowCols(idxs) {
  return idxs.map(toRowCol);
}

/**
 * 反転グループ配列を行列座標グループ配列に変換
 * @param {number[][]} groups 反転グループ配列
 * @returns {Array<Array<{row: number, col: number}>>} 行列座標グループ配列
 */
export function groupsToRowCols(groups) {
  return groups.map(g => indicesToRowCols(g));
}
