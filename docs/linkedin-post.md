I gave myself a design team that lives in Slack. It has four members, and none of them are human.

As a product designer, I see the same thing every sprint: the PRD is done, and then it waits. Nobody can compare directions until a designer is free.

For the Flip the Switch hackathon by WeMakeDevs, I built Switchboard Studio to close that gap.

You drop a brief in a Slack room, and four AI teammates pick it up:

1. Brief asks what's missing, and gives a default for every question.
2. Designer builds three genuinely different directions in Figma, using only our published design system. Real components and real variables, not lookalikes.
3. Critic scores them with numbers, not vibes: contrast, touch targets, how much is actually on-system. Then it picks a favourite.
4. Keeper writes down who chose what and why.

The part I care about most: nothing ships on the AI's say-so. I reply "B, but open the list as a table", and the designer makes a v2 next to the original instead of replacing it.

Under the hood it's Switch. One template creates the agents and the room. No servers to babysit, no glue code between the agents. They hand off to each other with plain @mentions, like colleagues.

Watch the 3-minute demo above. The code is open source if you want to run it with your own design system: github.com/romeet9/switchboard-studio

#HowISwitch #FlipTheSwitch #WeMakeDevs #ProductDesign #DesignSystems #Figma #AIAgents #ClaudeCode
