import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { PersonListItem } from '../components/PersonListItem';
import { scanGravestone, ScanError } from '../lib/api';
import { formatDistance } from '../lib/format';
import { getCurrentPosition } from '../lib/geo';
import { incrementScanCount } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import type { ScanResult } from '../types';

type CameraState = 'starting' | 'live' | 'unavailable' | 'denied';
type Phase = 'aim' | 'processing' | 'result';

const MAX_EDGE_PX = 1280;

/** Draws a video frame or image onto a canvas, downscaled, and returns base64 JPEG. */
function toJpegBase64(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82).split(',')[1] ?? '';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        resolve(toJpegBase64(img, img.naturalWidth, img.naturalHeight));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Kunne ikke læse billedet'));
    };
    img.src = url;
  });
}

export function ScannerPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [camera, setCamera] = useState<CameraState>('starting');
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [phase, setPhase] = useState<Phase>('aim');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      setCamera('unavailable');
      return;
    }
    media
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorchSupported(Boolean(caps.torch));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setCamera('live');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        setCamera(name === 'NotAllowedError' ? 'denied' : 'unavailable');
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorchSupported(false);
    }
  };

  const runScan = useCallback(async (image: string | null) => {
    setPhase('processing');
    setError(null);
    try {
      const coords = await getCurrentPosition(5000);
      const scan = await scanGravestone(image, coords);
      incrementScanCount();
      setResult(scan);
      setPhase('result');
    } catch (err) {
      setError(err instanceof ScanError ? err.message : 'Scanningen fejlede. Prøv igen.');
      setPhase('aim');
    }
  }, []);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || camera !== 'live' || !video.videoWidth) {
      // With a backend we need a real photo; without one, run the demo scan.
      if (isSupabaseConfigured) fileRef.current?.click();
      else void runScan(null);
      return;
    }
    void runScan(toJpegBase64(video, video.videoWidth, video.videoHeight));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      void runScan(await fileToBase64(file));
    } catch {
      setError('Kunne ikke læse billedet.');
    }
  };

  const reading = result?.reading;
  const readText = reading?.people
    .map(
      (p) =>
        `${p.name}${p.birthYear || p.deathYear ? ` (${p.birthYear ?? '?'}–${p.deathYear ?? '?'})` : ''}`,
    )
    .join(', ');

  return (
    <div className="scanner-screen">
      <div className="scanner-viewfinder">
        <video ref={videoRef} className="scanner-video" playsInline muted aria-hidden="true" />

        <div className="scanner-top-bar">
          <button
            type="button"
            className="scanner-icon-btn"
            aria-label="Luk scanner"
            onClick={() => navigate('/home')}
          >
            {Icons.close}
          </button>
          {torchSupported && (
            <button
              type="button"
              className={`scanner-icon-btn ${torch ? 'on' : ''}`}
              aria-label={torch ? 'Sluk lygte' : 'Tænd lygte'}
              onClick={toggleTorch}
            >
              {Icons.flash}
            </button>
          )}
        </div>

        {camera !== 'live' && camera !== 'starting' && (
          <div className="scanner-fallback">
            {camera === 'denied'
              ? 'Kameraet er ikke tilladt. Giv adgang i browserens indstillinger — eller vælg et foto.'
              : 'Kameraet er ikke tilgængeligt. Vælg et foto af gravstenen i stedet.'}
          </div>
        )}

        <div className="scanner-bracket">
          <div className="scanner-bracket-inner" style={{ position: 'absolute', inset: 0 }} />
          {phase !== 'result' && <div className="scan-line" />}
        </div>

        <div className="scanner-hint">
          {error ?? 'Placer gravstenen inden for rammen — navn og årstal skal kunne ses'}
        </div>

        <div className="scanner-controls">
          <button
            type="button"
            className="scanner-side-btn"
            aria-label="Vælg foto"
            onClick={() => fileRef.current?.click()}
          >
            {Icons.upload}
          </button>
          <button
            type="button"
            className="shutter-btn"
            aria-label="Scan gravsten"
            onClick={captureFrame}
            disabled={phase === 'processing'}
          />
          <button
            type="button"
            className="scanner-side-btn"
            aria-label="Søg i stedet"
            onClick={() => navigate('/search')}
          >
            {Icons.search}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {!isSupabaseConfigured && (
          <div className="demo-pill">Demo-tilstand · ingen server tilknyttet</div>
        )}
      </div>

      {phase === 'processing' && (
        <div className="processing-overlay" role="status" aria-live="polite">
          <div className="spinner" />
          <div className="processing-text">Læser gravstenen…</div>
          <div className="processing-sub">Navn, årstal og placering sammenholdes med arkivet</div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="scan-sheet" role="dialog" aria-label="Scanningsresultat">
          <div className="sheet-handle" />
          {reading && !reading.isGravestone ? (
            <>
              <div className="sheet-title">Det ligner ikke en gravsten</div>
              <p className="sheet-text">
                Prøv igen tættere på stenen, så navn og årstal fylder rammen.
              </p>
            </>
          ) : result.candidates.length > 0 ? (
            <>
              <div className="sheet-title">
                {result.candidates.length === 1 ? 'Vi fandt personen' : 'Mulige personer'}
              </div>
              {readText && <p className="sheet-text">Læst på stenen: {readText}</p>}
              {result.mode === 'demo' && (
                <p className="sheet-text muted">
                  Demo: uden server viser vi de nærmeste kendte grave.
                </p>
              )}
              {result.candidates.map((c) => (
                <PersonListItem
                  key={c.person.id}
                  person={c.person}
                  badge={`${c.score}% match${c.distanceMeters !== null ? ` · ${formatDistance(c.distanceMeters)} væk` : ''}`}
                  onSelect={(p) => navigate(`/person/${p.id}`, { state: { matchScore: c.score } })}
                />
              ))}
            </>
          ) : (
            <>
              <div className="sheet-title">Personen er ikke i arkivet endnu</div>
              {readText && <p className="sheet-text">Læst på stenen: {readText}</p>}
              <p className="sheet-text">
                Vi dækker foreløbig kendte danskere. Du kan tilføje graven, så den kommer med.
              </p>
              <button
                type="button"
                className="primary-btn"
                onClick={() =>
                  navigate('/submit', {
                    state: {
                      prefill: reading?.people[0] ?? null,
                      inscription: reading?.inscription,
                    },
                  })
                }
              >
                Tilføj denne grav
              </button>
            </>
          )}
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setResult(null);
              setPhase('aim');
            }}
          >
            Scan igen
          </button>
        </div>
      )}
    </div>
  );
}
