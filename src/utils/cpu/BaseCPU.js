// File: src/utils/cpu/BaseCPU.js
import { BitBoard } from "@/utils/bitboard/BitBoardBridge";

/*─────────────────────────────────────────────*
 *  内部 util：64bit 1 ビット→index (0–63)      *
 *─────────────────────────────────────────────*/
function bitIndex(mask) {
  const lo = Number(mask & 0xffffffffn);
  if (lo) return Math.log2(lo);
  const hi = Number(mask >> 32n);
  return 32 + Math.log2(hi);
}

/**
 * CPU プレイヤーの基底クラス
 * - 盤面シミュレーションには BitBoard.applyMove() を使用
 * - 合法手取得は legalMovesBitboard() を直接利用
 */
export class BaseCPU {
  /**
   * @param {BitBoard} bitBoard
   * @param {"black"|"white"}   color
   */
  constructor(bitBoard, color) {
    this.bitBoard = bitBoard;
    this.color    = color;
    this.oppColor = color === "black" ? "white" : "black";
  }

  /** 自ビットボードをディープコピー */
  cloneBoard() {
    const cp           = new BitBoard();
    cp.blackBoard      = this.bitBoard.blackBoard;
    cp.whiteBoard      = this.bitBoard.whiteBoard;
    return cp;
  }

  /** 合法手配列 [{row,col},…] を返す */
  getValidMoves(board = this.bitBoard, clr = this.color) {
    const movesBB = board.legalMovesBitboard(clr);
    const list = [];
    let bits   = movesBB;
    while (bits) {
      const lsb = bits & -bits;
      const idx = bitIndex(lsb);
      list.push({ row: Math.floor(idx / 8), col: idx % 8 });
      bits ^= lsb;
    }
    return list;
  }

  /** 終局判定 */
  isGameOver(board) {
    return !board.hasValidMoves("black") && !board.hasValidMoves("white");
  }

  /** 基本評価（駒差＋角） */
  evaluateBoard(board) {
    const { black, white } = board.score();
    const my   = this.color === "black" ? black : white;
    const opp  = this.color === "black" ? white : black;
    let evalPt = my - opp;

    [["black", 0, 0], ["white", 0, 7], ["white", 7, 0], ["white", 7, 7]].forEach(
      ([, r, c]) => {
        const p = board.getPiece(r, c);
        if (p === this.color) evalPt += 25;
        else if (p === this.oppColor) evalPt -= 25;
      }
    );
    return evalPt;
  }

  /* 子クラスで selectMove() を実装 */
}
