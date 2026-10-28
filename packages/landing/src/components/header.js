import React from 'react';

import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

import Logo from './Logo';
import chromeLogo from '../../static/images/chrome-48.png';
import firefoxLogo from '../../static/images/firefox-48.png';
import edgeLogo from '../../static/images/microsoft-edge-48.png';

const Header = ({ siteTitle }) => {
  const { t, i18n } = useTranslation('header');
  return (
    <header>
      <div className={'container'}>
        <div className={'top-menu'}>
          <Logo />

          <nav className={'download'} aria-label={t('browserExtensions')}>
            <span>{t('availableOn')}</span>
            <a
              href="https://chrome.google.com/webstore/detail/yinote/fhpgggnmdlmekfdpkdgeiccfkignhkdf"
              aria-label={t('download', { siteTitle, browser: 'Chrome' })}
              title={t('chromeStore')}
            >
              <img src={chromeLogo} alt="" width="32" height="32" />
            </a>
            <a
              href="https://addons.mozilla.org/en-CA/firefox/addon/yinote/"
              aria-label={t('download', { siteTitle, browser: 'Firefox' })}
              title={t('firefoxStore')}
            >
              <img src={firefoxLogo} alt="" width="32" height="32" />
            </a>
            <a
              href="https://microsoftedge.microsoft.com/addons/detail/gieehphfgjfjmeejdohpdiajmicjnfbh"
              aria-label={t('download', {
                siteTitle,
                browser: 'Microsoft Edge'
              })}
              title={t('edgeStore')}
            >
              <img src={edgeLogo} alt="" width="32" height="32" />
            </a>
          </nav>
          <select
            className="language-select"
            aria-label={t('language')}
            value={i18n.language}
            onChange={event => setLanguage(event.target.value)}
          >
            <option value="en" lang="en">
              English
            </option>
            <option value="zh-CN" lang="zh-CN">
              简体中文
            </option>
          </select>
        </div>
      </div>
    </header>
  );
};

Header.propTypes = {
  siteTitle: PropTypes.string
};

Header.defaultProps = {
  siteTitle: `wildframe`
};

export default Header;
