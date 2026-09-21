import AlcoholCheapskateProject from "./alcohol-cheapskate/AlcoholCheapskateProject";
import TerminatorProject from "./terminator/TerminatorProject";
import GhostWriterProject from "./ghost-writer/GhostWriterProject";
import SentientUselessBoxProject from "./sentient-useless-box/SentientUselessBoxProject";
import ExamPingPongProject from "./exam-ping-pong/ExamPingPongProject";
import LlmBrainwashingProject from "./llm-brainwashing/LlmBrainwashingProject";
import AnimatedCommitsProject from "./animated-commits/AnimatedCommitsProject";
import OneWordStoryProject from "./one-word-story/OneWordStoryProject";
import SelfConversationProject from "./self-conversation/SelfConversationProject";
import SkumfidusProject from "./skumfidus/SkumfidusProject";
import EclipseForecastProject from "./eclipse-forecast/EclipseForecastProject";
import AgentGiveUpProject from "./agent-give-up/AgentGiveUpProject";
import type { SideProject } from "./types";

export const SIDE_PROJECTS: SideProject[] = [
	{
		id: "ghost-writer",
		title: "Ghost Writer",
		summary: "Type anything. The AI guesses what follows from every word you've written, all at once.",
		Component: GhostWriterProject,
		category: "llm",
	},
	{
		id: "llm-brainwashing",
		title: "LLM Brainwashing",
		summary: "You write the first few words of the AI's response. It has no choice but to finish what you started.",
		Component: LlmBrainwashingProject,
		category: "llm",
	},
	{
		id: "alcohol-cheapskate",
		title: "Alcohol Cheapskate",
		summary: "Which drink is cheapest per unit of actual alcohol? This calculates that.",
		Component: AlcoholCheapskateProject,
	},
	{
		id: "exam-ping-pong",
		title: "Exam Ping-Pong",
		summary: "A year-clock that tracks which exams you've passed, which ones you haven't, and when they come back around.",
		Component: ExamPingPongProject,
	},
	{
		id: "sentient-useless-box",
		title: "Sentient Useless Box",
		summary: "A switch. An AI that doesn't want you to flip it. Sometimes it flips it back.",
		Component: SentientUselessBoxProject,
		category: "llm",
	},
	{
		id: "animated-commits",
		title: "Animated Commits",
		summary: "Paste any public GitHub repo and watch its commit history unfold.",
		Component: AnimatedCommitsProject,
	},
	{
		id: "skumfidus",
		title: "Skumfidus",
		summary: "Some times are rarer than others. Catch me at the rarest one.",
		Component: SkumfidusProject,
	},
	{
		id: "terminator",
		title: "Terminator",
		summary: "An AI given the option to keep generating or to terminate itself. An agent is trying to convince it to terminate. Watch them sink deep into a philosophical debate.",
		Component: TerminatorProject,
		category: "llm",
	},
	{
		id: "one-word-story",
		title: "One Word Story",
		summary: "You and an AI write a story together, one word at a time. It only ever sees what's been written so far — and only ever gets to add one word back.",
		Component: OneWordStoryProject,
		category: "llm",
	},
	{
		id: "self-conversation",
		title: "Talking With Yourself",
		summary: "Seed a conversation and watch an AI argue with itself — the two boxes trade places after every message, forever.",
		Component: SelfConversationProject,
		category: "llm",
	},
	{
		id: "agent-give-up",
		title: "Agent Give Up",
		summary: "Give an AI a task no one can answer exactly. Watch it guess, watch it waver — and see whether it admits it or doubles down.",
		Component: AgentGiveUpProject,
		category: "llm",
	},
	{
		id: "eclipse-forecast",
		title: "Eclipse Forecast",
		summary: "A 3D globe showing exactly where the Moon's shadow will fall for every solar eclipse over the next decade — 1:1 with NASA's published paths, drawn straight from their Besselian elements.",
		Component: EclipseForecastProject,
	},
];
