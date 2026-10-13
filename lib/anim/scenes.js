// ============================================================================
//  Анимированные сцены-метафоры про деньги.
//  Каждая сцена: render(ctx, t, T, params) рисует кадр в момент t из T секунд
//  на «сцене» 1080×1920. Верхние ~30% кадра остаются пустыми под текст.
// ============================================================================

import {
  drawFigure, ground, joints, reach, step, walkPose, lerpPose, POSES, BODY,
  clamp, lerp, ease, easeOutBack,
} from "./figure.js";
import {
  lightPool, glow, floor, coinStack, coin, COIN, ladder, door, ball, chainLinks, bag, treadmill, cliff,
} from "./props.js";

const GROUND = 1460;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ── 1. Копит vs тратит ─────────────────────────────────────────────────────
function saverVsSpender(ctx, t, T) {
  const N = 10, r = 58, h = r * COIN.h;
  const tEnd = T * 0.82;
  const cycle = (tEnd - T * 0.06) / N;
  const k = clamp((t - T * 0.06) / cycle, 0, N);
  const done = Math.floor(k), u = k - done;
  const final = ease((t - tEnd) / (T * 0.1));

  floor(ctx, 60, 1020, GROUND);

  // Saver: стопка растёт
  const sx = 400, saverCoins = done + (u > 0.5 ? 1 : 0);
  lightPool(ctx, 330, GROUND, 260, 0.12 + 0.2 * final);
  const sTop = coinStack(ctx, sx, GROUND, Math.min(saverCoins, N), r, true);
  let sv = ground({ ...lerpPose(POSES.kneel, POSES.stand, final), x: 235, U: 46, dir: 1 }, GROUND);
  if (done < N && final === 0) {
    const reachY = sTop + (u < 0.5 ? -60 * Math.sin(u * Math.PI * 2) : -30);
    sv = reach(sv, "r", [sx - 20 + (u < 0.5 ? -60 * (1 - u * 2) : -50 * (u - 0.5)), reachY]);
  }
  drawFigure(ctx, sv, (c, j) => {
    if (done < N && final === 0 && u < 0.5) coin(c, j.rHand[0], j.rHand[1], r * 0.8);
  });

  // Spender: стопка тает, монеты летят назад
  const px = 690, spenderCoins = N - done - (u > 0.4 ? 1 : 0);
  const pTop = coinStack(ctx, px, GROUND, Math.max(spenderCoins, 0), r, true);
  const sadness = clamp(done / N + final, 0, 1);
  let sp = ground({ ...lerpPose(POSES.stand, POSES.sad, ease(sadness * 1.1 - 0.1)), x: 870, U: 46, dir: -1 }, GROUND);
  let flying = null;
  if (done < N && final === 0) {
    if (u < 0.4) {
      sp = reach(sp, "r", [px + 30, pTop - 10 - 40 * Math.sin((u / 0.4) * Math.PI)]);
    } else {
      const k2 = (u - 0.4) / 0.6;
      sp = reach(sp, "r", [lerp(px + 60, 980, ease(k2 * 2)), lerp(pTop, GROUND - 330, ease(k2 * 2))]);
      flying = k2;
    }
  }
  const spJ = drawFigure(ctx, sp, (c, j) => {
    if (done < N && final === 0 && u < 0.4) coin(c, j.rHand[0], j.rHand[1], r * 0.8);
  });
  if (flying !== null && flying > 0.5) {
    const k3 = (flying - 0.5) / 0.5;
    ctx.save(); ctx.globalAlpha = 1 - k3;
    coin(ctx, lerp(spJ.rHand[0], 1150, k3), spJ.rHand[1] - 220 * Math.sin(k3 * Math.PI) + 400 * k3 * k3, r * 0.8, k3 * 6);
    ctx.restore();
  }
}

