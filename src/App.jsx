import { useState, useEffect, useRef, useCallback } from "react";

// --- Data ---
const PERSONS = [
  {
    id: 1,
    name: "H.C. Andersen",
    born: "2. april 1805",
    died: "4. august 1875",
    profession: "Forfatter",
    cemetery: "Assistens Kirkegård",
    city: "København",
    confidence: 97,
    shortBio: "Verdens mest elskede eventyrdigter. Hans eventyr som 'Den Grimme Ælling', 'Den Lille Havfrue' og 'Kejserens Nye Klæder' er oversat til over 125 sprog.",
    fullBio: "Hans Christian Andersen blev født i Odense i fattige kår og rejste som 14-årig til København for at søge lykken. Efter år med modgang brød han igennem som forfatter og blev en af verdenshistoriens mest oversatte forfattere. Hans eventyr kombinerede folkelig fortælletradition med dyb menneskelig indsigt og blev elsket af både børn og voksne verden over.",
    timeline: [
      { year: 1805, event: "Født i Odense" },
      { year: 1819, event: "Rejser til København" },
      { year: 1835, event: "Udgiver 'Eventyr, fortalte for Børn'" },
      { year: 1843, event: "'Den Grimme Ælling' udkommer" },
      { year: 1875, event: "Dør i København, 70 år" },
    ],
    era: "Guldalderen",
    eraYears: "1800-tallet",
    timeWindowTitle: "København i Guldalderen",
    sources: ["Dansk Biografisk Leksikon", "Rigsarkivet", "H.C. Andersen Centret"],
    category: "writers",
  },
  {
    id: 2,
    name: "Søren Kierkegaard",
    born: "5. maj 1813",
    died: "11. november 1855",
    profession: "Filosof",
    cemetery: "Assistens Kirkegård",
    city: "København",
    confidence: 94,
    shortBio: "Eksistentialismens fader. Hans filosofi om angst, fortvivlelse og troens spring har formet moderne tænkning dybt.",
    fullBio: "Søren Aabye Kierkegaard var en dansk filosof, teolog og digter, der regnes som eksistentialismens grundlægger. Han udfordrede den etablerede kirke og Hegels filosofi med sine skrifter om individets ansvar og eksistens. Hans værker som 'Enten-Eller' og 'Begrebet Angest' er fundamentale tekster i vestlig filosofi.",
    timeline: [
      { year: 1813, event: "Født i København" },
      { year: 1840, event: "Forlovet med Regine Olsen" },
      { year: 1843, event: "'Enten-Eller' udgives" },
      { year: 1849, event: "'Sygdommen til Døden'" },
      { year: 1855, event: "Dør i København, 42 år" },
    ],
    era: "Guldalderen",
    eraYears: "1800-tallet",
    timeWindowTitle: "Filosofiens København",
    sources: ["Dansk Biografisk Leksikon", "Søren Kierkegaard Forskningscenteret"],
    category: "science",
  },
  {
    id: 3,
    name: "Niels Bohr",
    born: "7. oktober 1885",
    died: "18. november 1962",
    profession: "Fysiker",
    cemetery: "Assistens Kirkegård",
    city: "København",
    confidence: 96,
    shortBio: "Nobelpristager i fysik. Grundlægger af atomfysikken og skaberen af Bohr-modellen for atomet.",
    fullBio: "Niels Henrik David Bohr var en dansk fysiker, der modtog Nobelprisen i fysik i 1922 for sin forskning i atomstruktur og kvantemekanik. Han grundlagde Institut for Teoretisk Fysik ved Københavns Universitet, som blev et internationalt centrum for fysisk forskning. Under Anden Verdenskrig flygtede han til Sverige og bidrog senere til det amerikanske Manhattan-projekt.",
    timeline: [
      { year: 1885, event: "Født i København" },
      { year: 1913, event: "Bohr-modellen publiceres" },
      { year: 1922, event: "Modtager Nobelprisen" },
      { year: 1943, event: "Flugten til Sverige" },
      { year: 1962, event: "Dør i København, 77 år" },
    ],
    era: "Det 20. århundrede",
    eraYears: "1900-tallet",
    timeWindowTitle: "Atomfysikkens tidsalder",
    sources: ["Dansk Biografisk Leksikon", "Niels Bohr Arkivet", "Nobelprize.org"],
    category: "science",
  },
  {
    id: 4,
    name: "Niels Juel",
    born: "8. maj 1629",
    died: "8. april 1697",
    profession: "Admiral",
    cemetery: "Holmens Kirkegård",
    city: "København",
    confidence: 91,
    shortBio: "Danmarks største flådehelt. Vandt Slaget i Køge Bugt i 1677, den danske flådes mest berømte sejr.",
    fullBio: "Niels Juel var en dansk admiral, der ledte den danske flåde til sejr i Skånske Krig. Hans taktiske geni i Slaget i Køge Bugt sikrede dansk kontrol over Østersøen og cementerede hans plads som Danmarks mest fejrede søhelt.",
    timeline: [
      { year: 1629, event: "Født i Christiania (Oslo)" },
      { year: 1656, event: "Første søslag" },
      { year: 1677, event: "Slaget i Køge Bugt" },
      { year: 1683, event: "Udnævnt til Rigsadmiral" },
      { year: 1697, event: "Dør i København, 67 år" },
    ],
    era: "Enevælden",
    eraYears: "1600-tallet",
    timeWindowTitle: "Danmarks flådemagt",
    sources: ["Dansk Biografisk Leksikon", "Orlogsmuseet"],
    category: "naval",
  },
];

