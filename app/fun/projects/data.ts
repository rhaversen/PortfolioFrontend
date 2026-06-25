import AlcoholCheapskateProject from "./alcohol-cheapskate/AlcoholCheapskateProject";
import SentientUselessBoxProject from "./sentient-useless-box/SentientUselessBoxProject";
import ExamPingPongProject from "./exam-ping-pong/ExamPingPongProject";
import LlmBrainwashingProject from "./llm-brainwashing/LlmBrainwashingProject";
import type { SideProject } from "./types";

export const SIDE_PROJECTS: SideProject[] = [
	{
		id: "llm-brainwashing",
		title: "LLM Brainwashing",
		summary: "Force assistant-style continuation from user-written text.",
		stack: ["LLM Prompting", "Streaming", "UX Experiments"],
		Component: LlmBrainwashingProject,
	},
	{
		id: "alcohol-cheapskate",
		title: "Alcohol Cheapskate",
		summary: "Compare alcohol options by proof and cost with quick min and max filtering.",
		stack: ["Filters", "Math", "Decision UI"],
		Component: AlcoholCheapskateProject,
	},
	{
		id: "exam-ping-pong",
		title: "Exam Ping-Pong",
		summary: "An exam is a position in a cycle. Failed attempts get rescheduled. The system just keeps sweeping forward, and every subject eventually resolves.",
		stack: ["Timeline", "Data Viz", "Education"],
		Component: ExamPingPongProject,
	},
	{
		id: "sentient-useless-box",
		title: "Sentient Useless Box",
		summary: "A useless box — but the AI inside has opinions about what you're doing.",
		stack: ["Tool Loop", "Reasoning Trace", "Agents"],
		Component: SentientUselessBoxProject,
	},
];
