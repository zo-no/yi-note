import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useStoreState, useStoreActions } from 'easy-peasy';
import {
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@material-ui/core';
import {
  OpenInNew as OpenInNewIcon,
  PictureAsPdfOutlined as PDFIcon,
  LocalOfferOutlined as TagIcon,
  GetApp as ExportIcon
} from '@material-ui/icons';
import {
  EvernoteIcon,
  GoogleDocsIcon,
  OneNoteIcon,
  MarkdownIcon
} from '@yi-note/common/icons';
import {
  pdf as PDFService,
  file as FileService,
  integration as IntegrationService,
  markdown as MarkdownService
} from '@yi-note/common/services';
import { capitalize } from '@yi-note/common/utils';
import { APP_ID } from '@yi-note/common/constants';

const StyledToolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  color: ${props => props.theme.tokens.colors.ink};

  & button {
    padding: 8px;
  }

  & svg {
    width: 20px;
    height: 20px;
  }
`;

const Toolbar = () => {
  const { t } = useTranslation('options');
  const [exportAnchor, setExportAnchor] = useState(null);
  const {
    data: { id, meta = {}, notes }
  } = useStoreState(state => state.page);
  const {
    tagDialog: { setOpen: setTagDialogOpen },
    alerts: { show: showAlerts },
    app: {
      setProgress,
      snackbar: { setStates: setSnackbar }
    }
  } = useStoreActions(actions => actions);

  const handleAddTag = () => {
    setTagDialogOpen(true);
  };

  const handleGeneratePDF = async () => {
    const generator = new PDFService();
    const blob = await generator.getBlobOutput({
      url: meta.url,
      title: meta.title,
      notes
    });
    await FileService.exportFile(blob, `${APP_ID}_${id}.pdf`);
  };

  const handleSendNotesToService = namespace => {
    const className = capitalize(namespace);
    const service = new IntegrationService[className](namespace, {
      id,
      meta,
      notes
    });

    const send = () => {
      setProgress(true);
      return service
        .sendNotes()
        .then(res => {
          logger.info(`Sent notes to ${namespace}`, res);
          setSnackbar({
            open: true,
            message: t('services:success'),
            severity: 'success'
          });
          setProgress(false);
        })
        .catch(err => {
          logger.error(err);
          setSnackbar({
            open: true,
            message: t('services:error'),
            severity: 'error'
          });
          setProgress(false);
        });
    };

    service.getExistingId().then(id => {
      if (id) {
        showAlerts({
          content: t('services:exist.message', {
            service: t(`services:${namespace}`)
          }),
          onConfirm: send
        });
      } else {
        send();
      }
    });
  };

  const handleExportMarkdown = () => {
    const data = MarkdownService.pagesToMarkdown([{ meta, notes }]);

    // Removing notifications count and " - Youtube" at the end
    const fileName = meta.title
      .replace(/^\(.*\) /g, '')
      .replace(/ - YouTube$/g, '');

    return FileService.exportMarkdownFile(data, `${fileName}.md`);
  };

  const handleOpenPage = () => {
    window.open(meta.url, '_blank');
  };

  const exportItems = [
    { key: 'page.pdf.tooltip', icon: <PDFIcon />, run: handleGeneratePDF },
    {
      key: 'page.export.markdown.tooltip',
      icon: <MarkdownIcon fill="currentColor" />,
      run: handleExportMarkdown
    },
    {
      key: 'page.evernote.tooltip',
      icon: <EvernoteIcon fill="currentColor" />,
      run: () => handleSendNotesToService('evernote')
    },
    {
      key: 'page.googledocs.tooltip',
      icon: <GoogleDocsIcon fill="currentColor" />,
      run: () => handleSendNotesToService('googledocs')
    },
    {
      key: 'page.onenote.tooltip',
      icon: <OneNoteIcon fill="currentColor" />,
      run: () => handleSendNotesToService('onenote')
    }
  ];

  return (
    <StyledToolbar>
      <Tooltip title={t('page.tag.tooltip')}>
        <IconButton
          color="inherit"
          aria-label={t('page.tag.tooltip')}
          onClick={handleAddTag}
        >
          <TagIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('page.export.menu')}>
        <IconButton
          color="inherit"
          aria-label={t('page.export.menu')}
          aria-haspopup="true"
          aria-expanded={!!exportAnchor}
          aria-controls={exportAnchor ? 'page-export-menu' : undefined}
          onClick={event => setExportAnchor(event.currentTarget)}
        >
          <ExportIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="page-export-menu"
        anchorEl={exportAnchor}
        open={!!exportAnchor}
        onClose={() => setExportAnchor(null)}
        getContentAnchorEl={null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        MenuListProps={{ 'aria-label': t('page.export.menu') }}
      >
        {exportItems.map(item => (
          <MenuItem
            key={item.key}
            onClick={() => {
              setExportAnchor(null);
              item.run();
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={t(item.key)} />
          </MenuItem>
        ))}
      </Menu>
      <Tooltip title={t('page.open.tooltip')}>
        <IconButton
          color="inherit"
          aria-label={t('page.open.tooltip')}
          onClick={handleOpenPage}
        >
          <OpenInNewIcon />
        </IconButton>
      </Tooltip>
    </StyledToolbar>
  );
};

export default Toolbar;
