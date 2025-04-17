/**
 * CPUプレイヤーの基底クラス
 * 全てのCPU実装はこのクラスを継承する
 */
export class BaseCPU {
  /**
   * コンストラクタ
   * @param {BitBoard} bitBoard - ビットボード
   * @param {string} color - CPUの色 ('black' or 'white')
   */
  constructor(bitBoard, color) {
    this.bitBoard = bitBoard;
    this.color = color;
    this.opponentColor = color === 'black' ? 'white' : 'black';
  }

  /**
   * 有効な手の一覧を取得
   * @returns {Array<{row: number, col: number}>} 有効な手の座標リスト
   */
  getValidMoves() {
    const validMoves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.bitBoard.isValidMove(row, col, this.color)) {
          validMoves.push({ row, col });
        }
      }
    }
    return validMoves;
  }

  /**
   * ゲームが終了しているかどうかを判定
   * @param {BitBoard} board - 評価するボード
   * @returns {boolean} ゲームが終了しているかどうか
   */
  isGameOver(board) {
    // 黒と白両方の有効な手がない場合、ゲーム終了
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board.isValidMove(row, col, "black") || board.isValidMove(row, col, "white")) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * ボードの基本評価を行う
   * @param {BitBoard} board - 評価するボード
   * @returns {number} 評価スコア
   */
  evaluateBoard(board) {
    const score = board.getScore();
    const myScore = this.color === 'black' ? score.black : score.white;
    const opponentScore = this.color === 'black' ? score.white : score.black;

    let evaluation = 0;

    // 基本的な評価（駒数の差）
    evaluation += myScore - opponentScore;

    // 角の評価（最も重要）
    const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
    for (const [row, col] of corners) {
      const piece = board.getPiece(row, col);
      if (piece === this.color) {
        evaluation += 25;
      } else if (piece === this.opponentColor) {
        evaluation -= 25;
      }
    }

    return evaluation;
  }

  /**
   * 次の手を選択する
   * サブクラスでオーバーライドする必要がある
   * @returns {{row: number, col: number}} 選択された手の座標
   */
  selectMove() {
    throw new Error('selectMove() must be implemented by subclass');
  }
}
