<template>
  <div class="game-board">
    <div class="game-header">
      <div class="mode-info">
        <span class="mode-label">モード:</span>
        <span class="mode-value">{{ getModeName }}</span>
      </div>
    </div>

    <!-- 上側プレイヤー（対戦相手）情報 -->
    <div class="player-info opponent">
      <div class="player-piece" :class="{ active: isOpponentTurn }">
        <div class="piece" :class="{ 'piece-black': opponentColor === 'black', 'piece-white': opponentColor === 'white' }"></div>
      </div>
      <div class="player-score">{{ opponentColor === "black" ? "黒" : "白" }}: {{ opponentColor === "black" ? blackScore : whiteScore }}</div>
    </div>

    <div class="board" :class="{ flipped: isPlayerWhite && gameMode === 'offline' }">
      <div v-for="row in 8" :key="row - 1" class="board-row">
          <div v-for="col in 8" :key="col - 1" class="board-cell" :class="{ 'valid-move': isValidMove(row - 1, col - 1) }" @click="handleCellClick(row - 1, col - 1)">
            <div
              class="piece"
              :class="{
                'piece-black': bitBoard && bitBoard.getPiece(row - 1, col - 1) === 'black' && !isPieceFlipping(row - 1, col - 1),
                'piece-white': bitBoard && bitBoard.getPiece(row - 1, col - 1) === 'white' && !isPieceFlipping(row - 1, col - 1),
                'flipping-to-black': isPieceFlipping(row - 1, col - 1) && bitBoard && bitBoard.getPiece(row - 1, col - 1) === 'black',
                'flipping-to-white': isPieceFlipping(row - 1, col - 1) && bitBoard && bitBoard.getPiece(row - 1, col - 1) === 'white'
              }"
              :style="{
                animationDelay: getPieceAnimationDelay(row - 1, col - 1)
              }"
              v-show="bitBoard && bitBoard.getPiece(row - 1, col - 1)"
            ></div>
            <div v-if="isValidMove(row - 1, col - 1)" class="valid-move-indicator"></div>
          </div>
      </div>
    </div>

    <!-- 下側プレイヤー（自分）情報 -->
    <div class="player-info current-player">
      <div class="player-piece" :class="{ active: isPlayerTurn }">
        <div class="piece" :class="{ 'piece-black': playerColorInGame === 'black', 'piece-white': playerColorInGame === 'white' }"></div>
      </div>
      <div class="player-score">{{ playerColorInGame === "black" ? "黒" : "白" }}: {{ playerColorInGame === "black" ? blackScore : whiteScore }}</div>
    </div>

    <div class="game-info">
      <div class="status-message" :class="{ 'status-pass': showPassMessage }">
        <div v-if="showPassMessage" class="pass-message">{{ activePlayer === "black" ? "黒" : "白" }}の手番をスキップします</div>
        <div v-else-if="isGameOver" class="game-over">ゲーム終了！ 勝者: {{ winner === "Draw" ? "引き分け" : winner === "Black" ? "黒" : "白" }}</div>
        <div v-else class="current-player">
          現在の手番: {{ activePlayer === "black" ? "黒" : "白" }}
          <span v-if="isCpuTurn" class="cpu-thinking">(CPU思考中...)</span>
        </div>
      </div>
      <div class="button-container">
        <button class="restart-button" @click="initializeBoard">ゲームをリセット</button>
        <button class="menu-button" @click="returnToMenu">メニューに戻る</button>
      </div>
    </div>
  </div>
</template>
<script>
import { BitBoard } from '@/utils/BitBoard';

