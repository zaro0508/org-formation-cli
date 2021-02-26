import { readFileSync } from 'fs';
import path from 'path';
import { njParse, yamlParse } from '.';

const include = /!Include\s+('|")?([^'"\s]*)('|")?/g;
export const yamlParseContentWithIncludes = (contents: string, directory: string, filename: string): any => {
    const replacedContents = contents.replace(include, (_, __, includedRelativeFilePath) => {

        const resolvedFilePath = path.resolve(directory, includedRelativeFilePath);
        const included = yamlParseWithIncludes(resolvedFilePath);
        return JSON.stringify(included);
    });

    let parsed;
    if (path.extname(filename) === '.nj') {
        parsed = njParse(replacedContents, filename);
    } else {
        parsed = yamlParse(replacedContents);
    }
    return parsed;
};

export const yamlParseWithIncludes = (filePath: string): any => {
    const buffer = readFileSync(filePath);
    const contents = buffer.toString('utf-8');
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath);
    return yamlParseContentWithIncludes(contents, dir, filename);
};
