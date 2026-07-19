"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { countNodes, type TreeNode } from "./treeParser";

// ---- Simulation constants ----
const SPRING_K   = 0.010;   // edge spring constant
const REPULSION  = 2800;    // node-node repulsion
const DAMPING    = 0.88;    // velocity damping per step
const CENTER_K   = 0.00022; // weak gravity toward origin
const GRID_CELL  = 160;     // spatial hash cell size
const SIM_STEPS  = 3;       // physics steps per rendered frame
const MIN_ZOOM   = 80;
const MAX_ZOOM   = 6000;
const ZOOM_SPEED = 0.0012;

// ---- Rendering constants ----
const BG_COLOR = 0x0b0b0b;
const DIR_COLOR = 0xd8d8d8;
const ROOT_COLOR = 0xffffff;
const EDGE_COLOR = 0x2e2e2e;

// ---- Extension → color map ----
const EXT_COLORS: Record<string, number> = {
	c: 0x5599ff, h: 0x77aaff, cpp: 0x5577dd, cc: 0x5577dd, hpp: 0x6688ee, cxx: 0x5577dd,
	js: 0xffcc33, mjs: 0xffcc33, cjs: 0xffcc33, jsx: 0xffbb44,
	ts: 0x3388ff, tsx: 0x44aaff,
	py: 0x44bbee, rb: 0xff5555, go: 0x44ddcc, rs: 0xff7733,
	java: 0xff8844, kt: 0xaa44ff, swift: 0xff7744, cs: 0x6677ff,
	html: 0xff7733, css: 0x4455ff, scss: 0xcc44ff, less: 0xbb33ff,
	json: 0xffaa44, yaml: 0xffbb33, yml: 0xffbb33, toml: 0xffaa33, xml: 0xffcc44,
	md: 0x888888, txt: 0x666666, rst: 0x777777,
	sh: 0x44ee88, bash: 0x44ee88, zsh: 0x44ee88, fish: 0x33dd77, ps1: 0x6688ff,
	Makefile: 0xee5533, makefile: 0xee5533, cmake: 0xdd4422,
	Dockerfile: 0x44aaff, dockerfile: 0x44aaff,
	svg: 0xff9955, png: 0xffaa55, jpg: 0xffbb55, gif: 0xffcc55,
};

// ---- Types ----
type SimNode = {
	x: number; y: number;
	vx: number; vy: number;
	radius: number;
	collisionRadius: number;
	mass: number;
	r: number; g: number; b: number;
	fixed: boolean;
	isDir: boolean;
	parentNodeIdx: number;
	localX: number;
	localY: number;
	treeNode: TreeNode;
};

type SimEdge = { a: number; b: number; restLen: number; physics: boolean };

type FilePlacement = {
	x: number;
	y: number;
	radius: number;
};

type DirPlan = {
	visualRadius: number;
	islandRadius: number;
	dirChildren: TreeNode[];
	fileChildren: TreeNode[];
	filePlacements: Map<string, FilePlacement>;
};

