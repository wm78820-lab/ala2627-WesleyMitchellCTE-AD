const canvas = document.querySelector('#field');
const context = canvas.getContext('2d');
const powerMeter = document.querySelector('#powerMeter');
const powerValue = document.querySelector('#powerValue');
const playMessage = document.querySelector('#playMessage');
const driveStatus = document.querySelector('#driveStatus');
const scoreValue = document.querySelector('#scoreValue');
const downValue = document.querySelector('#downValue');
const yardValue = document.querySelector('#yardValue');
const canvasHint = document.querySelector('#canvasHint');
const resetButton = document.querySelector('#resetButton');

const state = { pointer: { x: 0, y: 0 }, keys: new Set(), charging: false, power: 0, score: 14, down: 1, yard: 32, play: 'ready', lastTime: 0, ball: null, routeSegment: 0, routeProgress: 0, message: 'Your receiver is breaking toward the right hash.' };
const player = { x: .12, y: .72 };
const lineOfScrimmage = .3;
const route = [{ x: .42, y: .7 }, { x: .55, y: .7 }, { x: .63, y: .48 }, { x: .78, y: .48 }, { x: .87, y: .3 }];
const receiver = { ...route[0] };
const defenders = [{ x: .59, y: .29, assignment: 'receiver' }, { x: .8, y: .51, assignment: 'deep' }, { x: .47, y: .57, assignment: 'inside' }];

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  canvas.width = box.width * ratio;
  canvas.height = box.height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function fieldPoint(point) { return { x: point.x * canvas.clientWidth, y: point.y * canvas.clientHeight }; }
function pointerPosition(event) {
  const box = canvas.getBoundingClientRect();
  state.pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
  draw();
}

function drawFieldLines(width, height) {
  context.strokeStyle = 'rgba(220, 239, 205, .3)'; context.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) { const x = i * width / 10; context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  context.fillStyle = 'rgba(238, 245, 218, .48)'; context.font = '11px Trebuchet MS';
  for (let i = 1; i < 10; i += 1) context.fillText(i * 10, i * width / 10 - 10, height - 12);
  const scrimmage = lineOfScrimmage * width;
  context.setLineDash([5, 5]); context.strokeStyle = '#f7c76b'; context.lineWidth = 2; context.beginPath(); context.moveTo(scrimmage, 0); context.lineTo(scrimmage, height); context.stroke(); context.setLineDash([]);
  context.fillStyle = '#f7c76b'; context.font = 'bold 10px Trebuchet MS'; context.fillText('LINE OF SCRIMMAGE', scrimmage + 8, 21);
}

function drawRoute(width, height) {
  context.setLineDash([3, 7]); context.strokeStyle = 'rgba(247, 199, 107, .72)'; context.lineWidth = 2; context.beginPath();
  route.forEach((point, index) => { const pixel = fieldPoint(point); if (index === 0) context.moveTo(pixel.x, pixel.y); else context.lineTo(pixel.x, pixel.y); });
  context.stroke(); context.setLineDash([]);
  const current = fieldPoint(receiver); context.fillStyle = '#f7c76b'; context.fillRect(current.x - 3, current.y - 3, 6, 6);
  context.fillStyle = 'rgba(247, 199, 107, .8)'; context.font = 'bold 10px Trebuchet MS'; context.fillText('ROUTE', fieldPoint(route[1]).x, fieldPoint(route[1]).y + 24);
}

function drawPixelPlayer(point, team, label) {
  const colors = team === 'offense' ? { shadow: 'rgba(7, 28, 20, .35)', helmet: '#d6e2d4', body: '#2d6d57', pants: '#e9eee1', accent: '#f7c76b' } : { shadow: 'rgba(7, 28, 20, .35)', helmet: '#be493e', body: '#a33b39', pants: '#273b38', accent: '#e97058' };
  context.fillStyle = colors.shadow; context.fillRect(point.x - 15, point.y + 16, 30, 5);
  context.fillStyle = colors.pants; context.fillRect(point.x - 10, point.y + 4, 8, 13); context.fillRect(point.x + 2, point.y + 4, 8, 13);
  context.fillStyle = colors.body; context.fillRect(point.x - 12, point.y - 8, 24, 15); context.fillRect(point.x - 17, point.y - 5, 5, 11); context.fillRect(point.x + 12, point.y - 5, 5, 11);
  context.fillStyle = colors.helmet; context.fillRect(point.x - 10, point.y - 20, 20, 13); context.fillRect(point.x - 6, point.y - 24, 12, 5); context.fillStyle = colors.accent; context.fillRect(point.x + 8, point.y - 16, 6, 3);
  context.fillStyle = '#102b25'; context.font = 'bold 8px Trebuchet MS'; context.textAlign = 'center'; context.fillText(label, point.x, point.y + 3); context.textAlign = 'left';
}

