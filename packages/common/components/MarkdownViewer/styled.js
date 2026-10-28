import styled from 'styled-components';
import { tokens } from '../../theme';

export const StyledMarkdownBody = styled.div`
  font-size: ${tokens.fontSizes.compact}px;
  width: 100%;
  min-width: 0;
  word-break: break-word;

  &.markdown-body .octicon {
    display: inline-block;
    fill: currentColor;
    vertical-align: text-bottom;
  }

  &.markdown-body .anchor {
    float: left;
    line-height: 1;
    margin-left: -20px;
    padding-right: 4px;
  }

  &.markdown-body .anchor:focus {
    outline: 2px solid ${tokens.colors.action};
  }

  &.markdown-body h1 .octicon-link,
  &.markdown-body h2 .octicon-link,
  &.markdown-body h3 .octicon-link,
  &.markdown-body h4 .octicon-link,
  &.markdown-body h5 .octicon-link,
  &.markdown-body h6 .octicon-link {
    color: ${tokens.colors.ink};
    vertical-align: middle;
    visibility: hidden;
  }

  &.markdown-body h1:hover .anchor,
  &.markdown-body h2:hover .anchor,
  &.markdown-body h3:hover .anchor,
  &.markdown-body h4:hover .anchor,
  &.markdown-body h5:hover .anchor,
  &.markdown-body h6:hover .anchor {
    text-decoration: none;
  }

  &.markdown-body h1:hover .anchor .octicon-link,
  &.markdown-body h2:hover .anchor .octicon-link,
  &.markdown-body h3:hover .anchor .octicon-link,
  &.markdown-body h4:hover .anchor .octicon-link,
  &.markdown-body h5:hover .anchor .octicon-link,
  &.markdown-body h6:hover .anchor .octicon-link {
    visibility: visible;
  }

  &.markdown-body h1:hover .anchor .octicon-link:before,
  &.markdown-body h2:hover .anchor .octicon-link:before,
  &.markdown-body h3:hover .anchor .octicon-link:before,
  &.markdown-body h4:hover .anchor .octicon-link:before,
  &.markdown-body h5:hover .anchor .octicon-link:before,
  &.markdown-body h6:hover .anchor .octicon-link:before {
    width: 16px;
    height: 16px;
    content: ' ';
    display: inline-block;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' version='1.1' width='16' height='16' aria-hidden='true'%3E%3Cpath fill-rule='evenodd' d='M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z'%3E%3C/path%3E%3C/svg%3E");
  }
  &.markdown-body {
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    line-height: 1.5;
    color: ${tokens.colors.ink};
    font-family: ${tokens.fonts.body};
    font-size: ${tokens.fontSizes.compact}px;
    line-height: 1.6;
    word-wrap: break-word;
  }

  &.markdown-body details {
    display: block;
  }

  &.markdown-body summary {
    display: list-item;
  }

  &.markdown-body a {
    background-color: initial;
  }

  &.markdown-body a:active,
  &.markdown-body a:hover {
    outline-width: 0;
  }

  &.markdown-body strong {
    font-weight: inherit;
    font-weight: bolder;
  }

  &.markdown-body h1 {
    font-size: 32px;
    margin: 0.67em 0;
  }

  &.markdown-body img {
    border-style: none;
  }

  &.markdown-body code,
  &.markdown-body kbd,
  &.markdown-body pre {
    font-family: ${tokens.fonts.mono};
    font-size: 1em;
  }

  &.markdown-body hr {
    box-sizing: initial;
    height: 0;
    overflow: visible;
  }

  &.markdown-body input {
    font: inherit;
    margin: 0;
  }

  &.markdown-body input {
    overflow: visible;
  }

  &.markdown-body [type='checkbox'] {
    box-sizing: border-box;
    padding: 0;
  }

  &.markdown-body * {
    box-sizing: border-box;
  }

  &.markdown-body input {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  &.markdown-body a {
    color: ${tokens.colors.action};
    text-decoration: none;
  }

  &.markdown-body a:hover {
    text-decoration: underline;
  }

  &.markdown-body strong {
    font-weight: 600;
  }

  &.markdown-body hr {
    height: 0;
    margin: 16px 0;
    overflow: hidden;
    background: transparent;
    border: 0;
    border-bottom: 1px solid ${tokens.colors.border};
  }

  &.markdown-body hr:after,
  &.markdown-body hr:before {
    display: table;
    content: '';
  }

  &.markdown-body hr:after {
    clear: both;
  }

  &.markdown-body table {
    border-spacing: 0;
    border-collapse: collapse;
  }

  &.markdown-body td,
  &.markdown-body th {
    padding: 0;
  }

  &.markdown-body details summary {
    cursor: pointer;
  }

  &.markdown-body kbd {
    display: inline-block;
    padding: 4px 8px;
    font-family: ${tokens.fonts.mono};
    font-size: 12px;
    line-height: 1.5;
    color: ${tokens.colors.muted};
    vertical-align: middle;
    background-color: ${tokens.colors.canvas};
    border: 1px solid ${tokens.colors.border};
    border-radius: ${tokens.radius.small}px;
    box-shadow: inset 0 -1px 0 ${tokens.colors.border};
  }

  &.markdown-body h1,
  &.markdown-body h2,
  &.markdown-body h3,
  &.markdown-body h4,
  &.markdown-body h5,
  &.markdown-body h6 {
    margin-top: 0;
    margin-bottom: 0;
  }

  &.markdown-body h1 {
    font-size: 32px;
  }

  &.markdown-body h1,
  &.markdown-body h2 {
    font-weight: 600;
  }

  &.markdown-body h2 {
    font-size: 24px;
  }

  &.markdown-body h3 {
    font-size: 20px;
  }

  &.markdown-body h3,
  &.markdown-body h4 {
    font-weight: 600;
  }

  &.markdown-body h4 {
    font-size: 16px;
  }

  &.markdown-body h5 {
    font-size: 14px;
  }

  &.markdown-body h5,
  &.markdown-body h6 {
    font-weight: 600;
  }

  &.markdown-body h6 {
    font-size: 12px;
  }

  &.markdown-body p {
    margin-top: 0;
    margin-bottom: 10px;
  }

  &.markdown-body blockquote {
    margin: 0;
  }

  &.markdown-body ol,
  &.markdown-body ul {
    padding-left: 0;
    margin-top: 0;
    margin-bottom: 0;
  }

  &.markdown-body ol ol,
  &.markdown-body ul ol {
    list-style-type: lower-roman;
  }

  &.markdown-body ol ol ol,
  &.markdown-body ol ul ol,
  &.markdown-body ul ol ol,
  &.markdown-body ul ul ol {
    list-style-type: lower-alpha;
  }

  &.markdown-body dd {
    margin-left: 0;
  }

  &.markdown-body code,
  &.markdown-body pre {
    font-family: ${tokens.fonts.mono};
    font-size: 12px;
  }

  &.markdown-body pre {
    margin-top: 0;
    margin-bottom: 0;
  }

  &.markdown-body input::-webkit-inner-spin-button,
  &.markdown-body input::-webkit-outer-spin-button {
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
  }

  &.markdown-body :checked + .radio-label {
    position: relative;
    z-index: 1;
    border-color: ${tokens.colors.action};
  }

  &.markdown-body .border {
    border: 1px solid ${tokens.colors.border} !important;
  }

  &.markdown-body .border-0 {
    border: 0 !important;
  }

  &.markdown-body .border-bottom {
    border-bottom: 1px solid ${tokens.colors.border} !important;
  }

  &.markdown-body .rounded-1 {
    border-radius: ${tokens.radius.small}px !important;
  }

  &.markdown-body .bg-white {
    background-color: ${tokens.colors.surface} !important;
  }

  &.markdown-body .bg-gray-light {
    background-color: ${tokens.colors.canvas} !important;
  }

  &.markdown-body .text-gray-light {
    color: ${tokens.colors.muted} !important;
  }

  &.markdown-body .mb-0 {
    margin-bottom: 0 !important;
  }

  &.markdown-body .my-2 {
    margin-top: 8px !important;
    margin-bottom: 8px !important;
  }

  &.markdown-body .pl-0 {
    padding-left: 0 !important;
  }

  &.markdown-body .py-0 {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }

  &.markdown-body .pl-1 {
    padding-left: 4px !important;
  }

  &.markdown-body .pl-2 {
    padding-left: 8px !important;
  }

  &.markdown-body .py-2 {
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  &.markdown-body .pl-3,
  &.markdown-body .px-3 {
    padding-left: 16px !important;
  }

  &.markdown-body .px-3 {
    padding-right: 16px !important;
  }

  &.markdown-body .pl-4 {
    padding-left: 24px !important;
  }

  &.markdown-body .pl-5 {
    padding-left: 32px !important;
  }

  &.markdown-body .pl-6 {
    padding-left: 40px !important;
  }

  &.markdown-body .f6 {
    font-size: 12px !important;
  }

  &.markdown-body .lh-condensed {
    line-height: 1.25 !important;
  }

  &.markdown-body .text-bold {
    font-weight: 600 !important;
  }

  &.markdown-body .pl-c {
    color: ${tokens.colors.muted};
  }

  &.markdown-body .pl-c1,
  &.markdown-body .pl-s .pl-v {
    color: ${tokens.colors.action};
  }

  &.markdown-body .pl-e,
  &.markdown-body .pl-en {
    color: ${tokens.colors.action};
  }

  &.markdown-body .pl-s .pl-s1,
  &.markdown-body .pl-smi {
    color: ${tokens.colors.ink};
  }

  &.markdown-body .pl-ent {
    color: ${tokens.colors.success};
  }

  &.markdown-body .pl-k {
    color: ${tokens.colors.action};
  }

  &.markdown-body .pl-pds,
  &.markdown-body .pl-s,
  &.markdown-body .pl-s .pl-pse .pl-s1,
  &.markdown-body .pl-sr,
  &.markdown-body .pl-sr .pl-cce,
  &.markdown-body .pl-sr .pl-sra,
  &.markdown-body .pl-sr .pl-sre {
    color: ${tokens.colors.ink};
  }

  &.markdown-body .pl-smw,
  &.markdown-body .pl-v {
    color: ${tokens.colors.warning};
  }

  &.markdown-body .pl-bu {
    color: ${tokens.colors.error};
  }

  &.markdown-body .pl-ii {
    color: ${tokens.colors.canvas};
    background-color: ${tokens.colors.error};
  }

  &.markdown-body .pl-c2 {
    color: ${tokens.colors.canvas};
    background-color: ${tokens.colors.action};
  }

  &.markdown-body .pl-c2:before {
    content: '^M';
  }

  &.markdown-body .pl-sr .pl-cce {
    font-weight: 700;
    color: ${tokens.colors.success};
  }

  &.markdown-body .pl-ml {
    color: ${tokens.colors.warning};
  }

  &.markdown-body .pl-mh,
  &.markdown-body .pl-mh .pl-en,
  &.markdown-body .pl-ms {
    font-weight: 700;
    color: ${tokens.colors.action};
  }

  &.markdown-body .pl-mi {
    font-style: italic;
    color: ${tokens.colors.ink};
  }

  &.markdown-body .pl-mb {
    font-weight: 700;
    color: ${tokens.colors.ink};
  }

  &.markdown-body .pl-md {
    color: ${tokens.colors.error};
    background-color: ${tokens.colors.canvas};
  }

  &.markdown-body .pl-mi1 {
    color: ${tokens.colors.success};
    background-color: ${tokens.colors.canvas};
  }

  &.markdown-body .pl-mc {
    color: ${tokens.colors.warning};
    background-color: ${tokens.colors.canvas};
  }

  &.markdown-body .pl-mi2 {
    color: ${tokens.colors.canvas};
    background-color: ${tokens.colors.action};
  }

  &.markdown-body .pl-mdr {
    font-weight: 700;
    color: ${tokens.colors.action};
  }

  &.markdown-body .pl-ba {
    color: ${tokens.colors.muted};
  }

  &.markdown-body .pl-sg {
    color: ${tokens.colors.muted};
  }

  &.markdown-body .pl-corl {
    text-decoration: underline;
    color: ${tokens.colors.ink};
  }

  &.markdown-body .mb-0 {
    margin-bottom: 0 !important;
  }

  &.markdown-body .my-2 {
    margin-bottom: 8px !important;
  }

  &.markdown-body .my-2 {
    margin-top: 8px !important;
  }

  &.markdown-body .pl-0 {
    padding-left: 0 !important;
  }

  &.markdown-body .py-0 {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }

  &.markdown-body .pl-1 {
    padding-left: 4px !important;
  }

  &.markdown-body .pl-2 {
    padding-left: 8px !important;
  }

  &.markdown-body .py-2 {
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  &.markdown-body .pl-3 {
    padding-left: 16px !important;
  }

  &.markdown-body .pl-4 {
    padding-left: 24px !important;
  }

  &.markdown-body .pl-5 {
    padding-left: 32px !important;
  }

  &.markdown-body .pl-6 {
    padding-left: 40px !important;
  }

  &.markdown-body .pl-7 {
    padding-left: 48px !important;
  }

  &.markdown-body .pl-8 {
    padding-left: 64px !important;
  }

  &.markdown-body .pl-9 {
    padding-left: 80px !important;
  }

  &.markdown-body .pl-10 {
    padding-left: 96px !important;
  }

  &.markdown-body .pl-11 {
    padding-left: 112px !important;
  }

  &.markdown-body .pl-12 {
    padding-left: 128px !important;
  }

  &.markdown-body hr {
    border-bottom-color: ${tokens.colors.border};
  }

  &.markdown-body kbd {
    display: inline-block;
    padding: 4px 8px;
    font-family: ${tokens.fonts.mono};
    font-size: 12px;
    line-height: 1.5;
    color: ${tokens.colors.muted};
    vertical-align: middle;
    background-color: ${tokens.colors.canvas};
    border: 1px solid ${tokens.colors.border};
    border-radius: ${tokens.radius.small}px;
    box-shadow: inset 0 -1px 0 ${tokens.colors.border};
  }

  &.markdown-body:after,
  &.markdown-body:before {
    display: table;
    content: '';
  }

  &.markdown-body:after {
    clear: both;
  }

  &.markdown-body > :first-child {
    margin-top: 0 !important;
  }

  &.markdown-body > :last-child {
    margin-bottom: 0 !important;
  }

  &.markdown-body a:not([href]) {
    color: inherit;
    text-decoration: none;
  }

  &.markdown-body blockquote,
  &.markdown-body details,
  &.markdown-body dl,
  &.markdown-body ol,
  &.markdown-body p,
  &.markdown-body pre,
  &.markdown-body table,
  &.markdown-body ul {
    margin-top: 0;
    margin-bottom: 16px;
  }

  &.markdown-body hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: ${tokens.colors.border};
    border: 0;
  }

  &.markdown-body blockquote {
    padding: 0 1em;
    color: ${tokens.colors.muted};
    border-left: 4px solid ${tokens.colors.sage};
  }

  &.markdown-body blockquote > :first-child {
    margin-top: 0;
  }

  &.markdown-body blockquote > :last-child {
    margin-bottom: 0;
  }

  &.markdown-body h1,
  &.markdown-body h2,
  &.markdown-body h3,
  &.markdown-body h4,
  &.markdown-body h5,
  &.markdown-body h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-family: ${tokens.fonts.heading};
    font-weight: 600;
    line-height: 1.25;
  }

  &.markdown-body h1 {
    font-size: 32px;
  }

  &.markdown-body h1,
  &.markdown-body h2 {
    padding-bottom: 0.3em;
    border-bottom: 1px solid ${tokens.colors.border};
  }

  &.markdown-body h2 {
    font-size: 28px;
  }

  &.markdown-body h3 {
    font-size: 24px;
  }

  &.markdown-body h4 {
    font-size: 24px;
  }

  &.markdown-body h5 {
    font-size: 24px;
  }

  &.markdown-body h6 {
    font-size: 24px;
    color: ${tokens.colors.muted};
  }

  &.markdown-body ol,
  &.markdown-body ul {
    padding-left: 2em;
  }

  &.markdown-body ol ol,
  &.markdown-body ol ul,
  &.markdown-body ul ol,
  &.markdown-body ul ul {
    margin-top: 0;
    margin-bottom: 0;
  }

  &.markdown-body li {
    word-wrap: break-all;
  }

  &.markdown-body li > p {
    margin-top: 16px;
  }

  &.markdown-body li + li {
    margin-top: 0.25em;
  }

  &.markdown-body dl {
    padding: 0;
  }

  &.markdown-body dl dt {
    padding: 0;
    margin-top: 16px;
    font-size: 1em;
    font-style: italic;
    font-weight: 600;
  }

  &.markdown-body dl dd {
    padding: 0 16px;
    margin-bottom: 16px;
  }

  &.markdown-body table {
    display: block;
    width: 100%;
    overflow: auto;
  }

  &.markdown-body table th {
    font-weight: 600;
  }

  &.markdown-body table td,
  &.markdown-body table th {
    padding: 8px 16px;
    border: 1px solid ${tokens.colors.border};
  }

  &.markdown-body table tr {
    background-color: ${tokens.colors.surface};
    border-top: 1px solid ${tokens.colors.border};
  }

  &.markdown-body table tr:nth-child(2n) {
    background-color: ${tokens.colors.canvas};
  }

  &.markdown-body img {
    max-width: 100%;
    box-sizing: initial;
    background-color: ${tokens.colors.surface};
  }

  &.markdown-body img[align='right'] {
    padding-left: 20px;
  }

  &.markdown-body img[align='left'] {
    padding-right: 20px;
  }

  &.markdown-body code {
    padding: 0.2em 0.4em;
    margin: 0;
    font-size: 85%;
    background-color: ${tokens.colors.hover};
    border-radius: ${tokens.radius.small}px;
  }

  &.markdown-body pre {
    word-wrap: normal;
  }

  &.markdown-body pre > code {
    padding: 0;
    margin: 0;
    font-size: 100%;
    word-break: normal;
    white-space: pre;
    background: transparent;
    border: 0;
  }

  &.markdown-body .highlight {
    margin-bottom: 16px;
  }

  &.markdown-body .highlight pre {
    margin-bottom: 0;
    word-break: normal;
  }

  &.markdown-body .highlight pre,
  &.markdown-body pre {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background-color: ${tokens.colors.canvas};
    border-radius: ${tokens.radius.small}px;
  }

  &.markdown-body pre code {
    display: inline;
    max-width: auto;
    padding: 0;
    margin: 0;
    overflow: visible;
    line-height: inherit;
    word-wrap: normal;
    background-color: initial;
    border: 0;
  }

  &.markdown-body .commit-tease-sha {
    display: inline-block;
    font-family: ${tokens.fonts.mono};
    font-size: 90%;
    color: ${tokens.colors.muted};
  }

  &.markdown-body .full-commit .btn-outline:not(:disabled):hover {
    color: ${tokens.colors.action};
    border-color: ${tokens.colors.action};
  }

  &.markdown-body .blob-wrapper {
    overflow-x: auto;
    overflow-y: hidden;
  }

  &.markdown-body .blob-wrapper-embedded {
    max-height: 240px;
    overflow-y: auto;
  }

  &.markdown-body .blob-num {
    width: 1%;
    min-width: 50px;
    padding-right: 10px;
    padding-left: 10px;
    font-family: ${tokens.fonts.mono};
    font-size: 12px;
    line-height: 20px;
    color: ${tokens.colors.muted};
    text-align: right;
    white-space: nowrap;
    vertical-align: top;
    cursor: pointer;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  &.markdown-body .blob-num:hover {
    color: ${tokens.colors.action};
  }

  &.markdown-body .blob-num:before {
    content: attr(data-line-number);
  }

  &.markdown-body .blob-code {
    position: relative;
    padding-right: 10px;
    padding-left: 10px;
    line-height: 20px;
    vertical-align: top;
  }

  &.markdown-body .blob-code-inner {
    overflow: visible;
    font-family: ${tokens.fonts.mono};
    font-size: 12px;
    color: ${tokens.colors.ink};
    word-wrap: normal;
    white-space: pre;
  }

  &.markdown-body .pl-token.active,
  &.markdown-body .pl-token:hover {
    cursor: pointer;
    background: ${tokens.colors.selected};
  }

  &.markdown-body .tab-size[data-tab-size='1'] {
    -moz-tab-size: 1;
    tab-size: 1;
  }

  &.markdown-body .tab-size[data-tab-size='2'] {
    -moz-tab-size: 2;
    tab-size: 2;
  }

  &.markdown-body .tab-size[data-tab-size='3'] {
    -moz-tab-size: 3;
    tab-size: 3;
  }

  &.markdown-body .tab-size[data-tab-size='4'] {
    -moz-tab-size: 4;
    tab-size: 4;
  }

  &.markdown-body .tab-size[data-tab-size='5'] {
    -moz-tab-size: 5;
    tab-size: 5;
  }

  &.markdown-body .tab-size[data-tab-size='6'] {
    -moz-tab-size: 6;
    tab-size: 6;
  }

  &.markdown-body .tab-size[data-tab-size='7'] {
    -moz-tab-size: 7;
    tab-size: 7;
  }

  &.markdown-body .tab-size[data-tab-size='8'] {
    -moz-tab-size: 8;
    tab-size: 8;
  }

  &.markdown-body .tab-size[data-tab-size='9'] {
    -moz-tab-size: 9;
    tab-size: 9;
  }

  &.markdown-body .tab-size[data-tab-size='10'] {
    -moz-tab-size: 10;
    tab-size: 10;
  }

  &.markdown-body .tab-size[data-tab-size='11'] {
    -moz-tab-size: 11;
    tab-size: 11;
  }

  &.markdown-body .tab-size[data-tab-size='12'] {
    -moz-tab-size: 12;
    tab-size: 12;
  }

  &.markdown-body .task-list-item {
    list-style-type: none;
  }

  &.markdown-body .task-list-item + .task-list-item {
    margin-top: 3px;
  }

  &.markdown-body .task-list-item input {
    margin: 0 0.2em 0.25em -1.6em;
    vertical-align: middle;
  }
`;
