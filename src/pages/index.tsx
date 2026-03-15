import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className="row align-items-center">
          <div className="col col--6">
            <h1 className="hero__title" style={{ fontSize: '3.5rem', lineHeight: '1.1' }}>
              Backend Java con Quarkus <span className="text-gradient">Masterclass</span>
            </h1>
            <p className="hero__subtitle" style={{ fontSize: '1.25rem', opacity: 0.8, marginTop: '1.5rem', maxWidth: '540px' }}>
              Construye Microservicios Modernos, Seguros y Resilientes. Domina el ciclo completo de desarrollo profesional con Arquitectura Hexagonal y Programación Reactiva.
            </p>
            <div className={styles.buttons} style={{ marginTop: '2.5rem', marginBottom: '3rem' }}>
              <Link
                className="button premium-button button--lg"
                to="/docs/backend-java-quarkus/intro">
                Comenzar Masterclass
              </Link>
            </div>
            <div className="margin-top--md">
              <HomepageFeatures />
            </div>
          </div>
          <div className="col col--6">
            <div className={styles.imageWrapper}>
              <img
                src="img/hero-tech.png"
                alt="Architecture Illustration"
                style={{
                  borderRadius: '24px',
                  width: '100%',
                  height: 'auto',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Advanced Backend Engineering with Java, Quarkus, Clean Architecture & Reactive systems.">
      <HomepageHeader />
    </Layout>
  );
}
