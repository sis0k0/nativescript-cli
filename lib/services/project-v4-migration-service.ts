import * as path from "path";
import * as shell from "shelljs";
import * as semver from "semver";

export class ProjectV4MigrationService implements IProjectV4MigrationService {
    constructor(private $fs: IFileSystem, private $logger: ILogger) { }
    shouldMigrate(versionString: string, applicationRoot: string): boolean {
        return this.$fs.exists(path.join(applicationRoot, "app", "App_Resources")) && semver.gte(versionString, "4.0.0");
    }
    hasMigrated(applicationRoot: string): boolean {
        return this.$fs.exists(path.join(applicationRoot, "App_Resources"));
    }
    async migrate(applicationRoot: string): Promise<void> {
        const originalAppResources = path.join(applicationRoot, "app", "App_Resources", "Android");
        const destination = path.join(applicationRoot, "App_Resources");
        const appResourcesDestination = path.join(destination, "Android");
        const appMainSourceSet = path.join(appResourcesDestination, "src", "main");
        const appResourcesMainSourceSetResourcesDestination = path.join(appMainSourceSet, "res");

        this.$fs.ensureDirectoryExists(destination);
        this.$fs.ensureDirectoryExists(appResourcesDestination);
        this.$fs.ensureDirectoryExists(appMainSourceSet);
        this.$fs.ensureDirectoryExists(appResourcesMainSourceSetResourcesDestination);

        const isDirectory = (source: string) => this.$fs.getLsStats(source).isDirectory()
        const getDirectories = (source: string) =>
            this.$fs.readDirectory(source).map(name => path.join(source, name)).filter(isDirectory)

        shell.mv(path.join(originalAppResources, "app.gradle"), path.join(appResourcesDestination, "app.gradle"));
        shell.mv(path.join(originalAppResources, "AndroidManifest.xml"), path.join(appMainSourceSet, "AndroidManifest.xml"));

        let resourceDirectories = getDirectories(originalAppResources); // enumareFilesInDirectorySync didn't work for me.

        resourceDirectories.forEach(dir => {
            shell.mv(dir, appResourcesMainSourceSetResourcesDestination);
        });

        shell.mv(path.join(applicationRoot, "app", "App_Resources", "iOS"), path.join(destination, "iOS"));
        this.$fs.deleteDirectory(path.join(applicationRoot, "app", "App_Resources"));

        this.$logger.out("Successfully migrated your project's App_Resources to conform to the version 4.0 directory structure. The App_Resources directory can now be found on the root level of your project, next to the 'app' directory.");
    }

}

$injector.register("projectV4MigrationService", ProjectV4MigrationService);