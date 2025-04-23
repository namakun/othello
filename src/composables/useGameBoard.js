// src/composables/useGameBoard.js
import { ref, computed, watch, nextTick } from "vue";
import { BitBoard } from "@/utils/wasmBitBoard";
import { GameState } from "@/utils/game/GameState";
import { AnimationManager } from "@/utils/game/AnimationManager";
import { CPUManager } from "@/utils/game/CPUManager";
import { wasmReady } from "@/utils/wasmLoader";

export function useGameBoard(gameMode, initialPlayerColor) {
  // ────────── State ──────────
  const gameState = ref(null);
  const showColorSelection = ref(false);
  const currentPlayerColor = ref(initialPlayerColor.value);
  const showHints = ref(true);

  // 合法手ビットボードのキャッシュ
  const legalMovesBB = ref(0n);

  // Watch：プレイヤー色が変わったら同期
  watch(initialPlayerColor, (newColor) => {
    currentPlayerColor.value = newColor;
  });

  // ────────── Board Display ──────────
  // UI はこれだけを参照して駒を描画する
  const displayBoard = computed(() => (gameState.value ? gameState.value.displayBoard : Array.from({ length: 8 }, () => Array(8).fill(null))));

  // ────────── Scoring ──────────
  const blackScore = computed(() => gameState.value?.bitBoard.getScore().black ?? 2);
  const whiteScore = computed(() => gameState.value?.bitBoard.getScore().white ?? 2);

  // ────────── Turn State ──────────
  const playerColorInGame = computed(() => {
    if (!gameState.value) return null;
    return gameState.value.isCpuMode() ? currentPlayerColor.value || initialPlayerColor.value : gameState.value.activePlayer;
  });
  const opponentColor = computed(() => (playerColorInGame.value === "black" ? "white" : "black"));
  const isCpuTurn = computed(() => gameState.value?.isCpuTurn(playerColorInGame.value) ?? false);
  const isPlayerTurn = computed(() => !isCpuTurn.value);

  // ────────── Labels ──────────
  const currentPlayerLabel = computed(() => colorLabel(isCpuTurn.value ? opponentColor.value : playerColorInGame.value));
  const winnerLabel = computed(() => {
    if (!gameState.value?.winner) return "";
    if (gameState.value.winner === "Draw") return "引き分け";
    return colorLabel(gameState.value.winner.toLowerCase());
  });
  const playerScore = computed(() => (playerColorInGame.value === "black" ? blackScore.value : whiteScore.value));
  const opponentScore = computed(() => (playerColorInGame.value === "black" ? whiteScore.value : blackScore.value));

  // ────────── Legal Moves Cache ──────────
  function updateLegalMoves() {
    if (!gameState.value) {
      legalMovesBB.value = 0n;
    } else {
      legalMovesBB.value = gameState.value.bitBoard.getLegalMovesBitboard(gameState.value.activePlayer);
    }
  }
  watch(() => gameState.value && gameState.value.activePlayer, updateLegalMoves, { immediate: true });

  /** 合法手判定（ビット演算のみ） */
  function isValidMove(row, col) {
    if (!showHints.value || gameState.value.showPassMessage || !isPlayerTurn.value) return false;
    const pos = BigInt(row * 8 + col);
    return (legalMovesBB.value & (1n << pos)) !== 0n;
  }

  // ────────── Initialize ──────────
  async function initializeGame() {
    try {
      await wasmReady.catch(() => {}); // WASM 読込待ち(失敗可)

      showColorSelection.value = false;

      const bitBoard = new BitBoard();
      const animationManager = new AnimationManager();
      const playerColor = currentPlayerColor.value || initialPlayerColor.value;
      const cpuManager = gameMode.startsWith("cpu-") ? new CPUManager(bitBoard, gameMode, playerColor) : null;

      gameState.value = new GameState(gameMode, playerColor, bitBoard, animationManager, cpuManager);

      showHints.value = true;

      // 必要なら CPU 初手
      await nextTick();
      if (gameState.value.isCpuTurn(playerColor)) {
        gameState.value.isCpuThinking = true;
        await gameState.value.handleCpuTurn();
        gameState.value.isCpuThinking = false;
        showHints.value = true;
      }
    } catch (err) {
      console.error("ゲームの初期化に失敗しました:", err);
    }
  }

  // ────────── Cell Click ──────────
  async function handleCellClick({ row, col }) {
    if (!isValidMove(row, col)) return;
    showHints.value = false;
    await gameState.value.placePiece(row, col);
    if (isPlayerTurn.value && !gameState.value.showPassMessage) {
      showHints.value = true;
    }
  }

  // ────────── Helpers ──────────
  function handleRestart() {
    if (gameState.value.isCpuMode()) showColorSelection.value = true;
    else initializeGame();
  }
  function handleColorSelected(color) {
    showColorSelection.value = false;
    currentPlayerColor.value = color;
    initializeGame();
  }

  /** そのマスに駒があるか（displayBoard 参照） */
  function hasPiece({ row, col }) {
    return !!displayBoard.value[row][col];
  }
  /** 駒の基本クラス（黒 or 白） */
  function pieceClasses(color) {
    return {
      "piece-black": color === "black",
      "piece-white": color === "white",
    };
  }
  /** セルのクラス（反転アニメ or 最終色） */
  function cellPieceClasses({ row, col }) {
    // 1) アニメーション中は flippingPieces を優先
    const flipInfo = gameState.value.animationManager.getFlippingPiece(row, col);
    if (flipInfo) {
      return {
        [`piece-${flipInfo.fromColor}`]: true,
        [`flipping-to-${flipInfo.toColor}`]: true,
      };
    }
    // 2) 通常は displayBoard の色
    const color = displayBoard.value[row][col];
    return { [`piece-${color}`]: Boolean(color) };
  }
  function colorLabel(color) {
    return { black: "黒", white: "白" }[color] || "不明";
  }
  function getCellClasses(row, col) {
    return { "valid-move": isValidMove(row, col) };
  }

  return {
    // state
    gameState,
    displayBoard,
    showColorSelection,
    playerColorInGame,
    opponentColor,
    isCpuTurn,
    isPlayerTurn,
    currentPlayerLabel,
    winnerLabel,
    playerScore,
    opponentScore,

    // actions
    initializeGame,
    handleCellClick,
    handleRestart,
    handleColorSelected,

    // utils
    isValidMove,
    hasPiece,
    pieceClasses,
    cellPieceClasses,
    colorLabel,
    getCellClasses,
  };
}
