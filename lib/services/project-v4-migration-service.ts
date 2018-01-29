import * as path from "path";
import * as shell from "shelljs";

export class ProjectV4MigrationService implements IProjectV4MigrationService {
    private static ANDROID_DIR = "Android";
    private static ANDROID_DIR_TEMP = "Android-Updated";
    private static ANDROID_DIR_OLD = "Android-Pre-v4";

    constructor(private $fs: IFileSystem,
        private $logger: ILogger,
        private $devicePlatformsConstants: Mobile.IDevicePlatformsConstants) { }

    canMigrate(platformString: string): boolean {
        if (platformString.toLowerCase() === this.$devicePlatformsConstants.iOS.toLowerCase()) {
            return false;
        }

        return true;
    }

    hasMigrated(appResourcesDir: string): boolean {
        return this.$fs.exists(path.join(appResourcesDir, ProjectV4MigrationService.ANDROID_DIR, "src", "main"));
    }

    async migrate(appResourcesDir: string): Promise<void> {
        const originalAppResources = path.join(appResourcesDir, ProjectV4MigrationService.ANDROID_DIR);
        const appResourcesDestination = path.join(appResourcesDir, ProjectV4MigrationService.ANDROID_DIR_TEMP);
        const appMainSourceSet = path.join(appResourcesDestination, "src", "main");
        const appResourcesMainSourceSetResourcesDestination = path.join(appMainSourceSet, "res");

        this.$fs.ensureDirectoryExists(appResourcesDestination);
        this.$fs.ensureDirectoryExists(appMainSourceSet);
        // create /java, /res and /assets in the App_Resources/Android/src/main directory
        this.$fs.ensureDirectoryExists(appResourcesMainSourceSetResourcesDestination);
        this.$fs.ensureDirectoryExists(path.join(appMainSourceSet, "java"));
        this.$fs.ensureDirectoryExists(path.join(appMainSourceSet, "assets"));

        const isDirectory = (source: string) => this.$fs.getLsStats(source).isDirectory()
        const getDirectories = (source: string) =>
            this.$fs.readDirectory(source).map(name => path.join(source, name)).filter(isDirectory)

        shell.cp(path.join(originalAppResources, "app.gradle"), path.join(appResourcesDestination, "app.gradle"));
        shell.cp(path.join(originalAppResources, "AndroidManifest.xml"), path.join(appMainSourceSet, "AndroidManifest.xml"));

        let resourceDirectories = getDirectories(originalAppResources);

        resourceDirectories.forEach(dir => {
            shell.cp("-Rf", dir, appResourcesMainSourceSetResourcesDestination);
        });

        // rename the pre-v4 app_resources to ANDROID_DIR_OLD
        shell.mv(originalAppResources, path.join(appResourcesDir, ProjectV4MigrationService.ANDROID_DIR_OLD));
        // move the new, updated app_resources to App_Resources/Android, as  the de facto resources
        shell.mv(appResourcesDestination, originalAppResources)

        this.$logger.out(`Successfully updated your project's App_Resources/Android directory structure.\nThe previous version of App_Resources/Android has been renamed to App_Resources/${ProjectV4MigrationService.ANDROID_DIR_OLD}`);
    }

}

$injector.register("projectV4MigrationService", ProjectV4MigrationService);