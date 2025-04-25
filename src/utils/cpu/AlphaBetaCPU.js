// File: src/utils/cpu/AlphaBetaCPU.js
import { BaseCPU } from "./BaseCPU";

/** α-β剪定による通常 AI */
export class AlphaBetaCPU extends BaseCPU {
  selectMove() {
    const moves = this.getValidMoves();
    if (!moves.length) return null;

    const totalPieces = this.bitBoard.score().black + this.bitBoard.score().white;

    /* 序盤はランダム性を残す */
    if (totalPieces <= 6) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestScore = -Infinity;
    let bestMove  = moves[0];
    const depth   = totalPieces >= 40 ? 6 : 3;

    for (const mv of moves) {
      const board = this.cloneBoard();
      board.applyMove(mv.row, mv.col, this.color);
      const s = this.alphaBeta(board, depth, -Infinity, Infinity, false);
      if (s > bestScore) { bestScore = s; bestMove = mv; }
    }
    return bestMove;
  }

  /* α-β本体 */
  alphaBeta(board, depth, alpha, beta, maximizing) {
    if (depth === 0 || this.isGameOver(board)) {
      return this.evaluateBoard(board);
    }

    const clr = maximizing ? this.color : this.oppColor;
    const moves = this.getValidMoves(board, clr);
    if (!moves.length) {
      return this.alphaBeta(board, depth - 1, alpha, beta, !maximizing);
    }

    if (maximizing) {
      let maxEval = -Infinity;
      for (const mv of moves) {
        const b = board.cloneBoard?.() ?? board.clone?.() ?? board; // fallback
        b.applyMove(mv.row, mv.col, clr);
        const evalVal = this.alphaBeta(b, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalVal);
        alpha   = Math.max(alpha, evalVal);
        if (beta <= alpha) break;          // β刈り
      }
      return maxEval;
    } else {
      let minEval =  Infinity;
      for (const mv of moves) {
        const b = board.cloneBoard?.() ?? board.clone?.() ?? board;
        b.applyMove(mv.row, mv.col, clr);
        const evalVal = this.alphaBeta(b, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalVal);
        beta    = Math.min(beta, evalVal);
        if (beta <= alpha) break;          // α刈り
      }
      return minEval;
    }
  }
}
