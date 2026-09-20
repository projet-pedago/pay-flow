import { queryPostgres } from "./lib/postgres.js";

async function main() {
  const result = await queryPostgres(
    "SELECT id, name, code, budget, color FROM departments ORDER BY id"
  );

  console.log("POSTGRES_OK");
  console.log("Nombre de départements :", result.rowCount);
  console.log(result.rows);

  process.exit(0);
}

main().catch((error) => {
  console.error("POSTGRES_ERROR");
  console.error(error);
  process.exit(1);
});
