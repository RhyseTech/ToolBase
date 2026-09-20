'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadSettings, SETTINGS_EVENT } from '@/lib/settings';
import {
  FRAGMENT_SHADERS,
  VERTEX_SHADER,
  type BackgroundVariant,
} from '@/lib/shaders';

export type BackgroundSelection = BackgroundVariant | 'off';

function resolveFromSettings(): BackgroundSelection {
  try {
    const s = loadSettings();
    if (s.animations === false) return 'off';
    return s.background ?? 'atelier-flow';
  } catch {
    return 'atelier-flow';
  }
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ShaderBackground({ variant }: { variant?: BackgroundSelection }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resolved, setResolved] = useState<BackgroundSelection>(
    () => variant ?? resolveFromSettings()
  );

  // Follow prop or live user setting (Settings → Appearance → Background animation)
  useEffect(() => {
    if (variant) {
      setResolved(variant);
      return;
    }
    const sync = () => setResolved(resolveFromSettings());
    sync();
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_EVENT, sync);
  }, [variant]);

  useEffect(() => {
    if (resolved === 'off') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Sync the WebGL drawing-buffer size with the CSS-driven layout size.
    function syncSize() {
      const w = canvas?.clientWidth || 1280;
      const h = canvas?.clientHeight || 720;
      if (canvas && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(syncSize);
      ro.observe(canvas);
    }
    syncSize();

    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;
    const webgl = gl as WebGLRenderingContext;

    const vs = compileShader(webgl, webgl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(
      webgl,
      webgl.FRAGMENT_SHADER,
      FRAGMENT_SHADERS[resolved]
    );
    if (!vs || !fs) return;
    const prog = webgl.createProgram();
    if (!prog) return;
    webgl.attachShader(prog, vs);
    webgl.attachShader(prog, fs);
    webgl.linkProgram(prog);
    if (!webgl.getProgramParameter(prog, webgl.LINK_STATUS)) return;
    webgl.useProgram(prog);

    const buf = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, buf);
    webgl.bufferData(
      webgl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      webgl.STATIC_DRAW
    );
    const pos = webgl.getAttribLocation(prog, 'a_position');
    webgl.enableVertexAttribArray(pos);
    webgl.vertexAttribPointer(pos, 2, webgl.FLOAT, false, 0, 0);
    const uTime = webgl.getUniformLocation(prog, 'u_time');
    const uRes = webgl.getUniformLocation(prog, 'u_resolution');
    const uMouse = webgl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    const startTime = performance.now();

    function render(time: number) {
      if (typeof ResizeObserver === 'undefined') syncSize();
      webgl.viewport(0, 0, canvas!.width, canvas!.height);
      const t = time - startTime;
      if (uTime) webgl.uniform1f(uTime, t * 0.001);
      if (uRes) webgl.uniform2f(uRes, canvas!.width, canvas!.height);
      if (uMouse) webgl.uniform2f(uMouse, mouse.x, mouse.y);
      webgl.drawArrays(webgl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (ro) ro.disconnect();
    };
  }, [resolved]);

  if (resolved === 'off') return null;

  return (
    <div className="shader-backdrop fixed inset-0 w-full h-full pointer-events-none -z-10" style={{ display: 'block' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
