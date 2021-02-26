import { readFileSync } from 'fs';
import path from 'path';
import { njParse } from '.';

const include = /!Include\s+('|")?([^'"\s]*)('|")?/g;
export const njParseContentWithIncludes = (contents: string, directory: string, filename: string, data: any): any => {
    const replacedContents = contents.replace(include, (_, __, includedRelativeFilePath) => {

        const resolvedFilePath = path.resolve(directory, includedRelativeFilePath);
        const included = njParseWithIncludes(resolvedFilePath);
        return JSON.stringify(included);
    });

    const parsed = njParse(replacedContents, filename, data);
    return parsed;
};

export const njParseWithIncludes = (filePath: string): any => {
    const buffer = readFileSync(filePath);
    const contents = buffer.toString('utf-8');
    const dir = path.dirname(filePath);
    const filename = path.basename(filePath);
    const data = buffer.toString('utf-8');
    return njParseContentWithIncludes(contents, dir, filename, data);
};
