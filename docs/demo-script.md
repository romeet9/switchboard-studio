# Switchboard Studio: demo video script (2:50)

Hard limit 3:00, uploaded to YouTube or Loom. Everything happens in Slack, apart from one Switch Console shot. Record the screen first, then the voiceover paced to the cuts. First person, calm, about 340 words.

**The story in one line:** a PM drops a brief in Slack. Four AI teammates turn it into on-system Figma designs, a measured critique and a logged decision, and the PM still makes the call.

## Shot list

| # | Time | On screen | Voiceover |
|---|---|---|---|
| 1 | 0:00–0:12 | **Hook.** A Slack DM: "any update on the approvals screen mocks?" … "design queue is full till next sprint". Title card: **"The PRD is ready. The designs are two weeks away."** | "Every PM knows this. The PRD is ready, but the first designs are stuck in a queue for two weeks, and nobody can even compare options until then." |
| 2 | 0:12–0:22 | Title card **Switchboard Studio**, then the Slack room's member list: Brief, Designer, Critic, Keeper. | "So I built Switchboard Studio: four AI teammates in a Slack room that turn a brief into real, on-system designs, while the decision stays with the people." |
| 3 | 0:22–0:32 | **Switch Console**: Templates → Switchboard Studio → Use → the form (team, Figma file key) → the preview listing 4 agents + 1 room → **Create all**. | "It runs on Switch. The whole team is one template: I paste a Figma file key, click once, and four agents and a room exist. No bots to host, no glue code." |
| 4 | 0:32–0:40 | Slack: `@weft-brief status` → a short reply and a table of checks, all `ok`. | "One mention checks the whole setup." |
| 5 | 0:40–0:58 | Paste the PRD-214 brief and mention `@weft-brief`. It replies like a colleague: "Got it. Four quick things before Designer starts", with a **#, Question, My default** table. Type `2 60s`. | "I paste a real PRD: bulk invoice approval. The brief agent doesn't guess. It asks four questions, each with a default. I change one, the undo window, and accept the rest." |
| 6 | 0:58–1:05 | The brief as a **Field / Value** table, handed to `@weft-designer`. Keeper replies "Logged." | "It writes the brief, hands it to the designer, and the keeper logs it." |
| 7 | 1:05–1:22 | **Split screen**: Slack on the left, Figma on the right. Timelapse (×12 badge) as page `Brief-prd-214-…` fills with frames built from Loom components. | "The designer works in Figma through the Figma MCP, using only our published design system: real components, real variables, no hex codes. This takes a few minutes, so I've sped it up." |
| 8 | 1:22–1:45 | Three Slack messages, one per variant, each with a **State / What it shows** table, PNG screenshots and a Figma link. Zoom into one PNG each: A table, B one-click clear, C triage lanes. | "Three genuinely different directions. A is the familiar table. B clears the 36 clean invoices in one step. C splits the queue into lanes by risk. Every screen state is posted right in the thread." |
| 9 | 1:45–2:08 | Critic: "B's the one…" then a **Variant / Fit / A11y / Loom% / Risk** table and a **Fix first** table. Then type `@weft-critic lint B` → the measured table: `97% bound · 100% text · 1 contrast fail`. | "Then the critic reviews them, and it doesn't just give an opinion: it measures. Variable binding, text styles, contrast, touch targets, straight from the Figma file. It recommends B, with one fix: don't let anyone approve blind." |
| 10 | 2:08–2:25 | Type `@weft-designer B + open the list as a table`. **B v2** arrives with a **Change / Where** table. Cut to Figma: B and B v2 side by side, the original untouched. | "That's the human gate. I pick B and add my change. The designer makes v2 and never overwrites the original." |
| 11 | 2:25–2:40 | `@weft-keeper why prd-214` → a decision-trail table: recommendation → choice in my words → v2. Then the **"Decision log"** room document. | "And a month from now, when someone asks why we went with B, the keeper has the answer: every recommendation, choice and version, saved as a Switch room document." |
| 12 | 2:40–2:50 | End card: **"AI designs. Lint measures. You decide."**, then `github.com/romeet9/switchboard-studio`, the tests badge, and #HowISwitch. | "Switchboard Studio. AI designs, lint measures, and you decide. The repo and the one-click template are linked below." |

## Recording plan

1. **Dry run first**, with no recording, to get real timings and catch problems.
2. **Real run.** Record the whole screen at 1080p, one continuous take. Cut it afterwards.
3. **Cut:**
   - the designer's build, as a ×12 timelapse;
   - the "Starting a session…" waits;
   - the pauses before agents reply.
4. **Keep at real speed:** the questions, the critic scorecard, your pick, v2.
5. **Record the voiceover separately**, then edit to fit. Check the total is under 3:00.

## Pre-recording checklist

- [ ] Docker + Switch Console running. `@weft-brief status` is all `ok`.
- [ ] All 4 agents in the Slack room (`weft-keeper` invited) and `!reset` once.
- [ ] Figma working file open in a second window, Loom library enabled. Delete or hide old `Brief-prd-214…` pages so the build is fresh.
- [ ] PRD-214 text copied from `briefs/sample-brief.md` (change `@brief` to `@weft-brief`).
- [ ] Slack: fresh scroll position, notifications off, sidebar tidy, zoom 110–125%.
- [ ] macOS: Do Not Disturb on, dock hidden, a clean desktop.
- [ ] Optional for the Wispr side track: dictate the brief and replies with Wispr Flow, and mention it in the description.

## #HowISwitch posts

**Short (X, under 280 characters):**
```
A PRD goes into Slack. 3 on-system Figma designs, a measured critique and a logged decision come out. 4 Claude Code agents in a @SwitchAgents room. AI designs, lint measures, I decide. #HowISwitch #FlipTheSwitch <link>
```

**LinkedIn:**
```
PMs shouldn't wait two weeks to see their first design options.

For the Flip the Switch hackathon I built Switchboard Studio: four AI teammates in a Slack room.
- Brief asks the questions a designer would ask, with defaults.
- Designer builds three directions in Figma from our real design system.
- Critic measures them: variable binding, contrast, touch targets.
- Keeper logs every decision, so "why did we pick B?" has an answer.

I still make the call. The agents recommend; the decision stays with me.

Demo + repo: <link>
#HowISwitch #FlipTheSwitch
```
