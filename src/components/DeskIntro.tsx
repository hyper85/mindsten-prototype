import { Camera, Hourglass, MapPin } from 'lucide-react';
import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { AppMark } from './Illustrations';

function QrCode({ value }: { value: string }) {
  const cells = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const dark: Array<[number, number]> = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) dark.push([c, r]);
    return { n, dark };
  }, [value]);

  return (
    <svg viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`} role="img" aria-label="QR-kode til appen">
      <rect x="-2" y="-2" width={cells.n + 4} height={cells.n + 4} fill="#fff" />
      <path
        d={cells.dark.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')}
        fill="#1c1a17"
        shapeRendering="crispEdges"
      />
    </svg>
  );
}

/** Shown next to the phone mock-up on wide screens. */
export function DeskIntro() {
  const url =
    typeof window !== 'undefined' ? window.location.origin + import.meta.env.BASE_URL : '';
  return (
    <aside className="desk" aria-label="Om MindSTEN">
      <div className="desk-brand">
        <AppMark />
        MindSTEN
      </div>
      <h2 className="desk-title">
        Hver gravsten har en <em>historie</em>.
      </h2>
      <p className="desk-text">
        Peg telefonen mod en gravsten på kirkegården. MindSTEN finder personen og viser dig deres
        liv – og den tid, de levede i.
      </p>
      <ul className="desk-features">
        <li>
          <span>
            <Camera size={18} />
          </span>
          Scan stenen – vi læser navn og årstal
        </li>
        <li>
          <span>
            <Hourglass size={18} />
          </span>
          Rejs tilbage til deres tid
        </li>
        <li>
          <span>
            <MapPin size={18} />
          </span>
          Find kendte danskeres grave
        </li>
      </ul>
      {url && (
        <div className="desk-qr">
          <QrCode value={url} />
          <div>
            <strong>Prøv den på din telefon</strong>
            <span>Scan koden med kameraet, og tag MindSTEN med på kirkegården.</span>
          </div>
        </div>
      )}
    </aside>
  );
}
