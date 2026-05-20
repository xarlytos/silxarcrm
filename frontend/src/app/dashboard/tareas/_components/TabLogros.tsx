'use client';

import type { TareaDef } from '../_lib/types';
import { TabConstelaciones } from './TabConstelaciones';

/* ============================================================
   Tab: Logros (agrupados por categoría)
============================================================ */

export function TabLogros({
  achievements, tareaProgress, isClaimed, onClaim,
}: {
  achievements: TareaDef[];
  tareaProgress: (t: TareaDef) => { value: number; pct: number; done: boolean };
  isClaimed: (t: TareaDef) => boolean;
  onClaim: (t: TareaDef, ev: React.MouseEvent) => void;
}) {
  return (
    <TabConstelaciones
      achievements={achievements}
      tareaProgress={tareaProgress}
      isClaimed={isClaimed}
      onClaim={onClaim}
    />
  );
}
