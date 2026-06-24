"use client";

import { useMemo, useState } from "react";
import { parseExamResults } from "./parser";
import { useExamSim } from "./useExamSim";
import ExamClockViz from "./ExamClockViz";
import ExamTimelineViz from "./ExamTimelineViz";

const SAMPLE_INPUT = `Machine Learning\t29.05.2026\t02\tE\t10.0
Machine Learning\t29.01.2026\t-3\tF\t10.0
Introduktion til sandsynlighed\t16.01.2026\t10\tB\t10.0
Optimering\t15.08.2025\t00\tFx\t10.0
Optimering\t28.06.2025\t-3\tF\t10.0
Bachelorprojekt i datalogi\t26.06.2025\t7\tC\t15.0
Videnskabsteori: Dat og it-pro\t10.04.2025\t10\tB\t5.0
Machine Learning\t27.01.2025\tU\t\t10.0
Distribuerede systemer og sikk\t16.01.2025\t4\tD\t10.0
Oversættelse\t13.01.2025\t02\tE\t10.0
Numerisk lineær algebra\t05.09.2024\t00\tFx\t10.0
Computerarkitektur, netværk og\t12.07.2024\t7\tC\t10.0
Introduktion til sandsynlighed\t27.06.2024\t00\tFx\t10.0
Numerisk lineær algebra\t20.06.2024\t00\tFx\t10.0
Eksperimentel systemudvikling\t14.06.2024\t4\tD\t10.0
Human-Computer Interaction\t07.06.2024\t7\tC\t10.0
Human-Computer Interaction\t24.01.2024\tU\t\t10.0
Introduktion til sandsynlighed\t22.01.2024\t00\tFx\t10.0
Softwarekonstruktion og softwa\t02.01.2024\t7\tC\t10.0
Implementering og anvendelser\t04.09.2023\t02\tE\t5.0
Implementering og anvendelser\t27.07.2023\t00\tFx\t5.0
Introduktion til matematik og\t19.06.2023\t4\tD\t10.0
Beregnelighed og logik\t17.06.2023\t02\tE\t10.0
Programmeringssprog\t12.06.2023\t4\tD\t10.0
Databasesystemer\t14.04.2023\t7\tC\t5.0
Introduktion til matematik og\t23.02.2023\t00\tFx\t10.0
Algoritmer og datastrukturer\t10.01.2023\t7\tC\t10.0
Introduktion til programmering\t21.12.2022\t12\tA\t10.0`;

export default function ExamPingPongProject() {
	const [rawInput, setRawInput] = useState(SAMPLE_INPUT);
	const parsed = useMemo(() => parseExamResults(rawInput), [rawInput]);
	const { nodes, byId, simRef, simStart, simEnd, reset } = useExamSim(parsed.records);

	return (
		<div className="space-y-5">
			{nodes.length > 0 && (
				<div className="space-y-3">
					<div className="flex justify-center overflow-x-auto">
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
							<span className="inline-block w-2 h-2 rounded-full bg-white/45 shrink-0" />
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
					<div className="max-h-56 overflow-auto bg-background/40 space-y-3">
						<table className="w-full table-fixed border-collapse text-sm">
							<thead>
								<tr className="text-left">
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Course</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Date</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Grade</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">ECTS Grade</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">ECTS</th>
									<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Result</th>
								</tr>
							</thead>
							<tbody>
								{parsed.records.map((record, index) => (
									<tr key={`${record.courseName}-${record.date}-${index}`}>
										<td className="border border-border px-2 py-1.5">{record.courseName}</td>
										<td className="border border-border px-2 py-1.5">{record.date}</td>
										<td className="border border-border px-2 py-1.5">{record.grade}</td>
										<td className="border border-border px-2 py-1.5">{record.ectsGrade ?? "-"}</td>
										<td className="border border-border px-2 py-1.5">{record.ects.toFixed(1)}</td>
										<td className="border border-border px-2 py-1.5">{record.passed ? "Passed" : "Failed"}</td>
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
