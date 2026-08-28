import { runDailyJobs } from "@/features/cron/services/daily-dispatcher";
import { secretsMatch } from "@/lib/secret";

/**
 * Node, а не Edge: диспетчер ходить у базу через драйвер Neon, шле пуші через
 * `web-push` і підписує запити до Google — усе це потребує Node-рантайму.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Чи це справді Versel зі своїм крон-секретом.
 *
 * Ендпоінт свідомо стоїть поза PIN-гейтом (див. matcher у middleware): крон
 * приходить без куки. Тому в нього власний захист — інакше будь-хто, знаючи
 * адресу, міг би вистрілювати пушами й дописувати рядки в таблицю.
 */
function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    // Без секрету відкривати ендпоінт не можна навіть «тимчасово».
    console.error("CRON_SECRET не заданий — крон-ендпоінт вимкнено");
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  return secretsMatch(header.slice("Bearer ".length), expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const report = await runDailyJobs();

  // Звіт іде тілом відповіді в обох випадках — саме його видно в логах
  // Versel. Але код 500 при збої потрібен, щоб невдалий запуск було видно в
  // списку крон-задач червоним, а не серед однакових зелених рядків.
  return Response.json(report, { status: report.ok ? 200 : 500 });
}
