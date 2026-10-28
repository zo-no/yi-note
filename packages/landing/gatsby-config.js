module.exports = {
  siteMetadata: {
    title: `wildframe`,
    description: `Keep the moments that matter with wildframe. Take and share timestamped notes while watching online videos.`,
    author: `@shuowu`
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/static/images`
      }
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `wildframe`,
        short_name: `wildframe`,
        start_url: `/`,
        background_color: `#F3EFE6`,
        theme_color: `#97513D`,
        display: `minimal-ui`,
        icon: `${__dirname}/static/images/favicon.png`
      }
    },
    `gatsby-plugin-sass`,
    {
      resolve: 'gatsby-plugin-web-font-loader',
      options: {
        custom: {
          families: ['Inter'],
          urls: ['/fonts/fonts.css']
        }
      }
    }
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
  ]
};
