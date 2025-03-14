import PickedPreset from "@/js/presets/picked_preset.js";
import PresetTitlePanel from "@/js/presets/panels/title_panel.js";
import { marked } from "marked";
import DOMPurify from "dompurify";

const util = require('util');
const optionGroupVsNameDelimiter = ":";

// Class that encompasses the detailed dialog of a preset
export default class PresetsDetailsDialog {
    #dom = {};

    #pickedPresetList;
    #onPresetPickedCallback;
    #favoritePresets;

    #finalDialogYesNoSettings = {};
    #openPromiseResolve;
    #isDescriptionHtml = false;

    #presetsSource;
    #preset;
    #showPresetRepoName;
    #optionsShownAtLeastOnce;
    #isPresetPickedOnClose;


    constructor(domDialog, pickedPresetList, onPresetPickedCallback, favoritePresets) {
        this.#dom.dialog = domDialog;

        this.#pickedPresetList = pickedPresetList;
        this.#onPresetPickedCallback = onPresetPickedCallback;
        this.#favoritePresets = favoritePresets;
    }

    load() {
        return new Promise(resolve => {
            this.#dom.dialog.load("./tabs/presets/DetailedDialog/PresetsDetailedDialog.html", () => {
                this.#setupdialog();
                resolve();
            });
        });
    }

    open(preset, presetsSource, showPresetRepoName) {
        this.#preset = preset;
        this.#presetsSource = presetsSource;
        this.#showPresetRepoName = showPresetRepoName;

        
        this.#setLoadingState(true);
        this.#dom.dialog[0].showModal();
        this.#optionsShownAtLeastOnce = false;
        this.#isPresetPickedOnClose = false;

        this.#presetsSource.loadPreset(this.#preset)
            .then(() => {
                this.#loadPresetUi();
                this.#setLoadingState(false);
                this.#finalDialogYesNoSettings = {
                    title: i18n.getMessage("presetsWarningDialogTitle"),
                    text: GUI.escapeHtml(this.#preset.completeWarning),
                    buttonYesText: i18n.getMessage("presetsWarningDialogYesButton"),
                    buttonNoText: i18n.getMessage("presetsWarningDialogNoButton"),
                    buttonYesCallback: () => this.#pickPresetFwVersionCheck(),
                    buttonNoCallback: null,
                };
            })
            .catch(err => {
                console.error(err);
                const msg = i18n.getMessage("presetsLoadError");
                this.#showError(msg);
            });

        return new Promise(resolve => this.#openPromiseResolve = resolve);
    }

    #getFinalCliText() {
        const optionsToInclude = this.#dom.optionsSelect.multipleSelect("getSelects", "value");
        return this.#presetsSource._PresetParser.renderPreset(this.#preset.originalPresetCliStrings, optionsToInclude);
    }

    #loadPresetUi() {
        this.#loadDescription();

        this.#dom.githubLink.attr("href", this.#presetsSource.getPresetOnlineLink(this.#preset));

        if (this.#preset.discussion) {
            this.#dom.discussionLink.removeClass(GUI.buttonDisabledClass);
            this.#dom.discussionLink.attr("href", this.#preset.discussion);
        } else{
            this.#dom.discussionLink.addClass(GUI.buttonDisabledClass);
        }

        this.#dom.titlePanel.empty();
        const titlePanel = new PresetTitlePanel(this.#dom.titlePanel, this.#preset, this.#presetsSource, false,
            this.#showPresetRepoName, () => this.#setLoadingState(false), this.#favoritePresets);
        titlePanel.load();
        this.#loadOptionsSelect();
        this.#updateFinalCliText();
        this.#showCliText(false);
    }

    #loadDescription() {
        let text = this.#preset.description?.join("\n");

        switch(this.#preset.parser) {
            case "MARKED":
                this.#isDescriptionHtml = true;
                text = marked.parse(text);
                text = DOMPurify.sanitize(text);
                this.#dom.descriptionHtml.html(text);
                GUI.addLinksTargetBlank(this.#dom.descriptionHtml);
                break;
            default:
                this.#isDescriptionHtml = false;
                this.#dom.descriptionText.text(text);
                break;
        }
    }

    #updateFinalCliText() {
        this.#dom.cliText.text(this.#getFinalCliText().join("\n"));
    }

    #setLoadingState(isLoading) {
        this.#dom.properties.toggle(!isLoading);
        this.#dom.loading.toggle(isLoading);
        this.#dom.error.toggle(false);

        if (isLoading) {
            this.#dom.buttonApply.addClass(GUI.buttonDisabledClass);
        } else {
            this.#dom.buttonApply.removeClass(GUI.buttonDisabledClass);
        }
    }

    #showError(msg) {
        this.#dom.error.toggle(true);
        this.#dom.error.text(msg);
        this.#dom.properties.toggle(false);
        this.#dom.loading.toggle(false);
        this.#dom.buttonApply.addClass(GUI.buttonDisabledClass);
    }

    #showCliText(value) {
        this.#dom.descriptionText.toggle(!value && !this.#isDescriptionHtml);
        this.#dom.descriptionHtml.toggle(!value && this.#isDescriptionHtml);
        this.#dom.cliText.toggle(value);
        this.#dom.buttonShowCLI.toggle(!value);
        this.#dom.buttonHideCLI.toggle(value);
    }

    #createOptionsSelect(options) {
        let data = [];
        options.forEach(option => {
            if (!option.options) {
                data.push(this.#msOption(option));
            } else {
                data.push(this.#msOptionGroup(option));
            }
        });
        this.#dom.optionsSelect.multipleSelect({
            placeholder: i18n.getMessage("presetsOptionsPlaceholder"),
            formatSelectAll () { return i18n.getMessage("dropDownSelectAll"); },
            formatAllSelected() { return i18n.getMessage("dropDownAll"); },
            onClick: () => this.#optionsSelectionChanged(),
            onCheckAll: () => this.#optionsSelectionChanged(),
            onUncheckAll: () => this.#optionsSelectionChanged(),
            onOpen: () => this.#optionsOpened(),
            onBeforeClick: (view) => this.#ensureMutuallyExclusiveOptions(view),
            hideOptgroupCheckboxes: true,
            singleRadio: true,
            multiple: true,
            selectAll: false,
            data: data,
            minimumCountSelected: 128,
        });
    }
    #optionsOpened() {
        this.#optionsShownAtLeastOnce = true;
    }

    #ensureMutuallyExclusiveOptions(view) {
        console.log("View is: " + util.inspect(view));
        // In this form: option_0_1 where 0_1 is the group and the index within that group.
        const selectedOptionKey = view._key;
        const firstUnderscoreIndex = selectedOptionKey.indexOf('_');
        const lastUnderscoreIndex = selectedOptionKey.lastIndexOf('_');
        const groupIndex = selectedOptionKey.slice(firstUnderscoreIndex + 1, lastUnderscoreIndex);

        const group = this.#preset.options[groupIndex];
        console.log("Group info is: "+util.inspect(group));
        if (group.isExclusive) {
            const existingCheckedValues = this.#dom.optionsSelect.multipleSelect('getSelects');
            let newCheckedValues = [];
            existingCheckedValues.forEach(v => {
                if (v.includes(optionGroupVsNameDelimiter)) {
                    let optionGroupName = v.split(optionGroupVsNameDelimiter)[0];
                    if (optionGroupName != group.name) {
                        newCheckedValues.push(v);
                    }
                } else {
                    newCheckedValues.push(v);
                }
            });
            this.#dom.optionsSelect.multipleSelect('setSelects', newCheckedValues);
        }
    }

    #msOption(option) {
        return {
            text: option.name,
            value: option.name,
            visible: true,
            selected: option.checked,
        };
    }

    #msOptionGroup(optionGroup) {
        let msOptionGroup = {
            type: 'optgroup',
            label: optionGroup.name,
            value: optionGroup.name,
            visible: true,
            children: [],
        };
        optionGroup.options.forEach(option => {
            msOptionGroup.children.push({
                text: option.name,
                value: optionGroup.name + optionGroupVsNameDelimiter + option.name,
                visible: true,
                selected: option.checked,
            });
        });
        return msOptionGroup;
    }

    #optionsSelectionChanged() {
        this.#updateFinalCliText();
    }

    #destroyOptionsSelect() {
        this.#dom.optionsSelect.multipleSelect('destroy');
    }

    #loadOptionsSelect() {

        const optionsVisible = 0 !== this.#preset.options.length;
        this.#dom.optionsSelect.empty();
        this.#dom.optionsSelectPanel.toggle(optionsVisible);

        if (optionsVisible) {
            this.#createOptionsSelect(this.#preset.options);
        }

        this.#dom.optionsSelect.multipleSelect('refresh');
    }

    #setupdialog() {
        i18n.localizePage();
        
        this.#dom.buttonApply = $('#presets_detailed_dialog_applybtn');
        this.#dom.buttonCancel = $('#presets_detailed_dialog_closebtn');
        this.#dom.loading = $('#presets_detailed_dialog_loading');
        this.#dom.error = $('#presets_detailed_dialog_error');
        this.#dom.properties = $('#presets_detailed_dialog_properties');
        this.#dom.titlePanel = $('.preset_detailed_dialog_title_panel');
        this.#dom.descriptionText = $('#presets_detailed_dialog_text_description');
        this.#dom.descriptionHtml = $('#presets_detailed_dialog_html_description');
        this.#dom.cliText = $('#presets_detailed_dialog_text_cli');
        this.#dom.githubLink = this.#dom.dialog.find('#presets_open_online');
        this.#dom.discussionLink = this.#dom.dialog.find('#presets_open_discussion');
        this.#dom.optionsSelect = $('#presets_options_select');
        this.#dom.optionsSelectPanel = $('#presets_options_panel');
        this.#dom.buttonShowCLI = $('#presets_cli_show');
        this.#dom.buttonHideCLI = $('#presets_cli_hide');

        this.#dom.buttonApply.on("click", () => this.#onApplyButtonClicked());
        this.#dom.buttonCancel.on("click", () => this.#onCancelButtonClicked());
        this.#dom.buttonShowCLI.on("click", () => this.#showCliText(true));
        this.#dom.buttonHideCLI.on("click", () => this.#showCliText(false));
        this.#dom.dialog.on("close", () => this.#onClose());
    }

    #onApplyButtonClicked() {
        if (this.#preset.force_options_review && !this.#optionsShownAtLeastOnce) {
            const dialogOptions = {
                title: i18n.getMessage("warningTitle"),
                text: i18n.getMessage("presetsReviewOptionsWarning"),
                buttonConfirmText: i18n.getMessage("close"),
            };
            GUI.showInformationDialog(dialogOptions);
        } else if (!this.#preset.completeWarning) {
            this.#pickPresetFwVersionCheck();
        } else {
            GUI.showYesNoDialog(this.#finalDialogYesNoSettings);
        }
    }

    #pickPreset() {
        const cliStrings = this.#getFinalCliText();
        cliStrings.forEach(str =>
            console.log("Rendered CLI String: " + str)
        );
        const pickedPreset = new PickedPreset(this.#preset, cliStrings, this.#presetsSource);
        this.#pickedPresetList.push(pickedPreset);
        this.#onPresetPickedCallback?.();
        this.#isPresetPickedOnClose = true;
        this.#onCancelButtonClicked();
    }

    #pickPresetFwVersionCheck() {
        let compatitable = false;

        for (const fw of this.#preset.firmware_version) {
            if (FC.CONFIG.flightControllerVersion.startsWith(fw)) {
                compatitable = true;
                break;
            }
        }

        if (compatitable) {
            this.#pickPreset();
        } else {
            const dialogSettings = {
                title: i18n.getMessage("presetsWarningDialogTitle"),
                text: i18n.getMessage("presetsWarningWrongVersionConfirmation", [this.#preset.firmware_version, FC.CONFIG.flightControllerVersion]),
                buttonYesText: i18n.getMessage("presetsWarningDialogYesButton"),
                buttonNoText: i18n.getMessage("presetsWarningDialogNoButton"),
                buttonYesCallback: () => this.#pickPreset(),
                buttonNoCallback: null,
            };
            GUI.showYesNoDialog(dialogSettings);
        }
    }

    #onCancelButtonClicked() {
        this.#dom.dialog[0].close();
    }

    #onClose() {
        this.#destroyOptionsSelect();
        this.#openPromiseResolve?.(this.#isPresetPickedOnClose);
    }
}
