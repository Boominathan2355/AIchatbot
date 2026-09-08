import path from 'path';
import fs from 'fs/promises';
import { Request } from 'express';
import { config } from '../config/env';

export interface PathDenied {
  ok: false;
  status: number;
  message: string;
}

export interface PathAllowed {
  ok: true;
  target: string;
  base: string;
}

export type PathResult = PathAllowed | PathDenied;

function contains(base: string, target: string): boolean {
  return target === base || target.startsWith(base + path.sep);
}

/**
 * Resolve symlinks for the deepest existing ancestor of `target`, so that a
 * symlink inside the allowed base cannot point outside it. Paths that do not
 * exist yet (a file about to be written) resolve through their parent.
 */
async function realPathOrNearest(target: string): Promise<string> {
  let current = target;
  const trailing: string[] = [];

  for (;;) {
    try {
      const real = await fs.realpath(current);
      return trailing.length ? path.join(real, ...trailing.reverse()) : real;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return target;
      trailing.push(path.basename(current));
      current = parent;
    }
  }
}

/**
 * Client-supplied "Allowed Path" from Settings. It can only narrow the
 * server-configured base, never widen it, so it is not a security boundary
 * on its own - the server root is.
 */
function getClientBase(req: Request): string | null {
  const raw =
    (req.headers['x-allowed-path'] as string) ||
    (req.query?.allowedPath as string) ||
    (req.body?.allowedPath as string) ||
    '';
  return raw ? path.resolve(raw) : null;
}

/**
 * Validate a requested path against the server's allowed base.
 *
 * Denies when ALLOWED_BASE_PATH is unset - local access is opt-in by the
 * operator, and an absent boundary must never mean "no restriction".
 */
export async function resolveAllowedPath(req: Request, requestedPath?: string): Promise<PathResult> {
  if (!config.allowedBasePath) {
    return {
      ok: false,
      status: 403,
      message:
        'Local file and git access is disabled on this server. Set ALLOWED_BASE_PATH in the backend environment to enable it.',
    };
  }

  const serverRoot = await realPathOrNearest(path.resolve(config.allowedBasePath));

  const clientBase = getClientBase(req);
  let base = serverRoot;
  if (clientBase) {
    const resolvedClientBase = await realPathOrNearest(clientBase);
    if (!contains(serverRoot, resolvedClientBase)) {
      return {
        ok: false,
        status: 403,
        message: 'Allowed Path is outside the directory this server permits.',
      };
    }
    base = resolvedClientBase;
  }

  const target = requestedPath ? await realPathOrNearest(path.resolve(requestedPath)) : base;

  if (!contains(base, target)) {
    return { ok: false, status: 403, message: 'Path not allowed.' };
  }

  return { ok: true, target, base };
}
