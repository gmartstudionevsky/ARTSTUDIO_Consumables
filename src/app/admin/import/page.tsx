'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ImportIssuesTable } from '@/components/admin/import/ImportIssuesTable';
import { ImportJobsList } from '@/components/admin/import/ImportJobsList';
import { ImportSummary } from '@/components/admin/import/ImportSummary';
import { ImportUploadCard } from '@/components/admin/import/ImportUploadCard';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ImportIssue, ImportSummary as Summary } from '@/lib/import/types';

type JobsResponse = {
  items: Array<{
    id: string;
    createdAt: string;
    status: 'DRAFT' | 'COMMITTED' | 'FAILED';
    sourceFilename: string;
    error: string | null;
    canRollback?: boolean;
    rollbackHint?: string | null;
    rolledBackAt?: string | null;
  }>;
};

export default function AdminImportPage(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errors, setErrors] = useState<ImportIssue[]>([]);
  const [warnings, setWarnings] = useState<ImportIssue[]>([]);
  const [createOpening, setCreateOpening] = useState(true);
  const [toast, setToast] = useState('');
  const [jobs, setJobs] = useState<JobsResponse['items']>([]);
  const [rollingBackJobId, setRollingBackJobId] = useState<string | null>(null);

  async function loadJobs(): Promise<void> {
    const response = await fetch('/api/admin/import/jobs?limit=10&offset=0', { cache: 'no-store' });
    const json = (await response.json().catch(() => ({ items: [] }))) as JobsResponse;
    if (response.ok) setJobs(json.items);
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  async function handlePreview(): Promise<void> {
    if (!file) return;
    setLoadingPreview(true);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/admin/import/xlsx/preview', { method: 'POST', body: formData });
    const json = (await response.json().catch(() => null)) as { jobId: string; summary: Summary; errors: ImportIssue[]; warnings: ImportIssue[]; error?: string } | null;
    setLoadingPreview(false);

    if (!response.ok || !json) {
      setToast(json?.error ?? 'Ошибка предпросмотра');
      return;
    }

    setJobId(json.jobId);
    setSummary(json.summary);
    setErrors(json.errors);
    setWarnings(json.warnings);
    await loadJobs();
  }



  async function handleRollback(jobIdToRollback: string): Promise<void> {
    setRollingBackJobId(jobIdToRollback);
    const response = await fetch('/api/admin/import/xlsx/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: jobIdToRollback }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    setRollingBackJobId(null);

    if (!response.ok) {
      setToast(json?.error ?? 'Ошибка отката импорта');
      return;
    }

    setToast('Импорт откачен');
    await loadJobs();
  }

  async function handleCommit(): Promise<void> {
    if (!jobId) return;
    setLoadingCommit(true);
    const response = await fetch('/api/admin/import/xlsx/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, options: { createOpening } }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    setLoadingCommit(false);

    if (!response.ok) {
      setToast(json?.error ?? 'Ошибка импорта');
      return;
    }

    setToast('Импорт выполнен');
    await loadJobs();
  }

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text">Импорт</h1>
      </header>

      <ImportUploadCard onFileChange={setFile} onPreview={handlePreview} loading={loadingPreview} hasFile={Boolean(file)} />

      {summary ? (
        <section className="space-y-4">
          <ImportSummary summary={summary} />
          <p className="text-sm text-muted">
            При импорте создаются/обновляются номенклатурные позиции вместе с единицами измерения.
            Коды для новых позиций генерируются автоматически с нуля по внутренней последовательности.
          </p>
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={createOpening} onChange={(event) => setCreateOpening(event.target.checked)} />
            Создать открытие склада 01.03.2026
          </label>
          <ImportIssuesTable errors={errors} warnings={warnings} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCommit} loading={loadingCommit} disabled={errors.length > 0 || !jobId}>Импортировать</Button>
            <Link href="/catalog" className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text hover:bg-surface/80">Перейти в Номенклатуру</Link>
            <Link href="/stock" className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text hover:bg-surface/80">Перейти на Склад</Link>
          </div>
        </section>
      ) : null}

      <ImportJobsList jobs={jobs} onRollback={handleRollback} rollingBackJobId={rollingBackJobId} />
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </main>
  );
}
