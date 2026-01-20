
import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameWorld from './components/GameWorld';
import HUD from './components/HUD';
import { GameStatus, GameState, EnemyRadarPos } from './types';
import { getCommanderMessage } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState & { isReloading: boolean; lastHitTime: number }>({
    score: 0,
    wave: 1,
    hp: 100,
    ammo: 50,
    status: GameStatus.START,
    zombieCount: 3,
    totalZombiesInWave: 3,
    isReloading: false,
    lastHitTime: 0
  });

  const [radarEnemies, setRadarEnemies] = useState<EnemyRadarPos[]>([]);
  const [commanderMsg, setCommanderMsg] = useState<string>("HQ: Area identified. Deploy when ready.");
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, []);

  // 상태 변화 시 자동 잠금 해제
  useEffect(() => {
    const shouldRelease = 
      gameState.status === GameStatus.WAVE_CLEAR || 
      gameState.status === GameStatus.GAMEOVER || 
      gameState.status === GameStatus.VICTORY ||
      gameState.status === GameStatus.START;

    if (shouldRelease && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [gameState.status]);

  const requestLock = useCallback(() => {
    if (document.pointerLockElement) return;
    document.body.requestPointerLock();
  }, []);

  const startGame = useCallback(async () => {
    setGameState(prev => ({ 
      ...prev, 
      status: GameStatus.PLAYING,
      wave: 1,
      hp: 100,
      score: 0,
      ammo: 50,
      zombieCount: 3,
      totalZombiesInWave: 3,
      isReloading: false
    }));
    requestLock();
    const msg = await getCommanderMessage(1, "START");
    setCommanderMsg(msg);
  }, [requestLock]);

  const nextWave = useCallback(async () => {
    const newWave = gameState.wave + 1;
    if (newWave > 10) {
      setGameState(prev => ({ ...prev, status: GameStatus.VICTORY }));
      return;
    }
    
    const nextTotal = Math.max(gameState.totalZombiesInWave + 1, Math.ceil(gameState.totalZombiesInWave * 1.5));
    
    setGameState(prev => ({
      ...prev,
      wave: newWave,
      zombieCount: nextTotal,
      totalZombiesInWave: nextTotal,
      status: GameStatus.PLAYING,
      hp: Math.min(prev.hp + 35, 100),
      ammo: 50,
      isReloading: false
    }));

    requestLock();
    const msg = await getCommanderMessage(newWave, "WAVE_CLEAR");
    setCommanderMsg(msg);
  }, [gameState.wave, gameState.totalZombiesInWave, requestLock]);

  const onZombieKill = useCallback(() => {
    setGameState(prev => {
      const remaining = prev.zombieCount - 1;
      const newScore = prev.score + (prev.wave * 100);
      if (remaining <= 0) {
        return { ...prev, zombieCount: 0, score: newScore, status: GameStatus.WAVE_CLEAR };
      }
      return { ...prev, zombieCount: remaining, score: newScore };
    });
  }, []);

  const onPlayerHit = useCallback((damage: number) => {
    setGameState(prev => {
      const newHp = Math.max(0, prev.hp - damage);
      if (newHp <= 0) return { ...prev, hp: 0, status: GameStatus.GAMEOVER };
      return { ...prev, hp: newHp, lastHitTime: Date.now() };
    });
  }, []);

  const onShoot = useCallback(() => {
    setGameState(prev => ({ ...prev, ammo: Math.max(0, prev.ammo - 1) }));
  }, []);

  const onReloadStart = useCallback(() => {
    setGameState(prev => {
      if (prev.isReloading || prev.ammo === 50) return prev;
      setTimeout(() => {
        setGameState(p => ({ ...p, ammo: 50, isReloading: false }));
      }, 1200);
      return { ...prev, isReloading: true };
    });
  }, []);

  const updateRadar = useCallback((enemies: EnemyRadarPos[]) => {
    setRadarEnemies(enemies);
  }, []);

  return (
    <div className={`relative w-full h-full bg-black select-none overflow-hidden ${isPointerLocked ? 'cursor-none' : 'cursor-default'}`}>
      <GameWorld 
        status={gameState.status}
        wave={gameState.wave}
        totalZombies={gameState.totalZombiesInWave}
        ammo={gameState.ammo}
        isReloading={gameState.isReloading}
        onKill={onZombieKill}
        onHit={onPlayerHit}
        onShoot={onShoot}
        onReload={onReloadStart}
        onUpdateRadar={updateRadar}
        requestLock={requestLock}
        lastHitTime={gameState.lastHitTime}
      />

      {gameState.status === GameStatus.PLAYING && isPointerLocked && (
        <div className="crosshair">
          <div className="crosshair-dot" />
        </div>
      )}

      <HUD state={gameState} commanderMsg={commanderMsg} radarEnemies={radarEnemies} />

      <div 
        className={`absolute inset-0 bg-red-600/30 pointer-events-none transition-opacity duration-200 z-10 ${Date.now() - gameState.lastHitTime < 180 ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* 플레이 중 마우스가 풀렸을 때 표시되는 심리스 복귀 안내 */}
      {gameState.status === GameStatus.PLAYING && !isPointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-40 pointer-events-none">
          <div className="group flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <span className="text-white text-3xl font-black tracking-widest uppercase drop-shadow-lg">
              Click to Resume Mission
            </span>
            <span className="text-gray-400 font-mono text-sm tracking-tighter">SENSORS OFFLINE • AWAITING INPUT</span>
          </div>
        </div>
      )}

      {/* 메뉴 시스템 */}
      {gameState.status === GameStatus.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md z-50 text-white">
          <h1 className="text-8xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-orange-500 drop-shadow-2xl italic">
            SUNLIT SLAYER
          </h1>
          <p className="text-gray-400 text-xl mb-12 uppercase tracking-[0.5em] font-light">Zombie Annihilation Protocol</p>
          <button 
            onClick={startGame}
            className="px-20 py-6 bg-orange-600 hover:bg-orange-500 text-white font-black text-3xl rounded-full transition-all hover:scale-110 active:scale-95 shadow-orange-500/30 shadow-2xl"
          >
            INITIALIZE MISSION
          </button>
        </div>
      )}

      {gameState.status === GameStatus.WAVE_CLEAR && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-950/30 backdrop-blur-lg z-50 text-white">
          <h2 className="text-7xl font-black mb-4 text-green-400 italic">WAVE SECURED</h2>
          <div className="mb-12 text-center">
            <p className="text-3xl font-mono text-white/80">SCORE: {gameState.score.toLocaleString()}</p>
            <p className="text-gray-400 mt-2">Area cleared. Tactical breather engaged.</p>
          </div>
          <button 
            onClick={nextWave}
            className="px-16 py-5 bg-white text-black font-black text-2xl rounded-full hover:bg-green-500 hover:text-white transition-all hover:scale-110 shadow-2xl"
          >
            NEXT SECTOR
          </button>
        </div>
      )}

      {(gameState.status === GameStatus.GAMEOVER || gameState.status === GameStatus.VICTORY) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl z-50 text-white">
          <h2 className={`text-9xl font-black mb-8 italic ${gameState.status === GameStatus.VICTORY ? 'text-yellow-400' : 'text-red-600'}`}>
            {gameState.status === GameStatus.VICTORY ? 'CHAMPION' : 'ELIMINATED'}
          </h2>
          <div className="space-y-4 mb-16 text-center">
            <p className="text-4xl font-mono">FINAL SCORE: {gameState.score.toLocaleString()}</p>
            <p className="text-gray-500 text-xl tracking-widest uppercase">Combat Duration: Wave {gameState.wave}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-12 py-4 border-2 border-white/40 rounded-full hover:bg-white hover:text-black transition-all font-bold text-xl"
          >
            RE-DEPLOY SYSTEM
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
