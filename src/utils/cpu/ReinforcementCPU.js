// File: src/utils/cpu/ReinforcementCPU.js
import { BaseCPU } from "./BaseCPU";

/** todo 強化学習予定 AI（暫定ランダム） */
export class ReinforcementCPU extends BaseCPU {
  selectMove() {
    const moves = this.getValidMoves();
    return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
  }
}
