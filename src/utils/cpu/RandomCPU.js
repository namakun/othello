import { BaseCPU } from './BaseCPU';

/**
 * ランダムに手を選択するCPU（弱いAI）
 */
export class RandomCPU extends BaseCPU {
  /**
   * 有効な手からランダムに1つ選択する
   * @returns {{row: number, col: number}} 選択された手の座標
   */
  selectMove() {
    const validMoves = this.getValidMoves();
    if (validMoves.length === 0) {
      return null;
    }
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
}
