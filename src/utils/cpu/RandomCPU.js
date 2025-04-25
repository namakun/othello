// File: src/utils/cpu/RandomCPU.js
import { BaseCPU } from "./BaseCPU";

/** ランダムに手を選ぶ弱 AI */
export class RandomCPU extends BaseCPU {
  selectMove() {
    const moves = this.getValidMoves();
    return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
  }
}
