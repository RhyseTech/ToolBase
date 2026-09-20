'use client';

/**
 * Background animation library for <ShaderBackground />.
 *
 * - `atelier-flow`: the original built-in fluid gold/emerald shader.
 * - `liquid-gold`: Stitch screen b26ddcbf… ("ANIMATION_58") — molten gold
 *   ribbons + fluid caustics with mouse ripple.
 * - `prism-rings`: Stitch screen 54b6c1c6… ("ANIMATION_59") — prismatic
 *   kinetic rings (champagne / emerald / violet) with mouse lens.
 *
 * Raw screen sources: /stitch_assets_shader/*.html
 * Selected per-user via Settings → Appearance → Background animation
 * (SettingsState.background).
 */

export type BackgroundVariant = 'atelier-flow' | 'liquid-gold' | 'prism-rings';

export type BackgroundOption = {
  id: BackgroundVariant | 'off';
  label: string;
  desc: string;
  icon: string;
  /** CSS gradient thumb shown in the settings picker */
  thumb: string;
};

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'atelier-flow',
    label: 'ToolBase Flow',
    desc: 'Gold + emerald fluid orbs',
    icon: 'waves',
    thumb:
      'radial-gradient(circle at 80% 15%, rgba(235,200,120,0.55), transparent 45%), radial-gradient(circle at 15% 85%, rgba(60,140,125,0.4), transparent 45%), #101014',
  },
  {
    id: 'liquid-gold',
    label: 'Liquid Gold',
    desc: 'Molten ribbons + caustics',
    icon: 'water',
    thumb:
      'repeating-linear-gradient(115deg, rgba(229,195,120,0.5) 0px, rgba(229,195,120,0.08) 6px, transparent 12px, rgba(152,106,32,0.35) 20px), #0c0d10',
  },
  {
    id: 'prism-rings',
    label: 'Prism Rings',
    desc: 'Emerald / violet kinetic rings',
    icon: 'donut_large',
    thumb:
      'conic-gradient(from 40deg, #0e2b22, #1d5c46, #3b2a6e, #8a6a1f, #0e2b22), #08090c',
  },
  {
    id: 'off',
    label: 'Static',
    desc: 'No animated backdrop',
    icon: 'hide_image',
    thumb: '#121316',
  },
];

export const VERTEX_SHADER = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const ATELIER_FLOW = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Simplex noise helpers
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 mouse = u_mouse / u_resolution;

    // Dynamic fluid time
    float t = u_time * 0.18;

    // Luxury dark palette
    vec3 deepBlack = vec3(0.032, 0.038, 0.048);
    vec3 obsidian = vec3(0.065, 0.075, 0.095);
    vec3 champagneGold = vec3(0.92, 0.78, 0.48);
    vec3 luminousBronze = vec3(0.65, 0.48, 0.28);
    vec3 emeraldSheen = vec3(0.20, 0.45, 0.42);

    // Multi-octave noise flow
    float n1 = snoise(vec3(uv * 1.8 + vec2(t * 0.35, -t * 0.2), t * 0.8));
    float n2 = snoise(vec3(uv * 2.8 - vec2(t * 0.25, t * 0.3), t * 1.1));
    float n3 = snoise(vec3(uv * 4.0 + vec2(n1 * 0.5, n2 * 0.5), t * 0.4));

    // Interactive mouse fluid wake
    float mouseDist = length(uv - mouse);
    float mouseWave = smoothstep(0.4, 0.0, mouseDist) * (0.5 + 0.5 * sin(u_time * 2.0 - mouseDist * 12.0));

    // Fluid ribbons & caustic highlights
    float ribbon = smoothstep(0.15, 0.65, n1 * 0.5 + n2 * 0.35 + n3 * 0.15 + 0.5);
    float edgeLight = pow(1.0 - abs(n1), 3.0) * 0.18;

    // Ambient color blending
    vec3 col = mix(deepBlack, obsidian, uv.y + n1 * 0.15);
    col = mix(col, emeraldSheen * 0.25, clamp(n2 * 0.3, 0.0, 1.0));

    // Champagne gold light orbs
    float orb1 = smoothstep(0.7, 0.15, length(uv - vec2(0.85, 0.15) - vec2(sin(t)*0.12, cos(t)*0.1)));
    float orb2 = smoothstep(0.8, 0.2, length(uv - vec2(0.15, 0.85) + vec2(cos(t)*0.1, sin(t)*0.12)));

    col += champagneGold * orb1 * 0.22;
    col += luminousBronze * orb2 * 0.20;
    col += champagneGold * (pow(ribbon, 4.0) * 0.14);
    col += champagneGold * edgeLight;
    col += champagneGold * (mouseWave * 0.25);

    // Micro chromatic vignette
    float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    col *= clamp(16.0 * vig * 0.45 + 0.62, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}`;

// Stitch ANIMATION_58 (screen b26ddcbf24e44fdf88722e8c6e78166b)
const LIQUID_GOLD = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Simplex noise helper
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 mouse = (u_mouse * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

    float t = u_time * 0.15;

    // Luxury dark palette
    vec3 deepNoir = vec3(0.02, 0.025, 0.035);
    vec3 imperialObsidian = vec3(0.045, 0.05, 0.07);
    vec3 burnishedGold = vec3(0.85, 0.68, 0.32);
    vec3 champagneGleam = vec3(0.98, 0.90, 0.65);
    vec3 smokedBronze = vec3(0.48, 0.33, 0.16);

    // Multi-octave fluid caustics & liquid gold ribbons
    vec2 flow = p + vec2(sin(t * 0.5 + p.y * 1.5) * 0.25, cos(t * 0.6 + p.x * 1.5) * 0.25);
    float n1 = snoise(vec3(flow * 1.8, t * 0.8));
    float n2 = snoise(vec3(flow * 3.6 + vec2(n1, -n1), t * 1.1));
    float n3 = snoise(vec3(p * 5.0 + vec2(-t * 0.2, t * 0.3), t * 0.5));

    // Interactive mouse distortion ripple
    float mDist = length(p - mouse);
    float mRipple = sin(mDist * 16.0 - u_time * 2.5) * exp(-mDist * 2.5);
    flow += (p - mouse) * mRipple * 0.12;

    // Specular liquid ribbon crests
    float ribbon = pow(abs(n1 * 0.6 + n2 * 0.3 + n3 * 0.1), 3.2);
    float caustic = pow(clamp(sin((p.x + n1 * 0.4) * 12.0) * cos((p.y + n2 * 0.4) * 12.0) + 0.85, 0.0, 1.0), 5.0);

    // Background base gradation
    vec3 col = mix(deepNoir, imperialObsidian, smoothstep(-1.2, 1.2, p.y + n1 * 0.2));

    // Dynamic light spots (Golden hour studio rim lights)
    vec2 lightPos1 = vec2(sin(t * 0.7) * 0.8, cos(t * 0.5) * 0.6);
    float light1 = exp(-length(p - lightPos1) * 1.8);
    vec2 lightPos2 = vec2(cos(t * 0.4) * 0.9, sin(t * 0.8) * 0.7);
    float light2 = exp(-length(p - lightPos2) * 2.2);

    col += smokedBronze * light1 * 0.35;
    col += burnishedGold * light2 * 0.28;
    col += burnishedGold * ribbon * 1.4;
    col += champagneGleam * caustic * 0.55;

    // Mouse interactive aura
    col += champagneGleam * exp(-mDist * 3.5) * 0.25;

    // Vignette
    float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    col *= clamp(18.0 * vig * 0.5 + 0.55, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}`;

