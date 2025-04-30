/**
 * src/utils/cpu/RandomCPU.js
 * ランダムに手を選ぶ初級AI
 */
import { BaseCPU } from "./BaseCPU";

/**
 * ランダムに手を選ぶ初級AI
 * 合法手からランダムに一手を選択する単純な実装
 */
export class RandomCPU extends BaseCPU {
  /**
   * ランダムに手を選択する
   * @returns {{row: number, col: number}|null} 選択された手の座標、または合法手がない場合はnull
   */
  selectMove() {
    const moves = this.getValidMoves();
    return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
  }
}
