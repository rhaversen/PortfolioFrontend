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
}

export default function ProjectShowcase({
  id, title, description, color, url, github, stack,
}: ShowcaseProps) {
  return (
    <article
      className="group relative h-full flex flex-col border-t border-border bg-card/80 p-5 shadow-sm transition-colors duration-150 hover:bg-surface/90"
      style={{ borderTopColor: color + "80" }}
    >
      <Link href={`/${id}`} aria-label={`Open ${title} project page`} className="absolute inset-0 z-0" />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[0.95rem] font-semibold tracking-[0.005em]">{title}</h2>
          <div className="flex items-center gap-3 shrink-0">
            {url && (
              <a
                href={normalizeExternalUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center rounded-sm border border-border/70 px-1.5 py-0.5 text-[0.72rem] font-mono tracking-wide text-muted transition-colors duration-150 hover:border-accent/60 hover:bg-accent/10 hover:text-foreground"
              >
                {url} ↗
              </a>
            )}
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center rounded-sm border border-border/70 px-1.5 py-0.5 text-[0.72rem] font-mono tracking-wide text-muted transition-colors duration-150 hover:border-accent/60 hover:bg-accent/10 hover:text-foreground"
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
      </div>
    </article>
  );
}
