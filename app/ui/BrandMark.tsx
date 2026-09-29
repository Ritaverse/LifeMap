import Image from "next/image";

interface BrandMarkProps {
  className?: string;
  large?: boolean;
}

export function BrandMark({ className = "", large = false }: BrandMarkProps) {
  const classes = ["brand-mark", large ? "brand-mark--large" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <Image
        className="brand-mark__image"
        src="/images/brand/life-map-star-mark.webp"
        alt=""
        width={256}
        height={256}
        loading="eager"
        unoptimized
      />
    </span>
  );
}
