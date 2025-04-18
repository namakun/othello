import { BaseCPU } from './BaseCPU';

/**
 * α-β剪定を使用するCPU（普通のAI）
 */
export class AlphaBetaCPU extends BaseCPU {
  /**
   * α-β剪定を使用して最適な手を選択する
   * @returns {{row: number, col: number}} 選択された手の座標
   */
  selectMove() {
    try {
      const validMoves = this.getValidMoves();
      if (validMoves.length === 0) {
        return null;
      }

      // 序盤（最初の数手）はランダムに選択
      const totalPieces = this.bitBoard.getScore().black + this.bitBoard.getScore().white;
      if (totalPieces <= 6) {
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        return validMoves[randomIndex];
      }

      let bestScore = -Infinity;
      let bestMove = validMoves[0];

      // 探索深度を盤面の状況に応じて調整
      const depth = totalPieces >= 40 ? 6 : 3;

      for (const move of validMoves) {
        const tempBoard = this.bitBoard.clone();
        tempBoard.placePiece(move.row, move.col, this.color);

        const score = this.alphaBeta(tempBoard, depth, -Infinity, Infinity, false);

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      return bestMove;
    } catch (error) {
      console.error('Error in selectMove:', error);
      // エラーが発生した場合はランダムな手を返す
      const validMoves = this.getValidMoves();
      if (validMoves.length > 0) {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
      }
      return null;
    }
  }

  /**
   * α-β剪定アルゴリズム
   * @param {BitBoard} board - 評価するボード
   * @param {number} depth - 探索の深さ
   * @param {number} alpha - α値
   * @param {number} beta - β値
   * @param {boolean} isMaximizingPlayer - 最大化プレイヤーかどうか
   * @returns {number} 評価スコア
   */
  alphaBeta(board, depth, alpha, beta, isMaximizingPlayer) {
    // 深さ0または終局状態の場合、現在の状態を評価
    if (depth === 0 || this.isGameOver(board)) {
      return this.evaluateBoard(board);
    }

    // 現在のターンの色（自分の手番なら自分の色、相手の手番なら相手の色）
    const opponentColor = this.color === 'black' ? 'white' : 'black';
    const currentColor = isMaximizingPlayer ? this.color : opponentColor;

    // 有効な手を取得 (currentColor を渡す)
    const validMoves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board.isValidMove(row, col, currentColor)) {
          validMoves.push({ row, col });
        }
      }
    }

    // 有効な手がない場合、パスして相手の手番を評価
    if (validMoves.length === 0) {
      return this.alphaBeta(board, depth - 1, alpha, beta, !isMaximizingPlayer);
    }

    if (isMaximizingPlayer) {
      let maxEval = -Infinity;
      for (const move of validMoves) {
        const tempBoard = board.clone();
        tempBoard.placePiece(move.row, move.col, currentColor);
        const evaluation = this.alphaBeta(tempBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) {
          break; // β刈り
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of validMoves) {
        const tempBoard = board.clone();
        tempBoard.placePiece(move.row, move.col, currentColor);
        const evaluation = this.alphaBeta(tempBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) {
          break; // α刈り
        }
      }
      return minEval;
    }
  }

  /**
   * ボードの状態を評価する（基本評価に加えて追加の評価を行う）
   * @param {BitBoard} board - 評価するボード
   * @returns {number} 評価スコア
   */
  evaluateBoard(board) {
    // 基本評価を取得
    let evaluation = super.evaluateBoard(board);

    const score = board.getScore();
    const myScore = this.color === 'black' ? score.black : score.white;
    const opponentScore = this.color === 'black' ? score.white : score.black;
    const totalPieces = myScore + opponentScore;

    // 辺の評価を追加
    for (let i = 2; i <= 5; i++) {
      const edges = [[0, i], [7, i], [i, 0], [i, 7]];
      for (const [row, col] of edges) {
        const piece = board.getPiece(row, col);
        if (piece === this.color) {
          evaluation += 5;
        } else if (piece === this.opponentColor) {
          evaluation -= 5;
        }
      }
    }

    // 終盤は駒数をより重視
    if (totalPieces >= 50) {
      evaluation += (myScore - opponentScore) * 2;
    }

    return evaluation;
  }
}
