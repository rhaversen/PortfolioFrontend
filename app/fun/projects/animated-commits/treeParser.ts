export type TreeNode = {
	id: string;
	name: string;
	path: string;
	isDir: boolean;
	size: number;
	children: TreeNode[];
};

export type FetchTreeResult =
	| { ok: true; root: TreeNode; truncated: boolean; totalNodes: number }
	| { ok: false; error: string };

interface GithubTreeItem {
	path: string;
	type: "blob" | "tree";
	size?: number;
	sha?: string;
}

interface GithubTreeResponse {
	tree: GithubTreeItem[];
	truncated: boolean;
}

export async function fetchRepoTree(owner: string, repo: string): Promise<FetchTreeResult> {
	const headers = { Accept: "application/vnd.github+json" };

	let defaultBranch: string;
	try {
		const res = await fetch(
			`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
			{ headers },
		);
		if (res.status === 404) return { ok: false, error: `Repository "${owner}/${repo}" not found.` };
		if (res.status === 403 || res.status === 429) return rateLimitError(res);
		if (!res.ok) return { ok: false, error: `GitHub API error: ${res.status}` };
		const data = (await res.json()) as { default_branch: string };
		defaultBranch = data.default_branch ?? "main";
	} catch {
		return { ok: false, error: "Network error fetching repository info." };
	}

	let treeData: GithubTreeResponse;
	try {
		const res = await fetch(
			`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${defaultBranch}?recursive=1`,
			{ headers },
		);
		if (res.status === 403 || res.status === 429) return rateLimitError(res);
		if (!res.ok) return { ok: false, error: `GitHub API error: ${res.status}` };
		treeData = (await res.json()) as GithubTreeResponse;
	} catch {
		return { ok: false, error: "Network error fetching file tree." };
	}

	if (!Array.isArray(treeData.tree)) {
		return { ok: false, error: "Unexpected response format from GitHub API." };
	}

	let sourceTruncated = Boolean(treeData.truncated);
	let items = treeData.tree;

	if (treeData.truncated) {
		const rebuilt = await rebuildFromTopLevelSubtrees(owner, repo, defaultBranch);
		if (rebuilt.ok) {
			items = rebuilt.items;
			sourceTruncated = rebuilt.truncated;
		}
	}

	const root = buildTree(repo, items);
	const totalNodes = countNodes(root);

	return {
		ok: true,
		root,
		truncated: sourceTruncated,
		totalNodes,
	};
}

async function rebuildFromTopLevelSubtrees(
	owner: string,
	repo: string,
	defaultBranch: string,
): Promise<{ ok: true; items: GithubTreeItem[]; truncated: boolean } | { ok: false }> {
	const headers = { Accept: "application/vnd.github+json" };

	let rootTree: GithubTreeResponse;
	try {
		const rootRes = await fetch(
			`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${defaultBranch}`,
			{ headers },
		);
		if (!rootRes.ok) return { ok: false };
		rootTree = (await rootRes.json()) as GithubTreeResponse;
	} catch {
		return { ok: false };
	}

	if (!Array.isArray(rootTree.tree)) return { ok: false };

	const merged = new Map<string, GithubTreeItem>();
	let truncated = Boolean(rootTree.truncated);

	for (const item of rootTree.tree) {
		merged.set(item.path, item);
		if (item.type !== "tree" || !item.sha) continue;

		try {
			const subRes = await fetch(
				`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${item.sha}?recursive=1`,
				{ headers },
			);
			if (!subRes.ok) continue;
			const subTree = (await subRes.json()) as GithubTreeResponse;
			if (!Array.isArray(subTree.tree)) continue;
			truncated = truncated || Boolean(subTree.truncated);
			for (const child of subTree.tree) {
				const path = `${item.path}/${child.path}`;
				merged.set(path, { ...child, path });
			}
		} catch {
			continue;
		}
	}

	return { ok: true, items: [...merged.values()], truncated };
}

function rateLimitError(res: Response): { ok: false; error: string } {
	const reset = res.headers.get("x-ratelimit-reset");
	const resetTime = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : null;
	return {
		ok: false,
		error: resetTime ? `Rate limit reached. Resets at ${resetTime}.` : "Rate limit reached. Try again later.",
	};
}

function buildTree(repoName: string, items: GithubTreeItem[]): TreeNode {
	const root: TreeNode = { id: "", name: repoName, path: "", isDir: true, size: 0, children: [] };
	const nodeMap = new Map<string, TreeNode>();
	nodeMap.set("", root);

	const sorted = [...items].sort((a, b) => a.path.localeCompare(b.path));

	for (const item of sorted) {
		const parts = item.path.split("/");
		const name = parts[parts.length - 1];

		// Ensure all ancestor directories exist
		let current = root;
		let currentPath = "";
		for (const part of parts.slice(0, -1)) {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			if (!nodeMap.has(currentPath)) {
				const dir: TreeNode = { id: currentPath, name: part, path: currentPath, isDir: true, size: 0, children: [] };
				nodeMap.set(currentPath, dir);
				current.children.push(dir);
			}
			current = nodeMap.get(currentPath)!;
		}

		if (!nodeMap.has(item.path)) {
			const node: TreeNode = {
				id: item.path,
				name,
				path: item.path,
				isDir: item.type === "tree",
				size: item.size ?? 0,
				children: [],
			};
			nodeMap.set(item.path, node);
			current.children.push(node);
		}
	}

	calcSize(root);
	return root;
}

function calcSize(node: TreeNode): number {
	if (!node.isDir) return node.size;
	node.size = node.children.reduce((sum, c) => sum + calcSize(c), 0);
	return node.size;
}

export function countNodes(node: TreeNode): number {
	return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}
