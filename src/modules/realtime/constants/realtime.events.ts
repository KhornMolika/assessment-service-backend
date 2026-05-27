export const RealtimeEvents = {
  // Client → Server
  JOIN_ROOM: 'JOIN_ROOM',
  START_Q: 'START_Q',
  SUBMIT_ANS: 'SUBMIT_ANS',

  // Server → Room (all connected clients)
  ROOM_UPDATE: 'ROOM_UPDATE',
  NEW_QUESTION: 'NEW_QUESTION',
  Q_RESULTS: 'Q_RESULTS',
  SHOW_RANK: 'SHOW_RANK',
  SHOW_FINAL_RANK: 'SHOW_FINAL_RANK',
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',

  // Server → Individual participant
  SESSION_RESULT: 'session:result',

  // Server → Individual (errors)
  ERROR: 'error',
} as const;

export type RealtimeEvent =
  (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
