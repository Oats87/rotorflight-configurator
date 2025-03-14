import PresetsSourceUtil from "@/js/presets/sources/presets_source_util.js";

export default class SourcePanel {
    
    #dom = {};
    #domId = "";

    #parentDiv;
    #presetsSourceMetadata;

    constructor(parentDiv, presetSourceMetadata) {
        this.#parentDiv = parentDiv;
        this.#presetsSourceMetadata = presetSourceMetadata;
    }

    get presetsSourceMetadata() {
        return this.#presetsSourceMetadata;
    }

    load() {
        SourcePanel.s_panelCounter++;
        this.#domId = `source_panel_${SourcePanel.s_panelCounter}`;
        this.#parentDiv.append(`<div id="${this.#domId}"></div>`);
        this.#dom.divWrapper = $(`#${this.#domId}`);
        this.#dom.divWrapper.toggle(false);

        return new Promise(resolve => {
            this.#dom.divWrapper.load("./tabs/presets/SourcesDialog/SourcePanel.html",
            () => {
                this.#setupHtml();
                resolve();
            });
        });
    }

    setOnSelectedCallback(onSelectedCallback) {
        // callback with this (SourcePanel) argument
        // so that consumer knew which panel was clicked on
        this._onSelectedCallback = onSelectedCallback;
    }

    setOnDeleteCallback(onDeletedCallback) {
        // callback with this (SourcePanel) argument
        // so that consumer knew which panel was clicked on
        this._onDeletedCallback = onDeletedCallback;
    }

    setOnActivateCallback(onActivateCallback) {
        // callback with this (SourcePanel) argument
        // so that consumer knew which panel was clicked on
        this._onActivateCallback = onActivateCallback;
    }

    setOnDeactivateCallback(onDeactivateCallback) {
        // callback with this (SourcePanel) argument
        // so that consumer knew which panel was clicked on
        this._onDeactivateCallback = onDeactivateCallback;
    }

    setOnSaveCallback(onSaveCallback) {
        // callback with this (SourcePanel) argument
        // so that consumer knew which panel was clicked on
        this._onSaveCallback = onSaveCallback;
    }

    setSelected(isSelected) {
        this._setUiSelected(isSelected);
    }

    setActive(isActive) {
        this.#presetsSourceMetadata.active = isActive;
        this._domDivSelectedIndicator.toggle(this.#presetsSourceMetadata.active);
        this._domButtonActivate.toggle(!isActive);
        this._domButtonDeactivate.toggle(isActive);
    }

    _setUiOfficial() {
        if (this.#presetsSourceMetadata.official){
            this._domButtonSave.toggle(false);
            this._domButtonReset.toggle(false);
            this._domButtonDelete.toggle(false);
            this._domEditName.prop("disabled", true);
            this._domEditUrl.prop("disabled", true);
            this._domEditGitHubBranch.prop("disabled", true);
        }
    }

    _setUiSelected(isSelected) {
        if (this._selected !== isSelected) {
            this._domDivNoEditing.toggle(!isSelected);
            this._domDivEditing.toggle(isSelected);

            this._onResetButtonClick();
            this._updateNoEditingName();

            this._domDivInnerPanel.toggleClass("presets_source_panel_not_selected", !isSelected);
            this._domDivInnerPanel.toggleClass("presets_source_panel_selected", isSelected);
            if (isSelected) {
                this._domDivInnerPanel.off("click");
            } else {
                this._domDivInnerPanel.on("click", () => this._onPanelSelected());
            }

            this._selected = isSelected;
        }
    }

    _updateNoEditingName() {
        this._domDivNoEditingName.text(this.#presetsSourceMetadata.name);
    }

    #setupHtml() {
        this._readDom();
        this._setupActions();
        this.setSelected(false);
        this._setIsSaved(true);
        this._checkIfGithub();
        this.setActive(this.#presetsSourceMetadata.active);
        this._setUiOfficial();

        i18n.localizePage();
        this.#dom.divWrapper.toggle(true);
    }

    _setupActions() {
        this._domButtonSave.on("click", () => this._onSaveButtonClick());
        this._domButtonReset.on("click", () => this._onResetButtonClick());
        this._domButtonDelete.on("click", () => this._onDeleteButtonClick());
        this._domButtonActivate.on("click", () => this._onActivateButtonClick());
        this._domButtonDeactivate.on("click", () => this._onDeactivateButtonClick());

        this._domEditName.on("input", () => this._onInputChange());
        this._domEditUrl.on("input", () => this._onInputChange());
        this._domEditGitHubBranch.on("input", () => this._onInputChange());
    }

    _onPanelSelected() {
        this._setUiSelected(true);
        this._onSelectedCallback?.(this);
    }

    _checkIfGithub() {
        const isGithubUrl = PresetsSourceUtil.isUrlGithubRepo(this._domEditUrl.val());
        this._domDivGithubBranch.toggle(isGithubUrl);
    }

    _onInputChange() {
        this._checkIfGithub();
        if (PresetsSourceUtil.containsBranchName(this._domEditUrl.val())) {
            this._domEditGitHubBranch.val(PresetsSourceUtil.getBranchName(this._domEditUrl.val()));
            this._domEditUrl.val(this._domEditUrl.val().split("/tree/")[0]);
        }
        this._setIsSaved(false);
    }

    _onSaveButtonClick() {
        this.#presetsSourceMetadata.name = this._domEditName.val();
        this.#presetsSourceMetadata.url = this._domEditUrl.val();
        this.#presetsSourceMetadata.branch = this._domEditGitHubBranch.val();
        this._setIsSaved(true);
        this._onSaveCallback?.(this);
    }

    _onResetButtonClick() {
        this._domEditName.val(this.#presetsSourceMetadata.name);
        this._domEditUrl.val(this.#presetsSourceMetadata.url);
        this._domEditGitHubBranch.val(this.#presetsSourceMetadata.branch);
        this._checkIfGithub();
        this._setIsSaved(true);
    }

    _onDeleteButtonClick() {
        this.#dom.divWrapper.remove();
        this._onDeletedCallback?.(this);
    }

    _onActivateButtonClick() {
        this._onSaveButtonClick();
        this.setActive(true);
        this._onActivateCallback?.(this);
    }

    _onDeactivateButtonClick() {
        this._onSaveButtonClick();
        this.setActive(false);
        this._onDeactivateCallback?.(this);
    }

    _setIsSaved(isSaved) {
        if (isSaved) {
            this._domButtonSave.addClass(GUI.buttonDisabledClass);
            this._domButtonReset.addClass(GUI.buttonDisabledClass);
        } else {
            this._domButtonSave.removeClass(GUI.buttonDisabledClass);
            this._domButtonReset.removeClass(GUI.buttonDisabledClass);
        }
    }

    _readDom() {
        this._domDivInnerPanel = this.#dom.divWrapper.find(".presets_source_panel");
        this._domDivNoEditing = this.#dom.divWrapper.find(".presets_source_panel_no_editing");
        this._domDivEditing = this.#dom.divWrapper.find(".presets_source_panel_editing");

        this._domEditName = this.#dom.divWrapper.find(".presets_source_panel_editing_name_field");
        this._domEditUrl = this.#dom.divWrapper.find(".presets_source_panel_editing_url_field");
        this._domEditGitHubBranch = this.#dom.divWrapper.find(".presets_source_panel_editing_branch_field");

        this._domButtonSave = this.#dom.divWrapper.find(".presets_source_panel_save");
        this._domButtonReset = this.#dom.divWrapper.find(".presets_source_panel_reset");
        this._domButtonActivate = this.#dom.divWrapper.find(".presets_source_panel_activate");
        this._domButtonDeactivate = this.#dom.divWrapper.find(".presets_source_panel_deactivate");
        this._domButtonDelete = this.#dom.divWrapper.find(".presets_source_panel_delete");
        this._domDivGithubBranch = this.#dom.divWrapper.find(".presets_source_panel_editing_github_branch");
        this._domDivNoEditingName = this.#dom.divWrapper.find(".presets_source_panel_no_editing_name");

        this._domDivSelectedIndicator = this.#dom.divWrapper.find(".presets_source_panel_no_editing_selected");
    }
}

SourcePanel.s_panelCounter = 0;
