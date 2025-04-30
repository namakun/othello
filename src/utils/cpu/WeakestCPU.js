/**
 * src/utils/cpu/WeakestCPU.js
 * 最弱AIの実装
 * - 角を避け、X打ちやC打ちを積極的に選択
 * - 相手に有利な手を優先
 * - ランダム性を導入して予測不能な動きを実現
 */
import { BaseCPU } from "./BaseCPU";

/**
 * 最弱AIクラス
 * 強化学習で学習した最弱モデルを使用
 */
export class WeakestCPU extends BaseCPU {
  /**
   * 最弱CPUを初期化
   * @param {BitBoard} bitBoard ビットボード
   * @param {"black"|"white"} color CPUの色
   */
  constructor(bitBoard, color) {
    super(bitBoard, color);
    this.model = null;
    this.modelLoaded = false;
    this.loadModel();
  }

  /**
   * モデルをロード
   * @private
   */
  async loadModel() {
    try {
      const response = await fetch('/models/reversi_model_weak.json');
      if (!response.ok) {
        console.error('モデルのロードに失敗しました:', response.statusText);
        return;
      }
      this.model = await response.json();

      // モデルの重みの形状を確認
      console.log('モデルの構造:');
      for (const key of Object.keys(this.model)) {
        if (Array.isArray(this.model[key])) {
          let shape = [];
          let current = this.model[key];
          while (Array.isArray(current)) {
            shape.push(current.length);
            current = current[0];
          }
          console.log(`${key} shape:`, shape.join('x'));
        }
      }

      this.modelLoaded = true;
      console.log('強化学習モデルをロードしました');
    } catch (error) {
      console.error('モデルのロード中にエラーが発生しました:', error);
    }
  }

