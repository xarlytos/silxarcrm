'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  Award,
  Crown,
  FileText,
  Loader2,
  Star,
  Sword,
  Swords,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import type { CatalogoData, TareaDef } from './_lib/types';
import { deriveLevel, getStreakBuff, getTitleInfo } from './_lib/levels';
import { getCompanion } from './_lib/companion';
import { getTodayEvent } from './_lib/events';
import { getChestTier, rollChestReward } from './_lib/chest';
import { getTarotOfDay, tarotMatchesTask } from './_lib/tarot';
import { TALENTS, canUnlockTalent } from './_lib/talents';
import { isWeekend, spinSlot, type SlotSymbol } from './_lib/slots';
import { loadProgress, saveProgress, type Progress } from './_lib/storage';
import {
  hashString,
  monthKey,
  shuffleSeeded,
  todayKey,
  weekKey,
  yesterdayKey,
} from './_lib/utils';
import { spawnConfetti } from './_lib/confetti';

import { AnimatedBackground } from './_components/AnimatedBackground';
import { GlobalStyles } from './_components/GlobalStyles';
import { PlayerHero } from './_components/PlayerHero';
import { EventBanner } from './_components/EventBanner';
import { NextObjectiveCard } from './_components/NextObjectiveCard';
import { TabMisiones } from './_components/TabMisiones';
import { TabLogros } from './_components/TabLogros';
import { TabTalentos } from './_components/TabTalentos';
import { TabReino } from './_components/TabReino';
import { TabSaga } from './_components/TabSaga';
import { TabCarrera } from './_components/TabCarrera';
import { TabRecords } from './_components/TabRecords';

/* ============================================================
   Página
============================================================ */

type Tab = 'misiones' | 'logros' | 'reino' | 'talentos' | 'saga' | 'carrera' | 'records';