// ── 2. Сложный процент: столбики монет растут, герой поднимается ──────────
function compoundStairs(ctx, t, T) {
  const heights = [1, 2, 3, 5, 8, 13, 21];
  const r = 54, h = r * COIN.h, gapX = r * 2.25;
  const n = heights.length;
  const tStart = T * 0.08, tGrow = T * 0.72;
  const per = tGrow / n;
  const idx = clamp((t - tStart) / per, 0, n);
  const built = Math.floor(idx);
  const final = ease((t - tStart - tGrow) / (T * 0.12));

  // камера: отъезжает по мере роста
  const cur = Math.min(built, n - 1);
  const topH = heights[cur] * h;
  const scale = lerp(1.15, 0.62, ease(cur / (n - 1)));
  const cx = 260 + cur * gapX * 0.55;
  ctx.save();
  ctx.translate(540, 1420); ctx.scale(scale, scale); ctx.translate(-cx, -GROUND + topH * 0.45);

  floor(ctx, -400, 2000, GROUND, 0.25);
  const colX = (i) => 260 + i * gapX;
  for (let i = 0; i < n; i++) {
    if (i < built) coinStack(ctx, colX(i), GROUND, heights[i] * 2, r);
    else if (i === built) {
      const g = ease((idx - built) / 0.55);
      if (g > 0) coinStack(ctx, colX(i), GROUND, Math.max(1, Math.round(heights[i] * 2 * g)), r);
    }
  }
  // герой стоит на последнем достроенном столбике и прыгает на следующий
  const stand = (i) => (i < 0 ? [90, GROUND] : [colX(i), GROUND - heights[i] * 2 * h - h * 0.4]);
  const from = stand(built - 2), to = stand(built - 1);
  const jk = ease(clamp(((idx - built) - 0.55) / 0.4, 0, 1));
  const onTop = built >= n;
  let pos = onTop ? stand(n - 1) : [lerp(from[0], to[0], jk), lerp(from[1], to[1], jk) - Math.sin(jk * Math.PI) * 120];
  if (built === 0) pos = stand(-1);
  const pose = onTop ? lerpPose(POSES.stand, POSES.cheer, final) : jk > 0 && jk < 1 ? POSES.kneel : POSES.stand;
  if (onTop) glow(ctx, pos[0], pos[1] - 300, 700, 0.35 * final);
  lightPool(ctx, pos[0], pos[1], 200, 0.2);
  drawFigure(ctx, ground({ ...pose, x: pos[0] - 20, U: 44, dir: 1 }, pos[1]));
  ctx.restore();
}

// ── 3. Толпа идёт тратить, один разворачивается ────────────────────────────
function crowdFollow(ctx, t, T, params) {
  const rand = rng(params.seed || 7);
  const edge = 880;
  const rows = [
    { y: 1300, U: 26, a: 0.35, n: 7, v: 70 },
    { y: 1380, U: 32, a: 0.6, n: 6, v: 80 },
    { y: 1470, U: 40, a: 0.9, n: 5, v: 90 },
  ];
  for (const row of rows) {
    cliff(ctx, edge + (row.y - 1470) * 0.4, row.y, row.a);
    const span = 1400;
    for (let i = 0; i < row.n; i++) {
      const offset = (i / row.n) * span + rand() * 80;
      let x = ((offset + row.v * t) % span) - 300;
      const myEdge = edge + (row.y - 1470) * 0.4;
      const phase = (x / (row.U * 3.2)) * Math.PI;
      let f = ground({ ...walkPose(phase), x, U: row.U, dir: 1, palette: "grey", alpha: row.a }, row.y);
      if (x > myEdge) {
        const fall = (x - myEdge) / row.v;
        f = { ...f, y: f.y + 0.5 * 2600 * fall * fall, rot: fall * 160, alpha: row.a * clamp(1 - fall * 1.5, 0, 1) };
      }
      drawFigure(ctx, f, (c, j) => bag(c, j.rHand[0], j.rHand[1], row.U * 1.1, "#5f5f5f"));
    }
  }
  // герой
  const tStop = T * 0.4, tTurn = T * 0.52;
  const v = 90;
  let x, dir = 1, pose;
  if (t < tStop) {
    x = 140 + v * t;
    pose = walkPose((x / (40 * 3.2)) * Math.PI);
  } else if (t < tTurn) {
    x = 140 + v * tStop;
    const k = ease((t - tStop) / (tTurn - tStop));
    pose = lerpPose(walkPose((x / (40 * 3.2)) * Math.PI), POSES.stand, k);
    dir = k > 0.5 ? lerp(1, -1, ease((k - 0.5) * 2)) : 1;
  } else {
    const x0 = 140 + v * tStop;
    x = x0 - 70 * (t - tTurn);
    pose = walkPose(((x0 - x) / (44 * 3.2)) * Math.PI, 0.9);
    dir = -1;
  }
  lightPool(ctx, x, 1500, 220, 0.22);
  drawFigure(ctx, ground({ ...pose, x, U: 44, dir: Math.abs(dir) < 0.15 ? Math.sign(dir || 1) * 0.15 : dir }, 1500));
}

