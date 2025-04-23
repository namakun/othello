// src/utils/wasmBitBoard.js
import { wasm, wasmReady } from "@/utils/wasmLoader";

// === 共通定数 ===
const ZERO = 0n;
const ONE = 1n;
const OFFSETS = [8, -8, 1, -1, 9, 7, -7, -9];

// 1ビットマスク → 0…63 index 取得 (O(1))
function bitIndex(mask) {
  // 下位32bit 部分
  const lo = Number(mask & 0xffffffffn);
  if (lo) return Math.log2(lo);
  // 上位32bit
  const hi = Number(mask >> 32n);
  return 32 + Math.log2(hi);
}

class WasmBitBoard {
  constructor() {
    this.blackBoard = ZERO;
    this.whiteBoard = ZERO;
    this.initialize();
  }

  /** 初期配置 */
  initialize() {
    this.blackBoard = (ONE << (8n * 3n + 4n)) | (ONE << (8n * 4n + 3n));
    this.whiteBoard = (ONE << (8n * 3n + 3n)) | (ONE << (8n * 4n + 4n));
  }

  /** (row,col) の色取得 */
  getPiece(row, col) {
    const pos = 8n * BigInt(row) + BigInt(col);
    const m = ONE << pos;
    if (this.blackBoard & m) return "black";
    if (this.whiteBoard & m) return "white";
    return null;
  }

  /** 新規石セット */
  setPiece(row, col, player) {
    const pos = 8n * BigInt(row) + BigInt(col);
    const m = ONE << pos;
    if (player === "black") this.blackBoard |= m;
    else this.whiteBoard |= m;
  }

  /** 石反転 */
  flipPiece(row, col, player) {
    const pos = 8n * BigInt(row) + BigInt(col);
    const m = ONE << pos;
    if (player === "black") {
      this.blackBoard |= m;
      this.whiteBoard &= ~m;
    } else {
      this.whiteBoard |= m;
      this.blackBoard &= ~m;
    }
  }

  /** 合法手判定 */
  isValidMove(row, col, player) {
    const pos = BigInt(row * 8 + col);
    const moves = this.getLegalMovesBitboard(player);
    return (moves & (ONE << pos)) !== 0n;
  }

  /** 合法手ビットボード取得 */
  getLegalMovesBitboard(player) {
    const P = player === "black" ? this.blackBoard : this.whiteBoard;
    const O = player === "black" ? this.whiteBoard : this.blackBoard;
    return wasm.gen_legal_moves(P, O);
  }

  /** 合法手リスト取得 */
  getValidMoves(player) {
    const moves = [];
    let bits = this.getLegalMovesBitboard(player);
    while (bits) {
      const lsb = bits & -bits;
      const idx = bitIndex(lsb);
      moves.push({ row: Math.floor(idx / 8), col: idx % 8 });
      bits ^= lsb;
    }
    return moves;
  }

  /** 反転グループ取得 */
  getFlipsByDirection(row, col, player) {
    // 1) WASM にお願いして 8要素の u64 Vec を取得
    const P = player === "black" ? this.blackBoard : this.whiteBoard;
    const O = player === "black" ? this.whiteBoard : this.blackBoard;
    let flipsVec = wasm.gen_flip_bitboards(P, O, row * 8 + col);
    // 2) BigUint64Array なら普通の JS Array に変換
    if (!Array.isArray(flipsVec)) {
      flipsVec = Array.from(flipsVec);
    }

    const groups = [];
    // 3) 各方向について「ビット列を step ずつスキャン」
    for (let i = 0; i < 8; i++) {
      const flips = flipsVec[i]; // BigInt のビット列
      const group = [];
      const d = OFFSETS[i];
      // スキャン開始位置 (置いた場所の idx)
      let idx = row * 8 + col;
      // 最大 6 ステップ or 途中 break
      for (let step = 0; step < 6; step++) {
        idx += d;
        // 盤外判定
        if (idx < 0 || idx >= 64) break;
        // その位置に反転ビットが立っていれば追加、なければ終了
        if (((flips >> BigInt(idx)) & 1n) === 1n) {
          group.push({ row: Math.floor(idx / 8), col: idx % 8 });
        } else {
          break;
        }
      }
      if (group.length) {
        groups.push(group);
      }
    }
    return groups;
  }

  /** 着手適用（一括版） */
  applyMove(row, col, player) {
    const pos = row * 8 + col;
    const isBlack = player === "black";
    // 先手 or 後手で P/O を切り替え
    const P = isBlack ? this.blackBoard : this.whiteBoard;
    const O = isBlack ? this.whiteBoard : this.blackBoard;
    // １回の呼び出しで [P',O'] が返る
    const [newP, newO] = wasm.apply_move(P, O, pos);
    // 結果を対応するボードに書き戻し
    if (isBlack) {
      this.blackBoard = newP;
      this.whiteBoard = newO;
    } else {
      this.whiteBoard = newP;
      this.blackBoard = newO;
    }
  }

  /** スコア取得 */
  getScore() {
    return {
      black: Number(wasm.popcnt64(this.blackBoard)),
      white: Number(wasm.popcnt64(this.whiteBoard)),
    };
  }

  /** 合法手有無 */
  hasValidMoves(player) {
    return this.getLegalMovesBitboard(player) !== 0n;
  }
}

// wasm モジュール読み込み待ち & export
await wasmReady.catch(() => {});
export const BitBoard = WasmBitBoard;
