

const util = require('util');
export default class PresetParser {
    constructor(settings) {
        this._settings = settings;
    }

    // This parses a presets properties
    readPresetProperties(preset, strings) {
        const propertiesToRead = [
            "description", 
            "discussion", 
            "warning", 
            "disclaimer", 
            "include_warning", 
            "include_disclaimer", 
            "discussion", 
            "force_options_review", 
            "parser"
        ];
        const propertiesMetadata = {};
        preset.options = [];

        // Build the relationship between a property and type
        propertiesToRead.forEach(propertyName => {
            // metadata of each property, name, type, optional true/false; example:
            // keywords: {type: MetadataTypes.WORDS_ARRAY, optional: true}
            propertiesMetadata[propertyName] = this._settings.presetsFileMetadata[propertyName];
            preset[propertyName] = undefined;
        });

        // when parsing options, need to keep track of the current option using a temporary variable
        preset._currentOptionGroup = undefined;

        for (const line of strings) {
            if (this._lineStartsWithMetapropertyDirective(line)) {
                this._parseAttributeLine(preset, line, propertiesMetadata);
            }
        }

        delete preset._currentOptionGroup;
    }

    _parseAttributeLine(preset, line, propertiesMetadata) {
        line = this._trimMetapropertyDirective(line);
        const lowCaseLine = line.toLowerCase();
        let isProperty = false;

        for (const propertyName in propertiesMetadata) {
            const lineBeginning = `${propertyName.toLowerCase()}:`; // "description:"

            if (lowCaseLine.startsWith(lineBeginning)) {
                line = line.slice(lineBeginning.length).trim(); // (Title: foo) -> (foo)
                this._parseProperty(preset, line, propertyName);
                isProperty = true;
            }
        }

        if (!isProperty && lowCaseLine.startsWith(this._settings.OptionsDirectives.OPTION_DIRECTIVE)) {
            this._parseOptionDirective(preset, line);
        }
    }

    _parseProperty(preset, line, propertyName) {
        switch(this._settings.presetsFileMetadata[propertyName].type) {
            case this._settings.MetadataTypes.STRING_ARRAY:
                this._processArrayProperty(preset, line, propertyName);
                break;
            case this._settings.MetadataTypes.STRING:
                this._processStringProperty(preset, line, propertyName);
                break;
            case this._settings.MetadataTypes.FILE_PATH:
                this._processStringProperty(preset, line, propertyName);
                break;
            case this._settings.MetadataTypes.FILE_PATH_ARRAY:
                this._processArrayProperty(preset, line, propertyName);
                break;
            case this._settings.MetadataTypes.BOOLEAN:
                this._processBooleanProperty(preset, line, propertyName);
                break;
            case this._settings.MetadataTypes.PARSER:
                this._processParserProperty(preset, line, propertyName);
                break;
            default:
                this.console.err(`Parsing preset: unknown property type '${this._settings.presetsFileMetadata[propertyName].type}' for the property '${propertyName}'`);
        }
    }

    _processParserProperty(preset, line, propertyName)
    {
        preset[propertyName] = line;
    }

    _processBooleanProperty(preset, line, propertyName) {
        const trueValues = ["true", "yes"];

        const lineLowCase = line.toLowerCase();
        let result = false;

        if (trueValues.includes(lineLowCase)) {
            result = true;
        }

        preset[propertyName] = result;
    }

    _processArrayProperty(preset, line, propertyName) {
        if (!preset[propertyName]) {
            preset[propertyName] = [];
        }

        preset[propertyName].push(line);
    }

    _processStringProperty(preset, line, propertyName) {
        preset[propertyName] = line;
    }

    // Checks to see if a line has a #$
    _lineStartsWithMetapropertyDirective(line) {
        return line.trim().startsWith(this._settings.MetapropertyDirective);
    }

    // Strips the #$ from the front of a line i.e. (#$ DESCRIPTION: foo) -> (DESCRIPTION: foo)
    _trimMetapropertyDirective(line) {
        return line.trim().slice(this._settings.MetapropertyDirective.length).trim();
    }

    _trimExclusiveDirective(line) {
        const exclusiveDirectiveLength = exlusiveDirective.length;
        return line.slice(lowercaseLine.lastIndexOf(exlusiveDirective) + exclusiveDirectiveLength - 1).trim();
    }

    // Start option parsing, accepts a trimmed line without the metaproperty directive
    _parseOptionDirective(preset, line) {
        let currentOptionGroupName = "" 
        if (preset._currentOptionGroup) {
            currentOptionGroupName = preset._currentOptionGroup.name
        }

        if (this._isOptionBegin(line)) {
            const option = this._getOption(line, currentOptionGroupName);
            if (!preset._currentOptionGroup) {
                preset.options.push(option);
            } else {
                preset._currentOptionGroup.options.push(option);
            }
        } else if (this._isOptionGroupBegin(line)) {
            const optionGroup = this._getOptionGroup(line);
            preset._currentOptionGroup = optionGroup;
            preset.options.push(optionGroup);
        } else if (this._isOptionGroupEnd(line)) {
            preset._currentOptionGroup = undefined;
        }
    }

    _getOptionName(line) {
        const directiveRemoved = line.slice(this._settings.OptionsDirectives.BEGIN_OPTION_DIRECTIVE.length).trim();
        const regExpRemoveChecked = new RegExp(this._escapeRegex(`${this._settings.OptionsDirectives.OPTION_CHECKED}:`), 'gi');
        const regExpRemoveUnchecked = new RegExp(this._escapeRegex(`${this._settings.OptionsDirectives.OPTION_UNCHECKED}:`), 'gi');
        let optionName = directiveRemoved.replace(regExpRemoveChecked, "");
        optionName = optionName.replace(regExpRemoveUnchecked, "").trim();
        return optionName;
    }

