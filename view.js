'use strict';

const viewDialog = document.querySelector('#view-dialog');
const recordButton = document.querySelector('#record-video');
const cancelButton = document.querySelector('#cancel-recording');
const exportStatus = document.querySelector('#export-status');
const videoResult = document.querySelector('#video-result');
const videoPreview = document.querySelector('#video-preview');
let exportJob = null, videoFile = null, videoURL = null;
window.exportInProgress = false;

const canRecord = typeof MediaRecorder !== 'undefined' && typeof canvas.captureStream === 'function';
if (!canRecord) {
  recordButton.disabled = true;
  exportStatus.textContent = 'Этот браузер не поддерживает запись. Открой страницу в Safari или Chrome.';
}
if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
  document.querySelector('#install-hint').textContent = 'Ёлка уже открыта без панелей браузера. Для ролика без системных значков сохрани видео ниже.';
}
document.querySelector('#screen-button').onclick = fullscreen;
document.querySelector('#save-button').onclick = () => viewDialog.showModal();
document.querySelector('#close-view').onclick = () => viewDialog.close();
viewDialog.addEventListener('close', () => { cancelExport(); videoPreview.pause(); });

const exportColors = {
  'tok-comment': '#667a8d', 'tok-string': '#adc891', 'tok-keyword': '#d68ca4',
  'tok-number': '#e0ab85', 'tok-function': '#8ec4d7',
};
const exportLines = source.map(line => [...highlight(line).childNodes].map(node => ({
  text: node.textContent, color: exportColors[node.className] || '#bcc7d7',
})));

function drawVideoFrame(output, treeSurface, time) {
  renderScene(time, treeSurface, 1080, 1344, 1);
  const paint = output.getContext('2d');
  paint.drawImage(treeSurface, 0, 0);
  paint.fillStyle = '#0a0e15'; paint.fillRect(0, 1344, 1080, 576);
  paint.fillStyle = '#10141f'; paint.fillRect(0, 1344, 1080, 48);
  paint.textAlign = 'left'; paint.textBaseline = 'middle';
  paint.font = '18px monospace'; paint.fillStyle = '#c4cbd5';
  paint.fillText('christmas_tree.js', 26, 1368);
  const lineHeight = 32, viewportHeight = 528;
  const offset = Math.max(0, codeLineAt(time) * lineHeight + Math.max(0, time - 18) * 12 - viewportHeight * .25);
  const firstLine = Math.floor(offset / lineHeight);
  const fraction = offset % lineHeight;
  paint.save(); paint.beginPath(); paint.rect(0, 1392, 1080, 528); paint.clip();
  paint.fillStyle = '#8e97ba10'; paint.fillRect(0, 1392 + viewportHeight * .25, 1080, lineHeight);
  paint.font = '19px monospace';
  for (let row = 0; row < 19; row++) {
    const index = (firstLine + row) % source.length;
    const y = 1392 + row * lineHeight - fraction + 16;
    paint.textAlign = 'right'; paint.fillStyle = '#4f5d70';
    paint.fillText(String(index + 1), 52, y);
    paint.textAlign = 'left'; let x = 76;
    for (const token of exportLines[index]) {
      paint.fillStyle = token.color; paint.fillText(token.text, x, y);
      x += paint.measureText(token.text).width;
    }
  }
  paint.restore();
}

