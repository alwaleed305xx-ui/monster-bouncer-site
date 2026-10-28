// Post FX: a WebGL pass over the 2D stage canvas — quarter-res bloom (bright pass + 2 separable 5-tap blurs), vignette,
// chromatic aberration (+ pulse kicks), saturation/contrast/brightness grade, tint and barrel warp (see docs/ENGINE.md § post.js).
// Usage: post.init(stage) right after stage.init(); stage.end() calls post.present(stage.canvas) every frame;
// post.set({ bloom, vignette, ... }) tunes the look, post.pulse({ chroma, ms }) kicks aberration on impacts,
// post.setBloomDiv(n) trades bloom resolution for GPU time (engine.js's frame governor).
import { clamp } from './math.js';

const TUNE = {
  bloom: 0.35, bloomThreshold: 0.6, bloomKnee: 0.35, bloomRadius: 1.2, bloomDiv: 4,
  vignette: 0.35, vignetteInner: 0.45, vignetteOuter: 1.5,
  chroma: 0, chromaScale: 0.028, saturation: 1, contrast: 1, brightness: 1, warp: 0,
  pulseChroma: 0.8, pulseMs: 140,
};

const VS = 'attribute vec2 a_pos; varying vec2 v_uv;\n' +
  'void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }';
const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
// Bright pass: 4-tap box downsample of the (Y-flipped) scene + soft-knee threshold → quarter-res target.
const FS_BRIGHT = PREC +
  'varying vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_texel; uniform float u_threshold; uniform float u_knee;\n' +
  'void main(){\n' +
  '  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);\n' +
  '  vec3 c = texture2D(u_tex, uv + u_texel * vec2(-1.0, -1.0)).rgb;\n' +
  '  c += texture2D(u_tex, uv + u_texel * vec2(1.0, -1.0)).rgb;\n' +
  '  c += texture2D(u_tex, uv + u_texel * vec2(-1.0, 1.0)).rgb;\n' +
  '  c += texture2D(u_tex, uv + u_texel * vec2(1.0, 1.0)).rgb;\n' +
  '  c *= 0.25;\n' +
  '  float br = max(c.r, max(c.g, c.b));\n' +
  '  float soft = clamp(br - u_threshold + u_knee, 0.0, 2.0 * u_knee);\n' +
  '  soft = soft * soft / (4.0 * u_knee + 0.0001);\n' +
  '  float w = max(soft, br - u_threshold) / max(br, 0.0001);\n' +
  '  gl_FragColor = vec4(c * w, 1.0);\n' +
  '}';
// Separable gaussian: 5 linear-filtered fetches ≈ a 9-tap kernel. u_dir = texel * radius along one axis.
const FS_BLUR = PREC +
  'varying vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_dir;\n' +
  'void main(){\n' +
  '  vec3 c = texture2D(u_tex, v_uv).rgb * 0.2270270270;\n' +
  '  c += texture2D(u_tex, v_uv + u_dir * 1.3846153846).rgb * 0.3162162162;\n' +
  '  c += texture2D(u_tex, v_uv - u_dir * 1.3846153846).rgb * 0.3162162162;\n' +
  '  c += texture2D(u_tex, v_uv + u_dir * 3.2307692308).rgb * 0.0702702703;\n' +
  '  c += texture2D(u_tex, v_uv - u_dir * 3.2307692308).rgb * 0.0702702703;\n' +
  '  gl_FragColor = vec4(c, 1.0);\n' +
  '}';
// Composite: warp → radial RGB split → scene + bloom → contrast/brightness/saturation/tint → smooth elliptical vignette.
const FS_COMP = PREC +
  'varying vec2 v_uv; uniform sampler2D u_scene; uniform sampler2D u_bloom;\n' +
  'uniform float u_bloomK; uniform float u_vignette; uniform vec2 u_vig; uniform float u_chroma; uniform float u_saturation;\n' +
  'uniform float u_contrast; uniform float u_brightness; uniform float u_warp; uniform vec3 u_tint;\n' +
  'void main(){\n' +
  '  vec2 d = v_uv - 0.5;\n' +
  '  vec2 uv = 0.5 + d * (1.0 + u_warp * dot(d, d));\n' +
  '  vec2 s = vec2(uv.x, 1.0 - uv.y);\n' +
  '  vec2 so = vec2(d.x, -d.y) * u_chroma;\n' +
  '  vec3 col = vec3(texture2D(u_scene, s + so).r, texture2D(u_scene, s).g, texture2D(u_scene, s - so).b);\n' +
  '  col += texture2D(u_bloom, uv).rgb * u_bloomK;\n' +
  '  col = (col - 0.5) * u_contrast + 0.5;\n' +
  '  col *= u_brightness;\n' +
  '  float lum = dot(col, vec3(0.299, 0.587, 0.114));\n' +
  '  col = mix(vec3(lum), col, u_saturation) * u_tint;\n' +
  '  col *= 1.0 - u_vignette * smoothstep(u_vig.x, u_vig.y, length(d * 2.0));\n' +
  '  gl_FragColor = vec4(col, 1.0);\n' +
  '}';

