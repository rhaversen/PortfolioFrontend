import Link from "next/link";
import Image from "next/image";
import CardBlob from "./CardBlob";
import { GithubIcon } from "./icons";

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

interface ShowcaseProps {
  id: string;
  title: string;
  titleNote?: string;
  description: string;
  url?: string;
  github?: string;
  stack: string[];
  hasDetail?: boolean;
  image?: string;
}

export default function ProjectShowcase({
  id, title, titleNote, description, url, github, stack, hasDetail, image,
}: ShowcaseProps) {
  return (
    <article
      className={`relative h-full flex flex-col p-5 transition-colors duration-150${hasDetail ? " group cursor-pointer" : ""}`}
    >
      <CardBlob />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 border border-black" />
      {image && (
        <div className="relative z-10 border-b border-black">
          <Image
            src={image}
            alt={`Screenshot of ${title}`}
            width={800}
            height={500}
            sizes="(max-width: 640px) 100vw, (max-width: 896px) 50vw, 448px"
            className="w-full h-auto"
          />
        </div>
      )}
      {hasDetail && <Link href={`/${id}`} aria-label={`Open ${title} project page`} className="absolute inset-0 z-0" />}
      <div className="relative z-10 flex flex-col flex-1 pointer-events-none">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[0.95rem] font-semibold tracking-[0.005em]">
            {title}
            {titleNote && <span className="ml-2 text-[0.7rem] font-mono font-normal text-muted">{titleNote}</span>}
          </h2>
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
                className="pointer-events-auto hidden sm:inline-flex items-center gap-1.5 rounded-sm border border-border/70 px-1.5 py-0.5 text-[0.72rem] font-mono tracking-wide text-muted transition-colors duration-150 hover:border-accent/60 hover:bg-accent/10 hover:text-foreground"
              >
                <GithubIcon />
                GitHub ↗
              </a>
            )}
          </div>
        </div>

        <p className="text-[0.9rem] text-foreground/90 leading-7">{description}</p>

        <div className="flex flex-wrap gap-1.5 mt-4">
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
