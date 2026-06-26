"use client";

import { useMemo, useState } from "react";
import { parseExamResults } from "./parser";
import { useExamSim } from "./useExamSim";
import ExamClockViz from "./ExamClockViz";
import ExamGpaViz from "./ExamGpaViz";
import ExamTimelineViz from "./ExamTimelineViz";
import ExamUpcomingList from "./ExamUpcomingList";
import { EXAM_PING_PONG_DEFAULT_INPUT } from "../sampleData";

export default function ExamPingPongProject() {
	const [rawInput, setRawInput] = useState(EXAM_PING_PONG_DEFAULT_INPUT);
	const parsed = useMemo(() => parseExamResults(rawInput), [rawInput]);
	const { nodes, byId, simRef, simStart, simEnd, reset } = useExamSim(parsed.records);

	const handlePaste = async () => {
		const text = await navigator.clipboard.readText();
		setRawInput(text);
	};

	return (
		<div className="space-y-5">
			{nodes.length > 0 && (
				<div className="flex flex-col sm:flex-row gap-6 justify-center items-start w-full min-w-0">
					<div className="order-2 sm:order-1 shrink-0">
						<ExamUpcomingList nodes={nodes} simRef={simRef} />
					</div>
					<div className="order-1 sm:order-2 flex flex-col gap-3 min-w-0 w-full sm:w-auto">
						<div className="relative">
							<ExamClockViz nodes={nodes} byId={byId} simRef={simRef} simEnd={simEnd} reset={reset} />
							<button
								onClick={reset}
								className="absolute top-0 right-0 border border-border px-3 py-1 text-xs font-mono hover:bg-foreground/5 transition-colors bg-background/80"
							>
								↺ Reset
							</button>
						</div>
						<ExamTimelineViz nodes={nodes} simRef={simRef} simStart={simStart} simEnd={simEnd} />
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
						<ExamGpaViz nodes={nodes} simRef={simRef} simStart={simStart} simEnd={simEnd} />
					</div>
				</div>
			)}

			<div className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<p className="text-[0.68rem] font-mono uppercase tracking-widest text-muted">
						{parsed.records.length} parsed / {parsed.skippedSegments} skipped
					</p>
					<button
						type="button"
						onClick={handlePaste}
						className="border border-border px-3 py-1 text-[0.65rem] font-mono uppercase tracking-widest text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
					>
						Paste
					</button>
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
							<colgroup>
								<col width="50" />
								<col width="40" />
								<col width="15" />
								<col width="15" />
								<col width="20" />
								<col width="20" />
							</colgroup>
							<thead className="sticky -top-px z-10 bg-background/95 backdrop-blur-sm">
								<tr className="text-left">
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Course</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Date</th>
									<th colSpan={2} className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Grade</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">ECTS</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Pass</th>
								</tr>
							</thead>
							<tbody>
								{parsed.records.map((record, index) => (
									<tr key={`${record.courseName}-${record.date}-${index}`}>
										<td className="border border-border px-2 py-1.5 truncate">{record.courseName}</td>
										<td className="border border-border px-2 py-1.5 truncate">{record.date}</td>
										<td className="border border-border px-2 py-1.5 truncate">{record.grade}</td>
										<td className="border border-border px-2 py-1.5 truncate">{record.ectsGrade ?? "-"}</td>
										<td className="border border-border px-2 py-1.5 truncate">{record.ects.toFixed(1)}</td>
										<td className="border border-border px-2 py-1.5 text-center">
											{record.passed
												? <span className="text-green-500">✓</span>
												: <span className="text-red-400">✗</span>}
										</td>
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