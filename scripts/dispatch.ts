import 'dotenv/config';
import { dispatchReminders } from '../src/lib/reminders/dispatch';

async function main() {
  const stats = await dispatchReminders();
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
