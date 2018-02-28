const sourcemap = require("source-map");
import * as path from "path";
import { cache } from "../common/decorators";

export class IOSLogFilter implements Mobile.IPlatformLogFilter {
	// Used to trim the passed messages to a simpler output
	// Example:
	// This: "May 24 15:54:52 Dragons-iPhone NativeScript250(NativeScript)[356] <Notice>: CONSOLE ERROR file:///app/tns_modules/@angular/core/bundles/core.umd.js:3477:36: ORIGINAL STACKTRACE:"
	// Becomes: CONSOLE ERROR file:///app/tns_modules/@angular/core/bundles/core.umd.js:3477:36: ORIGINAL STACKTRACE:
	protected infoFilterRegex = /^.*(?:<Notice>:|<Warning>:|\(NativeScript\)|(?:[a-zA-Z0-9]+)(?:\([a-zA-Z0-9]+\))?\[[0-9]+\]:){1}/;
	// Used to recognize output related to the current project
	// This looks for artifacts like: AppName[22432] or AppName(SomeTextHere)[23123]
	private appOutputRegex: RegExp = /([a-zA-Z0-9]+)(?:\([a-zA-Z0-9]+\))?\[[0-9]+\]/;
	private filterActive: boolean = true;
	private projectName: string;

	private partialLine: string = null;

	constructor(
		private $loggingLevels: Mobile.ILoggingLevels,
		private $fs: IFileSystem,
		private $projectData: IProjectData) {
		this.projectName = this.$projectData.projectName;
	}

	public filterData(data: string, logLevel: string, pid?: string): string {
		const specifiedLogLevel = (logLevel || '').toUpperCase();

		if (specifiedLogLevel !== this.$loggingLevels.info || !data) {
			return data;
		}

		const chunkLines = data.split('\n');
		const skipLastLine = chunkLines.length > 1 ? data[data.length - 1] !== "\n" : false;
		let output = "";
		for (let i = 0; i < chunkLines.length; i++) {
			let currentLine = chunkLines[i];

			// Legacy filter moved to preFilter
			if (this.preFilter(data, currentLine)) {
				continue;
			}

			const matchResult = this.appOutputRegex.exec(currentLine);

			if (matchResult && matchResult.length > 1) {
				// Check if the name of the app equals the name of the CLI project and turn on the filter if not.
				this.filterActive = matchResult[1] !== this.projectName;
			}

			if (this.filterActive) {
				continue;
			}

			if (this.partialLine) {
				currentLine = this.partialLine + currentLine;
				this.partialLine = undefined;
			}

			if (i === chunkLines.length - 1 && skipLastLine) {
				this.partialLine = currentLine;
				break;
			}

			const filteredLineInfo = currentLine.match(this.infoFilterRegex);
			if (filteredLineInfo && filteredLineInfo.length > 0) {
				currentLine = currentLine.replace(filteredLineInfo[0], "");
			}

			currentLine = currentLine.trim();
			output += this.getOriginalFileLocation(currentLine) + '\n';
		}

		return output.length === 0 ? null : output;
	}

	private preFilter(data:string, currentLine: string): boolean {
		return currentLine.length < 1 ||
				currentLine.indexOf("SecTaskCopyDebugDescription") !== -1 ||
				currentLine.indexOf("NativeScript loaded bundle") !== -1 ||
				(currentLine.indexOf("assertion failed:") !== -1 && data.indexOf("libxpc.dylib") !== -1);
	}

	private getOriginalFileLocation(data: string): string {
		const fileString = "file:///";
		const fileIndex = data.indexOf(fileString);
		const projectDir = this.getProjectDir();

		if (fileIndex >= 0 && projectDir) {
			const parts = data.substring(fileIndex + fileString.length).split(":");
			if (parts.length >= 4) {
				const file = parts[0];
				const sourceMapFile = path.join(projectDir, file + ".map");
				const row = parseInt(parts[1]);
				const column = parseInt(parts[2]);
				if (this.$fs.exists(sourceMapFile)) {
					const sourceMap = this.$fs.readText(sourceMapFile);
					const smc = new sourcemap.SourceMapConsumer(sourceMap);
					const originalPosition = smc.originalPositionFor({ line: row, column: column });
					const sourceFile = smc.sources.length > 0 ? file.replace(smc.file, smc.sources[0]) : file;
					data = data.substring(0, fileIndex + fileString.length)
						+ sourceFile + ":"
						+ originalPosition.line + ":"
						+ originalPosition.column;

					for (let i = 3; i < parts.length; i++) {
						data += ":" + parts[i];
					}
				}
			}
		}

		return data;
	}

	@cache()
	private getProjectDir(): string {
		try {
			this.$projectData.initializeProjectData();
			return this.$projectData.projectDir;
		} catch (err) {
			return null;
		}
	}
}

$injector.register("iOSLogFilter", IOSLogFilter);
