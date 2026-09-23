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

// The regex in popup.js must stay in sync with the one above.
assert.ok(
  readFileSync("popup.js", "utf8").includes(String(skip)),
  "skip regex drifted from popup.js",
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

// --- countdown math: drives both the "Submitting in Ns" label and the bar ---
// Mirror of countdownFrame() in popup.js. If you change one, change both.
const countdownFrame = (remainingMs, totalMs) => {
  const clamped = Math.max(0, Math.min(remainingMs, totalMs));
  return {
    seconds: Math.ceil(clamped / 1000),
    percent: totalMs > 0 ? (clamped / totalMs) * 100 : 0,
  };
};

// Ceil, not round: 4001ms must read "5s", never "4s" while 4s is still left.
assert.deepStrictEqual(countdownFrame(5000, 5000), { seconds: 5, percent: 100 });
assert.deepStrictEqual(countdownFrame(4001, 5000).seconds, 5);
assert.deepStrictEqual(countdownFrame(4000, 5000).seconds, 4);
assert.deepStrictEqual(countdownFrame(1, 5000).seconds, 1, "never shows 0s early");
assert.deepStrictEqual(countdownFrame(0, 5000), { seconds: 0, percent: 0 });

// A slow tick can overshoot past zero; the bar must not go negative or the
// label report a negative countdown.
assert.deepStrictEqual(countdownFrame(-800, 5000), { seconds: 0, percent: 0 });
assert.ok(countdownFrame(9999, 5000).percent <= 100, "bar must not exceed 100%");

assert.ok(
  readFileSync("popup.js", "utf8").includes("function countdownFrame("),
  "countdownFrame drifted out of popup.js",
);

console.log("ok: countdown");

// --- every id popup.js looks up must exist in popup.html ---
// A rename in one file silently produces null derefs in the other.
const js = readFileSync("popup.js", "utf8");
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

// --- design-system guards (GSAP language) ---
// These are the rules easiest to regress by pasting in a snippet from
// elsewhere, and each one is visible the moment it breaks.
const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
const code = css.replace(/\/\*[\s\S]*?\*\//g, ""); // drop comments

assert.ok(
  !/#fff\b|#ffffff\b|#000\b|#000000\b/i.test(code),
  "pure white/black break the cream-on-off-black pairing",
);
assert.ok(!/box-shadow/i.test(code), "depth comes from surface steps, not shadow");

// Buttons are outlined-only; the CTA escalates to a gradient *stroke*, never a
// fill. A solid background on .btn is the one change that would break the look.
const btnBlock = code.slice(code.indexOf(".btn {"), code.indexOf(".btn:hover"));
assert.ok(
  /background:\s*transparent/.test(btnBlock),
  ".btn must stay transparent - the system has no filled CTAs",
);

// Body type floor: the guide forbids anything under 14px.
const sizes = [...code.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) =>
  Number(m[1]),
);
assert.ok(sizes.length > 5, "expected several font-size declarations");
assert.ok(
  Math.min(...sizes) >= 14,
  `type floor is 14px, found ${Math.min(...sizes)}px`,
);

console.log(`ok: design guards (${sizes.length} type sizes, min ${Math.min(...sizes)}px)`);
