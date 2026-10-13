// ============================================================================
//  Рендер анимированной сцены в MP4: кадры рисуются на canvas и
//  отдаются в ffmpeg как сырое видео (rgba).
// ============================================================================

import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { createCanvas } from "@napi-rs/canvas";
import { TEMPLATES } from "./scenes.js";
import { background } from "./props.js";

const STAGE_W = 1080, STAGE_H = 1920;

export function renderClip({ template, duration, params = {}, W = 1080, H = 1920, fps = 30, outPath }) {
  const tpl = TEMPLATES[template];
  if (!tpl) throw new Error(`Неизвестная сцена: ${template}`);
  const T = duration || tpl.duration;
  const frames = Math.round(T * fps);

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      "-y",
      "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(fps), "-i", "-",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
      outPath,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error("FFmpeg error:\n" + stderr.slice(-1500)));
    });

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    // сцена рисуется в координатах 1080×1920 и вписывается в кадр
    const fit = Math.min(W / STAGE_W, H / STAGE_H);

    (async () => {
      try {
        for (let i = 0; i < frames; i++) {
          const t = i / fps;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          background(ctx, W, H);
          // крупный план + медленный наезд: точка focus сцены — чуть ниже центра кадра
          const zoom = fit * (tpl.zoom ?? 1.35) * (1 + 0.05 * (t / T));
          ctx.translate(W / 2, H * 0.6);
          ctx.scale(zoom, zoom);
          ctx.translate(-STAGE_W / 2, -(tpl.focus ?? 1250));
          tpl.render(ctx, t, T, params);
          if (!proc.stdin.write(canvas.data())) {
            await new Promise((r) => proc.stdin.once("drain", r));
          }
        }
        proc.stdin.end();
      } catch (e) {
        proc.kill("SIGKILL");
        reject(e);
      }
    })();
  });
}
