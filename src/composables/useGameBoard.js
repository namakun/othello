import { ref, computed, watch } from 'vue';
import { BitBoard } from '@/utils/BitBoard';
import { GameState } from '@/utils/game/GameState';
import { AnimationManager } from '@/utils/game/AnimationManager';
import { CPUManager } from '@/utils/game/CPUManager';

export function useGameBoard(gameMode, initialPlayerColor) {
  const gameState = ref(null);
  const showColorSelection = ref(false);
  const currentPlayerColor = ref(initialPlayerColor.value);
  const showHints = ref(true);

  // Watch for props changes - 色の同期のみ
  watch(initialPlayerColor, newColor => {
    currentPlayerColor.value = newColor;
  });

  // Computed properties
  const blackScore = computed(() => {
    return gameState.value?.bitBoard ? gameState.value.bitBoard.getScore().black : 2;
  });

  const whiteScore = computed(() => {
    return gameState.value?.bitBoard ? gameState.value.bitBoard.getScore().white : 2;
  });

  const playerColorInGame = computed(() => {
    if (!gameState.value) return null;
    return gameState.value.isCpuMode()
      ? (currentPlayerColor.value || initialPlayerColor.value)
      : gameState.value.activePlayer;
  });

  const opponentColor = computed(() => {
    if (!playerColorInGame.value) return null;
    return playerColorInGame.value === "black" ? "white" : "black";
  });

  const isCpuTurn = computed(() => {
    return gameState.value?.isCpuTurn(playerColorInGame.value) || false;
  });

  const isPlayerTurn = computed(() => {
    return !isCpuTurn.value;
  });

  const currentPlayerLabel = computed(() => {
    return colorLabel(isCpuTurn.value ? opponentColor.value : playerColorInGame.value);
  });

  const winnerLabel = computed(() => {
    if (!gameState.value?.winner) return '';
    if (gameState.value.winner === "Draw") return "引き分け";
    return colorLabel(gameState.value.winner.toLowerCase());
  });

  const playerScore = computed(() => {
    return playerColorInGame.value === "black" ? blackScore.value : whiteScore.value;
  });

  const opponentScore = computed(() => {
    return playerColorInGame.value === "black" ? whiteScore.value : blackScore.value;
  });

  // CPU自動手番の監視
  watch(isCpuTurn, async cpuTurn => {
    if (cpuTurn && gameState.value && !gameState.value.isGameOver) {
      gameState.value.isCpuThinking = true;
      try {
        const move = await gameState.value.cpuManager.selectMove();
        // moveがnull/undefinedの場合は処理をスキップ
        if (move) {
          await gameState.value.placePiece(move.row, move.col);
        }
      } catch (error) {
        console.error('CPU手番の処理中にエラーが発生しました:', error);
      } finally {
        gameState.value.isCpuThinking = false;
        showHints.value = true;
      }
    }
  });

  // Methods
  function initializeGame() {
    try {
      showColorSelection.value = false; // 色選択ダイアログのリセット
      const bitBoard = new BitBoard();
      const animationManager = new AnimationManager();
      const cpuManager = gameMode.startsWith('cpu-')
        ? new CPUManager(bitBoard, gameMode, initialPlayerColor.value)
        : null;

      currentPlayerColor.value = initialPlayerColor.value;
      gameState.value = new GameState(
        gameMode,
        initialPlayerColor.value,
        bitBoard,
        animationManager,
        cpuManager
      );

      bitBoard.initialize();
      showHints.value = true;
    } catch (error) {
      console.error("ゲームの初期化に失敗しました:", error);
    }
  }

  function handleRestart() {
    if (gameState.value.isCpuMode()) {
      showColorSelection.value = true;
    } else {
      initializeGame();
    }
  }

  function handleColorSelected(color) {
    showColorSelection.value = false;
    currentPlayerColor.value = color;
    initializeGame();
  }

  function isValidMove(row, col) {
    if (!showHints.value || gameState.value.showPassMessage || !isPlayerTurn.value) {
      return false;
    }
    return gameState.value.isValidMove(row, col);
  }

  async function handleCellClick(coords) {
    if (!isValidMove(coords.row, coords.col)) return;

    showHints.value = false;
    await gameState.value.placePiece(coords.row, coords.col);
    showHints.value = isPlayerTurn.value;
  }

  function hasPiece({row, col}) {
    return gameState.value?.bitBoard?.getPiece(row, col) || false;
  }

  function pieceClasses(color) {
    return {
      'piece-black': color === 'black',
      'piece-white': color === 'white'
    };
  }

  function cellPieceClasses({row, col}) {
    if (!gameState.value?.bitBoard) return {};

    const color = gameState.value.bitBoard.getPiece(row, col);
    const isFlipping = gameState.value.animationManager.isPieceFlipping(row, col);
    return {
      [`piece-${color}`]: !isFlipping,
      [`flipping-to-${color}`]: isFlipping
    };
  }

  function colorLabel(color) {
    return { black: '黒', white: '白' }[color] || '不明';
  }

  function getCellClasses(row, col) {
    return { 'valid-move': isValidMove(row, col) };
  }

  function getPieceStyle(row, col) {
    return {
      animationDelay: gameState.value?.animationManager?.getPieceAnimationDelay({ row, col })
    };
  }

  return {
    // State
    gameState,
    showColorSelection,
    playerColorInGame,
    opponentColor,
    isCpuTurn,
    isPlayerTurn,
    currentPlayerLabel,
    winnerLabel,
    playerScore,
    opponentScore,

    // Methods
    initializeGame,
    handleRestart,
    handleColorSelected,
    isValidMove,
    handleCellClick,
    hasPiece,
    pieceClasses,
    cellPieceClasses,
    colorLabel,
    getCellClasses,
    getPieceStyle
  };
}
