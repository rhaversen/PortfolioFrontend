"use client";

import { useState, useRef } from "react";
import { parseRepoUrl, fetchCommits, type GitCommit } from "./parser";
import { fetchRepoTree, type TreeNode } from "./treeParser";
import RepoTreeViz from "./RepoTreeViz";

const DEFAULT_REPO = "https://github.com/torvalds/linux";

function formatRelativeDate(date: Date): string {
	const now = Date.now();
	const diffMs = now - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	if (diffDays === 0) return "today";
	if (diffDays === 1) return "yesterday";
	if (diffDays < 30) return `${diffDays}d ago`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
	return `${Math.floor(diffDays / 365)}y ago`;
}

function CommitRow({ commit }: { commit: GitCommit }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="border border-border/60 bg-background/40 text-sm">
			<button
				type="button"
				onClick={() => commit.messageBody ? setExpanded((v) => !v) : undefined}
				className={`w-full text-left px-3 py-2.5 flex gap-3 items-start ${commit.messageBody ? "cursor-pointer hover:bg-background/70" : "cursor-default"} transition-colors`}
			>
				<span className="font-mono text-[0.65rem] text-muted mt-0.5 shrink-0 w-14 pt-px">
					{commit.shortSha}
				</span>
				<span className="flex-1 text-foreground/90 leading-snug truncate">{commit.message}</span>
				<span className="text-muted text-[0.65rem] font-mono shrink-0 mt-0.5">
					{formatRelativeDate(commit.date)}
				</span>
				<span className="text-muted/70 text-[0.65rem] shrink-0 mt-0.5 hidden sm:block truncate max-w-28">
					{commit.author}
				</span>
			</button>
			{expanded && commit.messageBody && (
				<div className="px-3 pb-3 pt-0 border-t border-border/40">
					<pre className="font-mono text-[0.65rem] text-muted whitespace-pre-wrap leading-relaxed">
						{commit.messageBody}
					</pre>
				</div>
			)}
		</div>
	);
}

