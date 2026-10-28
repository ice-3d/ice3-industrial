import type {
  ICEIndustrialEntityRegistry,
} from '../registry/ICEIndustrialEntityRegistry.js';
import type {
  ICEIndustrialTypeRegistry,
} from '../registry/ICEIndustrialTypeRegistry.js';
import type {
  ICEIndustrialOperationDefinition,
  ICEIndustrialValue,
} from '../manifest/ICEIndustrialManifest.js';

export interface ICEIndustrialAbortSignal {
  readonly aborted: boolean;
  readonly reason?: unknown;
}

export interface ICEIndustrialOperationContext {
  readonly entityId: string;
  readonly actor?: string;
  readonly source: 'ui' | 'api' | 'automation';
  readonly signal?: ICEIndustrialAbortSignal;
}

export type ICEIndustrialOperationHandler = (
  input: Readonly<Record<string, ICEIndustrialValue>>,
  context: ICEIndustrialOperationContext,
) => Promise<Readonly<Record<string, ICEIndustrialValue>> | void>;

export interface ICEIndustrialOperationCapability {
  readonly entityId: string;
  readonly operationId: string;
  readonly label: string;
  readonly requiresConfirmation: boolean;
}

type OperationRecord = Readonly<Record<string, ICEIndustrialValue>>;