let stageRef = null, gl = null, lost = false, wantEnabled = true;
let progBright = null, progBlur = null, progComp = null, UB = null, UL = null, UC = null;
let vbo = null, sceneTex = null, texA = null, texB = null, fboA = null, fboB = null;
let W = 0, H = 0, qW = 0, qH = 0, sceneW = 0, sceneH = 0, sceneTexelX = 0, sceneTexelY = 0;
let pulseAmp = 0, pulseT0 = 0, pulseMs = 1, bloomDiv = TUNE.bloomDiv;
const params = {
  bloom: TUNE.bloom, bloomThreshold: TUNE.bloomThreshold, vignette: TUNE.vignette, chroma: TUNE.chroma,
  saturation: TUNE.saturation, contrast: TUNE.contrast, brightness: TUNE.brightness, warp: TUNE.warp,
};
const tint = new Float32Array([1, 1, 1]);

export const post = {
  enabled: false, supported: false, canvas: null, gl: null, kind: '', lastMs: 0, params: params,

  init(st) {
    stageRef = st;
    if (!st || !st.canvas || typeof document === 'undefined') return false;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.addEventListener('webglcontextlost', onLost, false);
      this.canvas.addEventListener('webglcontextrestored', onRestored, false);
    }
    if (!createContext() || !buildResources()) { gl = null; this.gl = null; this.supported = false; this.enabled = false; return false; }
    this.supported = true; lost = false;
    st.usePost(this, this.canvas);
    st.setPost(st.postEnabled);
    return true;
  },

  set(o) {
    if (!o) return;
    if (o.bloom !== undefined) params.bloom = Math.max(0, +o.bloom);
    if (o.bloomThreshold !== undefined) params.bloomThreshold = clamp(+o.bloomThreshold, 0, 2);
    if (o.vignette !== undefined) params.vignette = clamp(+o.vignette, 0, 1);
    if (o.chroma !== undefined) params.chroma = Math.max(0, +o.chroma);
    if (o.saturation !== undefined) params.saturation = Math.max(0, +o.saturation);
    if (o.contrast !== undefined) params.contrast = Math.max(0, +o.contrast);
    if (o.brightness !== undefined) params.brightness = Math.max(0, +o.brightness);
    if (o.warp !== undefined) params.warp = clamp(+o.warp, -1, 1);
    if (o.tint !== undefined && o.tint.length >= 3) { tint[0] = +o.tint[0]; tint[1] = +o.tint[1]; tint[2] = +o.tint[2]; }
  },

  pulse(o) {
    const now = performance.now();
    const cur = pulseEnv(now);
    const amp = o && o.chroma !== undefined ? +o.chroma : TUNE.pulseChroma;
    pulseAmp = Math.max(amp, cur);
    pulseMs = Math.max(1, o && o.ms !== undefined ? +o.ms : TUNE.pulseMs);
    pulseT0 = now;
  },

  setEnabled(on) { this.enabled = !!on && this.supported && !lost; },

  // bloom target resolution divisor (4 = quarter res; the engine's frame governor raises it on slow GPUs)
  setBloomDiv(div) {
    const d = Math.max(1, Math.min(16, Math.round(+div || TUNE.bloomDiv)));
    if (d === bloomDiv) return d;
    bloomDiv = d; W = 0; H = 0;
    this.resize();
    return d;
  },
  get bloomDiv() { return bloomDiv; },

  resize() {
    if (!gl || lost) return;
    const view = stageRef && stageRef.view ? stageRef.view : this.canvas;
    const w = view.width | 0, h = view.height | 0;
    if (w < 1 || h < 1) return;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    if (w === W && h === H) return;
    W = w; H = h;
    qW = Math.max(1, Math.ceil(w / bloomDiv)); qH = Math.max(1, Math.ceil(h / bloomDiv));
    allocTex(texA, qW, qH); allocTex(texB, qW, qH);
    sceneW = 0; sceneH = 0;
  },

  present(src) {
    if (!this.enabled || !gl || lost || W < 1 || !src) return;
    const t0 = performance.now();
    const sw = src.width | 0, sh = src.height | 0;
    if (sw < 1 || sh < 1) return;
    // 1. upload the 2D frame (Y is flipped in the shaders, so no CPU-side flip)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    if (sw !== sceneW || sh !== sceneH) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      sceneW = sw; sceneH = sh; sceneTexelX = 1 / sw; sceneTexelY = 1 / sh;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
    }
    // 2. bright pass → A (quarter res)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
    gl.viewport(0, 0, qW, qH);
    gl.useProgram(progBright);
    gl.uniform2f(UB.texel, sceneTexelX, sceneTexelY);
    gl.uniform1f(UB.threshold, params.bloomThreshold);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 3. blur horizontal A → B
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
    gl.useProgram(progBlur);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform2f(UL.dir, TUNE.bloomRadius / qW, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 4. blur vertical B → A
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.uniform2f(UL.dir, 0, TUNE.bloomRadius / qH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 5. composite → screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(progComp);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1f(UC.bloomK, params.bloom);
    gl.uniform1f(UC.vignette, params.vignette);
    gl.uniform1f(UC.chroma, (params.chroma + pulseEnv(t0)) * TUNE.chromaScale);
    gl.uniform1f(UC.saturation, params.saturation);
    gl.uniform1f(UC.contrast, params.contrast);
    gl.uniform1f(UC.brightness, params.brightness);
    gl.uniform1f(UC.warp, params.warp);
    gl.uniform3fv(UC.tint, tint);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindTexture(gl.TEXTURE_2D, null); // leave unit 1 clean so A is never bound while it is a render target
    gl.activeTexture(gl.TEXTURE0);
    this.lastMs = performance.now() - t0;
  },
};

