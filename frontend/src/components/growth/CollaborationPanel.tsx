'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import {
  Check,
  X,
  MessageSquare,
  UserCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Trash2,
  Loader2,
  Clock,
} from 'lucide-react';

interface TeamMember {
  id: number;
  nombre: string;
  email: string;
  rol?: string;
}

interface Approval {
  id: string;
  reviewerId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  comentario?: string;
  createdAt: string;
  resolvedAt?: string;
  reviewer?: { nombre: string; email: string } | null;
}

interface Comment {
  id: string;
  usuarioId: number;
  comentario: string;
  resuelto: boolean;
  createdAt: string;
  usuario?: { nombre: string; email: string } | null;
}

const APPROVAL_META: Record<Approval['status'], { label: string; icon: any; cls: string }> = {
  PENDING: { label: 'Pendiente', icon: Clock, cls: 'text-amber-500' },
  APPROVED: { label: 'Aprobado', icon: CheckCircle2, cls: 'text-emerald-500' },
  REJECTED: { label: 'Rechazado', icon: XCircle, cls: 'text-red-500' },
  CHANGES_REQUESTED: { label: 'Cambios solicitados', icon: AlertTriangle, cls: 'text-orange-500' },
};

export default function CollaborationPanel({
  postId,
  assignedTo,
  onChanged,
}: {
  postId: string;
  assignedTo?: number | null;
  onChanged?: () => void;
}) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [assignee, setAssignee] = useState<number | null>(assignedTo ?? null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, a, c] = await Promise.all([
        apiClient.getGrowthTeam().catch(() => ({ usuarios: [] })),
        apiClient.getPostApprovals(postId).catch(() => ({ approvals: [] })),
        apiClient.getPostComments(postId).catch(() => ({ comments: [] })),
      ]);
      setTeam(t?.usuarios || []);
      setApprovals(a?.approvals || []);
      setComments(c?.comments || []);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  async function handleAssign(value: string) {
    const id = value ? parseInt(value) : null;
    setAssignee(id);
    await apiClient.assignPost(postId, id).catch(() => {});
    onChanged?.();
  }

  async function decide(status: Approval['status']) {
    setBusy(true);
    try {
      await apiClient.createPostApproval(postId, { status });
      await load();
      onChanged?.();
    } catch (e: any) {
      alert(e?.message || 'Error al registrar la decisión');
    } finally {
      setBusy(false);
    }
  }

  async function addComment() {
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      await apiClient.createPostComment(postId, { comentario: newComment.trim() });
      setNewComment('');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Error al comentar');
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolve(c: Comment) {
    await apiClient.resolvePostComment(c.id, !c.resuelto).catch(() => {});
    load();
  }

  async function removeComment(c: Comment) {
    await apiClient.deletePostComment(c.id).catch(() => {});
    load();
  }

  function fmt(d: string) {
    return new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  const latestApproval = approvals[0];

  return (
    <div className="pt-4 border-t border-[var(--border-primary)] space-y-5">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Colaboración y aprobaciones
      </h4>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
        </div>
      ) : (
        <>
          {/* Asignación */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-tertiary)] mb-1.5 flex items-center gap-1.5">
              <UserCircle className="w-3.5 h-3.5" /> Asignado a
            </label>
            <select
              value={assignee ?? ''}
              onChange={(e) => handleAssign(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm"
            >
              <option value="">Sin asignar</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Estado de aprobación + acciones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-tertiary)]">Revisión</span>
              {latestApproval && (
                <span className={`text-xs font-semibold inline-flex items-center gap-1 ${APPROVAL_META[latestApproval.status].cls}`}>
                  {(() => { const I = APPROVAL_META[latestApproval.status].icon; return <I className="w-3.5 h-3.5" />; })()}
                  {APPROVAL_META[latestApproval.status].label}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => decide('PENDING')} disabled={busy} className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] text-xs font-medium hover:bg-[var(--surface-hover)] disabled:opacity-50 inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pedir revisión
              </button>
              <button onClick={() => decide('APPROVED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium hover:bg-emerald-500/20 disabled:opacity-50 inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Aprobar
              </button>
              <button onClick={() => decide('CHANGES_REQUESTED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 text-xs font-medium hover:bg-orange-500/20 disabled:opacity-50 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Pedir cambios
              </button>
              <button onClick={() => decide('REJECTED')} disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 inline-flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Rechazar
              </button>
            </div>

            {approvals.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {approvals.slice(0, 5).map((a) => {
                  const meta = APPROVAL_META[a.status];
                  const Icon = meta.icon;
                  return (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <Icon className={`w-3.5 h-3.5 ${meta.cls}`} />
                      <span className="font-medium text-[var(--text-secondary)]">{a.reviewer?.nombre || `Usuario ${a.reviewerId}`}</span>
                      <span>· {meta.label}</span>
                      <span className="ml-auto">{fmt(a.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comentarios */}
          <div>
            <span className="text-xs font-semibold text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Comentarios ({comments.length})
            </span>

            <div className="space-y-2 mb-3 max-h-52 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] italic">Sin comentarios todavía.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className={`group p-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] ${c.resuelto ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{c.usuario?.nombre || `Usuario ${c.usuarioId}`}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--text-tertiary)]">{fmt(c.createdAt)}</span>
                        <button onClick={() => toggleResolve(c)} title={c.resuelto ? 'Reabrir' : 'Marcar resuelto'} className="p-1 rounded hover:bg-[var(--surface-hover)] opacity-0 group-hover:opacity-100">
                          <Check className={`w-3.5 h-3.5 ${c.resuelto ? 'text-emerald-500' : 'text-[var(--text-tertiary)]'}`} />
                        </button>
                        <button onClick={() => removeComment(c)} className="p-1 rounded hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{c.comentario}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                placeholder="Escribe un comentario..."
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button onClick={addComment} disabled={busy || !newComment.trim()} className="p-2 rounded-lg bg-blue-500 text-white hover:opacity-90 disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
