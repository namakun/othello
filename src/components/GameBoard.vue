<template>
  <div class="game-board">
    <div class="game-header">
      <div class="mode-info">
        <span class="mode-label">モード:</span>
        <span class="mode-value">{{ getModeName }}</span>
      </div>
    </div>
    <div class="board">
      <div v-for="row in 8" :key="row-1" class="board-row">
        <div v-for="col in 8" :key="col-1"
             class="board-cell"
             :class="{ 'valid-move': isValidMove(row-1, col-1) }"
             @click="handleCellClick(row-1, col-1)">
          <div v-if="board[row-1][col-1] !== null"
               class="piece"
               :class="{ 'piece-black': board[row-1][col-1] === 'black', 'piece-white': board[row-1][col-1] === 'white' }">
          </div>
          <div v-if="isValidMove(row-1, col-1)" class="valid-move-indicator"></div>
        </div>
      </div>
    </div>
    <div class="game-info">
      <div class="score-board">
        <div class="score black-score">
          黒: {{ blackScore }}
        </div>
        <div class="score white-score">
          白: {{ whiteScore }}
        </div>
      </div>
      <div class="status-message" :class="{ 'status-pass': showPassMessage }">
        <div v-if="showPassMessage" class="pass-message">
          {{ activePlayer === 'black' ? '黒' : '白' }}の手番をスキップします
        </div>
        <div v-else-if="isGameOver" class="game-over">
          ゲーム終了！ 勝者: {{ winner === 'Draw' ? '引き分け' : (winner === 'Black' ? '黒' : '白') }}
        </div>
        <div v-else class="current-player">
          現在の手番: {{ activePlayer === 'black' ? '黒' : '白' }}
          <span v-if="isCpuMode && activePlayer === 'white'" class="cpu-thinking">(CPU思考中...)</span>
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
export default {
  name: 'GameBoard',
  props: {
    gameMode: {
      type: String,
      default: 'offline'
    }
  },
  data() {
    return {
      // ゲームボード (8x8)
      board: Array(8).fill(null).map(() => Array(8).fill(null)),

      // プレイヤー状態
      activePlayer: 'black', // 現在の手番 ('black' または 'white')
      isGameOver: false,     // ゲーム終了フラグ
      winner: null,          // 勝者 ('Black', 'White', または 'Draw')
      showPassMessage: false, // パスメッセージ表示フラグ
      isCpuThinking: false,   // CPU思考中フラグ

      // 8方向の移動ベクトル (上下左右、斜め)
      moveDirections: [
        [-1, -1], [-1, 0], [-1, 1], // 上方向
        [0, -1],           [0, 1],  // 左右
        [1, -1],  [1, 0],  [1, 1]   // 下方向
      ]
    }
  },

  computed: {
    // 黒の駒の数
    blackScore() {
      return this.countPiecesByColor('black')
    },

    // 白の駒の数
    whiteScore() {
      return this.countPiecesByColor('white')
    },

    // CPUモードかどうか
    isCpuMode() {
      return this.gameMode && this.gameMode.startsWith('cpu-')
    },

    // モード名の表示用テキスト
    getModeName() {
      switch(this.gameMode) {
        case 'offline':
          return 'オフラインマッチ'
        case 'cpu-weak':
          return 'CPU (弱)'
        case 'cpu-normal':
          return 'CPU (普通)'
        case 'cpu-strong':
          return 'CPU (強)'
        default:
          return 'オフラインマッチ'
      }
    }
  },

  watch: {
    // アクティブプレイヤーが変わったときにCPUの手番を処理
    activePlayer(newPlayer) {
      if (this.isCpuMode && newPlayer === 'white' && !this.isGameOver) {
        this.handleCpuTurn()
      }
    }
  },

  created() {
    this.initializeBoard()
  },

  methods: {
    /**
     * ゲームボードの初期化
     */
    initializeBoard() {
      // ボードをリセット
      this.board = Array(8).fill(null).map(() => Array(8).fill(null))

      // 初期配置（中央に4つの駒を配置）
      this.board[3][3] = 'white'
      this.board[3][4] = 'black'
      this.board[4][3] = 'black'
      this.board[4][4] = 'white'

      // ゲーム状態をリセット
      this.activePlayer = 'black'
      this.isGameOver = false
      this.winner = null
      this.showPassMessage = false
    },

    /**
     * メニューに戻る
     */
    returnToMenu() {
      this.$emit('return-to-menu')
    },

    /**
     * 指定した色の駒の数を数える
     * @param {string} color - 駒の色 ('black' または 'white')
     * @return {number} - 駒の数
     */
    countPiecesByColor(color) {
      return this.board.reduce((count, row) =>
        count + row.filter(cell => cell === color).length, 0)
    },

    /**
     * 指定した位置に駒を置けるかどうかを判定
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     * @return {boolean} - 有効な手かどうか
     */
    isValidMove(row, col) {
      // セルが空でない場合は無効
      if (this.board[row][col] !== null) {
        return false
      }

      // 全方向をチェックして、一つでも有効な方向があれば有効な手
      return this.moveDirections.some(([dx, dy]) => {
        return this.isValidDirectionForMove(row, col, dx, dy)
      })
    },

    /**
     * 指定した方向に駒を裏返せるかどうかを判定
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     * @param {number} dx - 行方向の移動量
     * @param {number} dy - 列方向の移動量
     * @return {boolean} - 有効な方向かどうか
     */
    isValidDirectionForMove(row, col, dx, dy) {
      let currentRow = row + dx
      let currentCol = col + dy
      let hasOpponentPiece = false

      // ボード内で、かつ空でないセルがある間ループ
      while (
        currentRow >= 0 && currentRow < 8 &&
        currentCol >= 0 && currentCol < 8 &&
        this.board[currentRow][currentCol] !== null
      ) {
        // 自分の駒に到達したら、間に相手の駒があれば有効
        if (this.board[currentRow][currentCol] === this.activePlayer) {
          return hasOpponentPiece
        }

        // 相手の駒を見つけた
        hasOpponentPiece = true
        currentRow += dx
        currentCol += dy
      }

      return false
    },

    /**
     * 現在のプレイヤーが有効な手を持っているかどうかを判定
     * @return {boolean} - 有効な手があるかどうか
     */
    hasAvailableMoves() {
      // ボード全体をチェック
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (this.isValidMove(row, col)) {
            return true
          }
        }
      }
      return false
    },

    /**
     * セルクリック時の処理
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     */
    handleCellClick(row, col) {
      // ゲーム終了時または無効な手の場合は何もしない
      if (this.isGameOver || !this.isValidMove(row, col)) {
        return
      }

      // CPUモードで白の手番の場合は何もしない
      if (this.isCpuMode && this.activePlayer === 'white') {
        return
      }

      // パスメッセージをリセット
      this.showPassMessage = false

      // 駒を置く
      this.placePiece(row, col)

      // 次のプレイヤーに切り替え
      this.switchToNextPlayer()

      // 次のプレイヤーの手番を処理
      this.handleNextPlayerTurn()
    },

    /**
     * 指定した位置に駒を置き、裏返す処理を行う
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     */
    placePiece(row, col) {
      // 駒を置く
      this.board[row][col] = this.activePlayer

      // 全方向をチェックして駒を裏返す
      this.moveDirections.forEach(([dx, dy]) => {
        if (this.isValidDirectionForMove(row, col, dx, dy)) {
          this.flipPiecesInDirection(row, col, dx, dy)
        }
      })
    },

    /**
     * 次のプレイヤーに切り替える
     */
    switchToNextPlayer() {
      this.activePlayer = this.activePlayer === 'black' ? 'white' : 'black'
    },

    /**
     * 次のプレイヤーの手番を処理
     * パスや終了判定を行う
     */
    handleNextPlayerTurn() {
      // 次のプレイヤーが有効な手を持っているかチェック
      if (!this.hasAvailableMoves()) {
        // パスが必要なプレイヤーを記録
        const playerThatMustPass = this.activePlayer

        // 前のプレイヤーに一時的に戻して確認
        this.switchToNextPlayer()

        // 前のプレイヤーも有効な手がない場合はゲーム終了
        if (!this.hasAvailableMoves()) {
          this.endGame()
        } else {
          // パスメッセージを表示
          this.showPassMessage = true

          // パスするプレイヤーに戻す（メッセージ表示用）
          this.activePlayer = playerThatMustPass

          // 2秒後にメッセージを消し、有効な手を持つプレイヤーに切り替え
          setTimeout(() => {
            this.showPassMessage = false
            this.switchToNextPlayer()
          }, 2000)
        }
      }
    },

    /**
     * 指定した方向に駒を裏返す
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     * @param {number} dx - 行方向の移動量
     * @param {number} dy - 列方向の移動量
     */
    flipPiecesInDirection(row, col, dx, dy) {
      let currentRow = row + dx
      let currentCol = col + dy

      // 自分の駒に到達するまで相手の駒を裏返す
      while (
        currentRow >= 0 && currentRow < 8 &&
        currentCol >= 0 && currentCol < 8 &&
        this.board[currentRow][currentCol] !== this.activePlayer
      ) {
        // 空のセルに到達したら終了
        if (this.board[currentRow][currentCol] === null) {
          return
        }

        // 駒を裏返す
        this.board[currentRow][currentCol] = this.activePlayer
        currentRow += dx
        currentCol += dy
      }
    },

    /**
     * ゲーム終了処理
     * 勝者を決定する
     */
    endGame() {
      this.isGameOver = true

      // スコアを比較して勝者を決定
      if (this.blackScore > this.whiteScore) {
        this.winner = 'Black'
      } else if (this.whiteScore > this.blackScore) {
        this.winner = 'White'
      } else {
        this.winner = 'Draw'
      }
    },

    /**
     * CPUの手番を処理する
     * 難易度に応じた手を選択する
     */
    handleCpuTurn() {
      // 少し遅延を入れてCPUの思考時間を演出
      setTimeout(() => {
        if (this.isGameOver || this.activePlayer !== 'white') {
          return
        }

        // 有効な手を全て収集
        const validMoves = []
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            if (this.isValidMove(row, col)) {
              validMoves.push({ row, col })
            }
          }
        }

        if (validMoves.length === 0) {
          return
        }

        let selectedMove

        // 難易度に応じた手の選択
        switch (this.gameMode) {
          case 'cpu-weak':
            // 弱いCPU: ランダムに手を選択
            selectedMove = validMoves[Math.floor(Math.random() * validMoves.length)]
            break

          case 'cpu-normal':
          case 'cpu-strong':
            // 普通/強いCPU: 現時点では同じ実装（ランダム）
            // 実際の対戦機能は未実装でよいとのこと
            selectedMove = validMoves[Math.floor(Math.random() * validMoves.length)]
            break

          default:
            selectedMove = validMoves[Math.floor(Math.random() * validMoves.length)]
        }

        // 選択した手を実行
        this.placePiece(selectedMove.row, selectedMove.col)

        // 次のプレイヤーに切り替え
        this.switchToNextPlayer()

        // 次のプレイヤーの手番を処理
        this.handleNextPlayerTurn()
      }, 1000) // 1秒の思考時間
    }
  }
}
</script>

