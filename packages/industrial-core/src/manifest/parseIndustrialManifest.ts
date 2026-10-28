import type {
  ICEIndustrialEntity,
  ICEIndustrialEntityType,
  ICEIndustrialExternalId,
  ICEIndustrialOperationDefinition,
  ICEIndustrialPropertyDefinition,
  ICEIndustrialRelation,
  ICEIndustrialSpatialBinding,
  ICEIndustrialValue,
  ICEIndustrialWorkspaceManifest,
} from './ICEIndustrialManifest.js';

const CORE_RELATION_TYPES = new Set([
  'ice:contains',
  'ice:partOf',
  'ice:connectedTo',
  'ice:upstreamOf',
  'ice:dependsOn',
]);

const JSON_SCHEMA_TYPES = new Set([
  'array',
  'boolean',
  'integer',
  'null',
  'number',
  'object',
  'string',
]);

type JsonObject = Record<string, unknown>;

function invalid(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_MANIFEST_INVALID: ${detail}`);
}

function object(value: unknown, path: string): JsonObject {
  if (
    value === null
    || typeof value !== 'object'
    || Array.isArray(value)
    || (
      Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null
    )
  ) {
    invalid(`${path} must be a plain object`);
  }
  return value as JsonObject;
}

function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    invalid(`${path} must be an array`);
  }
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalid(`${path} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : string(value, path);
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    invalid(`${path} must be a boolean`);
  }
  return value;
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalid(`${path} must be a finite number`);
  }
  return value;
}

function allowedKeys(
  value: JsonObject,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const seen = new Set<string>();
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      invalid(`${path}.${key} is required`);
    }
    seen.add(key);
  }
  for (const key of optional) {
    seen.add(key);
  }
  for (const key of Object.keys(value)) {
    if (!seen.has(key)) {
      invalid(`${path}.${key} is not supported`);
    }
  }
}

function uniqueStrings(
  value: unknown,
  path: string,
  allowEmpty = true,
): readonly string[] {
  const values = array(value, path).map((entry, index) =>
    string(entry, `${path}[${index}]`));
  if (!allowEmpty && values.length === 0) {
    invalid(`${path} must not be empty`);
  }
  if (new Set(values).size !== values.length) {
    invalid(`${path} contains duplicate values`);
  }
  return values;
}