export default function TareasPage() {
  const [data, setData] = useState<CatalogoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);
  const [tab, setTab] = useState<Tab>('misiones');
  const [_, force] = useState(0); // forzar re-render para countdown
  const confettiHost = useRef<HTMLDivElement | null>(null);

  // Cargar catálogo + stats
  const refresh = useCallback(async () => {
    try {
      const res: any = await apiClient.getTareas();
      setData(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Tick para countdowns (cada 30s)
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { saveProgress(progress); }, [progress]);

  // Marcar primera visita
  useEffect(() => {
    if (!progress.firstVisit) {
      setProgress((p) => ({ ...p, firstVisit: todayKey() }));
    }
  }, []);

  const today = useMemo(todayKey, []);
  const thisWeek = useMemo(weekKey, []);
  const thisMonth = useMemo(monthKey, []);

  const lvlInfo = useMemo(() => deriveLevel(progress.totalXp), [progress.totalXp]);
  const titleInfo = getTitleInfo(lvlInfo.level);
  const buff = getStreakBuff(progress.streak.count);
  const todayEvent = useMemo(() => getTodayEvent(today), [today]);
  const companion = useMemo(() => getCompanion(lvlInfo.level), [lvlInfo.level]);
  const chestTier = useMemo(() => getChestTier(progress.streak.count), [progress.streak.count]);
  const chestOpenedToday = progress.lastChest?.date === today;
  const tarotCard = useMemo(() => getTarotOfDay(today), [today]);
  const tarotRevealed = progress.tarotRevealed?.date === today;
  const talentPoints = Math.max(0, lvlInfo.level - Object.keys(progress.talents).length);
  const hasTalent = (id: string) => !!progress.talents[id];

  // Daily quest count: Velocidad I añade +1, Velocidad IV añade +2 más
  const dailyCount = 3 + (hasTalent('vel_1') ? 1 : 0) + (hasTalent('vel_4') ? 2 : 0);

  const dailies = useMemo(
    () => (data ? shuffleSeeded(data.dailyPool, hashString(today)).slice(0, dailyCount) : []),
    [data, today, dailyCount],
  );
  const weeklies = useMemo(
    () => (data ? shuffleSeeded(data.weeklyPool, hashString(thisWeek)).slice(0, 3) : []),
    [data, thisWeek],
  );
  const boss = useMemo(
    () => (data ? shuffleSeeded(data.bossPool, hashString(thisMonth))[0] ?? null : null),
    [data, thisMonth],
  );

  const tareaProgress = (t: TareaDef): { value: number; pct: number; done: boolean } => {
    const value = data?.stats?.[t.source] ?? 0;
    const capped = Math.min(value, t.meta);
    return { value, pct: capped / t.meta, done: capped >= t.meta };
  };

  const isClaimed = (t: TareaDef): boolean => {
    if (t.tipo === 'achievement') return !!progress.achievementsClaimed[t.id];
    if (t.tipo === 'daily') return !!progress.dailiesClaimed[`${today}_${t.id}`];
    if (t.tipo === 'weekly') return !!progress.weekliesClaimed[`${thisWeek}_${t.id}`];
    if (t.tipo === 'boss') return !!progress.bossesClaimed[`${thisMonth}_${t.id}`];
    return false;
  };

  const claim = (t: TareaDef, ev: React.MouseEvent) => {
    if (isClaimed(t)) return;
    const { done } = tareaProgress(t);
    if (!done) return;

    const host = (ev.currentTarget as HTMLElement).closest('[data-card]') as HTMLElement | null;
    if (host) {
      const wrapper = host.querySelector<HTMLElement>('[data-confetti]');
      if (wrapper) spawnConfetti(wrapper, t.rareza === 'mitico' ? 2 : t.rareza === 'legendario' ? 1.5 : 1);
    }

    // Crítico aleatorio (5% base + 5% por nivel del buff + Inteligencia II)
    // Inteligencia V: 25% chance de crítico en CUALQUIER reclamo (no solo dailies)
    const critChanceDaily = 0.05 + buff.level * 0.05 + (hasTalent('int_2') ? 0.10 : 0);
    const critChanceAny   = hasTalent('int_5') ? 0.25 : 0;
    const isCrit = t.tipo === 'daily'
      ? Math.random() < critChanceDaily
      : Math.random() < critChanceAny;
    // Sangre de Dragón: el crítico multiplica ×3 en vez de ×2
    const critMult = hasTalent('drg_1') ? 3 : 2;
    // Doble pulso de Velocidad III: 25% chance de doble XP en cualquier reclamo
    const doblePulso = hasTalent('vel_3') && Math.random() < 0.25;

    setProgress((prev) => {
      const next: Progress = {
        ...prev,
        totalXp: prev.totalXp,
        totalGemas: prev.totalGemas,
        achievementsClaimed: { ...prev.achievementsClaimed },
        dailiesClaimed: { ...prev.dailiesClaimed },
        weekliesClaimed: { ...prev.weekliesClaimed },
        bossesClaimed: { ...prev.bossesClaimed },
        streak: { ...prev.streak },
        critTotal: prev.critTotal + (isCrit ? 1 : 0),
      };
      const now = new Date().toISOString();

      // ====== XP CALCULATION ======
      let xpGanado = t.xp;
      // Buff de racha (solo dailies)
      if (t.tipo === 'daily' && buff.bonusPct > 0) {
        xpGanado = Math.round(xpGanado * (1 + buff.bonusPct / 100));
      }
      // Evento del día — XP por source
      const eventXpMult = todayEvent.effects.xpMultBySource?.[t.source];
      if (eventXpMult && eventXpMult > 1) {
        xpGanado = Math.round(xpGanado * eventXpMult);
      }
      // Evento "Sabiduría Antigua" → +15% global
      if (todayEvent.id === 'sabiduria') {
        xpGanado = Math.round(xpGanado * 1.15);
      }
      // Talento Persuasión I/II/IV/V: comunicación bonificada
      if (t.categoria === 'comunicacion') {
        let mult = 1;
        if (hasTalent('pers_5')) mult = 2.0;       // Encantador Supremo ×2
        else if (hasTalent('pers_4')) mult = 1.5;  // Lengua de Plata +50%
        else if (hasTalent('pers_2')) mult = 1.25; // Voz de Sirena +25%
        else if (hasTalent('pers_1')) mult = 1.10; // Verbo Afilado +10%
        if (mult > 1) xpGanado = Math.round(xpGanado * mult);
      }
      // Talento Velocidad II: +30% XP en dailies
      if (t.tipo === 'daily' && hasTalent('vel_2')) {
        xpGanado = Math.round(xpGanado * 1.30);
      }
      // Talento Velocidad IV: +20% XP en weeklies
      if (t.tipo === 'weekly' && hasTalent('vel_4')) {
        xpGanado = Math.round(xpGanado * 1.20);
      }
      // Talento Dragón V: ×2 en bosses
      if (t.tipo === 'boss' && hasTalent('drg_5')) {
        xpGanado *= 2;
      }
      // Talentos Imperio (XP global cumulable)
      let impMult = 1;
      if (hasTalent('imp_1')) impMult += 0.05;
      if (hasTalent('imp_3')) impMult += 0.15;
      if (hasTalent('imp_5')) impMult += 0.25;
      if (impMult > 1) xpGanado = Math.round(xpGanado * impMult);
      // Aureolas de prestige: cada una = +10% XP global permanente
      if (prev.aureolas > 0) {
        xpGanado = Math.round(xpGanado * (1 + prev.aureolas * 0.10));
      }
      // Tarot del día — Dragón IV lo eleva a +40%
      if (tarotMatchesTask(tarotCard, t)) {
        const tarotMult = hasTalent('drg_4') ? 1.40 : 1.20;
        xpGanado = Math.round(xpGanado * tarotMult);
      }
      // Crítico (×2 o ×3 con drg_1)
      if (isCrit) xpGanado *= critMult;
      // Doble Pulso × 2 (talento Vel III)
      if (doblePulso) xpGanado *= 2;
      next.totalXp = prev.totalXp + xpGanado;

      // ====== GEMAS CALCULATION ======
      let gemasGanadas = t.gemas ?? 0;
      if (todayEvent.effects.gemMult && todayEvent.effects.gemMult > 1) {
        gemasGanadas = Math.round(gemasGanadas * todayEvent.effects.gemMult);
      }
      // Talento Inteligencia I/IV: +20% / +50% gemas global (no acumulables — usar el mayor)
      if (hasTalent('int_4')) gemasGanadas = Math.round(gemasGanadas * 1.50);
      else if (hasTalent('int_1')) gemasGanadas = Math.round(gemasGanadas * 1.20);
      // Talento Persuasión III: +10 gemas extra en envíos de WhatsApp
      if (hasTalent('pers_3') && (t.source === 'whatsappEnviosHoy' || t.source === 'whatsappEnviosTotal' || t.source === 'whatsappEnviosSemana' || t.source === 'whatsappEnviosMes')) {
        gemasGanadas += 10;
      }
      // Persuasión V: ×2 gemas en comunicación
      if (t.categoria === 'comunicacion' && hasTalent('pers_5')) {
        gemasGanadas = Math.round(gemasGanadas * 2);
      }
      // Imperio II: +10% gemas en propuestas/cierres
      if (hasTalent('imp_2') && (t.source === 'propuestasTotal' || t.source === 'propuestasAceptadas' || t.source === 'propuestasEnviadas' || t.source === 'leadsConvertidos')) {
        gemasGanadas = Math.round(gemasGanadas * 1.10);
      }
      // Imperio IV: +30% gemas globales adicionales
      if (hasTalent('imp_4')) gemasGanadas = Math.round(gemasGanadas * 1.30);
      // Dragón V: ×2 gemas en bosses
      if (t.tipo === 'boss' && hasTalent('drg_5')) gemasGanadas *= 2;
      next.totalGemas = prev.totalGemas + gemasGanadas;

      if (t.tipo === 'achievement') next.achievementsClaimed[t.id] = now;
      else if (t.tipo === 'daily') {
        next.dailiesClaimed[`${today}_${t.id}`] = now;
        if (next.streak.lastDay !== today) {
          if (next.streak.lastDay === yesterdayKey()) {
            next.streak = { count: next.streak.count + 1, lastDay: today, best: Math.max(next.streak.best, next.streak.count + 1) };
          } else {
            next.streak = { count: 1, lastDay: today, best: Math.max(next.streak.best, 1) };
          }
        }
      } else if (t.tipo === 'weekly') next.weekliesClaimed[`${thisWeek}_${t.id}`] = now;
      else if (t.tipo === 'boss') next.bossesClaimed[`${thisMonth}_${t.id}`] = now;

      const before = deriveLevel(prev.totalXp).level;
      const after = deriveLevel(next.totalXp).level;
      if (after > before) {
        setLevelUp({ from: before, to: after });
        setTimeout(() => setLevelUp(null), 3500);
        if (confettiHost.current) spawnConfetti(confettiHost.current, 2.5);
      }
      return next;
    });
  };

  const openChest = (ev?: React.MouseEvent) => {
    if (chestOpenedToday) return;
    const reward = rollChestReward(chestTier);
    const host = ev ? ((ev.currentTarget as HTMLElement).closest('[data-card]') as HTMLElement | null) : null;
    if (host) {
      const wrapper = host.querySelector<HTMLElement>('[data-confetti]');
      if (wrapper) spawnConfetti(wrapper, reward.crit ? 3 : 1.5);
    } else if (confettiHost.current) {
      spawnConfetti(confettiHost.current, reward.crit ? 3 : 1.5);
    }
    setProgress((prev) => {
      const next: Progress = {
        ...prev,
        totalXp: prev.totalXp + reward.xp,
        totalGemas: prev.totalGemas + reward.gemas,
        lastChest: { date: today, reward },
      };
      const before = deriveLevel(prev.totalXp).level;
      const after = deriveLevel(next.totalXp).level;
      if (after > before) {
        setLevelUp({ from: before, to: after });
        setTimeout(() => setLevelUp(null), 3500);
        if (confettiHost.current) spawnConfetti(confettiHost.current, 2.5);
      }
      return next;
    });
  };

  const markChapterRead = (chapterId: string) => {
    setProgress((p) => p.sagaRead.includes(chapterId) ? p : { ...p, sagaRead: [...p.sagaRead, chapterId] });
  };

  const revealTarot = () => {
    if (tarotRevealed) return;
    setProgress((p) => ({ ...p, tarotRevealed: { date: today, cardId: tarotCard.id } }));
  };

  const unlockTalent = (talentId: string) => {
    const t = TALENTS.find((x) => x.id === talentId);
    if (!t) return;
    if (!canUnlockTalent(t, progress.talents, talentPoints, lvlInfo.level)) return;
    if (confettiHost.current) spawnConfetti(confettiHost.current, 1.5);
    setProgress((p) => ({ ...p, talents: { ...p.talents, [talentId]: true } }));
  };

  const spinSlotMachine = (): { reels: SlotSymbol[]; reward: { xp: number; gemas: number; tipo: string } } | null => {
    if (!isWeekend()) return null;
    const currentWeek = thisWeek;
    const used = progress.slots.week === currentWeek ? progress.slots.spinsUsed : 0;
    if (used >= 3) return null;
    const result = spinSlot();
    setProgress((p) => {
      const next = { ...p, totalXp: p.totalXp + result.reward.xp, totalGemas: p.totalGemas + result.reward.gemas };
      next.slots = {
        week: currentWeek,
        spinsUsed: used + 1,
        lastReward: { reels: result.reels.map((r) => r.id), ...result.reward },
      };
      const before = deriveLevel(p.totalXp).level;
      const after = deriveLevel(next.totalXp).level;
      if (after > before) {
        setLevelUp({ from: before, to: after });
        setTimeout(() => setLevelUp(null), 3500);
        if (confettiHost.current) spawnConfetti(confettiHost.current, 2.5);
      }
      return next;
    });
    if (confettiHost.current) spawnConfetti(confettiHost.current, result.reward.tipo.startsWith('jackpot') || result.reward.tipo.startsWith('JACKPOT') ? 3 : 1);
    return result;
  };

  const reencarnar = () => {
    if (lvlInfo.level < 25) return;
    if (!confirm('¿Reencarnar? Reseteas XP y nivel a 1, pero ganas 1 Aureola permanente (+10% XP global). Mantienes gemas, talentos, logros, weeklies y bosses.')) return;
    if (confettiHost.current) spawnConfetti(confettiHost.current, 4);
    setProgress((p) => ({
      ...p,
      totalXp: 0,
      bestLevelReached: Math.max(p.bestLevelReached, lvlInfo.level),
      aureolas: p.aureolas + 1,
    }));
  };

  // Próximo objetivo (achievement con mayor progreso < 100%, no claimed)
  const proximoObjetivo = useMemo(() => {
    if (!data) return null;
    let best: { t: TareaDef; pct: number } | null = null;
    for (const a of data.achievements) {
      if (isClaimed(a)) continue;
      const { pct, done } = tareaProgress(a);
      if (done) return { t: a, pct: 1 }; // ready to claim wins
      if (!best || pct > best.pct) best = { t: a, pct };
    }
    return best;
  }, [data, progress]);

  const totalAchievements = data?.achievements.length ?? 0;
  const unlockedAchievements = data ? data.achievements.filter((a) => isClaimed(a)).length : 0;
  const completionPct = totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0;

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Fondo animado */}
      <AnimatedBackground />
      <GlobalStyles />

      <div ref={confettiHost} className="absolute inset-0 pointer-events-none z-50" />

      {/* Level up overlay */}
      {levelUp && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <div className="animate-levelup px-12 py-7 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-2xl shadow-amber-500/50 ring-4 ring-amber-400/60 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-white/80">¡Subida de nivel!</p>
            <p className="text-[52px] font-black text-white leading-tight drop-shadow-lg">Lvl {levelUp.to}</p>
            <p className="text-[14px] font-semibold text-white/90">{getTitleInfo(levelUp.to).title}</p>
          </div>
        </div>
      )}

      <div className="relative p-4 md:p-6 space-y-5 max-w-[1280px] mx-auto">
        {/* === Hero del jugador === */}
        <PlayerHero
          level={lvlInfo.level}
          xpInLevel={lvlInfo.xpInLevel}
          xpForNext={lvlInfo.xpForNext}
          totalXp={progress.totalXp}
          totalGemas={progress.totalGemas}
          progress={lvlInfo.progress}
          titleInfo={titleInfo}
          streak={progress.streak.count}
          bestStreak={progress.streak.best}
          buff={buff}
          unlocked={unlockedAchievements}
          totalAch={totalAchievements}
          companion={companion}
        />

        {/* === Fila 1: Evento · Objetivo · (cofre se renderiza en el tab Misiones) === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <EventBanner event={todayEvent} />
          {proximoObjetivo && (
            <NextObjectiveCard
              tarea={proximoObjetivo.t}
              value={data?.stats?.[proximoObjetivo.t.source] ?? 0}
              onJump={() => setTab('logros')}
            />
          )}
        </div>

        {/* === Tabs (core + separador + meta) === */}
        <div className="flex items-center gap-1 p-1 rounded-2xl panel-base overflow-x-auto">
          {([
            { id: 'misiones', label: 'Misiones', icon: Swords, group: 'core' },
            { id: 'talentos', label: 'Talentos', icon: Sword, group: 'core' },
            { id: 'reino', label: 'Reino', icon: Crown, group: 'core' },
            { id: 'carrera', label: 'Carrera', icon: TrendingUp, group: 'core' },
            { id: 'sep', label: '', icon: null as unknown as LucideIcon, group: 'sep' },
            { id: 'logros', label: 'Constelaciones', icon: Star, group: 'meta' },
            { id: 'saga', label: 'Saga', icon: FileText, group: 'meta' },
            { id: 'records', label: 'Récords', icon: Award, group: 'meta' },
          ] as const).map((t) => {
            if (t.group === 'sep') return <div key={t.id} className="w-px h-6 bg-[var(--border-primary)] mx-1" />;
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as Tab)}
                className={`relative flex items-center gap-2 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'text-[var(--text-primary)] bg-[var(--surface-hover)] ring-1 ring-[var(--border-primary)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {active && (
                  <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                )}
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-500' : ''}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        {loading && !data ? (
          <div className="py-20 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-violet-500 mx-auto" />
            <p className="text-[12px] text-[var(--text-tertiary)] mt-2">Cargando aventura...</p>
          </div>
        ) : data ? (
          <>
            {tab === 'misiones' && (
              <TabMisiones
                boss={boss}
                weeklies={weeklies}
                dailies={dailies}
                tareaProgress={tareaProgress}
                isClaimed={isClaimed}
                onClaim={claim}
                buff={buff}
                chestTier={chestTier}
                chestOpened={chestOpenedToday}
                chestLastReward={chestOpenedToday ? progress.lastChest?.reward ?? null : null}
                streakCount={progress.streak.count}
                onOpenChest={openChest}
                tarotCard={tarotCard}
                tarotRevealed={tarotRevealed}
                onRevealTarot={revealTarot}
                slotProgress={progress.slots}
                thisWeek={thisWeek}
                onSpin={spinSlotMachine}
              />
            )}
            {tab === 'logros' && (
              <TabLogros
                achievements={data.achievements}
                tareaProgress={tareaProgress}
                isClaimed={isClaimed}
                onClaim={claim}
              />
            )}
            {tab === 'talentos' && (
              <TabTalentos
                talents={progress.talents}
                points={talentPoints}
                level={lvlInfo.level}
                onUnlock={unlockTalent}
              />
            )}
            {tab === 'reino' && (
              <TabReino
                stats={data.stats}
                level={lvlInfo.level}
                topClientes={data.topClientes ?? []}
              />
            )}
            {tab === 'saga' && (
              <TabSaga
                level={lvlInfo.level}
                sagaRead={progress.sagaRead}
                onMarkRead={markChapterRead}
              />
            )}
            {tab === 'carrera' && (
              <TabCarrera
                achievements={data.achievements}
                isClaimed={isClaimed}
                aureolas={progress.aureolas}
                bestLevel={progress.bestLevelReached}
                canPrestige={lvlInfo.level >= 25}
                onPrestige={reencarnar}
                level={lvlInfo.level}
                totalXp={progress.totalXp}
                gemas={progress.totalGemas}
                completionPct={completionPct}
                bestStreak={progress.streak.best}
                firstVisit={progress.firstVisit}
              />
            )}
            {tab === 'records' && (
              <TabRecords stats={data.stats} progress={progress} />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
