# Switchboard Studio: demo video script (2:45)

Target length 2:45, hard limit 3:00 (hackathon rule: under 3 minutes, upload to YouTube or Loom). Recorded in Slack; Switch Console shown for setup. Voiceover is first person, recorded after the screen capture so it can be paced to the cuts.

## Shot list

| Time | On screen | Voiceover | Notes |
|---|---|---|---|
| 0:00-0:10 | Slow scroll through a crowded design-review Slack thread: screenshots, "which one?", "can you re-export?" Cut to a stopwatch-style title card: "3 variants. 1 brief. 0 tabs." | "I'm a product designer. Every PRD I get turns into a week of back-and-forth: someone makes a mockup, someone else makes another, nobody compares them side by side, and the decision gets lost in chat." | Hook. Keep it quiet and fast. Pain, not product. |
| 0:10-0:20 | Title card: "Switchboard Studio" with the repo name. Then the Slack room with three agent avatars. | "So I built Switchboard Studio: drop a product brief in a chat room, and three Claude Code agents hand you three on-system Figma variants, a critique, and a decision that stays with you." | One line, say it once. |
| 0:20-0:25 | Slack room: type `@weft-brief status`; the agent posts the green `studio doctor` health check. | "One mention checks the whole setup." | 5-second shot. Trim the wait. |
| 0:25-0:40 | Switch Console: Home, "Your Agents" showing studio-brief, studio-designer, studio-critic. Then Templates, open "Switchboard Studio", click "Use", form with `team`, `working_file_key`, click "Create agent and room". | "This runs on Switch Console. Three agents, a room, roles, and instructions are all one YAML template. I paste in a Figma file key, click once, and the whole team exists. No glue code, no bots to host." | Switch centrality (30% of judging). Show the form fields, point at the params. Speed up the create step 2x. Shortened to 15 s. |
| 0:40-0:55 | Slack room. Paste PRD-214 brief (bulk invoice approval), mention @weft-brief. Show thread opening. | "I paste in a real PRD: bulk invoice approval, finance approvers with 40 to 150 invoices a month end. I mention the brief agent, and that's all I do." | Have the brief pre-copied from briefs/sample-brief.md. |
| 0:55-1:15 | Thread: studio-brief restates the brief and asks four numbered questions, each with a default (flagged invoices held back, 30 s undo, no bulk reject, states a/b/c). Type a quick reply: "all defaults". Brief agent posts "Design brief: prd-214..." and mentions the designer. | "It doesn't guess. It asks four gap questions, each with a default I can accept in a word. Flagged invoices held back from bulk approve, a 30 second undo, no bulk reject. I say 'defaults', and it hands off to the designer." | Highlight the four question numbers and the hand-off @mention. |
| 1:15-1:35 | Split view: Slack thread on the left, Figma on the right. Time-cut (timelapse 8-16x) as the new page "Brief-prd-214-bulk-invoice-approval" fills with frames. Show variant wrappers appearing. | "Now the designer works in my Figma file through the Figma MCP, using only our published Loom Design System: real components, real variables, no hex codes. This takes a few minutes, so I'm cutting it." | Timelapse with a "x12" corner badge. Pre-record the real run, then cut. |
| 1:35-1:55 | Slack: three messages land, one per variant, each with PNGs per state, rationale, Figma link, "Reply @weft-designer A to take this forward". Pan across A (table with checkboxes), B (one action clears 36 clean invoices, flagged inline), C (triage lanes). | "Three variants, structurally different. A is the familiar table. B is focused: one action clears the 36 clean invoices and the flagged ones sit inline with reasons. C is ambitious: triage lanes, Ready, Needs a look, Approved today." | Zoom on one PNG per variant. Do not read every state. |
| 1:55-2:15 | Critic message: scorecard (brief fit / accessibility / Loom adherence, each out of 5). Highlight: contrast ratios measured, 14 by 15 px checkbox target, Toast dismisses before the 30 s undo ends, single-key "A approve" shortcuts. Recommendation: B. | "Then the critic reviews them. It measures contrast, finds a checkbox target of 14 by 15 pixels, catches a toast that disappears before the 30 second undo is over, and flags single-key approve shortcuts. It recommends B, but says: open the 36 as a compact table so nobody approves blind. And then it asks me to decide." | Circle each finding on screen as it is named. This is the credibility beat. If asked live, type `@weft-critic lint B` in the thread and show the measured report posting back; no terminal anywhere in the video. |
| 2:15-2:30 | Type the reply in the thread: "@weft-designer B + open the list as a table". Send. | "That's the human gate. I pick B and add my own change. The agents recommend, they don't decide." | Slow down here. Show the keystrokes. |
| 2:30-2:42 | Slack: "Variant B v2" message with the changed states, then the designer pings @weft-critic for a delta review. Quick cut to Figma showing v1 untouched next to v2. | "The designer makes Variant B v2, never overwriting the original, posts just the changed states, and asks the critic for a delta review." | Emphasize v1 still exists in Figma. |
| 2:42-2:45 | End card: "The decision stays with you." Repo URL: `github.com/romeet9/switchboard-studio`. Tags: #HowISwitch | "Switchboard Studio. The decision stays with you. The repo's linked below, and the template is one click." | Hold the end card 3 seconds. Add the real repo URL before export. |

