import React from 'react';
import { Link } from 'gatsby';
import { useTranslation } from 'react-i18next';

import Layout from '../components/layout';
import SEO from '../components/seo';

const NotFoundPage = () => {
  const { t } = useTranslation();
  return (
    <Layout>
      <SEO title={t('notFound.seoTitle')} />
      <div className={'container'}>
        <div className="content">
          <h1>{t('notFound.title')}</h1>
          <p>{t('notFound.description')}</p>
          <Link className="button" to="/">
            {t('notFound.backHome')}
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
