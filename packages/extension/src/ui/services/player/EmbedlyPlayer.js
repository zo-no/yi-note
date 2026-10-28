import Player from './Player';

const PAUSED_STATE_TIMEOUT_MS = 150;

// For Embedly API details, please refer to https://docs.embed.ly/docs/playerjs
export default class YoutubeIframePlayer extends Player {
  #videoEl;
  #player;

  constructor(options = {}) {
    super(options);

    this.#videoEl = options.videoEl;
    // eslint-disable-next-line no-undef
    this.#player = new embedly.Player(this.#videoEl);
    this.#player.on('ready', () => {
      logger.info('Embedly player ready');
    });
  }

  getVideoElement() {
    return this.#videoEl;
  }

  play() {
    this.#player.play();
  }

  pause() {
    this.#player.pause();
  }

  seek(timestamp) {
    const timeToSeek = timestamp - this.seekSeconds;
    this.#player.setCurrentTime(timeToSeek);
  }

  async getPaused() {
    return new Promise(resolve => {
      let timeout;
      const finish = paused => {
        clearTimeout(timeout);
        resolve(typeof paused === 'boolean' ? paused : null);
      };
      try {
        // Before ready, Embedly advertises all methods and queues stale queries.
        if (
          this.#player.isReady === false ||
          typeof this.#player.getPaused !== 'function' ||
          (typeof this.#player.supports === 'function' &&
            this.#player.supports('method', 'getPaused') === false)
        ) {
          resolve(null);
          return;
        }
        timeout = setTimeout(() => finish(null), PAUSED_STATE_TIMEOUT_MS);
        this.#player.getPaused(finish);
      } catch {
        finish(null);
      }
    });
  }

  getCurrentTime() {
    return new Promise(resolve => {
      this.#player.getCurrentTime(currentTime => {
        resolve(Math.floor(currentTime));
      });
    });
  }

  getDuration() {
    return new Promise(resolve => {
      this.#player.getDuration(resolve);
    });
  }
}
