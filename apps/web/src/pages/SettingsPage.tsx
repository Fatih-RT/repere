import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChangePassword, useDeleteAccount, useLogout, useSettings, useUpdateMe, useUpdateSettings } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/theme/ThemeProvider";
import { useToast } from "@/components/ui/Toast";
import { pbErrorMessage } from "@/lib/pbErrors";
import { initials, relativeFr } from "@/lib/format";
import { buildExportData, downloadJson } from "@/lib/export";
import { useRestoreFromTrash, useTrash } from "@/lib/trash";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { Avatar } from "@/components/ui/Avatar";
import { MathText } from "@/components/MathText";
import type { Theme, UserSettings } from "@/lib/types";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "rose", label: "Rose" },
];

const THEME_SWATCH: Record<Theme, { bg: string; track: string }> = {
  light: { bg: "#fbfafa", track: "rgba(27,26,28,.08)" },
  dark: { bg: "#161826", track: "rgba(233,233,237,.10)" },
  rose: { bg: "#fdfafb", track: "rgba(120,60,80,.11)" },
};

export function SettingsPage() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { theme, setTheme, followSystem, setFollowSystem } = useTheme();
  const updateSettings = useUpdateSettings();
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();
  const logout = useLogout();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: trash } = useTrash();
  const { restore: restoreFromTrash } = useRestoreFromTrash();

  const [editingAccount, setEditingAccount] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [className, setClassName] = useState(user?.class_name ?? "");
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  if (!user || !settings) return null;

  async function saveAccount() {
    await updateMe.mutateAsync({ displayName, className });
    setEditingAccount(false);
    toast.show("Profil mis à jour.");
  }

  async function savePassword() {
    setPasswordError(null);
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      toast.show("Mot de passe mis à jour.");
    } catch (err) {
      setPasswordError(pbErrorMessage(err, "Mot de passe actuel incorrect."));
    }
  }

  async function onDeleteAccount() {
    await deleteAccount.mutateAsync();
    navigate("/login");
  }

  async function onExport() {
    setExporting(true);
    try {
      const data = await buildExportData();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`repere-export-${stamp}.json`, data);
      toast.show("Export téléchargé.");
    } catch (err) {
      toast.show(pbErrorMessage(err, "Impossible d'exporter les données."));
    } finally {
      setExporting(false);
    }
  }

  async function onRestore(kind: "category" | "subject" | "chapter" | "question" | "note", id: string, label: string) {
    await restoreFromTrash(kind, id);
    toast.show(`« ${label} » restauré${kind === "chapter" ? "" : "e"}.`);
  }

  const trashCount =
    (trash?.categories.length ?? 0) + (trash?.subjects.length ?? 0) + (trash?.chapters.length ?? 0) + (trash?.questions.length ?? 0) + (trash?.notes.length ?? 0);

  const prefs: { key: "notif" | "sons" | "anim" | "mix_subjects"; label: string; hint: string }[] = [
    { key: "notif", label: "Notifications", hint: "Un rappel quotidien à 18 h 30" },
    { key: "sons", label: "Sons", hint: "Retour sonore en fin de session" },
    { key: "anim", label: "Animations", hint: "Suit aussi la préférence système" },
    { key: "mix_subjects", label: "Mélanger les matières", hint: "Une session peut croiser plusieurs matières" },
  ];

  return (
    <div className="animate-fade max-w-[640px]">
      <h1 className="m-0 mb-5 text-2xl font-medium tracking-tight">Paramètres</h1>

      <section className="mb-[26px]">
        <div className="text-[11px] tracking-[0.1em] uppercase mb-[11px]" style={{ color: "var(--faint)" }}>Compte</div>
        {!editingAccount ? (
          <div className="p-4 border border-border rounded-lg bg-surface flex items-center gap-3.5 flex-wrap">
            <Avatar initials={initials(user.name)} size={44} />
            <div className="flex-1 min-w-[150px]">
              <div className="text-[14.5px] font-medium">{user.name}</div>
              <div className="text-[12.5px] text-muted">{user.email}</div>
            </div>
            <Button size="sm" onClick={() => { setDisplayName(user.name); setClassName(user.class_name); setEditingAccount(true); }}>Modifier</Button>
            <Button size="sm" onClick={() => setEditingPassword((v) => !v)}>Mot de passe</Button>
          </div>
        ) : (
          <div className="p-4 border border-border rounded-lg bg-surface flex flex-col gap-2.5">
            <label className="block">
              <span className="block text-xs mb-1.5 text-muted">Nom</span>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-xs mb-1.5 text-muted">Classe</span>
              <Input value={className} onChange={(e) => setClassName(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <Button variant="solid" size="sm" onClick={saveAccount}>Enregistrer</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingAccount(false)}>Annuler</Button>
            </div>
          </div>
        )}
        {editingPassword && (
          <div className="p-4 border border-border rounded-lg bg-surface flex flex-col gap-2.5 mt-2.5 animate-rise">
            <label className="block">
              <span className="block text-xs mb-1.5 text-muted">Mot de passe actuel</span>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-xs mb-1.5 text-muted">Nouveau mot de passe</span>
              <Input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            {passwordError && <p className="m-0 text-[13px]" style={{ color: "var(--err)" }}>{passwordError}</p>}
            <div className="flex gap-2">
              <Button variant="solid" size="sm" onClick={savePassword} disabled={changePassword.isPending}>Mettre à jour</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingPassword(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </section>

      <section className="mb-[26px]">
        <div className="text-[11px] tracking-[0.1em] uppercase mb-[11px]" style={{ color: "var(--faint)" }}>Apparence</div>
        <div className="grid gap-2.5 mb-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          {THEME_OPTIONS.map((t) => {
            const active = theme === t.value;
            const sw = THEME_SWATCH[t.value];
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className="flex flex-col gap-2.5 p-3 rounded-lg bg-surface text-left"
                style={{ border: `1px solid ${active ? "var(--accent-line)" : "var(--border)"}` }}
              >
                <div className="h-[54px] rounded-md p-2.5 flex flex-col gap-1.5 justify-end" style={{ background: sw.bg, border: "1px solid var(--border2)" }}>
                  <div className="w-[38%] h-[7px] rounded-full" style={{ background: "var(--accent)" }} />
                  <div className="w-[68%] h-[7px] rounded-full" style={{ background: sw.track }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-medium">{t.label}</span>
                  {active && <i className="ph-fill ph-check-circle" style={{ fontSize: 15, color: "var(--accent)" }} />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-[13px_15px] border border-border rounded-lg bg-surface flex items-center gap-3">
          <span className="text-[13.5px] flex-1">Suivre les préférences du système</span>
          <Switch checked={followSystem} onChange={() => setFollowSystem(!followSystem)} label="Suivre les préférences du système" />
        </div>
      </section>

      <section className="mb-[26px]">
        <div className="text-[11px] tracking-[0.1em] uppercase mb-[11px]" style={{ color: "var(--faint)" }}>Préférences</div>
        <div className="border border-border rounded-lg bg-surface overflow-hidden">
          {prefs.map((p, i) => (
            <div key={p.key} className="flex items-center gap-3.5 p-[13px_15px]" style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px]">{p.label}</div>
                <div className="text-[11.5px]" style={{ color: "var(--faint)" }}>{p.hint}</div>
              </div>
              <Switch checked={settings[p.key]} onChange={() => updateSettings.mutate({ [p.key]: !settings[p.key] })} label={p.label} />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-[26px]">
        <div className="text-[11px] tracking-[0.1em] uppercase mb-[11px]" style={{ color: "var(--faint)" }}>Pomodoro & objectif</div>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
          {[
            { key: "pomo_work" as const, label: "Travail (min)" },
            { key: "pomo_short" as const, label: "Pause courte" },
            { key: "pomo_long" as const, label: "Pause longue" },
            { key: "pomo_sessions" as const, label: "Sessions" },
            { key: "daily_goal_mins" as const, label: "Objectif jour" },
          ].map((f) => (
            <label key={f.key} className="block">
              <span className="block text-xs mb-1.5 text-muted">{f.label}</span>
              <Input
                type="number"
                min={1}
                value={settings[f.key]}
                onChange={(e) => updateSettings.mutate({ [f.key]: Number(e.target.value) || 1 } as Partial<UserSettings>)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mb-[26px]">
        <div className="text-[11px] tracking-[0.1em] uppercase mb-[11px]" style={{ color: "var(--faint)" }}>Données</div>
        <div className="flex gap-2.5 flex-wrap mb-3">
          <Button onClick={onExport} disabled={exporting}>
            <i className="ph ph-export" style={{ fontSize: 15 }} /> {exporting ? "Export en cours…" : "Exporter mes données"}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setTrashOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 p-[13px_15px] border border-border rounded-lg bg-surface text-left"
        >
          <i className="ph ph-trash" style={{ fontSize: 15, color: "var(--muted)" }} />
          <span className="flex-1 text-[13.5px]">Corbeille</span>
          {!!trashCount && (
            <span className="text-xs tabular-nums px-2 py-0.5 rounded-full" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>{trashCount}</span>
          )}
          <i className={trashOpen ? "ph ph-caret-up" : "ph ph-caret-down"} style={{ fontSize: 13, color: "var(--faint)" }} />
        </button>
        {trashCount > 50 && (
          <div className="mt-2 p-[10px_13px] rounded-lg flex items-center gap-2.5 text-[12.5px]" style={{ border: "1px solid color-mix(in srgb, var(--warn) 40%, transparent)", color: "var(--warn)" }}>
            <i className="ph ph-info" style={{ fontSize: 14 }} />
            La corbeille contient {trashCount} éléments. Rien n'est perdu — ils sont
            restaurables pendant 30 jours — mais ça vaut le coup d'y jeter un œil.
          </div>
        )}
        {trashOpen && (
          <div className="mt-2 border border-border rounded-lg bg-surface overflow-hidden animate-rise">
            {!trashCount ? (
              <p className="m-0 p-4 text-[12.5px]" style={{ color: "var(--faint)" }}>Rien dans la corbeille. Les éléments supprimés y restent 30 jours avant d'être effacés définitivement.</p>
            ) : (
              <div className="flex flex-col">
                {trash?.categories.map((cat, i) => (
                  <div key={cat.id} className="flex items-center gap-3 p-[11px_14px]" style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                    <i className="ph ph-graduation-cap" style={{ fontSize: 14, color: "var(--faint)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate">{cat.name}</div>
                      <div className="text-[11px]" style={{ color: "var(--faint)" }}>Catégorie · {relativeFr(cat.deleted_at).replace(/^Révisé /, "Supprimée ")}</div>
                    </div>
                    <Button size="sm" onClick={() => onRestore("category", cat.id, cat.name)}>Restaurer</Button>
                  </div>
                ))}
                {trash?.subjects.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-[11px_14px]" style={{ borderTop: i || trash.categories.length ? "1px solid var(--border)" : "none" }}>
                    <i className="ph ph-book" style={{ fontSize: 14, color: "var(--faint)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate">{s.name}</div>
                      <div className="text-[11px]" style={{ color: "var(--faint)" }}>Matière · {relativeFr(s.deleted_at).replace(/^Révisé /, "Supprimée ")}</div>
                    </div>
                    <Button size="sm" onClick={() => onRestore("subject", s.id, s.name)}>Restaurer</Button>
                  </div>
                ))}
                {trash?.chapters.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 p-[11px_14px]" style={{ borderTop: i || trash.categories.length || trash.subjects.length ? "1px solid var(--border)" : "none" }}>
                    <i className="ph ph-bookmark-simple" style={{ fontSize: 14, color: "var(--faint)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate">{c.name}</div>
                      <div className="text-[11px] truncate" style={{ color: "var(--faint)" }}>{c.subjectName} · {relativeFr(c.deleted_at).replace(/^Révisé /, "Supprimé ")}</div>
                    </div>
                    <Button size="sm" onClick={() => onRestore("chapter", c.id, c.name)}>Restaurer</Button>
                  </div>
                ))}
                {trash?.questions.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-3 p-[11px_14px]" style={{ borderTop: i || trash.categories.length || trash.subjects.length || trash.chapters.length ? "1px solid var(--border)" : "none" }}>
                    <i className="ph ph-question" style={{ fontSize: 14, color: "var(--faint)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate"><MathText text={q.question} /></div>
                      <div className="text-[11px] truncate" style={{ color: "var(--faint)" }}>{q.subjectName} · {q.chapterName} · {relativeFr(q.deleted_at).replace(/^Révisé /, "Supprimée ")}</div>
                    </div>
                    <Button size="sm" onClick={() => onRestore("question", q.id, "Question")}>Restaurer</Button>
                  </div>
                ))}
                {trash?.notes.map((n, i) => (
                  <div key={n.id} className="flex items-center gap-3 p-[11px_14px]" style={{ borderTop: i || trash.categories.length || trash.subjects.length || trash.chapters.length || trash.questions.length ? "1px solid var(--border)" : "none" }}>
                    <i className="ph ph-note" style={{ fontSize: 14, color: "var(--faint)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate">{n.title}</div>
                      <div className="text-[11px] truncate" style={{ color: "var(--faint)" }}>
                        {n.subjectName}{n.chapterName ? ` · ${n.chapterName}` : ""} · {relativeFr(n.deleted_at).replace(/^Révisé /, "Supprimée ")}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => onRestore("note", n.id, n.title)}>Restaurer</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2.5 flex-wrap mt-3 mb-3">
          <Button onClick={() => logout.mutate()}><i className="ph ph-sign-out" style={{ fontSize: 15 }} /> Se déconnecter</Button>
        </div>
        <div className="p-[14px_15px] rounded-lg flex items-center gap-3.5 flex-wrap" style={{ border: "1px solid var(--err-line)" }}>
          <div className="flex-1 min-w-[170px]">
            <div className="text-[13.5px]" style={{ color: "var(--err)" }}>Supprimer mon compte</div>
            <div className="text-[11.5px]" style={{ color: "var(--faint)" }}>Définitif. Tes matières, questions et statistiques seront effacées.</div>
          </div>
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={onDeleteAccount} disabled={deleteAccount.isPending}>Confirmer la suppression</Button>
              <Button size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>Supprimer</Button>
          )}
        </div>
      </section>
    </div>
  );
}
