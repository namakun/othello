/**
 * src/utils/cpu/ReinforcementCPU.js
 * 強化学習予定の上級AI（現状はランダム実装）
 */
import { BaseCPU } from "./BaseCPU";

/**
 * 強化学習予定の上級AI
 * 将来的に強化学習モデルを実装予定だが、現状はランダム選択
 * @todo 強化学習モデルの実装
 */
export class ReinforcementCPU extends BaseCPU {
  /**
   * 手を選択する（現状はランダム実装）
   * @returns {{row: number, col: number}|null} 選択された手の座標、または合法手がない場合はnull
   */
  selectMove() {
    const moves = this.getValidMoves();
    return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
  }
}
