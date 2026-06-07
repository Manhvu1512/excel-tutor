# SETUP GUIDE — Excel Tutor MVP

You'll be up and running in about 30 minutes. No coding required. Just copy-paste and follow each step.

---

## STEP 1 — Install Node.js (one-time setup, ~5 min)

Node.js is what runs the app on your computer. Free, made by the same people behind your phone's JavaScript.

**On Mac:**
1. Go to https://nodejs.org
2. Download the **LTS version** (the big green button on the left)
3. Open the downloaded file and click through the installer
4. To verify it worked: open Terminal (press Cmd+Space, type "Terminal", hit Enter) and type:
   ```
   node --version
   ```
   You should see something like `v20.18.0`. If yes, you're set.

**On Windows:**
1. Go to https://nodejs.org
2. Download the **LTS version**
3. Run the installer, accept all defaults
4. To verify: open Command Prompt (Windows key, type "cmd", hit Enter) and type:
   ```
   node --version
   ```
   Should show `v20.x.x`.

---

## STEP 2 — Get your Anthropic API key (~3 min)

This is what powers the AI tutor and grading.

1. Go to https://console.anthropic.com/settings/keys
2. Sign up or log in
3. Click **"Create Key"**
4. Give it a name like "excel-tutor-local"
5. **Copy the key immediately** (starts with `sk-ant-`). You can't see it again after closing.
6. Save it somewhere safe (a note app, password manager, anywhere private)

You'll need to add credit to your Anthropic account (start with $5–10). The tutor uses Claude Sonnet 4.5 — at typical usage you'll spend about $0.05–0.15 per learner-hour. Plenty for showing 10 buyers next week.

---

## STEP 3 — Get the project files onto your computer (~2 min)

1. Download the `excel-tutor.zip` file (provided with this guide)
2. Unzip it — on Mac, double-click. On Windows, right-click → Extract All.
3. Move the folder somewhere easy to find. I recommend your Desktop. The folder is named `excel-tutor`.

---

## STEP 4 — Add your API key to the project (~2 min)

1. Open the `excel-tutor` folder
2. Find the file called `.env.local.example`
3. **Rename it** to `.env.local` (remove the `.example` part)
   - On Mac: right-click → Rename. If you can't see the `.example`, go to Finder → Settings → Advanced and turn on "Show all filename extensions."
   - On Windows: right-click → Rename. Same — make sure file extensions are visible.
4. Open `.env.local` with a text editor (TextEdit on Mac, Notepad on Windows). **Do NOT use Microsoft Word — it adds invisible characters that break things.**
5. Replace `sk-ant-your-key-here` with the API key you copied in Step 2
6. Save and close