// ── 4. Гиря долга растёт ──────────────────────────────────────────────────
function debtBall(ctx, t, T) {
  const k = t / T;
  const v0 = 70;
  const x = 420 + v0 * (t - (0.45 * t * t) / T);
  const R = lerp(22, 120, ease(k * 1.15));
  floor(ctx, 0, 1080, GROUND);
  const stride = 46 * 2.6;
  const strainK = ease(k * 1.3 - 0.2);
  const pose = lerpPose(walkPose(((x - 420) / stride) * Math.PI), POSES.strain, strainK * 0.75);
  const f = ground({ ...pose, x, U: 46, dir: 1 }, GROUND);
  const j = joints(f);
  const bx = x - 260 - R, by = GROUND - R;
  lightPool(ctx, x, GROUND, 240, 0.18);
  chainLinks(ctx, [j.lFoot[0] - 6, j.lFoot[1] - 6], [bx + R * 0.8, by + R * 0.3], 18, 10);
  ball(ctx, bx, by, R);
  drawFigure(ctx, f);
}

// ── 5. Лестница: каждая ступень — сбережение ──────────────────────────────
function ladderClimb(ctx, t, T) {
  const gap = 78, rungs = 22, lx = 600, base = GROUND;
  const top = base - gap * rungs;
  const climbK = ease(clamp((t - T * 0.08) / (T * 0.8), 0, 1));
  const climbed = climbK * gap * (rungs - 5);
  const final = ease((t - T * 0.88) / (T * 0.1));
  const U = 44;
  // тело
  let f = { ...POSES.stand, torso: 10, head: -15, x: lx - 92, U, dir: 1 };
  f = ground(f, base);
  f.y -= climbed;
  // камера следует за героем
  const camY = clamp(f.y - 1200, top - 500, 0);
  ctx.save(); ctx.translate(0, -camY);
  glow(ctx, lx, top - 120, 650, 0.25 + 0.5 * final);
  ladder(ctx, lx, top, base, 170, gap, f.y + 40);
  floor(ctx, 100, 1000, base);
  const rungY = (i) => base - gap / 2 - i * gap;
  const limbTarget = (side, offRungs, phaseShift) => {
    const c = climbed / (2 * gap) + phaseShift;
    const kk = Math.floor(c), fr = c - kk;
    let i = kk * 2 + offRungs + (phaseShift > 0 ? 1 : 0);
    let y = rungY(i);
    if (fr > 0.75) y = lerp(rungY(i), rungY(i + 2), ease((fr - 0.75) / 0.25)) - Math.sin(((fr - 0.75) / 0.25) * Math.PI) * 20;
    return y;
  };
  if (climbK < 1) {
    const handBase = Math.round((base - f.y + BODY.torso * U * 1.1) / gap);
    const footBase = Math.max(0, Math.round((base - f.y - BODY.thigh * U * 1.6) / gap) - 1);
    const hb = handBase - Math.floor(climbed / (2 * gap)) * 2;
    const fb = footBase - Math.floor(climbed / (2 * gap)) * 2;
    f = reach(f, "r", [lx - 70, limbTarget("r", hb, 0)]);
    f = reach(f, "l", [lx - 70, limbTarget("l", hb, 0.5)]);
    f = step(f, "r", [lx - 75, limbTarget("r", fb, 0.5)], 1);
    f = step(f, "l", [lx - 75, limbTarget("l", fb, 0)], 1);
  } else {
    f = { ...f, ...lerpPose(f, POSES.cheer, final), ra1: lerp(f.ra1, 150, final), ra2: lerp(f.ra2, 165, final) };
  }
  drawFigure(ctx, f);
  ctx.restore();
}

// ── 6. Дверь возможностей ─────────────────────────────────────────────────
function doorLight(ctx, t, T) {
  const dx = 760, dw = 190, dh = 400;
  const tWalk = T * 0.3, tKnock = T * 0.5, tOpen = T * 0.66, tIn = T * 0.8;
  const open = ease((t - tKnock) / (tOpen - tKnock));
  floor(ctx, 60, 1020, GROUND);
  door(ctx, dx, GROUND, dw, dh, open);
  const stopX = dx - dw / 2 - 120;
  let x, pose = POSES.stand, alpha = 1;
  if (t < tWalk) {
    x = lerp(160, stopX, t / tWalk);
    pose = walkPose(((x - 160) / (46 * 3.2)) * Math.PI);
  } else if (t < tIn) {
    x = stopX;
  } else {
    const k = (t - tIn) / (T - tIn);
    x = lerp(stopX, dx, ease(k));
    pose = walkPose(((x - stopX) / (46 * 3.2)) * Math.PI);
    alpha = 1 - ease(k * 1.2 - 0.2);
  }
  let f = ground({ ...pose, x, U: 46, dir: 1, alpha }, GROUND);
  if (t >= tWalk && t < tKnock) {
    const knock = Math.abs(Math.sin((t - tWalk) * 9));
    f = reach(f, "r", [dx - dw / 2 - 10 - knock * 28, GROUND - dh * 0.55]);
  }
  lightPool(ctx, x, GROUND, 220, 0.15 + 0.35 * open);
  drawFigure(ctx, f);
}

