import { createStage, makeSpec, HAIR, BODY_IDS, HERITAGE_IDS, HEADWEAR, FACIAL, OUTFITS, CLIPS, FACE_IDS, EXPRESSIONS } from './engine.js';
const $ = (id) => document.getElementById(id), cap = (s) => s[0].toUpperCase() + s.slice(1).replace(/[-_]/g, ' ');
const fill = (el, a, auto) => { el.innerHTML = (auto ? '<option value="">Auto (seed)</option>' : '') + a.map((v) => `<option value="${v}">${cap(v)}</option>`).join(''); };
fill($('type'), BODY_IDS, true); fill($('her'), HERITAGE_IDS, true); fill($('fh'), FACIAL, true); fill($('hat'), HEADWEAR, true); fill($('outfit'), OUTFITS, true); fill($('anim'), CLIPS, false); fill($('face'), FACE_IDS, true); fill($('expr'), EXPRESSIONS, false); $('expr').insertAdjacentHTML('afterbegin', '<option value="">Auto (animation)</option>'); $('expr').value = '';
const hairList = () => fill($('hair'), HAIR[$('sex').value], true);
const stage = createStage($('cv'), { onYaw: (y) => { $('yaw').value = Math.round(y) % 360; $('yv').textContent = Math.round(y) % 360 + '°'; }, onSpin: (v) => { $('spin').classList.toggle('on', v); $('spin').textContent = v ? '■ Stop' : '▶ Spin'; } });
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
function build() { const sex = $('sex').value, o = { sex }; if ($('type').value) o.type = $('type').value; if ($('her').value) o.heritage = $('her').value; if ($('hair').value) o.hair = $('hair').value; if (sex === 'male' && $('fh').value) o.facialHair = $('fh').value; if ($('hat').value) o.headwear = $('hat').value; if ($('face').value) o.faceStyle = $('face').value; if ($('outfit').value) o.outfit = $('outfit').value;
  $('fhl').style.display = sex === 'male' ? '' : 'none'; stage.set(makeSpec($('seed').value || 'pear', o)); }
$('sex').onchange = () => { hairList(); build(); };
for (const i of ['type', 'her', 'hair', 'fh', 'hat', 'outfit']) $(i).onchange = build; $('seed').oninput = build;
$('yaw').oninput = () => { stage.setYaw(+$('yaw').value); $('yv').textContent = $('yaw').value + '°'; stage.setSpin(false); $('spin').textContent = '▶ Spin'; $('spin').classList.remove('on'); };
let spinning = false; $('spin').onclick = () => { spinning = !spinning; stage.setSpin(spinning); $('spin').textContent = spinning ? '■ Stop' : '▶ Spin'; $('spin').classList.toggle('on', spinning); };
$('face').onchange = build; $('expr').onchange = () => stage.setExpression($('expr').value || null);
$('anim').onchange = () => stage.setAnimation($('anim').value);
$('rnd').onclick = () => { $('sex').value = rnd(['male', 'female']); hairList(); $('seed').value = 'pf-' + Math.random().toString(36).slice(2, 8); $('type').value = ''; $('her').value = ''; $('hair').value = ''; $('fh').value = ''; $('hat').value = ''; $('outfit').value = ''; $('face').value = ''; build(); };
hairList(); build(); window.__ready = 1;
