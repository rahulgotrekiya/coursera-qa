# Coursera Quiz Helper

A Chrome extension that reads a Coursera quiz, asks Google Gemini for the
answers, and selects them on the page.

**It does not submit.** You tick the honor-code box and press Submit yourself.

![Chrome](https://img.shields.io/badge/Chrome-114%2B-green?logo=googlechrome)
![License](https://img.shields.io/badge/License-MIT-blue)
![Version](https://img.shields.io/badge/Version-4.0.0-brightgreen)

---

## What it does

1. Reads the questions and answer options from the quiz page.
2. Sends them to Gemini, trying several models until one responds.
3. Clicks the matching option for each answer.
4. Stops, and tells you to finish.

Steps 1–3 run in a service worker, so closing the side panel does not stop a
run. Reopening it reattaches to whatever is in progress.

## What it deliberately does not do

It will not tick the honor-code checkbox and will not press Submit.

That checkbox is an attestation carrying your name, and on a graded Coursera
assessment the stated penalty for an AI-generated submission is course failure
or account deactivation. Ticking it programmatically forges that attestation,
so the extension leaves it to you. `test-models.mjs` fails if either behaviour
is reintroduced.

Read the Coursera Honor Code for your course before using this.

## Install

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Get a free Gemini API key — see [API_SETUP.md](API_SETUP.md).
6. Click the extension icon, paste the key, press Save.

Requires Chrome 114 or newer for the side panel.

## Use

Open a Coursera quiz, then either:

- Click the toolbar icon to open the side panel, and press **Answer questions**.
- Or press **Ctrl+Shift+Y**, which runs it with no panel open.

The panel shows the state, which model answered, and a chip per question. It
stays open while you work in the page, so the answers remain visible while you
check them.

**Copy questions** puts the questions on your clipboard and nothing else.

Rebind the shortcut at `chrome://extensions/shortcuts`.

## States

| State | Meaning |
|---|---|
| Ready | Idle |
| Reading | Extracting questions from the page |
| Thinking | Waiting on Gemini |
| Answering | Clicking options |
| Your turn | Done — tick the honor code and submit |
| Stopped | Some answers could not be selected; the reason is shown |
| Interrupted | The worker was killed mid-run; press again |
| Wrong page | Not a Coursera quiz |

## Troubleshooting

**"Google rejected the key"** — check the key, and that the Generative
Language API is enabled on that Google Cloud project.

**"Gemini quota exhausted (429)"** — your free-tier allowance is gone. It
resets daily. Check <https://aistudio.google.com/apikey>.

**"Google has no capacity (503)"** — Gemini is overloaded. The extension
already tries several models before reporting this; wait and retry.

**"No questions found"** — the quiz page had not finished rendering, or
Coursera changed its markup. Reload the page and try again.

**Some answers not selected** — the panel names how many landed. Coursera
sometimes marks controls unavailable with `aria-disabled` while leaving them
technically enabled; the extension skips those rather than reporting a click
that did nothing.

**Nothing happens on the icon click** — check `chrome://extensions` for a
service-worker error. Manifest changes need a full extension reload, not just
closing the panel.

**Injected text in the questions** — some assessment pages embed instructions
aimed at AI assistants inside the question text. This is scraped along with
the question and sent to Gemini, where it wastes most of the prompt and can
degrade the answers. `content.js` strips some of it; it is not exhaustive.

## Development

```
manifest.json    MV3 manifest: side panel, shortcut, service worker
background.js    Owns the run. Extraction, Gemini, answer selection.
popup.js         The side panel. A renderer over chrome.storage["run"].
popup.html       Markup and styles.
content.js       Scrapes questions from the page.
test-models.mjs  Self-checks. node test-models.mjs
fonts/           EB Garamond + Figtree, latin subsets, OFL.
```

Run the checks before committing:

```bash
node --check popup.js && node --check background.js && node test-models.mjs
```

They cover the model filter, answer parsing, the `aria-disabled` handling, the
dot-loader frames, the panel/worker split, the manifest surfaces, and the two
refusals above.

## Licence

MIT — see [LICENSE](LICENSE). Bundled fonts are SIL OFL 1.1, see `fonts/`.
