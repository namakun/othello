import { shallowMount } from '@vue/test-utils';
import GameBoard from '@/components/GameBoard.vue';

describe('GameBoard.vue', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallowMount(GameBoard, {
      propsData: {
        gameMode: 'offline',
        playerColor: 'black'
      }
    });
  });

  describe('Initial State', () => {
    it('initializes with correct board setup', () => {
      const board = wrapper.vm.board;
      // 中央の4マスの初期配置をチェック
      expect(board[3][3]).toBe('white');
      expect(board[3][4]).toBe('black');
      expect(board[4][3]).toBe('black');
      expect(board[4][4]).toBe('white');
    });

    it('starts with black player', () => {
      expect(wrapper.vm.activePlayer).toBe('black');
    });

    it('starts with correct score', () => {
      expect(wrapper.vm.blackScore).toBe(2);
      expect(wrapper.vm.whiteScore).toBe(2);
    });
  });

  describe('Game Logic', () => {
    it('validates moves correctly', () => {
      // 有効な手の検証
      expect(wrapper.vm.isValidMove(3, 2)).toBe(true);
      expect(wrapper.vm.isValidMove(2, 3)).toBe(true);
      expect(wrapper.vm.isValidMove(4, 5)).toBe(true);
      expect(wrapper.vm.isValidMove(5, 4)).toBe(true);

      // 無効な手の検証
      expect(wrapper.vm.isValidMove(0, 0)).toBe(false);
      expect(wrapper.vm.isValidMove(3, 3)).toBe(false); // 既に駒がある場所
    });

    it('flips pieces correctly', () => {
      // 駒を配置して反転をテスト
      wrapper.vm.handleCellClick(3, 2);
      const board = wrapper.vm.board;
      expect(board[3][2]).toBe('black'); // 配置した駒
      expect(board[3][3]).toBe('black'); // 反転した駒
    });

    it('switches turns correctly', () => {
      wrapper.vm.handleCellClick(3, 2);
      expect(wrapper.vm.activePlayer).toBe('white');
    });
  });

  describe('CPU Mode', () => {
    beforeEach(() => {
      wrapper = shallowMount(GameBoard, {
        propsData: {
          gameMode: 'cpu-weak',
          playerColor: 'white'
        }
      });
    });

    it('CPU makes first move when player is white', () => {
      // CPUの初手（黒）が自動的に打たれているか確認
      const board = wrapper.vm.board;
      const blackCount = board.flat().filter(cell => cell === 'black').length;
      expect(blackCount).toBe(3); // 初期配置の2個 + CPUの打った1個
    });

    it('CPU makes valid moves', () => {
      const validMovesBefore = wrapper.vm.board.flat().filter(cell => cell !== null).length;
      wrapper.vm.handleCpuTurn();
      const validMovesAfter = wrapper.vm.board.flat().filter(cell => cell !== null).length;
      expect(validMovesAfter).toBe(validMovesBefore + 1);
    });
  });

  describe('Game End', () => {
    it('detects game end correctly', () => {
      // ゲーム終了状態を作成
      wrapper.vm.board = Array(8).fill(null).map(() => Array(8).fill('black'));
      wrapper.vm.board[7][7] = null;
      wrapper.vm.activePlayer = 'white';

      // 最後の手を打つ
      wrapper.vm.handleCellClick(7, 7);

      expect(wrapper.vm.isGameOver).toBe(true);
      expect(wrapper.vm.winner).toBe('Black');
    });
  });
});
