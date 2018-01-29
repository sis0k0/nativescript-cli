export class ResourcesUpdateCommand implements ICommand {
    public allowedParameters: ICommandParameter[] = [];

    constructor(private $projectData: IProjectData,
        private $errors: IErrors,
        private $projectV4MigrationService: IProjectV4MigrationService) {
        this.$projectData.initializeProjectData();
    }

    public async execute(args: string[]): Promise<void> {
        await this.$projectV4MigrationService.migrate(this.$projectData.getAppResourcesDirectoryPath());
    }

    public async canExecute(args: string[]): Promise<boolean> {
        if (!args || args.length === 0) {
            this.$errors.failWithoutHelp("No platform specified. Please specify a platform to update. Valid platforms are: 'android'");
        }

        for (const platform of args) {
            if (!this.$projectV4MigrationService.canMigrate(platform)) {
                this.$errors.failWithoutHelp("The iOS platform does not need to have its resources updated.");
            }

            if (this.$projectV4MigrationService.hasMigrated(this.$projectData.getAppResourcesDirectoryPath())) {
                this.$errors.failWithoutHelp("The App_Resources have already been updated for the Android platform.");
            }
        }

        return true;
    }
}

$injector.registerCommand("resources-update", ResourcesUpdateCommand);
