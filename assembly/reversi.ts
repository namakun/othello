// assembly/reversi.ts
// —————————————————————————— 定数 ——————————————————————————
const ONE:  u64 = 1;
const ZERO: u64 = 0;

// 方向シフト量  (正=左シフト, 負=右シフト)
const DIRS: StaticArray<i32> = [ 8, -8, 1, -1, 9, 7, -7, -9 ];

// ファイル境界マスク
const NOT_FILE_H: u64 = 0xfefefefefefefefe;
const NOT_FILE_A: u64 = 0x7f7f7f7f7f7f7f7f;
/* DIRS と同順                       ↑    ↓    →        ←        ↗        ↖        ↘        ↙ */
const MASKS: StaticArray<u64> = [ ~ZERO, ~ZERO, NOT_FILE_H, NOT_FILE_A, NOT_FILE_H, NOT_FILE_A, NOT_FILE_H, NOT_FILE_A ];

// —————————————————————————— ヘルパ ——————————————————————————
@inline
function shift(x: u64, d: i32): u64 {     // 符号付きシフト
  return d > 0 ? x << (d as u32) : x >> ((-d) as u32);
}

/** １方向だけのフリップ集合を返す（端が自石でない場合は 0） */
@inline
function computeFlipsDir(M: u64, P: u64, O: u64, i: i32): u64 {
  const d = DIRS[i], m = MASKS[i];
  let x: u64 = shift(M, d) & m & O;

  // Kogge‑Stone 伝搬（早期終了）
  while (x != ZERO) {
    const nx = shift(x, d) & m & O;
    if (nx == ZERO) break;
    x |= nx;
  }
  return (shift(x, d) & m & P) != ZERO ? x : ZERO;
}

/** ８方向まとめてフリップ集合を返す（JS へ渡す用） */
export function genFlipBitboards(P: u64, O: u64, pos: u32): StaticArray<u64> {
  const M = ONE << (<u64>pos);
  const out = new StaticArray<u64>(8);
  for (let i: i32 = 0; i < 8; i++) {
    out[i] = computeFlipsDir(M, P, O, i);
  }
  return out;
}

// —————————————————————————— 合法手生成 ——————————————————————————
@inline
export function genLegalMoves64(P: u64, O: u64): u64 {
  const blank: u64 = ~(P | O);
  let moves: u64 = ZERO;

  for (let i: i32 = 0; i < 8; i++) {
    const d = DIRS[i], m = MASKS[i];
    let x: u64 = shift(P, d) & m & O;
    while (x != ZERO) {
      const nx = shift(x, d) & m & O;
      if (nx == ZERO) break;
      x |= nx;
    }
    moves |= shift(x, d) & m & blank;
  }
  return moves;
}

// —————————————————————————— 着手適用 ——————————————————————————
@inline
function computeFlips(M: u64, P: u64, O: u64): u64 {
  let flip: u64 = ZERO;
  for (let i: i32 = 0; i < 8; i++) flip |= computeFlipsDir(M, P, O, i);
  return flip;
}

@inline
export function applyMoveP(P: u64, O: u64, pos: u32): u64 {
  const M = ONE << (<u64>pos);
  return P | M | computeFlips(M, P, O);
}

@inline
export function applyMoveO(P: u64, O: u64, pos: u32): u64 {
  const M = ONE << (<u64>pos);
  return O & ~(M | computeFlips(M, P, O));
}
