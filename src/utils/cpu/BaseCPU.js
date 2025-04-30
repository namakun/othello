/**
 * src/utils/cpu/BaseCPU.js
 * CPU AIの基底クラス
 */
import { BitBoard } from "@/utils/bitboard/BitBoardBridge";

/**
 * 64bit整数の1ビットのインデックス（0-63）を取得する内部ユーティリティ関数
 * @param {bigint} mask 1ビットだけが立っているビットマスク
 * @returns {number} ビットのインデックス（0-63）
 * @private
 */
function bitIndex(mask) {
  const lo = Number(mask & 0xffffffffn);
  if (lo) return Math.log2(lo);
  const hi = Number(mask >> 32n);
  return 32 + Math.log2(hi);
}

/**
 * CPU プレイヤーの基底クラス
 * 盤面シミュレーションには BitBoard.applyMove() を使用
 * 合法手取得は legalMovesBitboard() を直接利用
 */
export class BaseCPU {
  /**
   * CPUプレイヤーを初期化
   * @param {BitBoard} bitBoard ビットボード
   * @param {"black"|"white"} color CPUの色
   */
  constructor(bitBoard, color) {
    this.bitBoard = bitBoard;
    this.color = color;
    this.oppColor = color === "black" ? "white" : "black";
  }

  /**
   * 現在のビットボードをディープコピー
   * @returns {BitBoard} コピーされたビットボード
   */
  cloneBoard() {
    const cp = new BitBoard();
    cp.blackBoard = this.bitBoard.blackBoard;
    cp.whiteBoard = this.bitBoard.whiteBoard;
    return cp;
  }

  /**
   * 合法手配列を取得
   * @param {BitBoard} board ビットボード（デフォルトは自身のボード）
   * @param {string} clr 色（デフォルトは自身の色）
   * @returns {{row: number, col: number}[]} 合法手の座標配列
   */
  getValidMoves(board = this.bitBoard, clr = this.color) {
    const movesBB = board.legalMovesBitboard(clr);
    const list = [];
    let bits = movesBB;
    while (bits) {
      const lsb = bits & -bits;
      const idx = bitIndex(lsb);
      list.push({ row: Math.floor(idx / 8), col: idx % 8 });
      bits ^= lsb;
    }
    return list;
  }

  /**
   * 終局判定
   * @param {BitBoard} board ビットボード
   * @returns {boolean} ゲームが終了している場合true
   */
  isGameOver(board) {
    return !board.hasValidMoves("black") && !board.hasValidMoves("white");
  }

  /**
   * 基本評価関数（駒差＋角の評価）
   * @param {BitBoard} board ビットボード
   * @returns {number} 評価値（大きいほどCPUに有利）
   */
  evaluateBoard(board) {
    const { black, white } = board.score();
    const my = this.color === "black" ? black : white;
    const opp = this.color === "black" ? white : black;
    let evalPt = my - opp;

    // 角の評価（角を取ると25ポイント）
    [["black", 0, 0], ["white", 0, 7], ["white", 7, 0], ["white", 7, 7]].forEach(
      ([, r, c]) => {
        const p = board.getPiece(r, c);
        if (p === this.color) evalPt += 25;
        else if (p === this.oppColor) evalPt -= 25;
      }
    );
    return evalPt;
  }

  /**
   * 手を選択する（子クラスで実装）
   * @returns {{row: number, col: number}} 選択された手の座標
   */
  selectMove() {
    throw new Error("子クラスで実装する必要があります");
  }
}