  /**
   * 盤面状態を3チャンネルの入力形式に変換
   * @param {BitBoard} board ビットボード
   * @returns {Array} 3チャンネルの盤面状態 [自分の石, 相手の石, 手番]
   * @private
   */
  boardToInput(board) {
    const input = Array(3).fill().map(() => Array(8).fill().map(() => Array(8).fill(0)));

    // 自分の石と相手の石のチャンネルを設定
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board.getPiece(row, col);
        if (piece === this.color) {
          input[0][row][col] = 1; // 自分の石
        } else if (piece === this.oppColor) {
          input[1][row][col] = 1; // 相手の石
        }
      }
    }

    // 手番チャンネルを設定（常に1で埋める - 自分の手番を表す）
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        input[2][row][col] = 1;
      }
    }

    return input;
  }

  /**
   * モデルを使用して方策を予測
   * @param {Array} input 3チャンネルの盤面状態
   * @returns {Array} 64要素の方策（各マスの確率）
   * @private
   */
  predictPolicy(input) {
    if (!this.modelLoaded || !this.model) {
      return Array(64).fill(1/64); // モデルがロードされていない場合は一様分布
    }

    try {
      // デバッグ情報の出力
      console.log('入力形状:', input.length, 'x', input[0].length, 'x', input[0][0].length);
      console.log('conv_input.weight形状:',
        this.model['conv_input.weight'].length, 'x',
        this.model['conv_input.weight'][0].length, 'x',
        this.model['conv_input.weight'][0][0].length, 'x',
        this.model['conv_input.weight'][0][0][0].length
      );

      // 入力層
      let x = input;

      // 共通層の計算
      // 入力畳み込み層
      let conv_input = this.applyConvolution(x, this.model['conv_input.weight'], this.model['conv_input.bias']);
      let bn_input = this.applyBatchNorm(conv_input, this.model['bn_input.weight'], this.model['bn_input.bias'],
                                        this.model['bn_input.running_mean'], this.model['bn_input.running_var']);
      x = this.sinCosActivation(bn_input);

      // メインブロック
      let conv_block = this.applyConvolution(x, this.model['main_block.conv.weight'], this.model['main_block.conv.bias']);
      let bn_block = this.applyBatchNorm(conv_block, this.model['main_block.bn.weight'], this.model['main_block.bn.bias'],
                                        this.model['main_block.bn.running_mean'], this.model['main_block.bn.running_var']);
      x = this.sinCosActivation(bn_block);

      // Policy head
      let conv_policy = this.applyConvolution(x, this.model['conv_policy.weight'], this.model['conv_policy.bias']);
      let bn_policy = this.applyBatchNorm(conv_policy, this.model['bn_policy.weight'], this.model['bn_policy.bias'],
                                         this.model['bn_policy.running_mean'], this.model['bn_policy.running_var']);
      let policy_features = this.sinCosActivation(bn_policy);

      // Flatten
      let flattened = [];
      for (let c = 0; c < policy_features.length; c++) {
        for (let i = 0; i < policy_features[c].length; i++) {
          for (let j = 0; j < policy_features[c][i].length; j++) {
            flattened.push(policy_features[c][i][j]);
          }
        }
      }

      // 全結合層
      let policy = this.applyLinear(flattened, this.model['fc_policy.weight'], this.model['fc_policy.bias']);

      // ソフトマックス
      let expSum = 0;
      for (let i = 0; i < policy.length; i++) {
        policy[i] = Math.exp(policy[i]);
        expSum += policy[i];
      }

      for (let i = 0; i < policy.length; i++) {
        policy[i] /= expSum;
      }

      return policy;
    } catch (error) {
      console.error('方策予測中にエラーが発生しました:', error);
      return Array(64).fill(1/64); // エラー時は一様分布
    }
  }

  /**
   * 畳み込み層の計算
   * @private
   */
  applyConvolution(input, weights, bias) {
    try {
      // 重みの形状チェックと詳細なデバッグ情報
      if (!Array.isArray(weights)) {
        console.error('weights is not an array:', typeof weights);
        throw new Error('Invalid weights: not an array');
      }
      if (!Array.isArray(weights[0])) {
        console.error('weights[0] is not an array:', typeof weights[0]);
        throw new Error('Invalid weights[0]: not an array');
      }
      if (!Array.isArray(weights[0][0])) {
        console.error('weights[0][0] is not an array:', typeof weights[0][0]);
        throw new Error('Invalid weights[0][0]: not an array');
      }
      if (!Array.isArray(weights[0][0][0])) {
        console.error('weights[0][0][0] is not an array:', typeof weights[0][0][0]);
        throw new Error('Invalid weights[0][0][0]: not an array');
      }

      const outputChannels = weights.length;
      const inputChannels = weights[0].length;
      const kernelHeight = weights[0][0].length;
      const kernelWidth = weights[0][0][0].length;
      const height = input[0].length;
      const width = input[0][0].length;

      // 詳細な形状情報をログ出力
      console.log('Convolution shapes:');
      console.log('- Input:', input.length, 'x', height, 'x', width);
      console.log('- Weights:', outputChannels, 'x', inputChannels, 'x', kernelHeight, 'x', kernelWidth);
      console.log('- Bias length:', bias.length);

      // 入力チャンネル数の検証
      if (input.length !== inputChannels) {
        console.error(`Channel mismatch: input=${input.length}, weights=${inputChannels}`);
        throw new Error('Channel mismatch');
      }

      // 出力テンソルを初期化
      const output = Array(outputChannels).fill().map(() =>
        Array(height).fill().map(() => Array(width).fill(0))
      );

      // カーネルサイズに応じて畳み込み計算を実行
      const padding = kernelHeight === 3 ? 1 : 0; // 3x3の場合はパディング1、1x1の場合はパディング0

      for (let oc = 0; oc < outputChannels; oc++) {
        for (let h = 0; h < height; h++) {
          for (let w = 0; w < width; w++) {
            let sum = bias[oc];

            for (let ic = 0; ic < inputChannels; ic++) {
              for (let kh = 0; kh < kernelHeight; kh++) {
                for (let kw = 0; kw < kernelWidth; kw++) {
                  const h_idx = h + kh - padding;
                  const w_idx = w + kw - padding;

                  if (h_idx >= 0 && h_idx < height && w_idx >= 0 && w_idx < width) {
                    sum += input[ic][h_idx][w_idx] * weights[oc][ic][kh][kw];
                  }
                }
              }
            }

            output[oc][h][w] = sum;
          }
        }
      }

      return output;
    } catch (error) {
      console.error('Convolution error:', error);
      throw error; // エラーを上位に伝播
    }
  }

  /**
   * バッチ正規化の計算
   * @private
   */
  applyBatchNorm(input, gamma, beta, mean, variance) {
    const channels = input.length;
    const height = input[0].length;
    const width = input[0][0].length;

    const output = Array(channels).fill().map(() =>
      Array(height).fill().map(() => Array(width).fill(0))
    );

    const epsilon = 1e-5;

    for (let c = 0; c < channels; c++) {
      for (let h = 0; h < height; h++) {
        for (let w = 0; w < width; w++) {
          output[c][h][w] = gamma[c] * (input[c][h][w] - mean[c]) / Math.sqrt(variance[c] + epsilon) + beta[c];
        }
      }
    }

    return output;
  }

  /**
   * sin * cos 活性化関数
   * @private
   */
  sinCosActivation(input) {
    const channels = input.length;
    const height = input[0].length;
    const width = input[0][0].length;

    const output = Array(channels).fill().map(() =>
      Array(height).fill().map(() => Array(width).fill(0))
    );

    for (let c = 0; c < channels; c++) {
      for (let h = 0; h < height; h++) {
        for (let w = 0; w < width; w++) {
          output[c][h][w] = Math.sin(input[c][h][w]) * Math.cos(input[c][h][w]);
        }
      }
    }

    return output;
  }

  /**
   * 全結合層の計算
   * @private
   */
  applyLinear(input, weights, bias) {
    const outputSize = bias.length;
    const output = Array(outputSize).fill(0);

    for (let o = 0; o < outputSize; o++) {
      output[o] = bias[o];
      for (let i = 0; i < input.length; i++) {
        output[o] += input[i] * weights[o][i];
      }
    }

    return output;
  }

  /**
   * 手を選択する
   * @returns {{row: number, col: number}|null} 選択された手の座標、または合法手がない場合はnull
   */
  selectMove() {
    const moves = this.getValidMoves();
    if (!moves.length) return null;

    // モデルがロードされていない場合はランダム選択
    if (!this.modelLoaded || !this.model) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    try {
      // 盤面を入力形式に変換
      const input = this.boardToInput(this.bitBoard);

      // 方策を予測
      const policy = this.predictPolicy(input);

      // 合法手のみの確率分布を作成
      const moveProbabilities = [];
      for (const move of moves) {
        const idx = move.row * 8 + move.col;
        let score = policy[idx];

        // 角を避ける（確率を下げる）
        const corners = [[0,0], [0,7], [7,0], [7,7]];
        if (corners.some(([r, c]) => r === move.row && c === move.col)) {
          score *= 0.1;
        }

        // X打ちを優先（確率を上げる）
        const xMoves = [
          [0,1], [1,0], [1,1],  // 左上
          [0,6], [1,6], [1,7],  // 右上
          [6,0], [6,1], [7,1],  // 左下
          [6,6], [6,7], [7,6]   // 右下
        ];
        if (xMoves.some(([r, c]) => r === move.row && c === move.col)) {
          score *= 5.0;
        }

        // C打ちを優先（確率を上げる）
        const cMoves = [
          [0,2], [0,3], [0,4], [0,5],  // 上辺
          [7,2], [7,3], [7,4], [7,5],  // 下辺
          [2,0], [3,0], [4,0], [5,0],  // 左辺
          [2,7], [3,7], [4,7], [5,7]   // 右辺
        ];
        if (cMoves.some(([r, c]) => r === move.row && c === move.col)) {
          score *= 3.0;
        }

        moveProbabilities.push({
          move,
          probability: score
        });
      }

      // 確率でランダムに選択（30%の確率）
      if (Math.random() < 0.3) {
        return moves[Math.floor(Math.random() * moves.length)];
      }

      // 確率に基づいて手を選択（確率が高い順にソート）
      moveProbabilities.sort((a, b) => b.probability - a.probability);

      // 上位3手からランダムに選択
      const topMoves = moveProbabilities.slice(0, Math.min(3, moveProbabilities.length));
      const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
      return selectedMove.move;
    } catch (error) {
      console.error('手の選択中にエラーが発生しました:', error);
      // エラー時はランダム選択
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }
}
