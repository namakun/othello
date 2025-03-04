<template>
  <div class="app">
    <h1>オセロゲーム</h1>
    <div class="game-container">
      <GameBoard />
    </div>
  </div>
</template>

<script>
import GameBoard from './components/GameBoard.vue'

export default {
  name: 'App',
  components: {
    GameBoard
  }
}
</script>

<style>
.app {
  font-family: Arial, sans-serif;
  text-align: center;
  margin: 20px;
}

.game-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}
</style>
