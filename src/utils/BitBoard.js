/**
 * BitBoard – 64‑bit Reversi implementation (ES2020 BigInt)
 * 0‥63 のビットを行優先でマスに対応させる
 */

const hasBigInt = typeof BigInt !== "undefined";
const ZERO = hasBigInt ? 0n : 0;
const ONE = hasBigInt ? 1n : 1;

/* 8 方向のビットインデックス差 */
const DIRECTIONS = [-9, -8, -7, -1, 1, 7, 8, 9];

/** dir → [dRow, dCol] （各 -1 / 0 / +1）*/
const vec = (dir) => {
  const dRow = Math.round(dir / 8); // -1, 0, +1
  return [dRow, dir - dRow * 8]; // 残りが dCol
};

export class BitBoard {
  constructor() {
    this.blackBoard = ZERO; // 黒石用 64 bit
    this.whiteBoard = ZERO; // 白石用 64 bit
    this.initialize();
  }

  /* ---------- 初期化 ---------- */
  initialize() {
    this.blackBoard = ZERO;
    this.whiteBoard = ZERO;

    // 中央 4 石：D5, E4 が黒 / D4, E5 が白
    this.blackBoard |= ONE << (8n * 3n + 4n); // D5 (row3,col4)
    this.blackBoard |= ONE << (8n * 4n + 3n); // E4 (row4,col3)
    this.whiteBoard |= ONE << (8n * 3n + 3n); // D4
    this.whiteBoard |= ONE << (8n * 4n + 4n); // E5
  }

  /* ---------- 汎用 ---------- */
  inBoard(pos) {
    return pos >= 0 && pos < 64;
  }

  /* ---------- 取得 API ---------- */
  getPiece(row, col) {
    const pos = 8n * BigInt(row) + BigInt(col);
    const mask = ONE << pos;
    if (this.blackBoard & mask) return "black";
    if (this.whiteBoard & mask) return "white";
    return null;
  }

  /* ---------- 移動判定 ---------- */
  canMoveInDirection(row, col, dir) {
    const [dr, dc] = vec(dir);
    const nr = row + dr;
    const nc = col + dc;
    return nr >= 0 && nr < 8 && nc >= 0 && nc < 8;
  }

  isValidMove(row, col, player) {
    if (!this.inBoard(8 * row + col) || this.getPiece(row, col)) return false;

    const isBlack = player === "black";
    const myBits = isBlack ? this.blackBoard : this.whiteBoard;
    const oppBits = isBlack ? this.whiteBoard : this.blackBoard;

    for (const dir of DIRECTIONS) {
      if (!this.canMoveInDirection(row, col, dir)) continue;

      let pos = 8n * BigInt(row) + BigInt(col) + BigInt(dir);
      let found = false;

      while (this.inBoard(pos) && this.canMoveInDirection(Number(pos / 8n), Number(pos % 8n), dir) && oppBits & (ONE << pos)) {
        found = true;
        pos += BigInt(dir);
      }

      if (found && this.inBoard(pos) && myBits & (ONE << pos)) return true;
    }
    return false;
  }

  /* ---------- 石を置く ---------- */
  placePiece(row, col, player) {
    if (!this.isValidMove(row, col, player)) return [];

    const flips = [];
    const pos0 = 8n * BigInt(row) + BigInt(col);
    const mask0 = ONE << pos0;
    const isBlack = player === "black";

    // 石を置く
    if (isBlack) this.blackBoard |= mask0;
    else this.whiteBoard |= mask0;

    for (const dir of DIRECTIONS) {
      if (!this.canMoveInDirection(row, col, dir)) continue;

      const tmp = [];
      let pos = pos0 + BigInt(dir);

      while (this.inBoard(pos) && this.canMoveInDirection(Number(pos / 8n), Number(pos % 8n), dir) && (isBlack ? this.whiteBoard : this.blackBoard) & (ONE << pos)) {
        tmp.push(pos);
        pos += BigInt(dir);
      }

      if (this.inBoard(pos) && (isBlack ? this.blackBoard : this.whiteBoard) & (ONE << pos)) {
        // 反転確定
        for (const p of tmp) {
          const m = ONE << p;
          if (isBlack) {
            this.blackBoard |= m;
            this.whiteBoard &= ~m;
          } else {
            this.whiteBoard |= m;
            this.blackBoard &= ~m;
          }
          flips.push({ row: Number(p / 8n), col: Number(p % 8n) });
        }
      }
    }
    return flips;
  }

  /* ---------- 合法手取得 / 有無 ---------- */
  getValidMoves(player) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.isValidMove(r, c, player)) moves.push({ row: r, col: c });
      }
    }
    return moves;
  }

  hasValidMoves(player) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (this.isValidMove(r, c, player)) return true;
    return false;
  }

  /* ---------- スコア ---------- */
  getScore() {
    const count = (bits) => {
      let n = 0n;
      for (let t = bits; t; t >>= 1n) n += t & 1n;
      return Number(n);
    };
    return { black: count(this.blackBoard), white: count(this.whiteBoard) };
  }

  /* ---------- その他 ---------- */
  clone() {
    const b = new BitBoard();
    b.blackBoard = this.blackBoard;
    b.whiteBoard = this.whiteBoard;
    return b;
  }
}
