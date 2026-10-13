// ============================================================================
//  Очередь сборки: одновременно рендерится не больше N роликов.
//  На маленьком сервере (512 МБ) два ролика сразу не поместятся в память.
// ============================================================================

export function createLimiter(limit = 1) {
  let active = 0;
  const waiting = [];
  const next = () => {
    if (active >= limit || waiting.length === 0) return;
    active++;
    const { fn, resolve, reject } = waiting.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => { active--; next(); });
  };
  return {
    run(fn) {
      return new Promise((resolve, reject) => {
        waiting.push({ fn, resolve, reject });
        next();
      });
    },
    get size() { return active + waiting.length; },
  };
}
