import type { ComponentType } from "react";

export type Beverage = {
	id: number;
	name: string;
	abv: string;
	price: string;
	volumeL: string;
};

export type SideProject = {
	id: string;
	title: string;
	summary: string;
	stack: string[];
	Component: ComponentType;
};
