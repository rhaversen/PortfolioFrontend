"use client";

import { useMemo, useState } from "react";
import { parseExamResults } from "./parser";
import { useExamSim } from "./useExamSim";
import ExamClockViz from "./ExamClockViz";
import ExamTimelineViz from "./ExamTimelineViz";
import ExamUpcomingList from "./ExamUpcomingList";
import { EXAM_PING_PONG_DEFAULT_INPUT } from "../sampleData";

export default function ExamPingPongProject() {
	const [rawInput, setRawInput] = useState(EXAM_PING_PONG_DEFAULT_INPUT);
	const parsed = useMemo(() => parseExamResults(rawInput), [rawInput]);
	const { nodes, byId, simRef, simStart, simEnd, reset } = useExamSim(parsed.records);

	return (
		<div className="space-y-5">
			{nodes.length > 0 && (
				<div className="space-y-3">
					<div className="flex gap-6 justify-center items-start overflow-x-auto">
						<ExamUpcomingList nodes={nodes} simRef={simRef} />
						<ExamClockViz nodes={nodes} byId={byId} simRef={simRef} simEnd={simEnd} reset={reset} />
					</div>
					<ExamTimelineViz nodes={nodes} simRef={simRef} simStart={simStart} simEnd={simEnd} />
					<div className="flex justify-center">
						<button
							onClick={reset}
							className="border border-border px-3 py-1 text-xs font-mono hover:bg-foreground/5 transition-colors"
						>
							↺  Reset
						</button>
					</div>
					<div className="flex items-center justify-center gap-5 text-[0.65rem] font-mono text-muted">
						<span className="flex items-center gap-1.5">
						<span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: "rgba(0,0,0,0.40)" }} />
							upcoming
						</span>
						<span className="flex items-center gap-1.5">
							<span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: "#4ade80" }} />
							passed
						</span>
						<span className="flex items-center gap-1.5">
							<span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: "#f87171" }} />
							failed → retry
						</span>
					</div>
				</div>
			)}

			<div className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<p className="text-[0.68rem] font-mono uppercase tracking-widest text-muted">
						{parsed.records.length} parsed / {parsed.skippedSegments} skipped
					</p>
				</div>

				<textarea
					value={rawInput}
					onChange={(event) => setRawInput(event.target.value)}
					placeholder="Paste exam results here..."
					className="w-full min-h-56 border border-border bg-transparent p-3 text-sm leading-relaxed"
				/>

				{parsed.records.length === 0 ? (
					<p className="text-sm text-foreground/80">No exam entries detected yet. Paste exam text above to parse.</p>
				) : (
					<div className="max-h-56 overflow-auto bg-background/40">
						<table className="w-full table-fixed border-collapse text-sm">
							<thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
								<tr className="text-left">
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted break-words">Course</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted break-words">Date</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted break-words">Grade</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted break-words">ECTS Grade</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted break-words">ECTS</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted break-words">Result</th>
								</tr>
							</thead>
							<tbody>
								{parsed.records.map((record, index) => (
									<tr key={`${record.courseName}-${record.date}-${index}`}>
										<td className="border border-border px-2 py-1.5 break-words">{record.courseName}</td>
										<td className="border border-border px-2 py-1.5 break-words">{record.date}</td>
										<td className="border border-border px-2 py-1.5 break-words">{record.grade}</td>
										<td className="border border-border px-2 py-1.5 break-words">{record.ectsGrade ?? "-"}</td>
										<td className="border border-border px-2 py-1.5 break-words">{record.ects.toFixed(1)}</td>
										<td className="border border-border px-2 py-1.5 break-words">{record.passed ? "Passed" : "Failed"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<p className="text-xs text-foreground/75">
					Tip: You can copy the full results page text directly from STADS. Parsing is designed to be robust even when the pasted text is noisy.
				</p>
			</div>
		</div>
	);
}
