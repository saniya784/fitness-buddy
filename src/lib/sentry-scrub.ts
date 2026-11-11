import type { ErrorEvent } from "@sentry/nextjs";

function scrubText(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(sk|pk|whsec)_[A-Za-z0-9_-]+\b/g, "[redacted-token]");
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;

  if (event.request) {
    const headers = { ...event.request.headers };
    for (const name of Object.keys(headers)) {
      if (/authorization|cookie|set-cookie|token|secret/i.test(name)) {
        delete headers[name];
      }
    }

    const requestUrl = event.request.url;
    event.request = {
      ...event.request,
      ...(requestUrl ? { url: requestUrl.split("?")[0] } : {}),
      headers,
      data: undefined,
      cookies: undefined,
      query_string: undefined,
    };
  }

  event.extra = undefined;
  event.contexts = undefined;
  if (event.message) event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubText(exception.value);
  }
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
    delete breadcrumb.data;
  }
  return event;
}
