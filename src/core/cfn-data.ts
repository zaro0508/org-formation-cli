import { OrgFormationError } from '../org-formation-error';

export class CfnData {
    static ParseDataValues(commandData: string): Record<string, string> {
        if (commandData === undefined || commandData === '') {
            return {};
        }
        const data: Record<string, string> = {};
        const dataParts = commandData.split(' ');
        for (const dataPart of dataParts) {
            const dataAttributes = dataPart.split(',');
            if (dataAttributes.length === 1) {
                const parts = dataAttributes[0].split('=');
                if (parts.length !== 2) {
                    throw new OrgFormationError(`error reading data ${dataAttributes[0]}. Expected either key=val or DataKey=key,DataValue=val.`);
                }
                data[parts[0]] = parts[1];
            } else {
                const key = dataAttributes.find(x => x.startsWith('DataKey='));
                const value = dataAttributes.find(x => x.startsWith('DataValue='));
                if (key === undefined || value === undefined) {
                    throw new OrgFormationError(`error reading data ${dataAttributes[0]}. Expected DataKey=key,DataValue=val`);
                }
                const dataKey = key.substr(13);
                const dataVal = value.substr(15);
                data[dataKey] = dataVal;
            }
        }

        return data;
    }
}
