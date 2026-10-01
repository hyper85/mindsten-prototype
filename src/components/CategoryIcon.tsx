import { CATEGORY_STYLE } from '../lib/categories';
import { CATEGORY_META } from '../lib/format';
import type { PersonCategory } from '../types';

export function CategoryIcon({
  category,
  size = 30,
  solid = false,
}: {
  category: PersonCategory;
  size?: number;
  solid?: boolean;
}) {
  const { icon: Icon, color, soft } = CATEGORY_STYLE[category];
  return (
    <span
      className="icon-square"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        background: solid ? color : soft,
        color: solid ? '#fff' : color,
      }}
      aria-hidden="true"
    >
      <Icon style={{ width: size * 0.58, height: size * 0.58 }} />
    </span>
  );
}

export function CategoryPill({ category }: { category: PersonCategory }) {
  const { icon: Icon, color, soft } = CATEGORY_STYLE[category];
  return (
    <span className="cat-pill" style={{ background: soft, color }}>
      <Icon aria-hidden="true" />
      {CATEGORY_META[category].label}
    </span>
  );
}
