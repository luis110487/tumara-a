import { Link } from 'react-router-dom';

const TILE_COLORS = ['tm-tile-blue', 'tm-tile-yellow', 'tm-tile-green', 'tm-tile-navy'];

export function CategoryCard({ category, index }) {
  const tile = TILE_COLORS[index % TILE_COLORS.length];
  return (
    <Link className="tm-category" to={`/buscar?category=${category.id}`}>
      <div className={`tm-cat-icon ${tile}`}>{category.icon || '•'}</div>
      <strong>{category.name}</strong>
    </Link>
  );
}
