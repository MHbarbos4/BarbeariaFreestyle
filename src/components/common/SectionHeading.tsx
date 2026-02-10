export default function SectionHeading({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      <p className="text-xs font-semibold tracking-[0.22em] text-muted-foreground">{kicker}</p>
      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      {description ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p> : null}
    </header>
  );
}
