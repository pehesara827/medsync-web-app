import { Heart } from 'lucide-react';

export default function FavoriteButton({ isFavorite, onToggle, isLoading, size = 16 }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      className={`inline-flex items-center justify-center rounded-full transition ${
        isLoading ? 'opacity-80 cursor-not-allowed' : 'hover:scale-110'
      }`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        size={size}
        className={`transition-colors ${
          isFavorite
            ? 'fill-red-500 text-red-500'
            : 'fill-none text-slate-400 hover:text-red-500'
        }`}
      />
    </button>
  );
}
