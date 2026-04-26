import { spawn } from 'node:child_process';

const TOKEN_PATTERN = /\{(profile|message)\}/g;

export function parseTemplate(template) {
  const args = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < template.length; i++) {
    const c = template[i];
    if (quote) {
      if (c === quote) {
        quote = null;
      } else if (c === '\\' && i + 1 < template.length) {
        current += template[++i];
      } else {
        current += c;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === ' ' || c === '\t') {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += c;
  }
  if (current.length > 0) args.push(current);
  if (args.length === 0) throw new Error('Empty command template');
  return args;
}

export function buildArgv(template, { profile, message }) {
  const tokens = parseTemplate(template);
  const substituted = tokens.map((tok) =>
    tok.replace(TOKEN_PATTERN, (_, k) => (k === 'profile' ? profile : message))
  );
  return { bin: substituted[0], args: substituted.slice(1) };
}

export function runHermes({ template, profile, message, onChunk, onError, onDone, signal }) {
  const { bin, args } = buildArgv(template, { profile, message });
  const child = spawn(bin, args, { signal });

  let stderrBuf = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (chunk) => onChunk?.(chunk));
  child.stderr.on('data', (chunk) => {
    stderrBuf += chunk;
  });

  child.on('error', (err) => onError?.(err));
  child.on('close', (code) => {
    if (code === 0) {
      onDone?.({ code });
    } else {
      onError?.(new Error(stderrBuf.trim() || `hermes exited with code ${code}`));
    }
  });

  return child;
}
