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

const state = { pointer: { x: 0, y: 0 }, keys: new Set(), charging: false, power: 0, score: 14, down: 1, yard: 32, play: 'ready', lastTime: 0, runCycle: 0, cameraX: 0, ball: null, routeSegment: 0, routeProgress: 0, secondaryRouteSegment: 0, secondaryRouteProgress: 0, message: 'Your receiver is breaking toward the right hash.' };
const player = { x: .12, y: .72 };
const lineOfScrimmage = .3;
const fieldWindow = .3;
let route = [];
let secondaryRoute = [];
const receiver = { x: 0, y: 0, diving: false, diveProgress: 0 };
const secondaryReceiver = { x: 0, y: 0 };
const offensiveLine = [
  { x: .22, y: .58, label: 'LT' }, { x: .25, y: .65, label: 'LG' }, { x: .27, y: .72, label: 'C' },
  { x: .25, y: .79, label: 'RG' }, { x: .22, y: .86, label: 'RT' }
];
const offensiveSupport = [
  { x: .17, y: .58, label: 'TE' }, { x: .17, y: .86, label: 'RB' }, { x: .42, y: .88, label: 'WR' }
];
const defenders = [
  { x: .34, y: .58, role: 'lineman', label: 'DL' }, { x: .34, y: .65, role: 'lineman', label: 'DL' },
  { x: .34, y: .79, role: 'lineman', label: 'DL' }, { x: .34, y: .86, role: 'lineman', label: 'DL' },
  { x: .47, y: .57, assignment: 'inside', role: 'linebacker', label: 'LB' }, { x: .47, y: .79, assignment: 'inside', role: 'linebacker', label: 'LB' },
  { x: .55, y: .7, assignment: 'receiver', role: 'linebacker', label: 'LB' }, { x: .67, y: .18, assignment: 'deep', role: 'corner', label: 'CB' },
  { x: .8, y: .51, assignment: 'deep', role: 'corner', label: 'CB' }, { x: .84, y: .75, assignment: 'deep', role: 'safety', label: 'S' },
  { x: .91, y: .15, assignment: 'deep', role: 'safety', label: 'S' }
];

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  canvas.width = box.width * ratio;
  canvas.height = box.height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function fieldPoint(point) { return { x: (point.x - state.cameraX) / fieldWindow * canvas.clientWidth, y: point.y * canvas.clientHeight }; }
function pointerPosition(event) {
  const box = canvas.getBoundingClientRect();
  state.pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
  draw();
}

function drawFieldLines(width, height) {
  context.strokeStyle = 'rgba(220, 239, 205, .3)'; context.lineWidth = 1;
  const firstMarker = Math.floor(state.cameraX / .1) * .1;
  for (let marker = firstMarker; marker <= state.cameraX + fieldWindow; marker += .1) { const x = fieldPoint({ x: marker, y: 0 }).x; context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  context.fillStyle = 'rgba(238, 245, 218, .48)'; context.font = '11px Trebuchet MS';
  for (let marker = firstMarker; marker <= state.cameraX + fieldWindow; marker += .1) context.fillText(Math.round(marker * 100), fieldPoint({ x: marker, y: 0 }).x - 10, height - 40);
  const scrimmage = fieldPoint({ x: lineOfScrimmage, y: 0 }).x;
  context.setLineDash([5, 5]); context.strokeStyle = '#f7c76b'; context.lineWidth = 2; context.beginPath(); context.moveTo(scrimmage, 0); context.lineTo(scrimmage, height); context.stroke(); context.setLineDash([]);
  context.fillStyle = '#f7c76b'; context.font = 'bold 10px Trebuchet MS'; context.fillText('LINE OF SCRIMMAGE', scrimmage + 8, 21);
}

function drawStadium(width, height) {
  const sidelineTop = Math.min(86, height * .2);
  const sidelineBottom = height - 29;
  context.fillStyle = '#152624'; context.fillRect(0, 0, width, sidelineTop);
  context.fillStyle = '#273b38';
  for (let row = 0; row < 4; row += 1) context.fillRect(0, 16 + row * 17, width, 3);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 24; column += 1) {
      const x = 14 + column * (width - 28) / 23 + (row % 2) * 7;
      const y = 9 + row * 17;
      context.fillStyle = ['#e97058', '#f7c76b', '#d6e2d4'][column % 3];
      context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill();
      context.fillStyle = '#a33b39'; context.fillRect(x - 5, y + 5, 10, 7);
    }
  }
  context.fillStyle = '#ffffff'; context.fillRect(0, sidelineTop, width, 8); context.fillRect(0, sidelineBottom, width, 8);
  context.fillStyle = 'rgba(255, 255, 255, .86)'; context.font = 'bold 9px Trebuchet MS'; context.fillText('SIDELINE', 34, sidelineTop - 7); context.fillText('SIDELINE', 34, sidelineBottom - 7);
}