const ROUTES = [
  { id: 1, title: "Guldaldervandring", subtitle: "Assistens Kirkegård", stops: 5, duration: "45 min", distance: "1.2 km", category: "writers", emoji: "✍️" },
  { id: 2, title: "Flådeheltene", subtitle: "Holmens Kirkegård", stops: 4, duration: "35 min", distance: "0.8 km", category: "naval", emoji: "⚓" },
  { id: 3, title: "Videnskabens pionerer", subtitle: "Assistens Kirkegård", stops: 6, duration: "55 min", distance: "1.5 km", category: "science", emoji: "🔬" },
  { id: 4, title: "Kongernes Roskilde", subtitle: "Roskilde Domkirke", stops: 8, duration: "60 min", distance: "0.9 km", category: "royals", emoji: "👑" },
];

// --- Icons as SVG components ---
const Icons = {
  scan: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
      <line x1="7" y1="12" x2="17" y2="12"/>
    </svg>
  ),
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/>
    </svg>
  ),
  map: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
    </svg>
  ),
  profile: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    </svg>
  ),
  back: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19l-7-7 7-7"/>
    </svg>
  ),
  play: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  walk: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="2"/><path d="M7 21l3-9m0 0l2 2 4-4m-6 2l-2-4 4-1"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  flash: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  source: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ),
  pin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
    </svg>
  ),
};

