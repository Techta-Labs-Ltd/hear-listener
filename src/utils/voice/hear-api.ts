import type {
  EntityType,
  ExternalConfirmationPromptKind,
  ExternalPlaybackTrack,
  ExternalResolverChoice,
  HearAmbiguityCandidate,
  HearResolverEntity,
  HearResolverResult,
  HearResolverSlots,
  HearSearchFilter,
  HearSearchRequest,
  HearSearchSort,
} from "@/types";
import { RESOLVER_EXACT_CONFIDENCE } from "@/constants/external-voice";

const ENTITY_TYPES: ReadonlySet<EntityType> = new Set([
  "organization",
  "publication",
  "creator",
  "category",
  "tag",
  "location",
  "story",
]);

const SEARCH_SORTS: ReadonlySet<HearSearchSort> = new Set([
  "recommended",
  "nearest",
  "popular",
  "latest",
  "trending",
]);

const SOURCE_TYPES: ReadonlySet<EntityType> = new Set([
  "creator",
  "organization",
  "publication",
]);

export function parseHearResolverResult(
  value: unknown,
): HearResolverResult | undefined {
  if (
    !isRecord(value) ||
    !nonEmptyString(value.status) ||
    !nonEmptyString(value.intent) ||
    !Array.isArray(value.entities) ||
    !isRecord(value.slots) ||
    !Array.isArray(value.ambiguities) ||
    !finiteNumber(value.timingMs)
  ) {
    return undefined;
  }

  const entities = value.entities.flatMap((item) => {
    const entity = parseResolverEntity(item);
    return entity ? [entity] : [];
  });
  if (entities.length !== value.entities.length) return undefined;

  const ambiguities = value.ambiguities.flatMap((item) => {
    const ambiguity = parseResolverAmbiguity(item);
    return ambiguity ? [ambiguity] : [];
  });
  if (ambiguities.length !== value.ambiguities.length) return undefined;

  const slots = parseResolverSlots(value.slots);
  if (!slots) return undefined;

  return {
    status: value.status,
    intent: value.intent,
    entities,
    slots,
    ambiguities,
    timingMs: value.timingMs,
  };
}

export function buildAmbiguityChoices(
  result: HearResolverResult,
): ExternalResolverChoice[] {
  const seen = new Set<string>();
  const choices: ExternalResolverChoice[] = [];
  for (const ambiguity of result.ambiguities) {
    for (const candidate of ambiguity.candidates) {
      if (!candidate.entityId) continue;
      const label = humanizeLabel(candidate.canonicalValue);
      const key = label.toLocaleLowerCase("en-GB");
      if (!label || seen.has(key)) continue;
      seen.add(key);
      choices.push({
        id: candidateKey(candidate),
        label,
        detail: entityTypeLabel(candidate.entityType),
        entityType: candidate.entityType,
      });
      if (choices.length === 3) return choices;
    }
  }
  return choices;
}

export function findAmbiguityCandidate(
  result: HearResolverResult,
  id: string,
): HearAmbiguityCandidate | undefined {
  for (const ambiguity of result.ambiguities) {
    const candidate = ambiguity.candidates.find(
      (item) => item.entityId && candidateKey(item) === id,
    );
    if (candidate) return candidate;
  }
  return undefined;
}

export function buildAmbiguityPrompt(
  result: HearResolverResult,
  choices: ExternalResolverChoice[],
): string {
  const names = choices.map((choice) => choice.label);
  if (names.length === 0) {
    return "I found more than one match. Please say the full name you want.";
  }
  const commonPrefix = sharedWordPrefix(names);
  if (commonPrefix) {
    const suffixes = names.map((name) =>
      name.slice(commonPrefix.length).replace(/^[\s,–—-]+/, "").trim(),
    );
    if (suffixes.every(Boolean)) {
      return `I found several matches beginning ${commonPrefix}. Please say the distinguishing part: ${spokenList(suffixes)}.`;
    }
  }
  const phrase = humanizeLabel(result.ambiguities[0]?.phrase ?? "that name");
  return `I found more than one match for ${phrase}. Did you mean ${spokenList(names)}?`;
}

