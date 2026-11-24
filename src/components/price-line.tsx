import type { PriceText } from '@/lib/pricing';

/** "From $118 a night", then its pound equivalent, smaller and lighter ("≈ EGP 6,410"). */
export function PriceLine({ price }: { price: PriceText }) {
  return (
    <>
      {price.text}
      {price.equivalent ? (
        <>
          {' '}
          <span className="price-equivalent">{price.equivalent}</span>
        </>
      ) : null}
    </>
  );
}