function pulseEnv(now) {
  if (pulseAmp <= 0) return 0;
  const k = 1 - (now - pulseT0) / pulseMs;
  if (k <= 0) { pulseAmp = 0; return 0; }
  return pulseAmp * k * k;
}

function createContext() {
  const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  let ctx = null;
  try { ctx = post.canvas.getContext('webgl2', opts); } catch (e) { ctx = null; }
  if (ctx) post.kind = 'webgl2';
  else {
    try { ctx = post.canvas.getContext('webgl', opts) || post.canvas.getContext('experimental-webgl', opts); } catch (e) { ctx = null; }
    if (ctx) post.kind = 'webgl';
  }
  gl = ctx; post.gl = ctx;
  return !!ctx;
}

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    console.warn('[post] shader failed:', gl.getShaderInfoLog(sh)); gl.deleteShader(sh); return null;
  }
  return sh;
}
function program(fs) {
  const v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, 'a_pos');
  gl.linkProgram(p); gl.deleteShader(v); gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
    console.warn('[post] link failed:', gl.getProgramInfoLog(p)); gl.deleteProgram(p); return null;
  }
  return p;
}
function createTex() {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function allocTex(t, w, h) {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
}
function createFbo(t) {
  const f = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  return f;
}

// (Re)builds every GL object — called from init and after a context restore.
function buildResources() {
  if (!gl) return false;
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
  gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DITHER);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.clearColor(0, 0, 0, 1);
  progBright = program(FS_BRIGHT); progBlur = program(FS_BLUR); progComp = program(FS_COMP);
  if (!progBright || !progBlur || !progComp) return false;
  UB = { tex: gl.getUniformLocation(progBright, 'u_tex'), texel: gl.getUniformLocation(progBright, 'u_texel'),
    threshold: gl.getUniformLocation(progBright, 'u_threshold'), knee: gl.getUniformLocation(progBright, 'u_knee') };
  UL = { tex: gl.getUniformLocation(progBlur, 'u_tex'), dir: gl.getUniformLocation(progBlur, 'u_dir') };
  UC = { scene: gl.getUniformLocation(progComp, 'u_scene'), bloom: gl.getUniformLocation(progComp, 'u_bloom'),
    bloomK: gl.getUniformLocation(progComp, 'u_bloomK'), vignette: gl.getUniformLocation(progComp, 'u_vignette'),
    vig: gl.getUniformLocation(progComp, 'u_vig'), chroma: gl.getUniformLocation(progComp, 'u_chroma'),
    saturation: gl.getUniformLocation(progComp, 'u_saturation'), contrast: gl.getUniformLocation(progComp, 'u_contrast'),
    brightness: gl.getUniformLocation(progComp, 'u_brightness'), warp: gl.getUniformLocation(progComp, 'u_warp'),
    tint: gl.getUniformLocation(progComp, 'u_tint') };
  // constant uniforms (program state persists)
  gl.useProgram(progBright); gl.uniform1i(UB.tex, 0); gl.uniform1f(UB.knee, TUNE.bloomKnee);
  gl.useProgram(progBlur); gl.uniform1i(UL.tex, 0);
  gl.useProgram(progComp); gl.uniform1i(UC.scene, 0); gl.uniform1i(UC.bloom, 1); gl.uniform2f(UC.vig, TUNE.vignetteInner, TUNE.vignetteOuter);
  // one fullscreen triangle, attribute 0 for every program
  vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  sceneTex = createTex(); texA = createTex(); texB = createTex();
  allocTex(texA, 1, 1); allocTex(texB, 1, 1);
  fboA = createFbo(texA); fboB = createFbo(texB);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  W = 0; H = 0; sceneW = 0; sceneH = 0;
  return ok;
}

function onLost(e) {
  e.preventDefault();
  lost = true; wantEnabled = post.enabled;
  post.supported = false; post.enabled = false;
  if (stageRef) stageRef.setPost(false);
}
function onRestored() {
  lost = false;
  if (!buildResources()) { post.supported = false; return; }
  post.supported = true;
  if (stageRef) stageRef.setPost(wantEnabled);
}
