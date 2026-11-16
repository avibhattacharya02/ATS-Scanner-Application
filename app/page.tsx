"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  type AtsAnalysis,
  type ResumeRecommendation,
  type ScoreDimension,
} from "@/lib/ats";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { AuthForm } from "@/app/auth-form";
import { ScanHistory } from "@/app/scan-history";
import type { User } from "@supabase/supabase-js";

type ResultState = {
  score: number;
  matchedKeywords: string[];
  matchedEvidence: Array<{ term: string; snippet: string }>;
  missingKeywords: string[];
  requiredGaps: string[];
  dimensions: ScoreDimension[];
  isAnalyzable: boolean;
  suggestions: ResumeRecommendation[];
  aiSuggestions: string[];
  aiEnabled: boolean;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const [resumeDraft, setResumeDraft] = useState("");
  const [addedDraftIds, setAddedDraftIds] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authRedirectError] = useState(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("authError") === "confirmation"
      ? "That confirmation link is invalid or expired. Sign up again to get a new link."
      : ""
  );
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  const supabase = useMemo(
    () => supabaseConfigured ? createSupabaseClient() : null,
    [supabaseConfigured]
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("authError")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let active = true;

    void client.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (session?.user) setHistoryRefreshKey((key) => key + 1);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const addRecommendationToDraft = (recommendation: ResumeRecommendation) => {
    if (!recommendation.draftText || addedDraftIds.includes(recommendation.id)) return;
    setResumeDraft((current) =>
      current.trim()
        ? `${current.trimEnd()}\n\n${recommendation.draftText}`
        : recommendation.draftText
    );
    setAddedDraftIds((current) => [...current, recommendation.id]);
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(resumeDraft);
      setCopyStatus("Draft copied. Review and replace all placeholders before using it.");
    } catch {
      setCopyStatus("Copy was blocked by the browser. Select and copy the draft text manually.");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
  };

  const handleScan = async () => {
    if (!user) {
      setError("Sign in before scanning a resume.");
      return;
    }
    if (!file) {
      setError("Please upload a resume file first.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please paste the job description before scanning.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      let data: {
        error?: unknown;
        analysis?: AtsAnalysis;
        aiSuggestions?: unknown;
        aiEnabled?: unknown;
      };

      try {
        data = JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        throw new Error(
          "The scan endpoint returned an unexpected response. Restart the development server and try again."
        );
      }

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Unable to parse resume."
        );
      }

      const analysis = data.analysis;
      if (!analysis) throw new Error("The scan response did not include its analysis.");
      const aiSuggestions = Array.isArray(data.aiSuggestions)
        ? data.aiSuggestions.filter((item: unknown) => typeof item === "string")
        : [];

      setResult({
        score: analysis.score,
        matchedKeywords: analysis.matchedKeywords,
        matchedEvidence: analysis.matchedEvidence,
        missingKeywords: analysis.missingKeywords,
        requiredGaps: analysis.requiredGaps,
        dimensions: analysis.dimensions,
        isAnalyzable: analysis.isAnalyzable,
        suggestions: analysis.recommendations,
        aiSuggestions,
        aiEnabled: Boolean(data.aiEnabled),
      });
      setHistoryRefreshKey((key) => key + 1);
      setResumeDraft("");
      setAddedDraftIds([]);
      setCopyStatus("");
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Something went wrong while scanning your resume."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between border-b border-gray-800 px-8 py-5">
        <h1 className="text-2xl font-bold">
          Hire<span className="text-blue-500">Pulse</span>
        </h1>

        {user ? (
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-400 sm:inline">{user.email}</span>
            <button
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"
              onClick={() => void supabase?.auth.signOut()}
              type="button"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-bold tracking-tight">
            Beat the ATS.
            <br />
            <span className="text-blue-500">Get More Interviews.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            Upload your resume and compare it against a job description to see your ATS score,
            missing keywords, and resume changes that will improve your chances.
          </p>
        </div>

        {!supabaseConfigured ? (
          <div className="mx-auto mt-12 max-w-2xl rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm leading-6 text-amber-100">
            Configure <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and <strong>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</strong> in the root environment file, then restart the app to enable accounts and saved scans.
          </div>
        ) : authLoading ? (
          <p className="mt-12 text-center text-gray-400" role="status">Checking your account…</p>
        ) : !user && supabase ? (
          <AuthForm initialError={authRedirectError} supabase={supabase} />
        ) : !supabase ? (
          <p className="mt-12 text-center text-red-300" role="alert">Could not initialize Supabase. Check the environment variables and reload.</p>
        ) : (
          <>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
            <h3 className="text-xl font-semibold">Upload Resume</h3>

            <label className="mt-6 flex h-52 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-700 hover:border-blue-500">
              <div className="text-center">
                <p className="text-4xl">📄</p>
                <p className="mt-3 font-medium">{file ? file.name : "Click to upload your resume"}</p>
                <p className="mt-2 text-sm text-gray-500">PDF or DOCX</p>
              </div>

              <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
            <h3 className="text-xl font-semibold">Job Description</h3>

            <textarea
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              className="mt-6 h-52 w-full resize-none rounded-xl border border-gray-700 bg-gray-950 p-4 text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            onClick={handleScan}
            disabled={isLoading}
            className="rounded-xl bg-blue-600 px-10 py-4 text-lg font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Scanning..." : "Scan My Resume"}
          </button>

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
        </div>

        {result ? (
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">ATS score</p>
              <div className="mt-6 flex items-end gap-3">
                <span className={`text-6xl font-bold ${!result.isAnalyzable ? "text-gray-500" : result.score >= 80 ? "text-emerald-400" : result.score >= 65 ? "text-yellow-400" : "text-red-400"}`}>
                  {result.isAnalyzable ? result.score : "—"}
                </span>
                <span className="pb-2 text-2xl text-gray-400">/ 100</span>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-gray-800">
                <div
                  className={`h-full rounded-full ${result.score >= 80 ? "bg-emerald-500" : result.score >= 65 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${result.isAnalyzable ? result.score : 0}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-500">
                Transparent estimate—not an actual ATS vendor score or a prediction of interview chances. Dimensions without job-description evidence are excluded from the weighted total.
              </p>

              <div className="mt-8 border-t border-gray-800 pt-6">
                <h3 className="font-semibold text-white">Score breakdown</h3>
                <div className="mt-4 space-y-4">
                  {result.dimensions.map((dimension) => (
                    <div key={dimension.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-200">{dimension.label}</span>
                        <span className="shrink-0 text-gray-400">
                          {dimension.score === null ? "Not assessed" : `${dimension.score}/100`}
                          <span className="ml-2 text-gray-600">{dimension.weight}%</span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${dimension.score ?? 0}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{dimension.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 space-y-6">
                {result.requiredGaps.length ? (
                  <div>
                    <p className="text-sm font-medium text-amber-300">Possible required-qualification gaps</p>
                    <p className="mt-1 text-xs text-gray-500">Review these carefully; the wording-based detector may not understand every requirement.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.requiredGaps.map((keyword) => (
                        <span key={keyword} className="rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-200">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="text-sm text-gray-400">Matched keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.matchedKeywords.length ? (
                      result.matchedKeywords.map((keyword) => (
                        <details key={keyword} className="group rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                          <summary className="cursor-pointer list-none">{keyword}<span className="ml-2 text-xs text-emerald-500">evidence</span></summary>
                          <p className="mt-2 max-w-md border-t border-emerald-500/15 pt-2 text-xs leading-5 text-gray-300">
                            {result.matchedEvidence.find((item) => item.term === keyword)?.snippet}
                          </p>
                        </details>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No keyword matches found.</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Missing keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.missingKeywords.length ? (
                      result.missingKeywords.map((keyword) => (
                        <span key={keyword} className="rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-300">
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No major gaps detected.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Recommendations to improve your score</p>
              <ul className="mt-6 space-y-4">
                {result.suggestions.map((suggestion, index) => (
                  <li key={suggestion.id} className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-950 p-4 sm:flex-row">
                    <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-300">{suggestion.text}</p>
                      {suggestion.draftText ? (
                        <button
                          type="button"
                          onClick={() => addRecommendationToDraft(suggestion)}
                          disabled={addedDraftIds.includes(suggestion.id)}
                          className="mt-3 rounded-lg border border-blue-500/30 px-3 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/10 disabled:cursor-default disabled:border-emerald-500/30 disabled:text-emerald-300"
                        >
                          {addedDraftIds.includes(suggestion.id) ? "Added to draft" : "Add draft with one click"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              {result.suggestions.some((suggestion) => suggestion.draftText) ? (
                <div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-white">Resume improvement draft</h4>
                      <p className="mt-1 text-xs leading-5 text-gray-400">
                        This does not change your uploaded file. Edit the placeholders and keep only claims that are true for you.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyDraft}
                      disabled={!resumeDraft.trim()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copy draft
                    </button>
                  </div>
                  <textarea
                    aria-label="Editable resume improvement draft"
                    value={resumeDraft}
                    onChange={(event) => setResumeDraft(event.target.value)}
                    placeholder="Choose Add draft on a recommendation to start an editable draft."
                    className="mt-4 min-h-44 w-full resize-y rounded-xl border border-gray-700 bg-gray-950 p-4 text-sm leading-6 text-gray-200 outline-none focus:border-blue-500"
                  />
                  {copyStatus ? <p role="status" className="mt-2 text-xs text-gray-400">{copyStatus}</p> : null}
                </div>
              ) : null}

              <div className="mt-8 border-t border-gray-800 pt-6">
                <h4 className="font-semibold text-white">AI resume coach</h4>
                {result.aiSuggestions.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {result.aiSuggestions.map((suggestion, index) => (
                      <li key={`${suggestion}-${index}`} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-gray-300">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    {result.aiEnabled
                      ? "AI suggestions could not be generated for this scan. Local suggestions are shown above."
                      : "Add GEMINI_API_KEY to .env.local to enable AI-generated suggestions. Local suggestions work without it."}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
        <ScanHistory supabase={supabase} refreshKey={historyRefreshKey} />
          </>
        )}
      </section>
    </main>
  );
}