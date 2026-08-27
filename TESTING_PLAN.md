# Watch Party playback-loop regression test

Primary scenario:
1. Host starts a Watch Party video and creates a next-content poll.
2. Let the current video end, close/select the winner, then press “Начать просмотр”.
3. The winning HLS video must play continuously without rapid pause/play oscillation.
4. Verify the play button and Space/K shortcuts still toggle playback normally.
5. Verify host play/pause commands still synchronize to a second participant.

Implementation note:
- The HTMLVideoElement is now authoritative for playback.
- Zustand player state mirrors native media events for UI only and no longer drives video.play()/video.pause().
- PlayerControls and keyboard shortcuts use the same explicit togglePlayPause path as the overlay/video click, so Watch Party host intent is emitted exactly once.
