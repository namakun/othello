/**
 * ビットボードを使用したオセロゲームのロジック
 * 黒と白の駒の状態をそれぞれ64ビットの整数で表現
 *
 * @note BigIntを使用するため、ES2020以降の環境が必要
 */

// BigIntが利用可能かチェック
const hasBigInt = typeof BigInt !== 'undefined';

// BigInt変換のヘルパー関数
const toBigInt = (num) => hasBigInt ? BigInt(num) : num;
const fromBigInt = (bigNum) => hasBigInt ? Number(bigNum) : bigNum;

// 定数
const ZERO_BIG = hasBigInt ? BigInt(0) : 0;
const ONE_BIG = hasBigInt ? BigInt(1) : 1;

// 方向の定義
const DIRECTIONS = {
  NORTHWEST: -9,  // 左上
  NORTH: -8,      // 上
  NORTHEAST: -7,  // 右上
  WEST: -1,       // 左
  EAST: 1,        // 右
  SOUTHWEST: 7,   // 左下
  SOUTH: 8,       // 下
  SOUTHEAST: 9    // 右下
};

export class BitBoard {
  constructor() {
    // 初期状態の設定
    this.blackBoard = toBigInt(0);  // 黒の駒の位置
    this.whiteBoard = toBigInt(0);  // 白の駒の位置
    this.initialize();
  }

  /**
   * 盤面を初期状態に設定
   */
  initialize() {
    // 中央の4マスに初期配置
    this.blackBoard = toBigInt(0);
    this.whiteBoard = toBigInt(0);

    // D5とE4に黒を配置 (0-based indexで3,4と4,3)
    this.blackBoard |= toBigInt(1) << toBigInt(8 * 3 + 4);  // D5
    this.blackBoard |= toBigInt(1) << toBigInt(8 * 4 + 3);  // E4

    // D4とE5に白を配置 (0-based indexで3,3と4,4)
    this.whiteBoard |= toBigInt(1) << toBigInt(8 * 3 + 3);  // D4
    this.whiteBoard |= toBigInt(1) << toBigInt(8 * 4 + 4);  // E5
  }

  /**
   * 指定した位置に駒があるかチェック
   * @param {number} row - 行（0-7）
   * @param {number} col - 列（0-7）
   * @returns {string|null} 駒の色（'black'/'white'）または null
   */
  getPiece(row, col) {
    const pos = toBigInt(row * 8 + col);
    const mask = toBigInt(1) << pos;

    if ((this.blackBoard & mask) !== ZERO_BIG) return 'black';
    if ((this.whiteBoard & mask) !== ZERO_BIG) return 'white';
    return null;
  }

  /**
   * 指定した位置が盤面内かつ、指定した方向に移動可能かチェック
   * @param {number} row - 現在の行
   * @param {number} col - 現在の列
   * @param {number} dir - 方向
   * @returns {boolean} 移動可能かどうか
   */
  canMoveInDirection(row, col, dir) {
    const rowDelta = Math.floor(dir / 8);
    const colDelta = dir % 8;
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;
    return nextRow >= 0 && nextRow < 8 && nextCol >= 0 && nextCol < 8;
  }

