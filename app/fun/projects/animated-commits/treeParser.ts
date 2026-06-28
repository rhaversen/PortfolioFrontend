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

const MAX_VIZ_NODES = 1200;

interface GithubTreeItem {
	path: string;
	type: "blob" | "tree";
	size?: number;
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

	const root = buildTree(repo, treeData.tree);
	const totalNodes = countNodes(root);

	if (totalNodes > MAX_VIZ_NODES) {
		pruneToLimit(root, MAX_VIZ_NODES);
	}

	return {
		ok: true,
		root,
		truncated: treeData.truncated || totalNodes > MAX_VIZ_NODES,
		totalNodes,
	};
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

function pruneToLimit(root: TreeNode, max: number): void {
	// BFS order: collect all nodes breadth-first, keep first `max`
	const queue: Array<{ node: TreeNode; parent: TreeNode | null }> = [{ node: root, parent: null }];
	const inOrder: TreeNode[] = [];

	while (queue.length > 0) {
		const { node } = queue.shift()!;
		inOrder.push(node);
		for (const child of node.children) {
			queue.push({ node: child, parent: node });
		}
	}

	const keepSet = new Set<TreeNode>(inOrder.slice(0, max));

	const prune = (node: TreeNode) => {
		node.children = node.children.filter((c) => keepSet.has(c));
		for (const c of node.children) prune(c);
	};
	prune(root);
}
