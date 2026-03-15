import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4 padding-horiz--sm margin-bottom--sm')}>
      <div className={clsx('glass-card padding--md h-100')} style={{ textAlign: 'left' }}>
        <div className="margin-bottom--sm" style={{ color: 'var(--ifm-color-primary)' }}>
          <Svg role="img" />
        </div>
        <Heading as="h4" style={{ fontSize: '1.1rem', marginBottom: '0.25rem', lineHeight: '1.2' }}>{title}</Heading>
        <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 0, lineHeight: '1.4' }}>{description}</p>
      </div>
    </div>
  );
}

const FeatureList: FeatureItem[] = [
  {
    title: 'Arquitectura Hexagonal',
    Svg: (() => (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.29 7 12 12 20.71 7"></polyline>
        <line x1="12" y1="22" x2="12" y2="12"></line>
      </svg>
    )) as any,
    description: (
      <>Separa el dominio de la infraestructura para un código resiliente y fácil de testear.</>
    ),
  },
  {
    title: 'APIs Reactivas con Mutiny',
    Svg: (() => (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
      </svg>
    )) as any,
    description: (
      <>Domina el flujo asíncrono para manejar miles de peticiones con mínimos recursos.</>
    ),
  },
  {
    title: 'Seguridad & Cloud Native',
    Svg: (() => (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="M12 8v4"></path>
        <path d="M12 16h.01"></path>
      </svg>
    )) as any,
    description: (
      <>Integración avanzada con Keycloak, Redis Cache y patrones de Fault Tolerance.</>
    ),
  },
];

export default function HomepageFeatures(): ReactNode {
  return (
    <div className="row">
      {FeatureList.map((props, idx) => (
        <Feature key={idx} {...props} />
      ))}
    </div>
  );
}
