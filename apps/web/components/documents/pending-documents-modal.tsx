'use client';

import { ArrowSquareOut, SpinnerGap, ShieldCheck } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  usePendingDocuments,
  useAcceptDocument,
  getDocumentTypeLabel,
} from '@/hooks/use-documents';
import { cn } from '@/lib/utils';

/**
 * Blocking modal shown when user has pending legal documents after login.
 * Cannot be dismissed until all documents are accepted.
 */
export function PendingDocumentsModal() {
  const { data: pendingDocuments, isLoading } = usePendingDocuments();
  const acceptDocument = useAcceptDocument();

  const [checkedDocuments, setCheckedDocuments] = React.useState<Set<string>>(
    new Set()
  );
  const [isAccepting, setIsAccepting] = React.useState(false);

  const hasPendingDocuments =
    !isLoading && pendingDocuments && pendingDocuments.length > 0;

  const allChecked =
    hasPendingDocuments &&
    pendingDocuments.length === checkedDocuments.size;

  const handleCheckChange = (type: string, checked: boolean) => {
    setCheckedDocuments((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(type);
      } else {
        next.delete(type);
      }
      return next;
    });
  };

  const handleAcceptAll = async () => {
    if (!pendingDocuments || pendingDocuments.length === 0) return;

    setIsAccepting(true);
    try {
      // Accept documents sequentially
      for (const doc of pendingDocuments) {
        await acceptDocument.mutateAsync(doc.type);
      }
      toast.success('Все документы приняты');
    } catch {
      // Individual error toasts are handled by the mutation's onError
    } finally {
      setIsAccepting(false);
    }
  };

  if (!hasPendingDocuments) {
    return null;
  }

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mp-accent-primary/10">
              <ShieldCheck className="h-5 w-5 text-mp-accent-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Необходимо принять документы
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-mp-text-secondary">
            Для продолжения работы необходимо принять обновлённые документы.
          </DialogDescription>
        </DialogHeader>

        {/* Documents list */}
        <div className="space-y-3 my-2">
          {pendingDocuments.map((doc) => (
            <div
              key={doc.type}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                checkedDocuments.has(doc.type)
                  ? 'border-mp-accent-primary/30 bg-mp-accent-primary/5'
                  : 'border-mp-border bg-mp-surface/50'
              )}
            >
              <Checkbox
                id={`doc-${doc.type}`}
                checked={checkedDocuments.has(doc.type)}
                onCheckedChange={(checked) =>
                  handleCheckChange(doc.type, checked === true)
                }
                className="mt-0.5"
                disabled={isAccepting}
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`doc-${doc.type}`}
                  className="text-sm font-medium text-mp-text-primary cursor-pointer block"
                >
                  {doc.title}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-mp-text-secondary">
                    {getDocumentTypeLabel(doc.type)}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    v{doc.version}
                  </Badge>
                </div>
              </div>
              <Link
                href={`/documents/${doc.type}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-mp-accent-primary hover:text-mp-accent-primary/80 transition-colors shrink-0"
              >
                <span>Просмотреть</span>
                <ArrowSquareOut className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={handleAcceptAll}
            disabled={!allChecked || isAccepting}
            className="w-full sm:w-auto"
          >
            {isAccepting ? (
              <>
                <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                Принятие документов...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Принять выбранные
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
