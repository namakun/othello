import { ref, computed, watch, nextTick } from 'vue';
import { BitBoard } from '@/utils/BitBoard';
import { GameState } from '@/utils/game/GameState';
import { AnimationManager } from '@/utils/game/AnimationManager';
import { CPUManager } from '@/utils/game/CPUManager';

export function useGameBoard(gameMode, initialPlayerColor) {
  /* ------------------------------------------------------------------
   * state
   * ---------------------------------------------------------------- */
  const gameState          = ref(null);
  const showColorSelection = ref(false);
  const currentPlayerColor = ref(initialPlayerColor.value);
  const showHints          = ref(true);

  /* ------------------------------------------------------------------
   * props → state 同期
   * ---------------------------------------------------------------- */
  watch(initialPlayerColor, newColor => {
    currentPlayerColor.value = newColor;
  });

  /* ------------------------------------------------------------------
   * scores
   * ---------------------------------------------------------------- */
  const blackScore = computed(() =>
    gameState.value?.bitBoard
      ? gameState.value.bitBoard.getScore().black
      : 2
  );

  const whiteScore = computed(() =>
    gameState.value?.bitBoard
      ? gameState.value.bitBoard.getScore().white
      : 2
  );

  /* ------------------------------------------------------------------
   * 各種計算プロパティ
   * ---------------------------------------------------------------- */
  const playerColorInGame = computed(() => {
    if (!gameState.value) return null;
    return gameState.value.isCpuMode()
      ? (currentPlayerColor.value || initialPlayerColor.value)
      : gameState.value.activePlayer;
  });

  const opponentColor = computed(() =>
    playerColorInGame.value === 'black' ? 'white' : 'black'
  );

  const isCpuTurn    = computed(() =>
    gameState.value?.isCpuTurn(playerColorInGame.value) || false
  );
  const isPlayerTurn = computed(() => !isCpuTurn.value);

  const currentPlayerLabel = computed(() =>
    colorLabel(isCpuTurn.value ? opponentColor.value : playerColorInGame.value)
  );

  const winnerLabel = computed(() => {
    if (!gameState.value?.winner) return '';
    if (gameState.value.winner === 'Draw') return '引き分け';
    return colorLabel(gameState.value.winner.toLowerCase());
  });

  const playerScore = computed(() =>
    playerColorInGame.value === 'black' ? blackScore.value : whiteScore.value
  );
  const opponentScore = computed(() =>
    playerColorInGame.value === 'black' ? whiteScore.value : blackScore.value
  );

  /* ------------------------------------------------------------------
   * 手番がプレイヤーに戻ったらヒントを再表示
   * ---------------------------------------------------------------- */
  watch(isPlayerTurn, val => {
    showHints.value = val && !gameState.value?.showPassMessage;
  });

  /* ------------------------------------------------------------------
   * ゲーム初期化
   * ---------------------------------------------------------------- */
  async function initializeGame() {
    try {
      showColorSelection.value = false;

      const bitBoard         = new BitBoard();
      const animationManager = new AnimationManager();
      const playerColor      = currentPlayerColor.value || initialPlayerColor.value;
      const cpuManager       = gameMode.startsWith('cpu-')
        ? new CPUManager(bitBoard, gameMode, playerColor)
        : null;

      gameState.value = new GameState(
        gameMode,
        playerColor,
        bitBoard,
        animationManager,
        cpuManager
      );

      bitBoard.initialize();
      showHints.value = true;

      /* --------------------------------------------------------------
       * 先手が CPU の場合は直ちに 1 手打たせる
       * -------------------------------------------------------------- */
      await nextTick();
      if (gameState.value.isCpuTurn(playerColor)) {
        gameState.value.isCpuThinking = true;
        await gameState.value.handleCpuTurn();
        gameState.value.isCpuThinking = false;
        showHints.value = true;
      }
    } catch (err) {
      console.error('ゲームの初期化に失敗しました:', err);
    }
  }

  /* ------------------------------------------------------------------
   * UI から呼ばれるメソッド
   * ---------------------------------------------------------------- */
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

  async function handleCellClick({ row, col }) {
    if (!isValidMove(row, col)) return;

    showHints.value = false;
    await gameState.value.placePiece(row, col);
    // showHints は watch(isPlayerTurn) で自動更新
  }

  /* ------------------------------------------------------------------
   * 表示用ユーティリティ
   * ---------------------------------------------------------------- */
  function hasPiece({ row, col }) {
    return gameState.value?.bitBoard?.getPiece(row, col) || false;
  }

  function pieceClasses(color) {
    return {
      'piece-black' : color === 'black',
      'piece-white' : color === 'white'
    };
  }

  function cellPieceClasses({ row, col }) {
    if (!gameState.value?.bitBoard) return {};
    const color      = gameState.value.bitBoard.getPiece(row, col);
    const isFlipping = gameState.value.animationManager.isPieceFlipping(row, col);
    return {
      [`piece-${color}`]       : !isFlipping,
      [`flipping-to-${color}`] : isFlipping
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

  /* ------------------------------------------------------------------
   * composable が返す API
   * ---------------------------------------------------------------- */
  return {
    /* state */
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

    /* methods */
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
