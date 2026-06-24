import type { ComponentType } from "react";

export type SideProject = {
	id: string;
	title: string;
	summary: string;
	stack: string[];
	Component: ComponentType;
};
