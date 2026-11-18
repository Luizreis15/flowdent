type BrandVariant = "padrao" | "inverso" | "mono" | "mono-inverso";

export function FlowdentBrand({
  variant = "padrao",
}: {
  variant?: BrandVariant;
}) {
  return (
    <img
      className="fd-wordmark"
      src={`/brand/flowdent-${variant}.svg`}
      width={357}
      height={68}
      alt="Flowdent"
    />
  );
}
