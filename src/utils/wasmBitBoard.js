// File: src/utils/BitBoard.js
// ビット演算は WASM を優先し、未ロード環境では旧実装 (Legacy) を利用

import { wasm, wasmReady } from "@/utils/wasmLoader";

/* ======== 共通定数 ======== */
const hasBigInt = typeof BigInt !== "undefined";
const ZERO      = hasBigInt ? 0n : 0;
const ONE       = hasBigInt ? 1n : 1;

// 旧 JS アルゴリズムで使う定数
const DIRECTIONS = [-9, -8, -7, -1, 1, 7, 8, 9];
const vec = (dir) => { const r = Math.round(dir / 8); return [r, dir - r * 8]; };

/* ===================================================================== */
/* LegacyBitBoard  …… 旧実装そのまま                                      */
/* ===================================================================== */
class LegacyBitBoard {
  constructor() { this.blackBoard = ZERO; this.whiteBoard = ZERO; this.initialize(); }
  initialize() {
    this.blackBoard = ZERO; this.whiteBoard = ZERO;
    this.blackBoard |= ONE << (8n * 3n + 4n); // D5
    this.blackBoard |= ONE << (8n * 4n + 3n); // E4
    this.whiteBoard |= ONE << (8n * 3n + 3n); // D4
    this.whiteBoard |= ONE << (8n * 4n + 4n); // E5
  }
  inBoard(pos) { return pos >= 0 && pos < 64; }
  getPiece(row, col) {
    const pos = 8n * BigInt(row) + BigInt(col), m = ONE << pos;
    if (this.blackBoard & m) return "black";
    if (this.whiteBoard & m) return "white";
    return null;
  }
  setPiece(row, col, player) {
    const pos = 8n * BigInt(row) + BigInt(col), m = ONE << pos;
    player === "black" ? (this.blackBoard |= m) : (this.whiteBoard |= m);
  }
  flipPiece(row, col, player) {
    const pos = 8n * BigInt(row) + BigInt(col), m = ONE << pos;
    if (player === "black") { this.blackBoard |= m; this.whiteBoard &= ~m; }
    else                    { this.whiteBoard |= m; this.blackBoard &= ~m; }
  }

  /* ===== isValidMove（WASM 優先） ===== */
  isValidMove(row, col, player) {
    const pos = 8n * BigInt(row) + BigInt(col);
    if (this.getPiece(row, col)) return false;

    const isBlack = player === "black";
    const P = isBlack ? this.blackBoard : this.whiteBoard;
    const O = isBlack ? this.whiteBoard : this.blackBoard;

    // wasm がロード済みなら高速判定
    if (wasm) {
      const moves = wasm.genLegalMoves64(P, O);      // BigInt をそのまま渡せる
      return (moves & (ONE << pos)) !== ZERO;
    }

    // ───── fallback: 旧 JS アルゴリズム ─────
    for (const dir of DIRECTIONS) {
      const [dr, dc] = vec(dir);
      let r = row + dr, c = col + dc, found = false;
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && this.getPiece(r, c) === (isBlack ? "white" : "black")) {
        found = true;
        r += dr; c += dc;
      }
      if (found && r >= 0 && r < 8 && c >= 0 && c < 8 && this.getPiece(r, c) === player) return true;
    }
    return false;
  }

  /* ===== getFlipsByDirection（WASM 優先） ===== */
  getFlipsByDirection(row, col, player) {
    const groups = [];

    const isBlack = player === "black";
    const P = isBlack ? this.blackBoard : this.whiteBoard;
    const O = isBlack ? this.whiteBoard : this.blackBoard;
    const pos = 8n * BigInt(row) + BigInt(col);

    if (wasm) {
      // wasm.genFlipBitboards が返す u64[8] 配列を読み込み
      const ptr = wasm.genFlipBitboards(P, O, Number(pos));
      const view = new BigUint64Array(wasm.memory.buffer, ptr, 8);
      for (let i = 0; i < 8; i++) {
        const flips = view[i];
        if (flips === 0n) { groups.push([]); continue; }
        const arr = [];
        let bits = flips;
        while (bits) {
          const lsb = bits & -bits;
          const p   = BigInt.asUintN(64, lsb);
          const r   = Number(p / 8n), c = Number(p % 8n);
          arr.push({ row: r, col: c });
          bits ^= lsb;
        }
        groups.push(arr);
      }
      return groups;
    }

    /* ───── fallback: 旧 JS ロジック ───── */
    for (const dir of DIRECTIONS) {
      const [dr, dc] = vec(dir);
      const tmp = [];
      let r = row + dr, c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && this.getPiece(r, c) === (isBlack ? "white" : "black")) {
        tmp.push({ row: r, col: c });
        r += dr; c += dc;
      }
      if (tmp.length && r >= 0 && r < 8 && c >= 0 && c < 8 && this.getPiece(r, c) === player) {
        groups.push(tmp);
      }
    }
    return groups;
  }

  /* ===== 残りのユーティリティは変更なし ===== */
  getValidMoves(player) { const m = []; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (this.isValidMove(r, c, player)) m.push({ row: r, col: c }); return m; }
  hasValidMoves(player) { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (this.isValidMove(r, c, player)) return true; return false; }
  getScore() { const cnt = (b) => { let n = 0n; for (let t = b; t; t >>= 1n) n += t & 1n; return Number(n); }; return { black: cnt(this.blackBoard), white: cnt(this.whiteBoard) }; }
  clone() { const b = new LegacyBitBoard(); b.blackBoard = this.blackBoard; b.whiteBoard = this.whiteBoard; return b; }
}

/* wasmReady を読み込みつつ export */
export const BitBoard = LegacyBitBoard;   // 名前は従来どおり
await wasmReady.catch(() => {});          // 失敗しても Legacy で動作
