import { Rotation } from '../logic/types';

/**
 * ゲームアクション型定義
 * 入力層から発行されるアクション
 */
export type GameAction =
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'ROTATE_CW' }      // 時計回り
  | { type: 'ROTATE_CCW' }     // 反時計回り
  | { type: 'SOFT_DROP' }      // 1段落下
  | { type: 'HARD_DROP' }      // 即落下
  | { type: 'START_GAME' }     // ゲーム開始
  | { type: 'RESTART_GAME' }   // リスタート
  | { type: 'SET_COLUMN'; column: number }  // 軸ぷよの列を直接設定
  | { type: 'SET_ROTATION'; rotation: Rotation };  // 回転状態を直接設定
