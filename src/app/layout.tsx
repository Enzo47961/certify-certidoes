import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

const titulo = Manrope({ subsets: ['latin'], variable: '--fonte-titulo', display: 'swap', weight: ['600', '700', '800'] });
const texto = Inter({ subsets: ['latin'], variable: '--fonte-texto', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'CERTIFY · Certidões em dia', template: '%s · CERTIFY' },
  description:
    'Informe o CNPJ e acompanhe as certidões fiscais e jurídicas da empresa num só painel: Federal, FGTS, Trabalhista, Estadual, Municipal, Falência e TCU. Alertas de vencimento, e-mail semanal, pasta ZIP e integração.',
  applicationName: 'CERTIFY',
};

export const viewport: Viewport = { themeColor: '#0f3d3e', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