export function buildHearSearchRequest(
  result: HearResolverResult,
  selectedCandidate?: HearAmbiguityCandidate,
): HearSearchRequest {
  const filter: HearSearchFilter = {};
  const entities = [...result.entities].sort(
    (left, right) => right.confidence - left.confidence,
  );

  addEntityIds(filter, "creatorIds", entities, "creator");
  addEntityIds(filter, "organizationIds", entities, "organization");
  addEntityIds(filter, "publicationIds", entities, "publication");
  const exactTaxonomy = exactTaxonomyEntities(entities);
  addEntityIds(filter, "categorySlugs", exactTaxonomy, "category");
  addEntityIds(filter, "tags", exactTaxonomy, "tag");

  const sources = entities.filter((entity) => SOURCE_TYPES.has(entity.entityType));
  const location = entities.find(
    (entity) =>
      entity.entityType === "location" &&
      !sources.some((source) => spansOverlap(entity, source)),
  );
  let isLocal = false;
  if (location) {
    filter.city = location.canonicalValue;
    if (location.countryCode?.length === 2) {
      filter.countryCode = location.countryCode.toLocaleLowerCase("en-GB");
    }
    if (
      finiteNumber(location.latitude) &&
      finiteNumber(location.longitude)
    ) {
      filter.latitude = location.latitude;
      filter.longitude = location.longitude;
    }
    isLocal = true;
  }

  if (
    result.slots.isPublication ||
    (result.intent === "publication" && !filter.publicationIds?.length)
  ) {
    filter.isPublication = true;
  }
  if (result.slots.publishedFrom !== undefined) {
    filter.publishedFrom = result.slots.publishedFrom;
  }
  if (result.slots.publishedTo !== undefined) {
    filter.publishedTo = result.slots.publishedTo;
  }

  if (selectedCandidate) {
    applySelectedCandidate(filter, selectedCandidate);
    isLocal = selectedCandidate.entityType === "location" || isLocal;
  }

  const requestedSort = result.slots.latest
    ? "latest"
    : result.slots.sort;
  const sort = isSearchSort(requestedSort) ? requestedSort : undefined;
  const request: HearSearchRequest = {
    q: selectedCandidate
      ? ""
      : fallbackSearchQuery(result, exactTaxonomy),
    isLocal,
    isRecommended: result.slots.isRecommended,
    page: 0,
    limit: 3,
  };
  if (Object.keys(filter).length > 0) request.filter = filter;
  if (sort) request.sort = sort;
  return request;
}

export function buildSearchConfirmationLabel(
  result: HearResolverResult,
  selectedCandidate?: HearAmbiguityCandidate,
): string {
  const entities = selectedCandidate
    ? [
        ...result.entities.filter(
          (entity) => !SOURCE_TYPES.has(entity.entityType),
        ),
        {
          ...selectedCandidate,
          originalText: selectedCandidate.canonicalValue,
          confidence: 100,
          method: "ambiguity-selection",
          start: 0,
          end: selectedCandidate.canonicalValue.length,
        } satisfies HearResolverEntity,
      ]
    : [...result.entities];
  entities.sort((left, right) => right.confidence - left.confidence);

  const categories = entityNames(entities, "category");
  const tags = entityNames(entities, "tag");
  const residual = humanizeLabel(result.slots.residualQuery);
  const taxonomyFacets = uniqueStrings([...categories, ...tags]);
  const spokenFacets = uniqueStrings([
    ...taxonomyFacets,
    ...(residual ? [residual] : []),
  ]);
  let subject =
    categories.length > 0 && residual
      ? `${taxonomyFacets.join(" and ")} ${residual}`
      : spokenFacets.join(" and ");
  if (!subject) subject = result.slots.isPublication ? "publication" : "content";

  const source =
    entityNames(entities, "organization")[0] ??
    entityNames(entities, "creator")[0];
  const publication = entityNames(entities, "publication")[0];
  const isTopicOnly = spokenFacets.length > 0 && !source && !publication;
  if (isTopicOnly) subject = `content on ${subject}`;
  if (result.slots.latest) subject = `the latest ${subject}`;
  if (source) subject = `${subject} from ${source}`;
  if (publication) {
    subject =
      !spokenFacets.length &&
        /^(?:the latest )?(?:content|publication)$/.test(subject)
        ? result.slots.latest
          ? `the latest ${publication}`
          : publication
        : `${subject} from ${publication}`;
  }

  const sources = entities.filter((entity) => SOURCE_TYPES.has(entity.entityType));
  const location = entities.find(
    (entity) =>
      entity.entityType === "location" &&
      !sources.some((candidate) => spansOverlap(entity, candidate)),
  );
  if (location) subject = `${subject} in ${location.canonicalValue}`;
  const period = publishedPeriodLabel(result.slots);
  if (period) subject = `${subject} published ${period}`;
  return subject;
}