function drawRoutePath(routePoints, current, label) {
  context.setLineDash([3, 7]); context.strokeStyle = 'rgba(247, 199, 107, .72)'; context.lineWidth = 2; context.beginPath();
  routePoints.forEach((point, index) => { const pixel = fieldPoint(point); if (index === 0) context.moveTo(pixel.x, pixel.y); else context.lineTo(pixel.x, pixel.y); });
  context.stroke(); context.setLineDash([]);
  const currentPoint = fieldPoint(current); context.fillStyle = '#f7c76b'; context.fillRect(currentPoint.x - 3, currentPoint.y - 3, 6, 6);
  context.fillStyle = 'rgba(247, 199, 107, .8)'; context.font = 'bold 10px Trebuchet MS'; context.fillText(label, fieldPoint(routePoints[1]).x, fieldPoint(routePoints[1]).y + 24);
}

function drawRoute(width, height) {
  drawRoutePath(route, receiver, 'ROUTE'); drawRoutePath(secondaryRoute, secondaryReceiver, 'WR ROUTE');
}

function drawHelmet(point, colors) {
  context.fillStyle = colors.helmet; context.fillRect(point.x - 11, point.y - 21, 22, 13); context.fillRect(point.x - 7, point.y - 25, 14, 4); context.fillRect(point.x - 14, point.y - 17, 4, 8);
  context.fillStyle = colors.accent; context.fillRect(point.x + 8, point.y - 16, 7, 3);
  context.fillStyle = '#102b25'; context.fillRect(point.x + 8, point.y - 12, 12, 2); context.fillRect(point.x + 12, point.y - 10, 2, 6); context.fillRect(point.x + 17, point.y - 12, 2, 6);
}

function drawPixelPlayer(point, team, label, running = false) {
  const colors = team === 'offense' ? { shadow: 'rgba(7, 28, 20, .35)', helmet: '#d6e2d4', body: '#2d6d57', pants: '#e9eee1', accent: '#f7c76b' } : { shadow: 'rgba(7, 28, 20, .35)', helmet: '#be493e', body: '#a33b39', pants: '#273b38', accent: '#e97058' };
  const stride = running ? Math.sin(state.runCycle + point.x * .04) * 5 : 0;
  context.fillStyle = colors.shadow; context.fillRect(point.x - 15, point.y + 16, 30, 5);
  context.fillStyle = colors.pants; context.fillRect(point.x - 10 + stride, point.y + 4, 8, 13); context.fillRect(point.x + 2 - stride, point.y + 4, 8, 13);
  context.fillStyle = '#102b25'; context.fillRect(point.x - 10 + stride, point.y + 17, 9, 3); context.fillRect(point.x + 2 - stride, point.y + 17, 9, 3);
  context.fillStyle = colors.body; context.fillRect(point.x - 12, point.y - 8, 24, 15); context.fillRect(point.x - 17, point.y - 5, 5, 11); context.fillRect(point.x + 12, point.y - 5, 5, 11);
  context.fillStyle = colors.accent; context.fillRect(point.x - 9, point.y - 5, 18, 3);
  drawHelmet(point, colors);
  context.fillStyle = '#102b25'; context.font = 'bold 8px Trebuchet MS'; context.textAlign = 'center'; context.fillText(label, point.x, point.y + 3); context.textAlign = 'left';
}

