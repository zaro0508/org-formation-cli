import { OrgFormationError } from '../../org-formation-error';
import { ResourceUtil } from '../../util/resource-util';
import { IResource, TemplateRoot } from '../parser';
import { Resource } from './resource';

export interface IResourceControlPolicyProperties {
    PolicyName: string;
    Description?: string;
    PolicyDocument: any;
}
export class ResourceControlPolicyResource extends Resource {
    public policyName: string;
    public description?: string;
    public policyDocument: any;
    constructor(root: TemplateRoot, id: string, resource: IResource) {
        super(root, id, resource);

        if (resource.Properties === undefined) {
            throw new OrgFormationError(`Properties are missing for resource ${id}`);
        }

        const props = this.resource.Properties as IResourceControlPolicyProperties;

        if (!props.PolicyName) {
            throw new OrgFormationError(`PolicyName is missing on Resource Control Policy ${id}`);
        }

        if (!props.PolicyDocument) {
            throw new OrgFormationError(`PolicyDocument is missing on Resource Control Policy ${id}`);
        }

        this.policyName = props.PolicyName;
        this.description = props.Description;
        this.policyDocument = props.PolicyDocument;
        ResourceUtil.FixVersions(this.policyDocument);
        super.throwForUnknownAttributes(resource, id, 'Type', 'Properties');
        super.throwForUnknownAttributes(props, id, 'PolicyName', 'Description', 'PolicyDocument', 'Tags' );
    }
}
