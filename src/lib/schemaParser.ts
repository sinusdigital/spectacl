import fs from 'fs';
import path from 'path';

export interface SchemaField {
    name: string;
    type: string;
    isRequired: boolean;
    isArray: boolean;
    isRelation: boolean;
    attributes: string[]; // e.g., @id, @unique, @default
}

export interface SchemaModel {
    name: string;
    fields: SchemaField[];
    documentation?: string; // Lines starting with ///
}

export interface SchemaEnum {
    name: string;
    values: string[];
}

export interface Schema {
    models: SchemaModel[];
    enums: SchemaEnum[];
}

export function getSchema(): Schema {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    return parseSchema(schemaContent);
}

function parseSchema(content: string): Schema {
    const lines = content.split('\n');
    const models: SchemaModel[] = [];
    const enums: SchemaEnum[] = [];

    let currentModel: SchemaModel | null = null;
    let currentEnum: SchemaEnum | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and comments (that aren't doc comments)
        if (!line || (line.startsWith('//') && !line.startsWith('///'))) {
            continue;
        }

        // Start model
        if (line.startsWith('model ')) {
            const name = line.split(' ')[1];
            currentModel = { name, fields: [] };
            currentEnum = null;
            continue;
        }

        // Start enum
        if (line.startsWith('enum ')) {
            const name = line.split(' ')[1];
            currentEnum = { name, values: [] };
            currentModel = null;
            continue;
        }

        // End block
        if (line === '}') {
            if (currentModel) {
                models.push(currentModel);
                currentModel = null;
            }
            if (currentEnum) {
                enums.push(currentEnum);
                currentEnum = null;
            }
            continue;
        }

        // Parse Model Field
        if (currentModel) {
            // Check for block attributes like @@index or @@unique, ignore for now
            if (line.startsWith('@@')) continue;

            // Regex to parse field: name type attributes
            // Simple split by whitespace
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
                const name = parts[0];
                let type = parts[1];
                const attributes = parts.slice(2).join(' ');

                const isArray = type.endsWith('[]');
                const isRequired = !type.endsWith('?') && !isArray; // Arrays are technically arrays, usage depends
                
                // Clean type
                type = type.replace('[]', '').replace('?', '');

                // Heuristic: if type starts with uppercase and isn't a known Prisma scalar,
                // assume it's a relation to another model. Works because Prisma uses PascalCase
                // for model names and has a fixed set of scalar types.
                const scalars = new Set(['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Decimal', 'BigInt', 'Bytes', 'Json']);
                // We will treat enums as "relations" to other types in visualization or just scalar-like. 
                // For this visualizer, distinguishing "Model Relation" vs "Data Field" is key.
                const isRelation = !scalars.has(type) && /^[A-Z]/.test(type); // Heuristic: Capitalized & not scalar implies Model or Enum

                currentModel.fields.push({
                    name,
                    type,
                    isArray,
                    isRequired,
                    isRelation,
                    attributes: attributes ? [attributes] : []
                });
            }
        }

        // Parse Enum Value
        if (currentEnum) {
            // Enum values are just the first word
            const value = line.split(/\s+/)[0];
            currentEnum.values.push(value);
        }
    }

    return { models, enums };
}