// ── 7. Беговая дорожка: зарплата приходит и уходит ────────────────────────
function paycheckTreadmill(ctx, t, T) {
  const tx = 540, ty = GROUND - 10, tw = 600;
  const slow = ease((t - T * 0.78) / (T * 0.15));
  const belt = -(260 * t - 260 * Math.max(0, t - T * 0.78) * 0.5);
  floor(ctx, 60, 1020, GROUND + 30);
  treadmill(ctx, tx, ty, tw, belt);
  // монеты-«зарплаты»
  const P = 1.6;
  const r = 40;
  for (let i = 0; i * P < T; i++) {
    const t0 = 0.4 + i * P;
    const dt = t - t0;
    if (dt < 0 || t0 > T * 0.75) continue;
    const fallT = 0.5;
    let x = tx + 170, y;
    if (dt < fallT) {
      y = lerp(GROUND - 900, ty - r * COIN.h, (dt / fallT) ** 2);
    } else {
      x -= 260 * (dt - fallT);
      y = ty - r * COIN.h;
      if (x < tx - tw / 2) {
        const ft = (tx - tw / 2 - x) / 260;
        y += 0.5 * 2600 * ft * ft;
      }
    }
    if (y > 2000) continue;
    coin(ctx, x, y, r);
  }
  const phase = (260 * t * (1 - slow * 0.6)) / (46 * 3.4) * Math.PI;
  const pose = lerpPose(walkPose(phase, 1, true), POSES.sad, slow);
  lightPool(ctx, tx, ty, 260, 0.15);
  drawFigure(ctx, ground({ ...pose, x: tx - 30, U: 46, dir: 1 }, ty));
}

// ── Реестр ────────────────────────────────────────────────────────────────
export const TEMPLATES = {
  saver_vs_spender: {
    render: saverVsSpender, duration: 9, zoom: 1.2, labels: ["Saver", "Spender"],
    about: "Two figures side by side. The left one patiently stacks coins one by one, his tower grows. The right one takes coins from his tall stack and throws them away, his stack disappears; at the end he is left sad with nothing and the saver stands next to a tall tower. Use for: saving vs spending, delayed gratification, small habits, rich vs poor mindset.",
  },
  compound_stairs: {
    render: compoundStairs, duration: 10, zoom: 1.25, focus: 1330,
    about: "Coin columns appear one after another, each much taller than the previous one (exponential growth); a figure jumps from column to column and ends on top of the tallest one with arms raised, glowing light. Use for: compound interest, investing early, patience, consistency, small amounts growing.",
  },
  crowd_follow: {
    render: crowdFollow, duration: 10, zoom: 1.3, focus: 1240,
    about: "A grey crowd carrying shopping bags walks to the right and falls off a cliff edge one by one; the white hero walks with them, stops, turns around and walks the other way. Use for: consumerism, following the crowd, debt, buying to impress others, not doing what everyone does with money.",
  },
  debt_ball: {
    render: debtBall, duration: 9,
    about: "A figure walks while dragging a ball on a chain; the ball keeps growing and the figure slows down and strains more and more until he can barely move. Use for: debt, credit cards, loans, interest working against you, lifestyle bought on credit.",
  },
  ladder_climb: {
    render: ladderClimb, duration: 10, zoom: 1.2, focus: 1150,
    about: "A figure climbs a very tall ladder rung by rung; the rungs below him light up, a bright light waits at the top, the camera follows him upward and at the end he raises his arms. Use for: building wealth step by step, discipline, long-term goals, financial freedom.",
  },
  door_light: {
    render: doorLight, duration: 9,
    about: "A figure walks to a closed dark door, knocks, the door opens and bright light floods out; he walks into the light. Use for: opportunity, taking action, asking for a raise, starting a business, investing in yourself.",
  },
  paycheck_treadmill: {
    render: paycheckTreadmill, duration: 9,
    about: "A figure runs on a treadmill; coins (paychecks) fall in front of him, then the belt carries them behind him and they fall off; at the end he slows down exhausted. Use for: rat race, living paycheck to paycheck, lifestyle inflation, working hard but staying broke.",
  },
};