export function buildConfirmationPrompt(
  label: string,
  kind: ExternalConfirmationPromptKind = "search",
): string {
  const spokenLabel =
    label.replace(/^#+/, "").replace(/[-_]+/g, " ").trim() || "that";
  return kind === "ambiguity-selection"
    ? `Did you mean ${spokenLabel}?`
    : `Did you want me to play ${spokenLabel}?`;
}

export function parseHearSearchResponse(
  value: unknown,
  maxTracks = Number.POSITIVE_INFINITY,
): { tracks: ExternalPlaybackTrack[]; total: number } | undefined {
  if (!isRecord(value) || !Array.isArray(value.results)) return undefined;
  const expanded = value.results.flatMap(expandPublication);
  const tracks = expanded.flatMap((item) => {
    const track = parseSearchTrack(item);
    return track ? [track] : [];
  });
  return {
    tracks: tracks.slice(0, maxTracks),
    total: finiteNumber(value.total) ? value.total : tracks.length,
  };
}

export function humanizeLabel(value: string): string {
  const label = value.replace(/^#+/, "").replace(/[-_]+/g, " ").trim();
  return label
    ? `${label.charAt(0).toLocaleUpperCase("en-GB")}${label.slice(1)}`
    : "";
}

function parseResolverEntity(value: unknown): HearResolverEntity | undefined {
  if (
    !isRecord(value) ||
    !isEntityType(value.entityType) ||
    !nonEmptyString(value.canonicalValue) ||
    !nonEmptyString(value.originalText) ||
    !finiteNumber(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 100 ||
    !nonEmptyString(value.method) ||
    !integer(value.start) ||
    !integer(value.end)
  ) {
    return undefined;
  }
  return {
    entityType: value.entityType,
    ...(nonEmptyString(value.entityId) ? { entityId: value.entityId } : {}),
    canonicalValue: value.canonicalValue,
    originalText: value.originalText,
    confidence: value.confidence,
    method: value.method,
    start: value.start,
    end: value.end,
    ...(finiteNumber(value.latitude) ? { latitude: value.latitude } : {}),
    ...(finiteNumber(value.longitude) ? { longitude: value.longitude } : {}),
    ...(nonEmptyString(value.countryCode)
      ? { countryCode: value.countryCode }
      : {}),
    ...(nonEmptyString(value.locationRole)
      ? { locationRole: value.locationRole }
      : {}),
  };
}

function parseResolverAmbiguity(
  value: unknown,
): HearResolverResult["ambiguities"][number] | undefined {
  if (
    !isRecord(value) ||
    !nonEmptyString(value.phrase) ||
    !Array.isArray(value.candidates)
  ) {
    return undefined;
  }
  const candidates = value.candidates.flatMap((item) => {
    if (
      !isRecord(item) ||
      !isEntityType(item.entityType) ||
      !nonEmptyString(item.canonicalValue)
    ) {
      return [];
    }
    return [
      {
        entityType: item.entityType,
        ...(nonEmptyString(item.entityId) ? { entityId: item.entityId } : {}),
        canonicalValue: item.canonicalValue,
      },
    ];
  });
  return { phrase: value.phrase, candidates };
}

function parseResolverSlots(value: Record<string, unknown>): HearResolverSlots | undefined {
  const residualQuery = value.residualQuery ?? "";
  const latest = value.latest ?? false;
  const isRecommended = value.isRecommended ?? false;
  const isPublication = value.isPublication ?? false;
  const sort = value.sort ?? "relevance";
  if (
    typeof residualQuery !== "string" ||
    typeof latest !== "boolean" ||
    typeof isRecommended !== "boolean" ||
    typeof isPublication !== "boolean" ||
    typeof sort !== "string" ||
    !optionalNonNegativeInteger(value.publishedFrom) ||
    !optionalNonNegativeInteger(value.publishedTo)
  ) {
    return undefined;
  }
  return {
    residualQuery,
    latest,
    isRecommended,
    isPublication,
    sort,
    ...(integer(value.publishedFrom)
      ? { publishedFrom: value.publishedFrom }
      : {}),
    ...(integer(value.publishedTo) ? { publishedTo: value.publishedTo } : {}),
  };
}

function applySelectedCandidate(
  filter: HearSearchFilter,
  candidate: HearAmbiguityCandidate,
): void {
  for (const key of [
    "creatorIds",
    "organizationIds",
    "publicationIds",
  ] as const) {
    delete filter[key];
  }
  if (candidate.entityType === "creator" && candidate.entityId) {
    filter.creatorIds = [candidate.entityId];
  } else if (candidate.entityType === "organization" && candidate.entityId) {
    filter.organizationIds = [candidate.entityId];
  } else if (candidate.entityType === "publication" && candidate.entityId) {
    filter.publicationIds = [candidate.entityId];
  } else if (candidate.entityType === "category" && candidate.entityId) {
    filter.categorySlugs = [candidate.entityId];
  } else if (candidate.entityType === "tag" && candidate.entityId) {
    filter.tags = [candidate.entityId];
  } else if (candidate.entityType === "location") {
    filter.city = candidate.canonicalValue;
  }
}

function addEntityIds(
  filter: HearSearchFilter,
  key:
    | "creatorIds"
    | "organizationIds"
    | "publicationIds"
    | "categorySlugs"
    | "tags",
  entities: HearResolverEntity[],
  type: EntityType,
): void {
  const ids = uniqueStrings(
    entities
      .filter((entity) => entity.entityType === type)
      .map((entity) => entity.entityId)
      .filter((id): id is string => Boolean(id)),
  );
  if (ids.length) filter[key] = ids;
}

function exactTaxonomyEntities(
  entities: HearResolverEntity[],
): HearResolverEntity[] {
  const categories = entities.filter(
    (entity) =>
      entity.entityType === "category" &&
      entity.confidence === RESOLVER_EXACT_CONFIDENCE,
  );
  const tags = entities.filter(
    (entity) =>
      entity.entityType === "tag" &&
      entity.confidence === RESOLVER_EXACT_CONFIDENCE &&
      !categories.some((category) => sameTaxonomyMatch(category, entity)),
  );
  return [...categories, ...tags];
}

function sameTaxonomyMatch(
  category: HearResolverEntity,
  tag: HearResolverEntity,
): boolean {
  const categoryId = taxonomyIdentity(category);
  const tagId = taxonomyIdentity(tag);
  return (
    categoryId === tagId ||
    (category.start === tag.start && category.end === tag.end)
  );
}

function taxonomyIdentity(entity: HearResolverEntity): string {
  return (entity.entityId ?? entity.canonicalValue)
    .replace(/^#+/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLocaleLowerCase("en-GB");
}

function fallbackSearchQuery(
  result: HearResolverResult,
  exactTaxonomy: HearResolverEntity[],
): string {
  const residual = result.slots.residualQuery.trim();
  if (residual || exactTaxonomy.length > 0) return residual;
  return uniqueStrings(
    result.entities
      .filter(
        (entity) =>
          entity.entityType === "category" || entity.entityType === "tag",
      )
      .map((entity) => humanizeLabel(entity.originalText)),
  ).join(" ");
}

function expandPublication(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  if (!Array.isArray(value.tracks) || value.tracks.length === 0) return [value];
  const publicationId = firstString(value.publicationId, value.contentId);
  const publicationTitle = firstString(value.publicationTitle, value.title);
  return value.tracks.flatMap((track, index) =>
    isRecord(track)
      ? [
          {
            ...value,
            ...track,
            tracks: undefined,
            isPublication: true,
            trackIndex: index,
            trackCount: value.tracks.length,
            publication: {
              id: publicationId,
              title: publicationTitle,
            },
          },
        ]
      : [],
  );
}

function parseSearchTrack(
  value: Record<string, unknown>,
): ExternalPlaybackTrack | undefined {
  if (!nonEmptyString(value.contentId) || !isHttpsUrl(value.audioUrl)) {
    return undefined;
  }
  const shortDescription = firstString(value.shortDescription, value.summary);
  const titleCandidate = firstString(
    value.displayTitle,
    value.spokenTitle,
    value.title,
  );
  const title = readableTitle(titleCandidate, shortDescription, value);
  const spokenTitle = readableTitle(
    firstString(value.spokenTitle, value.displayTitle, value.title),
    shortDescription,
    value,
  );
  if (!title || !spokenTitle) return undefined;

  const creator = parseNamedEntity(value.creator, value.creatorId, value.creatorName);
  const organization = parseNamedEntity(
    value.organization,
    value.organizationId,
    value.organizationName,
  );
  const publication = parsePublication(value.publication, value);
  const category = parseCategory(value.category ?? firstArrayValue(value.categories));
  const tags = stringArray(value.tags);
  const durationSeconds = firstFiniteNumber(
    value.durationSeconds,
    value.durationSecs,
    value.duration_secs,
    finiteNumber(value.durationMs) ? value.durationMs / 1000 : undefined,
  );
  const playbackSpeedUrls = parsePlaybackSpeeds(
    value.playbackSpeedUrls ??
      value.playbackSpeeds ??
      value.playbackSpeed ??
      value.playback_speed,
  );

  return {
    contentId: value.contentId,
    audioUrl: value.audioUrl,
    title,
    spokenTitle,
    ...(shortDescription ? { shortDescription } : {}),
    ...(creator ? { creator } : {}),
    ...(organization ? { organization } : {}),
    ...(category ? { category } : {}),
    ...(tags.length ? { tags } : {}),
    ...(publication ? { publication } : {}),
    ...(value.isPublication === true && integer(value.trackIndex)
      ? { publicationTrackIndex: value.trackIndex }
      : {}),
    ...(value.isPublication === true && integer(value.trackCount)
      ? { publicationTrackCount: value.trackCount }
      : {}),
    ...(durationSeconds !== undefined && durationSeconds > 0
      ? { durationSeconds }
      : {}),
    ...publishedAtField(value.publishedAt),
    ...(playbackSpeedUrls.length ? { playbackSpeedUrls } : {}),
  };
}

function publishedAtField(value: unknown): { publishedAt?: string } {
  const timestamp =
    finiteNumber(value) && value >= 0
      ? value * 1000
      : nonEmptyString(value)
        ? Date.parse(value)
        : Number.NaN;
  if (!Number.isFinite(timestamp)) return {};
  return { publishedAt: new Date(timestamp).toISOString() };
}

function readableTitle(
  value: string | undefined,
  shortDescription: string | undefined,
  source: Record<string, unknown>,
): string {
  const weak = !value || isWeakTitle(value);
  const fallback =
    shortDescription ??
    firstString(firstArrayValue(source.searchPhrases)) ??
    stringArray(source.themes).slice(0, 2).join(", ");
  const selected = weak && fallback ? fallback : value ?? fallback ?? "";
  return selected
    .replace(/\.(?:mp3|m4a|wav|aac)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function isWeakTitle(value: string): boolean {
  const title = value.trim();
  return (
    !title ||
    /^(?:test|untitled|recording)\s*\d*$/i.test(title) ||
    /\.(?:mp3|m4a|wav|aac)$/i.test(title) ||
    /\d{3,}[_-]post|[_-]post\d+|track\d+/i.test(title) ||
    (!/\s/.test(title) && /[_/\\.:]|\d{4,}/.test(title))
  );
}

function parseNamedEntity(
  value: unknown,
  fallbackId?: unknown,
  fallbackName?: unknown,
): { id?: string; name: string } | undefined {
  const record = isRecord(value) ? value : undefined;
  const name = firstString(record?.name, typeof value === "string" ? value : undefined, fallbackName);
  if (!name) return undefined;
  const id = firstString(record?.id, fallbackId);
  return { ...(id ? { id } : {}), name };
}

function parsePublication(
  value: unknown,
  source: Record<string, unknown>,
): { id?: string; title: string } | undefined {
  const record = isRecord(value) ? value : undefined;
  const title = firstString(
    record?.title,
    record?.name,
    source.publicationTitle,
  );
  if (!title) return undefined;
  const id = firstString(record?.id, source.publicationId);
  return { ...(id ? { id } : {}), title };
}

function parseCategory(
  value: unknown,
): { slug?: string; name: string } | undefined {
  if (typeof value === "string" && value.trim()) {
    return { slug: value, name: humanizeLabel(value) };
  }
  if (!isRecord(value)) return undefined;
  const name = firstString(value.name, value.title, value.slug);
  if (!name) return undefined;
  return {
    ...(nonEmptyString(value.slug) ? { slug: value.slug } : {}),
    name: humanizeLabel(name),
  };
}

function parsePlaybackSpeeds(value: unknown): { speed: number; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || !finiteNumber(item.speed)) return [];
    const url = firstString(item.url, item.audioUrl);
    return url && isHttpsUrl(url) ? [{ speed: item.speed, url }] : [];
  });
}

function publishedPeriodLabel(slots: HearResolverSlots): string {
  const start = slots.publishedFrom;
  const end = slots.publishedTo;
  if (start === undefined || end === undefined || end <= start) return "";
  const startDate = new Date(start * 1000);
  const inclusiveEnd = new Date((end - 1) * 1000);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(inclusiveEnd.getTime())) {
    return "";
  }
  const full = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  if (end - start <= 86_400) return `on ${full.format(startDate)}`;
  if (
    startDate.getUTCDate() === 1 &&
    inclusiveEnd.getUTCFullYear() === startDate.getUTCFullYear() &&
    inclusiveEnd.getUTCMonth() === startDate.getUTCMonth()
  ) {
    return `in ${new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(startDate)}`;
  }
  return `from ${full.format(startDate)} to ${full.format(inclusiveEnd)}`;
}

function entityNames(
  entities: HearResolverEntity[],
  type: EntityType,
): string[] {
  return uniqueStrings(
    entities
      .filter((entity) => entity.entityType === type)
      .map((entity) => humanizeLabel(entity.canonicalValue)),
  );
}

function sharedWordPrefix(values: string[]): string {
  if (values.length < 2) return "";
  const words = values.map((value) => value.split(/\s+/));
  const common: string[] = [];
  const shortest = Math.min(...words.map((parts) => parts.length));
  for (let index = 0; index < shortest; index += 1) {
    const candidates = words.map((parts) => parts[index]);
    if (
      new Set(candidates.map((word) => word.toLocaleLowerCase("en-GB"))).size !== 1
    ) {
      break;
    }
    common.push(candidates[0]);
  }
  return common.join(" ");
}

function spokenList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")}, or ${values.at(-1)}`;
}

function candidateKey(candidate: HearAmbiguityCandidate): string {
  return `${candidate.entityType}:${candidate.entityId}`;
}

function entityTypeLabel(type: EntityType): string {
  if (type === "organization") return "Organisation";
  return `${type.charAt(0).toLocaleUpperCase("en-GB")}${type.slice(1)}`;
}

function spansOverlap(left: HearResolverEntity, right: HearResolverEntity): boolean {
  return Math.max(left.start, right.start) < Math.min(left.end, right.end);
}

function isSearchSort(value: string): value is HearSearchSort {
  return SEARCH_SORTS.has(value as HearSearchSort);
}

function isEntityType(value: unknown): value is EntityType {
  return typeof value === "string" && ENTITY_TYPES.has(value as EntityType);
}

function isHttpsUrl(value: unknown): value is string {
  if (!nonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => nonEmptyString(item))
    : [];
}

function firstArrayValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find(nonEmptyString) as string | undefined;
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  return values.find(finiteNumber) as number | undefined;
}

function optionalNonNegativeInteger(value: unknown): boolean {
  return value === null || value === undefined || (integer(value) && value >= 0);
}

function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
