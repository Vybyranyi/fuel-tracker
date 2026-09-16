import { createExport } from "@/features/export/services/export.service";
import { exportRequestSchema } from "@/features/export/schemas/export.schema";
import { firstValidationError } from "@/lib/validation-error";
import { UserFacingError } from "@/lib/safe-action";

/**
 * Node, а не Edge: і `exceljs`, і генератор PDF працюють із буферами й
 * шрифтом із файлової системи. На Edge немає ні `node:fs`, ні `Buffer`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Вивантаження — маршрут, а не server action.
 *
 * Server action віддає лише серіалізований результат, тобто файл довелося б
 * везти через base64 і складати назад у браузері. Маршрут віддає байти як є —
 * із `Content-Disposition`, який на iOS відкриває «Поділитися», а на решті
 * систем просто зберігає файл.
 *
 * Доступ перевіряє сам сервіс через `requireCarScope()`: проксі сюди теж
 * заглядає, але покладатись лише на нього не можна — про це прямо попереджає
 * документація Next.
 */
export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Неправильний запит" }, { status: 400 });
  }

  const parsed = exportRequestSchema.safeParse(payload);

  if (!parsed.success) {
    const message =
      firstValidationError(parsed.error.format()) ?? "Неправильний запит";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const file = await createExport(parsed.data);

    return new Response(new Uint8Array(file.body), {
      headers: {
        "content-type": file.contentType,
        // Назва латиницею — щоб не перетворитись на відсотки дорогою, —
        // тому другої, закодованої форми тут не треба.
        "content-disposition": `attachment; filename="${file.fileName}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Не вдалося зібрати вивантаження", error);
    return Response.json(
      { error: "Не вдалося зібрати файл. Спробуйте ще раз." },
      { status: 500 },
    );
  }
}
