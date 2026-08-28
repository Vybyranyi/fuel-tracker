/**
 * Малюнок іконки застосунку.
 *
 * Не React-компонент для сторінки, а джерело для `ImageResponse`: з нього
 * рендеряться і фавікон, і іконка для головного екрана iPhone, і ті, що
 * перелічені в маніфесті. Спільний файл, бо інакше той самий шлях SVG лежав
 * би в чотирьох місцях і розʼїхався б при першій же зміні.
 *
 * Розмір гліфа задається часткою від сторони, а не в пікселях: маскована
 * іконка мусить лишати запас по краях (система обрізає її під форму, свою на
 * кожному пристрої), і саме ця частка — єдине, чим вона відрізняється.
 */
export function AppIcon({
  glyphRatio,
  size,
  background,
}: {
  /** Частка сторони, яку займає гліф. */
  glyphRatio: number;
  size: number;
  /** `undefined` — прозоре тло: так фавікон лягає на будь-яку панель вкладок. */
  background?: string;
}) {
  const glyph = Math.round(size * glyphRatio);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Ключ додається лише тоді, коли тло справді є: `background:
        // undefined` satori не пропускає — валиться ще на розборі стилів.
        ...(background ? { background } : {}),
        color: "black",
      }}
    >
      {/* Той самий «fuel» з lucide, що й у навігації: іконка на головному
          екрані має збігатися з тим, що видно всередині застосунку. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5" />
        <path d="M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16" />
        <path d="M2 21h13" />
        <path d="M3 9h11" />
      </svg>
    </div>
  );
}
