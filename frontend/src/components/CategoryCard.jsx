import { Link } from 'react-router-dom';
import { CategoryIcon } from './CategoryIcon';

const TILE_COLORS = ['tm-tile-blue', 'tm-tile-yellow', 'tm-tile-green', 'tm-tile-navy'];

export function CategoryCard({ category, index }) {
  const tile = TILE_COLORS[index % TILE_COLORS.length];
  return (
    <Link className="tm-category" to={`/buscar?category=${category.id}`}>
      <div className={`tm-cat-icon ${tile}`}><CategoryIcon name={category.icon} /></div>
      <strong>{category.name}</strong>
    </Link>
  );
}
