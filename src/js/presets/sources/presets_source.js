import PresetParser from "@/js/presets/parser.js";

export default class PresetsSource {
    #presetsSourceMetadata;
    #urlRaw;
    #urlViewOnline;
    #index;

    #presetParser;

    constructor(metadata, urlRaw, urlViewOnline) {
        this.#presetsSourceMetadata = metadata;
        this.#urlRaw = urlRaw;
        this.#urlViewOnline = urlViewOnline;
        this.#index = null;
    }

    get metadata() {
        return this.#presetsSourceMetadata;
    }

    get index() {
        return this.#index;
    }

    loadIndex() {
        console.log("Fetching: "+this.#urlRaw+"index.json");
        return fetch(`${this.#urlRaw}index.json`, {cache: "no-cache"})
            .then(res => res.json())
            .then(out => {
                this.#index = out;
                console.log(this.#index.settings);
                this.#presetParser = new PresetParser(this.#index.settings);
            });
    }

    getPresetOnlineLink(preset) {
        return this.#urlViewOnline + preset.fullPath;
    }
    
    // parseInclude parses the given strings and adds promises generated _loadPresetText for each include
    #parseInclude(strings, includeRowIndexes, promises)
    {
           for (let i = 0; i < strings.length; i++) {
            const match = PresetParser._sRegExpInclude.exec(strings[i]);

            if (match !== null) {
                includeRowIndexes.push(i);
                const filePath = this.#urlRaw + match.groups.filePath;
                const promise = this.#loadPresetText(filePath);
                promises.push(promise.then(text => {
                    let tmpStrings = text.split("\n");
                    tmpStrings = tmpStrings.map(str => str.trim());
                    let strings = [];
                    for (let line of tmpStrings) {
                        if (line.startsWith(this.#index.settings.MetapropertyDirective)) {
                            if (line.slice(this.#index.settings.MetapropertyDirective.length).trim().toLowerCase().startsWith(this.#index.settings.OptionsDirectives.OPTION_DIRECTIVE)) {
                                strings.push(line);
                            }
                        } else {
                            strings.push(line);
                        }
                    }
                    return strings;
                }));
            }
        }
    }

    #expandNestedStringsArray(strings) {
        let i = 0;
        while (i < strings.length) {
          if (Array.isArray(strings[i])) {
            strings.splice(i, 1, ...strings[i]);
          } else {
            i++;
          }
        }
        return strings;
      }

    // executes the include and inserts it
    #executeIncludeOnce(strings) {
        const includeRowIndexes = []; // row indexes with "#include" statements
        const promises = []; // promises to load included files
        this.#parseInclude(strings, includeRowIndexes, promises);

        return Promise.all(promises)
            .then(includedTexts => {
                for (let i = 0; i < includedTexts.length; i++) {
                    strings[includeRowIndexes[i]] = includedTexts[i];
                }
                // Expand the included file into its spot in the resultant file
                strings = this.#expandNestedStringsArray(strings);

                const text = strings.join('\n');
                return text.split("\n").map(str => str.trim());
            });
    }

    // executes the nested include by checking for an include directive
    #executeIncludeNested(strings) {
        const isIncludeFound = this.#presetParser.isIncludeFound(strings);

        if (isIncludeFound) {
            return this.#executeIncludeOnce(strings)
            .then(resultStrings => this.#executeIncludeNested(resultStrings));
        } else {
            return Promise.resolve(strings);
        }
    }

    loadPreset(preset) {
        const promiseMainText = this.#loadPresetText(this.#urlRaw + preset.fullPath);

        return promiseMainText
        .then(text => {
            let strings = text.split("\n");
            strings = strings.map(str => str.trim());
            return strings;
        })
        .then(strings => this.#executeIncludeNested(strings))
        .then(strings => {
            this.#presetParser.readPresetProperties(preset, strings);
            return strings;
        })
        .then(strings => {
            preset.originalPresetCliStrings = strings;
            return this.#loadPresetWarning(preset);
        });
    }

    #loadPresetWarning(preset) {
        let completeWarning = "";

        if (preset.warning) {
            completeWarning += (completeWarning?"\n":"") + preset.warning;
        }

        if (preset.disclaimer) {
            completeWarning += (completeWarning?"\n":"") + preset.disclaimer;
        }

        const allFiles = [].concat(...[preset.include_warning, preset.include_disclaimer].filter(Array.isArray));

        return this.#loadFilesInOneText(allFiles)
            .then(text => {
                completeWarning += (completeWarning?"\n":"") + text;
                preset.completeWarning = completeWarning;
            });
    }

    #loadFilesInOneText(fileUrls) {
        const loadPromises = [];

        fileUrls?.forEach(url => {
            const filePath = this.#urlRaw + url;
            loadPromises.push(this.#loadPresetText(filePath));
        });

        return Promise.all(loadPromises)
        .then(texts => {
            return texts.join('\n');
        });
    }

    #loadPresetText(fullUrl) {
        return new Promise((resolve, reject) => {
            console.log("Fetching URL: "+fullUrl);
            fetch(fullUrl, {cache: "no-cache"})
            .then(res => res.text())
            .then(text => resolve(text))
            .catch(err => {
                console.error(err);
                reject(err);
            });
        });
    }
}
