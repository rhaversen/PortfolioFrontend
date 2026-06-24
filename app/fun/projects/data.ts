import AlcoholCheapskateProject from "./alcohol-cheapskate/AlcoholCheapskateProject";
import ExamPingPongProject from "./exam-ping-pong/ExamPingPongProject";
import type { SideProject } from "./types";

export const SIDE_PROJECTS: SideProject[] = [
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
		summary: "Year-circle exam timeline where passed exams stick and failed exams bounce to the next attempt.",
		stack: ["Timeline", "Data Viz", "Education"],
		Component: ExamPingPongProject,
	}
];