function drawDivingReceiver(point) {
  context.fillStyle = 'rgba(7, 28, 20, .35)'; context.fillRect(point.x - 24, point.y + 7, 48, 5);
  context.fillStyle = '#e9eee1'; context.fillRect(point.x - 21, point.y - 3, 14, 7); context.fillRect(point.x + 7, point.y - 3, 14, 7);
  context.fillStyle = '#2d6d57'; context.fillRect(point.x - 13, point.y - 10, 27, 14);
  drawHelmet({ x: point.x + 18, y: point.y - 4 }, { helmet: '#d6e2d4', accent: '#f7c76b' });
  context.fillStyle = '#f7c76b'; context.fillRect(point.x - 27, point.y - 7, 14, 4); context.fillRect(point.x - 27, point.y + 1, 14, 4);
  context.fillStyle = '#102b25'; context.font = 'bold 8px Trebuchet MS'; context.textAlign = 'center'; context.fillText('M', point.x + 2, point.y + 1); context.textAlign = 'left';
}

function drawAimDots(start, end, width, height) {
  const control = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - Math.min(110, height * .22) };
  const dotCount = 18;
  for (let index = 0; index < dotCount; index += 1) {
    const progress = (index + 1) / (dotCount + 1);
    const inverse = 1 - progress;
    const point = {
      x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
      y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y
    };
    const radius = 7 - progress * 5.5;
    context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = state.charging ? `rgba(247, 199, 107, ${.95 - progress * .3})` : `rgba(243, 114, 59, ${.9 - progress * .35})`;
    context.fill();
  }
}

function draw() {
  const width = canvas.clientWidth; const height = canvas.clientHeight;
  const cameraTarget = state.ball ? (state.ball.worldX ?? player.x) : player.x;
  state.cameraX = Math.max(0, Math.min(1 - fieldWindow, cameraTarget - fieldWindow * .35));
  const fieldGradient = context.createLinearGradient(0, 0, width, height);
  fieldGradient.addColorStop(0, '#123f35'); fieldGradient.addColorStop(.48, '#2b7650'); fieldGradient.addColorStop(1, '#174b43');
  context.clearRect(0, 0, width, height); context.fillStyle = fieldGradient; context.fillRect(0, 0, width, height); drawStadium(width, height); drawFieldLines(width, height); drawRoute(width, height);
  const quarterback = fieldPoint(player); const target = state.ball ? fieldPoint({ x: state.ball.worldX, y: state.ball.worldY }) : fieldPoint(receiver);
  const pointer = state.pointer.x ? state.pointer : { x: target.x, y: target.y };
  drawAimDots(quarterback, pointer, width, height);
  if (state.charging) { context.beginPath(); context.arc(quarterback.x, quarterback.y, 25 + state.power / 3, 0, Math.PI * 2); context.strokeStyle = 'rgba(247,199,107,.55)'; context.stroke(); }
  offensiveLine.forEach((lineman) => drawPixelPlayer(fieldPoint(lineman), 'offense', lineman.label));
  offensiveSupport.forEach((teammate) => drawPixelPlayer(fieldPoint(teammate), 'offense', teammate.label, true));
  drawPixelPlayer(fieldPoint(secondaryReceiver), 'offense', 'WR', true);
  defenders.forEach((defender) => drawPixelPlayer(fieldPoint(defender), 'defense', defender.label, true));
  if (receiver.diving) drawDivingReceiver(fieldPoint(receiver)); else drawPixelPlayer(fieldPoint(receiver), 'offense', 'M', true); drawPixelPlayer(quarterback, 'offense', 'QB', state.keys.size > 0 || state.play === 'thrown');
  if (state.ball) {
    const ballPoint = fieldPoint({ x: state.ball.worldX, y: state.ball.worldY });
    context.save(); context.shadowColor = 'rgba(255, 226, 147, .9)'; context.shadowBlur = 18;
    context.beginPath(); context.ellipse(ballPoint.x, ballPoint.y, 15, 10, -.5, 0, Math.PI * 2); context.fillStyle = '#a9532b'; context.fill(); context.restore();
    context.beginPath(); context.ellipse(ballPoint.x, ballPoint.y, 15, 10, -.5, 0, Math.PI * 2); context.strokeStyle = '#f7d38a'; context.lineWidth = 2; context.stroke();
    context.strokeStyle = '#f7d38a'; context.lineWidth = 2; context.beginPath(); context.moveTo(ballPoint.x - 3, ballPoint.y - 4); context.lineTo(ballPoint.x + 4, ballPoint.y + 3); context.stroke();
  }
  if (state.play === 'incomplete') {
    context.fillStyle = 'rgba(8, 23, 20, .5)'; context.fillRect(0, 0, width, height);
    context.fillStyle = '#f7c76b'; context.font = `bold ${Math.min(64, width / 8)}px Trebuchet MS`; context.textAlign = 'center'; context.fillText('INCOMPLETE', width / 2, height / 2); context.textAlign = 'left';
  }
  if (state.play === 'interceptionReturn') {
    context.fillStyle = 'rgba(90, 16, 17, .32)'; context.fillRect(0, 0, width, height);
    context.fillStyle = '#ff4f4f'; context.font = `bold ${Math.min(64, width / 7)}px Trebuchet MS`; context.textAlign = 'center'; context.fillText('INTERCEPTED', width / 2, height / 2); context.textAlign = 'left';
  }
}

