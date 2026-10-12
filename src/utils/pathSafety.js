import path from 'node:path';

export function resolveInsideRoot(root, candidate) {
  const absoluteRoot = path.resolve(root);
  const absoluteCandidate = path.resolve(absoluteRoot, candidate);
  const relative = path.relative(absoluteRoot, absoluteCandidate);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path_outside_media_root');
  }

  return absoluteCandidate;
}
