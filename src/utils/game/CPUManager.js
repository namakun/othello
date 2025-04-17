import { RandomCPU } from '../cpu/RandomCPU';
import { AlphaBetaCPU } from '../cpu/AlphaBetaCPU';
import { ReinforcementCPU } from '../cpu/ReinforcementCPU';

/**
 * CPUプレイヤーを管理するクラス
 */
export class CPUManager {
  /**
   * @param {BitBoard} bitBoard - ビットボード
   * @param {string} gameMode - ゲームモード（"cpu-weak", "cpu-normal", "cpu-strong"）
   * @param {string} playerColor - プレイヤーの色 ("black" または "white")
   */
  constructor(bitBoard, gameMode, playerColor) {
    this.bitBoard = bitBoard;
    this.gameMode = gameMode;
    this.playerColor = playerColor;
    this.cpu = this.createCPU();
  }

  /**
   * CPUインスタンスを作成
   * @returns {BaseCPU} CPUインスタンス
   * @private
   */
  createCPU() {
    // CPUはプレイヤーとは逆の色となる
    const cpuColor = this.playerColor === "black" ? "white" : "black";

    switch (this.gameMode) {
      case "cpu-weak":
        return new RandomCPU(this.bitBoard, cpuColor);
      case "cpu-normal":
        return new AlphaBetaCPU(this.bitBoard, cpuColor);
      case "cpu-strong":
        return new ReinforcementCPU(this.bitBoard, cpuColor);
      default:
        return null;
    }
  }

  /**
   * CPUの手を選択
   * @returns {Promise<{row: number, col: number}>} 選択された手の座標
   */
  async selectMove() {
    if (!this.cpu) {
      return null;
    }

    // 思考時間を演出するための遅延
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.cpu.selectMove();
  }

  /**
   * CPUの色を更新（プレイヤーの色が変更された場合）
   * @param {string} playerColor - 新しいプレイヤーの色
   */
  updatePlayerColor(playerColor) {
    this.playerColor = playerColor;
    this.cpu = this.createCPU();
  }

  /**
   * ビットボードを更新
   * @param {BitBoard} bitBoard - 新しいビットボード
   */
  updateBitBoard(bitBoard) {
    this.bitBoard = bitBoard;
    if (this.cpu) {
      this.cpu.bitBoard = bitBoard;
    }
  }
}