// --- Styles ---
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  :root {
    --stone-950: #0F0E0D;
    --stone-900: #1A1918;
    --stone-800: #2C2A27;
    --stone-700: #3D3A36;
    --stone-600: #5C5751;
    --stone-500: #7A746C;
    --stone-400: #9E9789;
    --stone-300: #C4BFB3;
    --stone-200: #DED9CE;
    --stone-100: #EDE9E0;
    --stone-50: #F5F2EB;

    --moss-700: #2D4A30;
    --moss-600: #3A6040;
    --moss-500: #4A7A52;
    --moss-400: #6B9E73;
    --moss-300: #8FBF96;
    --moss-200: #B5D6B9;

    --gold-700: #8A6D1B;
    --gold-600: #A6841F;
    --gold-500: #C9A84C;
    --gold-400: #D4BA6A;
    --gold-300: #E0CC8A;
    --gold-200: #EBD9A5;

    --serif: 'Cormorant Garamond', Georgia, serif;
    --sans: 'DM Sans', -apple-system, sans-serif;

    --phone-w: 375px;
    --phone-h: 812px;
  }

  * { margin:0; padding:0; box-sizing:border-box; }

  .mindsten-root {
    width: 100%; min-height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 40px 20px;
    background: #0A0908;
    font-family: var(--sans);
    position: relative;
    overflow: hidden;
  }

  .mindsten-root::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 800px 600px at 30% 20%, rgba(74, 122, 82, 0.08), transparent),
      radial-gradient(ellipse 600px 400px at 70% 80%, rgba(201, 168, 76, 0.06), transparent);
    pointer-events: none;
  }

  .badge-row {
    display: flex; gap: 12px; align-items: center;
    margin-bottom: 20px; position: relative; z-index: 1;
  }
  .badge-pill {
    font-family: var(--sans); font-size: 11px; font-weight: 500;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--stone-400);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 100px; padding: 6px 14px;
  }

  .hero-title {
    font-family: var(--serif); font-weight: 400; font-size: 40px;
    color: var(--stone-100); letter-spacing: -0.01em;
    text-align: center; margin-bottom: 8px;
    position: relative; z-index: 1;
  }
  .hero-title span { color: var(--gold-500); }

  .hero-sub {
    font-family: var(--sans); font-size: 14px; color: var(--stone-500);
    text-align: center; margin-bottom: 40px;
    position: relative; z-index: 1;
  }

  /* Phone frame */
  .phone-frame {
    width: var(--phone-w); height: var(--phone-h);
    border-radius: 44px;
    background: var(--stone-950);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.5),
      0 25px 60px rgba(0,0,0,0.6),
      0 0 120px rgba(201,168,76,0.04);
    overflow: hidden;
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
  }

  .phone-notch {
    width: 100%; height: 50px;
    display: flex; align-items: center; justify-content: center;
    background: var(--stone-950);
    position: relative; z-index: 50;
    flex-shrink: 0;
  }
  .phone-notch::after {
    content: '';
    width: 120px; height: 28px;
    background: #000; border-radius: 0 0 18px 18px;
  }

  .screen {
    flex: 1;
    overflow-y: auto; overflow-x: hidden;
    position: relative;
    background: var(--stone-950);
    scrollbar-width: none;
  }
  .screen::-webkit-scrollbar { display: none; }

  /* Tab Bar */
  .tab-bar {
    height: 72px; flex-shrink: 0;
    background: rgba(15,14,13,0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; justify-content: space-around;
    padding: 0 8px 12px;
    position: relative; z-index: 40;
  }
  .tab-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: none; border: none; cursor: pointer;
    color: var(--stone-600); transition: color 0.2s;
    padding: 6px 12px;
  }
  .tab-btn.active { color: var(--gold-500); }
  .tab-btn span { font-size: 10px; font-family: var(--sans); font-weight: 500; letter-spacing: 0.03em; }

  .scan-tab-btn {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-600), var(--gold-500));
    border: 2px solid var(--gold-400);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: var(--stone-950);
    box-shadow: 0 4px 20px rgba(201,168,76,0.3);
    transition: transform 0.15s, box-shadow 0.15s;
    margin-top: -18px;
  }
  .scan-tab-btn:active { transform: scale(0.95); }

  /* HOME screen */
  .home-screen { padding: 0 20px 20px; }
  .greeting { font-family: var(--serif); font-size: 26px; color: var(--stone-100); margin-bottom: 4px; }
  .greeting-sub { font-size: 13px; color: var(--stone-500); margin-bottom: 24px; }

  .section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--stone-500); margin-bottom: 12px;
    display: flex; align-items: center; gap: 6px;
  }

  .nearby-card {
    display: flex; gap: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 14px; padding: 14px;
    margin-bottom: 10px; cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }
  .nearby-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(201,168,76,0.15); }

  .nearby-avatar {
    width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--stone-800), var(--stone-700));
    display: flex; align-items: center; justify-content: center;
    font-family: var(--serif); font-size: 20px; color: var(--gold-500);
  }
  .nearby-info { flex: 1; min-width: 0; }
  .nearby-name { font-family: var(--serif); font-size: 16px; color: var(--stone-100); font-weight: 500; }
  .nearby-meta { font-size: 12px; color: var(--stone-500); margin-top: 2px; }
  .nearby-dist { font-size: 11px; color: var(--moss-400); margin-top: 4px; display: flex; align-items: center; gap: 4px; }

  /* Routes */
  .routes-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; margin: 0 -20px; padding-left: 20px; padding-right: 20px; scrollbar-width: none; }
  .routes-scroll::-webkit-scrollbar { display: none; }

  .route-card {
    min-width: 200px; max-width: 200px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px; padding: 18px;
    cursor: pointer; transition: all 0.2s;
    flex-shrink: 0;
  }
  .route-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(201,168,76,0.15); }
  .route-emoji { font-size: 28px; margin-bottom: 10px; }
  .route-title { font-family: var(--serif); font-size: 16px; color: var(--stone-100); font-weight: 500; }
  .route-subtitle { font-size: 12px; color: var(--stone-500); margin-top: 2px; }
  .route-details { display: flex; gap: 12px; margin-top: 10px; }
  .route-detail { font-size: 11px; color: var(--stone-400); display: flex; align-items: center; gap: 4px; }

  /* SCANNER screen */
  .scanner-screen {
    position: absolute; inset: 0;
    background: #000;
    display: flex; flex-direction: column;
  }
  .scanner-viewfinder {
    flex: 1; position: relative;
    background: linear-gradient(180deg, #111 0%, #1a1a1a 50%, #111 100%);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .scanner-viewfinder::before {
    content: '';
    position: absolute; inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' x='10' y='10' fill='%23ffffff08'/%3E%3C/svg%3E");
    opacity: 0.5;
  }

  .scanner-bracket {
    width: 240px; height: 280px;
    position: relative;
  }
  .scanner-bracket::before, .scanner-bracket::after,
  .scanner-bracket-inner::before, .scanner-bracket-inner::after {
    content: ''; position: absolute;
    width: 40px; height: 40px;
    border-color: var(--gold-500);
    border-style: solid;
    border-width: 0;
  }
  .scanner-bracket::before { top: 0; left: 0; border-top-width: 3px; border-left-width: 3px; border-radius: 8px 0 0 0; }
  .scanner-bracket::after { top: 0; right: 0; border-top-width: 3px; border-right-width: 3px; border-radius: 0 8px 0 0; }
  .scanner-bracket-inner::before { bottom: 0; left: 0; border-bottom-width: 3px; border-left-width: 3px; border-radius: 0 0 0 8px; }
  .scanner-bracket-inner::after { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 8px 0; }

  .scan-line {
    position: absolute; left: 10%; right: 10%;
    height: 2px; background: linear-gradient(90deg, transparent, var(--gold-500), transparent);
    animation: scanMove 2.5s ease-in-out infinite;
    box-shadow: 0 0 12px rgba(201,168,76,0.4);
  }
  @keyframes scanMove {
    0%, 100% { top: 15%; }
    50% { top: 80%; }
  }

  .scanner-hint {
    text-align: center; margin-top: 20px;
    font-size: 13px; color: var(--stone-400);
    position: absolute; bottom: 40px; left: 0; right: 0;
  }

  .scanner-top-bar {
    position: absolute; top: 0; left: 0; right: 0;
    display: flex; justify-content: space-between; padding: 16px;
    z-index: 10;
  }
  .scanner-icon-btn {
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    color: white; cursor: pointer;
  }

  .scanner-modes {
    display: flex; gap: 0; background: rgba(0,0,0,0.5);
    border-radius: 10px; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
    z-index: 10;
  }
  .scanner-mode {
    padding: 8px 18px; font-size: 12px; font-weight: 500;
    color: var(--stone-400); cursor: pointer;
    background: none; border: none; font-family: var(--sans);
    transition: all 0.2s;
  }
  .scanner-mode.active { color: var(--gold-500); background: rgba(201,168,76,0.1); }

  .sim-btn {
    position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
    padding: 10px 24px; border-radius: 100px;
    background: linear-gradient(135deg, var(--gold-600), var(--gold-500));
    color: var(--stone-950); font-family: var(--sans); font-size: 13px; font-weight: 600;
    border: none; cursor: pointer; z-index: 20;
    box-shadow: 0 4px 16px rgba(201,168,76,0.3);
    transition: transform 0.15s;
  }
  .sim-btn:active { transform: translateX(-50%) scale(0.96); }

  /* PROCESSING overlay */
  .processing-overlay {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    z-index: 30;
  }
  .spinner {
    width: 48px; height: 48px;
    border: 2px solid rgba(201,168,76,0.15);
    border-top-color: var(--gold-500);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 20px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .processing-text { font-size: 14px; color: var(--stone-300); text-align: center; }
  .processing-sub { font-size: 12px; color: var(--stone-600); margin-top: 6px; }

  /* PERSON PROFILE */
  .profile-screen { padding: 0 0 20px; }
  .profile-header {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    background: rgba(15,14,13,0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .profile-back {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.05); border: none;
    display: flex; align-items: center; justify-content: center;
    color: var(--stone-300); cursor: pointer;
  }
  .profile-header-title { font-family: var(--serif); font-size: 16px; color: var(--stone-200); }

  .match-banner {
    margin: 16px 20px; padding: 10px 14px;
    background: rgba(74,122,82,0.1);
    border: 1px solid rgba(74,122,82,0.2);
    border-radius: 10px;
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--moss-300);
  }
  .match-conf {
    font-weight: 600; color: var(--moss-300);
    margin-left: auto; font-size: 14px;
  }

  .person-name-area { padding: 8px 20px 0; }
  .person-main-name { font-family: var(--serif); font-size: 30px; font-weight: 500; color: var(--stone-50); }
  .person-dates { font-size: 13px; color: var(--stone-500); margin-top: 2px; }

  .quick-facts {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px; padding: 16px 20px;
  }
  .fact-card {
    padding: 12px; border-radius: 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .fact-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--stone-600); margin-bottom: 2px; }
  .fact-value { font-family: var(--serif); font-size: 15px; color: var(--stone-200); }

  .bio-section { padding: 0 20px; margin-bottom: 20px; }
  .bio-text { font-size: 14px; line-height: 1.65; color: var(--stone-300); }
  .bio-toggle { font-size: 13px; color: var(--gold-500); cursor: pointer; background:none; border:none; font-family: var(--sans); font-weight: 500; margin-top: 6px; }

  .time-window-cta {
    margin: 0 20px 20px; padding: 18px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04));
    border: 1px solid rgba(201,168,76,0.15);
    cursor: pointer; transition: all 0.2s;
  }
  .time-window-cta:hover { border-color: rgba(201,168,76,0.3); }
  .tw-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold-500); margin-bottom: 6px; }
  .tw-title { font-family: var(--serif); font-size: 18px; color: var(--stone-100); margin-bottom: 4px; }
  .tw-era { font-size: 12px; color: var(--stone-500); }
  .tw-play {
    display: flex; align-items: center; gap: 8px;
    margin-top: 12px; color: var(--gold-500); font-size: 13px; font-weight: 500;
  }
  .tw-play-circle {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-600), var(--gold-500));
    display: flex; align-items: center; justify-content: center;
    color: var(--stone-950);
  }

  .timeline-section { padding: 0 20px; margin-bottom: 20px; }
  .timeline-item {
    display: flex; gap: 14px; position: relative;
    padding-bottom: 16px;
  }
  .timeline-item:not(:last-child)::after {
    content: ''; position: absolute;
    left: 19px; top: 30px; bottom: 0;
    width: 1px; background: rgba(255,255,255,0.06);
  }
  .timeline-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--gold-500); margin-top: 5px; flex-shrink: 0;
    position: relative; left: 14px;
  }
  .timeline-year { font-size: 12px; font-weight: 600; color: var(--gold-400); min-width: 36px; margin-left: 12px; }
  .timeline-event { font-size: 13px; color: var(--stone-300); }

  .sources-section { padding: 0 20px; margin-bottom: 20px; }
  .source-item {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: var(--stone-500); padding: 4px 0;
  }

  /* TIME WINDOW screen */
  .tw-screen { padding: 0 0 20px; }
  .tw-video-area {
    width: 100%; aspect-ratio: 16/9;
    background: linear-gradient(180deg, #1a1a1a 0%, #0f0e0d 100%);
    position: relative; display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .tw-video-area::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, rgba(201,168,76,0.08), transparent 70%);
  }
  .tw-play-big {
    width: 64px; height: 64px; border-radius: 50%;
    background: rgba(201,168,76,0.2); backdrop-filter: blur(8px);
    border: 2px solid rgba(201,168,76,0.4);
    display: flex; align-items: center; justify-content: center;
    color: var(--gold-400); cursor: pointer;
    transition: all 0.2s; z-index: 2;
  }
  .tw-play-big:hover { background: rgba(201,168,76,0.3); }
  .tw-era-badge {
    position: absolute; top: 12px; left: 12px;
    padding: 6px 12px; border-radius: 6px;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    font-size: 11px; color: var(--gold-400); font-weight: 500;
    z-index: 2;
  }
  .tw-content { padding: 20px; }
  .tw-content-title { font-family: var(--serif); font-size: 24px; color: var(--stone-100); margin-bottom: 12px; }
  .tw-context-cards { display: flex; flex-direction: column; gap: 10px; }
  .tw-context-card {
    padding: 14px; border-radius: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .tw-cc-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--gold-500); margin-bottom: 6px; }
  .tw-cc-text { font-size: 13px; color: var(--stone-300); line-height: 1.6; }

  /* MAP screen */
  .map-screen { position: absolute; inset: 0; background: var(--stone-900); }
  .map-area {
    position: absolute; inset: 0;
    background:
      linear-gradient(135deg, #1e2420 0%, #1a1f1b 30%, #1c1e1a 60%, #1a1918 100%);
    overflow: hidden;
  }
  .map-area::before {
    content: ''; position: absolute; inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23ffffff06' stroke-width='0.5'/%3E%3C/svg%3E");
  }

  .map-search-bar {
    position: absolute; top: 12px; left: 16px; right: 16px;
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: 12px;
    background: rgba(15,14,13,0.9); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    z-index: 10;
  }
  .map-search-bar input {
    flex: 1; border: none; background: none; outline: none;
    font-family: var(--sans); font-size: 14px; color: var(--stone-200);
  }
  .map-search-bar input::placeholder { color: var(--stone-600); }

  .map-filters {
    position: absolute; top: 64px; left: 16px; right: 16px;
    display: flex; gap: 8px; z-index: 10; overflow-x: auto;
    scrollbar-width: none;
  }
  .map-filters::-webkit-scrollbar { display: none; }
  .map-filter-chip {
    padding: 6px 14px; border-radius: 100px;
    background: rgba(15,14,13,0.85); backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.08);
    font-family: var(--sans); font-size: 12px; font-weight: 500;
    color: var(--stone-400); cursor: pointer; white-space: nowrap;
    transition: all 0.2s;
  }
  .map-filter-chip.active { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.3); color: var(--gold-400); }

  .map-pin {
    position: absolute;
    width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 5;
  }
  .map-pin::after {
    content: ''; width: 10px; height: 10px;
    border-radius: 50%; background: white;
    transform: rotate(45deg);
  }
  .map-pin.gold { background: var(--gold-500); box-shadow: 0 2px 8px rgba(201,168,76,0.4); }
  .map-pin.green { background: var(--moss-500); box-shadow: 0 2px 8px rgba(74,122,82,0.3); }
  .map-pin:hover { transform: rotate(-45deg) scale(1.2); z-index: 6; }

  .map-user-dot {
    position: absolute; width: 14px; height: 14px; border-radius: 50%;
    background: #4A90D9; border: 3px solid rgba(74,144,217,0.3);
    box-shadow: 0 0 12px rgba(74,144,217,0.4);
    z-index: 6;
  }

  .map-bottom-sheet {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(15,14,13,0.95); backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px 20px 0 0;
    padding: 12px 20px 20px; z-index: 10;
    max-height: 200px; overflow-y: auto;
  }
  .sheet-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: rgba(255,255,255,0.15);
    margin: 0 auto 12px;
  }
  .sheet-title { font-size: 13px; font-weight: 600; color: var(--stone-400); margin-bottom: 10px; letter-spacing: 0.05em; text-transform: uppercase; }

  /* PROFILE tab */
  .my-profile-screen { padding: 0 20px 20px; }
  .my-profile-header { text-align: center; padding: 20px 0; }
  .my-avatar {
    width: 72px; height: 72px; border-radius: 50%;
    background: linear-gradient(135deg, var(--stone-800), var(--stone-700));
    border: 2px solid rgba(201,168,76,0.2);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 12px;
    font-size: 28px;
  }
  .my-name { font-family: var(--serif); font-size: 20px; color: var(--stone-100); }
  .my-since { font-size: 12px; color: var(--stone-500); }

  .stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 16px 0; }
  .stat-item {
    text-align: center; padding: 14px 8px; border-radius: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .stat-num { font-family: var(--serif); font-size: 24px; color: var(--gold-500); }
  .stat-label { font-size: 10px; color: var(--stone-500); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }

  .settings-group { margin-top: 20px; }
  .settings-item {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    cursor: pointer;
  }
  .settings-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .settings-icon.green { background: rgba(74,122,82,0.15); color: var(--moss-400); }
  .settings-icon.gold { background: rgba(201,168,76,0.1); color: var(--gold-500); }
  .settings-text { font-size: 14px; color: var(--stone-200); }
  .settings-sub { font-size: 11px; color: var(--stone-500); }

  /* ONBOARDING */
  .onboarding-screen {
    position: absolute; inset: 0;
    background: var(--stone-950);
    display: flex; flex-direction: column;
    z-index: 100;
  }
  .onboarding-content {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 30px;
    text-align: center;
  }
  .onboarding-icon {
    width: 80px; height: 80px; border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 28px; font-size: 36px;
  }
  .onboarding-icon.step0 { background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05)); }
  .onboarding-icon.step1 { background: linear-gradient(135deg, rgba(74,122,82,0.2), rgba(74,122,82,0.05)); }
  .onboarding-icon.step2 { background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(74,122,82,0.1)); }

  .onboarding-title { font-family: var(--serif); font-size: 26px; color: var(--stone-50); margin-bottom: 10px; }
  .onboarding-desc { font-size: 14px; color: var(--stone-400); line-height: 1.6; max-width: 280px; }

  .onboarding-dots { display: flex; gap: 8px; justify-content: center; margin: 30px 0; }
  .onboarding-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: rgba(255,255,255,0.1); transition: all 0.3s;
  }
  .onboarding-dot.active { background: var(--gold-500); width: 24px; border-radius: 4px; }

  .onboarding-bottom { padding: 0 30px 40px; display: flex; flex-direction: column; gap: 10px; }
  .onboarding-next {
    width: 100%; padding: 14px;
    border-radius: 12px; border: none;
    background: linear-gradient(135deg, var(--gold-600), var(--gold-500));
    font-family: var(--sans); font-size: 15px; font-weight: 600;
    color: var(--stone-950); cursor: pointer;
    transition: opacity 0.2s;
  }
  .onboarding-next:active { opacity: 0.9; }
  .onboarding-skip {
    width: 100%; padding: 12px;
    border-radius: 12px; border: none; background: none;
    font-family: var(--sans); font-size: 13px; color: var(--stone-500);
    cursor: pointer;
  }

  /* Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.4s ease-out both; }
  .fade-up-d1 { animation-delay: 0.05s; }
  .fade-up-d2 { animation-delay: 0.1s; }
  .fade-up-d3 { animation-delay: 0.15s; }
  .fade-up-d4 { animation-delay: 0.2s; }

  @keyframes countUp {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// --- Components ---

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "🔍", cls: "step0", title: "Scan", desc: "Peg din kamera mod en gravsten — vi fortæller dig hvem der ligger begravet." },
    { icon: "🎬", cls: "step1", title: "Tidsvindue", desc: "Se kuraterede videoer der bringer fortiden til live på stedet." },
    { icon: "🗺️", cls: "step2", title: "Udforsk", desc: "Følg temaruter og opdag historien i dit nærområde." },
  ];

  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        <div className={`onboarding-icon ${steps[step].cls}`}>{steps[step].icon}</div>
        <div className="onboarding-title">{steps[step].title}</div>
        <div className="onboarding-desc">{steps[step].desc}</div>
        <div className="onboarding-dots">
          {steps.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i === step ? "active" : ""}`} />
          ))}
        </div>
      </div>
      <div className="onboarding-bottom">
        <button className="onboarding-next" onClick={() => step < 2 ? setStep(step + 1) : onDone()}>
          {step < 2 ? "Næste" : "Kom i gang"}
        </button>
        <button className="onboarding-skip" onClick={onDone}>Spring over</button>
      </div>
    </div>
  );
}

function HomeScreen({ onSelectPerson, onSelectRoute }) {
  const nearby = PERSONS.slice(0, 3);
  const dists = ["120m", "180m", "350m"];
  return (
    <div className="home-screen">
      <div className="greeting fade-up">God morgen 👋</div>
      <div className="greeting-sub fade-up fade-up-d1">Assistens Kirkegård · København</div>

      <div className="section-label fade-up fade-up-d2" style={{ marginTop: 8 }}>
        <span style={{ color: "var(--moss-400)" }}>{Icons.pin}</span> I nærheden
      </div>
      {nearby.map((p, i) => (
        <div key={p.id} className={`nearby-card fade-up fade-up-d${i + 2}`} onClick={() => onSelectPerson(p)}>
          <div className="nearby-avatar">{p.name.charAt(0)}</div>
          <div className="nearby-info">
            <div className="nearby-name">{p.name}</div>
            <div className="nearby-meta">{p.profession} · {p.born.split(" ").pop()}–{p.died.split(" ").pop()}</div>
            <div className="nearby-dist">{Icons.pin} {dists[i]}</div>
          </div>
        </div>
      ))}

      <div className="section-label fade-up" style={{ marginTop: 24 }}>Temaruter</div>
      <div className="routes-scroll fade-up fade-up-d1">
        {ROUTES.map((r) => (
          <div key={r.id} className="route-card" onClick={() => onSelectRoute(r)}>
            <div className="route-emoji">{r.emoji}</div>
            <div className="route-title">{r.title}</div>
            <div className="route-subtitle">{r.subtitle}</div>
            <div className="route-details">
              <span className="route-detail">{Icons.clock} {r.duration}</span>
              <span className="route-detail">{Icons.walk} {r.distance}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScannerScreen({ onResult }) {
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState("camera");

  const doScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      onResult(PERSONS[0]);
    }, 2200);
  };

  return (
    <div className="scanner-screen">
      <div className="scanner-viewfinder">
        <div className="scanner-top-bar">
          <div className="scanner-icon-btn" onClick={() => onResult(null)}>{Icons.back}</div>
          <div className="scanner-icon-btn">{Icons.flash}</div>
        </div>
        <div className="scanner-bracket">
          <div className="scanner-bracket-inner" style={{ position: "absolute", inset: 0 }} />
          <div className="scan-line" />
        </div>
        <div className="scanner-modes">
          {["camera", "QR", "søg"].map((m) => (
            <button key={m} className={`scanner-mode ${mode === m ? "active" : ""}`} onClick={() => setMode(m)}>
              {m === "camera" ? "Kamera" : m === "QR" ? "QR-kode" : "Søg"}
            </button>
          ))}
        </div>
        <div className="scanner-hint">Placer gravstenen inden for rammen</div>
        <button className="sim-btn" onClick={doScan}>Simuler scanning</button>
      </div>

      {scanning && (
        <div className="processing-overlay">
          <div className="spinner" />
          <div className="processing-text">Genkender tekst…</div>
          <div className="processing-sub">Matcher navn og lokation</div>
        </div>
      )}
    </div>
  );
}

function ConfidenceCounter({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 20);
    const iv = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(iv); }
      else setCount(start);
    }, 40);
    return () => clearInterval(iv);
  }, [value]);
  return <span className="match-conf">{count}%</span>;
}

function PersonProfile({ person, onBack, onTimeWindow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <button className="profile-back" onClick={onBack}>{Icons.back}</button>
        <div className="profile-header-title">{person.cemetery}</div>
      </div>

      <div className="match-banner fade-up">
        <span style={{ color: "var(--moss-300)" }}>{Icons.check}</span>
        Person fundet
        <ConfidenceCounter value={person.confidence} />
      </div>

      <div className="person-name-area fade-up fade-up-d1">
        <div className="person-main-name">{person.name}</div>
        <div className="person-dates">{person.born} – {person.died}</div>
      </div>

      <div className="quick-facts fade-up fade-up-d2">
        <div className="fact-card"><div className="fact-label">Profession</div><div className="fact-value">{person.profession}</div></div>
        <div className="fact-card"><div className="fact-label">Begravet</div><div className="fact-value">{person.cemetery.split(" ")[0]}</div></div>
        <div className="fact-card"><div className="fact-label">Æra</div><div className="fact-value">{person.era}</div></div>
        <div className="fact-card"><div className="fact-label">By</div><div className="fact-value">{person.city}</div></div>
      </div>

      <div className="bio-section fade-up fade-up-d3">
        <div className="section-label">Biografi</div>
        <div className="bio-text">{expanded ? person.fullBio : person.shortBio}</div>
        <button className="bio-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Vis mindre" : "Læs mere…"}
        </button>
      </div>

      <div className="time-window-cta fade-up fade-up-d4" onClick={onTimeWindow}>
        <div className="tw-label">Tidsvindue</div>
        <div className="tw-title">{person.timeWindowTitle}</div>
        <div className="tw-era">{person.eraYears} · {person.era}</div>
        <div className="tw-play">
          <div className="tw-play-circle">{Icons.play}</div>
          Se tidsvindue
        </div>
      </div>

      <div className="timeline-section">
        <div className="section-label">Tidslinje</div>
        {person.timeline.map((t, i) => (
          <div key={i} className="timeline-item fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="timeline-dot" />
            <div className="timeline-year">{t.year}</div>
            <div className="timeline-event">{t.event}</div>
          </div>
        ))}
      </div>

      <div className="sources-section">
        <div className="section-label">Kilder</div>
        {person.sources.map((s, i) => (
          <div key={i} className="source-item">
            <span style={{ color: "var(--stone-600)" }}>{Icons.source}</span>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeWindowScreen({ person, onBack }) {
  return (
    <div className="tw-screen">
      <div className="profile-header">
        <button className="profile-back" onClick={onBack}>{Icons.back}</button>
        <div className="profile-header-title">Tidsvindue</div>
      </div>

      <div className="tw-video-area">
        <div className="tw-era-badge">{person.eraYears} · {person.era}</div>
        <div className="tw-play-big">{Icons.play}</div>
      </div>

      <div className="tw-content">
        <div className="tw-content-title">{person.timeWindowTitle}</div>
        <div className="tw-context-cards">
          <div className="tw-context-card">
            <div className="tw-cc-label">Hvad skete der?</div>
            <div className="tw-cc-text">
              Danmark var i en turbulent periode. {person.name} levede i en tid med store forandringer — politisk, kulturelt og videnskabeligt.
            </div>
          </div>
          <div className="tw-context-card">
            <div className="tw-cc-label">Dagliglivet</div>
            <div className="tw-cc-text">
              København var en by i forvandling. Gaderne summede af ny energi mens Danmark fandt sin plads i verden.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapScreen({ onSelectPerson }) {
  const [filter, setFilter] = useState("all");
  const pins = [
    { person: PERSONS[0], x: "32%", y: "35%", type: "gold" },
    { person: PERSONS[1], x: "58%", y: "28%", type: "green" },
    { person: PERSONS[2], x: "45%", y: "55%", type: "green" },
    { person: PERSONS[3], x: "70%", y: "48%", type: "green" },
  ];
  const filters = [
    { id: "all", label: "Alle" },
    { id: "writers", label: "✍️ Forfattere" },
    { id: "naval", label: "⚓ Flåde" },
    { id: "science", label: "🔬 Videnskab" },
    { id: "royals", label: "👑 Konger" },
  ];

  const filtered = filter === "all" ? pins : pins.filter((p) => p.person.category === filter);

  return (
    <div className="map-screen">
      <div className="map-area">
        <div className="map-search-bar">
          <span style={{ color: "var(--stone-500)" }}>{Icons.search}</span>
          <input placeholder="Søg efter person eller sted…" />
        </div>
        <div className="map-filters">
          {filters.map((f) => (
            <button key={f.id} className={`map-filter-chip ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.map((pin, i) => (
          <div key={i} className={`map-pin ${pin.type}`} style={{ left: pin.x, top: pin.y }} onClick={() => onSelectPerson(pin.person)} />
        ))}
        <div className="map-user-dot" style={{ left: "50%", top: "65%" }} />

        <div className="map-bottom-sheet">
          <div className="sheet-handle" />
          <div className="sheet-title">I nærheden</div>
          {filtered.map((pin) => (
            <div key={pin.person.id} className="nearby-card" onClick={() => onSelectPerson(pin.person)} style={{ marginBottom: 8 }}>
              <div className="nearby-avatar">{pin.person.name.charAt(0)}</div>
              <div className="nearby-info">
                <div className="nearby-name">{pin.person.name}</div>
                <div className="nearby-meta">{pin.person.profession}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  return (
    <div className="my-profile-screen">
      <div className="my-profile-header">
        <div className="my-avatar">🪦</div>
        <div className="my-name">Historisk Nysgerrig</div>
        <div className="my-since">Medlem siden marts 2026</div>
      </div>

      <div className="stat-grid">
        <div className="stat-item">
          <div className="stat-num">23</div>
          <div className="stat-label">Scannet</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">7</div>
          <div className="stat-label">Tidsvinduer</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">3</div>
          <div className="stat-label">Ruter</div>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">Indstillinger</div>
        <div className="settings-item">
          <div className="settings-icon green">{Icons.shield}</div>
          <div>
            <div className="settings-text">Privatliv & GDPR</div>
            <div className="settings-sub">Eksporter data · Slet konto</div>
          </div>
        </div>
        <div className="settings-item">
          <div className="settings-icon gold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <div className="settings-text">Generelt</div>
            <div className="settings-sub">Sprog · Offline · Notifikationer</div>
          </div>
        </div>
        <div className="settings-item">
          <div className="settings-icon green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          </div>
          <div>
            <div className="settings-text">Institutioner</div>
            <div className="settings-sub">Lærer-portal · Kurator-adgang</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---
export default function MindSTEN() {
  const [onboarded, setOnboarded] = useState(false);
  const [tab, setTab] = useState("home");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showTimeWindow, setShowTimeWindow] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const screenRef = useRef(null);

  const scrollTop = useCallback(() => {
    if (screenRef.current) screenRef.current.scrollTop = 0;
  }, []);

  const openPerson = (p) => {
    setSelectedPerson(p);
    setShowTimeWindow(false);
    setShowScanner(false);
    scrollTop();
  };

  const openScanner = () => {
    setShowScanner(true);
    setSelectedPerson(null);
    setShowTimeWindow(false);
  };

  const handleScanResult = (p) => {
    if (p) openPerson(p);
    else setShowScanner(false);
  };

  const goBack = () => {
    if (showTimeWindow) { setShowTimeWindow(false); scrollTop(); }
    else if (selectedPerson) { setSelectedPerson(null); scrollTop(); }
    else if (showScanner) setShowScanner(false);
  };

  const renderScreen = () => {
    if (showScanner) return <ScannerScreen onResult={handleScanResult} />;
    if (showTimeWindow && selectedPerson) return <TimeWindowScreen person={selectedPerson} onBack={goBack} />;
    if (selectedPerson) return <PersonProfile person={selectedPerson} onBack={goBack} onTimeWindow={() => { setShowTimeWindow(true); scrollTop(); }} />;
    if (tab === "home") return <HomeScreen onSelectPerson={openPerson} onSelectRoute={() => {}} />;
    if (tab === "map") return <MapScreen onSelectPerson={openPerson} />;
    if (tab === "profile") return <ProfileTab />;
    return null;
  };

  return (
    <div className="mindsten-root">
      <style>{css}</style>

      <div className="badge-row">
        <span className="badge-pill">Prototype</span>
        <span className="badge-pill">React · Interaktiv</span>
      </div>
      <div className="hero-title">Mind<span>STEN</span></div>
      <div className="hero-sub">Bring fortiden til live, én sten ad gangen.</div>

      <div className="phone-frame">
        <div className="phone-notch" />

        {!onboarded && <Onboarding onDone={() => setOnboarded(true)} />}

        <div className="screen" ref={screenRef}>
          {renderScreen()}
        </div>

        {onboarded && !showScanner && (
          <div className="tab-bar">
            <button className={`tab-btn ${tab === "home" && !selectedPerson ? "active" : ""}`} onClick={() => { setTab("home"); setSelectedPerson(null); setShowTimeWindow(false); scrollTop(); }}>
              {Icons.home}<span>Hjem</span>
            </button>
            <button className={`tab-btn ${tab === "map" && !selectedPerson ? "active" : ""}`} onClick={() => { setTab("map"); setSelectedPerson(null); setShowTimeWindow(false); scrollTop(); }}>
              {Icons.map}<span>Kort</span>
            </button>
            <button className="scan-tab-btn" onClick={openScanner}>
              {Icons.scan}
            </button>
            <button className={`tab-btn ${tab === "profile" && !selectedPerson ? "active" : ""}`} onClick={() => { setTab("profile"); setSelectedPerson(null); setShowTimeWindow(false); scrollTop(); }}>
              {Icons.profile}<span>Profil</span>
            </button>
            <button className="tab-btn" style={{ opacity: 0.4 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17.36-5.64l-4.24 4.24m-2.24-2.24L6.64 6.64m0 10.72l4.24-4.24m2.24 2.24l4.24 4.24"/></svg>
              <span>Mere</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
