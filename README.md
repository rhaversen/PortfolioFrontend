# Portfolio Frontend

The frontend for [rhaversen.com](https://rhaversen.com) — a portfolio site with a Game of Life background, a printable bilingual CV, and a suite of interactive side projects backed by WebSockets and LLM streaming.

## Stack

- Next.js (App Router), React, TypeScript
- Tailwind CSS
- socket.io-client for the LLM-backed side projects
- Three.js for WebGL visualizations (eclipse shadow-path rendering)
- Jest for unit tests over pure logic

## Testing

Unit tests live next to the code they cover (`*.test.ts`) and target pure, dependency-free modules — parsers, geometry, and scoring logic.

## Deployment

Docker image (non-root, Debian slim) deployed to a self-managed Kubernetes cluster with staging/production overlays, ArgoCD GitOps sync, cert-manager TLS, and liveness/readiness probes. CI runs lint, spellcheck, tests, and multi-arch Docker builds on every PR.
