import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { pb } from "@/lib/pb";
import { useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AppShell } from "@/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";

const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const SubjectsPage = lazy(() => import("@/pages/SubjectsPage").then((m) => ({ default: m.SubjectsPage })));
const SubjectDetailPage = lazy(() => import("@/pages/SubjectDetailPage").then((m) => ({ default: m.SubjectDetailPage })));
const ChapterDetailPage = lazy(() => import("@/pages/ChapterDetailPage").then((m) => ({ default: m.ChapterDetailPage })));
const CreateQuestionPage = lazy(() => import("@/pages/CreateQuestionPage").then((m) => ({ default: m.CreateQuestionPage })));
const ReviewHubPage = lazy(() => import("@/pages/ReviewHubPage").then((m) => ({ default: m.ReviewHubPage })));
const ReviewSessionPage = lazy(() => import("@/pages/ReviewSessionPage").then((m) => ({ default: m.ReviewSessionPage })));
const ReviewSummaryPage = lazy(() => import("@/pages/ReviewSummaryPage").then((m) => ({ default: m.ReviewSummaryPage })));
const NotesPage = lazy(() => import("@/pages/NotesPage").then((m) => ({ default: m.NotesPage })));
const PomodoroPage = lazy(() => import("@/pages/PomodoroPage").then((m) => ({ default: m.PomodoroPage })));
const StatsPage = lazy(() => import("@/pages/StatsPage").then((m) => ({ default: m.StatsPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

function Splash() {
  return (
    <div className="min-h-screen min-h-[100dvh] grid place-items-center bg-bg text-muted text-sm">
      Chargement…
    </div>
  );
}

// PocketBase's authStore restores the persisted session synchronously (see
// lib/auth.ts), so there's no "loading" phase for *having* a session — only
// for confirming the token is still valid server-side. Silent, one-shot,
// on mount: an expired/revoked token clears the store and the guard below
// redirects to /login.
function useAuthGuard() {
  const { user, isAuthenticated } = useAuth();
  const [checked, setChecked] = useState(!pb.authStore.isValid);

  useEffect(() => {
    if (!pb.authStore.isValid) return;
    pb.collection("users")
      .authRefresh()
      .catch(() => pb.authStore.clear())
      .finally(() => setChecked(true));
  }, []);

  return { user, isAuthenticated, checked };
}

export default function App() {
  const { user, isAuthenticated, checked } = useAuthGuard();

  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        {/* /register intentionally not routed — see RegisterPage.tsx for why
            the component is kept in the repo but unreachable. */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

        {!checked ? (
          <Route path="*" element={<Splash />} />
        ) : !isAuthenticated || !user ? (
          <Route path="*" element={<Navigate to="/login" replace />} />
        ) : (
          <Route
            element={
              <ThemeProvider>
                <ToastProvider>
                  <AppShell user={{ id: user.id, email: user.email, name: user.name, class_name: user.class_name, avatar: user.avatar }} />
                </ToastProvider>
              </ThemeProvider>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
            <Route path="/subjects/:subjectId/chapters/:chapterId" element={<ChapterDetailPage />} />
            <Route path="/create" element={<CreateQuestionPage />} />
            <Route path="/review" element={<ReviewHubPage />} />
            <Route path="/pomodoro" element={<PomodoroPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        )}

        {isAuthenticated && (
          <Route
            element={
              <ThemeProvider>
                <ToastProvider>
                  <Outlet />
                </ToastProvider>
              </ThemeProvider>
            }
          >
            {/* Review is a full-bleed, chrome-free experience — no sidebar/bottom nav. */}
            <Route path="/review/session" element={<ReviewSessionPage />} />
            <Route path="/review/summary" element={<ReviewSummaryPage />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
}
