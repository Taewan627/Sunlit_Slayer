
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface EnemyRadarPos {
  id: number;
  relX: number; // 플레이어 기준 상대 X (-1 ~ 1)
  relY: number; // 플레이어 기준 상대 Y (-1 ~ 1)
  dist: number;
}

export interface Zombie {
  id: string;
  position: Vector3;
  health: number;
  speed: number;
  active: boolean;
}

export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  WAVE_CLEAR = 'WAVE_CLEAR',
  GAMEOVER = 'GAMEOVER',
  VICTORY = 'VICTORY'
}

export interface GameState {
  score: number;
  wave: number;
  hp: number;
  ammo: number;
  status: GameStatus;
  zombieCount: number;
  totalZombiesInWave: number;
}
