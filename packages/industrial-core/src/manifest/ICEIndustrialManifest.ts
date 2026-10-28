export type ICEIndustrialValue =
  | string
  | number
  | boolean
  | null
  | readonly ICEIndustrialValue[]
  | { readonly [key: string]: ICEIndustrialValue };

export interface ICEIndustrialExternalId {
  readonly scheme: string;
  readonly value: string;
  readonly scope?: string;
}

export interface ICEIndustrialPropertyDefinition {
  readonly id: string;
  readonly label: string;
  readonly dataType: 'string' | 'number' | 'boolean' | 'enum' | 'object';
  readonly unit?: string;
  readonly semanticId?: string;
  readonly readable: boolean;
  readonly writable: boolean;
  readonly enumValues?: readonly string[];
}

export interface ICEIndustrialOperationDefinition {
  readonly id: string;
  readonly label: string;
  readonly inputSchema?: Readonly<Record<string, ICEIndustrialValue>>;
  readonly outputSchema?: Readonly<Record<string, ICEIndustrialValue>>;
  readonly requiresConfirmation: boolean;
}

export interface ICEIndustrialEntityType {
  readonly id: string;
  readonly label: string;
  readonly parentTypeId?: string;
  readonly propertyDefinitions: readonly ICEIndustrialPropertyDefinition[];
  readonly operationDefinitions: readonly ICEIndustrialOperationDefinition[];
  readonly allowedRelationTypes?: readonly string[];
}

export interface ICEIndustrialSpatialBinding {
  readonly selectionIds: readonly string[];
  readonly modelAssetId?: string;
  readonly bounds?: {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
  };
  readonly anchor?: readonly [number, number, number];
  readonly tileIds?: readonly string[];
}

export interface ICEIndustrialEntity {
  readonly id: string;
  readonly typeId: string;
  readonly parentId?: string;
  readonly displayName: string;
  readonly description?: string;
  readonly externalIds: readonly ICEIndustrialExternalId[];
  readonly spatial?: ICEIndustrialSpatialBinding;
}

export interface ICEIndustrialRelation {
  readonly id: string;
  readonly type: string;
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly directed: boolean;
  readonly metadata?: Readonly<Record<string, ICEIndustrialValue>>;
}

export interface ICEIndustrialWorkspaceManifest {
  readonly version: '1.0';
  readonly workspaceId: string;
  readonly assetIds: readonly string[];
  readonly entityTypes: readonly ICEIndustrialEntityType[];
  readonly entities: readonly ICEIndustrialEntity[];
  readonly relations: readonly ICEIndustrialRelation[];
}
