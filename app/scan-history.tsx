"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type ScanHistoryProps = {
  supabase: SupabaseClient;
  refreshKey: number;
};

type ScanHistoryItem = {
  id: string;
  score: number;
  job_description: string;
  created_at: string;
};

export function ScanHistory({ supabase, refreshKey }: ScanHistoryProps) {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      const { data, error: queryError } = await supabase
        .from("scans")
        .select("id, score, job_description, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!active) return;
      setError(queryError ? "Could not load saved scans." : "");
      setScans((data ?? []) as ScanHistoryItem[]);
    }

    void loadHistory();
    return () => { active = false; };
  }, [supabase, refreshKey]);

  return (
    <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-lg font-semibold">Recent scans</h2>
      {error ? <p className="mt-3 text-sm text-amber-300">{error}</p> : null}
      {!error && scans.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Your saved scan history will appear here.</p>
      ) : null}
      <ul className="mt-4 divide-y divide-gray-800">
        {scans.map((scan) => (
          <li key={scan.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm text-gray-200">{scan.job_description}</p>
              <time className="mt-1 block text-xs text-gray-500" dateTime={scan.created_at}>
                {new Date(scan.created_at).toLocaleString()}
              </time>
            </div>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-200">
              {scan.score}/100
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-gray-500">Only your score, job description, and analysis summary are saved. Uploaded files and extracted resume text are not stored.</p>
    </section>
  );
}
