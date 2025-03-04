<template>
  <div class="game-board">
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
          Black: {{ blackScore }}
        </div>
        <div class="score white-score">
          White: {{ whiteScore }}
        </div>
      </div>
      <div class="current-player" v-if="!isGameOver">
        Current Player: {{ currentPlayer === 'black' ? 'Black' : 'White' }}
      </div>
      <div class="game-status" v-if="isGameOver">
        Game Over! Winner: {{ winner }}
      </div>
      <button class="restart-button" @click="initializeBoard">Restart Game</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameBoard',
  data() {
    return {
      board: Array(8).fill(null).map(() => Array(8).fill(null)),
      currentPlayer: 'black',
      isGameOver: false,
      winner: null,
      directions: [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ]
    }
  },
  computed: {
    blackScore() {
      return this.countPieces('black')
    },
    whiteScore() {
      return this.countPieces('white')
    }
  },
  created() {
    this.initializeBoard()
  },
  methods: {
    initializeBoard() {
      // Reset board
      this.board = Array(8).fill(null).map(() => Array(8).fill(null))

      // Set initial pieces
      this.board[3][3] = 'white'
      this.board[3][4] = 'black'
      this.board[4][3] = 'black'
      this.board[4][4] = 'white'

      // Reset game state
      this.currentPlayer = 'black'
      this.isGameOver = false
      this.winner = null
    },
    countPieces(color) {
      return this.board.reduce((count, row) =>
        count + row.filter(cell => cell === color).length, 0)
    },
    isValidMove(row, col) {
      // Check if cell is empty
      if (this.board[row][col] !== null) {
        return false
      }

      // Check all directions for valid moves
      return this.directions.some(([dx, dy]) => {
        return this.isValidDirection(row, col, dx, dy)
      })
    },
    isValidDirection(row, col, dx, dy) {
      let x = row + dx
      let y = col + dy
      let hasOpponentPiece = false

      // Check if the next position is within bounds and has opponent's piece
      while (x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] !== null) {
        if (this.board[x][y] === this.currentPlayer) {
          return hasOpponentPiece
        }
        hasOpponentPiece = true
        x += dx
        y += dy
      }

      return false
    },
    hasValidMoves() {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (this.isValidMove(row, col)) {
            return true
          }
        }
      }
      return false
    },
    handleCellClick(row, col) {
      if (this.isGameOver || !this.isValidMove(row, col)) {
        return
      }

      // Place the piece
      this.board[row][col] = this.currentPlayer

      // Flip pieces
      this.directions.forEach(([dx, dy]) => {
        if (this.isValidDirection(row, col, dx, dy)) {
          this.flipPieces(row, col, dx, dy)
        }
      })

      // Switch player
      this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black'

      // Check if next player has valid moves
      if (!this.hasValidMoves()) {
        // Switch back to check if original player has moves
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black'

        if (!this.hasValidMoves()) {
          // Game is over if neither player has valid moves
          this.endGame()
        }
      }
    },
    flipPieces(row, col, dx, dy) {
      let x = row + dx
      let y = col + dy

      while (x >= 0 && x < 8 && y >= 0 && y < 8 && this.board[x][y] !== this.currentPlayer) {
        if (this.board[x][y] === null) {
          return
        }
        this.board[x][y] = this.currentPlayer
        x += dx
        y += dy
      }
    },
    endGame() {
      this.isGameOver = true
      if (this.blackScore > this.whiteScore) {
        this.winner = 'Black'
      } else if (this.whiteScore > this.blackScore) {
        this.winner = 'White'
      } else {
        this.winner = 'Draw'
      }
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

.current-player, .game-status {
  padding: 5px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 10px;
}

.restart-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s;
}

.restart-button:hover {
  background-color: #2980b9;
}
</style>