<style scoped>
.game-board {
  display: inline-block;
  padding: 10px;
  background-color: #2c3e50;
  border-radius: 8px;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #ecf0f1;
}

.mode-info {
  padding: 5px 10px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.9em;
}

.mode-label {
  font-weight: bold;
  margin-right: 5px;
}

.mode-value {
  color: #3498db;
}

.board {
  background-color: #2c3e50;
  padding: 8px;
}

.board-row {
  display: flex;
}

.board-cell {
  width: 50px;
  height: 50px;
  background-color: #27ae60;
  border: 1px solid #2c3e50;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.board-cell:hover {
  background-color: #2ecc71;
}

.piece {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.piece-black {
  background-color: #2c3e50;
  border: 2px solid #34495e;
}

.piece-white {
  background-color: #ecf0f1;
  border: 2px solid #bdc3c7;
}

.valid-move-indicator {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
}

.game-info {
  margin-top: 10px;
  text-align: center;
  color: #ecf0f1;
  font-size: 1.2em;
}

.score-board {
  display: flex;
  justify-content: space-around;
  margin-bottom: 10px;
}

.score {
  padding: 5px 10px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.status-message {
  padding: 10px;
  margin: 10px 0;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.status-pass {
  background-color: #e74c3c;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.pass-message {
  font-weight: bold;
  color: #fff;
}

.game-over {
  background-color: #f1c40f;
  color: #2c3e50;
  padding: 5px;
  border-radius: 4px;
}

.button-container {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.restart-button, .menu-button {
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s;
}

.restart-button {
  background-color: #3498db;
}

.restart-button:hover {
  background-color: #2980b9;
}

.menu-button {
  background-color: #95a5a6;
}

.menu-button:hover {
  background-color: #7f8c8d;
}

.cpu-thinking {
  font-size: 0.8em;
  color: #f39c12;
  margin-left: 5px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
