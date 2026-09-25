import type { RequestKind, RequestStatus } from "@room-aura/shared";

/** Maps a request's (kind, status) to an i18next key — the JSON catalogues
 *  (packages/i18n/locales/*\/common.json) carry "status.service.*" and
 *  "status.order.*"; freetext requests use the service labels, same as
 *  packages/shared/src/request-state-machine.ts's STATUS_LABELS does. */
export function statusI18nKey(kind: RequestKind, status: RequestStatus): string {
  const group = kind === "order" ? "order" : "service";
  return `status.${group}.${status}`;
}
