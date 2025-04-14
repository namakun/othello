import { BitBoard } from '@/utils/BitBoard';

describe('BitBoard', () => {
  let board;
  const hasBigInt = typeof BigInt !== 'undefined';

  // BigIntのモック（必要な場合）
  if (!hasBigInt) {
    global.BigInt = (n) => n;
  }

  beforeEach(() => {
    board = new BitBoard();
  });

  describe('Initial State', () => {
    it('initializes with correct piece placement', () => {
      expect(board.getPiece(3, 3)).toBe('white');  // D4
      expect(board.getPiece(3, 4)).toBe('black');  // D5
      expect(board.getPiece(4, 3)).toBe('black');  // E4
      expect(board.getPiece(4, 4)).toBe('white');  // E5
    });

    it('starts with correct score', () => {
      const score = board.getScore();
      expect(score.black).toBe(2);
      expect(score.white).toBe(2);
    });

    it('has valid moves for black', () => {
      expect(board.hasValidMoves(true)).toBe(true);
    });
  });

  describe('Move Validation', () => {
    it('validates moves correctly for black', () => {
      // 有効な手
      expect(board.isValidMove(3, 2, true)).toBe(true);  // D3
      expect(board.isValidMove(2, 3, true)).toBe(true);  // C4
      expect(board.isValidMove(4, 5, true)).toBe(true);  // E6
      expect(board.isValidMove(5, 4, true)).toBe(true);  // F5

      // 無効な手
      expect(board.isValidMove(0, 0, true)).toBe(false); // A1
      expect(board.isValidMove(3, 3, true)).toBe(false); // 既に駒がある場所
    });

    it('validates moves correctly for white', () => {
      // 最初の黒の手を打つ
      board.placePiece(3, 2, true);

      // 白の有効な手
      expect(board.isValidMove(2, 2, false)).toBe(true);
      expect(board.isValidMove(4, 2, false)).toBe(true);

      // 無効な手
      expect(board.isValidMove(0, 0, false)).toBe(false);
      expect(board.isValidMove(3, 2, false)).toBe(false);
    });
  });

  describe('Piece Placement and Flipping', () => {
    it('flips pieces correctly when placing a piece', () => {
      // 黒を(3,2)に置く
      const flipped = board.placePiece(3, 2, true);

      // 反転した駒の位置を確認
      expect(flipped).toHaveLength(1);
      expect(flipped[0]).toEqual({ row: 3, col: 3 });

      // 盤面の状態を確認
      expect(board.getPiece(3, 2)).toBe('black');  // 置いた駒
      expect(board.getPiece(3, 3)).toBe('black');  // 反転した駒
    });

    it('updates score correctly after placing pieces', () => {
      board.placePiece(3, 2, true);  // 黒を置く

      const score = board.getScore();
      expect(score.black).toBe(4);  // 2 + 2 (置いた駒 + 反転した駒)
      expect(score.white).toBe(1);  // 2 - 1 (反転された駒)
    });
  });

  describe('Game Progress', () => {
    it('detects when no valid moves are available', () => {
      // 盤面を特定の状態に設定（全て黒で埋める）
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (!board.getPiece(row, col)) {
            board.placePiece(row, col, true);
          }
        }
      }

      expect(board.hasValidMoves(true)).toBe(false);
      expect(board.hasValidMoves(false)).toBe(false);
    });

    it('maintains board state correctly through multiple moves', () => {
      // 一連の手を打つ
      board.placePiece(3, 2, true);   // 黒
      board.placePiece(2, 2, false);  // 白
      board.placePiece(1, 2, true);   // 黒

      // 盤面の状態を確認
      const state = board.getBoard();
      expect(state[1][2]).toBe('black');
      expect(state[2][2]).toBe('white');
      expect(state[3][2]).toBe('black');
    });
  });

  describe('Board Representation', () => {
    it('converts between bit board and 2D array correctly', () => {
      const state = board.getBoard();

      // 初期配置を確認
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if ((row === 3 && col === 3) || (row === 4 && col === 4)) {
            expect(state[row][col]).toBe('white');
          } else if ((row === 3 && col === 4) || (row === 4 && col === 3)) {
            expect(state[row][col]).toBe('black');
          } else {
            expect(state[row][col]).toBe(null);
          }
        }
      }
    });
  });

  describe('Environment Support', () => {
    it('handles environments with and without BigInt support', () => {
      const newBoard = new BitBoard();
      expect(newBoard.blackBoard).toBeDefined();
      expect(newBoard.whiteBoard).toBeDefined();

      // 初期状態で4つの駒が配置されていることを確認
      const score = newBoard.getScore();
      expect(score.black).toBe(2);
      expect(score.white).toBe(2);

      // 有効な手が存在することを確認
      expect(newBoard.hasValidMoves(true)).toBe(true);

      // 駒を置いて反転できることを確認
      const flipped = newBoard.placePiece(3, 2, true);
      expect(flipped).toHaveLength(1);
      expect(flipped[0]).toEqual({ row: 3, col: 3 });
    });

    it('maintains correct board state regardless of BigInt support', () => {
      const moves = [
        { row: 3, col: 2, isBlack: true },
        { row: 2, col: 2, isBlack: false },
        { row: 1, col: 2, isBlack: true }
      ];

      moves.forEach(move => {
        board.placePiece(move.row, move.col, move.isBlack);
      });

      const state = board.getBoard();
      expect(state[1][2]).toBe('black');
      expect(state[2][2]).toBe('white');
      expect(state[3][2]).toBe('black');
    });
  });
});
