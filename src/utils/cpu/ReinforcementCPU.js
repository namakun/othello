import { BaseCPU } from './BaseCPU';

/**
 * 強化学習を使用するCPU（強いAI）
 * 現時点ではランダムな手を選択する実装
 * TODO: 将来的に強化学習による実装に置き換える
 */
export class ReinforcementCPU extends BaseCPU {
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
