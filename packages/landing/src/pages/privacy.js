import React from 'react';
import { useTranslation } from 'react-i18next';

import Layout from '../components/layout';
import SEO from '../components/seo';

const PrivacyPage = () => {
  const { t } = useTranslation();
  const sections = t('privacy.sections', { returnObjects: true });

  return (
    <Layout>
      <SEO title={t('privacy.title')} />
      <div className={'container'}>
        <div className={'content'}>
          <div className={'title'}>
            <h1>{t('privacy.title')}</h1>
          </div>
          <p>{t('privacy.intro')}</p>
          {sections.map((section, index) => (
            <React.Fragment key={index}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              {section.items && (
                <ul>
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <i>{item.title}</i>
                      <br />
                      {item.body}
                    </li>
                  ))}
                </ul>
              )}
            </React.Fragment>
          ))}
          <p>{t('privacy.updated')}</p>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPage;
