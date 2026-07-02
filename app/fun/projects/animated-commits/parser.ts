export type GitCommit = {
	sha: string;
	shortSha: string;
	author: string;
	email: string;
	date: Date;
	message: string;
	messageBody: string;
};

export type ParseRepoResult =
	| { ok: true; owner: string; repo: string }
	| { ok: false; error: string };

export type FetchCommitsResult =
	| { ok: true; commits: GitCommit[]; page: number; hasMore: boolean }
	| { ok: false; error: string };

export function parseRepoUrl(input: string): ParseRepoResult {
	const trimmed = input.trim().replace(/\.git$/, "");

	const githubPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/?\s]+)/;
	const match = trimmed.match(githubPattern);
	if (match) {
		return { ok: true, owner: match[1], repo: match[2] };
	}

	const shortPattern = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;
	const shortMatch = trimmed.match(shortPattern);
	if (shortMatch) {
		return { ok: true, owner: shortMatch[1], repo: shortMatch[2] };
	}

	return { ok: false, error: "Enter a GitHub URL (e.g. https://github.com/torvalds/linux) or owner/repo." };
}

interface GithubCommitAuthor {
	name: string;
	email: string;
	date: string;
}

interface GithubCommit {
	sha: string;
	commit: {
		author: GithubCommitAuthor;
		message: string;
	};
}

export async function fetchCommits(
	owner: string,
	repo: string,
	page: number,
	perPage = 50,
): Promise<FetchCommitsResult> {
	const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${perPage}&page=${page}`;

	let response: Response;
	try {
		response = await fetch(url, {
			headers: { Accept: "application/vnd.github+json" },
		});
	} catch {
		return { ok: false, error: "Network error — check your connection." };
	}

	if (response.status === 404) {
		return { ok: false, error: `Repository "${owner}/${repo}" not found or is private.` };
	}
	if (response.status === 403 || response.status === 429) {
		const reset = response.headers.get("x-ratelimit-reset");
		const resetTime = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : null;
		return {
			ok: false,
			error: resetTime
				? `GitHub rate limit reached. Resets at ${resetTime}.`
				: "GitHub rate limit reached. Try again later.",
		};
	}
	if (!response.ok) {
		return { ok: false, error: `GitHub API error: ${response.status} ${response.statusText}` };
	}

	let data: GithubCommit[];
	try {
		data = await response.json() as GithubCommit[];
	} catch {
		return { ok: false, error: "Failed to parse GitHub API response." };
	}

	if (!Array.isArray(data)) {
		return { ok: false, error: "Unexpected response format from GitHub API." };
	}

	const commits: GitCommit[] = data.map((item) => {
		const fullMessage = item.commit.message ?? "";
		const newlineIndex = fullMessage.indexOf("\n");
		const message = newlineIndex === -1 ? fullMessage : fullMessage.slice(0, newlineIndex);
		const messageBody = newlineIndex === -1 ? "" : fullMessage.slice(newlineIndex + 1).trim();

		return {
			sha: item.sha,
			shortSha: item.sha.slice(0, 7),
			author: item.commit.author?.name ?? "Unknown",
			email: item.commit.author?.email ?? "",
			date: new Date(item.commit.author?.date ?? 0),
			message,
			messageBody,
		};
	});

	return { ok: true, commits, page, hasMore: data.length === perPage };
}
