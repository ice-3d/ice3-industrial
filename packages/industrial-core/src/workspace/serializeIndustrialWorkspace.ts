import type {
  ICEIndustrialEntity,
  ICEIndustrialEntityType,
  ICEIndustrialExternalId,
  ICEIndustrialOperationDefinition,
  ICEIndustrialPropertyDefinition,
  ICEIndustrialRelation,
  ICEIndustrialValue,
  ICEIndustrialWorkspaceManifest,
} from '../manifest/ICEIndustrialManifest.js';
import {
  parseIndustrialManifest,
} from '../manifest/parseIndustrialManifest.js';

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareById(
  left: { readonly id: string },
  right: { readonly id: string },
): number {
  return compareStrings(left.id, right.id);
}

function identityKey(identity: ICEIndustrialExternalId): string {
  return [
    identity.scheme,
    identity.scope ?? '',
    identity.value,
  ].join('\u0000');
}

function canonicalProperty(
  property: ICEIndustrialPropertyDefinition,
): ICEIndustrialPropertyDefinition {
  return {
    id: property.id,
    label: property.label,
    dataType: property.dataType,
    readable: property.readable,
    writable: property.writable,
    ...(property.unit === undefined ? {} : { unit: property.unit }),
    ...(property.semanticId === undefined
      ? {}
      : { semanticId: property.semanticId }),
    ...(property.enumValues === undefined
      ? {}
      : { enumValues: [...property.enumValues].sort(compareStrings) }),
  };
}

function canonicalOperation(
  operation: ICEIndustrialOperationDefinition,
): ICEIndustrialOperationDefinition {
  return {
    id: operation.id,
    label: operation.label,
    requiresConfirmation: operation.requiresConfirmation,
    ...(operation.inputSchema === undefined
      ? {}
      : { inputSchema: operation.inputSchema }),
    ...(operation.outputSchema === undefined
      ? {}
      : { outputSchema: operation.outputSchema }),
  };
}

function canonicalType(
  type: ICEIndustrialEntityType,
): ICEIndustrialEntityType {
  return {
    id: type.id,
    label: type.label,
    propertyDefinitions: type.propertyDefinitions
      .map(canonicalProperty)
      .sort(compareById),
    operationDefinitions: type.operationDefinitions
      .map(canonicalOperation)
      .sort(compareById),
    ...(type.parentTypeId === undefined
      ? {}
      : { parentTypeId: type.parentTypeId }),
    ...(type.allowedRelationTypes === undefined
      ? {}
      : {
        allowedRelationTypes: [...type.allowedRelationTypes]
          .sort(compareStrings),
      }),
  };
}

function canonicalEntity(entity: ICEIndustrialEntity): ICEIndustrialEntity {
  return {
    id: entity.id,
    typeId: entity.typeId,
    displayName: entity.displayName,
    externalIds: [...entity.externalIds]
      .sort((left, right) =>
        compareStrings(identityKey(left), identityKey(right))),
    ...(entity.parentId === undefined ? {} : {
      parentId: entity.parentId,
    }),
    ...(entity.description === undefined ? {} : {
      description: entity.description,
    }),
    ...(entity.spatial === undefined
      ? {}
      : {
        spatial: {
          selectionIds: [...entity.spatial.selectionIds].sort(compareStrings),
          ...(entity.spatial.modelAssetId === undefined
            ? {}
            : { modelAssetId: entity.spatial.modelAssetId }),
          ...(entity.spatial.bounds === undefined
            ? {}
            : { bounds: entity.spatial.bounds }),
          ...(entity.spatial.anchor === undefined
            ? {}
            : { anchor: entity.spatial.anchor }),
          ...(entity.spatial.tileIds === undefined
            ? {}
            : {
              tileIds: [...entity.spatial.tileIds].sort(compareStrings),
            }),
        },
      }),
  };
}

function canonicalRelation(
  relation: ICEIndustrialRelation,
): ICEIndustrialRelation {
  return {
    id: relation.id,
    type: relation.type,
    fromEntityId: relation.fromEntityId,
    toEntityId: relation.toEntityId,
    directed: relation.directed,
    ...(relation.metadata === undefined
      ? {}
      : { metadata: relation.metadata }),
  };
}

function sortObjectKeys(value: ICEIndustrialValue): ICEIndustrialValue {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Readonly<Record<string, ICEIndustrialValue>>;
    const sorted = Object.create(null) as Record<
      string,
      ICEIndustrialValue
    >;
    for (const key of Object.keys(record).sort(compareStrings)) {
      sorted[key] = sortObjectKeys(record[key]!);
    }
    return sorted;
  }
  return value;
}

function canonicalManifest(
  manifest: ICEIndustrialWorkspaceManifest,
): ICEIndustrialWorkspaceManifest {
  const canonical = {
    version: manifest.version,
    workspaceId: manifest.workspaceId,
    assetIds: [...manifest.assetIds].sort(compareStrings),
    entityTypes: manifest.entityTypes.map(canonicalType).sort(compareById),
    entities: manifest.entities.map(canonicalEntity).sort(compareById),
    relations: manifest.relations.map(canonicalRelation).sort(compareById),
  };
  return sortObjectKeys(
    canonical as unknown as ICEIndustrialValue,
  ) as unknown as ICEIndustrialWorkspaceManifest;
}

export function serializeIndustrialWorkspace(
  value: ICEIndustrialWorkspaceManifest,
): string {
  const manifest = parseIndustrialManifest(value);
  return `${JSON.stringify(canonicalManifest(manifest), null, 2)}\n`;
}
