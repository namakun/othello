/**
 * src/utils/game/CPUManager.js
 * CPUプレイヤーの生成と管理を担当するクラス
 */
import { RandomCPU } from '../cpu/RandomCPU';
import { AlphaBetaCPU } from '../cpu/AlphaBetaCPU';
import { WeakestCPU } from '../cpu/WeakestCPU';

/**
 * CPUプレイヤーを管理するクラス
 * ゲームモードに応じた適切なCPUインスタンスを生成し、思考タイミングを制御する
 */
export class CPUManager {
  /**
   * CPUマネージャーを初期化
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
   * ゲームモードに応じたCPUインスタンスを作成
   * @returns {BaseCPU} CPUインスタンス
   * @private
   */
  createCPU() {
    /**
     * CPUはプレイヤーとは逆の色となる
     */
    const cpuColor = this.playerColor === "black" ? "white" : "black";

    switch (this.gameMode) {
      case "cpu-weak":
        return new RandomCPU(this.bitBoard, cpuColor);
      case "cpu-normal":
        return new AlphaBetaCPU(this.bitBoard, cpuColor);
      case "cpu-strong":
        return new WeakestCPU(this.bitBoard, cpuColor);
      default:
        return null;
    }
  }

  /**
   * CPUの手を選択する
   * 思考時間の演出を含む
   * @returns {Promise<{row: number, col: number}>} 選択された手の座標
   */
  async selectMove() {
    if (!this.cpu) {
      return null;
    }

    /**
     * 思考時間を演出するための遅延
     */
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.cpu.selectMove();
  }

  /**
   * プレイヤーの色が変更された場合にCPUの色を更新
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
