const { runInit } = require("./initDb");
const db = require("./db");

async function main() {
    try {
        console.log("Running DB Init...");
        await runInit();
        console.log("DB Init Complete. Exiting.");
        process.exit(0);
    } catch (err) {
        console.error("Init failed", err);
        process.exit(1);
    }
}

main();
