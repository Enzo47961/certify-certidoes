import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export const IconeSelo = (p: P) => (
  <Base {...p}><circle cx="12" cy="10" r="6" /><path d="M9.5 10.2l1.8 1.8 3.4-3.6" /><path d="M8.5 15.2L7 21l5-2.2 5 2.2-1.5-5.8" /></Base>
);
export const IconeMais = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>;
export const IconeBusca = (p: P) => <Base {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Base>;
export const IconeRaio = (p: P) => <Base {...p}><path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" /></Base>;
export const IconeDownload = (p: P) => <Base {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></Base>;
export const IconeUpload = (p: P) => <Base {...p}><path d="M12 20V9M7 13.5l5-5 5 5M5 4h14" /></Base>;
export const IconePasta = (p: P) => <Base {...p}><path d="M3 7.5A1.5 1.5 0 014.5 6h4.3l2 2h8.7A1.5 1.5 0 0121 9.5v8a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5v-10z" /></Base>;
export const IconeEmail = (p: P) => <Base {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></Base>;
export const IconeSino = (p: P) => <Base {...p}><path d="M6 16.5V11a6 6 0 1112 0v5.5l1.5 1.5h-15L6 16.5zM10 20.5a2.2 2.2 0 004 0" /></Base>;
export const IconeLink = (p: P) => <Base {...p}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></Base>;
export const IconeEngrenagem = (p: P) => (
  <Base {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></Base>
);
export const IconeExterno = (p: P) => <Base {...p}><path d="M14 5h5v5M19 5l-8 8M18 14v4.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10" /></Base>;
export const IconeFechar = (p: P) => <Base {...p}><path d="M6 6l12 12M18 6L6 18" /></Base>;
export const IconeCheck = (p: P) => <Base {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Base>;
export const IconeAlerta = (p: P) => <Base {...p}><path d="M12 4l9 16H3l9-16z" /><path d="M12 10v4M12 17.2v.1" /></Base>;
export const IconeRelogio = (p: P) => <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Base>;
export const IconeLixo = (p: P) => <Base {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></Base>;
export const IconeOlho = (p: P) => <Base {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></Base>;
export const IconeCopiar = (p: P) => <Base {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8" /></Base>;
export const IconeSeta = (p: P) => <Base {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Base>;
export const IconeEscudo = (p: P) => <Base {...p}><path d="M12 3l7.5 3v5.5c0 4.5-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5-7.5-9.5V6L12 3z" /></Base>;
export const IconeCarregando = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);