function setPower(value) { state.power = Math.max(0, Math.min(100, value)); powerMeter.style.width = `${state.power}%`; powerValue.textContent = `${Math.round(state.power)}%`; }
function moveToward(point, target, distance) {
  const directionX = target.x - point.x; const directionY = target.y - point.y; const length = Math.hypot(directionX, directionY) || 1;
  point.x += directionX / length * Math.min(distance, length); point.y += directionY / length * Math.min(distance, length);
}
function moveInterceptionReturn(delta) {
  const ball = state.ball; if (!ball) return;
  ball.returnElapsed = (ball.returnElapsed || 0) + delta;
  const carrier = ball.interceptor; const endzoneTarget = { x: .96, y: carrier.y < .5 ? .24 : .76 };
  moveToward(carrier, endzoneTarget, delta * .16);
  const offense = [player, receiver, secondaryReceiver, ...offensiveLine, ...offensiveSupport];
  offense.forEach((offensivePlayer, index) => {
    const target = { x: carrier.x - .02 - (index % 3) * .025, y: carrier.y + ((index % 3) - 1) * .035 };
    moveToward(offensivePlayer, target, delta * .22);
  });
  ball.worldX = carrier.x; ball.worldY = carrier.y - .02;
  const tackled = ball.returnElapsed > .25 && offense.some((offensivePlayer) => Math.hypot(offensivePlayer.x - carrier.x, offensivePlayer.y - carrier.y) < .045);
  if (tackled || carrier.x >= .94) { ball.tackled = tackled; finishPlay(); }
}
function movePlayers(delta) {
  state.runCycle += delta * 10;
  if (state.play === 'interceptionReturn') { moveInterceptionReturn(delta); return; }
  if (state.play !== 'intercepted' && state.play !== 'incomplete') {
    const direction = { x: 0, y: 0 };
    if (state.keys.has('w')) direction.y -= 1; if (state.keys.has('s')) direction.y += 1;
    if (state.keys.has('a')) direction.x -= 1; if (state.keys.has('d')) direction.x += 1;
    const length = Math.hypot(direction.x, direction.y) || 1;
    player.x = Math.max(.06, Math.min(lineOfScrimmage - .025, player.x + direction.x / length * delta * .3));
    player.y = Math.max(.12, Math.min(.9, player.y + direction.y / length * delta * .3));
  }
  if (state.play !== 'intercepted' && state.play !== 'incomplete' && state.routeSegment < route.length - 1) {
    state.routeProgress = Math.min(1, state.routeProgress + delta * .55);
    const start = route[state.routeSegment]; const end = route[state.routeSegment + 1];
    receiver.x = start.x + (end.x - start.x) * state.routeProgress; receiver.y = start.y + (end.y - start.y) * state.routeProgress;
    if (state.routeProgress >= 1) { state.routeSegment += 1; state.routeProgress = 0; }
  }
  if (state.play !== 'intercepted' && state.play !== 'incomplete' && state.secondaryRouteSegment < secondaryRoute.length - 1) {
    state.secondaryRouteProgress = Math.min(1, state.secondaryRouteProgress + delta * .48);
    const start = secondaryRoute[state.secondaryRouteSegment]; const end = secondaryRoute[state.secondaryRouteSegment + 1];
    secondaryReceiver.x = start.x + (end.x - start.x) * state.secondaryRouteProgress; secondaryReceiver.y = start.y + (end.y - start.y) * state.secondaryRouteProgress;
    if (state.secondaryRouteProgress >= 1) { state.secondaryRouteSegment += 1; state.secondaryRouteProgress = 0; }
  }
  const cornerbacks = defenders.filter((defender) => defender.role === 'corner').sort((first, second) => Math.hypot(first.x - receiver.x, first.y - receiver.y) - Math.hypot(second.x - receiver.x, second.y - receiver.y));
  if (cornerbacks[0]) cornerbacks[0].assignment = 'receiver';
  if (cornerbacks[1]) cornerbacks[1].assignment = 'secondaryReceiver';
  const coverSpeed = delta * .13;
  defenders.forEach((defender) => {
    const target = defender.role === 'lineman' ? { x: .34, y: defender.y } : defender.assignment === 'receiver' ? { x: receiver.x - .02, y: receiver.y + .04 } : defender.assignment === 'secondaryReceiver' ? { x: secondaryReceiver.x + .02, y: secondaryReceiver.y + .04 } : defender.role === 'linebacker' ? { x: .42, y: defender.y } : { x: defender.x + .02, y: defender.y };
    defender.x += Math.max(-coverSpeed, Math.min(coverSpeed, target.x - defender.x));
    defender.y += Math.max(-coverSpeed, Math.min(coverSpeed, target.y - defender.y));
  });
}
function throwBall() {
  state.charging = false; state.play = 'thrown'; canvasHint.textContent = 'BALL IN THE AIR'; driveStatus.textContent = 'PLAY IN MOTION';
  const target = fieldPoint(receiver); const accuracy = Math.hypot(state.pointer.x - target.x, state.pointer.y - target.y); const distance = Math.hypot(target.x - fieldPoint(player).x, target.y - fieldPoint(player).y); const needed = Math.min(100, 42 + distance / 5); const goodPower = Math.abs(state.power - needed) < 21;
  const caught = accuracy < 75 && goodPower;
  const pointerWorldX = state.cameraX + state.pointer.x / canvas.clientWidth * fieldWindow;
  const pointerWorldY = state.pointer.y / canvas.clientHeight;
  state.ball = { worldX: player.x, worldY: player.y, targetX: caught ? receiver.x : receiver.x + (pointerWorldX - receiver.x) * .55, targetY: caught ? receiver.y : receiver.y + (pointerWorldY - receiver.y) * .55, catchX: receiver.x, catchY: receiver.y, progress: 0, caught, intercepted: false };
  playMessage.textContent = caught ? 'Perfect window. Malik has daylight!' : accuracy < 75 ? 'The ball is underthrown. Power matters.' : 'That one sailed. Bring the aim back inside.';
  requestAnimationFrame(animateBall);
}
function resetRoute() {
  const routeChoices = [
    [{ x: .42, y: .7 }, { x: .54, y: .7 }, { x: .66, y: .58 }, { x: .82, y: .58 }, { x: .92, y: .48 }],
    [{ x: .42, y: .7 }, { x: .5, y: .76 }, { x: .63, y: .76 }, { x: .76, y: .64 }, { x: .88, y: .64 }],
    [{ x: .42, y: .7 }, { x: .54, y: .62 }, { x: .66, y: .62 }, { x: .74, y: .42 }, { x: .9, y: .42 }],
    [{ x: .42, y: .7 }, { x: .5, y: .7 }, { x: .6, y: .82 }, { x: .76, y: .82 }, { x: .9, y: .72 }]
  ];
  const secondaryRouteChoices = [
    [{ x: .4, y: .2 }, { x: .5, y: .2 }, { x: .6, y: .3 }, { x: .72, y: .3 }, { x: .8, y: .18 }],
    [{ x: .4, y: .2 }, { x: .5, y: .28 }, { x: .64, y: .28 }, { x: .76, y: .18 }, { x: .9, y: .18 }],
    [{ x: .4, y: .2 }, { x: .54, y: .2 }, { x: .64, y: .12 }, { x: .78, y: .12 }, { x: .9, y: .28 }],
    [{ x: .4, y: .2 }, { x: .5, y: .14 }, { x: .6, y: .14 }, { x: .72, y: .36 }, { x: .86, y: .36 }]
  ];
  const routeIndex = Math.floor(Math.random() * routeChoices.length);
  let secondaryIndex = Math.floor(Math.random() * secondaryRouteChoices.length);
  if (secondaryIndex === routeIndex) secondaryIndex = (secondaryIndex + 1) % secondaryRouteChoices.length;
  route = routeChoices[routeIndex]; secondaryRoute = secondaryRouteChoices[secondaryIndex];
  state.routeSegment = 0; state.routeProgress = 0; state.secondaryRouteSegment = 0; state.secondaryRouteProgress = 0; receiver.x = route[0].x; receiver.y = route[0].y; secondaryReceiver.x = secondaryRoute[0].x; secondaryReceiver.y = secondaryRoute[0].y; receiver.diving = false; receiver.diveProgress = 0;
  const startingPositions = [
    [.34, .58], [.34, .65], [.34, .79], [.34, .86], [.47, .57], [.47, .79], [.55, .7], [.67, .18], [.8, .51], [.84, .75], [.91, .15]
  ];
  defenders.forEach((defender, index) => { defender.x = startingPositions[index][0]; defender.y = startingPositions[index][1]; });
}
function animateBall(time) { if (!state.ball) return; const ball = state.ball;
  if (ball.bouncing) {
    const elapsed = time - ball.bounceStartedAt; const bounceHeight = Math.max(0, 35 * (1 - elapsed / 1000));
    ball.worldY = ball.groundY - Math.abs(Math.sin(elapsed / 180 * Math.PI)) * bounceHeight / canvas.clientHeight; draw();
    if (elapsed >= 1000) finishPlay(); else requestAnimationFrame(animateBall);
    return;
  }
  ball.progress = Math.min(1, ball.progress + .025); const start = { x: player.x, y: player.y }; ball.worldX = start.x + (ball.targetX - start.x) * ball.progress; ball.worldY = start.y + (ball.targetY - start.y) * ball.progress - Math.sin(ball.progress * Math.PI) * .14;
  if (ball.caught && ball.progress > .42) {
    receiver.diving = true; receiver.diveProgress = Math.min(1, (ball.progress - .42) / .58);
    const diveProgress = receiver.diveProgress;
    receiver.x += (ball.catchX - receiver.x) * diveProgress * .18; receiver.y += (ball.catchY - receiver.y) * diveProgress * .18;
  }
  const interceptor = defenders.find((defender) => defender.role !== 'lineman' && Math.hypot(ball.worldX - defender.x, ball.worldY - defender.y) < .035);
  if (interceptor) { ball.intercepted = true; ball.interceptor = interceptor; ball.returning = true; state.play = 'interceptionReturn'; draw(); return; }
  draw(); if (ball.progress >= 1 && !ball.caught) { ball.bouncing = true; ball.bounceStartedAt = time; ball.groundY = ball.worldY; state.play = 'incomplete'; draw(); requestAnimationFrame(animateBall); } else if (ball.progress >= 1) finishPlay(); else requestAnimationFrame(animateBall);
}
function finishPlay() { const ball = state.ball; const intercepted = ball.intercepted; const caught = ball.caught && !intercepted; state.ball = null; state.play = caught ? 'caught' : intercepted ? 'intercepted' : 'incomplete'; if (intercepted) { state.down = 1; playMessage.textContent = ball.tackled ? 'INTERCEPTION! The defense is tackled.' : 'INTERCEPTION! The defense reaches the end zone.'; driveStatus.textContent = 'DEFENSE BALL'; } else if (caught) { state.score += 7; state.down = 1; state.yard = Math.min(99, state.yard + 18); playMessage.textContent = 'TOUCHDOWN! Same look, next drive.'; driveStatus.textContent = 'SCORE PLAY'; } else { state.down += 1; resetRoute(); state.play = 'ready'; playMessage.textContent = 'Incomplete pass. The play resets for second down.'; driveStatus.textContent = 'DRIVE LIVE'; } scoreValue.textContent = state.score; downValue.textContent = state.down > 4 ? 'TURNOVER' : `${state.down}${state.down === 1 ? 'st' : state.down === 2 ? 'nd' : state.down === 3 ? 'rd' : 'th'} & 10`; yardValue.textContent = state.yard > 50 ? `OPP ${100 - state.yard}` : `OWN ${state.yard}`; canvasHint.textContent = 'WASD MOVE • MOVE TO AIM • HOLD TO LOAD • RELEASE TO THROW'; setPower(0); draw(); }

