import { useState } from 'react';
import { CATEGORY_STYLE } from '../lib/categories';
import { imageAtWidth, initials } from '../lib/format';
import type { Person } from '../types';

export function Avatar({ person, size = 44 }: { person: Person; size?: number }) {
  const { ink, soft } = CATEGORY_STYLE[person.category];
  // Fall back to the monogram when the portrait can't load (offline, removed file).
  const [failed, setFailed] = useState(false);
  const src = person.imageUrl && !failed ? imageAtWidth(person.imageUrl, size) : null;
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: soft, color: ink, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(person.name)
      )}
    </span>
  );
}
