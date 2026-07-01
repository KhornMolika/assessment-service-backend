export const RealtimeEvents = {
  // Client → Server
  JOIN_ROOM: 'JOIN_ROOM',
  LEAVE_ROOM: 'LEAVE_ROOM',
  START_Q: 'START_Q',
  SUBMIT_ANS: 'SUBMIT_ANS',
  REVEAL_ANSWERS: 'REVEAL_ANSWERS',

  // Server → Room (all connected clients)
  ROOM_UPDATE: 'ROOM_UPDATE',
  ROOM_STATE: 'ROOM_STATE',
  NEW_QUESTION: 'NEW_QUESTION',
  Q_RESULTS: 'Q_RESULTS',
  SHOW_RANK: 'SHOW_RANK',
  SHOW_FINAL_RANK: 'SHOW_FINAL_RANK',
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_ENDED: 'SESSION_ENDED',

  // Server → Individual participant
  SESSION_RESULT: 'SESSION_RESULT',

  // Server → Individual (errors)
  ERROR: 'ERROR',
} as const;

export type RealtimeEvent =
  (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
