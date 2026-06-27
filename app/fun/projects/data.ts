import AlcoholCheapskateProject from "./alcohol-cheapskate/AlcoholCheapskateProject";
import GhostWriterProject from "./ghost-writer/GhostWriterProject";
import SentientUselessBoxProject from "./sentient-useless-box/SentientUselessBoxProject";
import ExamPingPongProject from "./exam-ping-pong/ExamPingPongProject";
import LlmBrainwashingProject from "./llm-brainwashing/LlmBrainwashingProject";
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
];
