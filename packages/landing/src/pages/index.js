import React from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout';
import SEO from '../components/seo';
import featureImage from '../../static/images/hero.png';

const IndexPage = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <SEO title={t('home.seoTitle')} />
      <section className={'page-header home'} aria-labelledby="hero-title">
        <div className="container">
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1 id="hero-title">{t('home.title')}</h1>
          <p className="hero-description">{t('home.description')}</p>
          <div className="hero-actions">
            <a
              className="button"
              href="https://chrome.google.com/webstore/detail/yinote/fhpgggnmdlmekfdpkdgeiccfkignhkdf"
            >
              {t('home.downloadChrome')}
            </a>
            <a href="https://addons.mozilla.org/en-CA/firefox/addon/yinote/">
              Firefox
            </a>
            <a href="https://microsoftedge.microsoft.com/addons/detail/gieehphfgjfjmeejdohpdiajmicjnfbh">
              Microsoft Edge
            </a>
          </div>
          <figure className="product-preview">
            <img alt={t('home.heroAlt')} src={featureImage} />
            <figcaption>{t('home.caption')}</figcaption>
          </figure>
        </div>
      </section>
    </Layout>
  );
};

export default IndexPage;
