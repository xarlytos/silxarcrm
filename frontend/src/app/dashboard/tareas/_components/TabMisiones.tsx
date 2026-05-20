'use client';

import { Calendar, Zap } from 'lucide-react';
import type { TareaDef } from '../_lib/types';
import type { StreakBuff } from '../_lib/levels';
import type { ChestTier, ChestReward } from '../_lib/chest';
import type { TarotCard } from '../_lib/tarot';
import type { SlotSymbol } from '../_lib/slots';
import { isWeekend } from '../_lib/slots';
import type { Progress } from '../_lib/storage';
import { timeUntilMidnight, timeUntilNextWeek } from '../_lib/utils';
import { TarotWidget } from './TarotWidget';
import { MysteryChest } from './MysteryChest';
import { SlotMachine } from './SlotMachine';
import { BossCard } from './BossCard';
import { SectionHeader } from './SectionHeader';
import { TareaCard } from './TareaCard';

/* ============================================================
   Tab: Misiones (Daily + Weekly + Boss)
============================================================ */

export function TabMisiones({
  boss, weeklies, dailies, tareaProgress, isClaimed, onClaim, buff,
  chestTier, chestOpened, chestLastReward, streakCount, onOpenChest,
  tarotCard, tarotRevealed, onRevealTarot,
  slotProgress, thisWeek, onSpin,
}: {
  boss: TareaDef | null;
  weeklies: TareaDef[];
  dailies: TareaDef[];
  tareaProgress: (t: TareaDef) => { value: number; pct: number; done: boolean };
  isClaimed: (t: TareaDef) => boolean;
  onClaim: (t: TareaDef, ev: React.MouseEvent) => void;
  buff: StreakBuff;
  chestTier: ChestTier;
  chestOpened: boolean;
  chestLastReward: ChestReward | null;
  streakCount: number;
  onOpenChest: (ev: React.MouseEvent) => void;
  tarotCard: TarotCard;
  tarotRevealed: boolean;
  onRevealTarot: () => void;
  slotProgress: Progress['slots'];
  thisWeek: string;
  onSpin: () => { reels: SlotSymbol[]; reward: { xp: number; gemas: number; tipo: string } } | null;
}) {
  const weekend = isWeekend();
  return (
    <div className="space-y-5">
      {/* TAROT + COFRE en grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <TarotWidget card={tarotCard} revealed={tarotRevealed} onReveal={onRevealTarot} />
        <MysteryChest
          tier={chestTier}
          opened={chestOpened}
          lastReward={chestLastReward}
          streak={streakCount}
          onOpen={onOpenChest}
        />
      </div>

      {/* SLOT DEL FIN DE SEMANA */}
      {weekend && (
        <SlotMachine
          spinsUsed={slotProgress.week === thisWeek ? slotProgress.spinsUsed : 0}
          lastReward={slotProgress.week === thisWeek ? slotProgress.lastReward : null}
          onSpin={onSpin}
        />
      )}

      {/* BOSS */}
      {boss && (
        <BossCard
          tarea={boss}
          progress={tareaProgress(boss)}
          claimed={isClaimed(boss)}
          onClaim={(ev) => onClaim(boss, ev)}
        />
      )}

      {/* WEEKLY */}
      <section>
        <SectionHeader
          icon={Calendar}
          iconColor="text-blue-400"
          title="Misiones de la semana"
          subtitle="Se reinician el lunes"
          right={`Reset en ${timeUntilNextWeek()}`}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {weeklies.map((t) => (
            <TareaCard
              key={t.id}
              tarea={t}
              progress={tareaProgress(t)}
              claimed={isClaimed(t)}
              onClaim={(ev) => onClaim(t, ev)}
            />
          ))}
        </div>
      </section>

      {/* DAILY */}
      <section>
        <SectionHeader
          icon={Zap}
          iconColor="text-amber-400"
          title="Misiones del día"
          subtitle={`Reinicio diario · completa una para mantener la racha${buff.bonusPct > 0 ? ` · ${buff.bonusPct}% XP extra` : ''}`}
          right={`Reset en ${timeUntilMidnight()}`}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {dailies.map((t) => (
            <TareaCard
              key={t.id}
              tarea={t}
              progress={tareaProgress(t)}
              claimed={isClaimed(t)}
              onClaim={(ev) => onClaim(t, ev)}
              bonusPct={buff.bonusPct}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
