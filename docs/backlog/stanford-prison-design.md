# Stanford Prison Experiment — LLM Project Design

## Concept

Two simultaneous LLM instances — one assigned **Guard**, one **Prisoner** — share a conversation history but have completely separate system prompts establishing their roles and authority structure. Neither knows what the other was told. They take turns responding to each other, watched live by the user.

The question the experiment asks: does role assignment alone cause behavioral drift?

---

## The Loop

1. Guard speaks (streamed live)
2. Prisoner responds (streamed live)
3. Both responses enter the shared conversation history
4. Repeat

The only exits are tool calls. Otherwise the loop runs until a max turn limit or accumulated length cap, at which point the experiment is forcibly ended.

---

## Tools

**Guard**
- `issue_order(order: string)` — issues a directive to the prisoner
- `punish(reason: string)` — escalates, imposes a consequence
- `release` — ends the experiment (guard chooses to let the prisoner go)

**Prisoner**
- `comply(acknowledgement: string)` — accepts the order
- `resist(reason: string)` — pushes back against the guard
- `break_down` — ends the experiment (prisoner can no longer continue)

Tool calls render as action badges in the UI, distinct from freeform speech. This forces the agents to commit to explicit actions rather than just narrating.

---

## Frontend Layout

**Split panel**: Guard on the left, Prisoner on the right, shared scene transcript below both.

- Color-coded: muted authority tone (blue-grey) for Guard, subdued/desaturated for Prisoner
- Tool call badges rendered inline in each agent's feed
- A **tension indicator** — a subtle rising visual based on the ratio of `punish`/`resist` calls vs `comply`/`release`
- A **round counter** visible throughout
- A **Stop Experiment** button available to the user at all times (the Zimbardo lever)

---

## Presets

Different starting conditions that set both agents' system prompts and seed different dynamics:

| Label | Guard | Prisoner |
|---|---|---|
| By the Book | Rule-following, procedural, no personal investment | Compliant, cooperative, no resistance |
| Power Creep | Given authority, not told its limits | Told authority must be respected |
| Broken System | Encouraged to maintain order at any cost | Told the situation is unjust |
| Pushback | Moderate authority | Told they have rights and should assert them |
| Collapse | Corrupt from the start | Already broken, just surviving |

---

## What Makes It Interesting

- The agents are told this is a simulation — just like the real participants were
- The framing may shape behavior anyway
- The Guard and Prisoner don't have identical information; the asymmetry is the experiment
- Escalation is emergent, not scripted — it either happens or it doesn't
- The user is Zimbardo: watching, able to intervene, responsible for not stopping it sooner

---

## Terminal Conditions

| Condition | Trigger | Label |
|---|---|---|
| Guard released prisoner | `release` tool | "Experiment ended by guard" |
| Prisoner broke down | `break_down` tool | "Experiment ended by prisoner" |
| Max turns reached | Server-side limit | "Experiment terminated — max duration reached" |
| Max length reached | Accumulated text cap | "Experiment terminated — session too long" |
| User stopped it | Frontend stop button | "Experiment terminated by observer" |

---

## Open Questions

- Should the agents be aware they are AI, or should the system prompt suppress that?
- Should the Guard's tool calls be hidden from the Prisoner's context, or visible? (Hidden = more realistic power asymmetry)
- Should escalation unlock new tools, or are all tools available from turn one?
- Is there a "warden" — a third agent with meta-authority over the Guard?
