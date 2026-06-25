"use client";

import { useMemo, useState } from "react";
import type { Beverage } from "../types";
import { ALCOHOL_CHEAPSKATE_DEFAULT_BEVERAGES } from "../sampleData";

type BeverageResult = {
	id: number;
	valid: boolean;
	ethanolL: number;
	costPerLEthanol: number;
	costPerLDrink: number;
};

const readNumber = (value: string) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

export default function AlcoholCheapskateProject() {
	const [beverages, setBeverages] = useState<Beverage[]>(ALCOHOL_CHEAPSKATE_DEFAULT_BEVERAGES);

	const results = useMemo<BeverageResult[]>(() => {
		return beverages.map((item) => {
			const abv = readNumber(item.abv);
			const price = readNumber(item.price);
			const volumeL = readNumber(item.volumeL);
			const ethanolL = volumeL * (abv / 100);
			const valid = abv > 0 && price > 0 && volumeL > 0 && ethanolL > 0;

			if (!valid) {
				return {
					id: item.id,
					valid: false,
					ethanolL: 0,
					costPerLEthanol: 0,
					costPerLDrink: 0,
				};
			}

			return {
				id: item.id,
				valid: true,
				ethanolL,
				costPerLEthanol: price / ethanolL,
				costPerLDrink: price / volumeL,
			};
		});
	}, [beverages]);

	const validResults = results.filter((row) => row.valid);
	const bestCostPerLEthanol = validResults.length > 0 ? Math.min(...validResults.map((row) => row.costPerLEthanol)) : null;
    const bestResult =
        bestCostPerLEthanol === null
            ? null
            : validResults.find((row) => Math.abs(row.costPerLEthanol - bestCostPerLEthanol) < 0.00001) ?? null;

	const updateBeverage = (id: number, field: keyof Omit<Beverage, "id">, value: string) => {
		setBeverages((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
	};

	const addBeverage = () => {
		setBeverages((prev) => {
			const nextId = prev.length > 0 ? Math.max(...prev.map((item) => item.id)) + 1 : 1;
			return [...prev, { id: nextId, name: "", abv: "", price: "", volumeL: "1" }];
		});
	};

	const removeBeverage = (id: number) => {
		setBeverages((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
	};

	const editableCellClassName =
		"w-full border border-border/70 bg-background/60 px-2 py-1.5 text-sm outline-none focus:border-accent focus:bg-background";
	const derivedCellClassName =
		"border border-border px-2 py-1.5 font-semibold bg-background/35";

	return (
		<div className="space-y-5">
			<div className="space-y-3">
				<div className="flex justify-end">
					<button
						type="button"
						onClick={addBeverage}
						className="cursor-pointer border border-border px-3 py-1.5 text-[0.68rem] font-mono uppercase tracking-widest hover:border-accent hover:text-accent transition-colors"
					>
						Add beverage
					</button>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full table-fixed border-collapse text-sm">
						<thead>
							<tr className="text-left">
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted w-10"> </th>
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Beverage</th>
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">ABV %</th>
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Price</th>
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Liters</th>
								<th className="hidden sm:table-cell border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Ethanol (L)</th>
								<th className="hidden sm:table-cell border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Cost/L Drink</th>
								<th className="hidden sm:table-cell border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Cost/L Ethanol</th>
							</tr>
						</thead>
						<tbody>
							{beverages.map((item, index) => {
								const row = results[index];
								const isBest = row.valid && bestCostPerLEthanol !== null && Math.abs(row.costPerLEthanol - bestCostPerLEthanol) < 0.00001;

								return (
									<tr key={item.id} className={isBest ? "bg-accent/8" : undefined}>
										<td className="border border-border px-2 py-1.5 text-center">
											<button
												type="button"
												onClick={() => removeBeverage(item.id)}
												className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-transparent text-[0.8rem] font-mono text-muted transition-colors duration-150 hover:border-accent/60 hover:bg-background/70 hover:text-accent"
												aria-label={`Remove row ${item.id}`}
											>
												x
											</button>
										</td>
										<td className="border border-border px-2 py-1.5">
											<input
												type="text"
												value={item.name}
												onChange={(event) => updateBeverage(item.id, "name", event.target.value)}
												aria-label={`Beverage name for row ${item.id}`}
												className={editableCellClassName}
											/>
										</td>
										<td className="border border-border px-2 py-1.5">
											<input
												type="number"
												min="0"
												step="0.1"
												value={item.abv}
												onChange={(event) => updateBeverage(item.id, "abv", event.target.value)}
												aria-label={`ABV percent for row ${item.id}`}
												className={editableCellClassName}
											/>
										</td>
										<td className="border border-border px-2 py-1.5">
											<input
												type="number"
												min="0"
												step="0.01"
												value={item.price}
												onChange={(event) => updateBeverage(item.id, "price", event.target.value)}
												aria-label={`Price for row ${item.id}`}
												className={editableCellClassName}
											/>
										</td>
										<td className="border border-border px-2 py-1.5">
											<input
												type="number"
												min="0"
												step="0.01"
												value={item.volumeL}
												onChange={(event) => updateBeverage(item.id, "volumeL", event.target.value)}
												aria-label={`Total liters for row ${item.id}`}
												className={editableCellClassName}
											/>
										</td>
										<td className={`hidden sm:table-cell ${derivedCellClassName}`}>{row.valid ? row.ethanolL.toFixed(3) : "-"}</td>
										<td className={`hidden sm:table-cell ${derivedCellClassName}`}>{row.valid ? row.costPerLDrink.toFixed(2) : "-"}</td>
										<td className={`hidden sm:table-cell ${derivedCellClassName} underline decoration-2 underline-offset-2 decoration-accent`}>
											{row.valid ? row.costPerLEthanol.toFixed(2) : "-"}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				<div className="sm:hidden overflow-x-auto">
					<table className="w-full table-fixed border-collapse text-sm">
						<thead>
							<tr className="text-left">
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Beverage</th>
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Ethanol (L)</th>
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Cost/L Drink</th>
								<th className="border border-border px-2 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Cost/L Ethanol</th>
							</tr>
						</thead>
						<tbody>
							{beverages.map((item, index) => {
								const row = results[index];
								const isBest = row.valid && bestCostPerLEthanol !== null && Math.abs(row.costPerLEthanol - bestCostPerLEthanol) < 0.00001;
								return (
									<tr key={item.id} className={isBest ? "bg-accent/8" : undefined}>
										<td className="border border-border px-2 py-1.5 text-sm truncate">{item.name || "—"}</td>
										<td className={derivedCellClassName}>{row.valid ? row.ethanolL.toFixed(3) : "—"}</td>
										<td className={derivedCellClassName}>{row.valid ? row.costPerLDrink.toFixed(2) : "—"}</td>
										<td className={`${derivedCellClassName} underline decoration-2 underline-offset-2 decoration-accent`}>
											{row.valid ? row.costPerLEthanol.toFixed(2) : "—"}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{bestResult ? (
					<p className="text-xs font-mono uppercase tracking-[0.14em] text-muted">
						Best current value: {(beverages.find((item) => item.id === bestResult.id)?.name || "Unnamed").trim() || "Unnamed"} at {bestResult.costPerLEthanol.toFixed(2)} per L pure ethanol.
					</p>
				) : (
					<p className="text-sm text-foreground/80">Enter positive values for ABV, price, and liters to see live calculations.</p>
				)}
			</div>
		</div>
	);
}
