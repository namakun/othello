// File: src/utils/BitBoard.js
/**
 * BitBoard – 64‑bit Reversi implementation (ES2020 BigInt)
 * 0‥63 のビットを行優先でマスに対応させる
 */
const hasBigInt = typeof BigInt !== "undefined";
const ZERO      = hasBigInt ? 0n : 0;
const ONE       = hasBigInt ? 1n : 1;

// 8 方向のビットインデックス差
const DIRECTIONS = [-9, -8, -7, -1, 1, 7, 8, 9];

/** dir → [dRow, dCol] */
const vec = (dir) => {
  const dRow = Math.round(dir / 8);
  return [dRow, dir - dRow * 8];
};

export class BitBoard {
  constructor() {
    this.blackBoard = ZERO;
    this.whiteBoard = ZERO;
    this.initialize();
  }

  /** 初期配置 */
  initialize() {
    this.blackBoard = ZERO;
    this.whiteBoard = ZERO;
    // 中央 4 石
    this.blackBoard |= ONE << (8n * 3n + 4n); // D5
    this.blackBoard |= ONE << (8n * 4n + 3n); // E4
    this.whiteBoard |= ONE << (8n * 3n + 3n); // D4
    this.whiteBoard |= ONE << (8n * 4n + 4n); // E5
  }

  /** pos が盤内か */
  inBoard(pos) {
    return pos >= 0 && pos < 64;
  }

  /** (row,col) の石の色取得 */
  getPiece(row, col) {
    const pos  = 8n * BigInt(row) + BigInt(col);
    const mask = ONE << pos;
    if (this.blackBoard & mask) return "black";
    if (this.whiteBoard & mask) return "white";
    return null;
  }

  /** dir 方向に隣接マスがあるか */
  canMoveInDirection(row, col, dir) {
    const [dr, dc] = vec(dir);
    const nr = row + dr, nc = col + dc;
    return nr >= 0 && nr < 8 && nc >= 0 && nc < 8;
  }

  /** 合法手判定 */
  isValidMove(row, col, player) {
    if (!this.inBoard(8 * row + col) || this.getPiece(row, col)) return false;
    const isBlack = player === "black";
    const myBits  = isBlack ? this.blackBoard : this.whiteBoard;
    const opBits  = isBlack ? this.whiteBoard : this.blackBoard;

    for (const dir of DIRECTIONS) {
      if (!this.canMoveInDirection(row, col, dir)) continue;
      let pos   = 8n * BigInt(row) + BigInt(col) + BigInt(dir);
      let found = false;
      while (
        this.inBoard(pos) &&
        this.canMoveInDirection(Number(pos / 8n), Number(pos % 8n), dir) &&
        (opBits & (ONE << pos))
      ) {
        found = true;
        pos += BigInt(dir);
      }
      if (found && this.inBoard(pos) && (myBits & (ONE << pos))) {
        return true;
      }
    }
    return false;
  }


  /**
   * 反転すべき位置を「方向ごと」にグループ化して取得
   * @returns Array<Array<{row:number,col:number}>>
   */
  getFlipsByDirection(row, col, player) {
    const groups   = [];
    const isBlack  = player === "black";
    const opBits   = isBlack ? this.whiteBoard : this.blackBoard;
    const myBits   = isBlack ? this.blackBoard : this.whiteBoard;

    for (const dir of DIRECTIONS) {
      if (!this.canMoveInDirection(row, col, dir)) continue;
      const tmp = [];
      let pos = 8n * BigInt(row) + BigInt(col) + BigInt(dir);
      while (
        this.inBoard(pos) &&
        this.canMoveInDirection(Number(pos / 8n), Number(pos % 8n), dir) &&
        (opBits & (ONE << pos))
      ) {
        tmp.push(pos);
        pos += BigInt(dir);
      }
      if (this.inBoard(pos) && (myBits & (ONE << pos))) {
        groups.push(
          tmp.map((p) => ({
            row: Number(p / 8n),
            col: Number(p % 8n)
          }))
        );
      }
    }
    return groups;
  }

  /** 新規に置かれたコマをボードに即時反映 */
  setPiece(row, col, player) {
    const pos = 8n * BigInt(row) + BigInt(col);
    const m   = ONE << pos;
    if (player === "black") this.blackBoard |= m;
    else                     this.whiteBoard |= m;
  }

  /** １つの駒を反転してボード更新 */
  flipPiece(row, col, player) {
    const pos = 8n * BigInt(row) + BigInt(col);
    const m   = ONE << pos;
    if (player === "black") {
      this.blackBoard |= m;
      this.whiteBoard &= ~m;
    } else {
      this.whiteBoard |= m;
      this.blackBoard &= ~m;
    }
  }

  /** 合法手リスト */
  getValidMoves(player) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.isValidMove(r, c, player)) moves.push({ row: r, col: c });
      }
    }
    return moves;
  }

  /** 合法手の有無 */
  hasValidMoves(player) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.isValidMove(r, c, player)) return true;
      }
    }
    return false;
  }

  /** スコア計算 */
  getScore() {
    const count = (bits) => {
      let n = 0n;
      for (let t = bits; t; t >>= 1n) n += t & 1n;
      return Number(n);
    };
    return { black: count(this.blackBoard), white: count(this.whiteBoard) };
  }

  /** 複製 */
  clone() {
    const b = new BitBoard();
    b.blackBoard = this.blackBoard;
    b.whiteBoard = this.whiteBoard;
    return b;
  }
}
