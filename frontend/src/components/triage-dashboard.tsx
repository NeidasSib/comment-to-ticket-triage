"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Sparkles,
  Ticket,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiError,
  DEFAULT_PAGE_SIZE,
  fetchCommentsPage,
  fetchTicketsPage,
  formatApiErrorMessage,
  submitComment,
  type PagedResult,
  type TriageStatus,
  type UiComment,
  type UiTicket,
} from "@/lib/triage-api";
import { cn } from "@/lib/utils";

const MAX_COMMENT_LENGTH = 500;
const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_ATTEMPTS = 10;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type PriorityLevel = "high" | "medium" | "low" | "unknown";

function priorityLevel(priority: string | undefined): PriorityLevel {
  const p = priority?.trim().toLowerCase() ?? "";
  if (p === "high" || p === "medium" || p === "low") return p;
  return "unknown";
}

function formatPriorityLabel(priority: string): string {
  const raw = priority.trim();
  if (!raw) return priority;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function priorityBadgeClass(priority: string | undefined): string {
  switch (priorityLevel(priority)) {
    case "high":
      return "border-destructive/55 bg-destructive/12 text-destructive dark:bg-destructive/20";
    case "medium":
      return "border-amber-500/55 bg-amber-500/12 text-amber-950 dark:border-amber-400/45 dark:bg-amber-400/12 dark:text-amber-50";
    case "low":
      return "border-emerald-600/45 bg-emerald-500/10 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-50";
    default:
      return "border-border text-muted-foreground";
  }
}

function priorityCardAccentClass(priority: string | undefined): string {
  switch (priorityLevel(priority)) {
    case "high":
      return "border-l-[3px] border-l-destructive";
    case "medium":
      return "border-l-[3px] border-l-amber-500";
    case "low":
      return "border-l-[3px] border-l-emerald-500";
    default:
      return "";
  }
}

function hasPendingTriage(items: UiComment[]): boolean {
  return items.some((c) => c.triageStatus === "PENDING");
}

function TriageStatusIndicator({ status }: { status: TriageStatus }) {
  if (status === "TICKET_CREATED") {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5"
        aria-label="Ticket generated from this comment"
      >
        <Sparkles
          className="size-4 text-amber-400 [filter:drop-shadow(0_0_4px_rgb(250,204,21))_drop-shadow(0_0_12px_rgba(250,204,21,0.9))_drop-shadow(0_0_20px_rgba(234,179,8,0.45))]"
          aria-hidden
        />
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-xs">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Triaging…
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="text-destructive inline-flex shrink-0 items-center gap-1 text-xs">
        <XCircle className="size-3" aria-hidden />
        Triage failed
      </span>
    );
  }
  return null;
}

function apiMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return formatApiErrorMessage(e);
  if (e instanceof Error) return e.message;
  return fallback;
}