function failed(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_OPERATION_FAILED: ${detail}`);
}

function cancelled(detail: string): never {
  throw new Error(`ICE3_INDUSTRIAL_OPERATION_CANCELLED: ${detail}`);
}

function operationKey(entityId: string, operationId: string): string {
  return JSON.stringify([entityId, operationId]);
}

function cloneValue(
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
    if (!Number.isFinite(value)) {
      failed(`${path} must be finite`);
    }
    return value;
  }
  if (typeof value !== 'object') {
    failed(`${path} must be a serializable value`);
  }
  if (ancestors.has(value)) {
    failed(`${path} must not contain a cycle`);
  }
  ancestors.add(value);
  let cloned: ICEIndustrialValue;
  if (Array.isArray(value)) {
    cloned = Object.freeze(value.map((entry, index) =>
      cloneValue(entry, `${path}[${index}]`, ancestors)));
  } else {
    if (
      Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null
    ) {
      failed(`${path} must be a plain object`);
    }
    const record = Object.create(null) as Record<
      string,
      ICEIndustrialValue
    >;
    for (const [key, entry] of Object.entries(value)) {
      record[key] = cloneValue(entry, `${path}.${key}`, ancestors);
    }
    cloned = Object.freeze(record);
  }
  ancestors.delete(value);
  return cloned;
}

function cloneRecord(
  value: unknown,
  path: string,
): OperationRecord {
  if (
    value === null
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    failed(`${path} must be a plain object`);
  }
  return cloneValue(value, path) as OperationRecord;
}

function asSchema(
  value: unknown,
  path: string,
): Readonly<Record<string, ICEIndustrialValue>> {
  if (
    value === null
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    failed(`${path} must be an object schema`);
  }
  return value as Readonly<Record<string, ICEIndustrialValue>>;
}

function matchesType(
  value: ICEIndustrialValue,
  type: string,
): boolean {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'object':
      return (
        value !== null
        && typeof value === 'object'
        && !Array.isArray(value)
      );
    case 'string':
      return typeof value === 'string';
    default:
      return false;
  }
}

function validateSchema(
  value: ICEIndustrialValue,
  input: unknown,
  path: string,
): void {
  const schema = asSchema(input, path);
  if (schema.$ref !== undefined) {
    failed(`${path} uses an unsupported reference`);
  }
  const declaredType = schema.type;
  if (typeof declaredType === 'string') {
    if (!matchesType(value, declaredType)) {
      failed(`${path} type mismatch`);
    }
  } else if (Array.isArray(declaredType)) {
    if (
      !declaredType.some((type) =>
        typeof type === 'string' && matchesType(value, type))
    ) {
      failed(`${path} type mismatch`);
    }
  } else if (declaredType !== undefined) {
    failed(`${path}.type is invalid`);
  }

  if (schema.enum !== undefined) {
    if (
      !Array.isArray(schema.enum)
      || !schema.enum.some((entry) => Object.is(entry, value))
    ) {
      failed(`${path} does not match an allowed enum value`);
    }
  }

  if (typeof value === 'string') {
    if (
      typeof schema.minLength === 'number'
      && value.length < schema.minLength
    ) {
      failed(`${path} is shorter than minLength`);
    }
    if (
      typeof schema.maxLength === 'number'
      && value.length > schema.maxLength
    ) {
      failed(`${path} is longer than maxLength`);
    }
  }

  if (typeof value === 'number') {
    if (
      typeof schema.minimum === 'number'
      && value < schema.minimum
    ) {
      failed(`${path} is below minimum`);
    }
    if (
      typeof schema.maximum === 'number'
      && value > schema.maximum
    ) {
      failed(`${path} is above maximum`);
    }
  }

  if (Array.isArray(value)) {
    const items = schema.items;
    if (items !== undefined) {
      value.forEach((entry, index) =>
        validateSchema(entry, items, `${path}[${index}]`));
    }
    return;
  }

  if (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
  ) {
    const record = value as OperationRecord;
    const required = schema.required;
    if (required !== undefined) {
      if (
        !Array.isArray(required)
        || !required.every((key) => typeof key === 'string')
      ) {
        failed(`${path}.required is invalid`);
      }
      for (const key of required) {
        if (typeof key === 'string' && !Object.hasOwn(record, key)) {
          failed(`${path}.${key} is required`);
        }
      }
    }
    const properties = schema.properties === undefined
      ? undefined
      : asSchema(schema.properties, `${path}.properties`);
    if (properties !== undefined) {
      for (const [key, propertySchema] of Object.entries(properties)) {
        if (Object.hasOwn(record, key)) {
          validateSchema(
            record[key]!,
            propertySchema,
            `${path}.${key}`,
          );
        }
      }
    }
    const additional = schema.additionalProperties;
    if (additional === false) {
      for (const key of Object.keys(record)) {
        if (properties === undefined || !Object.hasOwn(properties, key)) {
          failed(`${path}.${key} is not allowed`);
        }
      }
    } else if (additional !== undefined && typeof additional !== 'boolean') {
      for (const key of Object.keys(record)) {
        if (properties === undefined || !Object.hasOwn(properties, key)) {
          validateSchema(record[key]!, additional, `${path}.${key}`);
        }
      }
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isSignalAborted(
  signal: ICEIndustrialAbortSignal | undefined,
): boolean {
  return signal?.aborted === true;
}

export class ICEIndustrialOperationRegistry {
  readonly #entities: ICEIndustrialEntityRegistry;
  readonly #types: ICEIndustrialTypeRegistry;
  readonly #handlers = new Map<string, ICEIndustrialOperationHandler>();
  #disposed = false;

  constructor(
    entities: ICEIndustrialEntityRegistry,
    types: ICEIndustrialTypeRegistry,
  ) {
    this.#entities = entities;
    this.#types = types;
  }

  register(
    entityId: string,
    operationId: string,
    handler: ICEIndustrialOperationHandler,
  ): () => void {
    this.#assertActive();
    this.#definition(entityId, operationId);
    if (typeof handler !== 'function') {
      failed('handler must be a function');
    }
    const key = operationKey(entityId, operationId);
    if (this.#handlers.has(key)) {
      failed(`handler already registered for ${operationId}`);
    }
    this.#handlers.set(key, handler);
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      if (this.#handlers.get(key) === handler) {
        this.#handlers.delete(key);
      }
    };
  }

  getCapability(
    entityId: string,
    operationId: string,
  ): ICEIndustrialOperationCapability {
    const definition = this.#definition(entityId, operationId);
    return Object.freeze({
      entityId,
      operationId,
      label: definition.label,
      requiresConfirmation: definition.requiresConfirmation,
    });
  }

  async execute(
    entityId: string,
    operationId: string,
    input: OperationRecord = {},
    context: Partial<ICEIndustrialOperationContext> = {},
  ): Promise<OperationRecord | void> {
    this.#assertActive();
    const definition = this.#definition(entityId, operationId);
    const handler = this.#handlers.get(operationKey(entityId, operationId));
    if (handler === undefined) {
      failed(`no handler registered for ${operationId}`);
    }
    if (context.entityId !== undefined && context.entityId !== entityId) {
      failed('operation context entity does not match the target');
    }
    const source = context.source ?? 'api';
    if (!['ui', 'api', 'automation'].includes(source)) {
      failed('operation context source is invalid');
    }
    if (
      context.actor !== undefined
      && (
        typeof context.actor !== 'string'
        || context.actor.trim().length === 0
      )
    ) {
      failed('operation context actor is invalid');
    }
    if (isSignalAborted(context.signal)) {
      cancelled(`${operationId} was cancelled`);
    }
    const clonedInput = cloneRecord(input, 'input');
    if (definition.inputSchema !== undefined) {
      validateSchema(clonedInput, definition.inputSchema, 'input');
    }
    const frozenContext = Object.freeze({
      entityId,
      source,
      ...(context.actor === undefined ? {} : { actor: context.actor }),
      ...(context.signal === undefined ? {} : { signal: context.signal }),
    });

    try {
      const output = await handler(clonedInput, frozenContext);
      if (output === undefined) {
        if (definition.outputSchema !== undefined) {
          failed(`${operationId} returned no output`);
        }
        return undefined;
      }
      const clonedOutput = cloneRecord(output, 'output');
      if (definition.outputSchema !== undefined) {
        validateSchema(
          clonedOutput,
          definition.outputSchema,
          'output',
        );
      }
      return clonedOutput;
    } catch (error) {
      if (isAbortError(error) || isSignalAborted(context.signal)) {
        cancelled(`${operationId} was cancelled`);
      }
      if (
        error instanceof Error
        && (
          error.message.startsWith('ICE3_INDUSTRIAL_OPERATION_FAILED:')
          || error.message.startsWith('ICE3_INDUSTRIAL_OPERATION_CANCELLED:')
        )
      ) {
        throw error;
      }
      failed(`${operationId} handler failed`);
    }
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#handlers.clear();
  }

  #definition(
    entityId: string,
    operationId: string,
  ): ICEIndustrialOperationDefinition {
    this.#assertActive();
    const entity = this.#entities.get(entityId);
    if (entity === undefined) {
      failed(`unknown entity ${entityId}`);
    }
    const type = this.#types.require(entity.typeId);
    const definition = type.operationDefinitions.find(
      (candidate) => candidate.id === operationId,
    );
    if (definition === undefined) {
      failed(`${operationId} is not declared for ${entityId}`);
    }
    return definition;
  }

  #assertActive(): void {
    if (this.#disposed) {
      failed('registry is disposed');
    }
  }
}
