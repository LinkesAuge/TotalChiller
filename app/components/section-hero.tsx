import Image from "next/image";

interface SectionHeroProps {
  readonly title: string;
  readonly subtitle: string;
  readonly bannerSrc: string;
}

/**
 * Reusable themed hero strip used on major section pages.
 */
function SectionHero({ title, subtitle, bannerSrc }: SectionHeroProps): JSX.Element {
  return (
    <div className="hero-banner">
      <div className="hero-overlay" />
      <Image
        src={bannerSrc}
        alt={`${title} hero banner`}
        className="hero-bg"
        width={1200}
        height={300}
        sizes="100vw"
        priority
      />
      <Image
        src="/assets/vip/decor_light_1.png"
        alt=""
        className="hero-light"
        width={400}
        height={400}
        sizes="400px"
        priority
      />
      <div className="hero-content">
        <Image src="/assets/vip/components_decor_6.png" alt="" className="hero-decor" width={300} height={20} />
        <h2 className="hero-title">{title}</h2>
        <p className="hero-subtitle">{subtitle}</p>
        <Image src="/assets/vip/components_decor_6.png" alt="" className="hero-decor flipped" width={300} height={20} />
      </div>
    </div>
  );
}

export default SectionHero;
