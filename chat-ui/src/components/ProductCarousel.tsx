import { useEffect, useState } from 'react';
import type { Product } from '../types';

// Real Unsplash images mapped by category and keywords
const IMAGE_MAP: Record<string, string> = {
  // Laptops
  'laptop': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop&auto=format',
  'gaming-laptop': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop&auto=format',
  'macbook': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop&auto=format',
  // Audio
  'headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop&auto=format',
  'earbuds': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=300&fit=crop&auto=format',
  'earphones': 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=300&fit=crop&auto=format',
  'audio': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop&auto=format',
  // Accessories
  'mouse': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop&auto=format',
  'keyboard': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop&auto=format',
  'monitor': 'https://images.unsplash.com/photo-1527443224154-c4a573d8d8c7?w=400&h=300&fit=crop&auto=format',
  'bag': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop&auto=format',
  'charger': 'https://images.unsplash.com/photo-1608751819407-8c8672b0a7de?w=400&h=300&fit=crop&auto=format',
  'hub': 'https://images.unsplash.com/photo-1625314868143-20e93ce3ebb8?w=400&h=300&fit=crop&auto=format',
  'case': 'https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=400&h=300&fit=crop&auto=format',
  // Mobiles & Gadgets
  'mobile': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop&auto=format',
  'iphone': 'https://images.unsplash.com/photo-1530319067432-f2a729c021d0?w=400&h=300&fit=crop&auto=format',
  'foldable': 'https://images.unsplash.com/photo-1616422329580-0a256df23d77?w=400&h=300&fit=crop&auto=format',
  'tablet': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop&auto=format',
  'smartwatch': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=300&fit=crop&auto=format',
  'powerbank': 'https://images.unsplash.com/photo-1609095697361-baf8ee4a7d76?w=400&h=300&fit=crop&auto=format',
  // Fallback by category
  'wireless-mouse': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop&auto=format',
  'laptop-bag': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop&auto=format',
  'carrying-case': 'https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=400&h=300&fit=crop&auto=format',
  'accessory': 'https://images.unsplash.com/photo-1625314868143-20e93ce3ebb8?w=400&h=300&fit=crop&auto=format',
};

function getProductImage(product: Product): string {
  // If image already looks like a real URL, use it
  if (product.image && product.image.startsWith('http')) return product.image;

  // 1. Try category exact match first
  const cat = (product as unknown as Record<string, string>).category || '';
  if (cat && IMAGE_MAP[cat]) return IMAGE_MAP[cat];
  
  // 2. Keyword fallback
  const name = (product.name || '').toLowerCase();
  const specs = (product.specs || []).join(' ').toLowerCase();
  const combined = `${name} ${specs} ${cat}`;

  if (combined.includes('macbook') || combined.includes('apple')) return IMAGE_MAP['macbook'];
  if (combined.includes('gaming') && combined.includes('laptop')) return IMAGE_MAP['gaming-laptop'];
  if (combined.includes('laptop') || combined.includes('notebook')) return IMAGE_MAP['laptop'];
  
  if (combined.includes('earbud') || combined.includes('tws') || combined.includes('in-ear')) return IMAGE_MAP['earbuds'];
  if (combined.includes('earphone') || (combined.includes('wired') && combined.includes('ear'))) return IMAGE_MAP['earphones'];
  if (combined.includes('headphone') || combined.includes('over-ear') || combined.includes('on-ear')) return IMAGE_MAP['headphones'];
  
  if (combined.includes('phone') || combined.includes('mobile')) return IMAGE_MAP['mobile'];
  if (combined.includes('fold')) return IMAGE_MAP['foldable'];
  if (combined.includes('tablet') || combined.includes('pad')) return IMAGE_MAP['tablet'];
  if (combined.includes('watch') || combined.includes('band')) return IMAGE_MAP['smartwatch'];
  if (combined.includes('powerbank') || combined.includes('battery')) return IMAGE_MAP['powerbank'];
  
  if (combined.includes('mouse')) return IMAGE_MAP['mouse'];
  if (combined.includes('keyboard') || combined.includes('mech')) return IMAGE_MAP['keyboard'];
  if (combined.includes('monitor') || combined.includes('display')) return IMAGE_MAP['monitor'];
  
  if (combined.includes('bag') || combined.includes('sleeve') || combined.includes('backpack') || combined.includes('briefcase')) return IMAGE_MAP['bag'];
  if (combined.includes('charger') || combined.includes('gan') || combined.includes('power')) return IMAGE_MAP['charger'];
  if (combined.includes('hub') || combined.includes('usb')) return IMAGE_MAP['hub'];
  if (combined.includes('case')) return IMAGE_MAP['case'];

  return IMAGE_MAP['audio']; // final fallback
}

export function ProductCarousel({
  products,
  onAddToCart
}: {
  products: Product[];
  onAddToCart: (p: Product) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < products.length) {
      const timer = setTimeout(() => setVisibleCount(v => v + 1), 120);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, products.length]);

  // Reset animation when products change
  useEffect(() => { setVisibleCount(0); }, [products]);

  if (!products || products.length === 0) return null;

  return (
    <div className="flex overflow-x-auto space-x-4 pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
      {products.map((product, idx) => {
        const imgSrc = getProductImage(product);
        const inStock = product.stock === undefined || product.stock > 0;

        return (
          <div
            key={product.id}
            className={`flex-shrink-0 w-56 bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform ${
              idx < visibleCount ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            {/* Product Image */}
            <div className="h-36 bg-slate-50 relative overflow-hidden">
              <img
                src={imgSrc}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop';
                }}
              />
              {!inStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">
                    Out of Stock
                  </span>
                </div>
              )}
              {product.brand && (
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-semibold bg-white/90 text-slate-600 px-2 py-0.5 rounded-full shadow-sm">
                    {product.brand}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-2">
              <h3 className="font-semibold text-neutral-ink text-sm leading-tight line-clamp-2">
                {product.name}
              </h3>
              <p className="text-base font-bold text-neutral-ink">
                ₹{product.price.toLocaleString('en-IN')}
              </p>

              {/* Tags */}
              {product.specs && product.specs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.specs.slice(0, 3).map(spec => (
                    <span
                      key={spec}
                      className="text-[10px] px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full border border-sky-100 font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => onAddToCart(product)}
                disabled={!inStock}
                className="w-full mt-1 py-2 bg-brand-blue text-white font-medium text-xs rounded-xl hover:bg-brand-blue/90 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
              >
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