async function createVideo() {
  if (exportJob || !canRecord) return;
  const output = document.createElement('canvas'); output.width = 1080; output.height = 1920;
  const treeSurface = document.createElement('canvas'); treeSurface.width = 1080; treeSurface.height = 1344;
  const job = { cancelled: false, error: null, frame: 0, stream: null, recorder: null, wakeLock: null };
  exportJob = job; window.exportInProgress = true;
  recordButton.disabled = true; cancelButton.hidden = false; videoResult.hidden = true;
  exportStatus.textContent = 'Создаю видео… 0 / 20 с. Не закрывай вкладку.';
  let chunks = [];
  function finish() {
    if (job.finished) return;
    job.finished = true;
    cancelAnimationFrame(job.frame);
    job.stream?.getTracks().forEach(track => track.stop());
    job.wakeLock?.release().catch(() => {});
    groundCache.delete(treeSurface);
    exportJob = null; window.exportInProgress = false; last = 0;
    recordButton.disabled = false; cancelButton.hidden = true;
    if (job.error || job.cancelled) {
      exportStatus.textContent = job.error || 'Запись отменена.';
      videoResult.hidden = !videoFile;
      return;
    }
    const mime = job.recorder.mimeType || chunks[0]?.type || 'video/webm';
    const blob = new Blob(chunks, { type: mime });
    if (blob.size < 1000) { exportStatus.textContent = 'Видео не записалось. Попробуй открыть страницу в Safari или Chrome.'; return; }
    const extension = mime.includes('mp4') ? 'mp4' : 'webm';
    videoFile = new File([blob], `ascii-christmas-1080p.${extension}`, { type: mime.split(';')[0] });
    if (videoURL) URL.revokeObjectURL(videoURL);
    videoURL = URL.createObjectURL(videoFile);
    document.querySelector('#fullscreen-video').disabled = true;
    videoPreview.onloadedmetadata = () => { document.querySelector('#fullscreen-video').disabled = false; };
    videoPreview.src = videoURL;
    videoResult.hidden = false;
    exportStatus.textContent = `Готово: 1080 × 1920, ${extension.toUpperCase()}. Можно сохранить или открыть на весь экран.`;
    recordButton.textContent = 'Создать заново';
  }
  try {
    drawVideoFrame(output, treeSurface, 0);
    job.stream = output.captureStream(30);
    const types = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
    job.recorder = new MediaRecorder(job.stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 16000000 });
    job.recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    job.recorder.onstop = finish;
    job.recorder.onerror = () => {
      job.error = 'Браузер не смог записать видео. Попробуй ещё раз в Safari или Chrome.';
      if (job.recorder.state !== 'inactive') job.recorder.stop(); else finish();
    };
    job.recorder.start(1000);
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(lock => {
      if (exportJob === job) job.wakeLock = lock; else lock.release();
    }).catch(() => {});
    const start = performance.now(); let lastFrame = 0, second = -1;
    function frame(now) {
      if (exportJob !== job || job.cancelled) return;
      const elapsed = Math.min(20, (now - start) / 1000);
      if (now - lastFrame >= 1000 / 30 - .5) {
        drawVideoFrame(output, treeSurface, elapsed); lastFrame = now;
        if (Math.floor(elapsed) !== second) {
          second = Math.floor(elapsed);
          exportStatus.textContent = `Создаю видео… ${second} / 20 с. Не закрывай вкладку.`;
        }
      }
      if (elapsed >= 20) { job.recorder.stop(); return; }
      job.frame = requestAnimationFrame(frame);
    }
    job.frame = requestAnimationFrame(frame);
  } catch (error) {
    job.error = 'Не удалось начать запись. Попробуй открыть страницу в Safari или Chrome.';
    if (job.recorder?.state === 'recording') job.recorder.stop(); else finish();
  }
}
function cancelExport(message) {
  if (!exportJob) return;
  exportJob.cancelled = true;
  if (message) exportJob.error = message;
  if (exportJob.recorder?.state !== 'inactive') exportJob.recorder?.stop();
}
recordButton.onclick = createVideo;
cancelButton.onclick = () => cancelExport();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelExport('Запись прервалась при переключении вкладки. Оставь страницу открытой и попробуй снова.');
});
document.querySelector('#share-video').onclick = async () => {
  if (!videoFile) return;
  if (navigator.canShare?.({ files: [videoFile] })) {
    try { await navigator.share({ files: [videoFile], title: 'ASCII Christmas' }); return; }
    catch (error) { if (error.name === 'AbortError') return; }
  }
  const link = document.createElement('a'); link.href = videoURL; link.download = videoFile.name;
  document.body.append(link); link.click(); link.remove();
};
document.querySelector('#fullscreen-video').onclick = () => {
  if (!videoPreview.src) return;
  videoPreview.play().catch(() => {});
  if (videoPreview.webkitEnterFullscreen) videoPreview.webkitEnterFullscreen();
  else if (videoPreview.requestFullscreen) videoPreview.requestFullscreen().catch(() => {
    exportStatus.textContent = 'Используй кнопку полного экрана в плеере или сохрани видео.';
  });
  else exportStatus.textContent = 'Используй кнопку полного экрана в плеере или сохрани видео.';
};