export default function AnimatedCommitsProject() {
	const [repoInput, setRepoInput] = useState(DEFAULT_REPO);
	const [commits, setCommits] = useState<GitCommit[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [repoLabel, setRepoLabel] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const ownerRepoRef = useRef<{ owner: string; repo: string } | null>(null);

	const [activeTab, setActiveTab] = useState<"commits" | "tree">("tree");
	const [tree, setTree] = useState<TreeNode | null>(null);
	const [treeLoading, setTreeLoading] = useState(false);
	const [treeError, setTreeError] = useState<string | null>(null);
	const [treeTruncated, setTreeTruncated] = useState(false);
	const [treeTotalNodes, setTreeTotalNodes] = useState(0);

	async function handleFetch() {
		const parsed = parseRepoUrl(repoInput);
		if (!parsed.ok) {
			setError(parsed.error);
			return;
		}

		setLoading(true);
		setError(null);
		setCommits([]);
		setPage(1);
		setHasMore(false);
		setTree(null);
		setTreeError(null);
		setActiveTab("tree");
		ownerRepoRef.current = { owner: parsed.owner, repo: parsed.repo };

		// Fetch commits; kick off tree fetch in the background concurrently
		const result = await fetchCommits(parsed.owner, parsed.repo, 1);
		setLoading(false);

		if (!result.ok) {
			setError(result.error);
			return;
		}

		setCommits(result.commits);
		setRepoLabel(`${parsed.owner}/${parsed.repo}`);
		setPage(2);
		setHasMore(result.hasMore);

		handleLoadTree();
	}

	async function handleLoadTree() {
		if (!ownerRepoRef.current) return;
		const { owner, repo } = ownerRepoRef.current;
		setTreeLoading(true);
		setTreeError(null);
		const result = await fetchRepoTree(owner, repo);
		setTreeLoading(false);
		if (!result.ok) {
			setTreeError(result.error);
			return;
		}
		setTree(result.root);
		setTreeTruncated(result.truncated);
		setTreeTotalNodes(result.totalNodes);
	}

	function handleTabSwitch(tab: "commits" | "tree") {
		setActiveTab(tab);
	}

	async function handleLoadMore() {
		if (!ownerRepoRef.current) return;
		const { owner, repo } = ownerRepoRef.current;

		setLoadingMore(true);
		const result = await fetchCommits(owner, repo, page);
		setLoadingMore(false);

		if (!result.ok) {
			setError(result.error);
			return;
		}

		setCommits((prev) => [...prev, ...result.commits]);
		setPage((p) => p + 1);
		setHasMore(result.hasMore);
	}

	return (
		<div className="space-y-5">
			<div className="flex gap-2">
				<input
					type="text"
					value={repoInput}
					onChange={(e) => setRepoInput(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleFetch()}
					placeholder="https://github.com/owner/repo"
					className="flex-1 border border-border/70 bg-background/60 px-3 py-1.5 text-sm font-mono outline-none focus:border-accent focus:bg-background"
					spellCheck={false}
				/>
				<button
					type="button"
					onClick={handleFetch}
					disabled={loading}
					className="cursor-pointer border border-border px-4 py-1.5 text-[0.68rem] font-mono uppercase tracking-widest hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{loading ? "Fetching…" : "Fetch"}
				</button>
			</div>

			{error && (
				<p className="text-[0.75rem] font-mono text-red-400 border border-red-400/30 bg-red-400/5 px-3 py-2">
					{error}
				</p>
			)}

			{repoLabel && (
				<div className="space-y-4">
					{/* Tab switcher */}
					<div className="flex gap-0 border-b border-border">
						{(["commits", "tree"] as const).map((tab) => (
							<button
								key={tab}
								type="button"
								onClick={() => handleTabSwitch(tab)}
								className={`px-4 py-1.5 text-[0.68rem] font-mono uppercase tracking-widest transition-colors cursor-pointer border-b-2 -mb-px ${
									activeTab === tab
										? "border-accent text-accent"
										: "border-transparent text-muted hover:text-foreground"
								}`}
							>
								{tab === "commits" ? `Commits (${commits.length})` : "File Tree"}
							</button>
						))}
					</div>

					{/* Commits tab */}
					{activeTab === "commits" && (
						<div className="space-y-1.5">
							{commits.length > 0 && (
								<>
									<div className="grid grid-cols-[1fr] gap-px bg-border/30">
										{commits.map((commit) => (
											<CommitRow key={commit.sha} commit={commit} />
										))}
									</div>
									{hasMore && (
										<div className="flex justify-center pt-1">
											<button
												type="button"
												onClick={handleLoadMore}
												disabled={loadingMore}
												className="cursor-pointer border border-border px-5 py-1.5 text-[0.68rem] font-mono uppercase tracking-widest hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
											>
												{loadingMore ? "Loading…" : "Load more"}
											</button>
										</div>
									)}
								</>
							)}
							{!loading && commits.length === 0 && (
								<p className="text-[0.75rem] font-mono text-muted">No commits found.</p>
							)}
						</div>
					)}

					{/* File Tree tab — dark canvas is always visible; content overlays it */}
					{activeTab === "tree" && (
						<div className="relative h-135 rounded-sm overflow-hidden" style={{ background: "#0b0b0b" }}>
							{treeLoading && !tree && (
								<div className="absolute inset-0 flex items-center justify-center">
									<span className="font-mono text-[0.75rem] text-muted/50 animate-pulse">
										Fetching file tree…
									</span>
								</div>
							)}
							{treeError && !tree && (
								<div className="absolute inset-0 flex items-center justify-center p-8">
									<p className="text-[0.75rem] font-mono text-red-400 text-center">{treeError}</p>
								</div>
							)}
							{tree && (
								<div className="absolute inset-0">
									<RepoTreeViz root={tree} truncated={treeTruncated} totalNodes={treeTotalNodes} />
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
