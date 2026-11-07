// One entry per scene. `vo` is spoken; `min` is the shortest the scene may run.
// Scene length = max(min, voiceover length + 0.6 s). Run `python3 vo.py` after editing `vo`.
window.SCENES = [
  { min: 4.4, bg: 'ink',  lines: ['the PRD is ready.', 'the designs are', 'two weeks away.'],
    vo: 'Every PM knows this. The PRD is ready, but the designs are two weeks away.' },
  { min: 3.6, bg: 'lime', lines: ['so I built', 'a design team', 'that lives in slack.'],
    vo: 'So I built a design team that lives in Slack.' },
  { min: 3.6, bg: 'ink',  lines: ['four AI agents.', 'one human', 'who decides.'], align: 'right',
    vo: 'Four AI agents, and one human who makes the call.' },

  { min: 6.0, bg: 'lime', tag: '01 — brief', img: 'brief-questions.png', cls: 's',
    lines: ['reads the PRD.', 'asks what’s', 'missing.', 'a default for', 'every question.'],
    vo: 'First, the Brief agent reads the PRD and asks what’s missing. Every question comes with a default, so you can just say go.' },
  { min: 6.0, bg: 'ink', tag: '02 — designer', img: 'design-A-state-a.png', cls: 's',
    lines: ['builds real', 'screens in figma,', 'only from your', 'design system.'],
    vo: 'Then the Designer builds real screens in Figma, through the Figma MCP, using only your published design system.' },
  { min: 3.6, bg: 'lime', lines: ['no hex codes.', 'real components.', 'real variables.'],
    vo: 'No hex codes. Real components. Real variables.' },

  { min: 5.4, bg: 'ink', tag: '03 — critic', img: 'critic-scorecard.png', cls: 's',
    lines: ['doesn’t guess.', 'it measures.', 'then it picks', 'a favourite.'],
    vo: 'The Critic doesn’t guess. It measures the Figma file, scores every variant, then picks a favourite.' },
  { min: 4.4, bg: 'lime', tag: 'measured by studio lint',
    lines: ['97% bound.', '100% text styles.', '0 contrast fails.'],
    vo: 'Ninety-seven percent bound to variables. Every text style on-system. Zero contrast failures.' },

  { min: 4.6, bg: 'ink', tag: '04 — keeper', img: 'handoff.png', cls: 's',
    lines: ['writes down', 'who chose what,', 'and why.'],
    vo: 'The Keeper writes down who chose what, and why. So a month later, the answer is still there.' },
  { min: 4.6, bg: 'lime', tag: 'you, in the thread',
    lines: ['you reply:', { t: '@designer A', mono: 1 }, { t: '+ bigger checkbox', mono: 1 }],
    vo: 'You stay in charge. Just reply in the thread: designer A, plus a bigger checkbox.' },
  { min: 3.8, bg: 'ink', lines: ['it makes v2.', 'the original', 'stays untouched.'], align: 'right',
    vo: 'It makes version two, and the original stays untouched.' },

  { min: 4.2, bg: 'lime', tag: 'runs on switch',
    lines: ['one template.', 'one click.', 'no glue code.'],
    vo: 'It all runs on Switch. One template, one click, and no glue code.' },
  { min: 4.6, bg: 'ink', cls: 'xl', lines: ['AI designs.', 'lint measures.', 'you decide.'],
    vo: 'AI designs. Lint measures. You decide.' },
  { min: 5.2, bg: 'lime', cls: 'xl', lines: ['switchboard', 'studio.'],
    foot: ['github.com/romeet9/switchboard-studio', '#HowISwitch'],
    vo: 'This is Switchboard Studio. The code is open source, on GitHub.' },
];