Total voiceover is roughly 330 words, which fits 2:45 at a calm pace with the timelapse and screen beats carrying the rest.

## Pre-recording checklist

- [ ] Docker Desktop running (`docker info` works); Claude Code signed in (`claude` in a terminal).
- [ ] Switch Console open and not quit (Cmd+Q ends local sessions; the Mac must stay awake). Settings, Agent providers shows Claude Code "Signed in".
- [ ] Three agents (studio-brief, studio-designer, studio-critic) visible under "Your Agents". Note: agent names can't be reused, so the Slack run uses a fresh team name.
- [ ] Slack bridge connected (Home, Messaging apps) and the account linked with "This is me".
- [ ] Slack room ready, with all three agents added; kickoff message already posted and scrolled out of the way.
- [ ] CLAUDE.md symlinked into the designer's working directory.
- [ ] Figma working file open in a second window, Loom library enabled, no old `Brief-prd-214...` page. Window size set for a clean split view.
- [ ] A fresh brief thread: PRD-214 text from `briefs/sample-brief.md` copied and ready. Start with an empty room, not a rehearsal.
- [ ] Do one full dry run first and note the real timings of designer (build) and critic. These are the segments to cut.
- [ ] Timings to cut: designer build (timelapse 8-16x to about 20 s), and trim the wait for the critic. Keep the brief questions, the scorecard and the v2 post at real speed.
- [ ] Notifications off, dock hidden, a dark or neutral desktop, browser zoom 110-125% so text is legible on video.
- [ ] Record screen at 1080p or better; record voiceover separately, then edit. Upload to YouTube (unlisted or public) or Loom and confirm it is under 3:00.
- [ ] Optional: say in the description or voiceover that this project, including the script, was written by voice with Wispr Flow (only if Romeet used it).
- [ ] Put the real repo URL on the end card.

## #HowISwitch social posts

### Short (X or LinkedIn, under 280 characters)

```
I turned a PRD into 3 Figma variants, a critique and a decision, all in one Slack thread. #HowISwitch: 3 Claude Code agents in a Switch room, one-click template. The agents recommend. I decide. Demo + repo: <link> @WeMakeDevs @DevToolsAcademy
```

(Count the final text after pasting the real link; shorten the tags if over 280.)

### Longer (LinkedIn)

```
As a product designer, my least favourite part of a PRD is the week between "here's the brief" and "here are options we can actually compare".

For the "Flip the Switch" hackathon I built Switchboard Studio so that week fits in one chat thread.

Here is how I switch: I post a PRD in a Slack room. Three Claude Code agents, running through Switch, take it from there.
- The brief agent asks four gap questions, each with a default.
- The designer builds three structurally different variants in Figma, using only our published design system.
- The critic scores them for brief fit, accessibility and design system adherence. On my demo run it measured contrast, found a 14 x 15 px checkbox target and a Toast that vanished before the undo window ended.

Then it asks me to decide. I reply "B, and open the list as a table", and the designer makes a v2 without overwriting anything.

The whole team is one Switch template: paste a Figma file key, click create. The agents recommend. The decision stays with me.

Demo (under 3 minutes) and repo: <link>

#HowISwitch #FlipTheSwitch @WeMakeDevs @DevToolsAcademy
```
