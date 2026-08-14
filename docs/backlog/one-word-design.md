# One Word — LLM Word Chain Game Design

## Concept

The user and an AI agent build a sentence together, one word at a time. No editing, no take-backs — every character is final the moment it's typed. The only way forward is through.

---

## Core Mechanic

- User and AI **alternate adding exactly one word** to a growing shared sentence
- User types their word; pressing **Space** locks it in and submits
- The AI responds with its next word (max ~10 tokens, first word only is taken)
- The sentence grows, word by word, until a terminal condition

---

## Input Rules

| Action | Effect |
|---|---|
| Type a character | Appended to the current word — final, no undo |
| Press **Space** | Current word is committed; AI takes its turn |
| Press **Enter** | Ends the sentence (terminates the game) |
| Press **Backspace** | Creates a **fork** (see below) |

---

## The Fork Mechanic

Backspace does not delete — it **creates a branch**.

When backspace is pressed before submitting a word, the current in-progress characters are discarded and a new branch is opened from the most recent AI word. The original branch is preserved. The user can now take a different direction from the same point.

Forks are visualized as a **tree** — each node is a (user word, AI word) pair. Branches diverge when a fork is created. The user can navigate between active branches.

This means a single session can produce multiple diverging sentences from the same seed.

---

## AI Response Handling

- The full growing sentence is sent to the AI with an instruction to add one word
- Max tokens: ~10 (enough to get a word, not enough for the model to take over the sentence)
- Response is split on whitespace/punctuation — only the **first token** is used
- Leading/trailing spaces are stripped; the word is appended with a single space

---

## Display

- The sentence renders inline, growing left to right
- The word currently being typed appears at the cursor position, slightly dimmed or underlined, to signal it is not yet committed
- AI words appear via a brief streaming effect (even though only one word is shown)
- Fork branches are shown as a compact tree below the active sentence, selectable

---

## Terminal Conditions

| Condition | Trigger |
|---|---|
| User presses Enter | Sentence is complete, session ends |
| Sentence reaches max length (~40 words) | Session ends automatically |
| AI produces punctuation ending in `.`, `?`, `!` | Optionally auto-terminates |

---

## Presets / Starting Seeds

Rather than starting blank, the first word (or first few words) can be pre-seeded to set a tone:

| Label | Seed |
|---|---|
| Blank | *(empty — user starts)* |
| Ominous | "Suddenly," |
| Mundane | "The man" |
| Absurd | "Every Tuesday," |
| Threatening | "Nobody noticed" |

---

## Open Questions

- Should the AI always start, or always follow the user?
- How are forks displayed on mobile (no tree space)?
- Does each fork branch share a cost budget, or are they independent?
- Should punctuation count as its own "word" turn, or be attached to the preceding word?
- Can completed sentences be saved/shared as a URL?
- Is there a max number of active forks, or can the tree grow arbitrarily?
- If the user creates a fork mid-AI-turn (while AI is streaming), what happens?
