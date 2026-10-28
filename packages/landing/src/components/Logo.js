import React from 'react';
import { Link } from 'gatsby';
import { useTranslation } from 'react-i18next';
import logo from '../../static/images/logo.png';

const Logo = () => {
  const { t } = useTranslation();
  return (
    <div className={'logo'}>
      <Link to="/" aria-label={t('common.home')}>
        <img alt="" src={logo} width="40" height="40" />
        <span>wildframe</span>
      </Link>
    </div>
  );
};

export default Logo;
