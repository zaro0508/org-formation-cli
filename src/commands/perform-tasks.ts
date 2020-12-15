import { Command } from 'commander';
import { BaseCliCommand, ICommandArgs } from './base-command';
import { UpdateOrganizationCommand } from './update-organization';
import { BuildTaskProvider } from '~build-tasks/build-task-provider';
import { ITrackedTask, PersistedState } from '~state/persisted-state';
import { Validator } from '~parser/validator';
import { BuildConfiguration } from '~build-tasks/build-configuration';
import { BuildRunner } from '~build-tasks/build-runner';
import { ConsoleUtil } from '~util/console-util';
import { S3StorageProvider } from '~state/storage-provider';
import { AwsEvents } from '~aws-provider/aws-events';
import { AwsUtil } from '~util/aws-util';

const commandName = 'perform-tasks <tasks-file>';
const commandDescription = 'performs all tasks from either a file or directory structure';

const DEFAULT_ORGANIZATION_OBJECT = 'organization.yml';


export class PerformTasksCommand extends BaseCliCommand<IPerformTasksCommandArgs> {
    static async Perform(command: IPerformTasksCommandArgs): Promise<void> {
        const x = new PerformTasksCommand();
        await x.performCommand(command);
    }

    constructor(command?: Command) {
        super(command, commandName, commandDescription, 'tasksFile');
    }

    public addOptions(command: Command): void {
        command.option('--logical-name <tasks-logical-name>', 'logical name of the tasks file, allows multiple tasks files to be used together with --perform-cleanup action', 'default');
        command.option('--perform-cleanup', 'when set will remove resources created by previous perform-tasks after task is removed from tasks file', false);
        command.option('--max-concurrent-tasks <max-concurrent-tasks>', 'maximum number of tasks to be executed concurrently', 1);
        command.option('--max-concurrent-stacks <max-concurrent-stacks>', 'maximum number of stacks (within a task) to be executed concurrently', 1);
        command.option('--failed-tasks-tolerance <failed-tasks-tolerance>', 'the number of failed tasks after which execution stops', 0);
        command.option('--failed-stacks-tolerance <failed-stacks-tolerance>', 'the number of failed stacks (within a task) after which execution stops', 0);
        command.option('--organization-file [organization-file]', 'organization file used for organization bindings');
        command.option('--parameters [parameters]', 'parameters used when creating build tasks from tasks file');
        command.option('--master-account-id [master-account-id]', 'run org-formation on a build account that functions as a delegated master account');
        super.addOptions(command);
    }

    public async performCommand(command: IPerformTasksCommandArgs): Promise<void> {
        const tasksFile = command.tasksFile;

        Validator.validatePositiveInteger(command.maxConcurrentStacks, 'maxConcurrentStacks');
        Validator.validatePositiveInteger(command.failedStacksTolerance, 'failedStacksTolerance');
        Validator.validatePositiveInteger(command.maxConcurrentTasks, 'maxConcurrentTasks');
        Validator.validatePositiveInteger(command.failedTasksTolerance, 'failedTasksTolerance');
        this.storeCommand(command);


        if (command.masterAccountId !== undefined) {
            AwsUtil.SetMasterAccountId(command.masterAccountId);
        }

        command.parsedParameters = this.parseCfnParameters(command.parameters);
        const config = new BuildConfiguration(tasksFile, command.parsedParameters);

        const state = await this.getState(command);
        await config.fixateOrganizationFile(command);
        const tasks = config.enumBuildTasks(command);
        ConsoleUtil.state = state;

        state.performUpdateToVersion2IfNeeded();
        UpdateOrganizationCommand.ResetHasRan();

        await BuildRunner.RunTasks(tasks, command.verbose === true, command.maxConcurrentTasks, command.failedTasksTolerance);
        const tracked = state.getTrackedTasks(command.logicalName);
        const cleanupTasks = BuildTaskProvider.enumTasksForCleanup(tracked, tasks, command);
        if (cleanupTasks.length > 0) {
            await BuildRunner.RunTasks(cleanupTasks, command.verbose === true, command.maxConcurrentTasks, command.failedTasksTolerance);
        }
        const tasksToTrack = BuildTaskProvider.recursivelyFilter(tasks, x=> x.physicalIdForCleanup !== undefined);
        const trackedTasks: ITrackedTask[] = tasksToTrack.map(x=> { return {physicalIdForCleanup: x.physicalIdForCleanup, logicalName: x.name, type: x.type  }; });
        state.setTrackedTasks(command.logicalName, trackedTasks);

        if (UpdateOrganizationCommand.HasRan === true) {
            await PerformTasksCommand.PublishChangedOrganizationFileIfChanged(command, state);
        }

        await state.save();

    }

    public static async PublishChangedOrganizationFileIfChanged(command: IPerformTasksCommandArgs, state: PersistedState): Promise<void> {
        if (command.organizationFileHash !== state.getTemplateHashLastPublished()) {
            const contents = command.organizationFile;
            const objectKey = command.organizationObject || DEFAULT_ORGANIZATION_OBJECT;
            const stateBucketName = await BaseCliCommand.GetStateBucketName(command);
            const storageProvider = await S3StorageProvider.Create(stateBucketName, objectKey);

            await storageProvider.putObject(contents);
            state.putTemplateHashLastPublished(command.organizationFileHash);
            await AwsEvents.putOrganizationChangedEvent(stateBucketName, objectKey);
        }

    }
}

export interface IPerformTasksCommandArgs extends ICommandArgs {
    tasksFile: string;
    logicalName: string;
    performCleanup: boolean;
    maxConcurrentTasks: number;
    failedTasksTolerance: number;
    maxConcurrentStacks: number;
    failedStacksTolerance: number;
    organizationFile?: string;
    organizationFileHash?: string;
    parameters?: string | {};
    parsedParameters?: Record<string, string>;
    logicalNamePrefix?: string;
    forceDeploy?: boolean;
    masterAccountId?: string;
    organizationObject?: any;
}
