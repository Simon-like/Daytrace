interface BrandMarkProps {
  readonly assetPrefix?: string;
  readonly compact?: boolean;
  readonly reverse?: boolean;
}

export function BrandMark({ assetPrefix = "", compact = false, reverse = true }: BrandMarkProps) {
  return (
    <span className={`dt-brand${compact ? " dt-brand--compact" : ""}${reverse ? " dt-brand--reverse" : ""}`}>
      <img src={`${assetPrefix}/brand/daytrace-icon-reverse.svg`} width={compact ? 36 : 44} height={compact ? 36 : 44} alt="" />
      <span className="dt-brand__type"><strong>有迹</strong><small>DAYTRACE</small></span>
    </span>
  );
}