function industrialValue(
  value: unknown,
  path: string,
  ancestors = new Set<object>(),
): ICEIndustrialValue {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    return finiteNumber(value, path);
  }
  if (typeof value !== 'object') {
    invalid(`${path} must be a serializable value`);
  }
  if (ancestors.has(value)) {
    invalid(`${path} must not contain a cycle`);
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      industrialValue(entry, `${path}[${index}]`, ancestors));
  } else {
    const record = object(value, path);
    for (const [key, entry] of Object.entries(record)) {
      if (key.length === 0) {
        invalid(`${path} contains an empty key`);
      }
      industrialValue(entry, `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
  return value as ICEIndustrialValue;
}

function industrialRecord(
  value: unknown,
  path: string,
): Readonly<Record<string, ICEIndustrialValue>> {
  const record = object(value, path);
  if (Object.keys(record).length === 0) {
    invalid(`${path} must not be empty`);
  }
  industrialValue(record, path);
  return record as Readonly<Record<string, ICEIndustrialValue>>;
}

function schemaRecord(
  value: unknown,
  path: string,
): Readonly<Record<string, ICEIndustrialValue>> {
  const schema = industrialRecord(value, path);
  if (Object.hasOwn(schema, '$ref')) {
    string(schema.$ref, `${path}.$ref`);
    return schema;
  }
  const type = schema.type;
  if (typeof type === 'string') {
    if (!JSON_SCHEMA_TYPES.has(type)) {
      invalid(`${path}.type is not a supported schema type`);
    }
    return schema;
  }
  if (Array.isArray(type) && type.length > 0) {
    const values = uniqueStrings(type, `${path}.type`, false);
    for (const entry of values) {
      if (!JSON_SCHEMA_TYPES.has(entry)) {
        invalid(`${path}.type contains an unsupported schema type`);
      }
    }
    return schema;
  }
  invalid(`${path} must define a supported JSON Schema type`);
}

function externalId(
  value: unknown,
  path: string,
): ICEIndustrialExternalId {
  const item = object(value, path);
  allowedKeys(item, path, ['scheme', 'value'], ['scope']);
  string(item.scheme, `${path}.scheme`);
  string(item.value, `${path}.value`);
  optionalString(item.scope, `${path}.scope`);
  return item as unknown as ICEIndustrialExternalId;
}

function propertyDefinition(
  value: unknown,
  path: string,
): ICEIndustrialPropertyDefinition {
  const definition = object(value, path);
  allowedKeys(
    definition,
    path,
    ['id', 'label', 'dataType', 'readable', 'writable'],
    ['unit', 'semanticId', 'enumValues'],
  );
  string(definition.id, `${path}.id`);
  string(definition.label, `${path}.label`);
  const dataType = string(definition.dataType, `${path}.dataType`);
  if (!['string', 'number', 'boolean', 'enum', 'object'].includes(dataType)) {
    invalid(`${path}.dataType is not supported`);
  }
  optionalString(definition.unit, `${path}.unit`);
  optionalString(definition.semanticId, `${path}.semanticId`);
  boolean(definition.readable, `${path}.readable`);
  boolean(definition.writable, `${path}.writable`);
  if (dataType === 'enum') {
    uniqueStrings(definition.enumValues, `${path}.enumValues`, false);
  } else if (Object.hasOwn(definition, 'enumValues')) {
    invalid(`${path}.enumValues is only valid for enum properties`);
  }
  return definition as unknown as ICEIndustrialPropertyDefinition;
}

function operationDefinition(
  value: unknown,
  path: string,
): ICEIndustrialOperationDefinition {
  const definition = object(value, path);
  allowedKeys(
    definition,
    path,
    ['id', 'label', 'requiresConfirmation'],
    ['inputSchema', 'outputSchema'],
  );
  string(definition.id, `${path}.id`);
  string(definition.label, `${path}.label`);
  boolean(
    definition.requiresConfirmation,
    `${path}.requiresConfirmation`,
  );
  if (definition.inputSchema !== undefined) {
    schemaRecord(definition.inputSchema, `${path}.inputSchema`);
  }
  if (definition.outputSchema !== undefined) {
    schemaRecord(definition.outputSchema, `${path}.outputSchema`);
  }
  return definition as unknown as ICEIndustrialOperationDefinition;
}

function relationType(value: unknown, path: string): string {
  const type = string(value, path);
  if (
    !CORE_RELATION_TYPES.has(type)
    && !/^ext:[^:]+:[^:]+$/.test(type)
  ) {
    invalid(`${path} must be an ICE core or namespaced extension type`);
  }
  return type;
}

function entityType(
  value: unknown,
  path: string,
): ICEIndustrialEntityType {
  const type = object(value, path);
  allowedKeys(
    type,
    path,
    ['id', 'label', 'propertyDefinitions', 'operationDefinitions'],
    ['parentTypeId', 'allowedRelationTypes'],
  );
  string(type.id, `${path}.id`);
  string(type.label, `${path}.label`);
  optionalString(type.parentTypeId, `${path}.parentTypeId`);
  const properties = array(
    type.propertyDefinitions,
    `${path}.propertyDefinitions`,
  );
  properties.forEach((entry, index) =>
    propertyDefinition(entry, `${path}.propertyDefinitions[${index}]`));
  const operations = array(
    type.operationDefinitions,
    `${path}.operationDefinitions`,
  );
  operations.forEach((entry, index) =>
    operationDefinition(entry, `${path}.operationDefinitions[${index}]`));
  if (type.allowedRelationTypes !== undefined) {
    const relations = array(
      type.allowedRelationTypes,
      `${path}.allowedRelationTypes`,
    );
    relations.forEach((entry, index) =>
      relationType(entry, `${path}.allowedRelationTypes[${index}]`));
  }
  return type as unknown as ICEIndustrialEntityType;
}

function vector(
  value: unknown,
  path: string,
): readonly [number, number, number] {
  const entries = array(value, path);
  if (entries.length !== 3) {
    invalid(`${path} must contain exactly three numbers`);
  }
  entries.forEach((entry, index) =>
    finiteNumber(entry, `${path}[${index}]`));
  return entries as unknown as readonly [number, number, number];
}

function spatialBinding(
  value: unknown,
  path: string,
): ICEIndustrialSpatialBinding {
  const spatial = object(value, path);
  allowedKeys(
    spatial,
    path,
    ['selectionIds'],
    ['modelAssetId', 'bounds', 'anchor', 'tileIds'],
  );
  uniqueStrings(spatial.selectionIds, `${path}.selectionIds`);
  optionalString(spatial.modelAssetId, `${path}.modelAssetId`);
  if (spatial.tileIds !== undefined) {
    uniqueStrings(spatial.tileIds, `${path}.tileIds`);
  }
  if (spatial.anchor !== undefined) {
    vector(spatial.anchor, `${path}.anchor`);
  }
  if (spatial.bounds !== undefined) {
    const bounds = object(spatial.bounds, `${path}.bounds`);
    allowedKeys(bounds, `${path}.bounds`, ['min', 'max']);
    const min = vector(bounds.min, `${path}.bounds.min`);
    const max = vector(bounds.max, `${path}.bounds.max`);
    for (let index = 0; index < 3; index += 1) {
      if (min[index]! > max[index]!) {
        invalid(`${path}.bounds.min must not exceed max`);
      }
    }
  }
  return spatial as unknown as ICEIndustrialSpatialBinding;
}

function entity(value: unknown, path: string): ICEIndustrialEntity {
  const item = object(value, path);
  allowedKeys(
    item,
    path,
    ['id', 'typeId', 'displayName', 'externalIds'],
    ['parentId', 'description', 'spatial'],
  );
  string(item.id, `${path}.id`);
  string(item.typeId, `${path}.typeId`);
  optionalString(item.parentId, `${path}.parentId`);
  string(item.displayName, `${path}.displayName`);
  optionalString(item.description, `${path}.description`);
  const externalIds = array(item.externalIds, `${path}.externalIds`);
  externalIds.forEach((entry, index) =>
    externalId(entry, `${path}.externalIds[${index}]`));
  if (item.spatial !== undefined) {
    spatialBinding(item.spatial, `${path}.spatial`);
  }
  return item as unknown as ICEIndustrialEntity;
}

function relation(value: unknown, path: string): ICEIndustrialRelation {
  const item = object(value, path);
  allowedKeys(
    item,
    path,
    ['id', 'type', 'fromEntityId', 'toEntityId', 'directed'],
    ['metadata'],
  );
  string(item.id, `${path}.id`);
  relationType(item.type, `${path}.type`);
  string(item.fromEntityId, `${path}.fromEntityId`);
  string(item.toEntityId, `${path}.toEntityId`);
  boolean(item.directed, `${path}.directed`);
  if (item.metadata !== undefined) {
    industrialRecord(item.metadata, `${path}.metadata`);
  }
  return item as unknown as ICEIndustrialRelation;
}

function ensureUniqueIds(
  values: readonly { readonly id: string }[],
  path: string,
): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) {
      invalid(`${path} contains duplicate id "${value.id}"`);
    }
    ids.add(value.id);
  }
}

function deepFreeze<T>(value: T, visited = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object' || visited.has(value)) {
    return value;
  }
  visited.add(value);
  for (const entry of Object.values(value)) {
    deepFreeze(entry, visited);
  }
  return Object.freeze(value);
}

export function parseIndustrialManifest(
  value: unknown,
): Readonly<ICEIndustrialWorkspaceManifest> {
  try {
    const manifest = object(value, 'manifest');
    allowedKeys(
      manifest,
      'manifest',
      [
        'version',
        'workspaceId',
        'assetIds',
        'entityTypes',
        'entities',
        'relations',
      ],
    );
    if (manifest.version !== '1.0') {
      invalid('manifest.version must be "1.0"');
    }
    string(manifest.workspaceId, 'manifest.workspaceId');
    uniqueStrings(manifest.assetIds, 'manifest.assetIds');

    const types = array(manifest.entityTypes, 'manifest.entityTypes').map(
      (entry, index) => entityType(entry, `manifest.entityTypes[${index}]`),
    );
    ensureUniqueIds(types, 'manifest.entityTypes');
    const typeIds = new Set(types.map((type) => type.id));
    for (const type of types) {
      if (type.parentTypeId !== undefined && !typeIds.has(type.parentTypeId)) {
        invalid(
          `manifest.entityTypes.${type.id}.parentTypeId references an unknown type`,
        );
      }
      ensureUniqueIds(
        type.propertyDefinitions,
        `manifest.entityTypes.${type.id}.propertyDefinitions`,
      );
      ensureUniqueIds(
        type.operationDefinitions,
        `manifest.entityTypes.${type.id}.operationDefinitions`,
      );
    }

    const entities = array(manifest.entities, 'manifest.entities').map(
      (entry, index) => entity(entry, `manifest.entities[${index}]`),
    );
    ensureUniqueIds(entities, 'manifest.entities');
    const entityIds = new Set(entities.map((item) => item.id));
    const identities = new Map<string, string>();
    for (const item of entities) {
      if (!typeIds.has(item.typeId)) {
        invalid(
          `manifest.entities.${item.id}.typeId references an unknown type`,
        );
      }
      if (item.parentId !== undefined && !entityIds.has(item.parentId)) {
        invalid(
          `manifest.entities.${item.id}.parentId references an unknown entity`,
        );
      }
      for (const identity of item.externalIds) {
        const key = JSON.stringify([
          identity.scheme,
          identity.scope ?? null,
          identity.value,
        ]);
        const owner = identities.get(key);
        if (owner !== undefined) {
          invalid(
            `external identity is shared by entities "${owner}" and "${item.id}"`,
          );
        }
        identities.set(key, item.id);
      }
    }

    const relations = array(
      manifest.relations,
      'manifest.relations',
    ).map((entry, index) =>
      relation(entry, `manifest.relations[${index}]`));
    ensureUniqueIds(relations, 'manifest.relations');
    for (const item of relations) {
      if (
        !entityIds.has(item.fromEntityId)
        || !entityIds.has(item.toEntityId)
      ) {
        invalid(
          `manifest.relations.${item.id} references an unknown entity`,
        );
      }
    }

    return deepFreeze(manifest as unknown as ICEIndustrialWorkspaceManifest);
  } catch (error) {
    if (
      error instanceof Error
      && error.message.startsWith('ICE3_INDUSTRIAL_MANIFEST_INVALID:')
    ) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    invalid(detail);
  }
}
