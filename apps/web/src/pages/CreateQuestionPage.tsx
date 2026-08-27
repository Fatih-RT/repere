import { useRef, useState } from "react";
import { useCreateChapter, useSubject, useSubjects } from "@/lib/subjects";
import { useCreateQuestion } from "@/lib/questions";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ImagePicker, extractPastedImages } from "@/components/ImagePicker";
import { MathText, MoleculeStrip } from "@/components/MathText";
import { FormulaHelpButton } from "@/components/FormulaHelpButton";
import { MoleculeAwareTextarea } from "@/components/MoleculeAwareTextarea";
import { useToast } from "@/components/ui/Toast";
import { pbErrorMessage } from "@/lib/pbErrors";

interface CreatedItem {
  q: string;
  meta: string;
}

export function CreateQuestionPage() {
  const { data: subjects } = useSubjects();
  // Matière/chapitre restent choisis entre deux créations — seuls le texte
  // et les images repartent à zéro.
  const [subjectId, setSubjectId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [newChapterMode, setNewChapterMode] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionImages, setQuestionImages] = useState<File[]>([]);
  const [answerImages, setAnswerImages] = useState<File[]>([]);
  const [created, setCreated] = useState<CreatedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  const activeSubjectId = subjectId || subjects?.[0]?.id || "";
  const { data: subjectDetail } = useSubject(activeSubjectId || undefined);
  const createChapter = useCreateChapter(activeSubjectId);
  const createQuestion = useCreateQuestion();

  const activeChapterId = chapterId || subjectDetail?.chaptersList[0]?.id || "";
  // Une matière sans aucun chapitre ne peut pas présenter de <select> valide
  // pour un chapitre existant : on bascule alors automatiquement en mode
  // "nouveau chapitre" plutôt que de laisser le <select> retomber sur
  // "__new" sans que newChapterMode ne soit mis à jour (désync état/affichage).
  const noChaptersYet = !!subjectDetail && subjectDetail.chaptersList.length === 0;
  const effectiveNewChapterMode = newChapterMode || noChaptersYet;

  async function submit() {
    setError(null);
    if (!question.trim()) {
      setError("Écris d'abord la question.");
      questionRef.current?.focus();
      return;
    }
    if (!activeSubjectId) return setError("Choisis une matière.");

    let targetChapterId = activeChapterId;
    let targetChapterName = subjectDetail?.chaptersList.find((c) => c.id === activeChapterId)?.name ?? "";
    try {
      if (effectiveNewChapterMode) {
        if (!newChapterName.trim()) return setError("Donne un nom au nouveau chapitre.");
        const chapter = await createChapter.mutateAsync(newChapterName.trim());
        targetChapterId = chapter.id;
        targetChapterName = newChapterName.trim();
      }
      if (!targetChapterId) return setError("Choisis ou crée un chapitre.");

      await createQuestion.mutateAsync({
        chapterId: targetChapterId,
        subjectId: activeSubjectId,
        question,
        answer,
        questionImages,
        answerImages,
      });
    } catch (err) {
      setError(pbErrorMessage(err, "Impossible de créer la question."));
      return;
    }

    setCreated((prev) => [{ q: question, meta: `${subjectDetail?.name ?? ""} · ${targetChapterName}` }, ...prev].slice(0, 6));
    toast.show("Question ajoutée.");
    setQuestion("");
    setAnswer("");
    setQuestionImages([]);
    setAnswerImages([]);
    setChapterId(targetChapterId);
    setNewChapterMode(false);
    setNewChapterName("");
    questionRef.current?.focus();
  }

  function onCtrlEnter(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="animate-fade">
      <h1 className="m-0 mb-1 text-2xl font-medium tracking-tight">Nouvelle question</h1>
      <p className="m-0 mb-[22px] text-[13.5px] text-muted flex items-center gap-3 flex-wrap">
        <span>
          <kbd className="px-1 py-0.5 rounded border border-border text-[11px]">Tab</kbd> pour passer à la réponse,{" "}
          <kbd className="px-1 py-0.5 rounded border border-border text-[11px]">Ctrl+Entrée</kbd> pour enregistrer et enchaîner.
        </span>
        <FormulaHelpButton />
      </p>

      <div className="grid gap-[18px] items-start lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-[15px]">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="block text-xs mb-1.5 text-muted">
                Question{" "}
                <span style={{ color: "var(--faint)" }}>
                  · $\LaTeX$, \ce{"{H2O}"} pour une équation, ou tape une formule/un nom (ex. C6H12O6, glucose) pour une structure
                </span>
              </span>
              <MoleculeAwareTextarea
                ref={questionRef}
                autoFocus
                tabIndex={1}
                className="min-h-[110px] text-[15px]"
                placeholder="En quelle année commence la Première Guerre mondiale ? Ou : $\ce{2H2 + O2 -> 2H2O}$"
                value={question}
                onChange={setQuestion}
                onKeyDown={onCtrlEnter}
                onPaste={(e) => {
                  const files = extractPastedImages(e);
                  if (files.length) { e.preventDefault(); setQuestionImages((prev) => [...prev, ...files]); }
                }}
              />
              {question.trim() && (
                <div className="mt-2 p-2.5 rounded-md text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <MathText text={question} smilesPlacement="omit" />
                </div>
              )}
              <MoleculeStrip text={question} className="mt-2" />
              <div className="mt-2">
                <ImagePicker label="Coller (Ctrl+V) ou ajouter une photo" images={questionImages} onChange={setQuestionImages} />
              </div>
            </label>
            <label className="block">
              <span className="block text-xs mb-1.5 text-muted">Réponse</span>
              <MoleculeAwareTextarea
                tabIndex={2}
                className="min-h-[110px] text-[15px]"
                placeholder="1914"
                value={answer}
                onChange={setAnswer}
                onKeyDown={onCtrlEnter}
                onPaste={(e) => {
                  const files = extractPastedImages(e);
                  if (files.length) { e.preventDefault(); setAnswerImages((prev) => [...prev, ...files]); }
                }}
              />
              {answer.trim() && (
                <div className="mt-2 p-2.5 rounded-md text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--accent)" }}>
                  <MathText text={answer} smilesPlacement="omit" />
                </div>
              )}
              <MoleculeStrip text={answer} className="mt-2" />
              <div className="mt-2">
                <ImagePicker label="Coller (Ctrl+V) ou ajouter une photo" images={answerImages} onChange={setAnswerImages} />
              </div>
            </label>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <label className="block">
              <span className="block text-xs mb-1.5 text-muted">Matière</span>
              <Select tabIndex={3} value={activeSubjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); setNewChapterMode(false); }}>
                {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="block text-xs mb-1.5 text-muted">Chapitre</span>
              <Select
                tabIndex={4}
                value={effectiveNewChapterMode ? "__new" : activeChapterId}
                onChange={(e) => {
                  if (e.target.value === "__new") setNewChapterMode(true);
                  else { setNewChapterMode(false); setChapterId(e.target.value); }
                }}
              >
                {subjectDetail?.chaptersList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new">+ Nouveau chapitre…</option>
              </Select>
            </label>
          </div>
          {effectiveNewChapterMode && (
            <label className="block animate-rise">
              <span className="block text-xs mb-1.5 text-muted">Nom du nouveau chapitre</span>
              <Input
                placeholder="Géométrie dans l'espace"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                style={{ borderColor: "var(--accent-line)" }}
              />
            </label>
          )}

          {error && <p className="m-0 text-[13px]" style={{ color: "var(--err)" }}>{error}</p>}

          <div className="flex gap-2.5 flex-wrap mt-1">
            <Button variant="solid" onClick={submit} disabled={createQuestion.isPending}>
              <i className="ph ph-check" style={{ fontSize: 15 }} /> Créer la question
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="p-[15px] border border-border rounded-lg bg-surface">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12.5px] text-muted">Ajoutées à l'instant</span>
              <span className="text-xs tabular-nums px-2 py-0.5 rounded-full" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
                {created.length}
              </span>
            </div>
            {created.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {created.map((c, i) => (
                  <div key={i} className="p-[10px_11px] border border-border rounded-md bg-surface2 animate-rise">
                    <div className="text-[13px] mb-1"><MathText text={c.q} smilesPlacement="omit" /></div>
                    <MoleculeStrip text={c.q} className="mb-1" />
                    <div className="text-[11.5px]" style={{ color: "var(--faint)" }}>{c.meta}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 text-[12.5px]" style={{ color: "var(--faint)", textWrap: "pretty" }}>
                Rien pour l'instant. Les questions créées s'empilent ici pour que tu puisses relire ta série sans quitter l'écran.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
