const PATH = { comments: "/comments", tickets: "/tickets" } as const;

export const DEFAULT_PAGE_SIZE = 10;

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "/api/backend";
}

export type SpringPageMetadata = {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
};

export type PagedResult<T> = { items: T[]; page: SpringPageMetadata };

export type TriageStatus = "PENDING" | "TICKET_CREATED" | "NO_TICKET" | "FAILED";

export type UiComment = {
  id: string;
  text: string;
  createdDate: string;
  triageStatus: TriageStatus;
};

export type UiTicket = {
  id: string;
  title: string;
  category?: string;
  priority?: string;
  summary?: string;
  commentId?: string;
  createdAt?: string;
};

function pageQuery(page: number, size: number, sort: string): string {
  return `?${new URLSearchParams({
    page: String(page),
    size: String(size),
    sort,
  })}`;
}

function unwrapRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const c = (data as Record<string, unknown>).content;
    if (Array.isArray(c)) return c;
  }
  return [];
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asText(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return String(v);
  return undefined;
}

function pickStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const t = asText(o[k]);
    if (t) return t;
  }
  return "";
}

function normalizeTriageStatus(v: unknown): TriageStatus {
  if (typeof v !== "string") return "PENDING";
  switch (v.toUpperCase()) {
    case "TICKET_CREATED": return "TICKET_CREATED";
    case "NO_TICKET":      return "NO_TICKET";
    case "FAILED":         return "FAILED";
    default:               return "PENDING";
  }
}

function parseSpringMeta(data: unknown, rowCount: number): SpringPageMetadata {
  const o = asRecord(data);
  if (!o) {
    return {
      number: 0,
      size: rowCount,
      totalElements: rowCount,
      totalPages: rowCount > 0 ? 1 : 0,
      first: true,
      last: true,
      numberOfElements: rowCount,
    };
  }
  const contentLen = Array.isArray(o.content) ? o.content.length : rowCount;
  const totalElements =
    typeof o.totalElements === "number" ? o.totalElements : contentLen;
  const number = typeof o.number === "number" ? o.number : 0;
  const size =
    typeof o.size === "number"
      ? o.size
      : contentLen > 0
        ? contentLen
        : DEFAULT_PAGE_SIZE;
  let totalPages = typeof o.totalPages === "number" ? o.totalPages : 0;
  if (totalPages === 0 && totalElements > 0 && size > 0) {
    totalPages = Math.max(1, Math.ceil(totalElements / size));
  }
  return {
    number,
    size,
    totalElements,
    totalPages,
    first: typeof o.first === "boolean" ? o.first : number === 0,
    last:
      typeof o.last === "boolean"
        ? o.last
        : number >= Math.max(totalPages, 1) - 1,
    numberOfElements:
      typeof o.numberOfElements === "number" ? o.numberOfElements : contentLen,
  };
}

function normalizeComment(raw: unknown, index: number): UiComment | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id =
    asText(o.id) ?? asText(o.uuid) ?? `comment-${index}`;
  const text = pickStr(o, ["text", "body", "content"]);
  const createdDate =
    asText(o.createdDate) ??
    asText(o.createdAt) ??
    new Date().toISOString();
  const triageStatus = normalizeTriageStatus(
    o.triageStatus ?? o.triage_status,
  );
  return { id, text, createdDate, triageStatus };
}

function normalizeTicket(raw: unknown, index: number): UiTicket | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = asText(o.id) ?? `ticket-${index}`;
  const title = pickStr(o, ["title", "name"]) || "Untitled ticket";
  return {
    id,
    title,
    category: asText(o.category),
    priority: asText(o.priority),
    summary: pickStr(o, ["summary", "description"]),
    commentId:
      asText(o.commentId) ?? asText(o.comment_id),
    createdAt:
      asText(o.createdAt) ?? asText(o.created_at) ?? asText(o.createdDate),
  };
}

function mapPaged<T>(
  data: unknown,
  normalize: (raw: unknown, index: number) => T | null,
): PagedResult<T> {
  const rows = unwrapRows(data);
  const items = rows
    .map((row, i) => normalize(row, i))
    .filter((x): x is T => x !== null);
  return { items, page: parseSpringMeta(data, items.length) };
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

async function requestJson(
  url: string,
  failMessage: string,
  init?: RequestInit,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiError(`Network error: ${msg}`, 0, { cause: e });
  }
  const body = await parseJson(res);
  if (!res.ok) throw new ApiError(failMessage, res.status, body);
  return body;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function formatApiErrorMessage(err: ApiError): string {
  if (err.status === 0) return err.message;
  const b = err.body;
  if (b && typeof b === "object" && !Array.isArray(b)) {
    const o = b as Record<string, unknown>;
    const m = typeof o.message === "string" ? o.message.trim() : "";
    if (m) return `${err.message} (${err.status}): ${m}`;
    const errors = o.errors;
    if (Array.isArray(errors) && errors[0] && typeof errors[0] === "object") {
      const d = (errors[0] as Record<string, unknown>).defaultMessage;
      if (typeof d === "string" && d.trim())
        return `${err.message} (${err.status}): ${d}`;
    }
  }
  return `${err.message} (${err.status})`;
}

export async function fetchCommentsPage(
  page: number,
  size: number = DEFAULT_PAGE_SIZE,
): Promise<PagedResult<UiComment>> {
  const base = getApiBaseUrl();
  const url = `${base}${PATH.comments}${pageQuery(page, size, "createdAt,desc")}`;
  const body = await requestJson(url, "Failed to load comments");
  return mapPaged(body, normalizeComment);
}

export async function fetchTicketsPage(
  page: number,
  size: number = DEFAULT_PAGE_SIZE,
): Promise<PagedResult<UiTicket>> {
  const base = getApiBaseUrl();
  const url = `${base}${PATH.tickets}${pageQuery(page, size, "createdAt,desc")}`;
  const body = await requestJson(url, "Failed to load tickets");
  return mapPaged(body, normalizeTicket);
}

export type SubmitCommentInput = { body: string };

export async function submitComment(
  input: SubmitCommentInput,
): Promise<unknown> {
  const base = getApiBaseUrl();
  return requestJson(`${base}${PATH.comments}`, "Failed to submit comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.body }),
  });
}
