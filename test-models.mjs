// Self-check for the model filter/sort in popup.js fetchModels().
// Run: node test-models.mjs
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";

// Mirror of the filter in popup.js. If you change one, change both.
const skip = /preview|exp|image|audio|tts|live|native|thinking|embedding/;
const pick = (names) =>
  names
    .filter((m) => m.name.includes("flash") && !skip.test(m.name) &&
      m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace("models/", ""));

const gen = ["generateContent"];
const got = pick([
  { name: "models/gemini-flash-latest", supportedGenerationMethods: gen },
  { name: "models/gemini-2.5-flash", supportedGenerationMethods: gen },
  { name: "models/gemini-2.0-flash", supportedGenerationMethods: gen },
  { name: "models/gemini-2.5-flash-image-preview", supportedGenerationMethods: gen },
  { name: "models/gemini-2.5-flash-native-audio", supportedGenerationMethods: gen },
  { name: "models/gemini-2.5-pro", supportedGenerationMethods: gen },
  { name: "models/embedding-flash", supportedGenerationMethods: ["embedContent"] },
]);

// Ordering is PREFERRED_MODELS first, not alphabetical - this only checks that
// the junk variants are filtered out and real text models survive.
assert.deepStrictEqual(got.sort(), [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
]);
assert.deepStrictEqual(pick([]), []);

// The regex in background.js must stay in sync with the one above.
assert.ok(
  readFileSync("background.js", "utf8").includes(String(skip)),
  "skip regex drifted from background.js",
);

console.log("ok");

// --- answer parsing: extraction supports up to 6 options, parsing must too ---
const parse = (r) =>
  [...r.matchAll(/Question\s*\d+:\s*([A-F])/gi)].map((m) => m[1].toUpperCase());

assert.deepStrictEqual(
  parse("Question 1: C) foo\nQuestion 2: E) bar\nQuestion 3: F) baz"),
  ["C", "E", "F"],
  "E and F answers must not be dropped",
);
assert.deepStrictEqual(parse("no answers here"), []);

console.log("ok: answer parsing");

// --- every id popup.js looks up must exist in popup.html ---
// A rename in one file silently produces null derefs in the other.
const js = readFileSync("popup.js", "utf8");
const bg = readFileSync("background.js", "utf8");
const html = readFileSync("popup.html", "utf8");
const looked = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
assert.ok(looked.length > 10, "expected popup.js to look up many ids");
for (const id of looked) {
  assert.ok(html.includes(`id="${id}"`), `popup.html is missing id="${id}"`);
}

console.log(`ok: ${looked.length} popup ids resolve`);

