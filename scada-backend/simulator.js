const pool = require('./db');

async function getSimulatedTags() {
    // UPDATED: Now also get the project_id so we can broadcast to the right clients
    const { rows } = await pool.query(`
        SELECT t.tag_id, t.tag_type, t.simulation_min, t.simulation_max,
               t.simulation_noise, t.simulation_pattern,
               d.project_id
        FROM tags t
                 JOIN devices d ON t.device_id = d.device_id
        WHERE t.simulation = true
    `);
    return rows;
}

const lastValue = {}; // Store previous value for analog tags

function randomAnalog(min, max, last, noise) {
    if (last === undefined) return min + Math.random() * (max - min);
    let next = last + (Math.random() - 0.5) * (noise || 1) * 2;
    return Math.max(min, Math.min(max, next));
}

function randomDigital(pattern) {
    // Simple toggle pattern: pattern='[0,1,1,0]'
    let arr = [0, 1];
    try { arr = JSON.parse(pattern); } catch {}
    const t = Math.floor(Date.now() / 3000) % arr.length;
    return arr[t];
}

async function simulate() {
    const tags = await getSimulatedTags();
    const now = new Date();

    for (let tag of tags) {
        let value;
        if (tag.tag_type === 'analog') {
            value = randomAnalog(tag.simulation_min ?? 0, tag.simulation_max ?? 100, lastValue[tag.tag_id], tag.simulation_noise ?? 1);
            lastValue[tag.tag_id] = value;
        } else if (tag.tag_type === 'digital') {
            value = randomDigital(tag.simulation_pattern || '[0,1]');
        } else {
            value = randomAnalog(tag.simulation_min ?? 0, tag.simulation_max ?? 100, lastValue[tag.tag_id], tag.simulation_noise ?? 1);
            lastValue[tag.tag_id] = value;
        }

        try {
            // Save to database (your existing code)
            await pool.query(
                `INSERT INTO measurements (tag_id, value, timestamp) VALUES ($1, $2, $3)`,
                [tag.tag_id, value, now]
            );
            console.log(`[SIM] Tag ${tag.tag_id}: ${value}`);

            // NEW: Broadcast via WebSocket if available
            if (global.wsManager) {
                global.wsManager.broadcastMeasurement(
                    tag.tag_id,
                    value,
                    now.toISOString(),
                    tag.project_id
                );
            }

        } catch (err) {
            console.error(`Simulation insert error for tag ${tag.tag_id}:`, err.message);
        }
    }
}

setInterval(simulate, 2000);
console.log("🔄 Simulation running! Tags with simulation=true will get data.");
simulate();