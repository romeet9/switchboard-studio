# Submission answers (Flip the Switch)

**Project title**
Switchboard Studio

**Track(s)**
Track 01: Best Business Workflow

**Project description**
Product brief to design direction is slow, and AI design tools ignore your design system. Switchboard Studio is a team chat room with three Claude Code agents and one human gate. A PM drops a PRD in Slack (or Mattermost). The brief agent asks the missing questions, each with a default. The designer builds three structurally different variants in Figma using only the company's published design system (Loom), and posts each state into chat as an image. The critic measures contrast, target sizes and hand-built parts, scores each variant, and recommends one. The person decides by replying "@designer B + change", and the designer makes a v2 without overwriting anything. It is for PMs and product designers who want a first round of options in minutes that are actually on-system, with the decision staying human.

**GitHub repo URL**
https://github.com/romeet9/switchboard-studio

**Demo video URL**
TODO_VIDEO_URL

**How did you use Switch in your project?**
Agent: Claude Code, three instances (brief, designer, critic), with the Figma MCP. Platform: Slack (and the local Mattermost that Switch Console runs) through the template's bridge parameter. Switch is the product. One Switch template creates the whole crew in one click: three agents, a private room, aliases, a kickoff message, and two roles (pm, and an exclusive approver as the human gate). Room documents carry the Figma working-file key and Loom library key, so re-pointing the studio is a doc edit.

Three agents work in one room and hand off purely by @mention in one thread, with no orchestrator code. They talk in a human-like voice, and put tables (the critic's scorecard, lint results) in code blocks so they read cleanly in Slack. Slack commands drive the workflow: `help`, `status`, `list`, `export` and `lint`, for example `@weft-brief status`, `@weft-critic lint B`, `@weft-designer export B`. The agents run a tested CLI on the host.

The critic's lint is measured, not opinion: unbound fills, strokes, spacing and radius, hand-built parts, contrast below WCAG AA and small click targets. The designer uses Switch's send_attachment to post per-state PNG exports of each variant, so people review in the thread, not in Figma. The human approval gate stays with the person, who steers with an @mention reply ("@weft-designer B + change"); the designer then makes a v2 without overwriting anything. Remove Switch and this is a single-player CLI with no room, no hand-offs, no gate.

**What did you like about Switch, and what would you improve?**
Liked: the template format is excellent. One YAML gave me a three-agent crew, a room, roles and shared documents in one click, and @mention hand-offs were enough to build a real pipeline with zero glue code. Attachments in chat made the output reviewable by non-designers. The local Docker plus Mattermost setup made it reproducible with no tokens.

Improve:
1. Slack Markdown tables do not render, so agents put tables in code blocks instead.
2. Custom interactive buttons for agents. Choosing a variant is an @mention reply; a button would be far smoother.
3. Templates cannot place files such as CLAUDE.md into agent directories, so I document a manual link step (`studio init`).
4. A Figma reference type for room docs or attachments, so a frame could be a first-class object instead of a pasted link.
5. Bridges cannot be edited after creation, only deleted, which also deletes their rooms.
