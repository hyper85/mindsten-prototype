import { CATEGORY_STYLE } from '../lib/categories';
import { initials } from '../lib/format';
import type { Person } from '../types';

export function Avatar({ person, size = 44 }: { person: Person; size?: number }) {
  const { color, soft } = CATEGORY_STYLE[person.category];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: soft, color, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {person.imageUrl ? (
        <img src={person.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        initials(person.name)
      )}
    </span>
  );
}
