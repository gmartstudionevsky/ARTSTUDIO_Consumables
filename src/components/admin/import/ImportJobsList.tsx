import { ImportJobStatus } from '@prisma/client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type Job = {
  id: string;
  createdAt: string;
  status: ImportJobStatus;
  sourceFilename: string;
  error: string | null;
};

function statusVariant(status: ImportJobStatus): 'ok' | 'warn' | 'critical' | 'neutral' {
  if (status === 'COMMITTED') return 'ok';
  if (status === 'FAILED') return 'critical';
  if (status === 'DRAFT') return 'warn';
  return 'neutral';
}

export function ImportJobsList({ jobs }: { jobs: Job[] }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>История импортов</CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? <p className="text-sm text-muted">Импортов пока нет.</p> : null}
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-text">{job.sourceFilename}</p>
                <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
              </div>
              <p className="text-xs text-muted">{new Date(job.createdAt).toLocaleString('ru-RU')}</p>
              {job.error ? <p className="mt-1 text-xs text-critical">{job.error}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
