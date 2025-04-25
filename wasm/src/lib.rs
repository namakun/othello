// File: crates/reversi/src/lib.rs
use wasm_bindgen::prelude::*;
use js_sys::{Array, Uint8Array};
use console_error_panic_hook;

/*─────────────────────────────────────────────*
 *  1. 初期化                                   *
 *─────────────────────────────────────────────*/
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/*─────────────────────────────────────────────*
 *  2. 盤面定数／ヘルパ                         *
 *─────────────────────────────────────────────*/
const DIRS: [i32; 8] = [ 8, -8,  1, -1,  9,  7, -7, -9 ];
const NOT_H: u64     = 0xfefefefefefefefe;   // H ファイルを除外
const NOT_A: u64     = 0x7f7f7f7f7f7f7f7f;   // A ファイルを除外
const MASKS: [u64; 8] = [ !0, !0, NOT_H, NOT_A, NOT_H, NOT_A, NOT_H, NOT_A ];

// ビットシフト（正: 左シフト, 負: 右シフト）
#[inline(always)]
fn shift(x: u64, d: i32) -> u64 {
    if d > 0 { x << d } else { x >> ((-d) as u32) }
}

/*─────────────────────────────────────────────*
 *  3. １方向の反転列計算 (Kogge-Stone 法)       *
 *─────────────────────────────────────────────*/
#[inline(always)]
fn kogge_stone_flips(mask: u64, p: u64, o: u64, idx: usize) -> u64 {
    let d   = DIRS[idx];
    let msk = MASKS[idx];

    let mut flips     = 0u64;
    let mut candidate = shift(mask, d) & msk & o;

    // 最大６ステップ (盤端まで) を前提にループ
    for _ in 0..6 {
        if candidate == 0 { break; }
        flips |= candidate;

        let next = shift(candidate, d) & msk & o;
        if next == 0 { break; }
        candidate = next;
    }

    // 両端が自石で挟めたときだけ flips を返す
    if (shift(candidate, d) & msk & p) != 0 { flips } else { 0 }
}

/*─────────────────────────────────────────────*
 *  4. ８方向すべての反転マスクを集計           *
 *─────────────────────────────────────────────*/
#[inline(always)]
fn compute_flip_mask(p: u64, o: u64, pos: u32) -> u64 {
    let mask = 1u64 << pos;
    DIRS.iter()
        .enumerate()
        .map(|(i, _)| kogge_stone_flips(mask, p, o, i))
        .fold(0u64, |acc, f| acc | f)
}

/*─────────────────────────────────────────────*
 *  5. 公開 API (wasm_bindgen)                  *
 *─────────────────────────────────────────────*/

/// 合法手ビットボード生成
#[wasm_bindgen]
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

/// 方向別「反転ビットマスク」を Vec<u64> で返す（旧 API）
/// TODO Deprecate
#[wasm_bindgen]
pub fn gen_flip_bitboards(p: u64, o: u64, pos: u32) -> Vec<u64> {
    let mask = 1u64 << pos;
    DIRS.iter()
        .enumerate()
        .map(|(i, _)| kogge_stone_flips(mask, p, o, i))
        .collect()
}

/// ★新 API: 方向別「反転 index 配列」を Array<Uint8Array> で返す
#[wasm_bindgen]
pub fn gen_flip_groups(p: u64, o: u64, pos: u32) -> Array {
    let mask  = 1u64 << pos;
    let jsarr = Array::new();

    for dir_idx in 0..8 {
        let flips = kogge_stone_flips(mask, p, o, dir_idx);

        // 各ビット → index (0–63) を収集
        let mut v: Vec<u8> = Vec::new();
        let mut bits = flips;
        while bits != 0 {
            let lsb = bits & (!bits + 1);
            v.push(lsb.trailing_zeros() as u8);
            bits &= bits - 1;
        }
        jsarr.push(&Uint8Array::from(&v[..]));
    }
    jsarr
}

/// 着手適用（反転も含めた次盤面を返す）
#[wasm_bindgen]
pub fn apply_move(p: u64, o: u64, pos: u32) -> Vec<u64> {
    let flip_mask = compute_flip_mask(p, o, pos);
    let m         = 1u64 << pos;

    let new_p = p | m | flip_mask;
    let new_o = o & !(m | flip_mask);

    vec![new_p, new_o]
}

/// 石数 (スコア) を数える
#[wasm_bindgen]
pub fn popcnt64(x: u64) -> u32 { x.count_ones() }

/// 合法手が存在するか
#[wasm_bindgen]
pub fn has_moves(p: u64, o: u64) -> bool { gen_legal_moves(p, o) != 0 }
