const $ = (id) => document.getElementById(id);

let allProjects = [];
let starOrder = [];

async function loadReelConfig() {
  const res = await fetch('/api/reel-config');
  const { config, projects } = await res.json();
  allProjects = projects;
  starOrder = Array.isArray(config.starProjects) ? [...config.starProjects] : [];

  $('sec-timeline').checked = config.sections?.timeline !== false;
  $('sec-volunteering').checked = config.sections?.volunteering !== false;
  $('sec-testimonial').checked = config.sections?.testimonial !== false;

  renderStarList();
  renderStarAddOptions();
}

function projectTitle(id) {
  const p = allProjects.find((p) => p.id === id);
  return p ? `${p.title} (${p.category})` : id;
}

function renderStarList() {
  const ul = $('star-list');
  ul.innerHTML = '';
  starOrder.forEach((id, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${i + 1}. ${projectTitle(id)}</span><span class="remove" data-i="${i}">✕</span>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll('.remove').forEach((el) => {
    el.addEventListener('click', () => {
      starOrder.splice(Number(el.dataset.i), 1);
      renderStarList();
      renderStarAddOptions();
    });
  });
}

function renderStarAddOptions() {
  const select = $('star-add');
  select.innerHTML = '';
  allProjects
    .filter((p) => !starOrder.includes(p.id))
    .forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.title} (${p.category})`;
      select.appendChild(opt);
    });
}

$('star-add-btn').addEventListener('click', () => {
  const id = $('star-add').value;
  if (!id) return;
  starOrder.push(id);
  renderStarList();
  renderStarAddOptions();
});

async function saveReelConfig() {
  const track = $('track').value;
  await fetch('/api/reel-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track,
      starProjects: starOrder.length ? starOrder : null,
      sections: {
        timeline: $('sec-timeline').checked,
        volunteering: $('sec-volunteering').checked,
        testimonial: $('sec-testimonial').checked,
      },
    }),
  });
}

async function loadTracks() {
  const res = await fetch('/api/tracks');
  const tracks = await res.json();
  const select = $('track');
  select.innerHTML = '<option value="random">random</option>';
  tracks.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });
  const cfgRes = await fetch('/api/reel-config');
  const { config } = await cfgRes.json();
  select.value = config.track || 'random';
}

async function loadRenderSettings() {
  const res = await fetch('/api/render-settings');
  const s = await res.json();
  $('fps').value = s.fps;
  $('width').value = s.width;
  $('height').value = s.height;
  $('masterCrf').value = s.masterCrf;
  $('webCrf').value = s.webCrf;
  $('webPreset').value = s.webPreset;
  $('audioBitrateKbps').value = s.audioBitrateKbps;
  $('imageFormat').value = s.imageFormat;
  $('photosPerProject').value = s.photosPerProject;
  $('hardwareAcceleration').value = s.hardwareAcceleration ?? 'disable';
  $('webEncoder').value = s.webEncoder ?? 'libx264';
  $('concurrency').value = s.concurrency ?? '';
  $('maxShowcaseProjects').value = s.maxShowcaseProjects ?? '';
}

$('save-settings').addEventListener('click', async () => {
  await saveReelConfig();
  await fetch('/api/render-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fps: Number($('fps').value),
      width: Number($('width').value),
      height: Number($('height').value),
      masterCrf: Number($('masterCrf').value),
      webCrf: Number($('webCrf').value),
      webPreset: $('webPreset').value,
      audioBitrateKbps: Number($('audioBitrateKbps').value),
      imageFormat: $('imageFormat').value,
      photosPerProject: Number($('photosPerProject').value),
      hardwareAcceleration: $('hardwareAcceleration').value,
      webEncoder: $('webEncoder').value,
      concurrency: $('concurrency').value === '' ? null : Number($('concurrency').value),
      maxShowcaseProjects: $('maxShowcaseProjects').value === '' ? null : Number($('maxShowcaseProjects').value),
    }),
  });
  $('save-status').textContent = 'Saved ' + new Date().toLocaleTimeString();
});

// --- render ---------------------------------------------------------------
$('render-btn').addEventListener('click', async () => {
  const btn = $('render-btn');
  const log = $('render-log');
  btn.disabled = true;
  log.textContent = '';
  const res = await fetch('/api/render', { method: 'POST' });
  const { jobId } = await res.json();
  const es = new EventSource(`/api/render/stream?jobId=${jobId}`);
  es.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.type === 'log') {
      log.textContent += data.text;
      log.scrollTop = log.scrollHeight;
    } else if (data.type === 'finish') {
      es.close();
      btn.disabled = false;
      if (data.status === 'done') loadOutputs();
    }
  };
  es.onerror = () => { es.close(); btn.disabled = false; };
});

async function loadOutputs() {
  const res = await fetch('/api/outputs');
  const files = await res.json();
  const video = files.find((f) => f.name === 'highlights-web.mp4');
  if (video) {
    $('preview').src = video.url;
    $('preview').load();
  }
  const vertical = files.find((f) => f.name === 'highlights-vertical-web.mp4');
  if (vertical) {
    $('preview-vertical').src = vertical.url;
    $('preview-vertical').load();
  }
  const dl = $('downloads');
  dl.innerHTML = '';
  files.forEach((f) => {
    const a = document.createElement('a');
    a.href = f.url;
    a.download = f.name;
    a.textContent = `Download ${f.name}`;
    dl.appendChild(a);
  });
}

// --- publish ----------------------------------------------------------------
$('publish-check-btn').addEventListener('click', async () => {
  const res = await fetch('/api/publish/preview');
  const { statusPorcelain } = await res.json();
  $('publish-preview').textContent = statusPorcelain?.trim()
    ? statusPorcelain
    : '(no uncommitted local changes — nothing would be discarded)';
  $('publish-confirm-wrap').classList.remove('hidden');
  $('publish-btn').classList.remove('hidden');
});

$('publish-confirm').addEventListener('change', (e) => {
  $('publish-btn').disabled = !e.target.checked;
});

$('publish-btn').addEventListener('click', async () => {
  const btn = $('publish-btn');
  const log = $('publish-log');
  btn.disabled = true;
  log.textContent = '';
  const res = await fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) {
    log.textContent = 'Publish request rejected.';
    return;
  }
  const { jobId } = await res.json();
  const es = new EventSource(`/api/publish/stream?jobId=${jobId}`);
  es.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.type === 'log') {
      log.textContent += data.text;
      log.scrollTop = log.scrollHeight;
    } else if (data.type === 'finish') {
      es.close();
    }
  };
  es.onerror = () => es.close();
});

(async function init() {
  await loadReelConfig();
  await loadTracks();
  await loadRenderSettings();
  await loadOutputs();
})();
