/**
 * Quick script to seed some sample light poles into the database
 * Run: node seed-light-poles.js
 */

const db = require("./db");

async function seedLightPoles() {
  const lightPoles = [
    { pole_id: "LP-001", location: "Main Street & 1st Ave", latitude: 40.7128, longitude: -74.0060, status: "Active" },
    { pole_id: "LP-002", location: "Park Avenue & 5th Street", latitude: 40.7580, longitude: -73.9855, status: "Active" },
    { pole_id: "LP-003", location: "Downtown Plaza", latitude: 40.7489, longitude: -73.9680, status: "Active" },
    { pole_id: "LP-004", location: "Residential Area - Block A", latitude: 40.7306, longitude: -73.9352, status: "Active" },
    { pole_id: "LP-005", location: "Highway Exit 12", latitude: 40.7589, longitude: -73.9851, status: "Active" },
    { pole_id: "LP-006", location: "Shopping District", latitude: 40.7614, longitude: -73.9776, status: "Active" },
    { pole_id: "LP-007", location: "University Campus", latitude: 40.8075, longitude: -73.9626, status: "Active" },
    { pole_id: "LP-008", location: "Industrial Zone - Sector 3", latitude: 40.7282, longitude: -73.7949, status: "Active" },
    { pole_id: "LP-009", location: "Beach Road", latitude: 40.5795, longitude: -73.9680, status: "Active" },
    { pole_id: "LP-010", location: "Airport Approach Road", latitude: 40.6413, longitude: -73.7781, status: "Active" },
    { pole_id: "LP-011", location: "Suburban Area - Zone B", latitude: 40.7450, longitude: -73.9950, status: "Active" },
    { pole_id: "LP-012", location: "Near Vampire House", latitude: 40.7150, longitude: -73.9280, status: "Active" },
  ];

  try {
    console.log("🔌 Connecting to database...");
    await db.query("SELECT 1");
    console.log("✅ Connected to database");

    console.log("\n📍 Inserting light poles...");
    for (const pole of lightPoles) {
      try {
        // Check if pole already exists
        const [existing] = await db.query("SELECT id FROM light_pole WHERE pole_id = ?", [pole.pole_id]);
        
        if (existing.length > 0) {
          console.log(`⏭️  Pole ${pole.pole_id} already exists, skipping...`);
        } else {
          await db.query(
            "INSERT INTO light_pole (pole_id, location, latitude, longitude, status) VALUES (?, ?, ?, ?, ?)",
            [pole.pole_id, pole.location, pole.latitude, pole.longitude, pole.status]
          );
          console.log(`✅ Added: ${pole.pole_id} - ${pole.location}`);
        }
      } catch (err) {
        console.error(`❌ Failed to add ${pole.pole_id}:`, err.message);
      }
    }

    console.log("\n🎉 Seeding complete!");
    console.log(`📊 Total poles in database:`);
    const [count] = await db.query("SELECT COUNT(*) as total FROM light_pole");
    console.log(`   ${count[0].total} light poles`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedLightPoles();
