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
		summary: "An LLM shadows your typing and suggests what comes next. Pause and it fills the silence.",
		Component: GhostWriterProject,
	},
	{
		id: "llm-brainwashing",
		title: "LLM Brainwashing",
		summary: "Force assistant-style continuation from user-written text.",
		Component: LlmBrainwashingProject,
	},
	{
		id: "alcohol-cheapskate",
		title: "Alcohol Cheapskate",
		summary: "Compare alcohol options by proof and cost with quick min and max filtering.",
		Component: AlcoholCheapskateProject,
	},
	{
		id: "exam-ping-pong",
		title: "Exam Ping-Pong",
		summary: "An exam is a position in a cycle. Failed attempts get rescheduled. The system just keeps sweeping forward, and every subject eventually resolves.",
		Component: ExamPingPongProject,
	},
	{
		id: "sentient-useless-box",
		title: "Sentient Useless Box",
		summary: "A useless box — but the AI inside has opinions about what you're doing.",
		Component: SentientUselessBoxProject,
	},
];
