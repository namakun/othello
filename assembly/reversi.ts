// assembly/reversi.ts   ★差し替え版★
const ONE: u64  = 1;
const ZERO: u64 = 0;

// ±方向シフト量（i32 に変更）
const DIRS: StaticArray<i32> = [ 8, -8, 1, -1, 9, 7, -7, -9 ];

// 境界マスク（右列 H が 0… など）  ↑  ↓   →   ←   ↘   ↙   ↗   ↖
const MASKS: StaticArray<u64> = [
  ~ZERO, ~ZERO,
  0xfefefefefefefefe, 0x7f7f7f7f7f7f7f7f,
  0xfefefefefefefefe, 0x7f7f7f7f7f7f7f7f,
  0xfefefefefefefefe, 0x7f7f7f7f7f7f7f7f,
];

// ────────────────── 共通関数 ──────────────────
@inline
function shlshr(x: u64, d: i32): u64 {           // 符号付きシフト
  return d > 0 ? x << d : x >> (-d as u32);
}

// ─────────── 合法手生成 ───────────
export function genLegalMoves64(P: u64, O: u64): u64 {
  const blank: u64 = ~(P | O);
  let moves: u64 = ZERO;

  for (let i = 0; i < 8; i++) {
    const d = DIRS[i], m = MASKS[i];
    let x: u64 = shlshr(P, d) & m & O;

    // Kogge‑Stone 伝搬（6 回）
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;

    moves |= shlshr(x, d) & m & blank;
  }
  return moves;
}

// ─────────── 着手適用（自分側）───────────
export function applyMoveP(P: u64, O: u64, pos: u32): u64 {
  const M: u64 = ONE << <u64>pos;
  let flip: u64 = ZERO;

  for (let i = 0; i < 8; i++) {
    const d = DIRS[i], m = MASKS[i];
    let x: u64 = shlshr(M, d) & m & O;

    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;

    if (shlshr(x, d) & m & P) flip |= x;
  }
  return P | M | flip;
}

// ─────────── 着手適用（相手側更新用）────────
export function applyMoveO(P: u64, O: u64, pos: u32): u64 {
  const M: u64 = ONE << <u64>pos;
  let flip: u64 = ZERO;

  for (let i = 0; i < 8; i++) {
    const d = DIRS[i], m = MASKS[i];
    let x: u64 = shlshr(M, d) & m & O;

    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;
    x |= shlshr(x, d) & m & O;

    if (shlshr(x, d) & m & P) flip |= x;
  }
  return O & ~(M | flip);
}