function draw() {
  const width = canvas.clientWidth; const height = canvas.clientHeight;
  const fieldGradient = context.createLinearGradient(0, 0, width, height);
  fieldGradient.addColorStop(0, '#123f35'); fieldGradient.addColorStop(.48, '#2b7650'); fieldGradient.addColorStop(1, '#174b43');
  context.clearRect(0, 0, width, height); context.fillStyle = fieldGradient; context.fillRect(0, 0, width, height); drawFieldLines(width, height); drawRoute(width, height);
  const quarterback = fieldPoint(player); const target = state.ball ? state.ball : fieldPoint(receiver);
  const pointer = state.pointer.x ? state.pointer : { x: target.x, y: target.y };
  context.setLineDash([7, 8]); context.strokeStyle = state.charging ? '#f7c76b' : '#f3723b'; context.lineWidth = 2; context.beginPath(); context.moveTo(quarterback.x, quarterback.y); context.lineTo(pointer.x, pointer.y); context.stroke(); context.setLineDash([]);
  if (state.charging) { context.beginPath(); context.arc(quarterback.x, quarterback.y, 25 + state.power / 3, 0, Math.PI * 2); context.strokeStyle = 'rgba(247,199,107,.55)'; context.stroke(); }
  defenders.forEach((defender, index) => drawPixelPlayer(fieldPoint(defender), 'defense', String(index + 20)));
  drawPixelPlayer(fieldPoint(receiver), 'offense', 'M'); drawPixelPlayer(quarterback, 'offense', 'QB');
  if (state.ball) {
    context.save(); context.shadowColor = 'rgba(255, 226, 147, .9)'; context.shadowBlur = 18;
    context.beginPath(); context.ellipse(state.ball.x, state.ball.y, 15, 10, -.5, 0, Math.PI * 2); context.fillStyle = '#a9532b'; context.fill(); context.restore();
    context.beginPath(); context.ellipse(state.ball.x, state.ball.y, 15, 10, -.5, 0, Math.PI * 2); context.strokeStyle = '#f7d38a'; context.lineWidth = 2; context.stroke();
    context.strokeStyle = '#f7d38a'; context.lineWidth = 2; context.beginPath(); context.moveTo(state.ball.x - 3, state.ball.y - 4); context.lineTo(state.ball.x + 4, state.ball.y + 3); context.stroke();
  }
}