canvas.addEventListener('pointermove', pointerPosition);
canvas.addEventListener('pointerdown', (event) => { if (state.play !== 'ready') return; canvas.setPointerCapture(event.pointerId); pointerPosition(event); state.charging = true; state.play = 'charging'; driveStatus.textContent = 'LOADING THROW'; canvasHint.textContent = 'BUILD POWER • RELEASE TO THROW'; });
canvas.addEventListener('pointerup', () => { if (state.charging) throwBall(); });
canvas.addEventListener('pointerleave', () => { if (state.charging) throwBall(); });
window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if ('wasd'.includes(key)) { event.preventDefault(); state.keys.add(key); } });
window.addEventListener('keyup', (event) => { state.keys.delete(event.key.toLowerCase()); });
function gameLoop(time) { const delta = Math.min(.05, (time - state.lastTime) / 1000 || 0); state.lastTime = time; movePlayers(delta); if (state.charging) setPower(50 + Math.sin(time / 320) * 50); draw(); requestAnimationFrame(gameLoop); }
resetButton.addEventListener('click', () => { state.score = 14; state.down = 1; state.yard = 32; state.play = 'ready'; state.ball = null; resetRoute(); player.x = .12; player.y = .72; driveStatus.textContent = 'DRIVE LIVE'; playMessage.textContent = 'Your receiver is breaking toward the right hash.'; canvasHint.textContent = 'WASD MOVE • MOVE TO AIM • HOLD TO LOAD • RELEASE TO THROW'; setPower(0); draw(); });
resetRoute(); window.addEventListener('resize', resizeCanvas); resizeCanvas(); requestAnimationFrame(gameLoop);
