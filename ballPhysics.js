/**
 * Ball Physics Engine for Scan2Golf
 * Simulates golf ball rolling on terrain heightmap
 */

import { sampleHeight, getSurfaceNormal } from './terrainGenerator';

const GRAVITY = 9.8;
const FRICTION = 0.985;       // Rolling friction
const RESTITUTION = 0.3;      // Bounce damping
const TERRAIN_SCALE = 0.4;    // How much terrain height affects physics
const MIN_VELOCITY = 0.0008;  // Stop threshold

export function createBall(x, y, vx, vy) {
  return {
    id: Date.now() + Math.random(),
    x,           // Normalized 0-1
    y,           // Normalized 0-1
    vx,          // Velocity x
    vy,          // Velocity y
    trail: [{ x, y }],
    active: true,
    inHole: false,
    bounces: 0,
  };
}

export function updateBall(ball, terrainData, dt = 0.016) {
  if (!ball.active || ball.inHole) return ball;

  const normal = getSurfaceNormal(terrainData, ball.x, ball.y);

  // Gravity pulls ball down the slope
  const ax = -normal.x * GRAVITY * TERRAIN_SCALE * dt;
  const ay = -normal.y * GRAVITY * TERRAIN_SCALE * dt;

  let vx = (ball.vx + ax) * FRICTION;
  let vy = (ball.vy + ay) * FRICTION;

  let x = ball.x + vx * dt;
  let y = ball.y + vy * dt;

  // Boundary bouncing
  if (x < 0.02) { x = 0.02; vx = Math.abs(vx) * RESTITUTION; }
  if (x > 0.98) { x = 0.98; vx = -Math.abs(vx) * RESTITUTION; }
  if (y < 0.02) { y = 0.02; vy = Math.abs(vy) * RESTITUTION; }
  if (y > 0.98) { y = 0.98; vy = -Math.abs(vy) * RESTITUTION; }

  // Check if ball is near hole
  const hx = terrainData.holePosition.x;
  const hy = terrainData.holePosition.y;
  const distToHole = Math.sqrt(Math.pow(x - hx, 2) + Math.pow(y - hy, 2));
  const inHole = distToHole < 0.03;

  // Stop if velocity too low
  const speed = Math.sqrt(vx * vx + vy * vy);
  const active = speed > MIN_VELOCITY && !inHole;

  // Update trail
  const trail = [...ball.trail, { x, y }].slice(-40);

  return {
    ...ball,
    x,
    y,
    vx: active ? vx : 0,
    vy: active ? vy : 0,
    active,
    inHole,
    trail,
  };
}

export function launchBallFromSwipe(startX, startY, endX, endY, terrainData) {
  // Convert screen gesture to normalized terrain coords and velocity
  const power = Math.min(
    Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 100,
    2.5
  );

  const angle = Math.atan2(endY - startY, endX - startX);

  // Start ball from a reasonable launch position
  const ballX = 0.15 + Math.random() * 0.1;
  const ballY = 0.8 + Math.random() * 0.1;

  const vx = Math.cos(angle) * power * 0.008;
  const vy = Math.sin(angle) * power * 0.008;

  return createBall(ballX, ballY, vx, vy);
}
