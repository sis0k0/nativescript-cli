import * as path from "path";
export class BuildPluginCommand implements ICommand {
    public allowedParameters: ICommandParameter[] = [];
    public pluginProjectPath: string;

    constructor(private $androidPluginBuildService: IAndroidPluginBuildService,
        private $errors: IErrors,
        private $fs: IFileSystem,
        private $options: IOptions) {
            
        if (this.$options.path) {
            this.pluginProjectPath = path.resolve(this.$options.path);
        } else {
            this.pluginProjectPath = path.resolve(".");
        }
    }

    public async execute(args: string[]): Promise<void> {
        const platformsAndroidPath = path.join(this.pluginProjectPath, "platforms", "android");
        let options: IBuildOptions = {
            aarOutputDir: platformsAndroidPath,
            platformsAndroidDirPath: platformsAndroidPath,
            pluginName: "???",
            tempPluginDirPath: path.join(platformsAndroidPath, "android-project"),
            platformData: null // ???
        }
        await this.$androidPluginBuildService.buildAar(options);
        this.$androidPluginBuildService.migrateIncludeGradle(options);
    }

    public async canExecute(args: string[]): Promise<boolean> {
        // check if plugin has platforms/android directory
        //      false -> throw error plugin doesn't need migration
        //      true -> continue

        if (!this.$fs.exists(path.join(this.pluginProjectPath, "platforms", "android"))) {
            this.$errors.failWithoutHelp("The plugin does not need to have its platforms/android components built into an `.aar`.");
        }

        return true;
    }
}

$injector.registerCommand("plugin|build", BuildPluginCommand);