function PageNav({
  page,
  loading,
  onPrev,
  onNext,
  label,
}: {
  page: PagedResult<unknown>["page"];
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  label: string;
}) {
  const { number, totalPages, first, last } = page;
  const pageCount = Math.max(totalPages, 1);
  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
      <span>
        {label}: page {number + 1} of {pageCount}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={loading || first}
          onClick={onPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={loading || last}
          onClick={onNext}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function TriageDashboard() {
  const [body, setBody] = useState("");
  const [comments, setComments] = useState<PagedResult<UiComment> | null>(
    null,
  );
  const [tickets, setTickets] = useState<PagedResult<UiTicket> | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshIconKey, setRefreshIconKey] = useState(0);
  const [pollingActive, setPollingActive] = useState(false);
  const pollAttemptsRef = useRef(0);

  const loadComments = useCallback(async (page: number) => {
    setLoadingComments(true);
    setListError(null);
    try {
      setComments(await fetchCommentsPage(page, DEFAULT_PAGE_SIZE));
    } catch (e) {
      setListError(apiMessage(e, "Could not load comments."));
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const loadTickets = useCallback(async (page: number) => {
    setLoadingTickets(true);
    setListError(null);
    try {
      setTickets(await fetchTicketsPage(page, DEFAULT_PAGE_SIZE));
    } catch (e) {
      setListError(apiMessage(e, "Could not load tickets."));
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  const refreshFromStart = useCallback(async () => {
    await Promise.all([loadComments(0), loadTickets(0)]);
  }, [loadComments, loadTickets]);

  const handleRefreshClick = useCallback(() => {
    setRefreshIconKey((k) => k + 1);
    void refreshFromStart();
  }, [refreshFromStart]);

  useEffect(() => {
    void refreshFromStart();
  }, [refreshFromStart]);

  useEffect(() => {
    if (!pollingActive) return;
    pollAttemptsRef.current = 0;

    const id = setInterval(() => {
      pollAttemptsRef.current += 1;
      void (async () => {
        try {
          const [commentsResult, ticketsResult] = await Promise.all([
            fetchCommentsPage(0, DEFAULT_PAGE_SIZE),
            fetchTicketsPage(0, DEFAULT_PAGE_SIZE),
          ]);
          setComments(commentsResult);
          setTickets(ticketsResult);
          if (
            !hasPendingTriage(commentsResult.items) ||
            pollAttemptsRef.current >= POLL_MAX_ATTEMPTS
          ) {
            setPollingActive(false);
          }
        } catch {
          setPollingActive(false);
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [pollingActive]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setActionError(null);
    setSubmitting(true);
    try {
      await submitComment({ body: trimmed });
      setBody("");
      await refreshFromStart();
      setPollingActive(true);
    } catch (err) {
      setActionError(apiMessage(err, "Submit failed."));
    } finally {
      setSubmitting(false);
    }
  }

  const commentsPageLabel = comments
    ? `${comments.page.number + 1}/${Math.max(comments.page.totalPages, 1)}`
    : null;
  const ticketsPageLabel = tickets
    ? `${tickets.page.number + 1}/${Math.max(tickets.page.totalPages, 1)}`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-10 px-4">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Comment to ticket triage backend showcase
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquarePlus className="size-4 opacity-80" aria-hidden />
            New comment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="body">Comment</Label>
              <Textarea
                id="body"
                name="body"
                required
                placeholder="Please leave a comment"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={MAX_COMMENT_LENGTH}
                aria-describedby="body-counter"
              />
              <p
                id="body-counter"
                className={cn(
                  "text-right text-xs tabular-nums",
                  body.length >= MAX_COMMENT_LENGTH
                    ? "text-destructive font-medium"
                    : body.length >= MAX_COMMENT_LENGTH * 0.8
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground",
                )}
                aria-live="polite"
              >
                {body.length} / {MAX_COMMENT_LENGTH}
              </p>
            </div>
            {actionError ? (
              <p className="text-destructive flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {actionError}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={
                submitting ||
                !body.trim() ||
                body.length > MAX_COMMENT_LENGTH
              }
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="comments" className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="line" className="w-full min-w-0 sm:w-auto">
            <TabsTrigger value="comments">
              Comments
              {commentsPageLabel ? (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1">
                  {commentsPageLabel}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <Ticket className="size-3.5 opacity-70" aria-hidden />
              Tickets
              {ticketsPageLabel ? (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1">
                  {ticketsPageLabel}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            disabled={loadingComments || loadingTickets}
          >
            <RefreshCw
              key={refreshIconKey}
              className={cn(
                "size-3.5",
                refreshIconKey > 0 && "animate-refresh-icon-once",
              )}
              aria-hidden
            />
            Refresh
          </Button>
        </div>

        {listError ? (
          <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{listError}</span>
          </div>
        ) : null}

        <TabsContent value="comments" className="mt-0 space-y-3">
          {loadingComments && !comments ? (
            <p className="text-muted-foreground text-sm">Loading comments…</p>
          ) : null}
          {!loadingComments && comments && comments.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No comments yet.</p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {(comments?.items ?? []).map((c) => (
              <li key={c.id}>
                <Card size="sm" className="py-3">
                  <CardHeader className="px-3 pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-sm">Comment #{c.id}</CardTitle>
                      <TriageStatusIndicator status={c.triageStatus} />
                    </div>
                    <CardDescription className="text-xs">
                      {formatWhen(c.createdDate)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 pt-2">
                    <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                      {c.text}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {comments ? (
            <PageNav
              page={comments.page}
              loading={loadingComments}
              label="Comments"
              onPrev={() => void loadComments(comments.page.number - 1)}
              onNext={() => void loadComments(comments.page.number + 1)}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="tickets" className="mt-0 space-y-3">
          {loadingTickets && !tickets ? (
            <p className="text-muted-foreground text-sm">Loading tickets…</p>
          ) : null}
          {!loadingTickets && tickets && tickets.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No tickets on this page.
            </p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {(tickets?.items ?? []).map((t) => (
              <li key={t.id}>
                <Card
                  size="sm"
                  className={cn("py-3", priorityCardAccentClass(t.priority))}
                >
                  <CardHeader className="px-3 pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-sm">{t.title}</CardTitle>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {t.category ? (
                          <Badge variant="secondary">{t.category}</Badge>
                        ) : null}
                        {t.priority ? (
                          <Badge
                            variant="outline"
                            className={priorityBadgeClass(t.priority)}
                          >
                            {formatPriorityLabel(t.priority)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {t.createdAt ? (
                      <CardDescription className="text-xs">
                        {formatWhen(t.createdAt)} · id {t.id}
                      </CardDescription>
                    ) : (
                      <CardDescription className="text-xs">id {t.id}</CardDescription>
                    )}
                  </CardHeader>
                  {t.summary ? (
                    <CardContent className="px-3 pt-2">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Summary
                      </p>
                      <p className="text-foreground mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                        {t.summary}
                      </p>
                    </CardContent>
                  ) : null}
                  {t.commentId ? (
                    <CardFooter className="text-muted-foreground px-3 text-xs">
                      Comment {t.commentId}
                    </CardFooter>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
          {tickets ? (
            <PageNav
              page={tickets.page}
              loading={loadingTickets}
              label="Tickets"
              onPrev={() => void loadTickets(tickets.page.number - 1)}
              onNext={() => void loadTickets(tickets.page.number + 1)}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
