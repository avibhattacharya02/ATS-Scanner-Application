"use client";

import { ChangeEvent, useState } from "react";
import { calculateAtsScore, generateResumeSuggestions } from "@/lib/ats";

type ResultState = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  aiSuggestions: string[];
  aiEnabled: boolean;
  resumeText: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
  };

  const handleScan = async () => {
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
        resumeText?: unknown;
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

      const resumeText = typeof data.resumeText === "string" ? data.resumeText : "";
      const analysis = calculateAtsScore(resumeText, jobDescription);
      const suggestions = generateResumeSuggestions(
        resumeText,
        jobDescription
      );
      const aiSuggestions = Array.isArray(data.aiSuggestions)
        ? data.aiSuggestions.filter((item: unknown) => typeof item === "string")
        : [];

      setResult({
        score: analysis.score,
        matchedKeywords: analysis.matchedKeywords,
        missingKeywords: analysis.missingKeywords,
        suggestions,
        aiSuggestions,
        aiEnabled: Boolean(data.aiEnabled),
        resumeText,
      });
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

        <button className="rounded-lg bg-blue-600 px-5 py-2 hover:bg-blue-700">
          Get Started
        </button>
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
                <span className={`text-6xl font-bold ${result.score >= 80 ? "text-emerald-400" : result.score >= 65 ? "text-yellow-400" : "text-red-400"}`}>
                  {result.score}
                </span>
                <span className="pb-2 text-2xl text-gray-400">/ 100</span>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-gray-800">
                <div
                  className={`h-full rounded-full ${result.score >= 80 ? "bg-emerald-500" : result.score >= 65 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-sm text-gray-400">Matched keywords</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.matchedKeywords.length ? (
                      result.matchedKeywords.map((keyword) => (
                        <span key={keyword} className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                          {keyword}
                        </span>
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
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Things to change in the resume</p>
              <ul className="mt-6 space-y-4">
                {result.suggestions.map((suggestion, index) => (
                  <li key={`${suggestion}-${index}`} className="flex gap-3 rounded-xl border border-gray-800 bg-gray-950 p-4">
                    <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
                      {index + 1}
                    </span>
                    <p className="text-gray-300">{suggestion}</p>
                  </li>
                ))}
              </ul>

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
      </section>
    </main>
  );
}