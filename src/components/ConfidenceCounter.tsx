import { useEffect, useState } from 'react';

interface Props {
  value: number;
}

export function ConfidenceCounter({ value }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const iv = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(iv);
      } else {
        setCount(start);
      }
    }, 40);
    return () => clearInterval(iv);
  }, [value]);

  return <span className="match-conf">{count}%</span>;
}