    _getOptionGroupName(line) {
        let ogName = line.slice(this._settings.OptionsDirectives.BEGIN_OPTION_GROUP_DIRECTIVE.length+1).trim();
        if (this._isExclusiveOptionGroup(line)) {
            ogName = ogName.slice(this._settings.OptionsDirectives.EXCLUSIVE_OPTION_GROUP.length).trim();
        }
        return ogName;
    }

    // returns an object that represents the option group
    _getOptionGroup(line) {
        return {
            name: this._getOptionGroupName(line),
            options: [],
            isExclusive: this._isExclusiveOptionGroup(line),
        };
    }

    // returns an object that represents an option
    _getOption(line, optionGroup) {
        const directiveRemoved = line.slice(this._settings.OptionsDirectives.BEGIN_OPTION_DIRECTIVE.length).trim();
        const directiveRemovedLowCase = directiveRemoved.toLowerCase();
        const OptionChecked = this._isOptionChecked(directiveRemovedLowCase);

        const regExpRemoveChecked = new RegExp(this._escapeRegex(this._settings.OptionsDirectives.OPTION_CHECKED), 'gi');
        const regExpRemoveUnchecked = new RegExp(this._escapeRegex(this._settings.OptionsDirectives.OPTION_UNCHECKED), 'gi');
        let optionName = directiveRemoved.replace(regExpRemoveChecked, "");
        optionName = optionName.replace(regExpRemoveUnchecked, "").trim();

        return {
            name: optionName.slice(1).trim(),
            optionGroup: optionGroup,
            checked: OptionChecked,
        };
    }

    _isExclusiveOptionGroup(line) {
        const lowCaseLine = line.toLowerCase();
        return lowCaseLine.includes(this._settings.OptionsDirectives.EXCLUSIVE_OPTION_GROUP);
    }

    _isOptionChecked(lowCaseLine) {
        return lowCaseLine.includes(this._settings.OptionsDirectives.OPTION_CHECKED);
    }

    _isOptionGroupBegin(line) {
        const lowCaseLine = line.toLowerCase();
        return lowCaseLine.startsWith(this._settings.OptionsDirectives.BEGIN_OPTION_GROUP_DIRECTIVE);
    }

    _isOptionGroupEnd(line) {
        const lowCaseLine = line.toLowerCase();
        return lowCaseLine.startsWith(this._settings.OptionsDirectives.END_OPTION_GROUP_DIRECTIVE);
    }

    _isOptionBegin(line) {
        const lowCaseLine = line.toLowerCase();
        return lowCaseLine.startsWith(this._settings.OptionsDirectives.BEGIN_OPTION_DIRECTIVE);
    }

    _isOptionEnd(line) {
        const lowCaseLine = line.toLowerCase();
        return lowCaseLine.startsWith(this._settings.OptionsDirectives.END_OPTION_DIRECTIVE);
    }

    _escapeRegex(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    renderPreset(strings, checkedOptions) {
        let resultStrings = [];
        let includeOption = false;
        let handlingOption = false;
        let currentOptionGroupName = "";

        const lowerCasedCheckedOptions = checkedOptions.map(optionName => optionName.toLowerCase());
        //console.log("checked options: "+util.inspect(lowerCasedCheckedOptions))

        strings.forEach(str => {
            //console.log("Line optiongroup: " + currentOptionGroupName + " val: " + str)
            if (this._lineStartsWithMetapropertyDirective(str)) {
                const line = this._trimMetapropertyDirective(str);
                if (this._isOptionGroupBegin(line)) {
                    handlingOption = true;
                    currentOptionGroupName = this._getOptionGroupName(line).toLowerCase();
                } else if (this._isOptionGroupEnd(line)) {
                    handlingOption = false;
                    includeOption = false;
                    currentOptionGroupName = "";
                } else if (this._isOptionBegin(line)) {
                    handlingOption = true;
                    let optionNameLowCase = this._getOptionName(line).toLowerCase();
                    if (currentOptionGroupName != "") {
                        optionNameLowCase = currentOptionGroupName.toLowerCase() + ":" + optionNameLowCase;
                    }
                    if (lowerCasedCheckedOptions.includes(optionNameLowCase)) {
                        //console.log("option name: " + optionNameLowCase + " is being included!")
                        includeOption = true;
                    }
                } else if (this._isOptionEnd(line)) {
                    if (currentOptionGroupName == "") {
                        handlingOption = false;
                    }
                    includeOption = false;
                }
            } else if ((handlingOption && includeOption) || (!handlingOption)) {
                //console.log("Push decision: handlingOption: "+ handlingOption + " includeOption: "+ includeOption + " :"+ str);
                resultStrings.push(str);
            }
        });

        resultStrings = this._removeExcessiveEmptyLines(resultStrings);

        return resultStrings;
    }

    _removeExcessiveEmptyLines(strings) {
        // removes empty lines if there are two or more in a row leaving just one empty line
        const result = [];
        let lastStringEmpty = false;

        strings.forEach(str => {
            if ("" !== str || !lastStringEmpty) {
                result.push(str);
            }

            if ("" === str) {
                lastStringEmpty = true;
            } else {
                lastStringEmpty = false;
            }
        });

        return result;
    }

    // End Option parsing

    isIncludeFound(strings) {
        for (const str of strings) {
            const match = PresetParser._sRegExpInclude.exec(str);

            if (match !== null) {
                return true;
            }
        }

        return false;
    }

}

// Reg exp extracts file/path.txt from # include: file/path.txt
PresetParser._sRegExpInclude = /^#\$[ ]+?INCLUDE:[ ]+?(?<filePath>\S+$)/;
