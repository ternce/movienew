-- Enforce at most one ACTIVE poll per Watch Party room while preserving
-- historical CLOSED polls.
CREATE UNIQUE INDEX "watch_party_polls_one_active_per_room_key"
ON "watch_party_polls"("room_id")
WHERE "status" = 'ACTIVE';