  /**
   * 指定した位置に駒を置けるかチェック
   * @param {number} row - 行（0-7）
   * @param {number} col - 列（0-7）
   * @param {string} player - 駒を置くプレイヤーの色 ("black" または "white")
   * @returns {boolean} 置けるかどうか
   */
  isValidMove(row, col, player) {
    // 盤面外チェック
    if (row < 0 || row >= 8 || col < 0 || col >= 8) {
      return false;
    }

    const pos = toBigInt(row * 8 + col);
    const mask = toBigInt(1) << pos;

    // 既に駒がある場所には置けない
    if (((this.blackBoard | this.whiteBoard) & mask) !== ZERO_BIG) {
      return false;
    }

    const isBlack = (player === "black");
    const myBoard = isBlack ? this.blackBoard : this.whiteBoard;
    const oppBoard = isBlack ? this.whiteBoard : this.blackBoard;

    // 各方向をチェック
    for (const dir of Object.values(DIRECTIONS)) {
      if (!this.canMoveInDirection(row, col, dir)) {
        continue;
      }

      let current = pos + toBigInt(dir);
      let hasOpp = false;

      // ボード内で、かつ隣が相手の駒である限り続ける
      while (this.isValidPosition(current) &&
             this.canMoveInDirection(fromBigInt(current / toBigInt(8)), fromBigInt(current % toBigInt(8)), dir) &&
             ((oppBoard & (ONE_BIG << current)) !== ZERO_BIG)) {
        hasOpp = true;
        current += toBigInt(dir);
      }

      // 最後に自分の駒があり、途中に相手の駒があれば有効な手
      if (hasOpp &&
          this.isValidPosition(current) &&
          ((myBoard & (ONE_BIG << current)) !== ZERO_BIG)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 指定した位置が盤面内かチェック
   * @param {BigInt} pos - ビット位置
   * @returns {boolean} 盤面内かどうか
   */
  isValidPosition(pos) {
    return pos >= 0 && pos < 64;
  }

  /**
   * 駒を置いて反転処理を行う
   * @param {number} row - 行（0-7）
   * @param {number} col - 列（0-7）
   * @param {string} player - 駒を置くプレイヤーの色 ("black" または "white")
   * @returns {Array} 反転した駒の位置の配列 [{row, col}]
   */
  placePiece(row, col, player) {
    // 有効な手かチェック
    if (!this.isValidMove(row, col, player)) {
      return [];
    }

    const pos = toBigInt(row * 8 + col);
    const mask = toBigInt(1) << pos;
    const flipped = [];

    const isBlack = (player === "black");
    const myBoard = isBlack ? this.blackBoard : this.whiteBoard;
    const oppBoard = isBlack ? this.whiteBoard : this.blackBoard;

    // 置く位置を自分の色にする
    if (isBlack) {
      this.blackBoard |= mask;
    } else {
      this.whiteBoard |= mask;
    }

    // 各方向をチェック
    for (const dir of Object.values(DIRECTIONS)) {
      if (!this.canMoveInDirection(row, col, dir)) {
        continue;
      }

      let current = pos + toBigInt(dir);
      const tempFlipped = [];

      // ボード内で、かつ隣が相手の駒である限り続ける
      while (this.isValidPosition(current) &&
             this.canMoveInDirection(fromBigInt(current / toBigInt(8)), fromBigInt(current % toBigInt(8)), dir) &&
             ((oppBoard & (ONE_BIG << current)) !== ZERO_BIG)) {
        tempFlipped.push({
          row: fromBigInt(current / toBigInt(8)),
          col: fromBigInt(current % toBigInt(8))
        });
        current += toBigInt(dir);
      }

      // 最後に自分の駒があれば反転確定
      if (this.isValidPosition(current) &&
          ((myBoard & (ONE_BIG << current)) !== ZERO_BIG)) {
        for (const flip of tempFlipped) {
          const flipPos = toBigInt(flip.row * 8 + flip.col);
          const flipMask = toBigInt(1) << flipPos;

          if (isBlack) {
            this.blackBoard |= flipMask;
            this.whiteBoard &= ~flipMask;
          } else {
            this.whiteBoard |= flipMask;
            this.blackBoard &= ~flipMask;
          }
          flipped.push(flip);
        }
      }
    }

    return flipped;
  }

  /**
   * 有効な手があるかチェック
   * @param {string} player - 駒を置くプレイヤーの色 ("black" または "white")
   * @returns {boolean} 有効な手があるかどうか
   */
  hasValidMoves(player) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.isValidMove(row, col, player)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 各色の駒の数を取得
   * @returns {{black: number, white: number}} 各色の駒の数
   */
  getScore() {
    const countBits = (board) => {
      let count = toBigInt(0);
      let temp = board;
      while (temp) {
        count += temp & ONE_BIG;
        temp >>= ONE_BIG;
      }
      return fromBigInt(count);
    };

    return {
      black: countBits(this.blackBoard),
      white: countBits(this.whiteBoard)
    };
  }

  /**
   * ボードの状態をクローン
   * @returns {BitBoard} 新しいBitBoardインスタンス
   */
  clone() {
    const newBoard = new BitBoard();
    newBoard.blackBoard = this.blackBoard;
    newBoard.whiteBoard = this.whiteBoard;
    return newBoard;
  }
}
