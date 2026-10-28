/**
 * Layout component that queries for data
 * with Gatsby's StaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/static-query/
 */

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { StaticQuery, graphql, Link } from 'gatsby';
import { useTranslation } from 'react-i18next';

import Header from './header';
import Logo from './Logo';
import '../../static/styles/main.scss';
import { detectLanguage } from '../i18n';

const Layout = ({ children }) => {
  const { t } = useTranslation();
  useEffect(() => {
    detectLanguage();
  }, []);

  return (
    <StaticQuery
      query={graphql`
        query SiteTitleQuery {
          site {
            siteMetadata {
              title
            }
          }
        }
      `}
      render={data => (
        <>
          <a className="skip-link" href="#main-content">
            {t('common.skipToContent')}
          </a>
          <Header siteTitle={data.site.siteMetadata.title} />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <footer>
            <div className={'container'}>
              <div className={'row'}>
                <div className={'col-6'}>
                  <div className={'widget__item'}>
                    <Logo />
                    <div className={'about'}>
                      <p>{t('common.about')}</p>
                    </div>
                  </div>
                </div>

                <div className={'col-6'}>
                  <div className={'widget__item'}>
                    <div className={'links'}>
                      <h2>{t('common.support')}</h2>
                      <ul>
                        <li>
                          <a
                            href="https://github.com/shuowu/yi-note/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            GitHub
                            <span className="visually-hidden">
                              {' '}
                              {t('common.opensInNewTab')}
                            </span>
                          </a>
                        </li>
                        <li>
                          <Link to="/privacy" title={t('privacy.title')}>
                            {t('common.privacy')}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className={'copyright'}>
                <p>
                  {t('common.copyright', { year: new Date().getFullYear() })}
                </p>
              </div>
            </div>
          </footer>
        </>
      )}
    />
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

export default Layout;
