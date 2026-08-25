export type EntityType =
  | "organization"
  | "publication"
  | "creator"
  | "category"
  | "tag"
  | "location"
  | "story";

export type AliasSource =
  | "canonical"
  | "backend"
  | "editorial"
  | "alexa-interaction-model"
  | "validated-asr"
  | "legacy-migration"
  | "learned";

export type VoiceEntity = {
  entityId: string;
  entityType: EntityType;
  canonicalName: string;
  normalizedName: string;
  primaryMetaphone: string | null;
  secondaryMetaphone: string | null;
  popularity: number;
  metadata?: Record<string, unknown>;
  revision: string;
};

export type EntityMatchMethod =
  | "exact"
  | "fts"
  | "trigram"
  | "phonetic"
  | "combined";

export type EntityMatchScores = {
  exact: number;
  fts: number;
  trigram: number;
  phonetic: number;
  context: number;
  popularity: number;
  final: number;
};

export type EntityCandidate = {
  entityId: string;
  entityType: EntityType;
  canonicalName: string;
  matchedAlias?: string;
  matchMethod: EntityMatchMethod;
  popularity: number;
  scores: EntityMatchScores;
  metadata?: Record<string, unknown>;
};

export type EntityRelation = "from" | "by" | "in" | "about";

export type EntitySearchQuery = {
  text: string;
  normalizedText: string;
  expectedTypes?: EntityType[];
  primaryMetaphone?: string;
  secondaryMetaphone?: string;
  limit: number;
  context?: {
    relation?: EntityRelation;
    screenId?: string;
  };
};

export type EntityRef = { type: EntityType; id: string };

export type VoiceDbHealth = {
  ready: boolean;
  schemaVersion: number;
  contentRevision: string | null;
  entityCount: number;
  aliasCount: number;
  ftsReady: boolean;
  phoneticReady: boolean;
  lastError?: string;
};

export interface VoiceEntityRepository {
  initialize(): Promise<void>;
  isReady(): Promise<boolean>;
  searchEntities(query: EntitySearchQuery): Promise<EntityCandidate[]>;
  getEntity(type: EntityType, id: string): Promise<VoiceEntity | null>;
  getEntitiesByIds(refs: EntityRef[]): Promise<VoiceEntity[]>;
  getRevision(): Promise<string>;
  healthCheck(): Promise<VoiceDbHealth>;
  getContextualTerms(limit?: number): Promise<string[]>;
  getTokenRarity(tokens: string[]): Promise<Record<string, number>>;
  getRecognitionBiasTerms?(input: {
    screenId: string;
    activeEntityIds?: string[];
    visibleEntityIds?: string[];
    recentEntityIds?: string[];
    limit: number;
  }): Promise<string[]>;
  learnAlias(
    alias: string,
    canonical: string,
    type: EntityType,
    entityId: string,
  ): Promise<void>;
  resetLearnedAliases(): Promise<void>;
}

export type TextSpan = {
  start: number;
  end: number;
  text: string;
};

export type SemanticAction = "play" | "find" | "follow" | "unfollow" | "none";

export type SemanticModifiers = {
  latest: boolean;
  local: boolean;
  recommended: boolean;
  trending: boolean;
  saved: boolean;
  downloads: boolean;
  publication: boolean;
};

export type RelationSpan = {
  relation: EntityRelation;
  span: TextSpan;
  expectedTypes: EntityType[];
};

export type ParsedUtterance = {
  raw: string;
  normalized: string;
  tokens: string[];
  action: SemanticAction;
  modifiers: SemanticModifiers;
  relations: RelationSpan[];
  contentWindows: TextSpan[];
  residual: string;
};

export type UnresolvedReason =
  | "no-command"
  | "no-candidate"
  | "index-unavailable"
  | "weak-confidence";

export type CanonicalInvocation = {
  action:
    | "PLAY_STORY"
    | "PLAY_ENTITY"
    | "PLAY_MODE"
    | "OPEN_TOPIC"
    | "SET_LOCATION"
    | "ONBOARDING_SET_TOWN"
    | "FOLLOW"
    | "UNFOLLOW"
    | "SEARCH";
  entity?: { type: EntityType; id: string; name: string };
  mode?: "latest" | "local" | "recommended" | "trending" | "saved" | "downloads";
  storyId?: string;
  topicId?: string;
  locationId?: string;
  locationName?: string;
  query?: string;
};

export type ResolverAmbiguity = {
  requestId: string;
  sessionId: string;
  candidates: {
    entityId: string;
    entityType: EntityType;
    canonicalName: string;
    score: number;
  }[];
};

export type ResolverConfig = {
  resolvedThreshold: number;
  minMargin: number;
  ambiguityFloor: number;
  weights: {
    exact: number;
    fts: number;
    trigram: number;
    phonetic: number;
    context: number;
    popularity: number;
  };
  limits: {
    exact: number;
    fts: number;
    trigram: number;
    phonetic: number;
    mergedPool: number;
    ambiguityChoices: number;
    maxWindows: number;
  };
};

export type RankedEntityCandidate = EntityCandidate & { confidence: number };

export type ResolutionDecision =
  | { kind: "resolved"; candidate: RankedEntityCandidate }
  | { kind: "ambiguous"; candidates: RankedEntityCandidate[] }
  | { kind: "unresolved" };
