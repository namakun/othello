/**
 * src/utils/cpu/AlphaBetaCPU.js
 * α-β剪定アルゴリズムを使用したCPU AI
 */
import { BaseCPU } from "./BaseCPU";

/**
 * α-β剪定による中級～上級AI
 * 探索の深さは盤面の状況に応じて動的に変更
 */
export class AlphaBetaCPU extends BaseCPU {
  /**
   * 最適な手を選択する
   * @returns {{row: number, col: number}|null} 選択された手の座標、または合法手がない場合はnull
   */
  selectMove() {
    const moves = this.getValidMoves();
    if (!moves.length) return null;

    const totalPieces = this.bitBoard.score().black + this.bitBoard.score().white;

    /**
     * 序盤はランダム性を残す（6手目まで）
     */
    if (totalPieces <= 6) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestScore = -Infinity;
    let bestMove = moves[0];

    /**
     * 終盤（40手以降）は探索深さを増やす
     */
    const depth = totalPieces >= 40 ? 6 : 3;

    for (const mv of moves) {
      const board = this.cloneBoard();
      board.applyMove(mv.row, mv.col, this.color);
      const s = this.alphaBeta(board, depth, -Infinity, Infinity, false);
      if (s > bestScore) {
        bestScore = s;
        bestMove = mv;
      }
    }
    return bestMove;
  }

  /**
   * α-β剪定アルゴリズムの本体
   * @param {BitBoard} board 評価する盤面
   * @param {number} depth 探索の深さ
   * @param {number} alpha アルファ値
   * @param {number} beta ベータ値
   * @param {boolean} maximizing 最大化プレイヤーの手番かどうか
   * @returns {number} 評価値
   */
  alphaBeta(board, depth, alpha, beta, maximizing) {
    // 葉ノードまたはゲーム終了状態に達した場合は評価
    if (depth === 0 || this.isGameOver(board)) {
      return this.evaluateBoard(board);
    }

    const clr = maximizing ? this.color : this.oppColor;
    const moves = this.getValidMoves(board, clr);

    // 合法手がない場合はパスして次の手番へ
    if (!moves.length) {
      return this.alphaBeta(board, depth - 1, alpha, beta, !maximizing);
    }

    if (maximizing) {
      let maxEval = -Infinity;
      for (const mv of moves) {
        // ボードのクローンを作成（複数のメソッド名に対応）
        const b = board.cloneBoard?.() ?? board.clone?.() ?? board;
        b.applyMove(mv.row, mv.col, clr);
        const evalVal = this.alphaBeta(b, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalVal);
        alpha = Math.max(alpha, evalVal);

        /**
         * β刈り（これ以上の探索は不要）
         */
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const mv of moves) {
        const b = board.cloneBoard?.() ?? board.clone?.() ?? board;
        b.applyMove(mv.row, mv.col, clr);
        const evalVal = this.alphaBeta(b, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalVal);
        beta = Math.min(beta, evalVal);

        /**
         * α刈り（これ以上の探索は不要）
         */
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
