const { EventEmitter } = require('events');

const reviewEmitter = new EventEmitter();
reviewEmitter.setMaxListeners(50);

// Track stats
let stats = {
  reviewsToday: 0,
  totalReviews: 0,
  lastReset: new Date().toDateString(),
};

reviewEmitter.on('review:started', (data) => {
  const today = new Date().toDateString();
  if (stats.lastReset !== today) {
    stats.reviewsToday = 0;
    stats.lastReset = today;
  }
  stats.reviewsToday++;
  stats.totalReviews++;
  console.log(`[EMITTER] review:started — id=${data.id} | today=${stats.reviewsToday}`);
});

reviewEmitter.on('chunk:received', (data) => {
  // Lightweight — just log occasionally
  if (data.chunkIndex % 10 === 0) {
    console.log(`[EMITTER] chunk:received — id=${data.id} chunk#${data.chunkIndex}`);
  }
});

reviewEmitter.on('review:complete', (data) => {
  console.log(`[EMITTER] review:complete — id=${data.id} | chunks=${data.totalChunks}`);
});

reviewEmitter.on('review:error', (data) => {
  console.error(`[EMITTER] review:error — id=${data.id} | ${data.error}`);
});

function getStats() {
  return { ...stats };
}

module.exports = { reviewEmitter, getStats };
