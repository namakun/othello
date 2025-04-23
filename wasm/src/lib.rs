use wasm_bindgen::prelude::*;
use console_error_panic_hook;

// １）パニックフック
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

// ２）定数定義
const DIRS: [i32; 8] = [ 8, -8,  1, -1,  9,  7, -7, -9 ];
const NOT_H: u64      = 0xfefefefefefefefe;
const NOT_A: u64      = 0x7f7f7f7f7f7f7f7f;
const MASKS: [u64; 8] = [ !0, !0, NOT_H, NOT_A, NOT_H, NOT_A, NOT_H, NOT_A ];

// ビットシフト（正: 左シフト, 負: 右シフト）
#[inline(always)]
fn shift(x: u64, d: i32) -> u64 {
    if d > 0 { x << d } else { x >> ((-d) as u32) }
}

/// １方向における Kogge‑Stone 伝搬で反転ビット列を計算（最大6ステップ保証）
#[inline(always)]
fn kogge_stone_flips(mask: u64, p: u64, o: u64, idx: usize) -> u64 {
    let d   = DIRS[idx];
    let msk = MASKS[idx];
    let mut flips     = 0u64;
    let mut candidate = shift(mask, d) & msk & o;
    for _ in 0..6 {
        if candidate == 0 { break; }
        flips |= candidate;
        let next = shift(candidate, d) & msk & o;
        if next == 0 { break; }
        candidate = next;
    }
    // 両端が自石なら返却、それ以外は 0
    if (shift(candidate, d) & msk & p) != 0 { flips } else { 0 }
}

/// 全方向（８方向）の反転ビット列を OR 集計して返すヘルパー
#[inline(always)]
fn compute_flip_mask(p: u64, o: u64, pos: u32) -> u64 {
    let mask = 1u64 << pos;
    DIRS.iter()
        .enumerate()
        .map(|(i, _)| kogge_stone_flips(mask, p, o, i))
        .fold(0u64, |acc, f| acc | f)
}

#[wasm_bindgen]
/// 自石 P, 相手石 O から合法手ビットボードを返す
pub fn gen_legal_moves(p: u64, o: u64) -> u64 {
    let blank = !(p | o);
    let mut moves = 0u64;
    for i in 0..8 {
        let d   = DIRS[i];
        let msk = MASKS[i];
        let mut flips     = 0u64;
        let mut candidate = shift(p, d) & msk & o;
        for _ in 0..6 {
            if candidate == 0 { break; }
            flips |= candidate;
            let next = shift(candidate, d) & msk & o;
            if next == 0 { break; }
            candidate = next;
        }
        moves |= shift(flips, d) & msk & blank;
    }
    moves
}

#[wasm_bindgen]
/// pos(0–63) に石を置いたときの各方向反転ビット列を 8 要素 Vec<u64> で返す
pub fn gen_flip_bitboards(p: u64, o: u64, pos: u32) -> Vec<u64> {
    let mask = 1u64 << pos;
    DIRS.iter()
        .enumerate()
        .map(|(i, _)| kogge_stone_flips(mask, p, o, i))
        .collect()
}

#[wasm_bindgen]
/// 自石 P, 相手 O, pos に対する適用後の [新P, 新O] を Vec<u64> で返す
pub fn apply_move(p: u64, o: u64, pos: u32) -> Vec<u64> {
    let flip_mask = compute_flip_mask(p, o, pos);
    let m         = 1u64 << pos;
    let new_p     = p | m | flip_mask;
    let new_o     = o & !(m | flip_mask);
    vec![new_p, new_o]
}

#[wasm_bindgen]
/// ビットカウント（スコア計算用）
pub fn popcnt64(x: u64) -> u32 {
    x.count_ones()
}

#[wasm_bindgen]
/// 合法手の有無
pub fn has_moves(p: u64, o: u64) -> bool {
    gen_legal_moves(p, o) != 0
}
