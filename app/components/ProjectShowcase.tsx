import Link from "next/link";

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

interface ShowcaseProps {
  id: string;
  title: string;
  description: string;
  color: string;
  url?: string;
  github?: string;
  stack: string[];
  hasDetail?: boolean;
}

export default function ProjectShowcase({
  id, title, description, color, url, github, stack, hasDetail,
}: ShowcaseProps) {
  return (
    <article
      className={`relative h-full flex flex-col bg-card/80 p-5 shadow-sm transition-colors duration-150 overflow-hidden${hasDetail ? " group cursor-pointer hover:bg-card" : ""}`}
    >
      <div
        className={`absolute left-0 right-0 top-0 h-px transition-all duration-150${hasDetail ? " group-hover:h-0.75" : ""}`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {hasDetail && <Link href={`/${id}`} aria-label={`Open ${title} project page`} className="absolute inset-0 z-0" />}
      <div className="relative z-10 flex flex-col flex-1 pointer-events-none">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[0.95rem] font-semibold tracking-[0.005em]">{title}</h2>
          <div className="flex items-center gap-3 shrink-0">
            {url && (
              <a
                href={normalizeExternalUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto hidden sm:inline-flex items-center rounded-sm border border-border/70 px-1.5 py-0.5 text-[0.72rem] font-mono tracking-wide text-muted transition-colors duration-150 hover:border-accent/60 hover:bg-accent/10 hover:text-foreground"
              >
                {url} ↗
              </a>
            )}
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto hidden sm:inline-flex items-center rounded-sm border border-border/70 px-1.5 py-0.5 text-[0.72rem] font-mono tracking-wide text-muted transition-colors duration-150 hover:border-accent/60 hover:bg-accent/10 hover:text-foreground"
              >
                GitHub ↗
              </a>
            )}
          </div>
        </div>

        <p className="text-[0.9rem] text-foreground/90 mb-4 leading-7 flex-1">{description}</p>

        <div className="flex flex-wrap gap-1.5">
          {stack.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 text-[0.68rem] font-mono tracking-wide text-muted border border-border"
            >
              {t}
            </span>
          ))}
        </div>

        {hasDetail && (
          <div className="mt-3 flex justify-end">
            <span className="pointer-events-auto text-[0.72rem] font-mono tracking-wide text-muted underline decoration-transparent transition-colors duration-150 group-hover:text-foreground/70 hover:decoration-foreground/40">
              Read more ↗
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
