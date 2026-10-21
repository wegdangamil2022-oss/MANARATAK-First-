# Interrupted Windows-only attempt

The newly owned PG16 process disappeared before suite beforeAll could connect. No financial case passed in this attempt. The cleanup helper failed because a stale PID file remained; graceful shutdown is not proven. Subsequent read-only inspection found the owned process absent and port closed. The stale PID file and private cluster were retained; no existing database was changed. The two cases were then executed successfully in a new isolated Linux PG16 lab, with separate exact-source evidence.