function setPower(value) { state.power = Math.max(0, Math.min(100, value)); powerMeter.style.width = `${state.power}%`; powerValue.textContent = `${Math.round(state.power)}%`; }
function movePlayers(delta) {
  if (state.play !== 'thrown' && state.play !== 'intercepted') {
    const direction = { x: 0, y: 0 };
    if (state.keys.has('w')) direction.y -= 1; if (state.keys.has('s')) direction.y += 1;
    if (state.keys.has('a')) direction.x -= 1; if (state.keys.has('d')) direction.x += 1;
    const length = Math.hypot(direction.x, direction.y) || 1;
    player.x = Math.max(.06, Math.min(.92, player.x + direction.x / length * delta * .3));
    player.y = Math.max(.12, Math.min(.9, player.y + direction.y / length * delta * .3));
  }
  if (state.play !== 'thrown' && state.play !== 'intercepted' && state.routeSegment < route.length - 1) {
    state.routeProgress = Math.min(1, state.routeProgress + delta * .24);
    const start = route[state.routeSegment]; const end = route[state.routeSegment + 1];
    receiver.x = start.x + (end.x - start.x) * state.routeProgress; receiver.y = start.y + (end.y - start.y) * state.routeProgress;
    if (state.routeProgress >= 1) { state.routeSegment += 1; state.routeProgress = 0; }
  }
  const coverSpeed = delta * .13;
  defenders.forEach((defender) => {
    const target = defender.assignment === 'receiver' ? { x: receiver.x - .02, y: receiver.y + .04 } : defender.assignment === 'deep' ? { x: receiver.x + .08, y: receiver.y + .14 } : { x: receiver.x - .12, y: receiver.y + .2 };
    defender.x += Math.max(-coverSpeed, Math.min(coverSpeed, target.x - defender.x));
    defender.y += Math.max(-coverSpeed, Math.min(coverSpeed, target.y - defender.y));
  });
}
function throwBall() {
  state.charging = false; state.play = 'thrown'; canvasHint.textContent = 'BALL IN THE AIR'; driveStatus.textContent = 'PLAY IN MOTION';
  const target = fieldPoint(receiver); const accuracy = Math.hypot(state.pointer.x - target.x, state.pointer.y - target.y); const distance = Math.hypot(target.x - fieldPoint(player).x, target.y - fieldPoint(player).y); const needed = Math.min(100, 42 + distance / 5); const goodPower = Math.abs(state.power - needed) < 21;
  const caught = accuracy < 75 && goodPower;
  state.ball = { ...fieldPoint(player), targetX: target.x + (caught ? 0 : (state.pointer.x - target.x) * .55), targetY: target.y + (caught ? 0 : (state.pointer.y - target.y) * .55), progress: 0, caught, intercepted: false };
  playMessage.textContent = caught ? 'Perfect window. Malik has daylight!' : accuracy < 75 ? 'The ball is underthrown. Power matters.' : 'That one sailed. Bring the aim back inside.';
  requestAnimationFrame(animateBall);
}
function resetRoute() {
  state.routeSegment = 0; state.routeProgress = 0; receiver.x = route[0].x; receiver.y = route[0].y;
  defenders[0].x = .59; defenders[0].y = .29; defenders[1].x = .8; defenders[1].y = .51; defenders[2].x = .47; defenders[2].y = .57;
}
function animateBall() { if (!state.ball) return; const ball = state.ball; ball.progress = Math.min(1, ball.progress + .025); const start = fieldPoint(player); ball.x = start.x + (ball.targetX - start.x) * ball.progress; ball.y = start.y + (ball.targetY - start.y) * ball.progress - Math.sin(ball.progress * Math.PI) * 75;
  const interceptor = defenders.find((defender) => Math.hypot(ball.x - fieldPoint(defender).x, ball.y - fieldPoint(defender).y) < 24);
  if (interceptor) { ball.intercepted = true; ball.interceptor = interceptor; state.play = 'intercepted'; }
  draw(); if (ball.intercepted || ball.progress >= 1) finishPlay(); else requestAnimationFrame(animateBall);
}
function finishPlay() { const ball = state.ball; const intercepted = ball.intercepted; const caught = ball.caught && !intercepted; state.ball = null; state.play = caught ? 'caught' : intercepted ? 'intercepted' : 'incomplete'; if (intercepted) { state.down = 1; playMessage.textContent = 'INTERCEPTION! The safety read your eyes.'; driveStatus.textContent = 'DEFENSE BALL'; } else if (caught) { state.score += 7; state.down = 1; state.yard = Math.min(99, state.yard + 18); playMessage.textContent = 'TOUCHDOWN! Same look, next drive.'; driveStatus.textContent = 'SCORE PLAY'; } else { state.down += 1; resetRoute(); state.play = 'ready'; playMessage.textContent = 'Incomplete pass. The play resets for second down.'; driveStatus.textContent = 'DRIVE LIVE'; } scoreValue.textContent = state.score; downValue.textContent = state.down > 4 ? 'TURNOVER' : `${state.down}${state.down === 1 ? 'st' : state.down === 2 ? 'nd' : state.down === 3 ? 'rd' : 'th'} & 10`; yardValue.textContent = state.yard > 50 ? `OPP ${100 - state.yard}` : `OWN ${state.yard}`; canvasHint.textContent = 'WASD MOVE • MOVE TO AIM • HOLD TO LOAD • RELEASE TO THROW'; setPower(0); draw(); }

canvas.addEventListener('pointermove', pointerPosition);
canvas.addEventListener('pointerdown', (event) => { if (state.play === 'thrown') return; canvas.setPointerCapture(event.pointerId); pointerPosition(event); state.charging = true; state.play = 'charging'; driveStatus.textContent = 'LOADING THROW'; canvasHint.textContent = 'BUILD POWER • RELEASE TO THROW'; });
canvas.addEventListener('pointerup', () => { if (state.charging) throwBall(); });
canvas.addEventListener('pointerleave', () => { if (state.charging) throwBall(); });
window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if ('wasd'.includes(key)) { event.preventDefault(); state.keys.add(key); } });
window.addEventListener('keyup', (event) => { state.keys.delete(event.key.toLowerCase()); });
function gameLoop(time) { const delta = Math.min(.05, (time - state.lastTime) / 1000 || 0); state.lastTime = time; movePlayers(delta); if (state.charging) setPower(50 + Math.sin(time / 320) * 50); draw(); requestAnimationFrame(gameLoop); }
resetButton.addEventListener('click', () => { state.score = 14; state.down = 1; state.yard = 32; state.play = 'ready'; state.ball = null; resetRoute(); player.x = .12; player.y = .72; driveStatus.textContent = 'DRIVE LIVE'; playMessage.textContent = 'Your receiver is breaking toward the right hash.'; canvasHint.textContent = 'WASD MOVE • MOVE TO AIM • HOLD TO LOAD • RELEASE TO THROW'; setPower(0); draw(); });
window.addEventListener('resize', resizeCanvas); resizeCanvas(); requestAnimationFrame(gameLoop);