export default {
  name: "GameBoard",
  props: {
    gameMode: {
      type: String,
      default: "offline",
    },
    playerColor: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      // ビットボードインスタンス
      bitBoard: null,

      // プレイヤー状態
      activePlayer: "black", // 現在の手番 ('black' または 'white')
      isGameOver: false, // ゲーム終了フラグ
      winner: null, // 勝者 ('Black', 'White', または 'Draw')
      showPassMessage: false, // パスメッセージ表示フラグ
      isCpuThinking: false, // CPU思考中フラグ

      // 駒の反転アニメーション用
      flippingPieces: [], // 反転アニメーション中の駒
      lastPlacedPiece: null, // 最後に配置された駒の座標
    };
  },

  computed: {
    // 現在の盤面状態（テスト用）
    board() {
      return this.bitBoard ? this.bitBoard.getBoard() : Array(8).fill(null).map(() => Array(8).fill(null));
    },

    // 黒の駒の数
    blackScore() {
      return this.bitBoard ? this.bitBoard.getScore().black : 2;
    },

    // 白の駒の数
    whiteScore() {
      return this.bitBoard ? this.bitBoard.getScore().white : 2;
    },

    // CPUモードかどうか
    isCpuMode() {
      return this.gameMode && this.gameMode.startsWith("cpu-");
    },

    // 現在のターンがCPUかどうか
    isCpuTurn() {
      return this.isCpuMode && this.activePlayer !== this.playerColorInGame;
    },

    // ゲーム内でのプレイヤーの色
    playerColorInGame() {
      // CPU対戦の場合は選択した色、オフラインモードの場合はデフォルトで黒
      return this.isCpuMode ? this.playerColor : "black";
    },

    // 対戦相手の色
    opponentColor() {
      return this.playerColorInGame === "black" ? "white" : "black";
    },

    // プレイヤーのターンかどうか
    isPlayerTurn() {
      return this.activePlayer === this.playerColorInGame;
    },

    // 対戦相手のターンかどうか
    isOpponentTurn() {
      return this.activePlayer === this.opponentColor;
    },

    // プレイヤーが白かどうか（オフラインモードでボードを反転するために使用）
    isPlayerWhite() {
      return this.playerColorInGame === "white";
    },

    // モード名の表示用テキスト
    getModeName() {
      switch (this.gameMode) {
        case "offline":
          return "オフラインマッチ";
        case "cpu-weak":
          return "CPU (弱)";
        case "cpu-normal":
          return "CPU (普通)";
        case "cpu-strong":
          return "CPU (強)";
        default:
          return "オフラインマッチ";
      }
    },
  },

  watch: {
    // アクティブプレイヤーが変わったときにCPUの手番を処理
    activePlayer(newPlayer) {
      if (this.isCpuMode && newPlayer !== this.playerColorInGame && !this.isGameOver) {
        this.handleCpuTurn();
      }
    },
  },

  created() {
    try {
      this.bitBoard = new BitBoard();
      this.initializeBoard();
    } catch (error) {
      console.error("BitBoardの初期化に失敗しました:", error);
    }
  },

  methods: {
    /**
     * ゲームボードの初期化
     */
    initializeBoard() {
      try {
        // ビットボードがない場合は作成
        if (!this.bitBoard) {
          this.bitBoard = new BitBoard();
        }

        // ビットボードを初期化
        this.bitBoard.initialize();

        // ゲーム状態をリセット
        this.activePlayer = "black";
        this.isGameOver = false;
        this.winner = null;
        this.showPassMessage = false;
        this.flippingPieces = [];
        this.lastPlacedPiece = null;
      } catch (error) {
        console.error("ゲームボードの初期化に失敗しました:", error);
      }

      // プレイヤーが白を選択している場合、CPUの初手（黒）を処理
      if (this.isCpuMode && this.playerColorInGame === "white") {
        this.handleCpuTurn();
      }
    },

    /**
     * メニューに戻る
     */
    returnToMenu() {
      this.$emit("return-to-menu");
    },


    /**
     * 指定した位置に駒を置けるかどうかを判定
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     * @return {boolean} - 有効な手かどうか
     */
    isValidMove(row, col) {
      return this.bitBoard && this.bitBoard.isValidMove(row, col, this.activePlayer === "black");
    },

    /**
     * 現在のプレイヤーが有効な手を持っているかどうかを判定
     * @return {boolean} - 有効な手があるかどうか
     */
    hasAvailableMoves() {
      return this.bitBoard && this.bitBoard.hasValidMoves(this.activePlayer === "black");
    },

    /**
     * セルクリック時の処理
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     */
    handleCellClick(row, col) {
      // ゲーム終了時または無効な手の場合は何もしない
      if (this.isGameOver || !this.isValidMove(row, col)) {
        return;
      }

      // CPUモードでCPUの手番の場合は何もしない
      if (this.isCpuTurn) {
        return;
      }

      // パスメッセージをリセット
      this.showPassMessage = false;

      // 駒を置く
      this.placePiece(row, col);

      // 次のプレイヤーに切り替え
      this.switchToNextPlayer();

      // 次のプレイヤーの手番を処理
      this.handleNextPlayerTurn();
    },

    /**
     * 指定した位置に駒を置き、裏返す処理を行う
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     */
    placePiece(row, col) {
      if (!this.bitBoard) return;

      // 最後に置いた駒の位置を記録（アニメーション開始点）
      this.lastPlacedPiece = { row, col };

      // 反転する駒のリストをクリア
      this.flippingPieces = [];

      // ビットボードで駒を置き、反転する駒のリストを取得
      const flippedPieces = this.bitBoard.placePiece(row, col, this.activePlayer === "black");

      // 反転する駒をアニメーション用に記録
      flippedPieces.forEach(piece => {
        this.flippingPieces.push({
          row: piece.row,
          col: piece.col,
          fromColor: this.activePlayer === "black" ? "white" : "black",
          toColor: this.activePlayer
        });

        // アニメーション終了後に反転フラグをクリア
        setTimeout(() => {
          this.flippingPieces = this.flippingPieces.filter(
            p => !(p.row === piece.row && p.col === piece.col)
          );
        }, 500 + this.getPieceAnimationDelayValue(piece.row, piece.col));
      });
    },

    /**
     * 次のプレイヤーに切り替える
     */
    switchToNextPlayer() {
      this.activePlayer = this.activePlayer === "black" ? "white" : "black";
    },

    /**
     * 次のプレイヤーの手番を処理
     * パスや終了判定を行う
     */
    handleNextPlayerTurn() {
      // 次のプレイヤーが有効な手を持っているかチェック
      if (!this.hasAvailableMoves()) {
        // パスが必要なプレイヤーを記録
        const playerThatMustPass = this.activePlayer;

        // 前のプレイヤーに一時的に戻して確認
        this.switchToNextPlayer();

        // 前のプレイヤーも有効な手がない場合はゲーム終了
        if (!this.hasAvailableMoves()) {
          this.endGame();
        } else {
          // パスメッセージを表示
          this.showPassMessage = true;

          // パスするプレイヤーに戻す（メッセージ表示用）
          this.activePlayer = playerThatMustPass;

          // 2秒後にメッセージを消し、有効な手を持つプレイヤーに切り替え
          setTimeout(() => {
            this.showPassMessage = false;
            this.switchToNextPlayer();
          }, 2000);
        }
      }
    },

    /**
     * 駒のアニメーション遅延時間の数値を取得
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     * @return {number} - 遅延時間 (ms)
     */
    getPieceAnimationDelayValue(row, col) {
      if (!this.lastPlacedPiece) {
        return 0;
      }

      // 最後に置いた駒からのマンハッタン距離を計算
      const distance = Math.abs(row - this.lastPlacedPiece.row) + Math.abs(col - this.lastPlacedPiece.col);

      // 距離に基づいて遅延時間を計算（80msごとに増加）
      // より自然な伝播のために遅延時間を短縮
      return distance * 80;
    },

    /**
     * 駒のアニメーション遅延時間を計算（CSS用）
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     * @return {string} - CSS用アニメーション遅延時間
     */
    getPieceAnimationDelay(row, col) {
      if (!this.lastPlacedPiece || !this.flippingPieces.some((p) => p.row === row && p.col === col)) {
        return "0ms";
      }

      return `${this.getPieceAnimationDelayValue(row, col)}ms`;
    },

    /**
     * 駒が反転中かどうかを判定
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     * @return {boolean} - 反転中かどうか
     */
    isPieceFlipping(row, col) {
      return this.flippingPieces && this.flippingPieces.some((p) => p.row === row && p.col === col);
    },

    /**
     * ゲーム終了処理
     * 勝者を決定する
     */
    endGame() {
      this.isGameOver = true;

      if (this.bitBoard) {
        const score = this.bitBoard.getScore();

        // スコアを比較して勝者を決定
        if (score.black > score.white) {
          this.winner = "Black";
        } else if (score.white > score.black) {
          this.winner = "White";
        } else {
          this.winner = "Draw";
        }
      } else {
        this.winner = "Draw"; // bitBoardがない場合はデフォルトで引き分け
      }
    },

    /**
     * CPUの手番を処理する
     * 難易度に応じた手を選択する
     */
    handleCpuTurn() {
      // 少し遅延を入れてCPUの思考時間を演出
      setTimeout(() => {
        if (this.isGameOver || !this.isCpuTurn) {
          return;
        }

        // 有効な手を全て収集
        const validMoves = [];
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            if (this.isValidMove(row, col)) {
              validMoves.push({ row, col });
            }
          }
        }

        if (validMoves.length === 0) {
          return;
        }

        let selectedMove;

        // 難易度に応じた手の選択
        switch (this.gameMode) {
          case "cpu-weak":
            // 弱いCPU: ランダムに手を選択
            selectedMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            break;

          case "cpu-normal":
          case "cpu-strong":
            // 普通/強いCPU: 現時点では同じ実装（ランダム）
            // 実際の対戦機能は未実装でよいとのこと
            selectedMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            break;

          default:
            selectedMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        // 選択した手を実行
        this.placePiece(selectedMove.row, selectedMove.col);

        // 次のプレイヤーに切り替え
        this.switchToNextPlayer();

        // 次のプレイヤーの手番を処理
        this.handleNextPlayerTurn();
      }, 1000); // 1秒の思考時間
    },
  },
};
</script>

<style scoped>
@import '../assets/styles/GameBoard.css';
</style>
