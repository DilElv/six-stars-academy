UPDATE "students"
SET
  "sessionsUsed" = "totalSessions",
  "status" = CASE WHEN "totalSessions" > 0 THEN 'needs_renewal' ELSE "status" END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "totalSessions" IS NOT NULL
  AND "sessionsUsed" > "totalSessions";