// Stitch ANIMATION_59 (screen 54b6c1c64dad42a196101dd4b37f015e)
const PRISM_RINGS = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// 3D Simplex Noise
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(vec4(i, 0.0)).xyz;
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 mouse = (u_mouse * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

    float t = u_time * 0.12;

    // Colors: Deep pitch noir, burnished gold, ethereal emerald prism, royal violet rim
    vec3 black = vec3(0.015, 0.018, 0.024);
    vec3 champagne = vec3(0.92, 0.78, 0.44);
    vec3 pureGold = vec3(1.0, 0.88, 0.58);
    vec3 emeraldSheen = vec3(0.12, 0.78, 0.55);
    vec3 royalViolet = vec3(0.55, 0.25, 0.85);

    // Wave coordinates with rotational twist
    float angle = atan(p.y, p.x);
    float dist = length(p);

    // Kinetic prism waves
    float w1 = snoise(vec3(p * 2.2, t * 0.7));
    float w2 = snoise(vec3(p * 4.0 + vec2(w1 * 0.5, -w1 * 0.5), t * 0.9));

    // Interactive mouse lens
    float mLen = length(p - mouse);
    float mTwist = exp(-mLen * 3.0) * 0.4;
    p += vec2(sin(u_time + mLen * 8.0), cos(u_time + mLen * 8.0)) * mTwist;

    // Prismatic chromatic rings and refractive glass ribbons
    float ring1 = smoothstep(0.02, 0.4, sin(dist * 6.0 - t * 2.0 + w1 * 2.5));
    float ring2 = smoothstep(0.05, 0.6, cos(dist * 8.0 + t * 1.5 + w2 * 3.0));
    float beam = pow(clamp(sin(angle * 3.0 + t + w1 * 1.2) * 0.5 + 0.5, 0.0, 1.0), 8.0);

    vec3 col = black;
    col += champagne * (ring1 * 0.4 + ring2 * 0.25);
    col += emeraldSheen * (ring2 * 0.3) * (0.5 + 0.5 * sin(t * 0.5));
    col += royalViolet * (ring1 * 0.25) * (0.5 + 0.5 * cos(t * 0.6));
    col += pureGold * beam * 0.9;

    // Luminous core flare
    float flare = exp(-dist * 1.8);
    col += champagne * flare * 0.35;
    col += pureGold * exp(-mLen * 4.0) * 0.45;

    // Specular sheen
    float specular = pow(clamp(w1 * 0.6 + w2 * 0.4 + 0.5, 0.0, 1.0), 6.0);
    col += pureGold * specular * 0.65;

    // Atmospheric vignette
    float vig = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
    col *= clamp(20.0 * vig * 0.45 + 0.6, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}`;

export const FRAGMENT_SHADERS: Record<BackgroundVariant, string> = {
  'atelier-flow': ATELIER_FLOW,
  'liquid-gold': LIQUID_GOLD,
  'prism-rings': PRISM_RINGS,
};
