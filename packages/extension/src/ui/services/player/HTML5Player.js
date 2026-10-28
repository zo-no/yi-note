import Player from './Player';

export default class HTML5Player extends Player {
  /**
   * Create a HTML5Player. Set first find element by selector as video element.
   *
   * @param {object} [options]
   * @param {string} [options.videoEl] - video element
   * @param {string} [options.selector] - Css selector to identify video element.
   * @throws {Error} - throws error if video element not be found.
   */
  constructor(options = {}) {
    super(options);

    const { videoEl, selector } = options;
    this.video = videoEl || document.querySelector(selector || 'video');
    if (!this.video) {
      throw new Error('Player initial error');
    }

    // TODO: move to InstagramPlayer class
    // Set crossorigin attribute to enable screenshot
    // this.video.setAttribute('crossorigin', 'anonymous');
    // this.video.load();
  }

  getVideoElement() {
    return this.video;
  }

  play() {
    return this.video.play();
  }

  pause() {
    return this.video.pause();
  }

  seek(timestamp) {
    const timeToSeek = timestamp - this.seekSeconds;
    this.video.currentTime = timeToSeek >= 0 ? timeToSeek : 0;
  }

  async getPaused() {
    try {
      if (this.video.ended) return null;
      const paused = this.video.paused;
      return typeof paused === 'boolean' ? paused : null;
    } catch {
      return null;
    }
  }

  async getCurrentTime() {
    return Promise.resolve(Math.floor(this.video.currentTime));
  }

  async getDuration() {
    return Promise.resolve(this.video.duration);
  }
}
