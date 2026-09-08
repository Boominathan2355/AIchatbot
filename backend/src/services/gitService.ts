import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 30_000;
const GIT_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const DEFAULT_LOG_LIMIT = 20;

/**
 * Arguments are passed as an array, never interpolated into a shell string -
 * a commit message or filename cannot escape into command execution.
 */
export async function runGitCommand(repositoryPath: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd: repositoryPath,
    maxBuffer: GIT_MAX_BUFFER_BYTES,
    timeout: GIT_TIMEOUT_MS,
  });
  return stdout;
}

/** Reject anything that git would interpret as an option rather than a path. */
export function toGitPathspecs(files: unknown): string[] {
  const list = Array.isArray(files) ? files : typeof files === 'string' ? [files] : ['.'];
  const pathspecs = list.map(String).filter((file) => file.length > 0);
  if (pathspecs.length === 0) return ['.'];
  if (pathspecs.some((file) => file.startsWith('-'))) {
    throw new Error('File paths may not start with "-"');
  }
  return pathspecs;
}

export function getStatus(repositoryPath: string): Promise<string> {
  return runGitCommand(repositoryPath, ['status', '--porcelain', '--branch']);
}

export function getLog(repositoryPath: string, limit: number = DEFAULT_LOG_LIMIT): Promise<string> {
  return runGitCommand(repositoryPath, ['log', '--oneline', `-${limit}`]);
}

export function stageFiles(repositoryPath: string, files: unknown): Promise<string> {
  return runGitCommand(repositoryPath, ['add', '--', ...toGitPathspecs(files)]);
}

export function commit(repositoryPath: string, message: string): Promise<string> {
  return runGitCommand(repositoryPath, ['commit', '-m', message]);
}

export function initRepository(repositoryPath: string): Promise<string> {
  return runGitCommand(repositoryPath, ['init']);
}
