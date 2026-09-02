const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const db = require('../db/database');
const crypto = require('crypto');

const RP_NAME = 'Nexus Commerce';
const RP_ID = 'localhost';
const ORIGIN = 'http://localhost:5173';

// Short-lived in-memory challenge store
const pendingChallenges = new Map();

async function getRegistrationOptions(sessionId) {
  const opts = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(sessionId),
    userName: `user_${sessionId.slice(-8)}`,
    userDisplayName: 'Nexus User',
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred'
    }
  });
  pendingChallenges.set(sessionId + '_reg', opts.challenge);
  return opts;
}

async function verifyRegistration(sessionId, credential) {
  const expectedChallenge = pendingChallenges.get(sessionId + '_reg');
  if (!expectedChallenge) throw new Error('No pending registration challenge');

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false
  });

  if (!verification.verified) throw new Error('Registration verification failed');

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  const passkeyId = crypto.randomUUID();

  db.prepare(
    'INSERT OR REPLACE INTO Passkey (id, session_id, credential_id, public_key, counter) VALUES (?, ?, ?, ?, ?)'
  ).run(
    passkeyId,
    sessionId,
    Buffer.from(credentialID).toString('base64url'),
    Buffer.from(credentialPublicKey).toString('base64'),
    counter
  );

  pendingChallenges.delete(sessionId + '_reg');
  return { verified: true, passkeyId };
}

async function getAuthenticationOptions(sessionId) {
  const passkeys = db.prepare('SELECT * FROM Passkey WHERE session_id = ?').all(sessionId);

  if (passkeys.length === 0) {
    throw new Error('No passkey registered for this session');
  }

  const opts = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials: passkeys.map(p => ({
      id: Buffer.from(p.credential_id, 'base64url'),
      type: 'public-key'
    }))
  });

  pendingChallenges.set(sessionId + '_auth', opts.challenge);
  return opts;
}

async function verifyAuthentication(sessionId, credential) {
  const expectedChallenge = pendingChallenges.get(sessionId + '_auth');
  if (!expectedChallenge) throw new Error('No pending authentication challenge');

  const passkey = db.prepare('SELECT * FROM Passkey WHERE session_id = ? LIMIT 1').get(sessionId);
  if (!passkey) throw new Error('No passkey found for this session');

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
    credential: {
      id: Buffer.from(passkey.credential_id, 'base64url'),
      publicKey: Buffer.from(passkey.public_key, 'base64'),
      counter: passkey.counter
    }
  });

  if (!verification.verified) throw new Error('Authentication verification failed');

  // Update counter to prevent replay attacks
  db.prepare('UPDATE Passkey SET counter = ? WHERE id = ?').run(
    verification.authenticationInfo.newCounter,
    passkey.id
  );

  pendingChallenges.delete(sessionId + '_auth');

  // Issue a short-lived token (90s)
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 90_000;
  pendingChallenges.set(sessionId + '_token', { token, expires });

  return { verified: true, token };
}

function validateToken(sessionId, token) {
  const entry = pendingChallenges.get(sessionId + '_token');
  if (!entry) return false;
  if (Date.now() > entry.expires) return false;
  if (entry.token !== token) return false;
  pendingChallenges.delete(sessionId + '_token');
  return true;
}

function generateFallbackToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 90_000;
  pendingChallenges.set(sessionId + '_token', { token, expires });
  return token;
}

module.exports = {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  validateToken,
  generateFallbackToken
};