// --- bundled assets referenced by popup.html must exist on disk ---
// The extension CSP blocks font CDNs, so a wrong path means no font at all,
// and Chrome fails it silently.
const urls = [...html.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
assert.ok(urls.length > 0, "expected popup.html to reference a bundled asset");
for (const u of urls) {
  assert.ok(existsSync(u), `popup.html references missing file: ${u}`);
  // woff2 files must really be woff2; a failed download leaves HTML behind.
  if (u.endsWith(".woff2")) {
    assert.strictEqual(
      readFileSync(u).subarray(0, 4).toString("latin1"),
      "wOF2",
      `${u} is not a valid woff2`,
    );
  }
}

console.log(`ok: ${urls.length} bundled asset(s) present`);

// --- design-system guards (Wispr Flow language) ---
// The rules easiest to regress by pasting a snippet in from somewhere else.
const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
const code = css.replace(/\/\*[\s\S]*?\*\//g, ""); // drop comments

assert.ok(!/box-shadow/i.test(code), "the system is border-driven, never shadowed");
assert.ok(!/gradient/i.test(code), "the palette is flat - no gradient fills");

// Interactive surfaces carry a 2px ink border; that weight is the signature.
for (const sel of [".btn {", "input[type=\"password\"] {"]) {
  const block = code.slice(code.indexOf(sel), code.indexOf("}", code.indexOf(sel)));
  assert.ok(
    /border:\s*2px solid/.test(block),
    `${sel.trim()} must keep its 2px border`,
  );
}

// Controls never go below 12px radius. Scoped to controls on purpose: the
// waveform bars are 1px-rounded decoration, not geometry the rule governs.
for (const sel of [".btn {", "input[type=\"password\"] {"]) {
  const block = code.slice(code.indexOf(sel), code.indexOf("}", code.indexOf(sel)));
  const r = Number(block.match(/border-radius:\s*(\d+)px/)?.[1]);
  assert.ok(r >= 12, `${sel.trim()} radius is ${r}px, floor is 12px`);
}

// Body type floor.
const sizes = [...code.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
assert.ok(Math.min(...sizes) >= 14, `type floor is 14px, found ${Math.min(...sizes)}px`);

// The display headline commands through scale, not weight.
const title = code.slice(code.indexOf("#stateTitle"), code.indexOf("}", code.indexOf("#stateTitle")));
assert.ok(/font-weight:\s*400/.test(title), "the serif headline stays at weight 400");
assert.ok(/font-size:\s*(4[89]|[5-9]\d|1\d\d)px/.test(title), "headline must be >= 48px");

console.log(`ok: design guards (${sizes.length} type sizes, min ${Math.min(...sizes)}px)`);

// --- disabled detection ---
// Coursera CDS buttons keep .disabled === false and mark unavailability with
// aria-disabled, so checking the property alone finds a dead button, clicks
// it, and reports success. Mirror of isDisabled() in popup.js.
const isDisabled = (el) =>
  el.disabled === true || el.getAttribute("aria-disabled") === "true";

const el = (props, attrs = {}) => ({
  ...props,
  getAttribute: (k) => (k in attrs ? attrs[k] : null),
});

assert.strictEqual(isDisabled(el({ disabled: true })), true, "plain disabled");
assert.strictEqual(
  isDisabled(el({ disabled: false }, { "aria-disabled": "true" })),
  true,
  "aria-disabled must count as disabled - this is the real Coursera case",
);
assert.strictEqual(
  isDisabled(el({ disabled: false }, { "aria-disabled": "false" })),
  false,
  "aria-disabled=false is enabled",
);
assert.strictEqual(isDisabled(el({ disabled: false })), false, "no attribute");

// The mirror above only proves the logic is right, not that popup.js uses it,
// so assert against the real source. Both injected functions need their own
// copy: executeScript serializes them, so a shared helper cannot be closed over.
const bodies = [...bg.matchAll(/function isDisabled\(el\) \{([^}]*)\}/g)].map(
  (m) => m[1],
);
assert.strictEqual(bodies.length, 1, "the selection pass needs its own isDisabled copy");
for (const body of bodies) {
  assert.ok(
    body.includes('getAttribute("aria-disabled") === "true"'),
    "isDisabled must check aria-disabled, not just the .disabled property",
  );
}

// The extension must not tick the honor-code box or press Submit: that
// attestation is the users to make. Guard against either creeping back.
// isHonorCode still appears, and should: it is the filter that stops the
// attestation group being mistaken for a question. What must stay gone is the
// handle we used to tick it.
const allCode = js + bg;
assert.ok(!/honorCodeBox/.test(allCode), "the extension must not tick the honor-code checkbox");
assert.ok(!/submitBtn|submitQuiz|submitOnPage/.test(allCode), "the extension must not submit");

console.log("ok: disabled detection");

// --- dot loader frames ---
// Every index must address a real cell in the 7x7 grid. An out-of-range index
// is silently ignored at runtime: the dot just never lights, and the animation
// looks subtly wrong rather than failing.
const frames = JSON.parse(
  js.slice(js.indexOf("const DOT_FRAMES = ["), js.indexOf("];", js.indexOf("const DOT_FRAMES")) + 2)
    .replace("const DOT_FRAMES = ", "")
    .replace(/,(\s*\])/g, "$1")
    .replace(/;\s*$/, ""),
);

assert.ok(frames.length > 1, "need more than one frame to animate");
for (const [i, frame] of frames.entries()) {
  assert.ok(Array.isArray(frame) && frame.length, `frame ${i} is empty`);
  for (const cell of frame) {
    assert.ok(
      Number.isInteger(cell) && cell >= 0 && cell <= 48,
      `frame ${i} has cell ${cell}, outside the 7x7 grid`,
    );
  }
}

// The grid must be built with exactly as many cells as the frames address.
assert.ok(js.includes('"<i></i>".repeat(49)'), "grid must render 49 cells");

// The interval is the one resource here that can leak; setDots must clear
// before it starts, so a second call cannot leave an orphan timer.
const setDotsBody = js.slice(js.indexOf("function setDots(on)"), js.indexOf("function setState"));
const clearAt = setDotsBody.indexOf("clearInterval");
const startAt = setDotsBody.indexOf("setInterval(");
// Both must be present: indexOf returns -1 when missing, and -1 < anything,
// so comparing positions alone would pass with no clearInterval at all.
assert.ok(clearAt !== -1, "setDots must clear any running timer");
assert.ok(startAt !== -1, "setDots must start a timer");
assert.ok(clearAt < startAt, "the clear must come before the start");

console.log(`ok: dot loader (${frames.length} frames)`);

// --- popup must stay a renderer ---
// The whole point of the worker is that a run outlives the popup. If any of
// the engine drifts back into popup.js, closing the popup kills the run again.
for (const name of ["getAIAnswers", "fetchModels", "selectAnswersOnPage", "extractQuestionsDirectly"]) {
  assert.ok(bg.includes(`function ${name}`), `${name} must live in background.js`);
  assert.ok(!js.includes(`function ${name}`), `${name} must not be back in popup.js`);
}

// A worker that is not declared simply never runs, with no error anywhere.
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
assert.strictEqual(
  manifest.background?.service_worker,
  "background.js",
  "manifest must declare the service worker",
);

console.log("ok: popup/worker split");

// --- surfaces ---
// The side panel and the shortcut are both declared in the manifest and both
// silently do nothing if a piece is missing, so assert each one.
assert.strictEqual(
  manifest.side_panel?.default_path,
  "popup.html",
  "manifest must declare the side panel",
);
assert.ok(
  manifest.permissions.includes("sidePanel"),
  "the sidePanel permission is required for setPanelBehavior",
);
assert.ok(
  !manifest.action?.default_popup,
  "default_popup would win over the side panel on action click",
);
assert.ok(manifest.commands?.solve, "manifest must declare the solve command");
assert.ok(
  bg.includes("chrome.commands.onCommand"),
  "the worker must listen for the shortcut",
);
assert.ok(
  bg.includes("setPanelBehavior"),
  "clicking the toolbar icon must open the panel",
);

// Both entry points must funnel through one guard, or the shortcut can start a
// second run on top of a running one.
assert.strictEqual(
  (bg.match(/startSolve\(\)/g) || []).length,
  3, // definition, command listener, message handler
  "solve must have exactly one entry point, called from both surfaces",
);

// A panel is user-resizable; a fixed width would clip or leave dead space.
const bodyBlock = code.slice(code.indexOf("body {"), code.indexOf("}", code.indexOf("body {")));
// Anchored to the property start: "min-width: 280px" is a floor, not a fixed
// width, and an unanchored /width:\s*\d+px/ would flag it.
assert.ok(
  !/(^|[;{\s])width:\s*\d+px/m.test(bodyBlock),
  "the surface must be fluid, not a fixed pixel width",
);

console.log("ok: side panel + shortcut");

// --- icons ---
// A malformed or wrongly-sized icon is not an error Chrome reports; it just
// shows a generic puzzle piece, which is easy to ship without noticing.
for (const size of [16, 48, 128]) {
  const file = `icon${size}.png`;
  assert.ok(existsSync(file), `${file} is missing`);
  const buf = readFileSync(file);
  assert.strictEqual(
    buf.subarray(1, 4).toString("latin1"),
    "PNG",
    `${file} is not a PNG`,
  );
  // IHDR width/height sit at fixed offsets right after the signature.
  assert.strictEqual(buf.readUInt32BE(16), size, `${file} width is not ${size}`);
  assert.strictEqual(buf.readUInt32BE(20), size, `${file} height is not ${size}`);
  assert.strictEqual(
    manifest.icons?.[String(size)],
    file,
    `manifest must list ${file}`,
  );
  assert.strictEqual(
    manifest.action?.default_icon?.[String(size)],
    file,
    `action must list ${file}`,
  );
}

console.log("ok: icons");
