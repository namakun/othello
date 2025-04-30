/* tslint:disable */
/* eslint-disable */
/**
 * パニック時にブラウザコンソールにエラーを表示するためのフック設定
 */
export function init_panic_hook(): void;
/**
 * 合法手ビットボード生成
 * @param p 自分の石のビットボード
 * @param o 相手の石のビットボード
 * @return 合法手のビットボード
 */
export function gen_legal_moves(p: bigint, o: bigint): bigint;
/**
 * 方向別「反転 index 配列」を Array<Uint8Array> で返す
 * @param p 自分の石のビットボード
 * @param o 相手の石のビットボード
 * @param pos 着手位置
 * @return 方向別の反転インデックス配列
 */
export function gen_flip_groups(p: bigint, o: bigint, pos: number): Array<any>;
/**
 * 着手適用（反転も含めた次盤面を返す）
 * @param p 自分の石のビットボード
 * @param o 相手の石のビットボード
 * @param pos 着手位置
 * @return [新しい自分の石のビットボード, 新しい相手の石のビットボード]
 */
export function apply_move(p: bigint, o: bigint, pos: number): BigUint64Array;
/**
 * 石数 (スコア) を数える
 * @param x ビットボード
 * @return 立っているビットの数
 */
export function popcnt64(x: bigint): number;
/**
 * 合法手が存在するか
 * @param p 自分の石のビットボード
 * @param o 相手の石のビットボード
 * @return 合法手が存在する場合true
 */
export function has_moves(p: bigint, o: bigint): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly init_panic_hook: () => void;
  readonly gen_legal_moves: (a: bigint, b: bigint) => bigint;
  readonly gen_flip_groups: (a: bigint, b: bigint, c: number) => any;
  readonly apply_move: (a: bigint, b: bigint, c: number) => [number, number];
  readonly popcnt64: (a: bigint) => number;
  readonly has_moves: (a: bigint, b: bigint) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
