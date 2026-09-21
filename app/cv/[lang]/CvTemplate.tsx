import { type ReactElement } from "react";
import type { CvData } from "./CvData";
import { PhoneIcon, CvMailIcon, GlobeIcon, LinkIcon, GithubIcon, FlaskIcon } from "./CvIcons";
import Image from "next/image";

const H2_CLASS = "text-[13.5pt] font-bold tracking-[0.01em] border-b-[1.2pt] border-neutral-900 pb-[1.2mm] mb-[3.5mm]";
const H3_CLASS = "text-[9.5pt] font-bold mt-[2.6mm] mb-[0.8mm]";
const P_CLASS = "mb-[1.2mm]";
const ENTRY_CLASS = "mb-[5.5mm]";
const HEAD_CLASS = "flex justify-between items-baseline gap-[4mm]";
const TITLE_CLASS = "text-[12pt] font-semibold";
const DATE_CLASS = "text-[8.6pt] text-neutral-700 whitespace-nowrap";
const SUB_CLASS = "text-[9pt] mt-[0.8mm] mb-[2.2mm]";
const LIST_CLASS = "m-0 pl-[4.5mm] flex flex-col gap-[2.2mm]";
const LI_CLASS = "pl-[1mm]";

const RAW_OVERRIDE = "[&_*]:font-mono [&_*]:font-normal [&_*]:text-neutral-400 [&_*]:tracking-normal [&_img]:opacity-0 [&_hr]:opacity-0";

const CONTACT_ICONS = {
	phone: PhoneIcon,
	mail: CvMailIcon,
	globe: GlobeIcon,
	link: LinkIcon,
	github: GithubIcon,
	flask: FlaskIcon,
} as const;

const BOLD_END = "§";

function renderText(text: string | undefined): ReactElement {
	if (!text) return <></>;
	const i = text.indexOf(BOLD_END);
	if (i === -1) return <>{text}</>;
	return <><strong>{text.slice(0, i)}</strong>{text.slice(i + BOLD_END.length)}</>;
}

export default function CvTemplate({ data, variant = "final" }: { data: CvData; variant?: "final" | "raw" }): ReactElement {
	const raw = variant === "raw";
	const articleClass = `text-[8.6pt] leading-[1.42] text-neutral-900 ${raw ? RAW_OVERRIDE : ""}`;

	return (
		<article lang={data.lang} className={articleClass}>
			<div className="grid grid-cols-[32%_1fr] gap-[10mm] items-start">
				{/* ============ LEFT COLUMN ============ */}
				<div>
					<div className="relative z-20">
						<Image
							src={data.photo.src}
							alt={data.photo.alt}
							width={2003}
							height={2003}
							priority
							sizes="(max-width: 210mm) 100vw, 67mm"
							className="w-full aspect-square object-cover rounded-[10px] grayscale mb-[6mm]"
						/>
					</div>

					<div className="flex flex-col gap-[2.4mm] mb-[6mm]">
						{data.contacts.map(({ icon, text, href }: { icon: keyof typeof CONTACT_ICONS; text: string; href?: string }) => {
							const Icon = CONTACT_ICONS[icon];
							return (
								<div key={text} className="flex items-center gap-[2.2mm] text-[9pt]">
									<Icon />
									{href
										? <a href={href} className="underline decoration-neutral-400">{renderText(text)}</a>
										: <span>{renderText(text)}</span>}
								</div>
							);
						})}
					</div>

					<section>
						<h2 className={`${H2_CLASS} mt-[2mm]`}>{data.skills.title}</h2>
						{data.skills.groups.map(({ heading, text }) => (
							<div key={heading}>
								<h3 className={`${H3_CLASS} first-of-type:mt-0`}>{renderText(heading)}</h3>
								<p className={P_CLASS}>{renderText(text)}</p>
							</div>
						))}
					</section>
				</div>

				{/* ============ RIGHT COLUMN ============ */}
				<div>
					<header>
						<h1 className="text-[24pt] font-bold text-center leading-none mb-[1.5mm]">{data.name}</h1>
						<hr className="border-none border-t-[1.2pt] border-neutral-900 mb-[4mm]" />
					</header>

					<div className="mb-[6mm] flex flex-col gap-[3mm]">
						{data.intro.map((paragraph, i) => (
							<p key={i}>{renderText(paragraph)}</p>
						))}
					</div>

					<section>
						<h2 className={H2_CLASS}>{data.education.title}</h2>
						{data.education.entries.map(({ title, date, bullets }) => (
							<div key={title} className={ENTRY_CLASS}>
								<div className={HEAD_CLASS}>
									<h3 className={TITLE_CLASS}>{renderText(title)}</h3>
									<span className={DATE_CLASS}>{date}</span>
								</div>
								<ul className={`${LIST_CLASS} mt-[2mm]`}>
									{bullets.map((bullet) => (
										<li key={bullet} className={LI_CLASS}>{renderText(bullet)}</li>
									))}
								</ul>
							</div>
						))}
					</section>

					<section>
						<h2 className={H2_CLASS}>{data.experience.title}</h2>
						{data.experience.entries.map(({ title, date, subtitle, bullets }) => (
							<div key={title} className={ENTRY_CLASS}>
								<div className={HEAD_CLASS}>
									<h3 className={TITLE_CLASS}>{renderText(title)}</h3>
									<span className={DATE_CLASS}>{date}</span>
								</div>
								<p className={SUB_CLASS}>{renderText(subtitle)}</p>
								<ul className={LIST_CLASS}>
									{bullets.map((bullet) => (
										<li key={bullet} className={LI_CLASS}>{renderText(bullet)}</li>
									))}
								</ul>
							</div>
						))}
					</section>

					<section>
						<h2 className={H2_CLASS}>{data.references.title}</h2>
						<ul className={LIST_CLASS}>
							{data.references.items.map((item) => (
								<li key={item} className={LI_CLASS}>{renderText(item)}</li>
							))}
						</ul>
					</section>
				</div>
			</div>
		</article>
	);
}
