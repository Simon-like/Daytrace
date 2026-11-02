import type { RecordType, TocItem } from "@daytrace/contracts";

export interface ReaderSupplement {
  readonly id: string;
  readonly occurredOn: string;
  readonly title?: string;
  readonly text: string;
}

export interface ReaderQuickLink {
  readonly id: string;
  readonly label: "材料" | "工序" | "注意点";
  readonly target: string;
}

export const RECORD_TYPE_LABELS: Readonly<Record<RecordType, string>> = {
  engineering: "技术实践",
  recipe: "生活经验",
  reflection: "随想认知",
};

/** Keep three indentation levels relative to the shallowest heading in the document. */
export function createReaderToc(items: readonly TocItem[]): readonly TocItem[] {
  if (items.length === 0) return [];
  const firstLevel = Math.min(...items.map((item) => item.level));
  return items.filter((item) => item.level < firstLevel + 3);
}

function matchesSection(text: string, pattern: RegExp): boolean {
  return pattern.test(text.trim());
}

const MATERIAL_HEADING = /^(?:材料|食材|配料)(?:$|[\s、，：:与和])/;
const STEPS_HEADING = /^(?:(?:制作)?步骤|工序|做法)(?:$|[\s、，：:与和])/;
const NOTES_HEADING = /^(?:注意点|注意事项|提醒)(?:$|[\s、，：:与和])/;

/** Quick links are derived only from headings that really exist in the record. */
export function createRecipeQuickLinks(items: readonly TocItem[]): readonly ReaderQuickLink[] {
  const links: ReaderQuickLink[] = [];
  const addFirstMatch = (label: ReaderQuickLink["label"], pattern: RegExp): void => {
    const match = items.find((item) => matchesSection(item.text, pattern));
    if (match !== undefined) links.push({ id: `recipe-${label}`, label, target: match.id });
  };

  addFirstMatch("材料", MATERIAL_HEADING);
  addFirstMatch("工序", STEPS_HEADING);
  addFirstMatch("注意点", NOTES_HEADING);
  return links;
}