// ---- Helpers ----
function hexToRgb(hex: number): [number, number, number] {
	return [(hex >> 16) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}

function getFileColor(name: string): number {
	const dot = name.lastIndexOf(".");
	const ext = dot !== -1 ? name.slice(dot + 1) : name;
	return EXT_COLORS[ext] ?? 0x888888;
}

function nodeRadius(node: TreeNode): number {
	if (!node.path) return 11;
	if (node.isDir) return 4.5 + Math.min(Math.log2(node.children.length + 2) * 2.5, 13);
	return 2.5 + Math.min(Math.log(node.size / 800 + 1) * 1.8, 7);
}

function packFilesConcentric(files: TreeNode[], folderVisualRadius: number): {
	placements: Map<string, FilePlacement>;
	extent: number;
} {
	const placements = new Map<string, FilePlacement>();
	if (files.length === 0) return { placements, extent: folderVisualRadius + 4 };

	const FILE_GAP = 2.1;
	const RING_GAP = 3.6;
	const BORDER_PAD = 4;

	const sorted = [...files]
		.map((file) => ({ file, radius: nodeRadius(file) }))
		.sort((a, b) => b.radius - a.radius);

	let idx = 0;
	let ringCenterRadius = folderVisualRadius + sorted[0].radius + 4;
	let outerExtent = folderVisualRadius;

	while (idx < sorted.length) {
		const ring: Array<{ node: TreeNode; radius: number }> = [];
		const ringCircumference = 2 * Math.PI * ringCenterRadius;
		let usedArc = 0;

		while (idx < sorted.length) {
			const candidate = sorted[idx];
			const neededArc = 2 * (candidate.radius + FILE_GAP);
			if (ring.length > 0 && usedArc + neededArc > ringCircumference * 0.97) break;
			ring.push({ node: candidate.file, radius: candidate.radius });
			usedArc += neededArc;
			idx++;
		}

		if (ring.length === 0) {
			ringCenterRadius += RING_GAP + 2;
			continue;
		}

		let angle = 0;
		for (const item of ring) {
			const span = (2 * (item.radius + FILE_GAP) / usedArc) * Math.PI * 2;
			const theta = angle + span / 2;
			const x = Math.cos(theta) * ringCenterRadius;
			const y = Math.sin(theta) * ringCenterRadius;
			placements.set(item.node.id, { x, y, radius: item.radius });
			angle += span;
		}

		const ringMaxRadius = Math.max(...ring.map((item) => item.radius));
		outerExtent = Math.max(outerExtent, ringCenterRadius + ringMaxRadius + BORDER_PAD);
		if (idx < sorted.length) {
			ringCenterRadius += ringMaxRadius + sorted[idx].radius + RING_GAP;
		}
	}

	return { placements, extent: outerExtent };
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildDirPlans(root: TreeNode): Map<string, DirPlan> {
	const planMap = new Map<string, DirPlan>();

	const visit = (node: TreeNode) => {
		if (!node.isDir) return;
		const dirChildren = node.children.filter((child) => child.isDir);
		const fileChildren = node.children.filter((child) => !child.isDir);
		const visualRadius = nodeRadius(node);
		const packed = packFilesConcentric(fileChildren, visualRadius);

		planMap.set(node.id, {
			visualRadius,
			islandRadius: Math.max(visualRadius + 3, packed.extent),
			dirChildren,
			fileChildren,
			filePlacements: packed.placements,
		});

		for (const child of dirChildren) visit(child);
	};

	visit(root);
	return planMap;
}

// ---- Build simulation from tree ----
function buildSim(root: TreeNode): { nodes: SimNode[]; edges: SimEdge[] } {
	const nodes: SimNode[] = [];
	const edges: SimEdge[] = [];
	const dirPlans = buildDirPlans(root);

	function visitDir(node: TreeNode, parentIdx: number, depth: number, angle: number, spread: number) {
		const plan = dirPlans.get(node.id);
		if (!plan) return;

		const parentIsland = parentIdx < 0 ? 0 : nodes[parentIdx].collisionRadius;
		const restLen = parentIdx < 0 ? 0 : parentIsland + plan.islandRadius + 26 + depth * 7;
		const px = parentIdx < 0 ? 0 : nodes[parentIdx].x + Math.cos(angle) * restLen;
		const py = parentIdx < 0 ? 0 : nodes[parentIdx].y + Math.sin(angle) * restLen;

		const hexColor = !node.path ? ROOT_COLOR : node.isDir ? DIR_COLOR : getFileColor(node.name);
		const [r, g, b] = hexToRgb(hexColor);

		const idx = nodes.length;
		nodes.push({
			x: px + (Math.random() - 0.5) * 8,
			y: py + (Math.random() - 0.5) * 8,
			vx: 0, vy: 0,
			radius: plan.visualRadius,
			collisionRadius: plan.islandRadius,
			mass: 2 + plan.islandRadius * 0.03,
			r, g, b,
			fixed: !node.path,
			isDir: true,
			parentNodeIdx: parentIdx,
			localX: 0,
			localY: 0,
			treeNode: node,
		});

		if (parentIdx >= 0) edges.push({ a: parentIdx, b: idx, restLen, physics: true });

		for (const fileNode of plan.fileChildren) {
			const placement = plan.filePlacements.get(fileNode.id);
			if (!placement) continue;
			const [fr, fg, fb] = hexToRgb(getFileColor(fileNode.name));
			const fileIdx = nodes.length;
			nodes.push({
				x: nodes[idx].x + placement.x,
				y: nodes[idx].y + placement.y,
				vx: 0,
				vy: 0,
				radius: placement.radius,
				collisionRadius: placement.radius,
				mass: 1,
				r: fr,
				g: fg,
				b: fb,
				fixed: true,
				isDir: false,
				parentNodeIdx: idx,
				localX: placement.x,
				localY: placement.y,
				treeNode: fileNode,
			});
			edges.push({
				a: idx,
				b: fileIdx,
				restLen: Math.hypot(placement.x, placement.y),
				physics: false,
			});
		}

		const childCount = plan.dirChildren.length;
		if (childCount === 0) return;
		const step = Math.min(spread, Math.PI * 1.9) / childCount;
		plan.dirChildren.forEach((child, i) => {
			visitDir(
				child,
				idx,
				depth + 1,
				angle - step * (childCount - 1) / 2 + step * i,
				Math.max(step * 1.2, 0.55),
			);
		});
	}

	visitDir(root, -1, 0, 0, Math.PI * 2);
	return { nodes, edges };
}

// ---- One simulation step: spring edges + repulsion + center gravity ----
function stepSim(nodes: SimNode[], edges: SimEdge[], cooling: number) {
	const n = nodes.length;
	const fx = new Float64Array(n);
	const fy = new Float64Array(n);
	const dirIndices: number[] = [];
	const repulsionScale = 0.35 + 0.65 * cooling;
	const dynamicDamping = Math.max(0.74, DAMPING - (1 - cooling) * 0.14);
	const maxSpeed = 4 + 16 * cooling;

	for (let i = 0; i < n; i++) {
		if (nodes[i].isDir) dirIndices.push(i);
	}

	// Spring forces along edges
	for (const { a, b, restLen, physics } of edges) {
		if (!physics) continue;
		const na = nodes[a], nb = nodes[b];
		const dx = nb.x - na.x, dy = nb.y - na.y;
		const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
		const f = SPRING_K * (0.42 + 0.28 * cooling) * (dist - restLen);
		const ux = dx / dist, uy = dy / dist;
		fx[a] += f * ux; fy[a] += f * uy;
		fx[b] -= f * ux; fy[b] -= f * uy;
	}

	// All-pairs repulsion via spatial grid
	const grid = new Map<number, number[]>();
	for (const i of dirIndices) {
		const cx = Math.floor(nodes[i].x / GRID_CELL) + 100;
		const cy = Math.floor(nodes[i].y / GRID_CELL) + 100;
		const k = cx * 1000 + cy;
		let cell = grid.get(k); if (!cell) { cell = []; grid.set(k, cell); } cell.push(i);
	}
	for (const i of dirIndices) {
		const na = nodes[i];
		const cx = Math.floor(na.x / GRID_CELL) + 100;
		const cy = Math.floor(na.y / GRID_CELL) + 100;
		for (let dcx = -2; dcx <= 2; dcx++) {
			for (let dcy = -2; dcy <= 2; dcy++) {
				const cell = grid.get((cx + dcx) * 1000 + (cy + dcy));
				if (!cell) continue;
				for (const j of cell) {
					if (j <= i) continue;
					const nb = nodes[j];
					const dx = nb.x - na.x, dy = nb.y - na.y;
					const dist2 = dx * dx + dy * dy;
					if (dist2 < 1) continue;
					const dist = Math.sqrt(dist2);
					const islandFactor = (na.collisionRadius + nb.collisionRadius) * 0.34;
					const overlap = Math.max(0, na.collisionRadius + nb.collisionRadius + 8 - dist);
					const f = ((REPULSION * repulsionScale * islandFactor) / dist2) + overlap * 0.32;
					const ux = dx / dist, uy = dy / dist;
					fx[i] -= f * ux; fy[i] -= f * uy;
					fx[j] += f * ux; fy[j] += f * uy;
				}
			}
		}
	}

	// Center gravity + integrate
	for (const i of dirIndices) {
		if (nodes[i].fixed) continue;
		fx[i] -= CENTER_K * nodes[i].x;
		fy[i] -= CENTER_K * nodes[i].y;
		nodes[i].vx = (nodes[i].vx + fx[i] / nodes[i].mass) * dynamicDamping;
		nodes[i].vy = (nodes[i].vy + fy[i] / nodes[i].mass) * dynamicDamping;

		const speed = Math.hypot(nodes[i].vx, nodes[i].vy);
		if (speed > maxSpeed) {
			const s = maxSpeed / speed;
			nodes[i].vx *= s;
			nodes[i].vy *= s;
		} else if (speed < 0.003) {
			nodes[i].vx = 0;
			nodes[i].vy = 0;
		}

		nodes[i].x += nodes[i].vx;
		nodes[i].y += nodes[i].vy;
	}

	for (let i = 0; i < n; i++) {
		const node = nodes[i];
		if (node.isDir) continue;
		if (node.parentNodeIdx < 0) continue;
		const parent = nodes[node.parentNodeIdx];
		node.x = parent.x + node.localX;
		node.y = parent.y + node.localY;
		node.vx = 0;
		node.vy = 0;
	}
}

// ---- Main component ----
export default function RepoTreeViz({
	root,
	truncated,
	totalNodes,
}: {
	root: TreeNode;
	truncated: boolean;
	totalNodes: number;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
	const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
	const vizNodes = countNodes(root);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const W = canvas.clientWidth;
		const H = canvas.clientHeight;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = W * dpr;
		canvas.height = H * dpr;

		// --- Three.js setup ---
		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setSize(W, H);
		renderer.setPixelRatio(dpr);
		renderer.setClearColor(BG_COLOR);

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100000);
		camera.position.z = 750;

		// --- Build simulation ---
		const { nodes, edges } = buildSim(root);

		// --- Instanced mesh for nodes ---
		const circleGeo = new THREE.CircleGeometry(1, 22);
		const circleMat = new THREE.MeshBasicMaterial();
		const iMesh = new THREE.InstancedMesh(circleGeo, circleMat, nodes.length);
		iMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		iMesh.frustumCulled = false;
		// Pre-initialize instanceColor buffer
		const colorData = new Float32Array(nodes.length * 3);
		iMesh.instanceColor = new THREE.InstancedBufferAttribute(colorData, 3);
		scene.add(iMesh);

		// --- Line segments for edges ---
		const linePosData = new Float32Array(edges.length * 6);
		const lineGeo = new THREE.BufferGeometry();
		const linePosAttr = new THREE.BufferAttribute(linePosData, 3);
		linePosAttr.setUsage(THREE.DynamicDrawUsage);
		lineGeo.setAttribute("position", linePosAttr);
		const lineMat = new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.55 });
		const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
		lineSegments.frustumCulled = false;
		scene.add(lineSegments);

		// --- Update Three.js objects from simulation ---
		const dummy = new THREE.Object3D();
		const threeColor = new THREE.Color();

		function updateScene() {
			for (let i = 0; i < nodes.length; i++) {
				const n = nodes[i];
				dummy.position.set(n.x, n.y, 0);
				dummy.scale.setScalar(n.radius);
				dummy.updateMatrix();
				iMesh.setMatrixAt(i, dummy.matrix);
				threeColor.setRGB(n.r, n.g, n.b);
				iMesh.setColorAt(i, threeColor);
			}
			iMesh.instanceMatrix.needsUpdate = true;
			if (iMesh.instanceColor) iMesh.instanceColor.needsUpdate = true;

			for (let i = 0; i < edges.length; i++) {
				const a = nodes[edges[i].a], b = nodes[edges[i].b];
				linePosData[i * 6 + 0] = a.x; linePosData[i * 6 + 1] = a.y; linePosData[i * 6 + 2] = 0;
				linePosData[i * 6 + 3] = b.x; linePosData[i * 6 + 4] = b.y; linePosData[i * 6 + 5] = 0;
			}
			lineGeo.attributes.position.needsUpdate = true;
		}

		// --- Mouse interaction ---
		let isPanning = false;
		let lastX = 0, lastY = 0;
		const rayCaster = new THREE.Raycaster();
		const mouseNDC = new THREE.Vector2();

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const zoomFactor = Math.exp(e.deltaY * ZOOM_SPEED);
			camera.position.z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.position.z * zoomFactor));
		};
		const onMouseDown = (e: MouseEvent) => {
			isPanning = true;
			lastX = e.clientX;
			lastY = e.clientY;
		};
		const onMouseMove = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

			// Hover raycasting
			mouseNDC.set(
				((e.clientX - rect.left) / rect.width) * 2 - 1,
				-((e.clientY - rect.top) / rect.height) * 2 + 1,
			);
			rayCaster.setFromCamera(mouseNDC, camera);
			const hits = rayCaster.intersectObject(iMesh);
			if (hits.length > 0 && hits[0].instanceId !== undefined) {
				setHoveredNode(nodes[hits[0].instanceId].treeNode);
			} else {
				setHoveredNode(null);
			}

			if (!isPanning) return;
			const dx = e.clientX - lastX;
			const dy = e.clientY - lastY;
			const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
			const worldPerPixel = visibleHeight / rect.height;
			camera.position.x -= dx * worldPerPixel;
			camera.position.y += dy * worldPerPixel;
			lastX = e.clientX;
			lastY = e.clientY;
		};
		const onMouseUp = () => { isPanning = false; };

		canvas.addEventListener("wheel", onWheel, { passive: false });
		canvas.addEventListener("mousedown", onMouseDown);
		canvas.addEventListener("mousemove", onMouseMove);
		canvas.addEventListener("mouseup", onMouseUp);
		canvas.addEventListener("mouseleave", () => { isPanning = false; setHoveredNode(null); });

		// --- Animation loop: runs until kinetic energy settles ---
		let animId: number;
		let frame = 0;
		let energyEma = 0;

		const animate = () => {
			animId = requestAnimationFrame(animate);

			// Average kinetic energy per node drives step count
			let totalKE = 0;
			for (const n of nodes) totalKE += n.vx * n.vx + n.vy * n.vy;
			const avgKE = nodes.length > 0 ? totalKE / nodes.length : 0;
			energyEma = frame === 0 ? avgKE : energyEma * 0.92 + avgKE * 0.08;
			const cooling = frame < 180 ? 1 : Math.max(0.25, Math.exp(-(frame - 180) / 700));
			const steps = frame < 180 ? SIM_STEPS : energyEma > 0.02 ? 2 : energyEma > 0.001 ? 1 : 0;

			for (let i = 0; i < steps; i++) stepSim(nodes, edges, cooling);
			if (steps > 0 || frame === 0) updateScene();
			renderer.render(scene, camera);
			frame++;
		};
		animate();

		// --- Resize ---
		const onResize = () => {
			const w = canvas.clientWidth, h = canvas.clientHeight;
			renderer.setSize(w, h);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		};
		window.addEventListener("resize", onResize);

		return () => {
			cancelAnimationFrame(animId);
			canvas.removeEventListener("wheel", onWheel);
			canvas.removeEventListener("mousedown", onMouseDown);
			canvas.removeEventListener("mousemove", onMouseMove);
			canvas.removeEventListener("mouseup", onMouseUp);
			window.removeEventListener("resize", onResize);
			renderer.dispose();
			circleGeo.dispose();
			circleMat.dispose();
			lineGeo.dispose();
			lineMat.dispose();
		};
	}, [root]);

	return (
		<div className="relative w-full h-full">
			<canvas
				ref={canvasRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>

			{/* Hover tooltip */}
			{hoveredNode && (
				<div
					className="absolute pointer-events-none z-10 border border-border bg-background/90 px-2 py-1 text-[0.68rem] font-mono max-w-64 truncate"
					style={{ left: Math.min(tooltipPos.x + 14, 9999), top: tooltipPos.y - 28 }}
				>
					<span className={hoveredNode.isDir ? "text-foreground" : "text-muted"}>
						{hoveredNode.path || "/"}
					</span>
					{!hoveredNode.isDir && hoveredNode.size > 0 && (
						<span className="text-muted/60 ml-2">{formatBytes(hoveredNode.size)}</span>
					)}
				</div>
			)}

			{/* Hints */}
			<div className="absolute bottom-2 left-3 text-[0.58rem] font-mono text-muted/50 select-none">
				scroll to zoom · drag to pan · hover for details
			</div>

			{/* Node count badge */}
			{truncated && (
				<div className="absolute top-2 right-2 text-[0.6rem] font-mono text-muted bg-background/80 px-2 py-0.5 border border-border/40">
					{vizNodes.toLocaleString()} of {totalNodes.toLocaleString()} nodes
				</div>
			)}
		</div>
	);
}
