import { ImportJobStatus } from '@prisma/client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type Job = {
  id: string;
  createdAt: string;
  status: ImportJobStatus;
  sourceFilename: string;
  error: string | null;
  canRollback?: boolean;
  rollbackHint?: string | null;
  rolledBackAt?: string | null;
};

function statusVariant(status: ImportJobStatus): 'ok' | 'warn' | 'critical' | 'neutral' {
  if (status === 'COMMITTED') return 'ok';
  if (status === 'FAILED') return 'critical';
  if (status === 'DRAFT') return 'warn';
  return 'neutral';
}

export function ImportJobsList({ jobs, onRollback, rollingBackJobId }: { jobs: Job[]; onRollback?: (jobId: string) => void; rollingBackJobId?: string | null }): JSX.Element {
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
                <div className="flex items-center gap-2">
                  {job.rolledBackAt ? <Badge variant="neutral">Откатан</Badge> : null}
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted">{new Date(job.createdAt).toLocaleString('ru-RU')}</p>
              {job.rolledBackAt ? <p className="mt-1 text-xs text-muted">Откат: {new Date(job.rolledBackAt).toLocaleString('ru-RU')}</p> : null}
              {job.error ? <p className="mt-1 text-xs text-critical">{job.error}</p> : null}
              {onRollback && job.status === 'COMMITTED' ? (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onRollback(job.id)}
                    loading={rollingBackJobId === job.id}
                    disabled={Boolean(rollingBackJobId) || !job.canRollback || Boolean(job.rolledBackAt)}
                  >
                    {job.rolledBackAt ? 'Импорт уже откачен' : 'Откатить импорт'}
                  </Button>
                  {!job.canRollback && !job.rolledBackAt ? <p className="mt-1 text-xs text-muted">{job.rollbackHint ?? 'Откат для этого импорта недоступен.'}</p> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
