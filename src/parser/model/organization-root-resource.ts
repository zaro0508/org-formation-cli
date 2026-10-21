import { IResource, IResourceRef, TemplateRoot } from '../parser';
import { Reference, Resource } from './resource';
import { ResourceControlPolicyResource } from './resource-control-policy-resource';
import { ServiceControlPolicyResource } from './service-control-policy-resource';

export interface IOrganizationRootProperties {
    ServiceControlPolicies: IResourceRef | IResourceRef[];
    ResourceControlPolicies?: IResourceRef | IResourceRef[];
    DefaultOrganizationAccessRoleName?: string;
    DefaultBuildAccessRoleName?: string;
    DefaultDevelopmentBuildAccessRoleName?: string;
    MirrorInPartition?: boolean;
    CloseAccountsOnRemoval?: boolean;
}


export class OrganizationRootResource extends Resource {
    public serviceControlPolicies: Reference<ServiceControlPolicyResource>[] = [];
    public resourceControlPolicies: Reference<ResourceControlPolicyResource>[] = [];
    private props: IOrganizationRootProperties;
    public defaultOrganizationAccessRoleName?: string;
    public defaultBuildAccessRoleName?: string;
    public defaultDevelopmentBuildAccessRoleName?: string;
    public mirrorInPartition?: boolean;
    public closeAccountsOnRemoval?: boolean;

    constructor(root: TemplateRoot, id: string, resource: IResource) {
        super(root, id, resource);

        this.props = this.resource.Properties as IOrganizationRootProperties;

        super.throwForUnknownAttributes(resource, id, 'Type', 'Properties');
        super.throwForUnknownAttributes(this.props, id, 'ServiceControlPolicies', 'ResourceControlPolicies', 'DefaultOrganizationAccessRoleName', 'DefaultBuildAccessRoleName', 'DefaultDevelopmentBuildAccessRoleName', 'MirrorInPartition', 'CloseAccountsOnRemoval');

        if (this.props) {
            this.defaultOrganizationAccessRoleName = this.props.DefaultOrganizationAccessRoleName;
            this.defaultBuildAccessRoleName = this.props.DefaultBuildAccessRoleName;
            this.defaultDevelopmentBuildAccessRoleName = this.props.DefaultDevelopmentBuildAccessRoleName;
            this.mirrorInPartition = this.props.MirrorInPartition;
            this.closeAccountsOnRemoval = this.props.CloseAccountsOnRemoval;
        }
    }

    public resolveRefs(): void {
        if (this.props) {
            this.serviceControlPolicies = super.resolve(this.props.ServiceControlPolicies, this.root.organizationSection.serviceControlPolicies);
            this.resourceControlPolicies = super.resolve(this.props.ResourceControlPolicies, this.root.organizationSection.resourceControlPolicies);
        } else  {
            this.serviceControlPolicies = [];
            this.resourceControlPolicies = [];
        }
    }
}
