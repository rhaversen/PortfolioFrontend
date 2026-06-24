import AlcoholCheapskateProject from "./alcohol-cheapskate/AlcoholCheapskateProject";
import type { SideProject } from "./types";

export const SIDE_PROJECTS: SideProject[] = [
	{
		id: "alcohol-cheapskate",
		title: "Alcohol Cheapskate",
		summary: "Compare alcohol options by proof and cost with quick min and max filtering.",
		stack: ["Filters", "Math", "Decision UI"],
		Component: AlcoholCheapskateProject,
	}
];
