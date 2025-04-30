//! wasm/src/lib.rs
//! オセロのビットボードロジックを実装したRustモジュール
//! WebAssemblyにコンパイルされ、JavaScriptから呼び出される
use wasm_bindgen::prelude::*;
use js_sys::{Array, Uint8Array};
use console_error_panic_hook;

/// パニック時にブラウザコンソールにエラーを表示するためのフック設定
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// 8方向の移動量（インデックス差分）
/// 上下左右と斜め4方向の計8方向
const DIRS: [i32; 8] = [ 8, -8,  1, -1,  9,  7, -7, -9 ];

/// Hファイル（右端）を除外するマスク
const NOT_H: u64 = 0xfefefefefefefefe;

/// Aファイル（左端）を除外するマスク
const NOT_A: u64 = 0x7f7f7f7f7f7f7f7f;

/// 各方向のエッジマスク
/// 方向によって端のチェックが必要な場合に使用
const MASKS: [u64; 8] = [ !0, !0, NOT_H, NOT_A, NOT_H, NOT_A, NOT_H, NOT_A ];

/// ビットシフト関数（正: 左シフト, 負: 右シフト）
/// @param x シフトする値
/// @param d シフト量（正負の値）
/// @return シフト後の値
#[inline(always)]
fn shift(x: u64, d: i32) -> u64 {
    if d > 0 { x << d } else { x >> ((-d) as u32) }
}

/// １方向の反転列計算 (Kogge-Stone法)
/// @param mask 着手位置のマスク
/// @param p 自分の石のビットボード
/// @param o 相手の石のビットボード
/// @param idx 方向インデックス
/// @return 反転する石のビットマスク
#[inline(always)]
fn kogge_stone_flips(mask: u64, p: u64, o: u64, idx: usize) -> u64 {
    let d = DIRS[idx];
    let msk = MASKS[idx];

    let mut flips = 0u64;
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

/// ８方向すべての反転マスクを集計
/// @param p 自分の石のビットボード
/// @param o 相手の石のビットボード
/// @param pos 着手位置
/// @return 反転する石のビットマスク
#[inline(always)]
fn compute_flip_mask(p: u64, o: u64, pos: u32) -> u64 {
    let mask = 1u64 << pos;
    DIRS.iter()
        .enumerate()
        .map(|(i, _)| kogge_stone_flips(mask, p, o, i))
        .fold(0u64, |acc, f| acc | f)
}

/// 合法手ビットボード生成
/// @param p 自分の石のビットボード
/// @param o 相手の石のビットボード
/// @return 合法手のビットボード
#[wasm_bindgen]
pub fn gen_legal_moves(p: u64, o: u64) -> u64 {
    let blank = !(p | o);
    let mut moves = 0u64;

    for i in 0..8 {
        let d = DIRS[i];
        let msk = MASKS[i];

        let mut flips = 0u64;
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

/// 方向別「反転 index 配列」を Array<Uint8Array> で返す
/// @param p 自分の石のビットボード
/// @param o 相手の石のビットボード
/// @param pos 着手位置
/// @return 方向別の反転インデックス配列
#[wasm_bindgen]
pub fn gen_flip_groups(p: u64, o: u64, pos: u32) -> Array {
    let mask = 1u64 << pos;
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
/// @param p 自分の石のビットボード
/// @param o 相手の石のビットボード
/// @param pos 着手位置
/// @return [新しい自分の石のビットボード, 新しい相手の石のビットボード]
#[wasm_bindgen]
pub fn apply_move(p: u64, o: u64, pos: u32) -> Vec<u64> {
    let flip_mask = compute_flip_mask(p, o, pos);
    let m = 1u64 << pos;

    let new_p = p | m | flip_mask;
    let new_o = o & !(m | flip_mask);

    vec![new_p, new_o]
}

/// 石数 (スコア) を数える
/// @param x ビットボード
/// @return 立っているビットの数
#[wasm_bindgen]
pub fn popcnt64(x: u64) -> u32 { x.count_ones() }

/// 合法手が存在するか
/// @param p 自分の石のビットボード
/// @param o 相手の石のビットボード
/// @return 合法手が存在する場合true
#[wasm_bindgen]
pub fn has_moves(p: u64, o: u64) -> bool { gen_legal_moves(p, o) != 0 }
