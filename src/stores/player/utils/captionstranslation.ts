import subsrt from "subsrt-ts";
import { Caption, ContentCaption } from "subsrt-ts/dist/types/handler";

const API_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&ie=UTF-8&oe=UTF-8&sl=auto";
const RETRY_COUNT = 3;
const FETCH_RATE = 100;
const SUBTITLES_CACHE: Map<string, ArrayBuffer> = new Map<
  string,
  ArrayBuffer
>();

async function compressStr(string: string): Promise<ArrayBuffer> {
  const byteArray = new TextEncoder().encode(string);
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer();
}

async function decompressStr(byteArray: ArrayBuffer): Promise<string> {
  const cs = new DecompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  return new Response(cs.readable).arrayBuffer().then((arrayBuffer) => {
    return new TextDecoder().decode(arrayBuffer);
  });
}

function tryUseCachedCaption(
  caption: ContentCaption,
  cache: Map<string, string>,
): boolean {
  const text: string | undefined = cache.get(caption.text);
  if (text) {
    caption.text = text;
    return true;
  }
  return false;
}

async function translateText(
  text: string,
  targetLang: string,
): Promise<string | undefined> {
  if (!text) {
    return "";
  }

  const response = await (
    await fetch(`${API_URL}&tl=${targetLang}&q=${encodeURIComponent(text)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();

  if (!response) {
    throw new Error("Empty response");
  }

  return (response.sentences as any[])
    .map((s: any) => s.trans as string)
    .join("");
}

async function translateCaption(
  caption: ContentCaption,
  targetLang: string,
): Promise<boolean> {
  (caption as any).oldText = caption.text;
  let text: string | undefined;
  for (let i = 0; i < RETRY_COUNT; i += 1) {
    try {
      text = await translateText(
        caption.text.replace("\n", "<br>"),
        targetLang,
      );
      if (text) {
        text = text.replace("<br>", "\n");
        break;
      }
    } catch (error) {
      console.warn("Re-trying caption translation", caption, error);
    }
  }
  if (!text) {
    console.error("Failed to translate caption");
    caption.text = `(CAPTION COULD NOT BE TRANSLATED)\n${caption.text}`;
    return false;
  }
  caption.text = text.trim();
  return true;
}

async function translateCaptions(
  captions: ContentCaption[],
  targetLang: string,
): Promise<boolean> {
  // console.log("Translating", captions.length, "captions");
  try {
    const results: boolean[] = await Promise.all(
      captions.map((c) => translateCaption(c, targetLang)),
    );

    const successCount = results.filter((v) => v).length;
    const failedCount = results.length - successCount;
    const successPercentage = (successCount / results.length) * 100;
    const failedPercentage = (failedCount / results.length) * 100;
    // console.log(
    //   "Done translating captions",
    //   results.length,
    //   successCount,
    //   failedCount,
    //   successPercentage,
    //   failedPercentage,
    // );

    if (failedPercentage > successPercentage) {
      throw new Error("Success percentage is not acceptable");
    }
  } catch (error) {
    console.error("Could not translate", captions.length, "captions", error);
    return false;
  }
  return true;
}

async function translateSRTData(
  data: string,
  targetLang: string,
): Promise<string | undefined> {
  let captions: Caption[];
  try {
    captions = subsrt.parse(data);
  } catch (error) {
    console.error("Failed to parse subtitle data", error);
    return undefined;
  }

  let translatedCaptions: Caption[] | undefined = [];
  const contentCaptions: ContentCaption[] = [];
  const translatedCache: Map<string, string> = new Map<string, string>();

  for (const caption of captions) {
    translatedCaptions.push(caption);
    if (caption.type !== "caption") {
      continue;
    }
    caption.text = caption.text
      .trim()
      .replace("\r\n", "\n")
      .replace("\r", "\n");
    contentCaptions.push(caption);
  }

  for (let i = 0; i < contentCaptions.length; i += 1) {
    if (tryUseCachedCaption(contentCaptions[i], translatedCache)) {
      continue;
    }
    const batch: ContentCaption[] = [contentCaptions[i]];

    let j;
    for (j = 1; j < FETCH_RATE; j += 1) {
      if (i + j >= contentCaptions.length) {
        break;
      }
      if (tryUseCachedCaption(contentCaptions[i + j], translatedCache)) {
        continue;
      }
      batch.push(contentCaptions[i + j]);
    }
    i += j;

    if (!(await translateCaptions(batch, targetLang))) {
      translatedCaptions = undefined;
      break;
    }

    batch.forEach((c) => translatedCache.set((c as any).oldText!, c.text));
  }

  return translatedCaptions
    ? subsrt.build(translatedCaptions, { format: "srt" })
    : undefined;
}

// TODO: make this support multiple providers rather than just google translate
export async function translateSubtitle(
  id: string,
  srtData: string,
  targetLang: string,
): Promise<string | undefined> {
  const cacheID = `${id}_${targetLang}`;

  const cachedData: ArrayBuffer | undefined = SUBTITLES_CACHE.get(cacheID);
  if (cachedData) {
    // console.log("Using cached translation for", id, cacheID);
    return decompressStr(cachedData);
  }

  // console.log("Translating", id);
  const translatedData: string | undefined = await translateSRTData(
    srtData,
    targetLang,
  );
  if (!translatedData) {
    return undefined;
  }

  // console.log("Caching translation for", id, cacheID);
  SUBTITLES_CACHE.set(cacheID, await compressStr(translatedData));
  return translatedData;
}
