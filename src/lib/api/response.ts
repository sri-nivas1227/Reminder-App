export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

export function badRequest(message: string, details?: unknown): Response {
  return json({ error: message, details }, { status: 400 });
}

export function unauthorized(): Response {
  return json({ error: 'Unauthorized' }, { status: 401 });
}

export function notFound(): Response {
  return json({ error: 'Not found' }, { status: 404 });
}

export function serverError(message = 'Server error'): Response {
  return json({ error: message }, { status: 500 });
}
