export class ResourcesUpdateCommand implements ICommand {
	public allowedParameters: ICommandParameter[] = [];

	constructor(private $projectData: IProjectData,
		private $errors: IErrors,
		private $androidResourcesV4MigrationService: IAndroidResourcesV4MigrationService) {
		this.$projectData.initializeProjectData();
	}

	public async execute(args: string[]): Promise<void> {
		await this.$androidResourcesV4MigrationService.migrate(this.$projectData.getAppResourcesDirectoryPath());
	}

	public async canExecute(args: string[]): Promise<boolean> {
		if (!args || args.length === 0) {
			// Command defaults to migrating the Android App_Resources, unless explicitly specified
			args = ["android"];
		}

		for (const platform of args) {
			if (!this.$androidResourcesV4MigrationService.canMigrate(platform)) {
				this.$errors.failWithoutHelp("The iOS platform does not need to have its resources updated.");
			}

			if (this.$androidResourcesV4MigrationService.hasMigrated(this.$projectData.getAppResourcesDirectoryPath())) {
				this.$errors.failWithoutHelp("The App_Resources have already been updated for the Android platform.");
			}
		}

		return true;
	}
}

$injector.registerCommand("resources-update", ResourcesUpdateCommand);
