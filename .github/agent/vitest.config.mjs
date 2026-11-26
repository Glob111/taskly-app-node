// No imports on purpose: resolves offline with no node_modules in this folder.
export default {
  test: { globals: true, include: ['*.test.ts'], environment: 'node' },
};
