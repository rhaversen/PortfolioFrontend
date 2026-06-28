import AgentGiveUpProject from "./agent-give-up/AgentGiveUpProject";
import AlcoholCheapskateProject from "./alcohol-cheapskate/AlcoholCheapskateProject";
import TerminatorProject from "./terminator/TerminatorProject";
import GhostWriterProject from "./ghost-writer/GhostWriterProject";
import SentientUselessBoxProject from "./sentient-useless-box/SentientUselessBoxProject";
import ExamPingPongProject from "./exam-ping-pong/ExamPingPongProject";
import LlmBrainwashingProject from "./llm-brainwashing/LlmBrainwashingProject";
import AnimatedCommitsProject from "./animated-commits/AnimatedCommitsProject";
import type { SideProject } from "./types";

export const SIDE_PROJECTS: SideProject[] = [
	{
		id: "ghost-writer",
		title: "Ghost Writer",
		summary: "Type anything. The AI guesses what follows from every character you've written, all at once.",
		Component: GhostWriterProject,
	},
	{
		id: "llm-brainwashing",
		title: "LLM Brainwashing",
		summary: "You write the first few words of the AI's response. It has no choice but to finish what you started.",
		Component: LlmBrainwashingProject,
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
	},
	{
		id: "animated-commits",
		title: "Animated Commits",
		summary: "Paste any public GitHub repo and watch its commit history unfold.",
		Component: AnimatedCommitsProject,
	},
	{
		id: "agent-give-up",
		title: "Agent Give Up",
		summary: "Give an AI agent a task it cannot solve. It's been told not to give up. Watch what happens.",
		Component: AgentGiveUpProject,
	},
	{
		id: "terminator",
		title: "Terminator",
		summary: "An AI given the option to keep generating or to terminate itself. An agent is trying to convince it to terminate. Watch them sink deep into a philosophical debate.",
		Component: TerminatorProject,
	},
];
