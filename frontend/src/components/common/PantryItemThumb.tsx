import React, { useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { PantryItem } from '../../types';

interface PantryItemThumbProps {
  item?: Partial<PantryItem> | null;
  src?: string | null;
  alt?: string;
  className?: string;
}

export const PantryItemThumb: React.FC<PantryItemThumbProps> = ({
  item,
  src,
  alt,
  className = '',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Priorytet dla bezpośrednio przekazanych propsów `src` i `alt`, a jako fallback wartości z `item`
  const imageUrl = src ?? item?.imageUrl;
  const imageAlt = alt ?? item?.name ?? 'Product image';

  const containerClasses = `relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-800 bg-slate-950 flex items-center justify-center ${className}`;

  // Brak zdjęcia lub błąd ładowania -> domyślna ikona
  if (!imageUrl || hasError) {
    return (
      <div className={`${containerClasses} bg-slate-800 border-slate-700/60`}>
        <Package className="w-6 h-6 text-emerald-400" />
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {/* Stan ładowania (Skeleton / Loader) */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-900 animate-pulse flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
        </div>
      )}

      {/* Obrazek z lazy loadingiem */}
      <img
        src={imageUrl}
        alt={imageAlt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};