The file should look like this when done:
```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## STEP 5 — Install the app's dependencies (~5 min)

This downloads the helper libraries (Univer spreadsheet, React, etc.).

1. Open Terminal (Mac) or Command Prompt (Windows)
2. Navigate to the project folder. If it's on your Desktop, type:
   ```
   cd ~/Desktop/excel-tutor
   ```
   On Windows:
   ```
   cd %USERPROFILE%\Desktop\excel-tutor
   ```
3. Run:
   ```
   npm install
   ```
4. Wait. You'll see a lot of text scrolling. This is normal. Takes 2–5 minutes depending on your internet. When it stops and you see your prompt again, you're done.

If you see warnings (yellow text), ignore them. If you see actual errors (red text saying "ERR!"), copy them and ask Claude to help.

---

## STEP 6 — Start the app (~30 seconds)

In the same Terminal window, type:
```
npm run dev
```

After a few seconds you'll see something like:
```
▲ Next.js 14.2.18
- Local:        http://localhost:3000
```

Open your browser and go to **http://localhost:3000**

You should see the Excel Tutor with three panels: lesson on left, spreadsheet in middle, AI tutor on right.

**To stop the app**: go back to Terminal, press `Ctrl+C`. To restart it later, run `npm run dev` again from the project folder.

---

## STEP 7 — Try it out (~5 min)

1. Click on the highlighted yellow cell on the spreadsheet (should be cell **I2**)
2. Type your formula. For Exercise 1, try: `=SUMIFS(E2:E36,C2:C36,"Marketing")`
3. Hit Enter
4. Watch the magic: confetti, XP gain, level bar fills, AI tutor congratulates you
5. Try a wrong formula on purpose: `=SUM(E2:E36)` — the spreadsheet shakes, AI tutor gives a hint
6. Try chatting with the tutor on the right: "give me a hint"

---

## HOW TO ADD YOUR OWN CONTENT

There are TWO files you edit. That's it.

### File 1: `content/dataset.csv` — the spreadsheet data

Open it in **Excel**. Edit it like any spreadsheet. Save it (keep the `.csv` format, NOT `.xlsx`).

Rules:
- Row 1 = headers (column names). Don't change the header names unless you also update your exercises.
- Each row below = one transaction (or whatever your data is).
- Don't leave the column names empty.
- Keep file name `dataset.csv` unless you also update `lesson-config.json`.

### File 2: `content/lesson-config.json` — the exercises

Open it in a plain text editor (TextEdit on Mac, Notepad on Windows — NOT Word).

Key things to edit:
- `"topic"` — the function name (e.g., "VLOOKUP", "XLOOKUP", "IF")
- `"topicLongName"` — display name (e.g., "VLOOKUP — Looking up values from a table")
- The `"exercises"` array — each exercise has:
  - `"title"` — short name shown to the learner
  - `"scenario"` — the setup
  - `"controllerAsk"` — the "boss" question
  - `"answerCell"` — where the answer goes, like `"I2"` or `"K5"` (column letter + row number)
  - `"expectedValue"` — the correct number. **You compute this yourself first**, then enter it here.
  - `"tolerance"` — usually `0.01` for currency (allows for tiny rounding)
  - `"xpReward"` — usually 10–30 depending on difficulty

After editing either file, just **refresh your browser** — the app reloads automatically.

### Pro tips for adding exercises

1. **Compute the expected value first.** Open `dataset.csv` in Excel, write the formula yourself, get the answer. Put that number in `expectedValue`. If your number is wrong, the learner will never be marked correct.
2. **Test it as a learner.** Refresh the page and try to do your own exercise. If your formula doesn't match the expected value, fix it before showing anyone.
3. **One lesson per session for now.** The MVP runs one topic at a time. To switch from SUMIFS to VLOOKUP, change `"topic"` and the exercises in `lesson-config.json`.

---

## WHAT TO SHOW BUYERS

Open the app on your laptop. Walk them through:

1. **The lesson** (left panel) — "the AI wrote this lesson in 2 seconds, personalized to a finance context."
2. **The exercise** (read aloud) — "imagine your new hire on day 3. Here's a real CMO question."
3. **Type a WRONG formula on purpose** — "watch what happens." Shake animation + AI hint.
4. **Type the right formula** — confetti, XP +10, AI congratulates.
5. **Click ahead through 2-3 more exercises** — show difficulty scaling.
6. **Chat with the tutor** — type "what's the difference between SUMIF and SUMIFS?" — show it gives finance-specific answers.

Then: "Imagine 12 lessons of this, customized to your team's department, with a manager dashboard showing who's progressing. That's what we're building. Pilot pricing is $25/seat for the first 6 months in exchange for feedback and a logo."

---

## TROUBLESHOOTING

**"Cannot connect to localhost:3000"** — make sure `npm run dev` is still running in Terminal. If you closed it, run again.

**"ANTHROPIC_API_KEY is undefined"** — your `.env.local` file is wrong. Check: (a) it's named exactly `.env.local` not `.env.local.txt`, (b) there are no spaces around the `=`, (c) you saved with TextEdit/Notepad not Word.

**Spreadsheet shows but no data appears** — your `dataset.csv` is malformed. Open in Excel, make sure row 1 is headers, save as CSV (UTF-8) format.

**AI gives weird responses or says "I hit a hiccup"** — your API key has run out of credit. Top up at https://console.anthropic.com/settings/billing.

**Confetti doesn't show on correct answer** — your `expectedValue` in `lesson-config.json` doesn't match what the formula actually returns. Recompute it.

**Everything else** — copy the error message and paste it into a chat with Claude. Claude will diagnose.

---

## WHAT'S NEXT (after the demo with 10 buyers)

If buyers say yes:
1. Add user accounts (so progress saves)
2. Build the manager dashboard
3. Add 11 more lessons (the other functions in your Top 12)
4. Hire your first developer

If buyers say no but give feedback:
1. Listen carefully — they're telling you what to change
2. Iterate the demo, not the architecture
3. Try 10 more buyers

You've got this.
