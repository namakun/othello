// Bridge: 「ビット演算のみ」を担当
import { wasm, wasmReady } from "@/utils/wasmLoader";

const ZERO = 0n;
const ONE = 1n;

/*───────────────────────────────*
 *  BitBoardBridge                *
 *───────────────────────────────*/
class BitBoardBridge {
  constructor() {
    this.blackBoard = ZERO;
    this.whiteBoard = ZERO;
    this._initStartPos();
  }

  /* 初期配置 ---------------------------------------------------- */
  _initStartPos() {
    this.blackBoard = (ONE << (8n * 3n + 4n)) | (ONE << (8n * 4n + 3n));
    this.whiteBoard = (ONE << (8n * 3n + 3n)) | (ONE << (8n * 4n + 4n));
  }

  initialize() {
    this._initStartPos();
  }

  /** (row,col) の石色を返す : "black" | "white" | null */
  getPiece(row, col) {
    const pos = 8n * BigInt(row) + BigInt(col);
    const mask = 1n << pos;
    if (this.blackBoard & mask) return "black";
    if (this.whiteBoard & mask) return "white";
    return null;
  }

  /* 合法手 (bitboard) ------------------------------------------ */
  legalMovesBitboard(player) {
    const P = player === "black" ? this.blackBoard : this.whiteBoard;
    const O = player === "black" ? this.whiteBoard : this.blackBoard;
    return wasm.gen_legal_moves(P, O);
  }

  /* 合法手 (index 配列) ---------------------------------------- */
  legalMoveIndices(player) {
    const moves = this.legalMovesBitboard(player);
    const list = [];
    let bits = moves;
    while (bits) {
      const lsb = bits & -bits;
      // BigInt→Number 化は下位32/上位32 に分割して安全に
      const lo = Number(lsb & 0xffffffffn);
      const idx = lo ? Math.log2(lo) : 32 + Math.log2(Number(lsb >> 32n));
      list.push(idx);
      bits ^= lsb;
    }
    return list;
  }

  /* 反転グループ (index[][]) ----------------------------------- */
  flipGroups(row, col, player) {
    const pos = row * 8 + col;
    const P = player === "black" ? this.blackBoard : this.whiteBoard;
    const O = player === "black" ? this.whiteBoard : this.blackBoard;
    // Rust 側から Array<Uint8Array> が返る
    const groups = wasm.gen_flip_groups(P, O, pos);
    return Array.from(groups, (g) => Array.from(g));
  }

  /* 着手適用 ---------------------------------------------------- */
  applyMove(row, col, player) {
    const pos = row * 8 + col;
    const isBlack = player === "black";
    const P = isBlack ? this.blackBoard : this.whiteBoard;
    const O = isBlack ? this.whiteBoard : this.blackBoard;

    const [newP, newO] = wasm.apply_move(P, O, pos);
    if (isBlack) {
      this.blackBoard = newP;
      this.whiteBoard = newO;
    } else {
      this.whiteBoard = newP;
      this.blackBoard = newO;
    }
  }

  /* スコア ------------------------------------------------------ */
  score() {
    return {
      black: Number(wasm.popcnt64(this.blackBoard)),
      white: Number(wasm.popcnt64(this.whiteBoard)),
    };
  }

  /* 合法手有無 -------------------------------------------------- */
  hasValidMoves(player) {
    return this.legalMovesBitboard(player) !== 0n;
  }
}

/* wasm 初期化待ち → export */
await wasmReady.catch(() => {});
export const BitBoard = BitBoardBridge;
