/**
 * src/utils/bitboard/BitBoardBridge.js
 * ビット演算のみを担当するブリッジクラス
 */
import { wasm, wasmReady } from "@/utils/wasmLoader";

const ZERO = 0n;
const ONE = 1n;

/**
 * ビットボードを管理するクラス
 * 黒と白の石の配置をビットボードとして管理し、Wasmモジュールと連携する
 */
class BitBoardBridge {
  /**
   * コンストラクタ
   * ビットボードを初期化する
   */
  constructor() {
    this.blackBoard = ZERO;
    this.whiteBoard = ZERO;
    this._initStartPos();
  }

  /**
   * 初期配置を設定する
   * オセロの初期配置（中央に黒白が交差）を設定
   * @private
   */
  _initStartPos() {
    this.blackBoard = (ONE << (8n * 3n + 4n)) | (ONE << (8n * 4n + 3n));
    this.whiteBoard = (ONE << (8n * 3n + 3n)) | (ONE << (8n * 4n + 4n));
  }

  /**
   * ビットボードを初期状態にリセットする
   */
  initialize() {
    this._initStartPos();
  }

  /**
   * 指定位置の石の色を返す
   * @param {number} row 行
   * @param {number} col 列
   * @returns {"black"|"white"|null} 石の色、または空の場合はnull
   */
  getPiece(row, col) {
    const pos = 8n * BigInt(row) + BigInt(col);
    const mask = 1n << pos;
    if (this.blackBoard & mask) return "black";
    if (this.whiteBoard & mask) return "white";
    return null;
  }

  /**
   * 合法手をビットボードとして取得
   * @param {string} player プレイヤー色（"black"または"white"）
   * @returns {bigint} 合法手を表すビットボード
   */
  legalMovesBitboard(player) {
    const P = player === "black" ? this.blackBoard : this.whiteBoard;
    const O = player === "black" ? this.whiteBoard : this.blackBoard;
    return wasm.gen_legal_moves(P, O);
  }

  /**
   * 合法手をインデックス配列として取得
   * @param {string} player プレイヤー色（"black"または"white"）
   * @returns {number[]} 合法手のインデックス配列
   */
  legalMoveIndices(player) {
    const moves = this.legalMovesBitboard(player);
    const list = [];
    let bits = moves;
    while (bits) {
      const lsb = bits & -bits;

      /**
       * BigInt→Number 化は下位32/上位32 に分割して安全に変換
       */
      const lo = Number(lsb & 0xffffffffn);
      const idx = lo ? Math.log2(lo) : 32 + Math.log2(Number(lsb >> 32n));
      list.push(idx);
      bits ^= lsb;
    }
    return list;
  }

  /**
   * 反転グループを取得
   * @param {number} row 行
   * @param {number} col 列
   * @param {string} player プレイヤー色（"black"または"white"）
   * @returns {number[][]} 反転するグループの配列
   */
  flipGroups(row, col, player) {
    const pos = row * 8 + col;
    const P = player === "black" ? this.blackBoard : this.whiteBoard;
    const O = player === "black" ? this.whiteBoard : this.blackBoard;

    /**
     * Rust側からArray<Uint8Array>が返る
     */
    const groups = wasm.gen_flip_groups(P, O, pos);
    return Array.from(groups, (g) => Array.from(g));
  }

  /**
   * 着手を適用する
   * @param {number} row 行
   * @param {number} col 列
   * @param {string} player プレイヤー色（"black"または"white"）
   */
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

  /**
   * 現在のスコアを取得
   * @returns {{black: number, white: number}} 黒と白の石数
   */
  score() {
    return {
      black: Number(wasm.popcnt64(this.blackBoard)),
      white: Number(wasm.popcnt64(this.whiteBoard)),
    };
  }

  /**
   * 指定プレイヤーの合法手があるかどうかを判定
   * @param {string} player プレイヤー色（"black"または"white"）
   * @returns {boolean} 合法手がある場合はtrue
   */
  hasValidMoves(player) {
    return this.legalMovesBitboard(player) !== 0n;
  }
}

/**
 * Wasmモジュールの初期化を待ってからエクスポート
 */
await wasmReady.catch(() => {});
export const BitBoard = BitBoardBridge;
