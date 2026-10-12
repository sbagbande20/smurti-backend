import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveInsideRoot } from '../src/utils/pathSafety.js';

test('resolveInsideRoot allows paths inside the media root', () => {
  const resolved = resolveInsideRoot('D:\\SmurtiData\\media', 'audio\\recording.wav');

  assert.equal(resolved, 'D:\\SmurtiData\\media\\audio\\recording.wav');
});

test('resolveInsideRoot rejects directory traversal outside media root', () => {
  assert.throws(
    () => resolveInsideRoot('D:\\SmurtiData\\media', '..\\secret.txt'),
    /path_outside_media_root/
  );
});
