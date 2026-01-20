
import React from 'react';
import { GameState, GameStatus, EnemyRadarPos } from '../types';

interface HUDProps {
  state: GameState & { isReloading: boolean };
  commanderMsg: string;
  radarEnemies: EnemyRadarPos[];
}

const HUD: React.FC<HUDProps> = ({ state, commanderMsg, radarEnemies }) => {
  const hpColor = state.hp > 60 ? 'bg-green-400' : state.hp > 30 ? 'bg-yellow-400' : 'bg-red-500';

  return (
    <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between z-20">
      {/* Top Layer */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-4">
          {/* Health Section */}
          <div className="bg-black/40 backdrop-blur-xl p-5 rounded-2xl border border-white/5 text-white w-72 shadow-2xl">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Player Vitality</span>
              <span className="font-mono text-3xl font-black">{state.hp}%</span>
            </div>
            <div className="w-full h-4 bg-gray-900/50 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full transition-all duration-500 shadow-[0_0_15px_rgba(255,255,255,0.2)] ${hpColor}`} 
                style={{ width: `${state.hp}%` }}
              />
            </div>
          </div>
          
          {/* Stats Section */}
          <div className="bg-black/40 backdrop-blur-xl p-5 rounded-2xl border border-white/5 text-white flex gap-8 items-center shadow-2xl">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Combat Score</span>
              <span className="font-mono text-3xl text-yellow-400 font-bold">{state.score.toLocaleString()}</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Munitions</span>
              {state.isReloading ? (
                <span className="font-black text-2xl text-orange-500 animate-pulse">RELOADING</span>
              ) : (
                <span className={`font-mono text-3xl font-bold ${state.ammo < 12 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{state.ammo}</span>
              )}
            </div>
          </div>
        </div>

        {/* Wave Tracking */}
        <div className="bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-white/5 text-white text-center shadow-2xl">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 block mb-1">Wave Protocol</span>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-6xl font-black italic">{state.wave}</span>
            <span className="text-xl text-gray-600 font-bold">/ 10</span>
          </div>
          <div className="mt-4 px-4 py-1 bg-red-500/20 rounded-full border border-red-500/30">
            <span className="text-xs font-black text-red-400 uppercase">{state.zombieCount} Hostiles Left</span>
          </div>
        </div>
      </div>

      {/* Bottom Layer */}
      <div className="flex justify-between items-end">
        {/* Radar System */}
        <div className="relative w-48 h-48 bg-slate-950/70 rounded-full border-4 border-white/10 backdrop-blur-xl overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {/* Radar UI Elements */}
          <div className="absolute inset-0 border border-white/5 rounded-full scale-[0.66]" />
          <div className="absolute inset-0 border border-white/5 rounded-full scale-[0.33]" />
          <div className="absolute w-px h-full bg-white/10" />
          <div className="absolute w-full h-px bg-white/10" />
          
          {/* Center Pointer */}
          <div className="absolute w-5 h-5 z-10">
            <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-yellow-400 mx-auto drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
          </div>

          {/* Enemy Blips */}
          {radarEnemies.map((enemy, idx) => {
            const left = 50 + enemy.relX * 50;
            const top = 50 + enemy.relY * 50;
            const isDanger = enemy.dist < 8;
            
            return (
              <div 
                key={idx}
                className={`absolute rounded-full transition-all duration-100 ${isDanger ? 'bg-red-400 w-3 h-3 z-20 animate-ping' : 'bg-red-600 w-2.5 h-2.5 shadow-[0_0_10px_rgba(255,0,0,0.6)]'}`}
                style={{ 
                  left: `${left}%`, 
                  top: `${top}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: Math.max(0.3, 1 - (enemy.dist / 80))
                }}
              />
            );
          })}

          {/* Scan Sweep Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 via-transparent to-transparent animate-[spin_3s_linear_infinite] origin-center pointer-events-none" />
        </div>

        {/* Commander Transmission */}
        <div className="flex flex-col items-end flex-1 mb-2">
          <div className="mr-8 flex flex-col items-center">
            <div className="bg-orange-600 text-white px-5 py-1.5 rounded-t-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-lg">
              HQ COMMS
            </div>
            <div className="bg-slate-900/90 text-white px-10 py-5 rounded-2xl rounded-tr-none border-2 border-orange-600/40 shadow-2xl max-w-lg text-center backdrop-blur-xl">
              <p className="italic text-lg font-medium leading-relaxed">"{commanderMsg}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;
